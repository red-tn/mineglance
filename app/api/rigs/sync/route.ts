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

// GET - Fetch all rigs for user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: rigs, error } = await supabase
      .from('user_rigs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching rigs:', error)
      return NextResponse.json({ error: 'Failed to fetch rigs' }, { status: 500 })
    }

    // Transform to client format
    const clientRigs = (rigs || []).map(r => ({
      id: r.id,
      name: r.name,
      gpu: r.gpu,
      power: r.power,
      quantity: r.quantity
    }))

    return NextResponse.json({ rigs: clientRigs })

  } catch (error) {
    console.error('GET rigs error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Create new rig
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rig = await request.json()

    // Validate required fields
    if (!rig.name || !rig.gpu) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data: newRig, error } = await supabase
      .from('user_rigs')
      .insert({
        user_id: user.id,
        name: rig.name,
        gpu: rig.gpu,
        power: rig.power || 200,
        quantity: rig.quantity || 1
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating rig:', error)
      return NextResponse.json({ error: 'Failed to create rig' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      rig: {
        id: newRig.id,
        name: newRig.name,
        gpu: newRig.gpu,
        power: newRig.power,
        quantity: newRig.quantity
      }
    })

  } catch (error) {
    console.error('POST rig error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PUT - Update rig
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rig = await request.json()

    if (!rig.id) {
      return NextResponse.json({ error: 'Rig ID required' }, { status: 400 })
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (rig.name !== undefined) updateData.name = rig.name
    if (rig.gpu !== undefined) updateData.gpu = rig.gpu
    if (rig.power !== undefined) updateData.power = rig.power
    if (rig.quantity !== undefined) updateData.quantity = rig.quantity

    const { data: updatedRig, error } = await supabase
      .from('user_rigs')
      .update(updateData)
      .eq('id', rig.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating rig:', error)
      return NextResponse.json({ error: 'Failed to update rig' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      rig: {
        id: updatedRig.id,
        name: updatedRig.name,
        gpu: updatedRig.gpu,
        power: updatedRig.power,
        quantity: updatedRig.quantity
      }
    })

  } catch (error) {
    console.error('PUT rig error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Delete rig
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rigId = searchParams.get('id')

    if (!rigId) {
      return NextResponse.json({ error: 'Rig ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_rigs')
      .delete()
      .eq('id', rigId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting rig:', error)
      return NextResponse.json({ error: 'Failed to delete rig' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('DELETE rig error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
