import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper to verify user session
async function verifyUser(token: string | null) {
  if (!token) return null
  const { data: session } = await supabase
    .from('user_sessions')
    .select('*, users!inner(*)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()
  return session
}

// GET - Get comments for a post
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Get post ID from slug
    const { data: post } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', params.slug)
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    // Fetch approved comments
    const { data: comments, error } = await supabase
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

    if (error) throw error

    // Format comments with masked emails
    const formattedComments = (comments || []).map(comment => ({
      id: comment.id,
      content: comment.content,
      parent_id: comment.parent_id,
      admin_response: comment.admin_response,
      created_at: comment.created_at,
      user_name: (comment.users as { email: string })?.email?.split('@')[0] + '***'
    }))

    return NextResponse.json({ comments: formattedComments })
  } catch (error) {
    console.error('Error fetching comments:', error)
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 })
  }
}

// POST - Add a comment (authenticated users only)
export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    // Verify user is authenticated
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? null
    const session = await verifyUser(token)

    if (!session) {
      return NextResponse.json({ error: 'Authentication required to comment' }, { status: 401 })
    }

    const user = session.users as { id: string }

    // Get post ID from slug
    const { data: post } = await supabase
      .from('blog_posts')
      .select('id')
      .eq('slug', params.slug)
      .eq('status', 'published')
      .single()

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    const body = await request.json()
    const { content, parent_id } = body

    if (!content || content.trim().length < 2) {
      return NextResponse.json({ error: 'Comment content required' }, { status: 400 })
    }

    if (content.length > 2000) {
      return NextResponse.json({ error: 'Comment too long (max 2000 characters)' }, { status: 400 })
    }

    // If replying, verify parent comment exists
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from('blog_comments')
        .select('id, parent_id')
        .eq('id', parent_id)
        .eq('post_id', post.id)
        .single()

      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }

      // Only allow 1 level of nesting
      if (parentComment.parent_id) {
        return NextResponse.json({ error: 'Cannot reply to a reply' }, { status: 400 })
      }
    }

    // Create comment
    const { data: comment, error } = await supabase
      .from('blog_comments')
      .insert({
        post_id: post.id,
        user_id: user.id,
        parent_id: parent_id || null,
        content: content.trim(),
        is_approved: true // Auto-approve for now
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ comment })
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 })
  }
}

// DELETE - Delete own comment
export async function DELETE(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') ?? null
    const session = await verifyUser(token)

    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const user = session.users as { id: string }

    const { searchParams } = new URL(request.url)
    const commentId = searchParams.get('id')

    if (!commentId) {
      return NextResponse.json({ error: 'Comment ID required' }, { status: 400 })
    }

    // Verify user owns this comment
    const { data: comment } = await supabase
      .from('blog_comments')
      .select('user_id')
      .eq('id', commentId)
      .single()

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (comment.user_id !== user.id) {
      return NextResponse.json({ error: 'Cannot delete others comments' }, { status: 403 })
    }

    // Delete replies first
    await supabase
      .from('blog_comments')
      .delete()
      .eq('parent_id', commentId)

    // Delete comment
    const { error } = await supabase
      .from('blog_comments')
      .delete()
      .eq('id', commentId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment:', error)
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 })
  }
}
