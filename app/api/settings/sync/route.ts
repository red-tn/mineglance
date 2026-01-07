import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

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

// GET - Fetch user settings
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') { // Not found is ok
      console.error('Error fetching settings:', error)
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    // Helper to parse boolean (handles string 'true'/'false' from DB)
    const parseBool = (val: any, defaultVal: boolean = false): boolean => {
      if (typeof val === 'boolean') return val
      if (typeof val === 'string') return val.toLowerCase() === 'true'
      return defaultVal
    }

    // Return default settings if none exist
    const clientSettings = settings ? {
      refreshInterval: parseInt(settings.refresh_interval) || 30,
      electricityRate: parseFloat(settings.electricity_rate) || 0.12,
      electricityCurrency: settings.electricity_currency || 'USD',
      powerConsumption: parseInt(settings.power_consumption) || 0,
      currency: settings.currency || 'USD',
      notifyWorkerOffline: parseBool(settings.notify_worker_offline, true),
      notifyProfitDrop: parseBool(settings.notify_profit_drop, true),
      profitDropThreshold: parseInt(settings.profit_drop_threshold) || 20,
      notifyBetterCoin: parseBool(settings.notify_better_coin, false),
      emailAlertsEnabled: parseBool(settings.email_alerts_enabled, false),
      emailAlertsAddress: settings.email_alerts_address || user.email,
      emailFrequency: settings.email_frequency || 'immediate',
      showDiscoveryCoins: parseBool(settings.show_discovery_coins, true),
      liteMode: parseBool(settings.lite_mode, false)
    } : {
      refreshInterval: 30,
      electricityRate: 0.12,
      electricityCurrency: 'USD',
      powerConsumption: 0,
      currency: 'USD',
      notifyWorkerOffline: true,
      notifyProfitDrop: true,
      profitDropThreshold: 20,
      notifyBetterCoin: false,
      emailAlertsEnabled: false,
      emailAlertsAddress: user.email || '',
      emailFrequency: 'immediate',
      showDiscoveryCoins: true,
      liteMode: false
    }

    // Log for debugging
    console.log('GET /api/settings/sync - user_id:', user.id)
    console.log('GET /api/settings/sync - settings found:', !!settings)
    console.log('GET /api/settings/sync - raw values:', {
      notify_worker_offline: settings?.notify_worker_offline,
      notify_profit_drop: settings?.notify_profit_drop,
      typeofWorker: typeof settings?.notify_worker_offline,
      typeofProfit: typeof settings?.notify_profit_drop
    })
    console.log('GET /api/settings/sync - parsed values:', {
      notifyWorkerOffline: clientSettings.notifyWorkerOffline,
      notifyProfitDrop: clientSettings.notifyProfitDrop
    })

    const response = NextResponse.json({
      settings: clientSettings,
      _debug: {
        apiVersion: '2026-01-07-v3',
        settingsFound: !!settings,
        userId: user.id,
        rawNotifyWorkerOffline: settings?.notify_worker_offline,
        rawNotifyProfitDrop: settings?.notify_profit_drop,
        typeofWorker: typeof settings?.notify_worker_offline,
        typeofProfit: typeof settings?.notify_profit_drop
      }
    })

    // Prevent caching
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate')
    return response

  } catch (error) {
    console.error('GET settings error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PUT - Update user settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await request.json()

    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (settings.refreshInterval !== undefined) updateData.refresh_interval = settings.refreshInterval
    if (settings.electricityRate !== undefined) updateData.electricity_rate = settings.electricityRate
    if (settings.electricityCurrency !== undefined) updateData.electricity_currency = settings.electricityCurrency
    if (settings.powerConsumption !== undefined) updateData.power_consumption = settings.powerConsumption
    if (settings.currency !== undefined) updateData.currency = settings.currency
    if (settings.notifyWorkerOffline !== undefined) updateData.notify_worker_offline = settings.notifyWorkerOffline
    if (settings.notifyProfitDrop !== undefined) updateData.notify_profit_drop = settings.notifyProfitDrop
    if (settings.profitDropThreshold !== undefined) updateData.profit_drop_threshold = settings.profitDropThreshold
    if (settings.notifyBetterCoin !== undefined) updateData.notify_better_coin = settings.notifyBetterCoin
    if (settings.emailAlertsEnabled !== undefined) updateData.email_alerts_enabled = settings.emailAlertsEnabled
    if (settings.emailAlertsAddress !== undefined) updateData.email_alerts_address = settings.emailAlertsAddress
    if (settings.emailFrequency !== undefined) updateData.email_frequency = settings.emailFrequency
    if (settings.showDiscoveryCoins !== undefined) updateData.show_discovery_coins = settings.showDiscoveryCoins
    if (settings.liteMode !== undefined) updateData.lite_mode = settings.liteMode

    // Upsert settings (create if not exists)
    const { data: updatedSettings, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        ...updateData
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      console.error('Error updating settings:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      settings: {
        refreshInterval: updatedSettings.refresh_interval,
        electricityRate: parseFloat(updatedSettings.electricity_rate) || 0.12,
        electricityCurrency: updatedSettings.electricity_currency,
        powerConsumption: updatedSettings.power_consumption,
        currency: updatedSettings.currency,
        notifyWorkerOffline: updatedSettings.notify_worker_offline,
        notifyProfitDrop: updatedSettings.notify_profit_drop,
        profitDropThreshold: updatedSettings.profit_drop_threshold,
        notifyBetterCoin: updatedSettings.notify_better_coin,
        emailAlertsEnabled: updatedSettings.email_alerts_enabled,
        emailAlertsAddress: updatedSettings.email_alerts_address,
        emailFrequency: updatedSettings.email_frequency,
        showDiscoveryCoins: updatedSettings.show_discovery_coins,
        liteMode: updatedSettings.lite_mode
      }
    })

  } catch (error) {
    console.error('PUT settings error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
