import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)

  const { data: session, error } = await supabase
    .from('user_sessions')
    .select('*, user:users(*)')
    .eq('token', token)
    .single()

  if (error || !session || new Date(session.expires_at) < new Date()) {
    return null
  }

  return session.user
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { licenseKey } = await request.json()

    if (!licenseKey) {
      return NextResponse.json({ error: 'License key is required' }, { status: 400 })
    }

    const normalizedKey = licenseKey.toUpperCase().trim()

    // Check if this license key exists and is valid
    // First check in paid_users table (legacy) then users table
    let licenseOwner = null

    // Check paid_users table first (for legacy licenses)
    const { data: paidUser } = await supabase
      .from('paid_users')
      .select('*')
      .eq('license_key', normalizedKey)
      .single()

    if (paidUser) {
      // Verify the license belongs to this user's email
      if (paidUser.email.toLowerCase() !== user.email.toLowerCase()) {
        return NextResponse.json({ error: 'This license key belongs to a different email address' }, { status: 400 })
      }

      if (paidUser.is_revoked) {
        return NextResponse.json({ error: 'This license has been revoked' }, { status: 400 })
      }

      licenseOwner = paidUser
    }

    // Also check users table for license keys
    if (!licenseOwner) {
      const { data: userWithLicense } = await supabase
        .from('users')
        .select('*')
        .eq('license_key', normalizedKey)
        .single()

      if (userWithLicense) {
        if (userWithLicense.email.toLowerCase() !== user.email.toLowerCase()) {
          return NextResponse.json({ error: 'This license key belongs to a different email address' }, { status: 400 })
        }

        if (userWithLicense.is_revoked) {
          return NextResponse.json({ error: 'This license has been revoked' }, { status: 400 })
        }

        licenseOwner = userWithLicense
      }
    }

    if (!licenseOwner) {
      return NextResponse.json({ error: 'Invalid license key' }, { status: 400 })
    }

    // Update the user's plan to Pro and store the license key
    const { error: updateError } = await supabase
      .from('users')
      .update({
        plan: 'pro',
        license_key: normalizedKey,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to activate license:', updateError)
      return NextResponse.json({ error: 'Failed to activate license' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      plan: 'pro',
      message: 'License activated! You now have Pro access on all your devices.'
    })

  } catch (error) {
    console.error('Activate license error:', error)
    return NextResponse.json({ error: 'Failed to activate license' }, { status: 500 })
  }
}
