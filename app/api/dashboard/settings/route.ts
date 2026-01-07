import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// GET - Fetch user notification settings
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify session and get user
    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Get user plan and email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('plan, email')
      .eq('id', session.user_id)
      .single()

    if (userError) throw userError

    // Get settings from user_settings table (same as extension uses)
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', session.user_id)
      .single()

    const isPro = user.plan === 'pro' || user.plan === 'bundle'

    // Return settings with defaults if not found
    return NextResponse.json({
      isPro,
      settings: {
        notifyWorkerOffline: settings?.notify_worker_offline ?? true,
        notifyProfitDrop: settings?.notify_profit_drop ?? true,
        profitDropThreshold: settings?.profit_drop_threshold ?? 20,
        notifyBetterCoin: settings?.notify_better_coin ?? false,
        emailAlertsEnabled: settings?.email_alerts_enabled ?? false,
        emailAlertsAddress: settings?.email_alerts_address || user.email,
        emailFrequency: settings?.email_frequency || 'immediate'
      }
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

// PUT - Update user notification settings (Pro only)
export async function PUT(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify session and get user
    const { data: session } = await supabase
      .from('user_sessions')
      .select('user_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (!session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check if user is Pro
    const { data: user } = await supabase
      .from('users')
      .select('plan')
      .eq('id', session.user_id)
      .single()

    if (!user || (user.plan !== 'pro' && user.plan !== 'bundle')) {
      return NextResponse.json({ error: 'Pro subscription required' }, { status: 403 })
    }

    const body = await request.json()

    // Build update object for user_settings table
    const updateData: any = {
      updated_at: new Date().toISOString()
    }

    if (body.notifyWorkerOffline !== undefined) updateData.notify_worker_offline = body.notifyWorkerOffline
    if (body.notifyProfitDrop !== undefined) updateData.notify_profit_drop = body.notifyProfitDrop
    if (body.profitDropThreshold !== undefined) updateData.profit_drop_threshold = body.profitDropThreshold
    if (body.notifyBetterCoin !== undefined) updateData.notify_better_coin = body.notifyBetterCoin
    if (body.emailAlertsEnabled !== undefined) updateData.email_alerts_enabled = body.emailAlertsEnabled
    if (body.emailAlertsAddress !== undefined) updateData.email_alerts_address = body.emailAlertsAddress
    if (body.emailFrequency !== undefined) updateData.email_frequency = body.emailFrequency

    // Upsert settings to user_settings table (same table extension uses)
    const { error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: session.user_id,
        ...updateData
      }, {
        onConflict: 'user_id'
      })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
