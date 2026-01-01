import { NextRequest, NextResponse } from 'next/server'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'alerts@mineglance.com'

// Test endpoint to send sample alert emails - REMOVE IN PRODUCTION or add auth
export async function POST(request: NextRequest) {
  try {
    const { email, alertType } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 })
    }

    const alertTypes = {
      'worker_offline': {
        emoji: '🔴',
        title: 'Worker Offline',
        message: '2 worker(s) went offline. Last seen 15 minutes ago.',
        bgColor: '#fed7d7',
        borderColor: '#fc8181'
      },
      'profit_drop': {
        emoji: '📉',
        title: 'Profit Drop',
        message: 'Profit dropped 35% (now $2.15/day). Previous: $3.31/day.',
        bgColor: '#feebc8',
        borderColor: '#f6ad55'
      },
      'better_coin': {
        emoji: '💡',
        title: 'Better Coin Available',
        message: 'Consider switching from RVN to XNA for +$0.45/day more profit (same KawPow algorithm).',
        bgColor: '#c6f6d5',
        borderColor: '#68d391'
      }
    }

    const alert = alertTypes[alertType as keyof typeof alertTypes] || alertTypes['worker_offline']

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MineGlance Alert - TEST</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- TEST BANNER -->
    <div style="background: #805ad5; color: white; text-align: center; padding: 12px; border-radius: 8px 8px 0 0; font-weight: 600;">
      ⚠️ TEST EMAIL - This is a sample alert
    </div>

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 24px; background: white; padding: 32px 24px; border-radius: 0 0 8px 8px; border: 1px solid #e2e8f0; border-top: none;">
      <span style="font-size: 48px;">${alert.emoji}</span>
      <h1 style="color: #1a365d; font-size: 24px; margin: 16px 0 0 0;">${alert.title}</h1>
    </div>

    <!-- Alert Box -->
    <div style="background: ${alert.bgColor}; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid ${alert.borderColor};">
      <p style="color: #2d3748; font-size: 16px; margin: 0 0 8px 0;">
        <strong>Wallet:</strong> Main Mining Rig
      </p>
      <p style="color: #4a5568; font-size: 15px; margin: 0; line-height: 1.6;">
        ${alert.message}
      </p>
    </div>

    <!-- Action -->
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="https://mineglance.com" style="display: inline-block; background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">
        Open MineGlance
      </a>
    </div>

    <!-- What This Email Shows -->
    <div style="background: #edf2f7; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
      <h3 style="color: #2d3748; font-size: 16px; margin: 0 0 12px 0;">About Email Alerts</h3>
      <p style="color: #4a5568; font-size: 14px; margin: 0; line-height: 1.6;">
        MineGlance Pro sends email alerts for:
      </p>
      <ul style="color: #4a5568; font-size: 14px; line-height: 1.8; margin: 12px 0 0 0; padding-left: 20px;">
        <li><strong>Worker Offline</strong> - When your mining workers go offline</li>
        <li><strong>Profit Drop</strong> - When profit drops by your configured threshold</li>
        <li><strong>Better Coin</strong> - When a more profitable coin is available (same algorithm)</li>
      </ul>
    </div>

    <!-- Footer -->
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <p style="color: #a0aec0; font-size: 12px; margin: 0;">
        This is a test email from MineGlance.<br>
        <a href="https://mineglance.com/support" style="color: #a0aec0;">Visit Support</a> |
        <a href="https://mineglance.com" style="color: #a0aec0;">mineglance.com</a>
      </p>
    </div>

  </div>
</body>
</html>
    `

    // Send all 3 types or just the specified one
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: FROM_EMAIL, name: 'MineGlance Alerts' },
        subject: `${alert.emoji} [TEST] MineGlance: ${alert.title} - Main Mining Rig`,
        content: [
          { type: 'text/html', value: emailHtml }
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('SendGrid error:', error)
      return NextResponse.json({ error: 'Failed to send email', details: error }, { status: 500 })
    }

    return NextResponse.json({ success: true, sentTo: email, alertType })
  } catch (error) {
    console.error('Error sending test email:', error)
    return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
  }
}
