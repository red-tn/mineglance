import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.substring(7)

  const { data: session, error } = await supabase
    .from('user_sessions')
    .select('*, user:paid_users(*)')
    .eq('token', token)
    .single()

  if (error || !session || new Date(session.expires_at) < new Date()) {
    return null
  }

  return session.user
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all activations for this license key
    const { data: activations, error: activationsError } = await supabase
      .from('license_activations')
      .select('*')
      .eq('license_key', user.license_key)
      .order('activated_at', { ascending: false })

    if (activationsError) {
      console.error('Failed to get activations:', activationsError)
      return NextResponse.json({ error: 'Failed to get devices' }, { status: 500 })
    }

    // Also get extension install info for more details
    const installIds = activations.map(a => a.install_id)
    const { data: installs } = await supabase
      .from('extension_installs')
      .select('*')
      .in('install_id', installIds)

    // Merge activation with install data
    const devices = activations.map(activation => {
      const install = installs?.find(i => i.install_id === activation.install_id)
      return {
        id: activation.id,
        installId: activation.install_id,
        deviceName: activation.device_name || 'Unknown Device',
        browser: install?.browser || null,
        version: install?.version || null,
        activatedAt: activation.activated_at,
        lastSeen: activation.last_seen || install?.last_seen,
        isActive: activation.is_active
      }
    })

    return NextResponse.json({
      devices,
      maxActivations: user.max_activations || 3,
      activeCount: devices.filter(d => d.isActive).length
    })

  } catch (error) {
    console.error('Get devices error:', error)
    return NextResponse.json({ error: 'Failed to get devices' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const installId = searchParams.get('installId')

    if (!installId) {
      return NextResponse.json({ error: 'Install ID required' }, { status: 400 })
    }

    // Verify the activation belongs to this user
    const { data: activation, error: findError } = await supabase
      .from('license_activations')
      .select('*')
      .eq('license_key', user.license_key)
      .eq('install_id', installId)
      .single()

    if (findError || !activation) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Deactivate (soft delete) the device
    const { error: updateError } = await supabase
      .from('license_activations')
      .update({ is_active: false })
      .eq('id', activation.id)

    if (updateError) {
      console.error('Failed to deactivate:', updateError)
      return NextResponse.json({ error: 'Failed to deactivate device' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete device error:', error)
    return NextResponse.json({ error: 'Failed to deactivate device' }, { status: 500 })
  }
}
