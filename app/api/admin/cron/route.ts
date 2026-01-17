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

// GET - List all cron jobs with their execution history
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const admin = await getAdminFromToken(token)

    if (!admin) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Get cron jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('cron_jobs')
      .select('*')
      .order('name')

    if (jobsError) {
      // Table might not exist yet
      console.error('Error fetching cron jobs:', jobsError)
      return NextResponse.json({ jobs: [], executions: [] })
    }

    // Get recent executions (last 50)
    const { data: executions, error: execError } = await supabase
      .from('cron_executions')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(50)

    if (execError) {
      console.error('Error fetching executions:', execError)
    }

    return NextResponse.json({
      jobs: jobs || [],
      executions: executions || []
    })
  } catch (error) {
    console.error('Cron jobs fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch cron jobs' }, { status: 500 })
  }
}

// POST - Create a new cron job or trigger execution
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const admin = await getAdminFromToken(token)

    if (!admin) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const body = await request.json()
    const { action, jobId, name, description, schedule, endpoint, isEnabled } = body

    if (action === 'trigger') {
      // Manually trigger a cron job
      const { data: job } = await supabase
        .from('cron_jobs')
        .select('*')
        .eq('id', jobId)
        .single()

      if (!job) {
        return NextResponse.json({ error: 'Job not found' }, { status: 404 })
      }

      // Call the cron endpoint with admin token (NOT CRON_SECRET)
      // The endpoint itself will create the execution record with correct triggered_by
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mineglance.com'}${job.endpoint}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })

        const result = await response.json()

        return NextResponse.json({
          success: response.ok,
          result,
          duration: result.duration_ms
        })
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error'
        return NextResponse.json({ success: false, error: errorMsg }, { status: 500 })
      }
    }

    // Create new cron job
    if (!name || !endpoint) {
      return NextResponse.json({ error: 'Name and endpoint are required' }, { status: 400 })
    }

    const { data: newJob, error } = await supabase
      .from('cron_jobs')
      .insert({
        name,
        description: description || null,
        schedule: schedule || '0 0 * * *', // Default: daily at midnight
        endpoint,
        is_enabled: isEnabled !== false
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to create cron job:', error)
      return NextResponse.json({ error: 'Failed to create cron job' }, { status: 500 })
    }

    return NextResponse.json({ success: true, job: newJob })
  } catch (error) {
    console.error('Cron job action error:', error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
