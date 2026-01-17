import { NextRequest, NextResponse } from 'next/server'

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'

// Admin authentication check
function isAdmin(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!authHeader || !adminPassword) return false
  const token = authHeader.replace('Bearer ', '')
  return token === adminPassword
}

const templates = [
  {
    subject: '[Template Preview 1/9] Mining Alert - Worker Offline',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MineGlance Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 48px;">🔴</span>
      <h1 style="color: #1a365d; font-size: 24px; margin: 16px 0 0 0;">Worker Offline</h1>
    </div>
    <div style="background: #fed7d7; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #fc8181;">
      <p style="color: #2d3748; font-size: 16px; margin: 0 0 8px 0;"><strong>Wallet:</strong> My BTC Rig</p>
      <p style="color: #4a5568; font-size: 15px; margin: 0; line-height: 1.6;">Worker "rig-01" has been offline for more than 30 minutes. Last seen: 2:45 PM</p>
    </div>
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="https://mineglance.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-right: 12px;">View Dashboard</a>
      <a href="#" style="display: inline-block; background: #e2e8f0; color: #4a5568; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">Open Extension</a>
    </div>
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <p style="color: #a0aec0; font-size: 12px; margin: 0;">You received this alert because email notifications are enabled.<br><a href="https://mineglance.com/dashboard" style="color: #a0aec0;">Manage your account</a> | <a href="https://mineglance.com/support" style="color: #a0aec0;">Get support</a></p>
    </div>
  </div>
</body>
</html>`
  },
  {
    subject: '[Template Preview 2/9] Email Verification',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Verify your MineGlance account</title></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 16px; border: 1px solid #2d2d2d;">
        <tr><td style="padding: 40px 40px 20px; text-align: center;"><h1 style="margin: 0; color: #38a169; font-size: 28px; font-weight: bold;">Verify Your Email</h1></td></tr>
        <tr><td style="padding: 20px 40px;">
          <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Thanks for signing up for MineGlance! Please click the button below to verify your email address and activate your account.</p>
          <div style="text-align: center; margin: 30px 0;"><a href="#" style="display: inline-block; background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Verify Email Address</a></div>
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding: 30px 40px; border-top: 1px solid #2d2d2d;"><p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">Questions? Visit <a href="https://www.mineglance.com/support" style="color: #38a169;">mineglance.com/support</a></p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  },
  {
    subject: '[Template Preview 3/9] Welcome - Email Verified',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to MineGlance!</title></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 16px; border: 1px solid #2d2d2d;">
        <tr><td style="padding: 40px 40px 20px; text-align: center;"><h1 style="margin: 0; color: #38a169; font-size: 28px; font-weight: bold;">Email Verified!</h1></td></tr>
        <tr><td style="padding: 20px 40px;">
          <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Your account is now active. You can start tracking your mining operations!</p>
          <div style="text-align: center; margin: 30px 0;"><a href="https://www.mineglance.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Go to Dashboard</a></div>
        </td></tr>
        <tr><td style="padding: 30px 40px; border-top: 1px solid #2d2d2d;"><p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">Questions? Visit <a href="https://www.mineglance.com/support" style="color: #38a169;">mineglance.com/support</a></p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  },
  {
    subject: '[Template Preview 4/9] License Key Resend',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your MineGlance License Key</title></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;"><h1 style="color: #1a365d; font-size: 28px; margin: 0;">Your License Key</h1><p style="color: #718096; font-size: 16px; margin-top: 8px;">Here's your MineGlance Pro license key.</p></div>
    <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 32px;">
      <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Your License Key</p>
      <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 16px; margin-bottom: 16px;"><code style="color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: 'SF Mono', 'Fira Code', monospace;">XXXX-XXXX-XXXX-XXXX</code></div>
      <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 0;">Keep this safe! You'll need it to activate Pro features.</p>
    </div>
    <div style="background: #ffffff; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #e2e8f0;">
      <h2 style="color: #1a365d; font-size: 18px; margin: 0 0 16px 0;">How to Activate</h2>
      <ol style="color: #4a5568; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;"><li>Open the MineGlance extension</li><li>Click the <strong>gear icon</strong> (Settings)</li><li>Find the <strong>"Pro License"</strong> section</li><li>Paste your license key above</li><li>Click <strong>"Activate"</strong></li></ol>
    </div>
    <div style="text-align: center; padding: 24px 0; border-top: 1px solid #e2e8f0;"><p style="color: #718096; font-size: 14px; margin: 0 0 8px 0;">Need help? We're here for you!</p><a href="https://mineglance.com/support" style="color: #38a169; text-decoration: none; font-weight: 500;">Visit Support</a></div>
  </div>
</body>
</html>`
  },
  {
    subject: '[Template Preview 5/9] Welcome to Pro',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Welcome to MineGlance Pro!</title></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;"><h1 style="color: #1a365d; font-size: 28px; margin: 0;">Welcome to MineGlance Pro!</h1><p style="color: #718096; font-size: 16px; margin-top: 8px;">Your mining dashboard just got a whole lot better.</p></div>
    <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 32px;">
      <p style="color: rgba(255,255,255,0.8); font-size: 14px; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 1px;">Your License Key</p>
      <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 16px; margin-bottom: 16px;"><code style="color: #ffffff; font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: 'SF Mono', 'Fira Code', monospace;">XXXX-XXXX-XXXX-XXXX</code></div>
      <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 0;">Keep this safe!</p>
    </div>
    <div style="background: #f0fff4; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #9ae6b4;">
      <h2 style="color: #276749; font-size: 18px; margin: 0 0 16px 0;">What You Get</h2>
      <ul style="color: #2f855a; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;"><li>Unlimited pools & coins</li><li>Auto-refresh every 5 minutes</li><li>Desktop notifications</li><li>Coin comparison tool</li><li>Historical charts</li><li>Priority support</li></ul>
    </div>
    <div style="background: #fffbeb; border-radius: 12px; padding: 20px; margin-bottom: 32px; border: 1px solid #f6e05e;"><p style="color: #744210; font-size: 14px; margin: 0;"><strong>Note:</strong> Your license can be activated on up to 3 devices.</p></div>
  </div>
</body>
</html>`
  },
  {
    subject: '[Template Preview 6/9] Bundle Upgrade Complete',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Upgrade Complete - MineGlance Bundle</title></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 32px;"><h1 style="color: #1a365d; font-size: 28px; margin: 0;">Upgrade Complete!</h1><p style="color: #718096; font-size: 16px; margin-top: 8px;">You now have the Pro + Mobile Bundle.</p></div>
    <div style="background: linear-gradient(135deg, #276749 0%, #38a169 100%); border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 32px;">
      <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 0 0 16px 0;">Your license has been upgraded!</p>
      <div style="background: rgba(255,255,255,0.15); border-radius: 8px; padding: 16px;"><code style="color: #ffffff; font-size: 20px; font-weight: bold; letter-spacing: 2px; font-family: 'SF Mono', 'Fira Code', monospace;">XXXX-XXXX-XXXX-XXXX</code></div>
      <p style="color: rgba(255,255,255,0.7); font-size: 13px; margin: 16px 0 0 0;">Same license key, more features!</p>
    </div>
    <div style="background: #f0fff4; border-radius: 12px; padding: 24px; margin-bottom: 32px; border: 1px solid #9ae6b4;">
      <h2 style="color: #276749; font-size: 18px; margin: 0 0 16px 0;">What's New With Your Bundle</h2>
      <ul style="color: #2f855a; font-size: 15px; line-height: 1.8; padding-left: 20px; margin: 0;"><li>Everything you had with Pro</li><li><strong>Mobile app (iOS & Android)</strong></li><li>Push notifications on mobile</li><li>Widget support</li><li>Sync across all devices</li><li>5 device activations (up from 3)</li><li>Founding member status</li></ul>
    </div>
    <div style="background: #ebf8ff; border-radius: 12px; padding: 20px; margin-bottom: 32px; border: 1px solid #90cdf4;"><p style="color: #2b6cb0; font-size: 14px; margin: 0;"><strong>No action needed!</strong> Your existing license key now includes all Bundle features.</p></div>
  </div>
</body>
</html>`
  },
  {
    subject: '[Template Preview 7/9] Password Reset',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Reset Your Password</title></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 16px; border: 1px solid #2d2d2d;">
        <tr><td style="padding: 40px 40px 20px; text-align: center;"><h1 style="margin: 0; color: #38a169; font-size: 28px; font-weight: bold;">Reset Your Password</h1></td></tr>
        <tr><td style="padding: 20px 40px;">
          <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">We received a request to reset your MineGlance password. Click the button below to create a new password.</p>
          <div style="text-align: center; margin: 30px 0;"><a href="#" style="display: inline-block; background-color: #38a169; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Reset Password</a></div>
          <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.</p>
        </td></tr>
        <tr><td style="padding: 30px 40px; border-top: 1px solid #2d2d2d;"><p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">Questions? Visit <a href="https://www.mineglance.com/support" style="color: #38a169;">mineglance.com/support</a></p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  },
  {
    subject: '[Template Preview 8/9] Subscription Renewal Reminder',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Your MineGlance Pro subscription is expiring</title></head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 16px; border: 1px solid #2d2d2d;">
        <tr><td style="padding: 40px 40px 20px; text-align: center;"><h1 style="margin: 0; color: #fbbf24; font-size: 28px; font-weight: bold;">Subscription Expiring Soon</h1></td></tr>
        <tr><td style="padding: 20px 40px;">
          <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Your MineGlance Pro subscription will expire in <strong style="color: #fbbf24;">7 days</strong>.</p>
          <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">Renew now to keep access to:</p>
          <ul style="color: #9ca3af; font-size: 14px; line-height: 1.8; margin: 0 0 20px; padding-left: 20px;"><li>Unlimited wallets across all pools</li><li>Cloud sync between devices</li><li>Email alerts for offline workers</li><li>Mobile app with full features</li><li>Priority support</li></ul>
          <div style="text-align: center; margin: 30px 0;"><a href="https://www.mineglance.com/#pricing" style="display: inline-block; background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Renew Now</a></div>
        </td></tr>
        <tr><td style="padding: 30px 40px; border-top: 1px solid #2d2d2d;"><p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">Questions? Visit <a href="https://www.mineglance.com/support" style="color: #38a169;">mineglance.com/support</a></p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
  },
  {
    subject: '[Template Preview 9/9] Profit Drop Alert',
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>MineGlance Alert</title></head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="text-align: center; margin-bottom: 24px;">
      <span style="font-size: 48px;">📉</span>
      <h1 style="color: #1a365d; font-size: 24px; margin: 16px 0 0 0;">Profit Drop</h1>
    </div>
    <div style="background: #feebc8; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #f6ad55;">
      <p style="color: #2d3748; font-size: 16px; margin: 0 0 8px 0;"><strong>Wallet:</strong> My ETH Rig</p>
      <p style="color: #4a5568; font-size: 15px; margin: 0; line-height: 1.6;">Your daily profit has dropped by 25% compared to yesterday. Current: $12.50/day (was $16.67/day)</p>
    </div>
    <div style="text-align: center; margin-bottom: 32px;">
      <a href="https://mineglance.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px; margin-right: 12px;">View Dashboard</a>
      <a href="#" style="display: inline-block; background: #e2e8f0; color: #4a5568; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; font-size: 15px;">Open Extension</a>
    </div>
    <div style="text-align: center; padding-top: 24px; border-top: 1px solid #e2e8f0;">
      <p style="color: #a0aec0; font-size: 12px; margin: 0;">You received this alert because email notifications are enabled.<br><a href="https://mineglance.com/dashboard" style="color: #a0aec0;">Manage your account</a> | <a href="https://mineglance.com/support" style="color: #a0aec0;">Get support</a></p>
    </div>
  </div>
</body>
</html>`
  }
]

export async function POST(request: NextRequest) {
  if (!isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { email } = await request.json()
    const toEmail = email || 'ryan.ncc@gmail.com'

    const results: { subject: string; success: boolean; error?: string }[] = []

    for (const template of templates) {
      try {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: toEmail }] }],
            from: { email: FROM_EMAIL, name: 'MineGlance Templates' },
            subject: template.subject,
            content: [{ type: 'text/html', value: template.html }],
          }),
        })

        results.push({
          subject: template.subject,
          success: response.ok,
          error: response.ok ? undefined : await response.text()
        })

        // Small delay between emails
        await new Promise(resolve => setTimeout(resolve, 500))
      } catch (error) {
        results.push({
          subject: template.subject,
          success: false,
          error: String(error)
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    return NextResponse.json({
      success: true,
      message: `Sent ${successful}/${templates.length} templates to ${toEmail}`,
      results,
      failed
    })

  } catch (error) {
    console.error('Error sending templates:', error)
    return NextResponse.json({ error: 'Failed to send templates' }, { status: 500 })
  }
}
