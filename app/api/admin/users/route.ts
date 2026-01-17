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

  // Check session - must have valid session in database
  const { data: session } = await supabase
    .from('admin_sessions')
    .select('id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

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
    const billingType = searchParams.get('billingType') || 'all'
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const userId = searchParams.get('userId') // For fetching single user with payment history

    const offset = (page - 1) * limit

    // If requesting single user with payment history
    if (userId) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError || !user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      // Get payment history for this user
      const { data: paymentHistory } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      // Get stats
      const [
        { count: installCount },
        { count: walletCount },
        { count: rigCount }
      ] = await Promise.all([
        supabase.from('user_instances').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('user_wallets').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('user_rigs').select('*', { count: 'exact', head: true }).eq('user_id', userId)
      ])

      return NextResponse.json({
        user: {
          ...user,
          key: user.license_key,
          status: user.is_revoked ? 'revoked' : 'active',
          billingType: user.billing_type,
          installCount: installCount || 0,
          walletCount: walletCount || 0,
          rigCount: rigCount || 0,
          paymentHistory: paymentHistory || []
        }
      })
    }

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

    if (billingType !== 'all') {
      if (billingType === 'none') {
        query = query.is('billing_type', null)
      } else {
        query = query.eq('billing_type', billingType)
      }
    }

    // Get total count
    const { count } = await query

    // Map sortBy to actual column names
    const sortColumn = sortBy === 'subscription_date' ? 'subscription_start_date' : sortBy

    // Get paginated data with sorting
    let dataQuery = supabase
      .from('users')
      .select('*')
      .order(sortColumn, { ascending: sortOrder === 'asc' })
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

    if (billingType !== 'all') {
      if (billingType === 'none') {
        dataQuery = dataQuery.is('billing_type', null)
      } else {
        dataQuery = dataQuery.eq('billing_type', billingType)
      }
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
          billingType: license.billing_type,
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

// Delete user account and purge all data
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

    // First, verify the user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, plan, license_key, stripe_customer_id, stripe_payment_id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
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

    // 5. Delete user rigs
    await supabase.from('user_rigs').delete().eq('user_id', userId)

    // 6. Delete blog comments
    await supabase.from('blog_comments').delete().eq('user_id', userId)

    // 7. Delete blog views
    await supabase.from('blog_views').delete().eq('user_id', userId)

    // 8. Delete email alerts log by email
    await supabase.from('email_alerts_log').delete().eq('email', userEmail)

    // 9. Delete password resets
    await supabase.from('password_resets').delete().eq('user_id', userId)

    // 10. Delete payment history
    await supabase.from('payment_history').delete().eq('user_id', userId)

    // 11. Delete roadmap items submitted by this user
    await supabase.from('roadmap_items').delete().eq('submitter_email', userEmail)

    // 12. Finally, delete the user
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
        details: {
          userId,
          email: user.email,
          plan: user.plan,
          hadLicense: !!user.license_key,
          stripeCustomerId: user.stripe_customer_id
        }
      })
    } catch {
      // Audit log is optional
    }

    return NextResponse.json({ success: true, message: 'User account and all data deleted successfully' })

  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
