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
    .select('*, user:users(*)')
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

    // Get all instances for this user from user_instances
    const { data: instances, error: instancesError } = await supabase
      .from('user_instances')
      .select('*')
      .eq('user_id', user.id)
      .order('last_seen', { ascending: false })

    if (instancesError) {
      console.error('Failed to get instances:', instancesError)
      return NextResponse.json({ error: 'Failed to get devices' }, { status: 500 })
    }

    // Format devices for response
    const devices = (instances || []).map(instance => ({
      id: instance.id,
      installId: instance.instance_id,
      deviceName: instance.device_name || 'Unknown Device',
      deviceType: instance.device_type,
      browser: instance.browser || null,
      version: instance.version || null,
      createdAt: instance.created_at,
      lastSeen: instance.last_seen
    }))

    return NextResponse.json({
      devices,
      deviceCount: devices.length
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
    const instanceId = searchParams.get('instanceId')

    if (!instanceId) {
      return NextResponse.json({ error: 'Instance ID required' }, { status: 400 })
    }

    // Verify the instance belongs to this user
    const { data: instance, error: findError } = await supabase
      .from('user_instances')
      .select('*')
      .eq('user_id', user.id)
      .eq('instance_id', instanceId)
      .single()

    if (findError || !instance) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Delete the instance
    const { error: deleteError } = await supabase
      .from('user_instances')
      .delete()
      .eq('id', instance.id)

    if (deleteError) {
      console.error('Failed to delete instance:', deleteError)
      return NextResponse.json({ error: 'Failed to remove device' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete device error:', error)
    return NextResponse.json({ error: 'Failed to remove device' }, { status: 500 })
  }
}
