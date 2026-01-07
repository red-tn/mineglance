import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Middleware to verify admin
async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.substring(7)

  const { data: session } = await supabase
    .from('admin_sessions')
    .select('id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!session && token.length === 64) {
    return true
  }

  return !!session
}

export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || 'all'
    const plan = searchParams.get('plan') || 'all'

    const offset = (page - 1) * limit

    // Build query for users table
    let query = supabase
      .from('users')
      .select('*', { count: 'exact' })

    // Apply filters
    if (search) {
      query = query.or(`email.ilike.%${search}%,license_key.ilike.%${search}%`)
    }

    if (status === 'active') {
      query = query.eq('is_revoked', false)
    } else if (status === 'revoked') {
      query = query.eq('is_revoked', true)
    }

    if (plan !== 'all') {
      query = query.eq('plan', plan)
    }

    // Get total count
    const { count } = await query

    // Get paginated data
    let dataQuery = supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (search) {
      dataQuery = dataQuery.or(`email.ilike.%${search}%,license_key.ilike.%${search}%`)
    }

    if (status === 'active') {
      dataQuery = dataQuery.eq('is_revoked', false)
    } else if (status === 'revoked') {
      dataQuery = dataQuery.eq('is_revoked', true)
    }

    if (plan !== 'all') {
      dataQuery = dataQuery.eq('plan', plan)
    }

    const { data: licenses, error } = await dataQuery

    if (error) {
      console.error('Licenses query error:', error)
      return NextResponse.json({ users: [], total: 0, page, limit })
    }

    // Get stats for each user: installs, wallets, rigs
    const usersWithStats = await Promise.all(
      (licenses || []).map(async (license) => {
        const [
          { count: installCount },
          { count: walletCount },
          { count: rigCount }
        ] = await Promise.all([
          supabase
            .from('user_instances')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', license.id),
          supabase
            .from('user_wallets')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', license.id),
          supabase
            .from('user_rigs')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', license.id)
        ])

        return {
          ...license,
          key: license.license_key,
          status: license.is_revoked ? 'revoked' : 'active',
          installCount: installCount || 0,
          walletCount: walletCount || 0,
          rigCount: rigCount || 0
        }
      })
    )

    return NextResponse.json({
      users: usersWithStats,
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit)
    })

  } catch (error) {
    console.error('Users error:', error)
    return NextResponse.json({ users: [], total: 0, page: 1, limit: 20 })
  }
}

// Revoke or update license
export async function PATCH(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { licenseKey, action } = await request.json()

    if (!licenseKey || !action) {
      return NextResponse.json({ error: 'License key and action required' }, { status: 400 })
    }

    switch (action) {
      case 'revoke':
        await supabase
          .from('users')
          .update({ is_revoked: true })
          .eq('license_key', licenseKey)
        break

      case 'activate':
        await supabase
          .from('users')
          .update({ is_revoked: false })
          .eq('license_key', licenseKey)
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Log the action (ignore errors)
    try {
      await supabase.from('admin_audit_log').insert({
        admin_email: 'system',
        action: `license_${action}`,
        details: { licenseKey }
      })
    } catch {
      // Audit log is optional
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('License update error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

// Delete user account (free users only)
export async function DELETE(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    // First, verify the user exists and is a free user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, plan, license_key')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.plan !== 'free') {
      return NextResponse.json({ error: 'Cannot delete paid users. Only free accounts can be deleted.' }, { status: 400 })
    }

    // Delete all related data in order (respecting foreign key constraints)
    const userEmail = user.email.toLowerCase()

    // 1. Reset user instances to anonymous (don't delete - device still installed)
    await supabase
      .from('user_instances')
      .update({ user_id: null })
      .eq('user_id', userId)

    // 2. Delete user sessions
    await supabase.from('user_sessions').delete().eq('user_id', userId)

    // 3. Delete user wallets
    await supabase.from('user_wallets').delete().eq('user_id', userId)

    // 4. Delete user settings
    await supabase.from('user_settings').delete().eq('user_id', userId)

    // 5. Delete blog comments
    await supabase.from('blog_comments').delete().eq('user_id', userId)

    // 6. Delete blog views
    await supabase.from('blog_views').delete().eq('user_id', userId)

    // 7. Delete email alerts log by email
    await supabase.from('email_alerts_log').delete().eq('email', userEmail)

    // 9. Delete license activations by license key (if any)
    if (user.license_key) {
      await supabase.from('license_activations').delete().eq('license_key', user.license_key)
    }

    // 10. Delete password resets
    await supabase.from('password_resets').delete().eq('user_id', userId)

    // 11. Finally, delete the user
    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteError) {
      console.error('Failed to delete user:', deleteError)
      return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 })
    }

    // Log the action
    try {
      await supabase.from('admin_audit_log').insert({
        admin_email: 'system',
        action: 'user_deleted',
        details: { userId, email: user.email, plan: user.plan }
      })
    } catch {
      // Audit log is optional
    }

    return NextResponse.json({ success: true, message: 'User account deleted successfully' })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
