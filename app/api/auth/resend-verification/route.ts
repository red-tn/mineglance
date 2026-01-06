import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'

function generateVerificationToken(): string {
  return crypto.randomBytes(48).toString('base64url')
}

async function sendVerificationEmail(email: string, token: string): Promise<void> {
  if (!SENDGRID_API_KEY) return

  const verifyUrl = `https://www.mineglance.com/api/auth/verify-email?token=${encodeURIComponent(token)}`

  const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your MineGlance account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 16px; border: 1px solid #2d2d2d;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #38a169; font-size: 28px; font-weight: bold;">
                Verify Your Email
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Click the button below to verify your email address and activate your MineGlance account.
              </p>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>

              <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                This link will expire in 24 hours.
              </p>

              <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 20px 0 0; padding-top: 20px; border-top: 1px solid #2d2d2d;">
                If the button doesn't work, copy and paste this link:<br>
                <a href="${verifyUrl}" style="color: #38a169; word-break: break-all;">${verifyUrl}</a>
              </p>
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
        subject: 'Verify your MineGlance account',
        content: [{ type: 'text/html', value: emailContent }],
      }),
    })
  } catch (error) {
    console.error('Error sending verification email:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Find user
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, email_verified')
      .eq('email', normalizedEmail)
      .single()

    if (error || !user) {
      // Don't reveal if user exists or not for security
      return NextResponse.json({
        success: true,
        message: 'If an account exists with that email, a verification link has been sent.'
      })
    }

    // Check if already verified
    if (user.email_verified) {
      return NextResponse.json({
        success: true,
        message: 'Your email is already verified. You can log in.'
      })
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken()
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Update user with new token
    await supabase
      .from('users')
      .update({
        email_verification_token: verificationToken,
        email_verification_expires: verificationExpires.toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    // Send verification email
    await sendVerificationEmail(normalizedEmail, verificationToken)

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.'
    })

  } catch (error) {
    console.error('Resend verification error:', error)
    return NextResponse.json({ error: 'Failed to resend verification' }, { status: 500 })
  }
}
