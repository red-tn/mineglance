import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as OTPAuth from 'otpauth'

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

// Send 2FA disabled email
async function send2FADisabledEmail(email: string, fullName: string | null) {
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
        <div style="width: 60px; height: 60px; background: #f59e0b; border-radius: 50%; margin: 0 auto 16px; display: flex; align-items: center; justify-content: center;">
          <span style="font-size: 28px;">&#x26A0;</span>
        </div>
        <h1 style="color: #1a365d; font-size: 24px; margin: 0;">Two-Factor Authentication Disabled</h1>
      </div>

      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Hi ${fullName || 'Admin'},
      </p>

      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
        Two-factor authentication has been disabled on your MineGlance admin account.
      </p>

      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Your account is now protected by password only. We recommend re-enabling 2FA for maximum security.
      </p>

      <div style="background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
        <p style="color: #991b1b; font-size: 14px; margin: 0;">
          <strong>Warning:</strong> If you did not disable 2FA, your account may be compromised. Please change your password immediately and contact support@mineglance.com
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
        subject: '2FA Disabled on Your MineGlance Admin Account',
        content: [{ type: 'text/html', value: emailHtml }],
      }),
    })
  } catch (e) {
    console.error('Failed to send 2FA disabled email:', e)
  }
}

// POST - Disable 2FA (requires current code)
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

    // Check if 2FA is enabled
    if (!admin.totp_enabled || !admin.totp_secret) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
    }

    // Verify the code before disabling
    const isValid = verifyTOTP(admin.totp_secret, code.replace(/\s/g, ''))

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Disable 2FA, clear secret, and clear backup codes
    await supabase
      .from('admin_users')
      .update({
        totp_enabled: false,
        totp_secret: null,
        backup_codes: null
      })
      .eq('id', admin.id)

    // Send notification email
    await send2FADisabledEmail(admin.email, admin.full_name)

    // Log audit
    try {
      await supabase.from('admin_audit_log').insert({
        admin_email: admin.email,
        action: '2fa_disabled',
        details: null,
        ip_address: request.headers.get('x-forwarded-for') || 'unknown'
      })
    } catch (e) {
      console.log('Audit log skipped:', e)
    }

    return NextResponse.json({ success: true, message: '2FA disabled successfully' })
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
  }
}
