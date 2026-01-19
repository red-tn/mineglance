import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Handle desktop app uninstall - remove instance from database
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instanceId } = body

    if (!instanceId) {
      return NextResponse.json(
        { error: 'Missing instanceId' },
        { status: 400 }
      )
    }

    // Delete the instance from user_instances
    const { error } = await supabase
      .from('user_instances')
      .delete()
      .eq('install_id', instanceId)

    if (error) {
      console.error('Failed to delete instance:', error)
      return NextResponse.json(
        { error: 'Failed to remove instance' },
        { status: 500 }
      )
    }

    console.log(`Desktop uninstall: removed instance ${instanceId}`)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Desktop uninstall error:', error)
    return NextResponse.json(
      { error: 'Failed to process uninstall' },
      { status: 500 }
    )
  }
}

// Also support GET for simple curl/PowerShell calls from NSIS
export async function GET(request: NextRequest) {
  const instanceId = request.nextUrl.searchParams.get('instanceId')

  if (!instanceId) {
    return NextResponse.json(
      { error: 'Missing instanceId parameter' },
      { status: 400 }
    )
  }

  // Delete the instance from user_instances
  const { data, error, count } = await supabase
    .from('user_instances')
    .delete()
    .eq('install_id', instanceId)
    .select()

  if (error) {
    console.error('Failed to delete instance:', error.message, error.details, error.hint)
    return NextResponse.json(
      { error: 'Failed to remove instance', details: error.message },
      { status: 500 }
    )
  }

  console.log(`Desktop uninstall (GET): removed instance ${instanceId}, deleted ${data?.length || 0} rows`)

  return NextResponse.json({ success: true, deleted: data?.length || 0 })
}
