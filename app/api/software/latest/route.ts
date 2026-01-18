import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Get latest version for a platform (public endpoint)
export async function GET(request: NextRequest) {
  try {
    const platform = request.nextUrl.searchParams.get('platform')

    if (!platform) {
      return NextResponse.json({ error: 'Platform required' }, { status: 400 })
    }

    // Valid platforms
    const validPlatforms = ['extension', 'mobile_ios', 'mobile_android']
    if (!validPlatforms.includes(platform)) {
      return NextResponse.json({ error: 'Invalid platform' }, { status: 400 })
    }

    // Fetch latest release for this platform
    const { data: release, error } = await supabase
      .from('software_releases')
      .select('version, release_notes, download_url, released_at')
      .eq('platform', platform)
      .eq('is_latest', true)
      .single()

    if (error || !release) {
      // No latest release found, try to get most recent
      const { data: fallback } = await supabase
        .from('software_releases')
        .select('version, release_notes, download_url, released_at')
        .eq('platform', platform)
        .order('released_at', { ascending: false })
        .limit(1)
        .single()

      if (!fallback) {
        return NextResponse.json({
          version: null,
          message: 'No release found for this platform'
        })
      }

      return NextResponse.json({
        version: fallback.version,
        releaseNotes: fallback.release_notes,
        downloadUrl: fallback.download_url,
        releasedAt: fallback.released_at
      })
    }

    return NextResponse.json({
      version: release.version,
      releaseNotes: release.release_notes,
      downloadUrl: release.download_url,
      releasedAt: release.released_at
    })

  } catch (error) {
    console.error('Error fetching latest version:', error)
    return NextResponse.json({ error: 'Failed to fetch latest version' }, { status: 500 })
  }
}
