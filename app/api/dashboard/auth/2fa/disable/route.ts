import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as OTPAuth from 'otpauth'
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
    totp_enabled: boolean
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

// POST - Disable 2FA (requires current code)
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

    const { code } = await request.json()

    if (!code || typeof code !== 'string') {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 })
    }

    if (!user.totp_enabled || !user.totp_secret) {
      return NextResponse.json({ error: '2FA is not enabled' }, { status: 400 })
    }

    const isValid = verifyTOTP(user.totp_secret, code.replace(/\s/g, ''))

    if (!isValid) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 })
    }

    // Disable 2FA, clear secret, and clear backup codes
    await supabase
      .from('users')
      .update({
        totp_enabled: false,
        totp_secret: null,
        backup_codes: null
      })
      .eq('id', user.id)

    // Send notification email
    await sendTemplateEmail({
      to: user.email,
      templateSlug: 'user-2fa-disabled',
      variables: {
        email: user.email,
        fullName: user.full_name || 'User'
      },
      fromName: 'MineGlance Security'
    })

    return NextResponse.json({ success: true, message: '2FA disabled successfully' })
  } catch (error) {
    console.error('2FA disable error:', error)
    return NextResponse.json({ error: 'Failed to disable 2FA' }, { status: 500 })
  }
}
