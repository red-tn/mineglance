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

    // Build query for paid_users table
    let query = supabase
      .from('paid_users')
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
      .from('paid_users')
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

    // Get installation counts for each license from license_activations
    const usersWithStats = await Promise.all(
      (licenses || []).map(async (license) => {
        const { count: installCount } = await supabase
          .from('license_activations')
          .select('*', { count: 'exact', head: true })
          .eq('license_key', license.license_key)
          .eq('is_active', true)

        return {
          ...license,
          key: license.license_key,
          status: license.is_revoked ? 'revoked' : 'active',
          installCount: installCount || 0
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
          .from('paid_users')
          .update({ is_revoked: true })
          .eq('license_key', licenseKey)
        break

      case 'activate':
        await supabase
          .from('paid_users')
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
