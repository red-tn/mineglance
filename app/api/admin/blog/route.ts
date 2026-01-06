import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper to verify admin session
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

// Helper to generate slug from title
function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 100)
}

// Helper to generate excerpt from content
function generateExcerpt(content: string, maxLength: number = 160): string {
  const plainText = content.replace(/[#*_`\[\]]/g, '').trim()
  if (plainText.length <= maxLength) return plainText
  return plainText.substring(0, maxLength).trim() + '...'
}

// GET - List all blog posts
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? null
    const session = await verifyAdmin(token)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    let query = supabase
      .from('blog_posts')
      .select('*', { count: 'exact' })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data: posts, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Get comment counts for each post
    const postsWithCounts = await Promise.all(
      (posts || []).map(async (post) => {
        const { count: commentCount } = await supabase
          .from('blog_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id)
        return { ...post, comment_count: commentCount || 0 }
      })
    )

    return NextResponse.json({
      posts: postsWithCounts,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 })
  }
}

// POST - Create new blog post
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? null
    const session = await verifyAdmin(token)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Generate slug if not provided
    let slug = body.slug || generateSlug(body.title)

    // Check for duplicate slug
    const { data: existing } = await supabase
      .from('blog_posts')
      .select('slug')
      .eq('slug', slug)
      .single()

    if (existing) {
      slug = `${slug}-${Date.now()}`
    }

    // Generate excerpt if not provided
    const excerpt = body.excerpt || generateExcerpt(body.content || '')

    const { data: post, error } = await supabase
      .from('blog_posts')
      .insert({
        title: body.title,
        slug,
        content: body.content,
        excerpt,
        featured_image_url: body.featured_image_url,
        seo_description: body.seo_description || excerpt,
        status: body.status || 'draft',
        is_pinned_homepage: body.is_pinned_homepage || false,
        is_pinned_dashboard: body.is_pinned_dashboard || false,
        author_name: body.author_name || 'MineGlance Team',
        published_at: body.status === 'published' ? new Date().toISOString() : null,
        scheduled_at: body.scheduled_at
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Error creating blog post:', error)
    return NextResponse.json({ error: 'Failed to create blog post' }, { status: 500 })
  }
}
