import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'

// Admin authentication check - verify against admin_sessions table
async function isAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return false

  const token = authHeader.substring(7)

  const { data: session } = await supabase
    .from('admin_sessions')
    .select('id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  return !!session
}

// Send renewal reminder email
async function sendRenewalEmail(email: string, daysUntilExpiry: number): Promise<boolean> {
  if (!SENDGRID_API_KEY) return false

  const emailContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your MineGlance Pro subscription is expiring</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 16px; border: 1px solid #2d2d2d;">
          <tr>
            <td style="padding: 40px 40px 20px; text-align: center;">
              <h1 style="margin: 0; color: #fbbf24; font-size: 28px; font-weight: bold;">
                Subscription Expiring Soon
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Your MineGlance Pro subscription will expire in <strong style="color: #fbbf24;">${daysUntilExpiry} days</strong>.
              </p>

              <p style="color: #e5e7eb; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
                Renew now to keep access to:
              </p>

              <ul style="color: #9ca3af; font-size: 14px; line-height: 1.8; margin: 0 0 20px; padding-left: 20px;">
                <li>Unlimited wallets across all pools</li>
                <li>Cloud sync between devices</li>
                <li>Email alerts for offline workers</li>
                <li>Mobile app with full features</li>
                <li>Priority support</li>
              </ul>

              <div style="text-align: center; margin: 30px 0;">
                <a href="https://www.mineglance.com/#pricing" style="display: inline-block; background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  Renew Now
                </a>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 30px 40px; border-top: 1px solid #2d2d2d;">
              <p style="color: #6b7280; font-size: 12px; margin: 0; text-align: center;">
                Questions? Visit <a href="https://www.mineglance.com/support" style="color: #38a169;">mineglance.com/support</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: FROM_EMAIL, name: 'MineGlance' },
        subject: 'Your MineGlance Pro subscription is expiring soon',
        content: [{ type: 'text/html', value: emailContent }],
      }),
    })
    return response.ok
  } catch (error) {
    console.error('Error sending renewal email:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  if (!await isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const filter = searchParams.get('filter') || 'all'

    // Get all Pro users with subscription dates (exclude lifetime - they don't renew)
    let query = supabase
      .from('users')
      .select('id, email, plan, billing_type, subscription_start_date, subscription_end_date, renewal_reminder_sent, renewal_ignored, created_at')
      .eq('plan', 'pro')
      .neq('billing_type', 'lifetime') // Skip lifetime users
      .order('subscription_end_date', { ascending: true, nullsFirst: false })

    const { data: users, error } = await query

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Calculate stats and filter
    const stats = {
      dueSoon7Days: 0,
      dueSoon30Days: 0,
      overdue: 0,
      ignoredReminder: 0,
      totalPro: users?.length || 0
    }

    let filteredUsers = (users || []).map(user => {
      const endDate = user.subscription_end_date ? new Date(user.subscription_end_date) : null
      const daysUntilExpiry = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null

      let status = 'active'
      if (endDate) {
        if (endDate < now) {
          status = 'overdue'
          stats.overdue++
        } else if (endDate <= sevenDaysFromNow) {
          status = 'due_soon'
          stats.dueSoon7Days++
          stats.dueSoon30Days++
        } else if (endDate <= thirtyDaysFromNow) {
          status = 'due_30'
          stats.dueSoon30Days++
        }
      }

      if (user.renewal_ignored) {
        stats.ignoredReminder++
      }

      return {
        ...user,
        daysUntilExpiry,
        status,
        billingType: user.billing_type
      }
    })

    // Apply filter
    if (filter === 'due_soon') {
      filteredUsers = filteredUsers.filter(u => u.status === 'due_soon' || u.status === 'due_30')
    } else if (filter === 'overdue') {
      filteredUsers = filteredUsers.filter(u => u.status === 'overdue')
    } else if (filter === 'ignored') {
      filteredUsers = filteredUsers.filter(u => u.renewal_ignored)
    }

    return NextResponse.json({
      users: filteredUsers,
      stats
    })

  } catch (error) {
    console.error('Error in renewals API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  if (!await isAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { action, userId, days } = await request.json()

    if (!action || !userId) {
      return NextResponse.json({ error: 'Missing action or userId' }, { status: 400 })
    }

    // Get user
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    switch (action) {
      case 'send_reminder': {
        const endDate = user.subscription_end_date ? new Date(user.subscription_end_date) : null
        const daysUntilExpiry = endDate ? Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 30

        const sent = await sendRenewalEmail(user.email, daysUntilExpiry)
        if (sent) {
          await supabase
            .from('users')
            .update({ renewal_reminder_sent: true, updated_at: new Date().toISOString() })
            .eq('id', userId)
          return NextResponse.json({ success: true, message: 'Reminder sent' })
        } else {
          return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
        }
      }

      case 'extend': {
        if (!days || days < 1) {
          return NextResponse.json({ error: 'Invalid days parameter' }, { status: 400 })
        }

        const currentEnd = user.subscription_end_date ? new Date(user.subscription_end_date) : new Date()
        const newEnd = new Date(currentEnd.getTime() + days * 24 * 60 * 60 * 1000)

        await supabase
          .from('users')
          .update({
            subscription_end_date: newEnd.toISOString(),
            renewal_reminder_sent: false,
            renewal_ignored: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        return NextResponse.json({ success: true, message: `Extended by ${days} days` })
      }

      case 'downgrade': {
        await supabase
          .from('users')
          .update({
            plan: 'free',
            subscription_end_date: null,
            renewal_reminder_sent: false,
            renewal_ignored: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)

        return NextResponse.json({ success: true, message: 'Downgraded to free' })
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error in renewals POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
