import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'

// Send welcome email after verification
async function sendWelcomeEmail(email: string): Promise<void> {
  if (!SENDGRID_API_KEY) return

  const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to MineGlance!</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 16px; border: 1px solid #2d2d2d;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #38a169; font-size: 28px; font-weight: bold;">
                Email Verified!
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Your account is now active. You can start tracking your mining operations!
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://www.mineglance.com/dashboard" style="display: inline-block; background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  Go to Dashboard
                </a>
              </div>

              <div style="background: rgba(56, 161, 105, 0.1); border: 1px solid rgba(56, 161, 105, 0.3); border-radius: 12px; padding: 20px; text-align: center; margin-top: 30px;">
                <p style="color: #38a169; margin: 0 0 10px; font-size: 14px; font-weight: 600;">
                  Upgrade to Pro - Save 10%
                </p>
                <p style="color: #9ca3af; margin: 0; font-size: 13px;">
                  Use code <strong style="color: #fbbf24;">MINE26</strong> for $59/year
                </p>
              </div>
            </td>
          </tr>
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

  try {
    await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: FROM_EMAIL, name: 'MineGlance' },
        subject: 'Welcome to MineGlance!',
        content: [{ type: 'text/html', value: emailContent }],
      }),
    })
  } catch (error) {
    console.error('Error sending welcome email:', error)
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/dashboard/login?error=missing_token', request.url))
  }

  try {
    // Find user with this verification token
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, email_verified, email_verification_expires')
      .eq('email_verification_token', token)
      .single()

    if (error || !user) {
      return NextResponse.redirect(new URL('/dashboard/login?error=invalid_token', request.url))
    }

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.redirect(new URL('/dashboard/login?message=already_verified', request.url))
    }

    // Check if token has expired
    if (user.email_verification_expires && new Date(user.email_verification_expires) < new Date()) {
      return NextResponse.redirect(new URL('/dashboard/login?error=token_expired', request.url))
    }

    // Mark email as verified and clear verification token
    const { error: updateError } = await supabase
      .from('users')
      .update({
        email_verified: true,
        email_verification_token: null,
        email_verification_expires: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error verifying email:', updateError)
      return NextResponse.redirect(new URL('/dashboard/login?error=verification_failed', request.url))
    }

    // Send welcome email (async)
    sendWelcomeEmail(user.email)

    // Redirect to login with success message
    return NextResponse.redirect(new URL('/dashboard/login?message=email_verified', request.url))

  } catch (error) {
    console.error('Verify email error:', error)
    return NextResponse.redirect(new URL('/dashboard/login?error=verification_failed', request.url))
  }
}
