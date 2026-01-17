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

    // Generate default display name from email if not set
    const generateDisplayName = (email: string): string => {
      const adjectives = ['Swift', 'Crypto', 'Mining', 'Hash', 'Block', 'Golden', 'Lucky', 'Pro', 'Elite', 'Mega']
      const nouns = ['Miner', 'Hodler', 'Digger', 'Hasher', 'Rig', 'Node', 'Shark', 'Bull', 'King', 'Guru']
      let hash = 0
      for (let i = 0; i < email.length; i++) {
        hash = ((hash << 5) - hash) + email.charCodeAt(i)
        hash |= 0
      }
      const adj = adjectives[Math.abs(hash) % adjectives.length]
      const noun = nouns[Math.abs(hash >> 8) % nouns.length]
      const num = Math.abs(hash % 1000)
      return `${adj}${noun}${num}`
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
        createdAt: user.created_at,
        blogDisplayName: user.blog_display_name || generateDisplayName(user.email),
        blogEmailOptIn: user.blog_email_opt_in !== false // Default true if null
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
      country,
      blogDisplayName,
      blogEmailOptIn
    } = body

    // Validate phone format if provided
    if (phone && !/^[\d\s\-+()]*$/.test(phone)) {
      return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
    }

    // Validate blog display name if provided
    if (blogDisplayName) {
      // Check length (3-30 chars)
      if (blogDisplayName.length < 3 || blogDisplayName.length > 30) {
        return NextResponse.json({ error: 'Display name must be 3-30 characters' }, { status: 400 })
      }
      // Check characters (alphanumeric and underscore only)
      if (!/^[a-zA-Z0-9_]+$/.test(blogDisplayName)) {
        return NextResponse.json({ error: 'Display name can only contain letters, numbers, and underscores' }, { status: 400 })
      }
      // Check uniqueness
      const { data: existing } = await supabase
        .from('users')
        .select('id')
        .eq('blog_display_name', blogDisplayName)
        .neq('id', user.id)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Display name already taken' }, { status: 400 })
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      full_name: fullName || null,
      phone: phone || null,
      address_line1: addressLine1 || null,
      address_line2: addressLine2 || null,
      city: city || null,
      state: state || null,
      zip: zip || null,
      country: country || null,
      blog_display_name: blogDisplayName || null,
      updated_at: new Date().toISOString()
    }

    // Only update blog_email_opt_in if explicitly provided
    if (typeof blogEmailOptIn === 'boolean') {
      updateData.blog_email_opt_in = blogEmailOptIn
    }

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
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
