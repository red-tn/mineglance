import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const JOB_ENDPOINT = '/api/cron/renewal-reminders'
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'

// Verify the request is from Vercel Cron or admin
async function verifyCronRequest(request: NextRequest): Promise<{ valid: boolean; triggeredBy: string }> {
  const authHeader = request.headers.get('authorization')

  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    return { valid: true, triggeredBy: 'vercel-cron' }
  }

  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7)
    const { data: session } = await supabase
      .from('admin_sessions')
      .select('admin_id')
      .eq('token', token)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (session) {
      const { data: admin } = await supabase
        .from('admin_users')
        .select('email')
        .eq('id', session.admin_id)
        .single()
      return { valid: true, triggeredBy: admin?.email || 'admin' }
    }
  }

  return { valid: false, triggeredBy: '' }
}

async function sendRenewalEmail(email: string, daysUntilExpiry: number): Promise<boolean> {
  // Try to get template from database
  const { data: template } = await supabase
    .from('email_templates')
    .select('subject, html_content')
    .eq('slug', 'renewal_reminder')
    .eq('is_active', true)
    .single()

  let subject = 'Your MineGlance Pro subscription is expiring'
  let htmlContent = `
<!DOCTYPE html>
<html>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 16px; border: 1px solid #2d2d2d;">
          <tr>
            <td style="padding: 40px; text-align: center;">
              <h1 style="margin: 0 0 20px; color: #fbbf24; font-size: 28px;">Subscription Expiring Soon</h1>
              <p style="color: #e5e7eb; font-size: 16px;">Your MineGlance Pro subscription will expire in <strong style="color: #fbbf24;">{{daysUntilExpiry}} days</strong>.</p>
              <div style="margin: 30px 0;">
                <a href="https://www.mineglance.com/dashboard/subscription" style="display: inline-block; background: #38a169; color: white; padding: 16px 40px; border-radius: 8px; text-decoration: none; font-weight: bold;">Renew Now</a>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`

  if (template) {
    subject = template.subject
    htmlContent = template.html_content
  }

  // Replace variables
  htmlContent = htmlContent.replace(/{{daysUntilExpiry}}/g, String(daysUntilExpiry))
  htmlContent = htmlContent.replace(/{{email}}/g, email)

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
        subject,
        content: [{ type: 'text/html', value: htmlContent }],
      }),
    })

    return response.ok
  } catch (error) {
    console.error('Error sending renewal email:', error)
    return false
  }
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  let executionId: string | null = null
  let jobId: string | null = null

  try {
    const { valid, triggeredBy } = await verifyCronRequest(request)
    if (!valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find the cron job record
    const { data: job } = await supabase
      .from('cron_jobs')
      .select('id')
      .eq('endpoint', JOB_ENDPOINT)
      .single()

    jobId = job?.id || null

    // Log execution start
    if (jobId) {
      const { data: execution } = await supabase
        .from('cron_executions')
        .insert({
          job_id: jobId,
          status: 'running',
          triggered_by: triggeredBy,
          started_at: new Date().toISOString()
        })
        .select('id')
        .single()

      executionId = execution?.id || null
    }

    // Find users expiring in 7 days who haven't been reminded
    const now = new Date()
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, subscription_end_date')
      .eq('plan', 'pro')
      .neq('billing_type', 'lifetime') // Skip lifetime users
      .eq('renewal_reminder_sent', false)
      .lte('subscription_end_date', sevenDaysFromNow.toISOString())
      .gt('subscription_end_date', now.toISOString())

    if (usersError) {
      throw new Error(`Failed to fetch users: ${usersError.message}`)
    }

    const results = {
      checked: users?.length || 0,
      sent: 0,
      failed: 0,
      emails: [] as string[]
    }

    // Send reminders
    for (const user of users || []) {
      const endDate = new Date(user.subscription_end_date)
      const daysUntilExpiry = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))

      const sent = await sendRenewalEmail(user.email, daysUntilExpiry)

      if (sent) {
        results.sent++
        results.emails.push(user.email)

        // Mark as reminded
        await supabase
          .from('users')
          .update({ renewal_reminder_sent: true, updated_at: new Date().toISOString() })
          .eq('id', user.id)
      } else {
        results.failed++
      }
    }

    const duration = Date.now() - startTime
    const result = {
      success: true,
      ...results,
      timestamp: new Date().toISOString(),
      duration_ms: duration
    }

    console.log('Renewal reminders completed:', result)

    // Update execution record
    if (executionId) {
      await supabase
        .from('cron_executions')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          result: result
        })
        .eq('id', executionId)
    }

    if (jobId) {
      await supabase
        .from('cron_jobs')
        .update({
          last_run: new Date().toISOString(),
          last_status: 'success'
        })
        .eq('id', jobId)
    }

    return NextResponse.json(result)

  } catch (error) {
    const duration = Date.now() - startTime
    const errorMsg = error instanceof Error ? error.message : 'Unknown error'

    console.error('Renewal reminders error:', error)

    if (executionId) {
      await supabase
        .from('cron_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          duration_ms: duration,
          error: errorMsg
        })
        .eq('id', executionId)
    }

    if (jobId) {
      await supabase
        .from('cron_jobs')
        .update({
          last_run: new Date().toISOString(),
          last_status: 'failed'
        })
        .eq('id', jobId)
    }

    return NextResponse.json({ error: 'Renewal reminders failed', details: errorMsg }, { status: 500 })
  }
}
