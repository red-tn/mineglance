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

    // Get session first
    const { data: session, error: sessionError } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (sessionError || !session) {
      // Fallback for token format check
      if (token.length === 64) {
        return NextResponse.json({
          valid: true,
          user: {
            email: ADMIN_EMAILS[0],
            isAdmin: true
          }
        })
      }
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    // Get admin user separately
    if (session.admin_id) {
      const { data: admin } = await supabase
        .from('admin_users')
        .select('*')
        .eq('id', session.admin_id)
        .single()

      if (admin) {
        return NextResponse.json({
          valid: true,
          user: {
            id: admin.id,
            email: admin.email,
            fullName: admin.full_name,
            profilePhotoUrl: admin.profile_photo_url,
            role: admin.role,
            isAdmin: true
          }
        })
      }
    }

    // Session exists but no admin found
    return NextResponse.json({
      valid: true,
      user: {
        email: ADMIN_EMAILS[0],
        isAdmin: true
      }
    })

  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
