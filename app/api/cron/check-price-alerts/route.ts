import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// CoinGecko ID mapping for supported coins
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

// Fetch current prices from CoinGecko
async function fetchPrices(coins: string[]): Promise<Record<string, number>> {
  const geckoIds = coins
    .map(c => COINGECKO_IDS[c.toLowerCase()])
    .filter(Boolean)
    .join(',')

  if (!geckoIds) return {}

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds}&vs_currencies=usd`,
      { cache: 'no-store' }
    )

    if (!response.ok) {
      console.error('CoinGecko API error:', response.status)
      return {}
    }

    const data = await response.json()

    // Map back to our coin symbols
    const prices: Record<string, number> = {}
    for (const [symbol, geckoId] of Object.entries(COINGECKO_IDS)) {
      if (data[geckoId]?.usd) {
        prices[symbol] = data[geckoId].usd
      }
    }

    return prices
  } catch (error) {
    console.error('Failed to fetch prices:', error)
    return {}
  }
}

// Send price alert email
async function sendPriceAlertEmail(
  email: string,
  walletName: string,
  coin: string,
  targetPrice: number,
  currentPrice: number,
  condition: string
): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.mineglance.com'}/api/send-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        alertType: 'price_alert',
        walletName,
        message: `${coin.toUpperCase()} price is now $${currentPrice.toFixed(4)} (${condition} your target of $${targetPrice.toFixed(4)})`,
        internalKey: process.env.INTERNAL_API_SECRET
      })
    })

    return response.ok
  } catch (error) {
    console.error('Failed to send price alert email:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  let alertsChecked = 0
  let alertsSent = 0
  const errors: string[] = []

  try {
    // Get all wallets with price alerts enabled
    const { data: wallets, error: walletsError } = await supabase
      .from('user_wallets')
      .select(`
        id,
        name,
        coin,
        price_alert_enabled,
        price_alert_target,
        price_alert_condition,
        price_alert_last_triggered,
        user:users!inner(id, email, plan)
      `)
      .eq('price_alert_enabled', true)
      .not('price_alert_target', 'is', null)

    if (walletsError) {
      throw new Error(`Failed to fetch wallets: ${walletsError.message}`)
    }

    if (!wallets || wallets.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No price alerts configured',
        duration: Date.now() - startTime
      })
    }

    // Get unique coins
    const uniqueCoins = Array.from(new Set(wallets.map(w => w.coin.toLowerCase())))

    // Fetch current prices
    const prices = await fetchPrices(uniqueCoins)

    if (Object.keys(prices).length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to fetch any prices',
        duration: Date.now() - startTime
      })
    }

    // Check each wallet's price alert
    for (const wallet of wallets) {
      alertsChecked++

      const user = wallet.user as any
      if (!user?.email) continue

      // Only Pro users get price alerts
      if (user.plan !== 'pro') continue

      const coinLower = wallet.coin.toLowerCase()
      const currentPrice = prices[coinLower]
      if (!currentPrice) continue

      const targetPrice = parseFloat(wallet.price_alert_target)
      if (isNaN(targetPrice)) continue

      const condition = wallet.price_alert_condition || 'above'

      // Check if condition is met
      const conditionMet = condition === 'above'
        ? currentPrice >= targetPrice
        : currentPrice <= targetPrice

      if (!conditionMet) continue

      // Check cooldown (24 hours since last trigger)
      if (wallet.price_alert_last_triggered) {
        const lastTriggered = new Date(wallet.price_alert_last_triggered)
        const hoursSinceLastTrigger = (Date.now() - lastTriggered.getTime()) / (1000 * 60 * 60)
        if (hoursSinceLastTrigger < 24) continue
      }

      // Send alert email
      const emailSent = await sendPriceAlertEmail(
        user.email,
        wallet.name,
        wallet.coin,
        targetPrice,
        currentPrice,
        condition
      )

      if (emailSent) {
        alertsSent++

        // Update last triggered timestamp
        await supabase
          .from('user_wallets')
          .update({ price_alert_last_triggered: new Date().toISOString() })
          .eq('id', wallet.id)

        // Log the alert
        await supabase.from('email_alerts_log').insert({
          license_key: user.id,
          email: user.email,
          alert_type: 'price_alert',
          wallet_name: wallet.name,
          message: `${wallet.coin} price ${condition} $${targetPrice}`,
          subject: `Price Alert: ${wallet.coin} is ${condition} $${targetPrice}`
        })
      } else {
        errors.push(`Failed to send alert for wallet ${wallet.id}`)
      }
    }

    return NextResponse.json({
      success: true,
      alertsChecked,
      alertsSent,
      pricesChecked: Object.keys(prices).length,
      duration: Date.now() - startTime,
      errors: errors.length > 0 ? errors : undefined
    })

  } catch (error) {
    console.error('Price alerts cron error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      alertsChecked,
      alertsSent,
      duration: Date.now() - startTime
    }, { status: 500 })
  }
}
