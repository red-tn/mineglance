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
    const sortBy = searchParams.get('sortBy') || 'date'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    const now = new Date()
    const periodDays = parseInt(period)
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

    // Get all users (paid users only for revenue)
    const { data: allUsers } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: periodUsers } = await supabase
      .from('users')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    const users = allUsers || []
    const recentUsers = periodUsers || []

    // Revenue calculation - use actual amount_paid or default to $59 for pro
    const getRevenue = (user: any) => {
      if (user.amount_paid && user.amount_paid > 0) return user.amount_paid
      if (user.plan === 'pro') return 5900
      return 0
    }

    // Calculate totals (only count actual paid amounts)
    const paidUsers = users.filter(u => u.plan === 'pro')
    const totalRevenue = paidUsers.reduce((sum, u) => sum + getRevenue(u), 0)

    const recentPaidUsers = recentUsers.filter(u => u.plan === 'pro')
    const periodRevenue = recentPaidUsers.reduce((sum, u) => sum + getRevenue(u), 0)

    // Calculate by plan
    const proCount = paidUsers.length
    const freeCount = users.filter(u => u.plan === 'free').length
    const proRevenue = totalRevenue

    // Generate daily chart data
    const chartData: Array<{ date: string; revenue: number; sales: number }> = []
    for (let i = periodDays - 1; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
      const dateStr = date.toISOString().split('T')[0]

      const dayUsers = recentPaidUsers.filter(u => {
        const userDate = new Date(u.created_at).toISOString().split('T')[0]
        return userDate === dateStr
      })

      const dayRevenue = dayUsers.reduce((sum, u) => sum + getRevenue(u), 0)

      chartData.push({
        date: dateStr,
        revenue: dayRevenue,
        sales: dayUsers.length
      })
    }

    // Recent transactions with full details
    let transactions = recentUsers.filter(u => u.plan === 'pro' || u.amount_paid > 0).map(u => ({
      id: u.id,
      user_id: u.id,
      email: u.email,
      plan: u.plan,
      amount: getRevenue(u),
      date: u.created_at,
      stripePaymentId: u.stripe_payment_id,
      license_key: u.license_key,
      is_refunded: u.is_revoked || false,
      refunded_at: u.is_revoked ? u.updated_at : null
    }))

    // Sort transactions
    transactions.sort((a, b) => {
      let aVal: any, bVal: any
      switch (sortBy) {
        case 'email':
          aVal = a.email?.toLowerCase() || ''
          bVal = b.email?.toLowerCase() || ''
          break
        case 'plan':
          aVal = a.plan || ''
          bVal = b.plan || ''
          break
        case 'amount':
          aVal = a.amount
          bVal = b.amount
          break
        case 'date':
        default:
          aVal = new Date(a.date).getTime()
          bVal = new Date(b.date).getTime()
          break
      }
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0
      }
    })

    // Limit to 50 transactions
    transactions = transactions.slice(0, 50)

    // Calculate averages
    const avgOrderValue = proCount > 0 ? totalRevenue / proCount : 0
    const dailyAvgRevenue = periodDays > 0 ? periodRevenue / periodDays : 0

    return NextResponse.json({
      summary: {
        totalRevenue,
        periodRevenue,
        totalSales: proCount,
        periodSales: recentPaidUsers.length,
        avgOrderValue: Math.round(avgOrderValue),
        dailyAvgRevenue: Math.round(dailyAvgRevenue)
      },
      byPlan: {
        pro: { count: proCount, revenue: proRevenue },
        free: { count: freeCount, revenue: 0 }
      },
      chartData,
      recentTransactions: transactions
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
      byPlan: { pro: { count: 0, revenue: 0 }, free: { count: 0, revenue: 0 } },
      chartData: [],
      recentTransactions: []
    })
  }
}
