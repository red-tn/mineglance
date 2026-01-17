import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/rateLimit'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY

// HTML escape to prevent XSS/injection in emails
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

export async function POST(request: NextRequest) {
  try {
    // Rate limit: 5 submissions per 15 minutes per IP
    const ip = getClientIp(request)
    const rateLimitResult = checkRateLimit(ip, 5, 15 * 60 * 1000)
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too many submissions. Please try again later.' },
        { status: 429 }
      )
    }

    const body = await request.json()

    const {
      category,
      priority,
      platforms,
      title,
      description,
      email,
      licenseKey
    } = body

    // Validate required fields
    if (!category || !priority || !title) {
      return NextResponse.json(
        { error: 'Category, priority, and title are required' },
        { status: 400 }
      )
    }

    // Insert into database
    const { data: item, error } = await supabase
      .from('roadmap_items')
      .insert({
        category,
        priority,
        platforms: platforms || [],
        title,
        description: description || '',
        submitter_email: email || null,
        submitter_license: licenseKey || null,
        status: 'submitted',
        progress: 0,
        is_public: true,
        is_internal: false
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    // Send email notification to admin
    if (SENDGRID_API_KEY) {
      try {
        // Escape user-provided content to prevent XSS/injection
        const safeTitle = escapeHtml(title)
        const safeDescription = escapeHtml(description || 'No description provided')
        const safeEmail = escapeHtml(email || 'Not provided')
        const safePlatforms = platforms?.map((p: string) => escapeHtml(p)).join(', ') || 'All'

        const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: 'control@mineglance.com' }],
              subject: `[MineGlance] New Roadmap Submission: ${safeTitle.substring(0, 50)}`
            }],
            from: { email: 'alerts@mineglance.com', name: 'MineGlance' },
            content: [{
              type: 'text/html',
              value: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #1a365d;">New Roadmap Submission</h2>

                  <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f7fafc; font-weight: bold;">Category</td>
                      <td style="padding: 10px; border: 1px solid #e2e8f0;">${formatCategory(category)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f7fafc; font-weight: bold;">Priority</td>
                      <td style="padding: 10px; border: 1px solid #e2e8f0;">${formatPriority(priority)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f7fafc; font-weight: bold;">Platforms</td>
                      <td style="padding: 10px; border: 1px solid #e2e8f0;">${safePlatforms}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f7fafc; font-weight: bold;">Title</td>
                      <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${safeTitle}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f7fafc; font-weight: bold;">Description</td>
                      <td style="padding: 10px; border: 1px solid #e2e8f0;">${safeDescription}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f7fafc; font-weight: bold;">Submitter Email</td>
                      <td style="padding: 10px; border: 1px solid #e2e8f0;">${safeEmail}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f7fafc; font-weight: bold;">License Key</td>
                      <td style="padding: 10px; border: 1px solid #e2e8f0;">${licenseKey ? escapeHtml(licenseKey.substring(0, 8)) + '...' : 'Free user'}</td>
                    </tr>
                  </table>

                  <p style="margin-top: 20px;">
                    <a href="https://www.mineglance.com/admin/roadmap" style="display: inline-block; padding: 12px 24px; background: #1a365d; color: white; text-decoration: none; border-radius: 6px;">
                      View in Admin Panel
                    </a>
                  </p>
                </div>
              `
            }]
          })
        })

        if (!emailResponse.ok) {
          console.error('SendGrid error:', await emailResponse.text())
        }
      } catch (emailError) {
        console.error('Failed to send email notification:', emailError)
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      item: {
        id: item.id,
        title: item.title,
        status: item.status
      }
    })
  } catch (error) {
    console.error('Error submitting roadmap item:', error)
    return NextResponse.json(
      { error: 'Failed to submit request' },
      { status: 500 }
    )
  }
}

function formatCategory(category: string): string {
  const categories: Record<string, string> = {
    new_pool: 'New Pool Support',
    new_coin: 'New Coin Support',
    feature: 'New Feature',
    ui_ux: 'UI/UX Improvement',
    integration: 'Integration',
    bug_report: 'Bug Report',
    other: 'Other'
  }
  return categories[category] || category
}

function formatPriority(priority: string): string {
  const priorities: Record<string, string> = {
    nice_to_have: 'Nice to Have',
    would_help: 'Would Help',
    really_need: 'Really Need This'
  }
  return priorities[priority] || priority
}
