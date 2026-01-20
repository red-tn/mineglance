import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// CoinGecko ID mapping
const COINGECKO_IDS: Record<string, string> = {
  btc: 'bitcoin',
  etc: 'ethereum-classic',
  rvn: 'ravencoin',
  ergo: 'ergo',
  flux: 'zel',
  kas: 'kaspa',
  alph: 'alephium',
  nexa: 'nexacoin',
  xmr: 'monero',
  zec: 'zcash',
  ltc: 'litecoin',
  firo: 'firo',
  cfx: 'conflux-token',
  beam: 'beam',
  rtm: 'raptoreum',
  neoxa: 'neoxa',
  clore: 'clore-ai',
  dnx: 'dynex',
  xna: 'neurai',
  ctxc: 'cortex',
}

// Fetch pool stats for a wallet
async function fetchPoolStats(wallet: any): Promise<any | null> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mineglance.com'}/api/pool-stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pool: wallet.pool,
        coin: wallet.coin,
        address: wallet.address
      })
    })

    if (!response.ok) return null

    const data = await response.json()
    return data.stats || null
  } catch (error) {
    console.error(`Failed to fetch stats for wallet ${wallet.id}:`, error)
    return null
  }
}

// Fetch current prices
async function fetchPrices(coins: string[]): Promise<Record<string, number>> {
  const geckoIds = coins
    .map(c => COINGECKO_IDS[c.toLowerCase()])
    .filter(Boolean)
    .join(',')

  if (!geckoIds) return {}

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds}&vs_currencies=usd`
    )

    if (!response.ok) return {}

    const data = await response.json()
    const prices: Record<string, number> = {}

    for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
      if (data[geckoId]?.usd) {
        prices[symbol] = data[geckoId].usd
      }
    }

    return prices
  } catch {
    return {}
  }
}

// Determine hashrate unit based on value
function determineHashrateUnit(hashrate: number): { value: number; unit: string } {
  if (hashrate >= 1e12) return { value: hashrate / 1e12, unit: 'TH/s' }
  if (hashrate >= 1e9) return { value: hashrate / 1e9, unit: 'GH/s' }
  if (hashrate >= 1e6) return { value: hashrate / 1e6, unit: 'MH/s' }
  if (hashrate >= 1e3) return { value: hashrate / 1e3, unit: 'KH/s' }
  return { value: hashrate, unit: 'H/s' }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  let walletsProcessed = 0
  let recordsCreated = 0
  let recordsDeleted = 0
  const errors: string[] = []

  try {
    // Get all wallets with charts enabled (Pro users only)
    const { data: wallets, error: walletsError } = await supabase
      .from('user_wallets')
      .select(`
        id,
        user_id,
        name,
        pool,
        coin,
        address,
        power,
        chart_enabled,
        user:users!inner(id, plan, email)
      `)
      .eq('chart_enabled', true)

    if (walletsError) {
      throw new Error(`Failed to fetch wallets: ${walletsError.message}`)
    }

    if (!wallets || wallets.length === 0) {
      // Still clean up old records even if no wallets
      const { data: deleted } = await supabase
        .from('wallet_performance_history')
        .delete()
        .lt('recorded_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
        .select('id')

      return NextResponse.json({
        success: true,
        message: 'No chart-enabled wallets found',
        recordsDeleted: deleted?.length || 0,
        duration: Date.now() - startTime
      })
    }

    // Filter to Pro users only
    const proWallets = wallets.filter(w => (w.user as any)?.plan === 'pro')

    if (proWallets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No Pro users with charts enabled',
        duration: Date.now() - startTime
      })
    }

    // Get unique coins for price fetch
    const uniqueCoins = Array.from(new Set(proWallets.map(w => w.coin.toLowerCase())))
    const prices = await fetchPrices(uniqueCoins)

    // Process each wallet
    for (const wallet of proWallets) {
      walletsProcessed++

      try {
        // Fetch current stats from pool
        const stats = await fetchPoolStats(wallet)
        if (!stats) {
          errors.push(`No stats for wallet ${wallet.id}`)
          continue
        }

        const coinPrice = prices[wallet.coin.toLowerCase()] || 0
        const { value: hashrateValue, unit: hashrateUnit } = determineHashrateUnit(stats.hashrate || 0)

        // Calculate daily profit
        const dailyEarnings = stats.earnings24h || 0
        const dailyRevenueUsd = dailyEarnings * coinPrice
        const dailyPowerCost = ((wallet.power || 200) * 24 / 1000) * 0.12 // Assume $0.12/kWh default
        const dailyProfitUsd = dailyRevenueUsd - dailyPowerCost

        // Insert performance record
        const { error: insertError } = await supabase
          .from('wallet_performance_history')
          .insert({
            wallet_id: wallet.id,
            user_id: wallet.user_id,
            hashrate: hashrateValue,
            hashrate_unit: hashrateUnit,
            workers_online: stats.workersOnline || 0,
            workers_total: stats.workersTotal || stats.workersOnline || 0,
            balance: stats.balance || 0,
            daily_earnings: dailyEarnings,
            daily_profit_usd: dailyProfitUsd,
            coin_price_usd: coinPrice,
            recorded_at: new Date().toISOString()
          })

        if (insertError) {
          errors.push(`Insert error for wallet ${wallet.id}: ${insertError.message}`)
        } else {
          recordsCreated++
        }
      } catch (error) {
        errors.push(`Error processing wallet ${wallet.id}: ${error}`)
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Clean up records older than 90 days
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
    const { data: deletedRecords } = await supabase
      .from('wallet_performance_history')
      .delete()
      .lt('recorded_at', ninetyDaysAgo)
      .select('id')

    recordsDeleted = deletedRecords?.length || 0

    return NextResponse.json({
      success: true,
      walletsProcessed,
      recordsCreated,
      recordsDeleted,
      pricesAvailable: Object.keys(prices).length,
      duration: Date.now() - startTime,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit error output
    })

  } catch (error) {
    console.error('Performance capture cron error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      walletsProcessed,
      recordsCreated,
      duration: Date.now() - startTime
    }, { status: 500 })
  }
}
