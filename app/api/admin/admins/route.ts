import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { hashPassword } from '@/lib/password'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY

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

// GET - List all admins
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

    const { data: admins, error } = await supabase
      .from('admin_users')
      .select('id, email, full_name, phone, profile_photo_url, role, is_active, last_login, created_at, invited_by')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('List admins error:', error)
      return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 })
    }

    return NextResponse.json({
      admins: admins.map(a => ({
        id: a.id,
        email: a.email,
        fullName: a.full_name,
        phone: a.phone,
        profilePhotoUrl: a.profile_photo_url,
        role: a.role,
        isActive: a.is_active,
        lastLogin: a.last_login,
        createdAt: a.created_at,
        invitedBy: a.invited_by
      })),
      currentAdminId: admin.id
    })
  } catch (error) {
    console.error('List admins error:', error)
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 })
  }
}

// POST - Invite new admin
export async function POST(request: NextRequest) {
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

    // Only super_admin can invite new admins
    if (admin.role !== 'super_admin') {
      return NextResponse.json({ error: 'Only super admins can invite new admins' }, { status: 403 })
    }

    const { email, fullName, role = 'admin' } = await request.json()

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if admin already exists
    const { data: existing } = await supabase
      .from('admin_users')
      .select('id')
      .eq('email', normalizedEmail)
      .single()

    if (existing) {
      return NextResponse.json({ error: 'Admin with this email already exists' }, { status: 400 })
    }

    // Generate invite token and initial password
    const inviteToken = crypto.randomBytes(32).toString('hex')
    const initialPassword = generatePassword()
    const passwordHash = await hashPassword(initialPassword)
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Create the admin user
    const { data: newAdmin, error } = await supabase
      .from('admin_users')
      .insert({
        email: normalizedEmail,
        full_name: fullName || null,
        password_hash: passwordHash,
        role,
        is_active: true,
        invited_by: admin.id,
        invite_token: inviteToken,
        invite_expires_at: inviteExpiresAt.toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Create admin error:', error)
      return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 })
    }

    // Send invite email
    const emailSent = await sendInviteEmail(normalizedEmail, fullName, initialPassword, admin.email)

    // Log audit
    await logAudit(admin.email, 'admin_invited', {
      invitedEmail: normalizedEmail,
      role,
      emailSent
    }, normalizedEmail, request)

    return NextResponse.json({
      success: true,
      admin: {
        id: newAdmin.id,
        email: newAdmin.email,
        fullName: newAdmin.full_name,
        role: newAdmin.role,
        isActive: newAdmin.is_active,
        createdAt: newAdmin.created_at
      },
      emailSent,
      // Only return initial password if email failed
      initialPassword: emailSent ? undefined : initialPassword
    })
  } catch (error) {
    console.error('Invite admin error:', error)
    return NextResponse.json({ error: 'Failed to invite admin' }, { status: 500 })
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

async function sendInviteEmail(email: string, fullName: string | null, password: string, invitedBy: string): Promise<boolean> {
  if (!SENDGRID_API_KEY) {
    console.log('SendGrid not configured, skipping invite email')
    return false
  }

  try {
    const loginUrl = 'https://www.mineglance.com/admin/login'

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: 'noreply@mineglance.com', name: 'MineGlance Admin' },
        subject: 'You\'ve been invited to MineGlance Admin',
        content: [{
          type: 'text/html',
          value: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); padding: 30px; text-align: center;">
                <h1 style="color: white; margin: 0;">MineGlance Admin</h1>
              </div>
              <div style="padding: 30px; background: #f8f9fa;">
                <h2 style="color: #1a1a1a;">Welcome${fullName ? `, ${fullName}` : ''}!</h2>
                <p style="color: #4a5568; font-size: 16px; line-height: 1.6;">
                  You've been invited by <strong>${invitedBy}</strong> to join the MineGlance admin team.
                </p>
                <div style="background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border: 1px solid #e2e8f0;">
                  <p style="color: #4a5568; margin: 0 0 10px 0;"><strong>Your login credentials:</strong></p>
                  <p style="color: #1a1a1a; margin: 5px 0;">Email: <code style="background: #edf2f7; padding: 2px 6px; border-radius: 4px;">${email}</code></p>
                  <p style="color: #1a1a1a; margin: 5px 0;">Password: <code style="background: #edf2f7; padding: 2px 6px; border-radius: 4px;">${password}</code></p>
                </div>
                <p style="color: #e53e3e; font-size: 14px;">
                  <strong>Important:</strong> Please change your password after your first login.
                </p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${loginUrl}" style="background: #38a169; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                    Login to Admin Dashboard
                  </a>
                </div>
              </div>
              <div style="padding: 20px; text-align: center; color: #718096; font-size: 14px;">
                <p>MineGlance - Mining Pool Monitor</p>
              </div>
            </div>
          `
        }]
      })
    })

    return response.ok
  } catch (error) {
    console.error('Send invite email error:', error)
    return false
  }
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
