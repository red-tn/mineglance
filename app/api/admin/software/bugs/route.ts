import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - List all bug fixes
export async function GET(request: NextRequest) {
  try {
    // Verify admin token
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: session } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Fetch bug fixes
    const { data: bugs, error } = await supabase
      .from('bug_fixes')
      .select('*')
      .order('fixed_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ bugs: bugs || [] })
  } catch (error) {
    console.error('Error fetching bugs:', error)
    return NextResponse.json({ error: 'Failed to fetch bugs' }, { status: 500 })
  }
}

// POST - Create new bug fix entry
export async function POST(request: NextRequest) {
  try {
    // Verify admin token
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: session } = await supabase
      .from('user_sessions')
      .select('*')
      .eq('session_token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()

    // Insert new bug fix
    const { data: bug, error } = await supabase
      .from('bug_fixes')
      .insert({
        title: body.title,
        description: body.description,
        platform: body.platform,
        severity: body.severity || 'medium',
        fixed_in_version: body.fixed_in_version,
        reported_by: body.reported_by,
        fixed_at: body.fixed_at || new Date().toISOString()
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ bug })
  } catch (error) {
    console.error('Error creating bug fix:', error)
    return NextResponse.json({ error: 'Failed to create bug fix' }, { status: 500 })
  }
}
