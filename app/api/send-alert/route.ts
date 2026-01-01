import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'alerts@mineglance.com'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface AlertRequest {
  licenseKey: string
  alertType: 'worker_offline' | 'profit_drop' | 'better_coin'
  walletName: string
  message: string
  email?: string // Optional - can be provided by extension or fetched from DB
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
    const { licenseKey, alertType, walletName, message, email: providedEmail } = body

    if (!licenseKey || !alertType || !walletName || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Verify license is valid (using paid_users table)
    const normalizedKey = licenseKey.toUpperCase().trim()
    const { data: license, error } = await supabase
      .from('paid_users')
      .select('email, plan, is_revoked')
      .eq('license_key', normalizedKey)
      .single()

    if (error || !license || license.is_revoked) {
      return NextResponse.json({ error: 'Invalid or inactive license' }, { status: 403 })
    }

    // Get email - prefer provided email, fall back to license email
    const toEmail = providedEmail || license.email

    if (!toEmail) {
      return NextResponse.json({ error: 'No email address available' }, { status: 400 })
    }

    // Check rate limit
    if (isRateLimited(licenseKey)) {
      return NextResponse.json({
        error: 'Rate limit exceeded. Max 10 alerts per hour.',
        rateLimited: true
      }, { status: 429 })
    }

    // Format alert type for display
    const alertTypeDisplay = {
      'worker_offline': 'Worker Offline',
      'profit_drop': 'Profit Drop',
      'better_coin': 'Better Coin Available'
    }[alertType] || alertType

    const alertEmoji = {
      'worker_offline': '🔴',
      'profit_drop': '📉',
      'better_coin': '💡'
    }[alertType] || '⚠️'

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
        <strong>Wallet:</strong> ${walletName}
      </p>
      <p style="color: #4a5568; font-size: 15px; margin: 0; line-height: 1.6;">
        ${message}
      </p>
    </div>

    <!-- Action -->
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="https://mineglance.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-right: 12px;">
        View Dashboard
      </a>
      <a href="https://chrome.google.com/webstore/detail/mineglance" style="display: inline-block; background: #e2e8f0; color: #4a5568; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
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
        subject: `${alertEmoji} MineGlance: ${alertTypeDisplay} - ${walletName}`,
        content: [
          { type: 'text/html', value: emailHtml }
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SendGrid error:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }

    return NextResponse.json({ success: true, email: toEmail })
  } catch (error) {
    console.error('Error sending alert email:', error)
    return NextResponse.json({ error: 'Failed to send alert' }, { status: 500 })
  }
}
