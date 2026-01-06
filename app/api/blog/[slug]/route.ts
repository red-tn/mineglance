import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Get single blog post by slug (public)
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Fetch the post
    const { data: post, error } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single()

    if (error || !post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Increment view count
    await supabase
      .from('blog_posts')
      .update({ view_count: (post.view_count || 0) + 1 })
      .eq('id', post.id)

    // Fetch approved comments with user info
    const { data: comments } = await supabase
      .from('blog_comments')
      .select(`
        id,
        content,
        parent_id,
        admin_response,
        created_at,
        users!inner(id, email)
      `)
      .eq('post_id', post.id)
      .eq('is_approved', true)
      .order('created_at', { ascending: true })

    // Format comments with user display names
    const formattedComments = (comments || []).map(comment => ({
      id: comment.id,
      content: comment.content,
      parent_id: comment.parent_id,
      admin_response: comment.admin_response,
      created_at: comment.created_at,
      user_email: (comment.users as { email: string })?.email?.split('@')[0] + '***' // Mask email
    }))

    // Fetch related posts (same author or most recent)
    const { data: relatedPosts } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, featured_image_url, published_at')
      .eq('status', 'published')
      .neq('id', post.id)
      .order('published_at', { ascending: false })
      .limit(3)

    // Calculate read time
    const wordCount = (post.content || '').split(/\s+/).length
    const readTime = Math.max(1, Math.ceil(wordCount / 200))

    return NextResponse.json({
      post: {
        ...post,
        read_time: readTime,
        view_count: (post.view_count || 0) + 1
      },
      comments: formattedComments,
      relatedPosts: relatedPosts || []
    })
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return NextResponse.json({ error: 'Failed to fetch blog post' }, { status: 500 })
  }
}
