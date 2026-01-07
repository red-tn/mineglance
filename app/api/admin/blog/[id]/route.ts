import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyAdmin(token: string | null) {
  if (!token) return null
  const { data: session } = await supabase
    .from('admin_sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()
  return session
}

// GET - Get single blog post
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? null
    const session = await verifyAdmin(token)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('id', params.id)
      .single()

    if (error) throw error
    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return NextResponse.json({ error: 'Failed to fetch blog post' }, { status: 500 })
  }
}

// PUT - Update blog post
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? null
    const session = await verifyAdmin(token)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Get current post to check status change
    const { data: currentPost } = await supabase
      .from('blog_posts')
      .select('status, published_at')
      .eq('id', params.id)
      .single()

    // Set published_at if status changes to published
    let published_at = currentPost?.published_at
    if (body.status === 'published' && currentPost?.status !== 'published') {
      published_at = new Date().toISOString()
    }

    // Parse tags - accept both string (comma-separated) and array
    let tags: string[] | undefined = undefined
    if (body.tags !== undefined) {
      if (typeof body.tags === 'string') {
        tags = body.tags.split(',').map((t: string) => t.trim().toLowerCase()).filter(Boolean)
      } else if (Array.isArray(body.tags)) {
        tags = body.tags.map((t: string) => t.trim().toLowerCase()).filter(Boolean)
      }
    }

    const updateData: Record<string, unknown> = {
      title: body.title,
      slug: body.slug,
      content: body.content,
      excerpt: body.excerpt,
      featured_image_url: body.featured_image_url,
      seo_description: body.seo_description,
      status: body.status,
      is_pinned_homepage: body.is_pinned_homepage,
      is_pinned_dashboard: body.is_pinned_dashboard,
      author_name: body.author_name,
      published_at,
      scheduled_at: body.scheduled_at,
      updated_at: new Date().toISOString()
    }

    if (tags !== undefined) {
      updateData.tags = tags
    }

    const { data: post, error } = await supabase
      .from('blog_posts')
      .update(updateData)
      .eq('id', params.id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error updating blog post:', error)
    return NextResponse.json({ error: 'Failed to update blog post' }, { status: 500 })
  }
}

// DELETE - Delete blog post
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? null
    const session = await verifyAdmin(token)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete associated comments first
    await supabase
      .from('blog_comments')
      .delete()
      .eq('post_id', params.id)

    // Delete post
    const { error } = await supabase
      .from('blog_posts')
      .delete()
      .eq('id', params.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting blog post:', error)
    return NextResponse.json({ error: 'Failed to delete blog post' }, { status: 500 })
  }
}
