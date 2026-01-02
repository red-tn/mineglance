import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function POST(request: NextRequest) {
  try {
    const { licenseKey, installId, deviceName } = await request.json()

    if (!licenseKey || !installId) {
      return NextResponse.json(
        { error: 'License key and install ID are required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Normalize license key (uppercase, trim)
    const normalizedKey = licenseKey.toUpperCase().trim()

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Find the license
    const { data: license, error: licenseError } = await supabase
      .from('paid_users')
      .select('id, email, plan, max_activations, is_revoked')
      .eq('license_key', normalizedKey)
      .single()

    if (licenseError || !license) {
      return NextResponse.json(
        { success: false, error: 'Invalid license key. Please check and try again.' },
        { status: 404, headers: corsHeaders }
      )
    }

    // Check if license is revoked
    if (license.is_revoked) {
      return NextResponse.json(
        { success: false, error: 'This license has been revoked. Contact support.' },
        { status: 403, headers: corsHeaders }
      )
    }

    // Check if this device is already activated
    const { data: existingActivation } = await supabase
      .from('license_activations')
      .select('id, is_active')
      .eq('license_key', normalizedKey)
      .eq('install_id', installId)
      .single()

    if (existingActivation) {
      // Already activated on this device - just update last_seen
      await supabase
        .from('license_activations')
        .update({ last_seen: new Date().toISOString(), is_active: true })
        .eq('id', existingActivation.id)

      return NextResponse.json({
        success: true,
        isPro: true,
        plan: license.plan,
        message: 'License already activated on this device'
      }, { headers: corsHeaders })
    }

    // Count active activations
    const { count: activeCount } = await supabase
      .from('license_activations')
      .select('id', { count: 'exact' })
      .eq('license_key', normalizedKey)
      .eq('is_active', true)

    const currentActivations = activeCount || 0
    const maxActivations = license.max_activations || 3

    if (currentActivations >= maxActivations) {
      return NextResponse.json({
        success: false,
        error: `Maximum ${maxActivations} devices reached. Deactivate a device in Settings to free up a slot.`,
        currentActivations,
        maxActivations
      }, { status: 403, headers: corsHeaders })
    }

    // Create new activation
    const { error: activationError } = await supabase
      .from('license_activations')
      .insert({
        license_key: normalizedKey,
        install_id: installId,
        device_name: deviceName || 'Chrome Extension',
        is_active: true
      })

    if (activationError) {
      console.error('Activation error:', activationError)
      return NextResponse.json(
        { success: false, error: 'Failed to activate. Please try again.' },
        { status: 500, headers: corsHeaders }
      )
    }

    return NextResponse.json({
      success: true,
      isPro: true,
      plan: license.plan,
      activations: currentActivations + 1,
      maxActivations,
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
  const installId = request.nextUrl.searchParams.get('installId')

  if (!licenseKey) {
    return NextResponse.json({ isPro: false }, { headers: corsHeaders })
  }

  const normalizedKey = licenseKey.toUpperCase().trim()

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get license details first
    const { data: license } = await supabase
      .from('paid_users')
      .select('plan, is_revoked')
      .eq('license_key', normalizedKey)
      .single()

    if (!license || license.is_revoked) {
      return NextResponse.json({ isPro: false }, { headers: corsHeaders })
    }

    // If no installId provided (mobile app checking plan only), just return plan
    if (!installId) {
      return NextResponse.json({
        isPro: true,
        plan: license.plan
      }, { headers: corsHeaders })
    }

    // Check if this device has an active activation
    const { data: activation } = await supabase
      .from('license_activations')
      .select('license_key, is_active')
      .eq('license_key', normalizedKey)
      .eq('install_id', installId)
      .eq('is_active', true)
      .single()

    if (!activation) {
      return NextResponse.json({ isPro: false, plan: license.plan }, { headers: corsHeaders })
    }

    // Update last_seen
    await supabase
      .from('license_activations')
      .update({ last_seen: new Date().toISOString() })
      .eq('license_key', normalizedKey)
      .eq('install_id', installId)

    return NextResponse.json({
      isPro: true,
      plan: license.plan
    }, { headers: corsHeaders })

  } catch (error) {
    console.error('License check error:', error)
    return NextResponse.json({ isPro: false }, { headers: corsHeaders })
  }
}

// CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
