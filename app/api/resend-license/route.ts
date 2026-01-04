import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const emailLower = email.toLowerCase().trim()

    // Look up user's license
    const { data: user, error } = await supabase
      .from('users')
      .select('license_key, plan, is_revoked')
      .eq('email', emailLower)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'No license found for this email' }, { status: 404 })
    }

    if (user.is_revoked) {
      return NextResponse.json({ error: 'License has been revoked' }, { status: 403 })
    }

    if (!user.license_key || user.plan === 'free') {
      return NextResponse.json({ error: 'No Pro license found for this email' }, { status: 404 })
    }

    const planName = 'Pro'

    // Send the license key email
    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your MineGlance License Key</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #1a365d; font-size: 28px; margin: 0;">Your License Key</h1>
      <p style="color: #718096; font-size: 16px; margin-top: 8px;">Here's your MineGlance ${planName} license key.</p>
    </div>

    <!-- License Key Box -->
    <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 32px;">
      <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Your License Key</p>
      <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <code style="color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: 'SF Mono', 'Fira Code', monospace;">${user.license_key}</code>
      </div>
      <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 0;">Keep this safe! You'll need it to activate Pro features.</p>
    </div>

    <!-- Activation Steps -->
    <div style="background: #ffffff; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
      <h2 style="color: #1a365d; font-size: 18px; margin: 0 0 16px 0;">How to Activate</h2>
      <ol style="color: #4a5568; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;">
        <li>Open the MineGlance extension</li>
        <li>Click the <strong>gear icon</strong> (Settings)</li>
        <li>Find the <strong>"Pro License"</strong> section</li>
        <li>Paste your license key above</li>
        <li>Click <strong>"Activate"</strong></li>
      </ol>
    </div>

    <!-- Support -->
    <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 14px; margin: 0 0 8px 0;">Need help? We're here for you!</p>
      <a href="https://mineglance.com/support" style="color: #38a169; text-decoration: none; font-weight: 500;">Visit Support</a>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px;">
      <p style="color: #a0aec0; font-size: 12px; margin: 0;">
        MineGlance - Mining Profitability Dashboard<br>
        <a href="https://mineglance.com" style="color: #a0aec0;">mineglance.com</a>
      </p>
    </div>

  </div>
</body>
</html>
    `

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: emailLower }] }],
        from: { email: FROM_EMAIL, name: 'MineGlance' },
        subject: `Your MineGlance ${planName} License Key`,
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

    console.log('License key resent to:', emailLower)
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Resend license error:', error)
    return NextResponse.json({ error: 'Failed to resend license' }, { status: 500 })
  }
}
