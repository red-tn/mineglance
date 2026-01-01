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
    .select('*, user:paid_users(*)')
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

    const { photo } = await request.json()

    if (!photo) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 })
    }

    // Validate base64 image
    const base64Pattern = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/
    if (!base64Pattern.test(photo)) {
      return NextResponse.json({ error: 'Invalid image format' }, { status: 400 })
    }

    // Check size (max 500KB after base64 encoding, roughly 375KB actual image)
    const base64Data = photo.split(',')[1]
    const sizeInBytes = (base64Data.length * 3) / 4
    if (sizeInBytes > 500000) {
      return NextResponse.json({ error: 'Image too large. Max 500KB.' }, { status: 400 })
    }

    // Store the base64 image directly (for simplicity)
    // In production, you'd upload to a storage service like S3 or Supabase Storage
    const { error: updateError } = await supabase
      .from('paid_users')
      .update({
        profile_photo_url: photo,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Update photo error:', updateError)
      return NextResponse.json({ error: 'Failed to save photo' }, { status: 500 })
    }

    return NextResponse.json({ success: true, photoUrl: photo })

  } catch (error) {
    console.error('Upload photo error:', error)
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error: updateError } = await supabase
      .from('paid_users')
      .update({
        profile_photo_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Delete photo error:', updateError)
      return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete photo error:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
