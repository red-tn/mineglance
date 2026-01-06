import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(crypto.scrypt)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'

// Generate session token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

// Generate verification token
function generateVerificationToken(): string {
  return crypto.randomBytes(48).toString('base64url')
}

// Hash password with salt
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = await scrypt(password, salt, 64) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

// Send verification email
async function sendVerificationEmail(email: string, token: string): Promise<void> {
  if (!SENDGRID_API_KEY) {
    console.log('SendGrid not configured, skipping verification email')
    return
  }

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
          <!-- Header -->
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #38a169; font-size: 28px; font-weight: bold;">
                Verify Your Email
              </h1>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Thanks for signing up for MineGlance! Please click the button below to verify your email address and activate your account.
              </p>

              <!-- Verify Button -->
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verifyUrl}" style="display: inline-block; background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  Verify Email Address
                </a>
              </div>

              <p style="color: #9ca3af; font-size: 14px; line-height: 1.6; margin: 0 0 20px;">
                This link will expire in 24 hours. If you didn't create an account, you can safely ignore this email.
              </p>

              <p style="color: #6b7280; font-size: 12px; line-height: 1.6; margin: 20px 0 0; padding-top: 20px; border-top: 1px solid #2d2d2d;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${verifyUrl}" style="color: #38a169; word-break: break-all;">${verifyUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Upgrade CTA -->
          <tr>
            <td style="padding: 20px 40px;">
              <div style="background: rgba(56, 161, 105, 0.1); border: 1px solid rgba(56, 161, 105, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
                <p style="color: #38a169; margin: 0 0 10px; font-size: 14px; font-weight: 600;">
                  New User Discount: MINE26
                </p>
                <p style="color: #9ca3af; margin: 0; font-size: 13px;">
                  Use code <strong style="color: #fbbf24;">MINE26</strong> for 10% off Pro ($59/year)
                </p>
              </div>
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
        subject: 'Verify your MineGlance account',
        content: [{ type: 'text/html', value: emailContent }],
      }),
    })

    if (!response.ok) {
      console.error('Failed to send verification email:', await response.text())
    }
  } catch (error) {
    console.error('Error sending verification email:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, instanceId, deviceType, deviceName, browser, version } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email, plan, license_key')
      .eq('email', normalizedEmail)
      .single()

    if (existingUser) {
      // User exists - they should use login instead
      return NextResponse.json({
        error: 'Account already exists',
        exists: true,
        hasPro: existingUser.plan === 'pro',
        requiresLicenseKey: existingUser.plan === 'pro'
      }, { status: 409 })
    }

    // Hash the password
    const passwordHash = await hashPassword(password)

    // Generate email verification token
    const verificationToken = generateVerificationToken()
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Create new free user (email_verified = false)
    const userId = crypto.randomUUID()
    const { error: insertError } = await supabase
      .from('users')
      .insert({
        id: userId,
        email: normalizedEmail,
        password_hash: passwordHash,
        plan: 'free',
        license_key: null,
        email_verified: false,
        email_verification_token: verificationToken,
        email_verification_expires: verificationExpires.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (insertError) {
      console.error('Error creating user:', insertError)
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 })
    }

    // Create default settings for the user
    await supabase
      .from('user_settings')
      .insert({
        user_id: userId,
        refresh_interval: 30,
        electricity_rate: 0.12,
        electricity_currency: 'USD',
        currency: 'USD'
      })

    // Send verification email (async, don't block response)
    sendVerificationEmail(normalizedEmail, verificationToken)

    // Return success but NO token - user must verify email first
    return NextResponse.json({
      success: true,
      message: 'Please check your email to verify your account',
      requiresVerification: true,
      email: normalizedEmail
    })

  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
