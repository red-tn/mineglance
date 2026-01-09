import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAdminFromToken(token: string) {
  const { data: session } = await supabase
    .from('admin_sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!session?.admin_id) return null

  const { data: admin } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', session.admin_id)
    .single()

  return admin || null
}

// PUT - Update a cron job
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const admin = await getAdminFromToken(token)

    if (!admin) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { name, description, schedule, endpoint, isEnabled } = await request.json()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (name !== undefined) updates.name = name
    if (description !== undefined) updates.description = description
    if (schedule !== undefined) updates.schedule = schedule
    if (endpoint !== undefined) updates.endpoint = endpoint
    if (isEnabled !== undefined) updates.is_enabled = isEnabled

    const { error } = await supabase
      .from('cron_jobs')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Failed to update cron job:', error)
      return NextResponse.json({ error: 'Failed to update cron job' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cron job update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

// DELETE - Delete a cron job
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const admin = await getAdminFromToken(token)

    if (!admin) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Delete executions first
    await supabase
      .from('cron_executions')
      .delete()
      .eq('job_id', id)

    // Delete the job
    const { error } = await supabase
      .from('cron_jobs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Failed to delete cron job:', error)
      return NextResponse.json({ error: 'Failed to delete cron job' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cron job delete error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
