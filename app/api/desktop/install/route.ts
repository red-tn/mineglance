import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Track desktop app installation and heartbeat
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instanceId, userId, platform, version, deviceName } = body

    if (!instanceId || !platform || !version) {
      return NextResponse.json(
        { error: 'Missing required fields: instanceId, platform, version' },
        { status: 400 }
      )
    }

    // Validate platform
    if (!['desktop_windows', 'desktop_macos'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid platform' },
        { status: 400 }
      )
    }

    // Check if instance exists
    const { data: existing } = await supabase
      .from('user_instances')
      .select('id')
      .eq('instance_id', instanceId)
      .single()

    if (existing) {
      // Update existing instance (heartbeat)
      await supabase
        .from('user_instances')
        .update({
          user_id: userId || null,
          version,
          last_seen: new Date().toISOString(),
          platform,
          device_name: deviceName || (platform === 'desktop_windows' ? 'Windows Desktop' : 'macOS Desktop'),
        })
        .eq('instance_id', instanceId)
    } else {
      // Create new instance
      await supabase
        .from('user_instances')
        .insert({
          instance_id: instanceId,
          user_id: userId || null,
          platform,
          version,
          device_name: deviceName || (platform === 'desktop_windows' ? 'Windows Desktop' : 'macOS Desktop'),
          browser: null, // Not applicable for desktop
          last_seen: new Date().toISOString(),
        })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Desktop install tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track installation' },
      { status: 500 }
    )
  }
}

// GET - Check for updates (simple version check)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform')

    if (!platform || !['desktop_windows', 'desktop_macos'].includes(platform)) {
      return NextResponse.json(
        { error: 'Invalid or missing platform' },
        { status: 400 }
      )
    }

    // Get latest release for this platform
    const { data: release, error } = await supabase
      .from('software_releases')
      .select('version, release_notes, download_url, released_at')
      .eq('platform', platform)
      .eq('is_latest', true)
      .single()

    if (error || !release) {
      return NextResponse.json({ version: null, downloadUrl: null })
    }

    return NextResponse.json({
      version: release.version,
      releaseNotes: release.release_notes,
      downloadUrl: release.download_url,
      releasedAt: release.released_at,
    })
  } catch (error) {
    console.error('Desktop version check error:', error)
    return NextResponse.json({ version: null, downloadUrl: null })
  }
}
