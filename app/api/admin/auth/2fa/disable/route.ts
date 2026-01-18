import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as OTPAuth from 'otpauth'
import { sendTemplateEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
    await sendTemplateEmail({
      to: admin.email,
      templateSlug: '2fa-disabled',
      variables: {
        email: admin.email,
        fullName: admin.full_name || 'Admin'
      },
      fromName: 'MineGlance Security'
    })

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
