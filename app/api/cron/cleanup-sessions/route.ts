import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JOB_ENDPOINT = '/api/cron/cleanup-sessions'

// Verify the request is from Vercel Cron or admin
async function verifyCronRequest(request: NextRequest): Promise<{ valid: boolean; triggeredBy: string }> {
  const authHeader = request.headers.get('authorization')

  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return { valid: true, triggeredBy: 'vercel-cron' }
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('admin_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (session) {
      const { data: admin } = await supabase
        .from('admin_users')
        .select('email')
        .eq('id', session.admin_id)
        .single()
      return { valid: true, triggeredBy: admin?.email || 'admin' }
    }
  }

  return { valid: false, triggeredBy: '' }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  let executionId: string | null = null
  let jobId: string | null = null

  try {
    const { valid, triggeredBy } = await verifyCronRequest(request)
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the cron job record
    const { data: job } = await supabase
      .from('cron_jobs')
      .select('id')
      .eq('endpoint', JOB_ENDPOINT)
      .single()

    jobId = job?.id || null

    // Log execution start
    if (jobId) {
      const { data: execution } = await supabase
        .from('cron_executions')
        .insert({
          job_id: jobId,
          status: 'running',
          triggered_by: triggeredBy,
          started_at: new Date().toISOString()
        })
        .select('id')
        .single()

      executionId = execution?.id || null
    }

    const now = new Date().toISOString()
    const results = {
      user_sessions_deleted: 0,
      admin_sessions_deleted: 0,
      password_resets_deleted: 0
    }

    // Cleanup expired user sessions
    const { count: userSessionsCount } = await supabase
      .from('user_sessions')
      .delete()
      .lt('expires_at', now)
      .select('*', { count: 'exact', head: true })

    results.user_sessions_deleted = userSessionsCount || 0

    // Cleanup expired admin sessions
    const { count: adminSessionsCount } = await supabase
      .from('admin_sessions')
      .delete()
      .lt('expires_at', now)
      .select('*', { count: 'exact', head: true })

    results.admin_sessions_deleted = adminSessionsCount || 0

    // Cleanup expired password reset tokens (older than 1 hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
    const { count: passwordResetsCount } = await supabase
      .from('password_resets')
      .delete()
      .lt('expires_at', oneHourAgo)
      .select('*', { count: 'exact', head: true })

    results.password_resets_deleted = passwordResetsCount || 0

    const duration = Date.now() - startTime
    const result = {
      success: true,
      ...results,
      total_cleaned: results.user_sessions_deleted + results.admin_sessions_deleted + results.password_resets_deleted,
      timestamp: new Date().toISOString(),
      duration_ms: duration
    }

    console.log('Session cleanup completed:', result)

    // Update execution record
    if (executionId) {
      await supabase
        .from('cron_executions')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          result: result
        })
        .eq('id', executionId)
    }

    if (jobId) {
      await supabase
        .from('cron_jobs')
        .update({
          last_run: new Date().toISOString(),
          last_status: 'success'
        })
        .eq('id', jobId)
    }

    return NextResponse.json(result)

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    console.error('Session cleanup error:', error)

    if (executionId) {
      await supabase
        .from('cron_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          error: errorMsg
        })
        .eq('id', executionId)
    }

    if (jobId) {
      await supabase
        .from('cron_jobs')
        .update({
          last_run: new Date().toISOString(),
          last_status: 'failed'
        })
        .eq('id', jobId)
    }

    return NextResponse.json({ error: 'Session cleanup failed', details: errorMsg }, { status: 500 })
  }
}
