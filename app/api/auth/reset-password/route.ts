import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { hashPassword } from '@/lib/password'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'
const WEBSITE_URL = 'https://www.mineglance.com'

// Generate reset token
function generateResetToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Send reset email
async function sendResetEmail(email: string, resetToken: string): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.log('SendGrid not configured, skipping reset email')
    return false
  }

  const resetLink = `${WEBSITE_URL}/reset-password?token=${resetToken}`

  const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 16px; border: 1px solid #2d2d2d;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #38a169; font-size: 28px; font-weight: bold;">
                Reset Your Password
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                We received a request to reset your MineGlance password. Click the button below to create a new password.
              </p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="display: inline-block; background-color: #38a169; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  Reset Password
                </a>
              </div>
              <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 20px 0 0;">
                This link will expire in 1 hour. If you didn't request this reset, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #2d2d2d;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
                Questions? Visit <a href="${WEBSITE_URL}/support" style="color: #38a169;">mineglance.com/support</a>
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
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: FROM_EMAIL, name: 'MineGlance' },
        subject: 'Reset Your MineGlance Password',
        content: [{ type: 'text/html', value: emailContent }],
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Error sending reset email:', error)
    return false
  }
}

// POST - Request password reset (sends email)
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
      .select('id, email, plan')
      .eq('email', normalizedEmail)
      .single()

    if (userError || !user) {
      // Don't reveal if user exists or not
      return NextResponse.json({ success: true, message: 'If an account exists with this email, a reset link has been sent.' })
    }

    // Generate reset token
    const resetToken = generateResetToken()
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store reset token in database
    // First delete any existing token for this user
    await supabase
      .from('password_resets')
      .delete()
      .eq('user_id', user.id)

    // Then insert the new token
    const { error: insertError } = await supabase
      .from('password_resets')
      .insert({
        user_id: user.id,
        token: resetToken,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Failed to store reset token:', insertError)
      // Still return success to not reveal user existence
    }

    // Send reset email
    const emailSent = await sendResetEmail(normalizedEmail, resetToken)

    if (!emailSent) {
      console.error('Failed to send reset email to:', normalizedEmail)
    }

    return NextResponse.json({ success: true, message: 'If an account exists with this email, a reset link has been sent.' })

  } catch (error) {
    console.error('Reset password error:', error)
    return NextResponse.json({ error: 'Failed to process request' }, { status: 500 })
  }
}

// PUT - Set new password with token
export async function PUT(request: NextRequest) {
  try {
    const { token, password } = await request.json()
    console.log('Password reset PUT: Token received (first 8 chars):', token?.substring(0, 8))

    if (!token) {
      return NextResponse.json({ error: 'Reset token is required' }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Find reset token
    console.log('Password reset PUT: Looking up token in database...')
    const { data: resetData, error: resetError } = await supabase
      .from('password_resets')
      .select('id, user_id, token, expires_at')
      .eq('token', token)
      .single()

    console.log('Password reset PUT: Query result:', { found: !!resetData, error: resetError?.message })

    if (resetError || !resetData) {
      console.error('Reset token lookup failed:', resetError)
      return NextResponse.json({ error: 'Invalid or expired reset link' }, { status: 400 })
    }

    // Check if token expired
    if (new Date(resetData.expires_at) < new Date()) {
      // Delete expired token
      await supabase.from('password_resets').delete().eq('id', resetData.id)
      return NextResponse.json({ error: 'Reset link has expired. Please request a new one.' }, { status: 400 })
    }

    // Hash the new password
    const passwordHash = await hashPassword(password)

    // Update user's password
    const { error: updateError } = await supabase
      .from('users')
      .update({
        password_hash: passwordHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', resetData.user_id)

    if (updateError) {
      console.error('Failed to update password:', updateError)
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
    }

    // Delete the used reset token
    await supabase.from('password_resets').delete().eq('id', resetData.id)

    // Invalidate all existing sessions for this user (security measure)
    await supabase.from('user_sessions').delete().eq('user_id', resetData.user_id)

    return NextResponse.json({ success: true, message: 'Password updated successfully. Please sign in with your new password.' })

  } catch (error) {
    console.error('Set password error:', error)
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 })
  }
}
