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

  // Check session - must have valid session in database
  const { data: session } = await supabase
    .from('admin_sessions')
    .select('id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  return !!session
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get stats from various sources
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

    // Get license stats from users table
    const { data: licenses } = await supabase
      .from('users')
      .select('*')

    const { data: recentLicenses } = await supabase
      .from('users')
      .select('*')
      .gte('created_at', thirtyDaysAgo.toISOString())

    // Get installation stats from user_instances (all users)
    const { data: installations } = await supabase
      .from('user_instances')
      .select('*')

    const { data: recentInstalls } = await supabase
      .from('user_instances')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString())

    // Get alert stats
    const { data: recentAlerts } = await supabase
      .from('email_alerts_log')
      .select('*')
      .gte('created_at', oneDayAgo.toISOString())

    // Calculate revenue (single Pro plan at $59)
    const getRevenue = (plan: string) => {
      if (plan === 'pro') return 5900
      return 0
    }

    const totalRevenue = (licenses || []).reduce((sum, l) => sum + getRevenue(l.plan), 0)
    const revenue30d = (recentLicenses || []).reduce((sum, l) => sum + getRevenue(l.plan), 0)

    // Get recent activity
    const recentActivity: Array<{ type: string; identifier: string; detail: string; created_at: string }> = []

    // Add recent licenses
    const { data: latestLicenses } = await supabase
      .from('users')
      .select('license_key, email, plan, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (latestLicenses) {
      latestLicenses.forEach(l => {
        recentActivity.push({
          type: l.plan === 'free' ? 'free_signup' : 'license_activated',
          identifier: l.license_key ? l.license_key.substring(0, 7) + '...' : 'Free',
          detail: l.email || 'Unknown',
          created_at: l.created_at
        })
      })
    }

    // Add recent alerts
    const { data: latestAlerts } = await supabase
      .from('email_alerts_log')
      .select('alert_type, email, created_at')
      .order('created_at', { ascending: false })
      .limit(5)

    if (latestAlerts) {
      latestAlerts.forEach(a => {
        recentActivity.push({
          type: 'alert_sent',
          identifier: a.alert_type,
          detail: a.email,
          created_at: a.created_at
        })
      })
    }

    // Sort by date
    recentActivity.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

    // Generate chart data (last 30 days)
    const chartData: Array<{ date: string; installs: number; revenue: number }> = []
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const dayInstalls = (installations || []).filter(inst => {
        const instDate = new Date(inst.created_at).toISOString().split('T')[0]
        return instDate === dateStr
      }).length

      const dayRevenue = (licenses || []).filter(lic => {
        const licDate = new Date(lic.created_at).toISOString().split('T')[0]
        return licDate === dateStr
      }).reduce((sum, l) => sum + getRevenue(l.plan), 0)

      chartData.push({
        date: dateStr,
        installs: dayInstalls,
        revenue: dayRevenue
      })
    }

    const activeLicenses = (licenses || []).filter(l => !l.is_revoked)

    // Count unique users by email address (not by row count)
    const proEmails = new Set(activeLicenses.filter(l => l.plan === 'pro').map(l => l.email?.toLowerCase()).filter(Boolean))
    const freeEmails = new Set(activeLicenses.filter(l => l.plan === 'free').map(l => l.email?.toLowerCase()).filter(Boolean))

    const proUsers = proEmails.size
    const freeUsers = freeEmails.size

    // Count by billing type
    const proLicenses = activeLicenses.filter(l => l.plan === 'pro')
    const monthlyUsers = proLicenses.filter(l => l.billing_type === 'monthly').length
    const annualUsers = proLicenses.filter(l => l.billing_type === 'annual' || !l.billing_type).length // Default to annual
    const lifetimeUsers = proLicenses.filter(l => l.billing_type === 'lifetime').length

    const stats = {
      totalInstalls: (installations || []).length,
      proUsers: proUsers,
      freeUsers: freeUsers,
      monthlyUsers,
      annualUsers,
      lifetimeUsers,
      revenue30d,
      activeUsers: (installations || []).filter(i => {
        const lastSeen = new Date(i.last_seen)
        return lastSeen >= sevenDaysAgo
      }).length,
      alertsSent24h: (recentAlerts || []).length,
      newInstalls7d: (recentInstalls || []).length,
      totalRevenue
    }

    return NextResponse.json({
      stats,
      recentActivity: recentActivity.slice(0, 10),
      chartData
    })

  } catch (error) {
    console.error('Stats error:', error)
    // Return placeholder data if tables don't exist
    return NextResponse.json({
      stats: {
        totalInstalls: 0,
        proUsers: 0,
        freeUsers: 0,
        monthlyUsers: 0,
        annualUsers: 0,
        lifetimeUsers: 0,
        revenue30d: 0,
        activeUsers: 0,
        alertsSent24h: 0,
        newInstalls7d: 0,
        totalRevenue: 0
      },
      recentActivity: [],
      chartData: []
    })
  }
}
