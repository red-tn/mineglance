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
    const period = searchParams.get('period') || '30'

    const now = new Date()
    const periodDays = parseInt(period)
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

    // Get all licenses from paid_users
    const { data: allLicenses } = await supabase
      .from('paid_users')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: periodLicenses } = await supabase
      .from('paid_users')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    const licenses = allLicenses || []
    const recentLicenses = periodLicenses || []

    // Calculate totals
    const totalRevenue = licenses.reduce((sum, l) => {
      return sum + (l.plan === 'pro' ? 2900 : l.plan === 'bundle' ? 5900 : 0)
    }, 0)

    const periodRevenue = recentLicenses.reduce((sum, l) => {
      return sum + (l.plan === 'pro' ? 2900 : l.plan === 'bundle' ? 5900 : 0)
    }, 0)

    // Calculate by plan
    const proCount = licenses.filter(l => l.plan === 'pro').length
    const bundleCount = licenses.filter(l => l.plan === 'bundle').length
    const proRevenue = proCount * 2900
    const bundleRevenue = bundleCount * 5900

    // Generate daily chart data
    const chartData: Array<{ date: string; revenue: number; sales: number }> = []
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const dayLicenses = recentLicenses.filter(l => {
        const licDate = new Date(l.created_at).toISOString().split('T')[0]
        return licDate === dateStr
      })

      const dayRevenue = dayLicenses.reduce((sum, l) => {
        return sum + (l.plan === 'pro' ? 2900 : l.plan === 'bundle' ? 5900 : 0)
      }, 0)

      chartData.push({
        date: dateStr,
        revenue: dayRevenue,
        sales: dayLicenses.length
      })
    }

    // Recent transactions
    const recentTransactions = recentLicenses.slice(0, 20).map(l => ({
      id: l.id,
      email: l.email,
      plan: l.plan,
      amount: l.plan === 'pro' ? 2900 : l.plan === 'bundle' ? 5900 : 0,
      date: l.created_at,
      stripePaymentId: l.stripe_payment_id
    }))

    // Calculate averages
    const avgOrderValue = licenses.length > 0 ? totalRevenue / licenses.length : 0
    const dailyAvgRevenue = periodDays > 0 ? periodRevenue / periodDays : 0

    return NextResponse.json({
      summary: {
        totalRevenue,
        periodRevenue,
        totalSales: licenses.length,
        periodSales: recentLicenses.length,
        avgOrderValue: Math.round(avgOrderValue),
        dailyAvgRevenue: Math.round(dailyAvgRevenue)
      },
      byPlan: {
        pro: { count: proCount, revenue: proRevenue },
        bundle: { count: bundleCount, revenue: bundleRevenue }
      },
      chartData,
      recentTransactions
    })

  } catch (error) {
    console.error('Revenue error:', error)
    return NextResponse.json({
      summary: {
        totalRevenue: 0,
        periodRevenue: 0,
        totalSales: 0,
        periodSales: 0,
        avgOrderValue: 0,
        dailyAvgRevenue: 0
      },
      byPlan: { pro: { count: 0, revenue: 0 }, bundle: { count: 0, revenue: 0 } },
      chartData: [],
      recentTransactions: []
    })
  }
}
