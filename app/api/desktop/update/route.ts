import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Tauri updater endpoint
// Returns update manifest in Tauri's expected format
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const platform = searchParams.get('platform') // e.g., "windows-x86_64" or "darwin-x86_64"
    const currentVersion = searchParams.get('version')

    if (!platform || !currentVersion) {
      return NextResponse.json(
        { error: 'Missing platform or version parameter' },
        { status: 400 }
      )
    }

    // Map Tauri platform to our platform names
    let dbPlatform: string
    if (platform.includes('windows')) {
      dbPlatform = 'desktop_windows'
    } else if (platform.includes('darwin')) {
      dbPlatform = 'desktop_macos'
    } else {
      return NextResponse.json(
        { error: 'Unsupported platform' },
        { status: 400 }
      )
    }

    // Get latest release for this platform
    const { data: release, error } = await supabase
      .from('software_releases')
      .select('*')
      .eq('platform', dbPlatform)
      .eq('is_latest', true)
      .single()

    if (error || !release) {
      // No update available - return 204 No Content
      return new NextResponse(null, { status: 204 })
    }

    // Compare versions
    const latestVersion = release.version
    if (!isNewerVersion(currentVersion, latestVersion)) {
      // Already on latest - return 204 No Content
      return new NextResponse(null, { status: 204 })
    }

    // Build download URL from Supabase storage
    const downloadUrl = `https://zbytbrcumxgfeqvhmzsf.supabase.co/storage/v1/object/public/software/${release.file_name}`

    // Return Tauri-compatible update manifest
    const updateManifest = {
      version: latestVersion,
      notes: release.release_notes || 'Bug fixes and improvements',
      pub_date: new Date(release.created_at).toISOString(),
      platforms: {
        [platform]: {
          signature: release.signature || '', // Signature for verification (empty for now)
          url: downloadUrl,
        },
      },
    }

    return NextResponse.json(updateManifest)
  } catch (error) {
    console.error('Desktop update check error:', error)
    return new NextResponse(null, { status: 204 })
  }
}

// Simple semver comparison
function isNewerVersion(current: string, latest: string): boolean {
  const currentParts = current.replace(/^v/, '').split('.').map(Number)
  const latestParts = latest.replace(/^v/, '').split('.').map(Number)

  for (let i = 0; i < 3; i++) {
    const c = currentParts[i] || 0
    const l = latestParts[i] || 0
    if (l > c) return true
    if (l < c) return false
  }

  return false
}
