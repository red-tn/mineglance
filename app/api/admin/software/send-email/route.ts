import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'
const WEBSITE_URL = 'https://www.mineglance.com'

// Verify admin token
async function verifyAdmin(request: NextRequest): Promise<{ isAdmin: boolean; adminEmail?: string }> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return { isAdmin: false }
  const token = authHeader.substring(7)

  const { data: session } = await supabase
    .from('admin_sessions')
    .select('admin_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!session?.admin_id) return { isAdmin: false }

  const { data: admin } = await supabase
    .from('admin_users')
    .select('email')
    .eq('id', session.admin_id)
    .single()

  return { isAdmin: true, adminEmail: admin?.email }
}

// HTML escape
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }
  return text.replace(/[&<>"']/g, char => htmlEntities[char])
}

// Generate unsubscribe token
function generateUnsubscribeToken(userId: string, email: string): string {
  const secret = process.env.INTERNAL_API_SECRET || 'default-secret'
  return crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${email}:unsubscribe`)
    .digest('hex')
    .substring(0, 32)
}

// Platform display names and emojis
const PLATFORM_INFO: Record<string, { name: string; emoji: string; color: string }> = {
  extension: { name: 'Browser Extension', emoji: '🧩', color: '#3182ce' },
  desktop_windows: { name: 'Windows Desktop App', emoji: '🖥️', color: '#0078d4' },
  desktop_macos: { name: 'macOS Desktop App', emoji: '🍎', color: '#555555' }
}

// Build software update email HTML
function buildSoftwareUpdateEmail(options: {
  releases: Array<{
    platform: string
    version: string
    releaseNotes: string | null
  }>
  latestBlog: { title: string; slug: string; excerpt: string } | null
  unsubscribeUrl: string
  showProUpgrade: boolean
}): string {
  const { releases, latestBlog, unsubscribeUrl, showProUpgrade } = options

  // Build release sections
  const releaseSections = releases.map(release => {
    const info = PLATFORM_INFO[release.platform] || { name: release.platform, emoji: '📦', color: '#666' }
    const notes = release.releaseNotes
      ? release.releaseNotes.split('\n').filter(n => n.trim()).map(n => `<li style="color: #d1d5db; margin-bottom: 4px;">${escapeHtml(n.replace(/^[-•*]\s*/, ''))}</li>`).join('')
      : ''

    return `
      <tr>
        <td style="padding: 0 40px 20px;">
          <div style="background: linear-gradient(135deg, ${info.color}20 0%, ${info.color}10 100%); border-radius: 12px; padding: 24px; border: 1px solid ${info.color}50;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px;">
                    <span style="font-size: 28px;">${info.emoji}</span>
                    <div>
                      <h3 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: bold;">
                        ${info.name}
                      </h3>
                      <p style="margin: 4px 0 0; color: #38a169; font-size: 14px; font-weight: 600;">
                        Version ${escapeHtml(release.version)} Available
                      </p>
                    </div>
                  </div>
                  ${notes ? `
                    <div style="margin-top: 12px;">
                      <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">What's New:</p>
                      <ul style="margin: 0; padding-left: 20px; font-size: 14px;">
                        ${notes}
                      </ul>
                    </div>
                  ` : ''}
                  <div style="margin-top: 16px;">
                    <a href="${WEBSITE_URL}/download" style="display: inline-block; background: ${info.color}; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
                      Download Update
                    </a>
                  </div>
                </td>
              </tr>
            </table>
          </div>
        </td>
      </tr>
    `
  }).join('')

  // Blog section
  const blogSection = latestBlog ? `
    <tr>
      <td style="padding: 0 40px 24px;">
        <div style="background: rgba(56, 161, 105, 0.1); border: 1px solid rgba(56, 161, 105, 0.3); border-radius: 12px; padding: 20px;">
          <p style="color: #9ca3af; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 0.5px;">📰 Latest from the Blog</p>
          <h4 style="margin: 0 0 8px; color: #ffffff; font-size: 16px; font-weight: bold;">
            ${escapeHtml(latestBlog.title)}
          </h4>
          <p style="margin: 0 0 16px; color: #d1d5db; font-size: 14px; line-height: 1.5;">
            ${escapeHtml(latestBlog.excerpt || '').substring(0, 150)}${(latestBlog.excerpt?.length || 0) > 150 ? '...' : ''}
          </p>
          <a href="${WEBSITE_URL}/blog/${latestBlog.slug}" style="color: #38a169; font-size: 14px; font-weight: 600; text-decoration: none;">
            Read More →
          </a>
        </div>
      </td>
    </tr>
  ` : ''

  // Pro upgrade section
  const proUpgradeSection = showProUpgrade ? `
    <tr>
      <td style="padding: 0 40px 24px;">
        <div style="background: linear-gradient(135deg, #38a16920 0%, #2f855a20 100%); border: 1px solid rgba(56, 161, 105, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
          <p style="color: #38a169; margin: 0 0 8px; font-size: 16px; font-weight: 600;">
            ⚡ Unlock Pro Features
          </p>
          <p style="color: #9ca3af; margin: 0 0 16px; font-size: 14px;">
            Unlimited wallets, email alerts, cloud sync, desktop app & more
          </p>
          <a href="${WEBSITE_URL}/#pricing" style="display: inline-block; background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px;">
            Upgrade to Pro
          </a>
        </div>
      </td>
    </tr>
  ` : ''

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MineGlance Software Update</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0a0a0a; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #141414; border-radius: 16px; border: 1px solid #2d2d2d;">

          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #2d2d2d;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                ⛏️ MineGlance Update
              </h1>
              <p style="margin: 8px 0 0; color: #38a169; font-size: 16px; font-weight: 600;">
                New Version${releases.length > 1 ? 's' : ''} Available!
              </p>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding: 24px 40px 16px;">
              <p style="color: #d1d5db; font-size: 15px; line-height: 1.6; margin: 0;">
                We've released ${releases.length > 1 ? 'new updates' : 'a new update'} for MineGlance with improvements and fixes. Update now to get the latest features!
              </p>
            </td>
          </tr>

          <!-- Release Sections -->
          ${releaseSections}

          <!-- Dashboard Link -->
          <tr>
            <td style="padding: 8px 40px 24px;">
              <div style="text-align: center;">
                <a href="${WEBSITE_URL}/dashboard" style="display: inline-block; background: rgba(255,255,255,0.1); color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; border: 1px solid rgba(255,255,255,0.2);">
                  📊 Go to Dashboard
                </a>
              </div>
            </td>
          </tr>

          ${blogSection}
          ${proUpgradeSection}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #2d2d2d; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 12px;">
                You're receiving this because you subscribed to MineGlance updates.
              </p>
              <p style="margin: 0;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color: #9ca3af; font-size: 12px; text-decoration: underline;">
                  Unsubscribe
                </a>
                <span style="color: #4b5563; margin: 0 8px;">|</span>
                <a href="${WEBSITE_URL}/dashboard/profile" style="color: #9ca3af; font-size: 12px; text-decoration: underline;">
                  Manage preferences
                </a>
              </p>
              <p style="color: #4b5563; font-size: 11px; margin: 16px 0 0;">
                MineGlance · Mining Profitability Dashboard<br>
                <a href="${WEBSITE_URL}" style="color: #4b5563;">mineglance.com</a>
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
}

// Send email via SendGrid
async function sendEmail(to: string, subject: string, htmlContent: string): Promise<boolean> {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: 'MineGlance' },
        subject,
        content: [{ type: 'text/html', value: htmlContent }]
      })
    })
    return response.ok
  } catch (error) {
    console.error('Error sending email to', to, error)
    return false
  }
}

// POST - Send software update email
export async function POST(request: NextRequest) {
  try {
    const { isAdmin, adminEmail } = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      releaseIds,        // Array of release IDs to include
      sendToFree,        // Send to free users
      sendToPro,         // Send to pro users
      includeBlog,       // Include latest blog post
      testEmail          // Optional: send test to this email only
    } = body

    if (!releaseIds || releaseIds.length === 0) {
      return NextResponse.json({ error: 'At least one release must be selected' }, { status: 400 })
    }

    if (!sendToFree && !sendToPro && !testEmail) {
      return NextResponse.json({ error: 'Select at least one audience' }, { status: 400 })
    }

    // Fetch the selected releases
    const { data: releases, error: releasesError } = await supabase
      .from('software_releases')
      .select('id, platform, version, release_notes')
      .in('id', releaseIds)

    if (releasesError || !releases || releases.length === 0) {
      return NextResponse.json({ error: 'Releases not found' }, { status: 404 })
    }

    // Fetch latest blog post if requested
    let latestBlog = null
    if (includeBlog) {
      const { data: blog } = await supabase
        .from('blog_posts')
        .select('title, slug, excerpt')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(1)
        .single()

      latestBlog = blog
    }

    // Build subject line
    const platforms = releases.map(r => PLATFORM_INFO[r.platform]?.name || r.platform)
    const subject = `🚀 MineGlance Update: ${platforms.join(' & ')} v${releases[0].version}${releases.length > 1 ? '+' : ''}`

    // Test email mode
    if (testEmail) {
      const unsubscribeUrl = `${WEBSITE_URL}/unsubscribe?token=test&email=${encodeURIComponent(testEmail)}`
      const htmlContent = buildSoftwareUpdateEmail({
        releases: releases.map(r => ({
          platform: r.platform,
          version: r.version,
          releaseNotes: r.release_notes
        })),
        latestBlog,
        unsubscribeUrl,
        showProUpgrade: true
      })

      const sent = await sendEmail(testEmail, `[TEST] ${subject}`, htmlContent)

      return NextResponse.json({
        success: true,
        test: true,
        sent: sent ? 1 : 0,
        failed: sent ? 0 : 1
      })
    }

    // Fetch subscribers
    let query = supabase.from('users').select('id, email, plan, email_verified, blog_email_opt_in')

    if (sendToFree && !sendToPro) {
      query = query.eq('plan', 'free')
    } else if (sendToPro && !sendToFree) {
      query = query.eq('plan', 'pro')
    }

    const { data: allUsers, error: usersError } = await query

    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 })
    }

    // Filter subscribers
    const subscribers = (allUsers || []).filter(user => {
      if (!user.email) return false
      if (user.blog_email_opt_in === false) return false
      if (user.email_verified === false) return false
      return true
    })

    if (subscribers.length === 0) {
      return NextResponse.json({ success: true, sent: 0, failed: 0, message: 'No subscribers found' })
    }

    // Send emails
    let sent = 0
    let failed = 0

    for (const subscriber of subscribers) {
      const unsubscribeToken = generateUnsubscribeToken(subscriber.id, subscriber.email)
      const unsubscribeUrl = `${WEBSITE_URL}/api/unsubscribe?token=${unsubscribeToken}&email=${encodeURIComponent(subscriber.email)}`

      const htmlContent = buildSoftwareUpdateEmail({
        releases: releases.map(r => ({
          platform: r.platform,
          version: r.version,
          releaseNotes: r.release_notes
        })),
        latestBlog,
        unsubscribeUrl,
        showProUpgrade: subscriber.plan === 'free'
      })

      const success = await sendEmail(subscriber.email, subject, htmlContent)

      if (success) sent++
      else failed++

      // Rate limit
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    // Log the action
    await supabase.from('admin_audit_log').insert({
      admin_email: adminEmail,
      action: 'send_software_update_email',
      details: {
        releaseIds,
        platforms: releases.map(r => r.platform),
        versions: releases.map(r => r.version),
        sent,
        failed,
        includedBlog: !!latestBlog
      }
    })

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: subscribers.length
    })

  } catch (error) {
    console.error('Send software update email error:', error)
    return NextResponse.json({ error: 'Failed to send emails' }, { status: 500 })
  }
}

// GET - Get subscriber counts and latest blog for preview
export async function GET(request: NextRequest) {
  try {
    const { isAdmin } = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Count subscribers
    const { data: allUsers } = await supabase
      .from('users')
      .select('plan, email_verified, blog_email_opt_in')

    let freeCount = 0
    let proCount = 0

    for (const user of allUsers || []) {
      if (user.blog_email_opt_in === false) continue
      if (user.email_verified === false) continue

      if (user.plan === 'free') freeCount++
      else if (user.plan === 'pro') proCount++
    }

    // Get latest blog
    const { data: latestBlog } = await supabase
      .from('blog_posts')
      .select('id, title, slug')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(1)
      .single()

    return NextResponse.json({
      freeSubscribers: freeCount,
      proSubscribers: proCount,
      latestBlog
    })

  } catch (error) {
    console.error('Get email stats error:', error)
    return NextResponse.json({ error: 'Failed to get stats' }, { status: 500 })
  }
}
