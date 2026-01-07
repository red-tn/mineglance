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

    // Get user settings and plan
    const { data: user, error } = await supabase
      .from('users')
      .select(`
        plan,
        notify_worker_offline,
        notify_profit_drop,
        profit_drop_threshold,
        email_alerts_enabled,
        email_alerts_address,
        email_frequency,
        email
      `)
      .eq('id', session.user_id)
      .single()

    if (error) throw error

    const isPro = user.plan === 'pro' || user.plan === 'bundle'

    return NextResponse.json({
      isPro,
      settings: {
        notifyWorkerOffline: user.notify_worker_offline ?? true,
        notifyProfitDrop: user.notify_profit_drop ?? true,
        profitDropThreshold: user.profit_drop_threshold ?? 20,
        emailAlertsEnabled: user.email_alerts_enabled ?? false,
        emailAlertsAddress: user.email_alerts_address || user.email,
        emailFrequency: user.email_frequency || 'immediate'
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

    // Update user settings
    const { error } = await supabase
      .from('users')
      .update({
        notify_worker_offline: body.notifyWorkerOffline,
        notify_profit_drop: body.notifyProfitDrop,
        profit_drop_threshold: body.profitDropThreshold,
        email_alerts_enabled: body.emailAlertsEnabled,
        email_alerts_address: body.emailAlertsAddress,
        email_frequency: body.emailFrequency,
        updated_at: new Date().toISOString()
      })
      .eq('id', session.user_id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
