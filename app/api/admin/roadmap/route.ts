import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List all roadmap items
export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify session
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('*')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Fetch roadmap items
    const { data: items, error } = await supabase
      .from('roadmap_items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ items: items || [] })
  } catch (error) {
    console.error('Error fetching roadmap items:', error)
    return NextResponse.json({ error: 'Failed to fetch roadmap items' }, { status: 500 })
  }
}

// POST - Create new roadmap item
export async function POST(request: NextRequest) {
  try {
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

    const body = await request.json()

    // Insert new item
    const { data: item, error } = await supabase
      .from('roadmap_items')
      .insert({
        category: body.category,
        priority: body.priority,
        platforms: body.platforms || [],
        title: body.title,
        description: body.description,
        status: body.status || 'submitted',
        progress: body.progress || 0,
        admin_response: body.admin_response,
        target_version: body.target_version,
        is_public: body.is_public !== false,
        is_internal: body.is_internal || false
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error creating roadmap item:', error)
    return NextResponse.json({ error: 'Failed to create roadmap item' }, { status: 500 })
  }
}
