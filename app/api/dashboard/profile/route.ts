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

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    return NextResponse.json({
      profile: {
        email: user.email,
        fullName: user.full_name,
        phone: user.phone,
        addressLine1: user.address_line1,
        addressLine2: user.address_line2,
        city: user.city,
        state: user.state,
        zip: user.zip,
        country: user.country,
        profilePhoto: user.profile_photo_url,
        plan: user.plan,
        createdAt: user.created_at
      }
    })

  } catch (error) {
    console.error('Get profile error:', error)
    return NextResponse.json({ error: 'Failed to get profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      fullName,
      phone,
      addressLine1,
      addressLine2,
      city,
      state,
      zip,
      country
    } = body

    // Validate phone format if provided
    if (phone && !/^[\d\s\-+()]*$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({
        full_name: fullName || null,
        phone: phone || null,
        address_line1: addressLine1 || null,
        address_line2: addressLine2 || null,
        city: city || null,
        state: state || null,
        zip: zip || null,
        country: country || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Update profile error:', updateError)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Update profile error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}
