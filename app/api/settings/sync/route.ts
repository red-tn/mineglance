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

    // First, check how many rows exist for this user
    const { data: countData } = await supabase
      .from('user_settings')
      .select('id, created_at, updated_at, notify_worker_offline, notify_profit_drop')
      .eq('user_id', user.id)

    console.log('GET /api/settings/sync - Found', countData?.length || 0, 'rows for user_id:', user.id)
    if (countData && countData.length > 0) {
      console.log('GET /api/settings/sync - All rows:', JSON.stringify(countData))
    }

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
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
        apiVersion: '2026-01-07-v10-GET',
        settingsFound: !!settings,
        rowCount: countData?.length || 0,
        userId: user.id,
        settingsId: settings?.id,
        settingsUpdatedAt: settings?.updated_at,
        rawNotifyWorkerOffline: settings?.notify_worker_offline,
        rawNotifyProfitDrop: settings?.notify_profit_drop,
        typeofWorker: typeof settings?.notify_worker_offline,
        typeofProfit: typeof settings?.notify_profit_drop
      }
    })

    // Prevent ALL caching - Vercel, CDN, browser
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0, s-maxage=0')
    response.headers.set('CDN-Cache-Control', 'no-store')
    response.headers.set('Vercel-CDN-Cache-Control', 'no-store')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')
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

    // Debug: Log what we received from client
    console.log('PUT /api/settings/sync - RECEIVED from client:', JSON.stringify(settings))
    console.log('PUT /api/settings/sync - user_id:', user.id)

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

    // Debug: Log what we're writing to DB
    console.log('PUT /api/settings/sync - updateData to write:', JSON.stringify(updateData))
    console.log('PUT /api/settings/sync - notify_worker_offline value:', updateData.notify_worker_offline, 'type:', typeof updateData.notify_worker_offline)

    // Check if settings row exists for this user - get ALL fields to preserve them
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    let updatedSettings
    let error

    if (existingSettings) {
      // DELETE and INSERT - nuclear option to bypass any UPDATE issues
      console.log('PUT /api/settings/sync - DELETE+INSERT for row ID:', existingSettings.id)
      console.log('PUT /api/settings/sync - New data:', JSON.stringify(updateData))

      // First DELETE the existing row
      const deleteResult = await supabase
        .from('user_settings')
        .delete()
        .eq('id', existingSettings.id)

      console.log('PUT /api/settings/sync - Delete result:', JSON.stringify(deleteResult))

      if (deleteResult.error) {
        console.error('PUT /api/settings/sync - DELETE FAILED:', deleteResult.error)
        return NextResponse.json({
          error: 'Delete failed',
          _debug: { deleteError: deleteResult.error, existingId: existingSettings.id }
        }, { status: 500 })
      }

      // Then INSERT a new row - MERGE existing settings with new ones to preserve any missing fields
      const { id, created_at, ...existingFields } = existingSettings // Remove id and created_at
      const mergedData = {
        ...existingFields,  // Start with existing values
        ...updateData,      // Override with new values
        user_id: user.id,   // Ensure user_id is set
      }
      console.log('PUT /api/settings/sync - Merged data for insert:', JSON.stringify(mergedData))

      const insertResult = await supabase
        .from('user_settings')
        .insert(mergedData)
        .select()
        .single()

      console.log('PUT /api/settings/sync - Insert result:', JSON.stringify(insertResult))

      if (insertResult.error) {
        console.error('PUT /api/settings/sync - INSERT FAILED:', insertResult.error)
        return NextResponse.json({
          error: 'Insert failed after delete',
          _debug: { insertError: insertResult.error, userId: user.id }
        }, { status: 500 })
      }

      updatedSettings = insertResult.data
      error = null
    } else {
      // INSERT new row
      console.log('PUT /api/settings/sync - Inserting new row for user:', user.id)
      const result = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id,
          ...updateData
        })
        .select()
        .single()
      updatedSettings = result.data
      error = result.error
      console.log('PUT /api/settings/sync - Insert result:', JSON.stringify(result))
    }

    if (error) {
      console.error('Error updating settings:', error)
      return NextResponse.json({ error: 'Failed to update settings', details: error.message }, { status: 500 })
    }

    // Debug: Log what DB returned after upsert
    console.log('PUT /api/settings/sync - DB returned after upsert:', JSON.stringify(updatedSettings))
    console.log('PUT /api/settings/sync - DB notify_worker_offline:', updatedSettings.notify_worker_offline, 'type:', typeof updatedSettings.notify_worker_offline)

    // Verify by reading back immediately
    const { data: verifyData } = await supabase
      .from('user_settings')
      .select('id, notify_worker_offline, notify_profit_drop, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    console.log('PUT /api/settings/sync - VERIFY READ BACK:', JSON.stringify(verifyData))

    return NextResponse.json({
      success: true,
      _debug: {
        apiVersion: '2026-01-07-v10-PUT',
        userId: user.id,
        upsertedId: updatedSettings.id,
        receivedNotifyWorkerOffline: settings.notifyWorkerOffline,
        wroteNotifyWorkerOffline: updateData.notify_worker_offline,
        dbReturnedNotifyWorkerOffline: updatedSettings.notify_worker_offline,
        verifyReadBack: verifyData ? {
          id: verifyData.id,
          notify_worker_offline: verifyData.notify_worker_offline,
          notify_profit_drop: verifyData.notify_profit_drop,
          updated_at: verifyData.updated_at
        } : null
      },
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
