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

  return !!session
}

// HTML escape to prevent XSS
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

// Generate unsubscribe token (simple hash for one-click unsubscribe)
function generateUnsubscribeToken(userId: string, email: string): string {
  const secret = process.env.INTERNAL_API_SECRET || 'default-secret'
  return crypto
    .createHmac('sha256', secret)
    .update(`${userId}:${email}:unsubscribe`)
    .digest('hex')
    .substring(0, 32)
}

// Build email HTML
function buildEmailHtml(options: {
  blogTitle: string
  blogExcerpt: string
  blogUrl: string
  featuredImageUrl: string | null
  includeExtensionUpdate: boolean
  extensionVersion?: string
  releaseNotes?: string[]
  unsubscribeUrl: string
  showProUpgrade: boolean
}): string {
  const {
    blogTitle,
    blogExcerpt,
    blogUrl,
    featuredImageUrl,
    includeExtensionUpdate,
    extensionVersion,
    releaseNotes,
    unsubscribeUrl,
    showProUpgrade
  } = options

  const safeTitle = escapeHtml(blogTitle)
  const safeExcerpt = escapeHtml(blogExcerpt)

  // Featured image section
  const featuredImageSection = featuredImageUrl ? `
    <div style="margin-bottom: 24px; border-radius: 12px; overflow: hidden;">
      <img src="${escapeHtml(featuredImageUrl)}" alt="${safeTitle}" style="width: 100%; height: auto; display: block;" />
    </div>
  ` : ''

  // Extension update section
  const extensionUpdateSection = includeExtensionUpdate && extensionVersion ? `
    <tr>
      <td style="padding: 0 40px 32px;">
        <div style="background: linear-gradient(135deg, #1a365d 0%, #2c5282 100%); border-radius: 12px; padding: 24px; border: 1px solid #3182ce;">
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr>
              <td style="vertical-align: top; width: 36px;">
                <span style="font-size: 24px;">🚀</span>
              </td>
              <td style="vertical-align: top;">
                <h3 style="margin: 0 0 8px; color: #ffffff; font-size: 18px; font-weight: bold;">
                  Extension Update Available!
                </h3>
                <p style="margin: 0 0 8px; color: #90cdf4; font-size: 14px; font-weight: 600;">
                  Version ${escapeHtml(extensionVersion)} is now available
                </p>
              </td>
            </tr>
          </table>

          ${releaseNotes && releaseNotes.length > 0 ? `
            <div style="margin: 16px 0; padding: 16px; background: rgba(0,0,0,0.2); border-radius: 8px;">
              <p style="margin: 0 0 8px; color: #e2e8f0; font-size: 13px; font-weight: 600;">What's New:</p>
              <ul style="margin: 0; padding-left: 20px; color: #cbd5e0; font-size: 13px; line-height: 1.8;">
                ${releaseNotes.map(note => `<li>${escapeHtml(note)}</li>`).join('')}
              </ul>
            </div>
          ` : ''}

          <div style="text-align: center; margin-top: 20px;">
            <a href="${WEBSITE_URL}/#install" style="display: inline-block; background: rgba(255,255,255,0.15); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; border: 1px solid rgba(255,255,255,0.2);">
              Update Extension
            </a>
          </div>
        </div>
      </td>
    </tr>
  ` : ''

  // Pro upgrade CTA (only for free users)
  const proUpgradeSection = showProUpgrade ? `
    <tr>
      <td style="padding: 0 40px 32px;">
        <div style="background: rgba(56, 161, 105, 0.1); border: 1px solid rgba(56, 161, 105, 0.3); border-radius: 12px; padding: 20px; text-align: center;">
          <p style="color: #38a169; margin: 0 0 8px; font-size: 15px; font-weight: 600;">
            Unlock Pro Features
          </p>
          <p style="color: #9ca3af; margin: 0 0 16px; font-size: 13px;">
            Unlimited wallets, email alerts, cloud sync & more
          </p>
          <a href="${WEBSITE_URL}/#pricing" style="display: inline-block; background: #38a169; color: white; padding: 10px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">
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
  <title>MineGlance Blog Update</title>
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
                ⛏️ MineGlance
              </h1>
              <p style="margin: 8px 0 0; color: #9ca3af; font-size: 14px;">Mining Profitability Dashboard</p>
            </td>
          </tr>

          <!-- Blog Post Section -->
          <tr>
            <td style="padding: 32px 40px;">
              ${featuredImageSection}

              <!-- Post Title -->
              <h2 style="margin: 0 0 16px; color: #ffffff; font-size: 22px; font-weight: bold; line-height: 1.3;">
                ${safeTitle}
              </h2>

              <!-- Post Excerpt -->
              <p style="margin: 0 0 24px; color: #d1d5db; font-size: 16px; line-height: 1.6;">
                ${safeExcerpt}
              </p>

              <!-- Read More Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${escapeHtml(blogUrl)}" style="display: inline-block; background: linear-gradient(135deg, #38a169 0%, #2f855a 100%); color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                  Read Full Article
                </a>
              </div>
            </td>
          </tr>

          ${extensionUpdateSection}

          ${proUpgradeSection}

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #2d2d2d; text-align: center;">
              <p style="color: #6b7280; font-size: 12px; margin: 0 0 12px;">
                You're receiving this because you subscribed to MineGlance updates.
              </p>
              <p style="margin: 0;">
                <a href="${escapeHtml(unsubscribeUrl)}" style="color: #9ca3af; font-size: 12px; text-decoration: underline;">
                  Unsubscribe from blog updates
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

// POST - Send blog email to subscribers
export async function POST(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      postId,
      sendToFree,
      sendToPro,
      includeExtensionUpdate,
      extensionVersion,
      releaseNotes,
      testEmail
    } = body

    if (!postId) {
      return NextResponse.json({ error: 'Post ID is required' }, { status: 400 })
    }

    // Fetch the blog post
    const { data: post, error: postError } = await supabase
      .from('blog_posts')
      .select('id, title, slug, excerpt, featured_image_url')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return NextResponse.json({ error: 'Blog post not found' }, { status: 404 })
    }

    const blogUrl = `${WEBSITE_URL}/blog/${post.slug}`

    // If test email, just send to that address
    if (testEmail) {
      const unsubscribeUrl = `${WEBSITE_URL}/unsubscribe?token=test&email=${encodeURIComponent(testEmail)}`
      const htmlContent = buildEmailHtml({
        blogTitle: post.title,
        blogExcerpt: post.excerpt || 'Check out our latest blog post!',
        blogUrl,
        featuredImageUrl: post.featured_image_url,
        includeExtensionUpdate: includeExtensionUpdate || false,
        extensionVersion,
        releaseNotes: releaseNotes || [],
        unsubscribeUrl,
        showProUpgrade: true // Show upgrade CTA in test
      })

      const sent = await sendEmail(testEmail, `📰 ${post.title}`, htmlContent)

      return NextResponse.json({
        success: true,
        test: true,
        sent: sent ? 1 : 0,
        failed: sent ? 0 : 1
      })
    }

    // Build query for subscribers
    // Use neq(blog_email_opt_in, false) to include NULL values as opted-in (default true)
    let query = supabase
      .from('users')
      .select('id, email, plan')
      .neq('blog_email_opt_in', false)
      .eq('email_verified', true)

    // Filter by plan
    if (sendToFree && sendToPro) {
      // Send to both - no additional filter
    } else if (sendToFree) {
      query = query.eq('plan', 'free')
    } else if (sendToPro) {
      query = query.eq('plan', 'pro')
    } else {
      return NextResponse.json({ error: 'Select at least one audience (Free or Pro)' }, { status: 400 })
    }

    const { data: subscribers, error: subError } = await query

    if (subError) {
      console.error('Error fetching subscribers:', subError)
      return NextResponse.json({ error: 'Failed to fetch subscribers' }, { status: 500 })
    }

    if (!subscribers || subscribers.length === 0) {
      return NextResponse.json({ success: true, sent: 0, failed: 0, message: 'No subscribers found' })
    }

    // Send emails
    let sent = 0
    let failed = 0

    for (const subscriber of subscribers) {
      const unsubscribeToken = generateUnsubscribeToken(subscriber.id, subscriber.email)
      const unsubscribeUrl = `${WEBSITE_URL}/api/unsubscribe?token=${unsubscribeToken}&email=${encodeURIComponent(subscriber.email)}`

      const htmlContent = buildEmailHtml({
        blogTitle: post.title,
        blogExcerpt: post.excerpt || 'Check out our latest blog post!',
        blogUrl,
        featuredImageUrl: post.featured_image_url,
        includeExtensionUpdate: includeExtensionUpdate || false,
        extensionVersion,
        releaseNotes: releaseNotes || [],
        unsubscribeUrl,
        showProUpgrade: subscriber.plan === 'free'
      })

      const success = await sendEmail(subscriber.email, `📰 ${post.title}`, htmlContent)

      if (success) {
        sent++
      } else {
        failed++
      }

      // Rate limit: small delay between emails
      await new Promise(resolve => setTimeout(resolve, 100))
    }

    return NextResponse.json({
      success: true,
      sent,
      failed,
      total: subscribers.length
    })

  } catch (error) {
    console.error('Send blog email error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to send emails', details: errorMessage }, { status: 500 })
  }
}

// GET - Get subscriber counts
export async function GET(request: NextRequest) {
  try {
    const isAdmin = await verifyAdmin(request)
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get counts for free and pro users who are opted in
    // Use neq(blog_email_opt_in, false) to include NULL values as opted-in (default true)
    const { count: freeCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'free')
      .neq('blog_email_opt_in', false)
      .eq('email_verified', true)

    const { count: proCount } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('plan', 'pro')
      .neq('blog_email_opt_in', false)
      .eq('email_verified', true)

    // Get latest extension release
    const { data: latestRelease } = await supabase
      .from('software_releases')
      .select('version, release_notes')
      .eq('platform', 'extension')
      .eq('is_latest', true)
      .single()

    return NextResponse.json({
      freeSubscribers: freeCount || 0,
      proSubscribers: proCount || 0,
      latestExtensionVersion: latestRelease?.version || null,
      latestReleaseNotes: latestRelease?.release_notes || null
    })

  } catch (error) {
    console.error('Get subscriber counts error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: 'Failed to get counts', details: errorMessage }, { status: 500 })
  }
}
