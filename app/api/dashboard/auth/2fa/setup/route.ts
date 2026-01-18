import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import * as OTPAuth from 'otpauth'
import QRCode from 'qrcode'

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
  return session.user as { id: string; email: string; full_name: string | null }
}

// Generate a random base32 secret
function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let secret = ''
  const randomBytes = new Uint8Array(20)
  crypto.getRandomValues(randomBytes)
  for (let i = 0; i < 20; i++) {
    secret += chars[randomBytes[i] % 32]
  }
  return secret
}

// GET - Generate new TOTP secret and QR code
export async function GET(request: NextRequest) {
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

    // Generate new secret
    const secret = generateSecret()

    // Store secret temporarily (not enabled yet until verified)
    await supabase
      .from('users')
      .update({ totp_secret: secret })
      .eq('id', user.id)

    // Create TOTP instance
    const totp = new OTPAuth.TOTP({
      issuer: 'MineGlance',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: secret
    })

    // Generate otpauth URL
    const otpauthUrl = totp.toString()

    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    })

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      otpauthUrl
    })
  } catch (error) {
    console.error('2FA setup error:', error)
    return NextResponse.json({ error: 'Failed to setup 2FA' }, { status: 500 })
  }
}
