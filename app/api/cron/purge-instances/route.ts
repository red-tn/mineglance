import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JOB_ENDPOINT = '/api/cron/purge-instances'

// Verify the request is from Vercel Cron or admin
async function verifyCronRequest(request: NextRequest): Promise<{ valid: boolean; triggeredBy: string }> {
  const authHeader = request.headers.get('authorization')

  // Allow cron secret (Vercel Cron)
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return { valid: true, triggeredBy: 'vercel-cron' }
  }

  // Also allow manual trigger from admin with valid session token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)

    // Verify against admin_sessions table
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
    // Verify this is a legitimate cron request
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

    // Calculate the cutoff date (30 days ago)
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - 30)
    const cutoffISO = cutoffDate.toISOString()

    console.log(`Purging instances not seen since: ${cutoffISO}`)

    // First, get count of instances to be deleted (for logging)
    const { count: staleCount } = await supabase
      .from('user_instances')
      .select('*', { count: 'exact', head: true })
      .lt('last_seen', cutoffISO)

    // Delete stale instances
    const { error, count: deletedCount } = await supabase
      .from('user_instances')
      .delete()
      .lt('last_seen', cutoffISO)

    if (error) {
      throw new Error(`Failed to purge instances: ${error.message}`)
    }

    const duration = Date.now() - startTime
    const result = {
      success: true,
      purged: deletedCount || staleCount || 0,
      cutoffDate: cutoffISO,
      timestamp: new Date().toISOString(),
      duration_ms: duration
    }

    console.log('Instance purge completed:', result)

    // Update execution record with success
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

    // Update job's last run status
    if (jobId) {
      await supabase
        .from('cron_jobs')
        .update({
          last_run: new Date().toISOString(),
          last_status: 'success'
        })
        .eq('id', jobId)
    }

    // Also log to audit
    try {
      await supabase.from('admin_audit_log').insert({
        admin_email: triggeredBy,
        action: 'purge_stale_instances',
        details: result
      })
    } catch {
      // Audit log is optional
    }

    return NextResponse.json(result)

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    console.error('Cron purge error:', error)

    // Update execution record with failure
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

    // Update job's last run status
    if (jobId) {
      await supabase
        .from('cron_jobs')
        .update({
          last_run: new Date().toISOString(),
          last_status: 'failed'
        })
        .eq('id', jobId)
    }

    return NextResponse.json({
      error: 'Purge failed',
      details: errorMsg
    }, { status: 500 })
  }
}
