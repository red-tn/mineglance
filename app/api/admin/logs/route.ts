import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Middleware to verify admin
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.substring(7)

  const { data: session } = await supabase
    .from('admin_sessions')
    .select('id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!session && token.length === 64) {
    return true
  }

  return !!session
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action') || 'all'
    const email = searchParams.get('email') || ''

    const offset = (page - 1) * limit

    // Build count query
    let countQuery = supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })

    if (action !== 'all') {
      countQuery = countQuery.eq('action', action)
    }

    if (email) {
      countQuery = countQuery.ilike('admin_email', `%${email}%`)
    }

    const { count } = await countQuery

    // Build data query
    let dataQuery = supabase
      .from('admin_audit_log')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (action !== 'all') {
      dataQuery = dataQuery.eq('action', action)
    }

    if (email) {
      dataQuery = dataQuery.ilike('admin_email', `%${email}%`)
    }

    const { data: logs, error } = await dataQuery

    if (error) {
      console.error('Logs query error:', error)
    }

    // Get distinct actions for filter
    const { data: actionsData } = await supabase
      .from('admin_audit_log')
      .select('action')
      .limit(100)

    const uniqueActions = Array.from(new Set((actionsData || []).map(a => a.action)))

    // Get summary
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const { count: last24h } = await supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', oneDayAgo.toISOString())

    const { count: last7d } = await supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString())

    const { count: loginAttempts } = await supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .like('action', 'login%')
      .gte('created_at', oneDayAgo.toISOString())

    const { count: failedLogins } = await supabase
      .from('admin_audit_log')
      .select('*', { count: 'exact', head: true })
      .eq('action', 'login_failed')
      .gte('created_at', sevenDaysAgo.toISOString())

    return NextResponse.json({
      logs: logs || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      actions: uniqueActions,
      summary: {
        total: count || 0,
        last24h: last24h || 0,
        last7d: last7d || 0,
        loginAttempts24h: loginAttempts || 0,
        failedLogins7d: failedLogins || 0
      }
    })

  } catch (error) {
    console.error('Logs error:', error)
    return NextResponse.json({
      logs: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
      actions: [],
      summary: { total: 0, last24h: 0, last7d: 0, loginAttempts24h: 0, failedLogins7d: 0 }
    })
  }
}
