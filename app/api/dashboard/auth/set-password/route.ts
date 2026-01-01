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
    const { setupToken, password, confirmPassword } = await request.json()

    if (!setupToken || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All fields required' }, { status: 400 })
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Find session by setup token
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*, user:paid_users(*)')
      .eq('token', setupToken)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid or expired setup token' }, { status: 401 })
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      await supabase.from('user_sessions').delete().eq('id', session.id)
      return NextResponse.json({ error: 'Setup token expired. Please login again.' }, { status: 401 })
    }

    const user = session.user as { id: string; email: string; full_name: string | null; plan: string; password_hash: string | null }

    // Make sure user hasn't already set a password (double-check)
    if (user.password_hash) {
      return NextResponse.json({ error: 'Password already set. Please login normally.' }, { status: 400 })
    }

    // Hash and save password
    const passwordHash = hashPassword(password)

    const { error: updateError } = await supabase
      .from('paid_users')
      .update({
        password_hash: passwordHash,
        last_login: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to set password:', updateError)
      return NextResponse.json({ error: 'Failed to set password' }, { status: 500 })
    }

    // Delete the setup token session
    await supabase.from('user_sessions').delete().eq('id', session.id)

    // Create a new long-lived session
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || 'unknown',
        user_agent: request.headers.get('user-agent') || 'unknown'
      })

    return NextResponse.json({
      success: true,
      token,
      user: {
        email: user.email,
        fullName: user.full_name,
        plan: user.plan
      }
    })

  } catch (error) {
    console.error('Set password error:', error)
    return NextResponse.json({ error: 'Failed to set password' }, { status: 500 })
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + SALT).digest('hex')
}
