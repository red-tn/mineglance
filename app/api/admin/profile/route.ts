import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAdminFromToken(token: string) {
  const { data: session } = await supabase
    .from('admin_sessions')
    .select('*, admin_users(*)')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  return session?.admin_users || null
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const admin = await getAdminFromToken(token)

    if (!admin) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    return NextResponse.json({
      profile: {
        id: admin.id,
        email: admin.email,
        fullName: admin.full_name,
        phone: admin.phone,
        profilePhotoUrl: admin.profile_photo_url,
        role: admin.role,
        isActive: admin.is_active,
        lastLogin: admin.last_login,
        createdAt: admin.created_at
      }
    })
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const admin = await getAdminFromToken(token)

    if (!admin) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    const { fullName, phone, profilePhotoUrl, currentPassword, newPassword } = await request.json()

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (fullName !== undefined) updates.full_name = fullName
    if (phone !== undefined) updates.phone = phone
    if (profilePhotoUrl !== undefined) updates.profile_photo_url = profilePhotoUrl

    // Password change
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password required' }, { status: 400 })
      }

      const currentHash = hashPassword(currentPassword)
      if (currentHash !== admin.password_hash) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }

      updates.password_hash = hashPassword(newPassword)
    }

    const { error } = await supabase
      .from('admin_users')
      .update(updates)
      .eq('id', admin.id)

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
    }

    // Log audit
    await logAudit(admin.email, 'profile_updated', { fields: Object.keys(updates) }, request)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 })
  }
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + (process.env.ADMIN_SALT || 'mineglance-salt')).digest('hex')
}

async function logAudit(email: string, action: string, details: Record<string, unknown> | null, request: NextRequest) {
  try {
    await supabase.from('admin_audit_log').insert({
      admin_email: email,
      action,
      details,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    })
  } catch (e) {
    console.log('Audit log skipped:', e)
  }
}
