import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List all software releases
export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Fetch releases
    const { data: releases, error } = await supabase
      .from('software_releases')
      .select('*')
      .order('released_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ releases: releases || [] })
  } catch (error) {
    console.error('Error fetching releases:', error)
    return NextResponse.json({ error: 'Failed to fetch releases' }, { status: 500 })
  }
}

// POST - Create new software release
export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()

    // Insert new release
    const { data: release, error } = await supabase
      .from('software_releases')
      .insert({
        version: body.version,
        platform: body.platform,
        release_notes: body.release_notes,
        download_url: body.download_url,
        is_latest: body.is_latest || false,
        released_at: body.released_at || new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    // If this is marked as latest, unmark other releases for same platform
    if (body.is_latest) {
      await supabase
        .from('software_releases')
        .update({ is_latest: false })
        .eq('platform', body.platform)
        .neq('id', release.id)
    }

    return NextResponse.json({ release })
  } catch (error) {
    console.error('Error creating release:', error)
    return NextResponse.json({ error: 'Failed to create release' }, { status: 500 })
  }
}
