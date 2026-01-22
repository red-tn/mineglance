import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import * as OTPAuth from 'otpauth'
import { hashPassword, verifyPassword } from '@/lib/password'
import { checkRateLimit, resetRateLimit, getClientIp } from '@/lib/rateLimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Whitelist of admin emails
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || 'ryan.ncc@gmail.com,control@mineglance.com').split(',').map(e => e.trim().toLowerCase())

// Default password for first login (should be changed immediately)
const DEFAULT_PASSWORD = process.env.ADMIN_DEFAULT_PASSWORD || 'MineGlance2024!'

export async function POST(request: NextRequest) {
  try {
    // Rate limiting check
    const clientIp = getClientIp(request)
    const rateCheck = checkRateLimit(clientIp, 5, 15 * 60 * 1000) // 5 attempts per 15 min

    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Try again in ${rateCheck.retryAfterSeconds} seconds.` },
        { status: 429 }
      )
    }

    const { email, password, totpCode } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    const normalizedEmail = email.toLowerCase().trim()

    // Check if email is in admin whitelist
    if (!ADMIN_EMAILS.includes(normalizedEmail)) {
      // Log failed attempt
      await logAudit(normalizedEmail, 'login_failed', 'unauthorized_email', request)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get or create admin user
    let { data: admin } = await supabase
      .from('admin_users')
      .select('*')
      .eq('email', normalizedEmail)
      .single()

    // If no admin user exists, create one with default password (hashed with bcrypt)
    if (!admin) {
      const passwordHash = await hashPassword(DEFAULT_PASSWORD)
      const { data: newAdmin, error } = await supabase
        .from('admin_users')
        .insert({
          email: normalizedEmail,
          password_hash: passwordHash,
          role: 'super_admin',  // First admin is super_admin
          is_active: true
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create admin user:', error)
        // Database error - do not allow login without proper admin record
        return NextResponse.json({ error: 'Database error. Contact support.' }, { status: 500 })
      }
      admin = newAdmin
    }

    // Verify password with bcrypt (supports silent migration from SHA256)
    let validPassword = false
    let needsRehash = false

    if (admin?.password_hash) {
      const result = await verifyPassword(password, admin.password_hash, true)
      validPassword = result.valid
      needsRehash = result.needsRehash
    } else {
      // No password hash - admin record is corrupt or incomplete
      console.error('Admin record missing password_hash:', normalizedEmail)
      return NextResponse.json({ error: 'Account setup incomplete. Contact support.' }, { status: 401 })
    }

    if (!validPassword) {
      await logAudit(normalizedEmail, 'login_failed', 'invalid_password', request)
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Silent migration: rehash password with bcrypt if using legacy SHA256
    if (needsRehash && admin?.id) {
      const newHash = await hashPassword(password)
      await supabase
        .from('admin_users')
        .update({ password_hash: newHash })
        .eq('id', admin.id)
    }

    // Check if 2FA is enabled
    if (admin?.totp_enabled && admin?.totp_secret) {
      // If no TOTP code provided, tell client 2FA is required
      if (!totpCode) {
        return NextResponse.json({
          requires2FA: true,
          message: 'Please enter your authenticator code'
        })
      }

      const cleanCode = totpCode.replace(/\s/g, '').toUpperCase()
      let isValidCode = false
      let usedBackupCode = false

      // First try TOTP verification
      const totp = new OTPAuth.TOTP({
        algorithm: 'SHA1',
        digits: 6,
        period: 30,
        secret: admin.totp_secret
      })
      const delta = totp.validate({ token: cleanCode, window: 1 })
      isValidCode = delta !== null

      // If TOTP failed, check backup codes (8-character hex codes)
      if (!isValidCode && cleanCode.length === 8 && admin.backup_codes) {
        const hashedInput = crypto.createHash('sha256').update(cleanCode).digest('hex')
        const backupCodes = admin.backup_codes as string[]
        const codeIndex = backupCodes.findIndex(c => c === hashedInput)

        if (codeIndex !== -1) {
          isValidCode = true
          usedBackupCode = true
          // Remove used backup code
          const newBackupCodes = [...backupCodes]
          newBackupCodes.splice(codeIndex, 1)
          await supabase
            .from('admin_users')
            .update({ backup_codes: newBackupCodes.length > 0 ? newBackupCodes : null })
            .eq('id', admin.id)
        }
      }

      if (!isValidCode) {
        await logAudit(normalizedEmail, 'login_failed', '2fa_invalid_code', request)
        return NextResponse.json({ error: 'Invalid authenticator code' }, { status: 401 })
      }

      if (usedBackupCode) {
        await logAudit(normalizedEmail, 'login_backup_code_used', null, request)
      }
    }

    // Reset rate limit on successful login
    resetRateLimit(clientIp)

    // Generate session token
    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Try to store session (only if we have an admin id)
    if (admin?.id) {
      const { error: sessionError } = await supabase
        .from('admin_sessions')
        .insert({
          admin_id: admin.id,
          token,
          expires_at: expiresAt.toISOString(),
          ip_address: request.headers.get('x-forwarded-for') || 'unknown',
          user_agent: request.headers.get('user-agent') || 'unknown'
        })

      if (sessionError) {
        console.error('Session storage failed:', sessionError)
      }

      // Update last login
      await supabase
        .from('admin_users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', admin.id)
    } else {
      console.warn('No admin ID - session not stored. Admin table may not exist.')
    }

    await logAudit(normalizedEmail, 'login_success', null, request)

    return NextResponse.json({
      success: true,
      token,
      user: {
        id: admin?.id,
        email: normalizedEmail,
        role: admin?.role || 'super_admin',
        isAdmin: true
      }
    })

  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}

async function logAudit(email: string, action: string, detail: string | null, request: NextRequest) {
  try {
    await supabase.from('admin_audit_log').insert({
      admin_email: email,
      action,
      details: detail ? { detail } : null,
      ip_address: request.headers.get('x-forwarded-for') || 'unknown'
    })
  } catch (e) {
    console.log('Audit log skipped:', e)
  }
}
