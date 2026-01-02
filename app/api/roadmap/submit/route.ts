import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY

export async function POST(request: NextRequest) {
  try {
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
        const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SENDGRID_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            personalizations: [{
              to: [{ email: 'control@mineglance.com' }],
              subject: `[MineGlance] New Roadmap Submission: ${title}`
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
                      <td style="padding: 10px; border: 1px solid #e2e8f0;">${platforms?.join(', ') || 'All'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f7fafc; font-weight: bold;">Title</td>
                      <td style="padding: 10px; border: 1px solid #e2e8f0;"><strong>${title}</strong></td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f7fafc; font-weight: bold;">Description</td>
                      <td style="padding: 10px; border: 1px solid #e2e8f0;">${description || 'No description provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f7fafc; font-weight: bold;">Submitter Email</td>
                      <td style="padding: 10px; border: 1px solid #e2e8f0;">${email || 'Not provided'}</td>
                    </tr>
                    <tr>
                      <td style="padding: 10px; border: 1px solid #e2e8f0; background: #f7fafc; font-weight: bold;">License Key</td>
                      <td style="padding: 10px; border: 1px solid #e2e8f0;">${licenseKey ? licenseKey.substring(0, 8) + '...' : 'Free user'}</td>
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
