import { NextRequest, NextResponse } from 'next/server'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'

interface WelcomeEmailData {
  to: string
  licenseKey: string
  plan: 'pro' | 'bundle'
}

export async function POST(request: NextRequest) {
  // Only allow internal calls (from webhook)
  const authHeader = request.headers.get('x-internal-auth')
  if (authHeader !== process.env.INTERNAL_API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { to, licenseKey, plan }: WelcomeEmailData = await request.json()

    const planName = plan === 'bundle' ? 'Pro + Mobile Bundle' : 'Pro'
    const planFeatures = plan === 'bundle'
      ? `
        <li>Unlimited pools & coins</li>
        <li>Auto-refresh every 5 minutes</li>
        <li>Desktop notifications</li>
        <li>Coin comparison tool</li>
        <li>Historical charts</li>
        <li>Mobile app (iOS & Android) - Coming Soon!</li>
        <li>Push notifications on mobile</li>
        <li>Founding member status</li>
      `
      : `
        <li>Unlimited pools & coins</li>
        <li>Auto-refresh every 5 minutes</li>
        <li>Desktop notifications</li>
        <li>Coin comparison tool</li>
        <li>Historical charts</li>
        <li>Priority support</li>
      `

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MineGlance ${planName}!</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

    <!-- Header -->
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #1a365d; font-size: 28px; margin: 0;">Welcome to MineGlance ${planName}!</h1>
      <p style="color: #718096; font-size: 16px; margin-top: 8px;">Your mining dashboard just got a whole lot better.</p>
    </div>

    <!-- License Key Box -->
    <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 32px;">
      <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Your License Key</p>
      <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 16px; margin-bottom: 16px;">
        <code style="color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: 'SF Mono', 'Fira Code', monospace;">${licenseKey}</code>
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

    <!-- Features -->
    <div style="background: #f0fff4; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #9ae6b4;">
      <h2 style="color: #276749; font-size: 18px; margin: 0 0 16px 0;">What You Get</h2>
      <ul style="color: #2f855a; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;">
        ${planFeatures}
      </ul>
    </div>

    <!-- Device Limit Notice -->
    <div style="background: #fffbeb; border-radius: 12px; padding: 20px; margin-bottom: 32px; border: 1px solid #f6e05e;">
      <p style="color: #744210; font-size: 14px; margin: 0;">
        <strong>Note:</strong> Your license can be activated on up to 3 devices. If you need to switch devices, you can deactivate old ones from Settings.
      </p>
    </div>

    <!-- Support -->
    <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 14px; margin: 0 0 8px 0;">Questions? We're here to help!</p>
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
        personalizations: [{ to: [{ email: to }] }],
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

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
  }
}
