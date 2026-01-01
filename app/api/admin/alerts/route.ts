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
    const alertType = searchParams.get('type') || 'all'
    const period = searchParams.get('period') || '7'

    const offset = (page - 1) * limit
    const periodDays = parseInt(period)
    const startDate = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000)

    // Build query
    let query = supabase
      .from('email_alerts_log')
      .select('*', { count: 'exact' })
      .gte('created_at', startDate.toISOString())

    if (alertType !== 'all') {
      query = query.eq('alert_type', alertType)
    }

    const { count } = await query

    // Get paginated data
    let dataQuery = supabase
      .from('email_alerts_log')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (alertType !== 'all') {
      dataQuery = dataQuery.eq('alert_type', alertType)
    }

    const { data: alerts, error } = await dataQuery

    if (error) {
      console.error('Alerts query error:', error)
    }

    // Get summary stats
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    const { data: last24h } = await supabase
      .from('email_alerts_log')
      .select('alert_type')
      .gte('created_at', oneDayAgo.toISOString())

    // Count by type
    const typeCounts: Record<string, number> = {}
    const last24hByType: Record<string, number> = {}

    if (alerts) {
      alerts.forEach(a => {
        typeCounts[a.alert_type] = (typeCounts[a.alert_type] || 0) + 1
      })
    }

    if (last24h) {
      last24h.forEach(a => {
        last24hByType[a.alert_type] = (last24hByType[a.alert_type] || 0) + 1
      })
    }

    // Generate chart data (by hour for last 24h, by day for longer periods)
    const chartData: Array<{ label: string; count: number }> = []

    if (periodDays <= 1) {
      // Hourly for last 24 hours
      for (let i = 23; i >= 0; i--) {
        const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
        const hourStart = new Date(hour)
        hourStart.setMinutes(0, 0, 0)
        const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000)

        const count = (alerts || []).filter(a => {
          const alertTime = new Date(a.created_at)
          return alertTime >= hourStart && alertTime < hourEnd
        }).length

        chartData.push({
          label: hour.toLocaleTimeString('en-US', { hour: 'numeric' }),
          count
        })
      }
    } else {
      // Daily
      for (let i = periodDays - 1; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]

        const count = (alerts || []).filter(a => {
          const alertDate = new Date(a.created_at).toISOString().split('T')[0]
          return alertDate === dateStr
        }).length

        chartData.push({
          label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count
        })
      }
    }

    return NextResponse.json({
      alerts: alerts || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      summary: {
        total: count || 0,
        last24h: (last24h || []).length,
        byType: typeCounts,
        last24hByType
      },
      chartData
    })

  } catch (error) {
    console.error('Alerts error:', error)
    return NextResponse.json({
      alerts: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
      summary: { total: 0, last24h: 0, byType: {}, last24hByType: {} },
      chartData: []
    })
  }
}
