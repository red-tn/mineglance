import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Generate session token
function generateToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export async function POST(request: NextRequest) {
  try {
    const { email, licenseKey, instanceId, deviceType, deviceName, browser, version } = await request.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedLicenseKey = licenseKey?.toUpperCase().trim()

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    if (userError || !user) {
      return NextResponse.json({
        error: 'Account not found',
        exists: false
      }, { status: 404 })
    }

    // Check if user is revoked
    if (user.is_revoked) {
      return NextResponse.json({ error: 'Account has been suspended' }, { status: 403 })
    }

    // If user is Pro, require license key
    if (user.plan === 'pro' && user.license_key) {
      if (!normalizedLicenseKey) {
        return NextResponse.json({
          error: 'License key required',
          requiresLicenseKey: true,
          email: normalizedEmail
        }, { status: 401 })
      }

      // Validate license key
      if (normalizedLicenseKey !== user.license_key) {
        return NextResponse.json({ error: 'Invalid license key' }, { status: 401 })
      }
    }

    // Generate session token
    const token = generateToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days

    // Create session
    await supabase
      .from('user_sessions')
      .insert({
        user_id: user.id,
        token,
        expires_at: expiresAt.toISOString()
      })

    // Register device instance if provided
    if (instanceId && deviceType) {
      await supabase
        .from('user_instances')
        .upsert({
          user_id: user.id,
          instance_id: instanceId,
          device_type: deviceType,
          device_name: deviceName || null,
          browser: browser || null,
          version: version || null,
          last_seen: new Date().toISOString()
        }, {
          onConflict: 'user_id,instance_id'
        })
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Fetch user's wallets
    const { data: wallets } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true })

    // Fetch user's settings
    const { data: settings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    return NextResponse.json({
      success: true,
      userId: user.id,
      token,
      email: user.email,
      plan: user.plan,
      licenseKey: user.license_key,
      wallets: wallets || [],
      settings: settings ? {
        refreshInterval: settings.refresh_interval,
        electricityRate: parseFloat(settings.electricity_rate) || 0.12,
        electricityCurrency: settings.electricity_currency,
        powerConsumption: settings.power_consumption,
        currency: settings.currency,
        notifyWorkerOffline: settings.notify_worker_offline,
        notifyProfitDrop: settings.notify_profit_drop,
        profitDropThreshold: settings.profit_drop_threshold,
        notifyBetterCoin: settings.notify_better_coin,
        showDiscoveryCoins: settings.show_discovery_coins,
        liteMode: settings.lite_mode
      } : {
        refreshInterval: 30,
        electricityRate: 0.12,
        electricityCurrency: 'USD',
        currency: 'USD',
        notifyWorkerOffline: true,
        notifyProfitDrop: true,
        profitDropThreshold: 20,
        notifyBetterCoin: false,
        showDiscoveryCoins: true,
        liteMode: false
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

// Verify token endpoint
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)

    // Find session
    const { data: session, error: sessionError } = await supabase
      .from('user_sessions')
      .select('*, user:users(*)')
      .eq('token', token)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    // Check expiration
    if (new Date(session.expires_at) < new Date()) {
      await supabase.from('user_sessions').delete().eq('id', session.id)
      return NextResponse.json({ error: 'Session expired' }, { status: 401 })
    }

    const user = session.user as any
    if (user.is_revoked) {
      return NextResponse.json({ error: 'Account suspended' }, { status: 403 })
    }

    return NextResponse.json({
      valid: true,
      userId: user.id,
      email: user.email,
      plan: user.plan,
      licenseKey: user.license_key
    })

  } catch (error) {
    console.error('Verify error:', error)
    return NextResponse.json({ error: 'Verification failed' }, { status: 500 })
  }
}
