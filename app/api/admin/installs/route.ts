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
    const period = searchParams.get('period') || '30'
    const isPro = searchParams.get('isPro')

    const offset = (page - 1) * limit
    const now = new Date()
    const periodDays = parseInt(period)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get total count
    let countQuery = supabase
      .from('installations')
      .select('*', { count: 'exact', head: true })

    if (isPro === 'true') {
      countQuery = countQuery.not('license_key', 'is', null)
    } else if (isPro === 'false') {
      countQuery = countQuery.is('license_key', null)
    }

    const { count } = await countQuery

    // Get paginated data
    let dataQuery = supabase
      .from('installations')
      .select('*')
      .order('last_seen', { ascending: false })
      .range(offset, offset + limit - 1)

    if (isPro === 'true') {
      dataQuery = dataQuery.not('license_key', 'is', null)
    } else if (isPro === 'false') {
      dataQuery = dataQuery.is('license_key', null)
    }

    const { data: installations, error } = await dataQuery

    if (error) {
      console.error('Installations query error:', error)
    }

    // Get summary stats
    const { data: allInstalls } = await supabase
      .from('installations')
      .select('first_seen, last_seen, license_key')

    const total = allInstalls?.length || 0
    const proUsers = allInstalls?.filter(i => i.license_key).length || 0
    const freeUsers = total - proUsers
    const activeUsers = allInstalls?.filter(i => {
      const lastSeen = new Date(i.last_seen)
      return lastSeen >= sevenDaysAgo
    }).length || 0

    // Generate chart data (new installs per day)
    const chartData: Array<{ date: string; installs: number; active: number }> = []
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const dayInstalls = (allInstalls || []).filter(inst => {
        const instDate = new Date(inst.first_seen).toISOString().split('T')[0]
        return instDate === dateStr
      }).length

      const dayActive = (allInstalls || []).filter(inst => {
        const lastSeenDate = new Date(inst.last_seen).toISOString().split('T')[0]
        return lastSeenDate === dateStr
      }).length

      chartData.push({
        date: dateStr,
        installs: dayInstalls,
        active: dayActive
      })
    }

    // Calculate conversion rate
    const conversionRate = total > 0 ? (proUsers / total * 100).toFixed(1) : '0'

    return NextResponse.json({
      installations: installations || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
      summary: {
        total,
        proUsers,
        freeUsers,
        activeUsers,
        conversionRate
      },
      chartData
    })

  } catch (error) {
    console.error('Installations error:', error)
    return NextResponse.json({
      installations: [],
      total: 0,
      page: 1,
      limit: 50,
      totalPages: 0,
      summary: { total: 0, proUsers: 0, freeUsers: 0, activeUsers: 0, conversionRate: '0' },
      chartData: []
    })
  }
}
