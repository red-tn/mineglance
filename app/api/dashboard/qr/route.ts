import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const QR_SECRET = process.env.QR_SECRET || 'mineglance-qr-secret'

// CORS headers for extension requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

// Handle preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders })
}

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  console.log('QR Auth: Raw header:', authHeader ? authHeader.substring(0, 20) + '...' : 'NULL')

  if (!authHeader?.startsWith('Bearer ')) {
    console.log('QR Auth: No bearer token - header was:', typeof authHeader, authHeader?.length || 0)
    return null
  }

  const token = authHeader.substring(7)
  console.log('QR Auth: Token received:', token.substring(0, 8) + '...')

  // First try as license key (most common for extension)
  const { data: user, error: userError } = await supabase
    .from('paid_users')
    .select('*')
    .eq('license_key', token.toUpperCase())
    .single()

  if (user && !user.is_revoked) {
    console.log('QR Auth: Found user by license key')
    return user
  }

  // Fall back to session token (for dashboard)
  try {
    const { data: session } = await supabase
      .from('user_sessions')
      .select('*, user:paid_users(*)')
      .eq('token', token)
      .single()

    if (session && new Date(session.expires_at) >= new Date()) {
      console.log('QR Auth: Found user by session')
      return session.user
    }
  } catch (e) {
    console.log('QR Auth: Session lookup failed (table may not exist)')
  }

  console.log('QR Auth: No user found, license error:', userError?.message)
  return null
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null

    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({
        error: 'Unauthorized',
        debug: token ? `License ${token.substring(0, 8)}... not found` : 'No token provided'
      }, { status: 401, headers: corsHeaders })
    }

    const { wallets, settings } = await request.json()

    if (!wallets || !Array.isArray(wallets)) {
      return NextResponse.json({ error: 'Wallets data required' }, { status: 400, headers: corsHeaders })
    }

    // Create QR payload
    const timestamp = Date.now()
    const payload = {
      v: 1, // version
      l: user.license_key, // license key
      w: wallets, // wallet configurations
      s: settings || {}, // display settings
      t: timestamp // timestamp
    }

    // Create signature for verification
    const payloadString = JSON.stringify(payload)
    const signature = crypto
      .createHmac('sha256', QR_SECRET)
      .update(payloadString)
      .digest('hex')
      .substring(0, 16) // Use first 16 chars for brevity

    // Final QR data
    const qrData = {
      ...payload,
      sig: signature
    }

    // Encode as base64 for compact QR
    const qrString = Buffer.from(JSON.stringify(qrData)).toString('base64')

    // Create QR code URL (using a QR code service or return data for client-side generation)
    // We'll return the data and let the client generate the QR code
    return NextResponse.json({
      success: true,
      qrData: qrString,
      expiresAt: timestamp + 5 * 60 * 1000 // 5 minutes validity
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('QR generation error:', error)
    return NextResponse.json({ error: 'Failed to generate QR code' }, { status: 500, headers: corsHeaders })
  }
}

// Verify QR code (for mobile app)
export async function PUT(request: NextRequest) {
  try {
    const { qrData } = await request.json()

    if (!qrData) {
      return NextResponse.json({ error: 'QR data required' }, { status: 400 })
    }

    // Decode
    let payload
    try {
      const decoded = Buffer.from(qrData, 'base64').toString('utf8')
      payload = JSON.parse(decoded)
    } catch {
      return NextResponse.json({ error: 'Invalid QR code' }, { status: 400 })
    }

    // Verify timestamp (5 min validity)
    if (!payload.t || Date.now() - payload.t > 5 * 60 * 1000) {
      return NextResponse.json({ error: 'QR code expired' }, { status: 400 })
    }

    // Verify signature
    const { sig, ...payloadWithoutSig } = payload
    const expectedSig = crypto
      .createHmac('sha256', QR_SECRET)
      .update(JSON.stringify(payloadWithoutSig))
      .digest('hex')
      .substring(0, 16)

    if (sig !== expectedSig) {
      return NextResponse.json({ error: 'Invalid QR code signature' }, { status: 400 })
    }

    // Verify license is valid
    const { data: license, error } = await supabase
      .from('paid_users')
      .select('id, is_revoked')
      .eq('license_key', payload.l)
      .single()

    if (error || !license || license.is_revoked) {
      return NextResponse.json({ error: 'Invalid or revoked license' }, { status: 403 })
    }

    // Return the wallet and settings data
    return NextResponse.json({
      success: true,
      wallets: payload.w,
      settings: payload.s,
      licenseKey: payload.l
    })

  } catch (error) {
    console.error('QR verification error:', error)
    return NextResponse.json({ error: 'Failed to verify QR code' }, { status: 500 })
  }
}
