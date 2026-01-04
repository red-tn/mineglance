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

    // Get all user instances with their user data
    const { data: instances } = await supabase
      .from('user_instances')
      .select(`
        *,
        user:users(id, email, plan, license_key)
      `)
      .order('last_seen', { ascending: false })

    // Map to installation format
    const allInstalls = (instances || []).map(inst => ({
      id: inst.id,
      instance_id: inst.instance_id || inst.id,
      user_id: inst.user_id,
      email: inst.user?.email,
      plan: inst.user?.plan || 'free',
      license_key: inst.user?.license_key,
      isPro: inst.user?.plan === 'pro',
      device_type: inst.device_type,
      device_name: inst.device_name,
      browser: inst.browser || inst.device_type,
      version: inst.version,
      created_at: inst.created_at,
      last_seen: inst.last_seen
    }))

    // Filter by pro status if requested
    let filteredInstalls = allInstalls
    if (isPro === 'true') {
      filteredInstalls = allInstalls.filter(i => i.isPro)
    } else if (isPro === 'false') {
      filteredInstalls = allInstalls.filter(i => !i.isPro)
    }

    // Calculate totals
    const total = allInstalls.length
    const proUsers = allInstalls.filter(i => i.isPro).length
    const freeUsers = total - proUsers
    const activeUsers = allInstalls.filter(i => {
      const lastSeen = new Date(i.last_seen)
      return lastSeen >= sevenDaysAgo
    }).length

    // Paginate
    const paginatedInstalls = filteredInstalls.slice(offset, offset + limit)

    // Generate chart data (new installs per day)
    const chartData: Array<{ date: string; installs: number; active: number }> = []
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const dayInstalls = allInstalls.filter(inst => {
        const instDate = new Date(inst.created_at).toISOString().split('T')[0]
        return instDate === dateStr
      }).length

      const dayActive = allInstalls.filter(inst => {
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

    // Map installations to expected format
    const mappedInstallations = paginatedInstalls.map(i => ({
      id: i.id,
      instance_id: i.instance_id || i.id,
      email: i.email,
      license_key: i.license_key,
      browser: i.browser || i.device_type || 'Unknown',
      extension_version: i.version || '-',
      first_seen: i.created_at,
      last_seen: i.last_seen,
      isPro: i.isPro,
      plan: i.plan
    }))

    return NextResponse.json({
      installations: mappedInstallations,
      total: filteredInstalls.length,
      page,
      limit,
      totalPages: Math.ceil(filteredInstalls.length / limit),
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
