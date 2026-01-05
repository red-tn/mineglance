import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function getAdminFromToken(token: string) {
  // First get the session
  const { data: session, error: sessionError } = await supabase
    .from('admin_sessions')
    .select('*')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (sessionError || !session || !session.admin_id) {
    return null
  }

  // Then get the admin user
  const { data: admin } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', session.admin_id)
    .single()

  return admin || null
}

// PUT - Update admin
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const admin = await getAdminFromToken(token)

    if (!admin) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Only super_admin can update other admins
    if (admin.role !== 'super_admin' && admin.id !== id) {
      return NextResponse.json({ error: 'Only super admins can update other admins' }, { status: 403 })
    }

    const { fullName, phone, role, isActive, resetPassword } = await request.json()

    // Get target admin
    const { data: targetAdmin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('id', id)
      .single()

    if (!targetAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Can't modify your own role or active status
    if (admin.id === id && (role !== undefined || isActive !== undefined)) {
      return NextResponse.json({ error: 'Cannot modify your own role or status' }, { status: 400 })
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    }

    if (fullName !== undefined) updates.full_name = fullName
    if (phone !== undefined) updates.phone = phone
    if (role !== undefined && admin.role === 'super_admin') updates.role = role
    if (isActive !== undefined && admin.role === 'super_admin') updates.is_active = isActive

    let newPassword: string | undefined

    // Reset password
    if (resetPassword && admin.role === 'super_admin') {
      newPassword = generatePassword()
      updates.password_hash = hashPassword(newPassword)
    }

    const { error } = await supabase
      .from('admin_users')
      .update(updates)
      .eq('id', id)

    if (error) {
      console.error('Update admin error:', error)
      return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 })
    }

    // Log audit
    await logAudit(admin.email, 'admin_updated', {
      targetId: id,
      fields: Object.keys(updates),
      passwordReset: !!resetPassword
    }, targetAdmin.email, request)

    return NextResponse.json({
      success: true,
      newPassword // Only set if password was reset
    })
  } catch (error) {
    console.error('Update admin error:', error)
    return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 })
  }
}

// DELETE - Delete admin
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 })
    }

    const token = authHeader.substring(7)
    const admin = await getAdminFromToken(token)

    if (!admin) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }

    // Only super_admin can delete admins
    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can delete admins' }, { status: 403 })
    }

    // Can't delete yourself
    if (admin.id === id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    // Get target admin for logging
    const { data: targetAdmin } = await supabase
      .from('admin_users')
      .select('email')
      .eq('id', id)
      .single()

    if (!targetAdmin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }

    // Delete all sessions first
    await supabase
      .from('admin_sessions')
      .delete()
      .eq('admin_id', id)

    // Delete the admin
    const { error } = await supabase
      .from('admin_users')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Delete admin error:', error)
      return NextResponse.json({ error: 'Failed to delete admin' }, { status: 500 })
    }

    // Log audit
    await logAudit(admin.email, 'admin_deleted', {
      deletedId: id
    }, targetAdmin.email, request)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete admin error:', error)
    return NextResponse.json({ error: 'Failed to delete admin' }, { status: 500 })
  }
}

function generatePassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789'
  let password = ''
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return password
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + (process.env.ADMIN_SALT || 'mineglance-salt')).digest('hex')
}

async function logAudit(email: string, action: string, details: Record<string, unknown> | null, targetEmail: string | null, request: NextRequest) {
  try {
    await supabase.from('admin_audit_log').insert({
      admin_email: email,
      action,
      details,
      target_email: targetEmail,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    })
  } catch (e) {
    console.log('Audit log skipped:', e)
  }
}
