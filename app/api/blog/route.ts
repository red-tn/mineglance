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
    const tag = searchParams.get('tag') // Filter by tag
    const pinned = searchParams.get('pinned') // 'homepage' or 'dashboard'
    const offset = (page - 1) * limit

    let posts: Array<{
      id: string
      title: string
      slug: string
      excerpt: string | null
      featured_image_url: string | null
      author_name: string | null
      published_at: string
      view_count: number
      created_at: string
      tags: string[] | null
    }> = []
    let count = 0

    // Special handling for pinned requests - fill remaining slots with high-view posts
    if (pinned === 'homepage' || pinned === 'dashboard') {
      const pinnedColumn = pinned === 'homepage' ? 'is_pinned_homepage' : 'is_pinned_dashboard'

      // First, get pinned posts
      const { data: pinnedPosts, error: pinnedError } = await supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image_url, author_name, published_at, view_count, created_at, tags')
        .eq('status', 'published')
        .eq(pinnedColumn, true)
        .order('published_at', { ascending: false })
        .limit(limit)

      if (pinnedError) throw pinnedError

      posts = pinnedPosts || []

      // If we don't have enough pinned posts, fill with most viewed posts
      if (posts.length < limit) {
        const remaining = limit - posts.length
        const pinnedIds = posts.map(p => p.id)

        // Get additional posts by view count, excluding already included ones
        const { data: additionalPosts, error: additionalError } = await supabase
          .from('blog_posts')
          .select('id, title, slug, excerpt, featured_image_url, author_name, published_at, view_count, created_at, tags')
          .eq('status', 'published')
          .not('id', 'in', pinnedIds.length > 0 ? `(${pinnedIds.join(',')})` : '(00000000-0000-0000-0000-000000000000)')
          .order('view_count', { ascending: false })
          .limit(remaining)

        if (additionalError) throw additionalError

        posts = [...posts, ...(additionalPosts || [])]
      }

      count = posts.length
    } else {
      // Standard query for non-pinned requests
      let query = supabase
        .from('blog_posts')
        .select('id, title, slug, excerpt, featured_image_url, author_name, published_at, view_count, created_at, tags', { count: 'exact' })
        .eq('status', 'published')

      if (search) {
        query = query.ilike('title', `%${search}%`)
      }

      if (tag) {
        query = query.contains('tags', [tag.toLowerCase()])
      }

      const { data, error, count: totalCount } = await query
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) throw error

      posts = data || []
      count = totalCount || 0
    }

    // Calculate read time for each post (rough estimate: 200 words per minute)
    const postsWithReadTime = posts.map(post => ({
      ...post,
      read_time: Math.max(1, Math.ceil((post.excerpt?.length || 0) / 200))
    }))

    // Get popular tags (top 10) - aggregate from all published posts
    const { data: allPosts } = await supabase
      .from('blog_posts')
      .select('tags')
      .eq('status', 'published')

    const tagCounts: Record<string, number> = {}
    ;(allPosts || []).forEach(post => {
      const postTags = post.tags as string[] | null
      if (postTags && Array.isArray(postTags)) {
        postTags.forEach(t => {
          tagCounts[t] = (tagCounts[t] || 0) + 1
        })
      }
    })

    const popularTags = Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }))

    return NextResponse.json({
      posts: postsWithReadTime,
      total: count || 0,
      page,
      totalPages: Math.ceil((count || 0) / limit),
      popularTags
    })
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return NextResponse.json({ error: 'Failed to fetch blog posts' }, { status: 500 })
  }
}
