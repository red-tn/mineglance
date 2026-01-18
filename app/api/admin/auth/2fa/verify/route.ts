import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as OTPAuth from 'otpauth'
import crypto from 'crypto'
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
    await sendTemplateEmail({
      to: admin.email,
      templateSlug: '2fa-enabled',
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
