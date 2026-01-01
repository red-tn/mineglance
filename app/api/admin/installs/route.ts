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

    // Get ALL extension installs (includes free + pro that have tracked)
    const { data: allExtInstalls } = await supabase
      .from('extension_installs')
      .select('*')
      .order('last_seen', { ascending: false })

    // Get Pro activations
    const { data: proActivations } = await supabase
      .from('license_activations')
      .select('*')

    // Create a map of extension installs by install_id
    const extInstallMap = new Map()
    ;(allExtInstalls || []).forEach(inst => {
      extInstallMap.set(inst.install_id, inst)
    })

    // Create a map of pro users by install_id
    const proMap = new Map()
    ;(proActivations || []).forEach(p => {
      proMap.set(p.install_id, p)
    })

    // Combine: Start with extension_installs, enrich with pro status
    const combinedInstalls: any[] = []
    const seenInstallIds = new Set()

    // First, add all extension_installs entries
    ;(allExtInstalls || []).forEach(inst => {
      const proData = proMap.get(inst.install_id)
      seenInstallIds.add(inst.install_id)
      combinedInstalls.push({
        ...inst,
        isPro: proData?.is_active || false,
        license_key: proData?.license_key || null
      })
    })

    // Then, add any pro activations that don't have a matching extension_install
    // (This shouldn't happen normally, but handles edge cases)
    ;(proActivations || []).forEach(p => {
      if (!seenInstallIds.has(p.install_id)) {
        combinedInstalls.push({
          id: p.id,
          install_id: p.install_id,
          browser: 'Chrome',
          version: '-',
          created_at: p.activated_at,
          last_seen: p.last_seen,
          isPro: p.is_active,
          license_key: p.license_key
        })
      }
    })

    // Filter by pro status if requested
    let filteredInstalls = combinedInstalls
    if (isPro === 'true') {
      filteredInstalls = combinedInstalls.filter(i => i.isPro)
    } else if (isPro === 'false') {
      filteredInstalls = combinedInstalls.filter(i => !i.isPro)
    }

    // Calculate totals
    const total = combinedInstalls.length
    const proUsers = combinedInstalls.filter(i => i.isPro).length
    const freeUsers = total - proUsers
    const activeUsers = combinedInstalls.filter(i => {
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

      const dayInstalls = combinedInstalls.filter(inst => {
        const instDate = new Date(inst.created_at || inst.last_seen).toISOString().split('T')[0]
        return instDate === dateStr
      }).length

      const dayActive = combinedInstalls.filter(inst => {
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
      instance_id: i.install_id,
      license_key: i.license_key,
      browser: i.browser || 'Chrome',
      extension_version: i.version || '-',
      first_seen: i.created_at || i.last_seen,
      last_seen: i.last_seen,
      isPro: i.isPro
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
