import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SALT = process.env.USER_SALT || 'mineglance-user-salt'

export async function POST(request: NextRequest) {
  try {
    const { licenseKey, email, password } = await request.json()

    if (!licenseKey || !email) {
      return NextResponse.json({ error: 'License key and email required' }, { status: 400 })
    }

    const normalizedKey = licenseKey.toUpperCase().trim()
    const normalizedEmail = email.toLowerCase().trim()

    // Find user by license key and email
    const { data: user, error } = await supabase
      .from('paid_users')
      .select('*')
      .eq('license_key', normalizedKey)
      .eq('email', normalizedEmail)
      .single()

    if (error || !user) {
      return NextResponse.json({ error: 'Invalid license key or email' }, { status: 401 })
    }

    if (user.is_revoked) {
      return NextResponse.json({ error: 'License has been revoked' }, { status: 403 })
    }

    // Check if password has been set
    if (!user.password_hash) {
      // First-time login - user needs to set password
      // Generate a temporary token for password setup
      const setupToken = crypto.randomBytes(32).toString('hex')

      // Store token temporarily (expires in 1 hour)
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)
      await supabase
        .from('user_sessions')
        .insert({
          user_id: user.id,
          token: setupToken,
          expires_at: expiresAt.toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        })

      return NextResponse.json({
        requiresPasswordSetup: true,
        setupToken,
        user: {
          email: user.email,
          fullName: user.full_name
        }
      })
    }

    // Verify password
    if (!password) {
      return NextResponse.json({ error: 'Password required' }, { status: 400 })
    }

    const passwordHash = hashPassword(password)
    if (passwordHash !== user.password_hash) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 })
    }

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Store session
    await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    // Update last login
    await supabase
      .from('paid_users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    return NextResponse.json({
      success: true,
      token,
      user: {
        email: user.email,
        fullName: user.full_name,
        plan: user.plan,
        profilePhoto: user.profile_photo_url
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SALT).digest('hex')
}
