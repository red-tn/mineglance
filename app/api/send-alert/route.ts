import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { escapeHtml } from '@/lib/escapeHtml'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'alerts@mineglance.com'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AlertRequest {
  licenseKey?: string
  alertType: 'worker_offline' | 'profit_drop' | 'better_coin' | 'price_alert'
  walletName: string
  message: string
  email?: string // Optional - can be provided by extension or fetched from DB
  internalKey?: string // For server-to-server calls (cron jobs)
}

// Rate limiting: track alerts sent per license
const alertCache = new Map<string, { count: number; resetAt: number }>()
const MAX_ALERTS_PER_HOUR = 10

function isRateLimited(licenseKey: string): boolean {
  const now = Date.now()
  const entry = alertCache.get(licenseKey)

  if (!entry || now > entry.resetAt) {
    alertCache.set(licenseKey, { count: 1, resetAt: now + 60 * 60 * 1000 })
    return false
  }

  if (entry.count >= MAX_ALERTS_PER_HOUR) {
    return true
  }

  entry.count++
  return false
}

export async function POST(request: NextRequest) {
  try {
    const body: AlertRequest = await request.json()
    const { licenseKey, alertType, walletName, message, email: providedEmail, internalKey } = body

    if (!alertType || !walletName || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let toEmail = providedEmail
    let normalizedKey = ''

    // Check if this is an internal call (from cron jobs)
    if (internalKey && internalKey === process.env.INTERNAL_API_SECRET) {
      // Internal call - email must be provided
      if (!toEmail) {
        return NextResponse.json({ error: 'Email required for internal calls' }, { status: 400 })
      }
      normalizedKey = 'INTERNAL'
    } else if (licenseKey) {
      // External call - verify license
      normalizedKey = licenseKey.toUpperCase().trim()
      const { data: license, error } = await supabase
        .from('users')
        .select('email, plan, is_revoked')
        .eq('license_key', normalizedKey)
        .single()

      if (error || !license || license.is_revoked) {
        return NextResponse.json({ error: 'Invalid or inactive license' }, { status: 403 })
      }

      // Get email - prefer provided email, fall back to license email
      toEmail = toEmail || license.email

      // Check rate limit for external calls
      if (isRateLimited(licenseKey)) {
        return NextResponse.json({
          error: 'Rate limit exceeded. Max 10 alerts per hour.',
          rateLimited: true
        }, { status: 429 })
      }
    } else {
      return NextResponse.json({ error: 'License key or internal key required' }, { status: 400 })
    }

    if (!toEmail) {
      return NextResponse.json({ error: 'No email address available' }, { status: 400 })
    }

    // Format alert type for display
    const alertTypeDisplay = {
      'worker_offline': 'Worker Offline',
      'profit_drop': 'Profit Drop',
      'better_coin': 'Better Coin Available',
      'price_alert': 'Price Alert'
    }[alertType] || alertType

    const alertEmoji = {
      'worker_offline': '🔴',
      'profit_drop': '📉',
      'better_coin': '💡',
      'price_alert': '💰'
    }[alertType] || '⚠️'

    // Escape user input to prevent XSS in email
    const safeWalletName = escapeHtml(walletName)
    const safeMessage = escapeHtml(message)

    // Build email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MineGlance Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 48px;">${alertEmoji}</span>
      <h1 style="color: #1a365d; font-size: 24px; margin: 16px 0 0 0;">${alertTypeDisplay}</h1>
    </div>

    <!-- Alert Box -->
    <div style="background: ${alertType === 'worker_offline' ? '#fed7d7' : alertType === 'profit_drop' ? '#feebc8' : '#c6f6d5'}; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid ${alertType === 'worker_offline' ? '#fc8181' : alertType === 'profit_drop' ? '#f6ad55' : '#68d391'};">
      <p style="color: #2d3748; font-size: 16px; margin: 0 0 8px 0;">
        <strong>Wallet:</strong> ${safeWalletName}
      </p>
      <p style="color: #4a5568; font-size: 15px; margin: 0; line-height: 1.6;">
        ${safeMessage}
      </p>
    </div>

    <!-- Action -->
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="https://mineglance.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-right: 12px;">
        View Dashboard
      </a>
      <a href="https://chromewebstore.google.com/detail/mineglance-mining-profit/fohkkkgboehiaeoakpjbipiakokdgajl" style="display: inline-block; background: #e2e8f0; color: #4a5568; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
        Open Extension
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <p style="color: #a0aec0; font-size: 12px; margin: 0;">
        You received this alert because email notifications are enabled.<br>
        <a href="https://mineglance.com/dashboard" style="color: #a0aec0;">Manage your account</a> |
        <a href="https://mineglance.com/support" style="color: #a0aec0;">Get support</a>
      </p>
    </div>

  </div>
</body>
</html>
    `

    // Send email via SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: toEmail }] }],
        from: { email: FROM_EMAIL, name: 'MineGlance Alerts' },
        subject: `${alertEmoji} MineGlance: ${alertTypeDisplay} - ${safeWalletName}`,
        content: [
          { type: 'text/html', value: emailHtml }
        ],
      }),
    })

    // Get SendGrid message ID from response header
    const messageId = response.headers.get('X-Message-Id') || null
    const sendgridStatus = response.ok ? 'accepted' : 'failed'
    const sendgridResponse = response.ok ? `${response.status} Accepted` : await response.text()

    if (!response.ok) {
      console.error('SendGrid error:', sendgridResponse)

      // Still log the failed attempt
      try {
        await supabase.from('email_alerts_log').insert({
          license_key: normalizedKey,
          email: toEmail,
          alert_type: alertType,
          wallet_name: walletName,
          subject: `${alertEmoji} MineGlance: ${alertTypeDisplay} - ${safeWalletName}`,
          message: message,
          sendgrid_message_id: null,
          sendgrid_status: 'failed',
          sendgrid_response: sendgridResponse.substring(0, 500)
        })
      } catch (logError) {
        console.error('Failed to log alert:', logError)
      }

      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    // Log the successful alert to database for admin stats
    try {
      await supabase.from('email_alerts_log').insert({
        license_key: normalizedKey,
        email: toEmail,
        alert_type: alertType,
        wallet_name: walletName,
        subject: `${alertEmoji} MineGlance: ${alertTypeDisplay} - ${safeWalletName}`,
        message: message,
        sendgrid_message_id: messageId,
        sendgrid_status: sendgridStatus,
        sendgrid_response: sendgridResponse
      })
    } catch (logError) {
      console.error('Failed to log alert:', logError)
      // Don't fail the request if logging fails
    }

    return NextResponse.json({ success: true, email: toEmail })
  } catch (error) {
    console.error('Error sending alert email:', error)
    return NextResponse.json({ error: 'Failed to send alert' }, { status: 500 })
  }
}
