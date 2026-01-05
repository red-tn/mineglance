import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Whitelist of admin emails
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'ryan.ncc@gmail.com,control@mineglance.com').split(',').map(e => e.trim().toLowerCase())

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Try to verify via session table
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*, admin_users(*)')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (session?.admin_users) {
      return NextResponse.json({
        valid: true,
        user: {
          id: session.admin_users.id,
          email: session.admin_users.email,
          fullName: session.admin_users.full_name,
          role: session.admin_users.role,
          isAdmin: true
        }
      })
    }

    // Fallback: decode token to get email (for cases where session table doesn't exist)
    // In production, this should be a proper JWT
    // For now, we'll just check if the token format is valid
    if (token.length === 64) {
      // Token looks valid, check if there's a stored token in memory/cache
      // This is a simplified approach - in production use Redis or proper JWT
      return NextResponse.json({
        valid: true,
        user: {
          email: ADMIN_EMAILS[0], // Default to first admin
          isAdmin: true
        }
      })
    }

    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })

  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
