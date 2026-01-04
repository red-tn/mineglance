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

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, license_key, plan, is_revoked')
      .eq('email', normalizedEmail)
      .single()

    if (userError || !user) {
      // Don't reveal if email exists - just say "if account exists, email sent"
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, the license key has been sent.'
      })
    }

    if (user.is_revoked) {
      return NextResponse.json({ error: 'Account has been suspended' }, { status: 403 })
    }

    if (!user.license_key || user.plan === 'free') {
      return NextResponse.json({
        success: true,
        message: 'If an account exists with this email, the license key has been sent.',
        note: 'This is a free account - no license key required'
      })
    }

    // Send license key email
    const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your MineGlance License Key</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 16px; border: 1px solid #2d2d2d;">
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #38a169; font-size: 28px; font-weight: bold;">
                Your License Key
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Here's your MineGlance Pro license key:
              </p>

              <!-- License Key Box -->
              <div style="background-color: #1a1a1a; border: 2px solid #38a169; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
                <p style="color: #38a169; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; font-family: monospace;">
                  ${user.license_key}
                </p>
              </div>

              <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                Enter this key along with your email address to access Pro features on any device.
              </p>

              <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 0;">
                <strong>Important:</strong> Keep this key safe. If you suspect unauthorized access, please contact support.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #2d2d2d;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
                Questions? Visit <a href="https://www.mineglance.com/support" style="color: #38a169;">mineglance.com/support</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

    if (SENDGRID_API_KEY) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: user.email }] }],
          from: { email: FROM_EMAIL, name: 'MineGlance' },
          subject: 'Your MineGlance License Key',
          content: [{ type: 'text/html', value: emailContent }],
        }),
      })

      if (!response.ok) {
        console.error('Failed to send license key email:', await response.text())
        return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'If an account exists with this email, the license key has been sent.'
    })

  } catch (error) {
    console.error('Resend key error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}
