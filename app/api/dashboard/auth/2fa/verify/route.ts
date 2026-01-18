import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as OTPAuth from 'otpauth'
import crypto from 'crypto'
import { sendTemplateEmail } from '@/lib/email'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getUserFromToken(token: string) {
  const { data: session } = await supabase
    .from('user_sessions')
    .select('*, user:users(*)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!session?.user) return null
  return session.user as {
    id: string
    email: string
    full_name: string | null
    totp_secret: string | null
  }
}

// Verify TOTP code
function verifyTOTP(secret: string, code: string): boolean {
  const totp = new OTPAuth.TOTP({
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
    secret: secret
  })

  const delta = totp.validate({ token: code, window: 1 })
  return delta !== null
}

// Generate backup codes
function generateBackupCodes(): { codes: string[], hashedCodes: string[] } {
  const codes: string[] = []
  const hashedCodes: string[] = []

  for (let i = 0; i < 10; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    codes.push(code)
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
    const user = await getUserFromToken(token)

    if (!user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { code, secret } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    // Use secret from request body (passed from setup) or fallback to database
    const totpSecret = secret || user.totp_secret

    if (!totpSecret) {
      return NextResponse.json({ error: 'No 2FA setup in progress. Please start setup again.' }, { status: 400 })
    }

    const isValid = verifyTOTP(totpSecret, code.replace(/\s/g, ''))

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Generate backup codes
    const { codes, hashedCodes } = generateBackupCodes()

    // Enable 2FA, save secret (if passed), and store hashed backup codes
    await supabase
      .from('users')
      .update({
        totp_enabled: true,
        totp_secret: totpSecret,
        backup_codes: hashedCodes
      })
      .eq('id', user.id)

    // Send confirmation email
    await sendTemplateEmail({
      to: user.email,
      templateSlug: 'user-2fa-enabled',
      variables: {
        email: user.email,
        fullName: user.full_name || 'User'
      },
      fromName: 'MineGlance Security'
    })

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
