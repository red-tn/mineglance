import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// POST - Register anonymous instance (before user login)
// This allows tracking installs before conversion to signed-up user
export async function POST(request: NextRequest) {
  try {
    const { instanceId, deviceType, deviceName, browser, version } = await request.json()

    if (!instanceId || !deviceType) {
      return NextResponse.json({ error: 'instanceId and deviceType are required' }, { status: 400 })
    }

    // Validate device type
    if (!['extension', 'mobile_ios', 'mobile_android', 'desktop_windows', 'desktop_macos'].includes(deviceType)) {
      return NextResponse.json({ error: 'Invalid device type' }, { status: 400 })
    }

    // Check if this instance already exists
    const { data: existing } = await supabase
      .from('user_instances')
      .select('id, user_id')
      .eq('instance_id', instanceId)
      .single()

    if (existing) {
      // Instance already registered - update last_seen
      const updateData: any = {
        last_seen: new Date().toISOString()
      }
      if (version) updateData.version = version
      if (deviceName) updateData.device_name = deviceName

      await supabase
        .from('user_instances')
        .update(updateData)
        .eq('instance_id', instanceId)

      return NextResponse.json({
        success: true,
        isNew: false,
        hasUser: !!existing.user_id
      })
    }

    // Create new anonymous instance (user_id is null)
    const { data: instance, error } = await supabase
      .from('user_instances')
      .insert({
        instance_id: instanceId,
        device_type: deviceType,
        device_name: deviceName || null,
        browser: browser || null,
        version: version || null,
        user_id: null, // Anonymous install
        last_seen: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error registering anonymous instance:', error)
      return NextResponse.json({ error: 'Failed to register instance' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      isNew: true,
      hasUser: false
    })

  } catch (error) {
    console.error('POST register instance error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
