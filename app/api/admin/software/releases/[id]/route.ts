import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// DELETE - Delete software release
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // First get the release to find the download URL
    const { data: release } = await supabase
      .from('software_releases')
      .select('download_url')
      .eq('id', id)
      .single()

    // Delete from database
    const { error } = await supabase
      .from('software_releases')
      .delete()
      .eq('id', id)

    if (error) throw error

    // Try to delete from storage if we have a download URL
    if (release?.download_url) {
      try {
        // Extract filename from URL: .../storage/v1/object/public/software/filename.zip
        const urlParts = release.download_url.split('/software/')
        if (urlParts.length > 1) {
          const filename = urlParts[1]
          await supabase.storage.from('software').remove([filename])
          console.log(`Deleted from storage: ${filename}`)
        }
      } catch (storageError) {
        // Log but don't fail - file might not exist
        console.log('Storage delete skipped:', storageError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting release:', error)
    return NextResponse.json({ error: 'Failed to delete release' }, { status: 500 })
  }
}
