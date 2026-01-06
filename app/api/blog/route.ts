import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List published blog posts (public)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const search = searchParams.get('search')
    const pinned = searchParams.get('pinned') // 'homepage' or 'dashboard'
    const offset = (page - 1) * limit

    let query = supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, featured_image_url, author_name, published_at, view_count, created_at', { count: 'exact' })
      .eq('status', 'published')

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    if (pinned === 'homepage') {
      query = query.eq('is_pinned_homepage', true)
    } else if (pinned === 'dashboard') {
      query = query.eq('is_pinned_dashboard', true)
    }

    const { data: posts, error, count } = await query
      .order('published_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) throw error

    // Calculate read time for each post (rough estimate: 200 words per minute)
    const postsWithReadTime = (posts || []).map(post => ({
      ...post,
      read_time: Math.max(1, Math.ceil((post.excerpt?.length || 0) / 200))
    }))

    return NextResponse.json({
      posts: postsWithReadTime,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 })
  }
}
