import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Cron job to publish scheduled blog posts and send emails
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date().toISOString()

    // Find scheduled posts that should be published
    const { data: postsToPublish, error: fetchError } = await supabase
      .from('blog_posts')
      .select('*')
      .eq('status', 'scheduled')
      .lte('scheduled_at', now)

    if (fetchError) {
      console.error('Error fetching scheduled posts:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 })
    }

    if (!postsToPublish || postsToPublish.length === 0) {
      return NextResponse.json({ message: 'No posts to publish', published: 0 })
    }

    let published = 0
    let emailsSent = 0

    for (const post of postsToPublish) {
      // Update post to published
      const { error: updateError } = await supabase
        .from('blog_posts')
        .update({
          status: 'published',
          published_at: now
        })
        .eq('id', post.id)

      if (updateError) {
        console.error(`Failed to publish post ${post.id}:`, updateError)
        continue
      }

      published++

      // Send emails if enabled
      if (post.send_email_on_publish && (post.email_to_free || post.email_to_pro)) {
        try {
          const emailResult = await sendBlogEmail(post)
          emailsSent += emailResult.sent
        } catch (emailError) {
          console.error(`Failed to send emails for post ${post.id}:`, emailError)
        }
      }
    }

    return NextResponse.json({
      message: `Published ${published} posts, sent ${emailsSent} emails`,
      published,
      emailsSent
    })
  } catch (error) {
    console.error('Cron publish-scheduled error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Send blog post notification emails
async function sendBlogEmail(post: {
  id: string
  title: string
  slug: string
  excerpt: string
  email_to_free: boolean
  email_to_pro: boolean
}): Promise<{ sent: number; failed: number }> {
  // Get subscribers based on plan
  let query = supabase.from('users').select('email, full_name, plan')

  if (post.email_to_free && post.email_to_pro) {
    // Send to everyone
  } else if (post.email_to_free) {
    query = query.eq('plan', 'free')
  } else if (post.email_to_pro) {
    query = query.eq('plan', 'pro')
  } else {
    return { sent: 0, failed: 0 }
  }

  const { data: subscribers, error } = await query

  if (error || !subscribers) {
    console.error('Failed to fetch subscribers:', error)
    return { sent: 0, failed: 0 }
  }

  let sent = 0
  let failed = 0

  const sgMail = require('@sendgrid/mail')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)

  for (const subscriber of subscribers) {
    if (!subscriber.email) continue

    try {
      await sgMail.send({
        to: subscriber.email,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'noreply@mineglance.com',
          name: 'MineGlance'
        },
        subject: `New Post: ${post.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">${post.title}</h2>
            <p style="color: #666;">${post.excerpt}</p>
            <p>
              <a href="https://www.mineglance.com/blog/${post.slug}"
                 style="display: inline-block; background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
                Read More
              </a>
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              You're receiving this because you signed up for MineGlance.
            </p>
          </div>
        `
      })
      sent++
    } catch (e) {
      console.error(`Failed to send email to ${subscriber.email}:`, e)
      failed++
    }
  }

  return { sent, failed }
}
