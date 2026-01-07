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

// DELETE - Delete specific instance or purge stale installations
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const instanceId = searchParams.get('id')

    // If specific instance ID provided, delete just that one
    if (instanceId) {
      // First get the instance to find its user_id
      const { data: instance, error: fetchError } = await supabase
        .from('user_instances')
        .select('id, user_id, instance_id')
        .eq('id', instanceId)
        .single()

      if (fetchError || !instance) {
        return NextResponse.json({ error: 'Instance not found' }, { status: 404 })
      }

      // Delete the instance
      const { error: deleteError } = await supabase
        .from('user_instances')
        .delete()
        .eq('id', instanceId)

      if (deleteError) {
        console.error('Error deleting instance:', deleteError)
        return NextResponse.json({ error: 'Failed to delete instance' }, { status: 500 })
      }

      // Check if this was the user's last instance - if so, clean up related data
      if (instance.user_id) {
        const { data: remainingInstances } = await supabase
          .from('user_instances')
          .select('id')
          .eq('user_id', instance.user_id)

        // If no more instances for this user, clean up their sessions and wallets
        if (!remainingInstances || remainingInstances.length === 0) {
          // Delete user sessions
          await supabase
            .from('user_sessions')
            .delete()
            .eq('user_id', instance.user_id)

          // Optionally delete user wallets (keeping user record for re-login)
          // await supabase
          //   .from('user_wallets')
          //   .delete()
          //   .eq('user_id', instance.user_id)
        }
      }

      return NextResponse.json({
        success: true,
        message: `Deleted instance ${instance.instance_id || instanceId}`
      })
    }

    // Bulk purge stale installations (>120 days inactive, free users only)
    const staleDays = 120
    const staleDate = new Date(Date.now() - staleDays * 24 * 60 * 60 * 1000).toISOString()

    // Get all stale instances (last_seen > 120 days ago)
    const { data: staleInstances, error: fetchError } = await supabase
      .from('user_instances')
      .select(`
        id,
        user_id,
        last_seen,
        user:users(id, plan)
      `)
      .lt('last_seen', staleDate)

    if (fetchError) {
      console.error('Error fetching stale instances:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch stale instances' }, { status: 500 })
    }

    // Filter to only free users
    const freeStaleInstances = (staleInstances || []).filter(inst => {
      const user = inst.user as unknown as { id: string; plan: string } | null
      return !user || user.plan === 'free'
    })

    if (freeStaleInstances.length === 0) {
      return NextResponse.json({
        success: true,
        purged: 0,
        message: 'No stale free user installations found'
      })
    }

    // Delete stale instances
    const instanceIds = freeStaleInstances.map(i => i.id)
    const { error: deleteError } = await supabase
      .from('user_instances')
      .delete()
      .in('id', instanceIds)

    if (deleteError) {
      console.error('Error deleting stale instances:', deleteError)
      return NextResponse.json({ error: 'Failed to delete stale instances' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      purged: freeStaleInstances.length,
      message: `Purged ${freeStaleInstances.length} stale installations (>120 days inactive, free users)`
    })

  } catch (error) {
    console.error('Purge stale installs error:', error)
    return NextResponse.json({ error: 'Failed to purge stale installations' }, { status: 500 })
  }
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
    const platform = searchParams.get('platform') // 'extension', 'mobile_ios', 'mobile_android', 'all'
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'last_seen'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const offset = (page - 1) * limit
    const now = new Date()
    const periodDays = parseInt(period)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    // Get all user instances with their user data (logged-in users)
    const { data: instances } = await supabase
      .from('user_instances')
      .select(`
        *,
        user:users(id, email, plan, license_key)
      `)
      .order('last_seen', { ascending: false })

    // Get anonymous extension installs (not yet logged in)
    const { data: anonInstalls } = await supabase
      .from('extension_installs')
      .select('*')
      .order('last_seen', { ascending: false })

    // Map user instances to installation format
    const userInstalls = (instances || []).map(inst => ({
      id: inst.id,
      instance_id: inst.instance_id || inst.id,
      user_id: inst.user_id,
      email: inst.user?.email,
      plan: inst.user?.plan || 'free',
      license_key: inst.user?.license_key,
      isPro: inst.user?.plan === 'pro' || inst.user?.plan === 'bundle',
      device_type: inst.device_type || 'extension',
      device_name: inst.device_name,
      browser: inst.browser || inst.device_type,
      version: inst.version,
      created_at: inst.created_at,
      last_seen: inst.last_seen,
      isAnonymous: false
    }))

    // Get instance IDs from user_instances to filter out duplicates
    const userInstanceIds = new Set(userInstalls.map(i => i.instance_id))

    // Map anonymous installs (exclude any that are also in user_instances)
    const anonInstallsMapped = (anonInstalls || [])
      .filter(inst => !userInstanceIds.has(inst.install_id))
      .map(inst => ({
        id: inst.id,
        instance_id: inst.install_id,
        user_id: null,
        email: inst.email || null,
        plan: 'free',
        license_key: null,
        isPro: false,
        device_type: 'extension',
        device_name: null,
        browser: inst.browser || 'chrome',
        version: inst.version,
        created_at: inst.created_at,
        last_seen: inst.last_seen,
        isAnonymous: true
      }))

    // Combine both lists
    const allInstalls = [...userInstalls, ...anonInstallsMapped]

    // Platform-specific counts
    const extensionInstalls = allInstalls.filter(i => i.device_type === 'extension')
    const iosInstalls = allInstalls.filter(i => i.device_type === 'mobile_ios')
    const androidInstalls = allInstalls.filter(i => i.device_type === 'mobile_android')

    // Calculate platform stats
    const platformStats = {
      total: allInstalls.length,
      extension: {
        total: extensionInstalls.length,
        pro: extensionInstalls.filter(i => i.isPro).length,
        free: extensionInstalls.filter(i => !i.isPro).length,
        active: extensionInstalls.filter(i => new Date(i.last_seen) >= sevenDaysAgo).length
      },
      ios: {
        total: iosInstalls.length,
        pro: iosInstalls.filter(i => i.isPro).length,
        free: iosInstalls.filter(i => !i.isPro).length,
        active: iosInstalls.filter(i => new Date(i.last_seen) >= sevenDaysAgo).length
      },
      android: {
        total: androidInstalls.length,
        pro: androidInstalls.filter(i => i.isPro).length,
        free: androidInstalls.filter(i => !i.isPro).length,
        active: androidInstalls.filter(i => new Date(i.last_seen) >= sevenDaysAgo).length
      }
    }

    // Filter by platform
    let filteredInstalls = allInstalls
    if (platform && platform !== 'all') {
      filteredInstalls = allInstalls.filter(i => i.device_type === platform)
    }

    // Filter by pro status
    if (isPro === 'true') {
      filteredInstalls = filteredInstalls.filter(i => i.isPro)
    } else if (isPro === 'false') {
      filteredInstalls = filteredInstalls.filter(i => !i.isPro)
    }

    // Filter by search (instance_id or email)
    if (search) {
      const searchLower = search.toLowerCase()
      filteredInstalls = filteredInstalls.filter(i =>
        (i.instance_id && i.instance_id.toLowerCase().includes(searchLower)) ||
        (i.email && i.email.toLowerCase().includes(searchLower))
      )
    }

    // Sort
    filteredInstalls.sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortBy) {
        case 'instance_id':
          aVal = a.instance_id || ''
          bVal = b.instance_id || ''
          break
        case 'email':
          aVal = a.email || ''
          bVal = b.email || ''
          break
        case 'device_type':
          aVal = a.device_type || ''
          bVal = b.device_type || ''
          break
        case 'created_at':
          aVal = new Date(a.created_at).getTime()
          bVal = new Date(b.created_at).getTime()
          break
        case 'last_seen':
        default:
          aVal = new Date(a.last_seen).getTime()
          bVal = new Date(b.last_seen).getTime()
          break
      }
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })

    // Calculate totals from filtered set
    const total = allInstalls.length
    const proUsers = allInstalls.filter(i => i.isPro).length
    const freeUsers = total - proUsers
    const activeUsers = allInstalls.filter(i => {
      const lastSeen = new Date(i.last_seen)
      return lastSeen >= sevenDaysAgo
    }).length

    // Paginate
    const paginatedInstalls = filteredInstalls.slice(offset, offset + limit)

    // Generate chart data per platform (new installs per day)
    const chartData: Array<{
      date: string
      extension: number
      ios: number
      android: number
      total: number
    }> = []

    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const dayExtension = extensionInstalls.filter(inst => {
        const instDate = new Date(inst.created_at).toISOString().split('T')[0]
        return instDate === dateStr
      }).length

      const dayIos = iosInstalls.filter(inst => {
        const instDate = new Date(inst.created_at).toISOString().split('T')[0]
        return instDate === dateStr
      }).length

      const dayAndroid = androidInstalls.filter(inst => {
        const instDate = new Date(inst.created_at).toISOString().split('T')[0]
        return instDate === dateStr
      }).length

      chartData.push({
        date: dateStr,
        extension: dayExtension,
        ios: dayIos,
        android: dayAndroid,
        total: dayExtension + dayIos + dayAndroid
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
      device_type: i.device_type,
      device_name: i.device_name,
      browser: i.browser || i.device_type || 'Unknown',
      version: i.version || '-',
      first_seen: i.created_at,
      last_seen: i.last_seen,
      isPro: i.isPro,
      plan: i.plan,
      isAnonymous: i.isAnonymous || false
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
      platformStats,
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
      platformStats: {
        total: 0,
        extension: { total: 0, pro: 0, free: 0, active: 0 },
        ios: { total: 0, pro: 0, free: 0, active: 0 },
        android: { total: 0, pro: 0, free: 0, active: 0 }
      },
      chartData: []
    })
  }
}
