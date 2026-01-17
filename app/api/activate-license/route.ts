import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// This route is kept for backward compatibility with old extension versions
// New extensions use /api/auth/login instead
export async function POST(request: NextRequest) {
  try {
    const { licenseKey, installId, deviceName } = await request.json()

    if (!licenseKey || !installId) {
      return NextResponse.json(
        { error: 'License key and install ID are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    const normalizedKey = licenseKey.toUpperCase().trim()

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find the user by license key
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, plan, is_revoked, subscription_end_date, billing_type')
      .eq('license_key', normalizedKey)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: 'Invalid license key. Please check and try again.' },
        { status: 404, headers: corsHeaders }
      )
    }

    if (user.is_revoked) {
      return NextResponse.json(
        { success: false, error: 'This license has been revoked. Contact support.' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Check subscription expiration (null = lifetime, never expires)
    if (user.subscription_end_date && new Date(user.subscription_end_date) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Your subscription has expired. Please renew to continue using Pro features.', expired: true },
        { status: 403, headers: corsHeaders }
      )
    }

    // Register this device instance (unlimited devices now)
    await supabase
      .from('user_instances')
      .upsert({
        user_id: user.id,
        instance_id: installId,
        device_type: 'extension',
        device_name: deviceName || 'Chrome Extension',
        last_seen: new Date().toISOString()
      }, {
        onConflict: 'user_id,instance_id'
      })

    return NextResponse.json({
      success: true,
      isPro: true,
      plan: user.plan,
      message: 'License activated successfully!'
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('License activation error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error. Please try again.' },
      { status: 500, headers: corsHeaders }
    )
  }
}

// Check license status (for extension to verify on startup)
export async function GET(request: NextRequest) {
  const licenseKey = request.nextUrl.searchParams.get('key')

  if (!licenseKey) {
    return NextResponse.json({ isPro: false }, { headers: corsHeaders })
  }

  const normalizedKey = licenseKey.toUpperCase().trim()

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: user } = await supabase
      .from('users')
      .select('plan, is_revoked, subscription_end_date')
      .eq('license_key', normalizedKey)
      .single()

    if (!user || user.is_revoked) {
      return NextResponse.json({ isPro: false }, { headers: corsHeaders })
    }

    // Check subscription expiration (null = lifetime, never expires)
    const isExpired = user.subscription_end_date && new Date(user.subscription_end_date) < new Date()

    if (isExpired) {
      return NextResponse.json({
        isPro: false,
        expired: true,
        plan: user.plan,
        subscriptionEndDate: user.subscription_end_date
      }, { headers: corsHeaders })
    }

    return NextResponse.json({
      isPro: true,
      plan: user.plan,
      subscriptionEndDate: user.subscription_end_date
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('License check error:', error)
    return NextResponse.json({ isPro: false }, { headers: corsHeaders })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: corsHeaders,
  })
}
