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

// GET - Fetch all wallets for user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: wallets, error } = await supabase
      .from('user_wallets')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true })

    if (error) {
      console.error('Error fetching wallets:', error)
      return NextResponse.json({ error: 'Failed to fetch wallets' }, { status: 500 })
    }

    // Transform to client format
    const clientWallets = (wallets || []).map(w => ({
      id: w.id,
      name: w.name,
      pool: w.pool,
      coin: w.coin,
      address: w.address,
      power: w.power,
      enabled: w.enabled,
      order: w.display_order
    }))

    return NextResponse.json({ wallets: clientWallets })

  } catch (error) {
    console.error('GET wallets error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// POST - Create new wallet
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const wallet = await request.json()

    // Validate required fields
    if (!wallet.name || !wallet.pool || !wallet.coin || !wallet.address) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get current max order
    const { data: maxOrderResult } = await supabase
      .from('user_wallets')
      .select('display_order')
      .eq('user_id', user.id)
      .order('display_order', { ascending: false })
      .limit(1)
      .single()

    const newOrder = (maxOrderResult?.display_order ?? -1) + 1

    // Check wallet limit for free users
    if (user.plan === 'free') {
      const { count } = await supabase
        .from('user_wallets')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if ((count || 0) >= 1) {
        return NextResponse.json({
          error: 'Free accounts are limited to 1 wallet. Upgrade to Pro for unlimited wallets.',
          limitReached: true
        }, { status: 403 })
      }
    }

    const { data: newWallet, error } = await supabase
      .from('user_wallets')
      .insert({
        user_id: user.id,
        name: wallet.name,
        pool: wallet.pool,
        coin: wallet.coin,
        address: wallet.address,
        power: wallet.power || 200,
        enabled: wallet.enabled !== false,
        display_order: newOrder
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating wallet:', error)
      return NextResponse.json({ error: 'Failed to create wallet' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      wallet: {
        id: newWallet.id,
        name: newWallet.name,
        pool: newWallet.pool,
        coin: newWallet.coin,
        address: newWallet.address,
        power: newWallet.power,
        enabled: newWallet.enabled,
        order: newWallet.display_order
      }
    })

  } catch (error) {
    console.error('POST wallet error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// PUT - Update wallet(s)
export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // Handle bulk update (reordering)
    if (Array.isArray(body.wallets)) {
      const updates = body.wallets.map((w: any, index: number) =>
        supabase
          .from('user_wallets')
          .update({ display_order: index, updated_at: new Date().toISOString() })
          .eq('id', w.id)
          .eq('user_id', user.id)
      )

      await Promise.all(updates)
      return NextResponse.json({ success: true })
    }

    // Handle single wallet update
    const wallet = body
    if (!wallet.id) {
      return NextResponse.json({ error: 'Wallet ID required' }, { status: 400 })
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    if (wallet.name !== undefined) updateData.name = wallet.name
    if (wallet.pool !== undefined) updateData.pool = wallet.pool
    if (wallet.coin !== undefined) updateData.coin = wallet.coin
    if (wallet.address !== undefined) updateData.address = wallet.address
    if (wallet.power !== undefined) updateData.power = wallet.power
    if (wallet.enabled !== undefined) updateData.enabled = wallet.enabled
    if (wallet.order !== undefined) updateData.display_order = wallet.order

    const { data: updatedWallet, error } = await supabase
      .from('user_wallets')
      .update(updateData)
      .eq('id', wallet.id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating wallet:', error)
      return NextResponse.json({ error: 'Failed to update wallet' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      wallet: {
        id: updatedWallet.id,
        name: updatedWallet.name,
        pool: updatedWallet.pool,
        coin: updatedWallet.coin,
        address: updatedWallet.address,
        power: updatedWallet.power,
        enabled: updatedWallet.enabled,
        order: updatedWallet.display_order
      }
    })

  } catch (error) {
    console.error('PUT wallet error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}

// DELETE - Delete wallet
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const walletId = searchParams.get('id')

    if (!walletId) {
      return NextResponse.json({ error: 'Wallet ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('user_wallets')
      .delete()
      .eq('id', walletId)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting wallet:', error)
      return NextResponse.json({ error: 'Failed to delete wallet' }, { status: 500 })
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('DELETE wallet error:', error)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
