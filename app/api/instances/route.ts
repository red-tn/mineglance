import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// GET - List all user instances/devices
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: instances, error } = await supabase
      .from('user_instances')
      .select('*')
      .eq('user_id', user.id)
      .order('last_seen', { ascending: false })

    if (error) {
      console.error('Error fetching instances:', error)
      return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
    }

    return NextResponse.json({
      instances: (instances || []).map(i => ({
        id: i.id,
        instanceId: i.instance_id,
        deviceType: i.device_type,
        deviceName: i.device_name,
        browser: i.browser,
        version: i.version,
        lastSeen: i.last_seen,
        createdAt: i.created_at
      }))
    })

  } catch (error) {
    console.error('GET instances error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Register/update device instance
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { instanceId, deviceType, deviceName, browser, version } = await request.json()

    if (!instanceId || !deviceType) {
      return NextResponse.json({ error: 'instanceId and deviceType are required' }, { status: 400 })
    }

    // Validate device type
    if (!['extension', 'mobile_ios', 'mobile_android'].includes(deviceType)) {
      return NextResponse.json({ error: 'Invalid device type' }, { status: 400 })
    }

    const { data: instance, error } = await supabase
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
      .select()
      .single()

    if (error) {
      console.error('Error registering instance:', error)
      return NextResponse.json({ error: 'Failed to register device' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      instance: {
        id: instance.id,
        instanceId: instance.instance_id,
        deviceType: instance.device_type,
        deviceName: instance.device_name,
        browser: instance.browser,
        version: instance.version,
        lastSeen: instance.last_seen
      }
    })

  } catch (error) {
    console.error('POST instance error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PUT - Update last seen (heartbeat)
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { instanceId, version } = await request.json()

    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId is required' }, { status: 400 })
    }

    const updateData: any = {
      last_seen: new Date().toISOString()
    }
    if (version) updateData.version = version

    const { error } = await supabase
      .from('user_instances')
      .update(updateData)
      .eq('user_id', user.id)
      .eq('instance_id', instanceId)

    if (error) {
      console.error('Error updating instance:', error)
      return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('PUT instance error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Remove device instance
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const instanceId = searchParams.get('instanceId')
    const id = searchParams.get('id')

    if (!instanceId && !id) {
      return NextResponse.json({ error: 'instanceId or id is required' }, { status: 400 })
    }

    let query = supabase
      .from('user_instances')
      .delete()
      .eq('user_id', user.id)

    if (id) {
      query = query.eq('id', id)
    } else if (instanceId) {
      query = query.eq('instance_id', instanceId)
    }

    const { error } = await query

    if (error) {
      console.error('Error deleting instance:', error)
      return NextResponse.json({ error: 'Failed to remove device' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('DELETE instance error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
