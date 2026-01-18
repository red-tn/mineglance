import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as OTPAuth from 'otpauth'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'alerts@mineglance.com'

async function getAdminFromToken(token: string) {
  const { data: session } = await supabase
    .from('admin_sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!session?.admin_id) return null

  const { data: admin } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', session.admin_id)
    .single()

  return admin || null
}

// Verify TOTP code
function verifyTOTP(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
  })

  // Allow 1 period window (30 seconds before/after)
  const delta = totp.validate({ token: code, window: 1 })
  return delta !== null
}

// Generate backup codes
function generateBackupCodes(): { codes: string[], hashedCodes: string[] } {
  const codes: string[] = []
  const hashedCodes: string[] = []

  for (let i = 0; i < 10; i++) {
    // Generate 8-character alphanumeric code (easy to type)
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
    // Hash for storage
    hashedCodes.push(crypto.createHash('sha256').update(code).digest('hex'))
  }

  return { codes, hashedCodes }
}

// Send 2FA enabled email
async function send2FAEnabledEmail(email: string, fullName: string | null) {
  const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f7fafc;">
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <div style="background: white; border-radius: 12px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 24px;">
        <div style="width: 60px; height: 60px; background: #10b981; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 28px;">&#x1F512;</span>
        </div>
        <h1 style="color: #1a365d; font-size: 24px; margin: 0;">Two-Factor Authentication Enabled</h1>
      </div>

      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Hi ${fullName || 'Admin'},
      </p>

      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Two-factor authentication has been successfully enabled on your MineGlance admin account.
      </p>

      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        From now on, you'll need to enter a code from your authenticator app when signing in.
      </p>

      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #92400e; font-size: 14px; margin: 0;">
          <strong>Important:</strong> If you did not enable 2FA on your account, please contact support immediately at support@mineglance.com
        </p>
      </div>

      <p style="color: #718096; font-size: 14px; margin: 0;">
        Stay secure,<br>
        The MineGlance Team
      </p>
    </div>
  </div>
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
        from: { email: FROM_EMAIL, name: 'MineGlance Security' },
        subject: '2FA Enabled on Your MineGlance Admin Account',
        content: [{ type: 'text/html', value: emailHtml }],
      }),
    })
  } catch (e) {
    console.error('Failed to send 2FA enabled email:', e)
  }
}

// POST - Verify TOTP code and enable 2FA
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const admin = await getAdminFromToken(token)

    if (!admin) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    // Check if admin has a pending secret
    if (!admin.totp_secret) {
      return NextResponse.json({ error: 'No 2FA setup in progress' }, { status: 400 })
    }

    // Verify the code
    const isValid = verifyTOTP(admin.totp_secret, code.replace(/\s/g, ''))

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Generate backup codes
    const { codes, hashedCodes } = generateBackupCodes()

    // Enable 2FA and store hashed backup codes
    await supabase
      .from('admin_users')
      .update({
        totp_enabled: true,
        backup_codes: hashedCodes
      })
      .eq('id', admin.id)

    // Send confirmation email
    await send2FAEnabledEmail(admin.email, admin.full_name)

    // Log audit
    try {
      await supabase.from('admin_audit_log').insert({
        admin_email: admin.email,
        action: '2fa_enabled',
        details: { method: 'totp' },
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      })
    } catch (e) {
      console.log('Audit log skipped:', e)
    }

    // Return backup codes (only shown once)
    return NextResponse.json({
      success: true,
      message: '2FA enabled successfully',
      backupCodes: codes
    })
  } catch (error) {
    console.error('2FA verify error:', error)
    return NextResponse.json({ error: 'Failed to verify code' }, { status: 500 })
  }
}
