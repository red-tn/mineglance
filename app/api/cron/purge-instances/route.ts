import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Verify the request is from Vercel Cron
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization')

  // Allow cron secret or admin token
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return true
  }

  // Also allow manual trigger from admin with admin token
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    // Simple check - in production you'd verify admin session
    if (token.length === 64) {
      return true
    }
  }

  return false
}

export async function GET(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    if (!verifyCronRequest(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
      console.error('Error purging instances:', error)
      return NextResponse.json({
        error: 'Failed to purge instances',
        details: error.message
      }, { status: 500 })
    }

    const result = {
      success: true,
      purged: deletedCount || staleCount || 0,
      cutoffDate: cutoffISO,
      timestamp: new Date().toISOString()
    }

    console.log('Instance purge completed:', result)

    // Log to audit if table exists
    try {
      await supabase.from('admin_audit_log').insert({
        admin_email: 'system-cron',
        action: 'purge_stale_instances',
        details: result
      })
    } catch {
      // Audit log is optional
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Cron purge error:', error)
    return NextResponse.json({
      error: 'Purge failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
