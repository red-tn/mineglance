import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper to get authenticated user from token
async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)

  const { data: session } = await supabase
    .from('user_sessions')
    .select('*, user:users(*)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!session?.user) return null

  const user = session.user as any
  if (user.is_revoked) return null

  return user
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only Pro users can access chart data
    if (user.plan !== 'pro') {
      return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('walletId')
    const period = parseInt(searchParams.get('period') || '7')

    if (!walletId) {
      return NextResponse.json({ error: 'Wallet ID required' }, { status: 400 })
    }

    // Validate period
    if (![7, 30, 90].includes(period)) {
      return NextResponse.json({ error: 'Invalid period. Use 7, 30, or 90' }, { status: 400 })
    }

    // Verify wallet belongs to user
    const { data: wallet, error: walletError } = await supabase
      .from('user_wallets')
      .select('id, user_id, chart_enabled')
      .eq('id', walletId)
      .eq('user_id', user.id)
      .single()

    if (walletError || !wallet) {
      return NextResponse.json({ error: 'Wallet not found' }, { status: 404 })
    }

    // Calculate date range
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - period)

    // Fetch performance history
    const { data: history, error: historyError } = await supabase
      .from('wallet_performance_history')
      .select('*')
      .eq('wallet_id', walletId)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true })

    if (historyError) {
      console.error('Error fetching history:', historyError)
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
    }

    // Transform to client format
    const chartData = (history || []).map(record => ({
      date: record.recorded_at,
      hashrate: record.hashrate,
      hashrateUnit: record.hashrate_unit,
      workersOnline: record.workers_online,
      workersTotal: record.workers_total,
      balance: parseFloat(record.balance),
      dailyEarnings: parseFloat(record.daily_earnings),
      dailyProfitUsd: parseFloat(record.daily_profit_usd),
      coinPriceUsd: record.coin_price_usd ? parseFloat(record.coin_price_usd) : null
    }))

    // Calculate summary stats
    const summary = chartData.length > 0 ? {
      avgHashrate: chartData.reduce((sum, d) => sum + d.hashrate, 0) / chartData.length,
      avgProfit: chartData.reduce((sum, d) => sum + d.dailyProfitUsd, 0) / chartData.length,
      totalEarnings: chartData.reduce((sum, d) => sum + d.dailyEarnings, 0),
      uptimePercent: (chartData.filter(d => d.workersOnline > 0).length / chartData.length) * 100,
      dataPoints: chartData.length
    } : null

    return NextResponse.json({
      walletId,
      period,
      chartEnabled: wallet.chart_enabled,
      data: chartData,
      summary
    })

  } catch (error) {
    console.error('Wallet history error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
