import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'

interface SendTemplateEmailOptions {
  to: string
  templateSlug: string
  variables: Record<string, string>
  fromName?: string
}

/**
 * Send an email using a template from the database.
 * Falls back to a simple error message if template not found.
 */
export async function sendTemplateEmail({
  to,
  templateSlug,
  variables,
  fromName = 'MineGlance'
}: SendTemplateEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // Fetch template from database
    const { data: template, error: templateError } = await supabase
      .from('email_templates')
      .select('subject, html_content')
      .eq('slug', templateSlug)
      .eq('is_active', true)
      .single()

    if (templateError || !template) {
      console.error(`Email template '${templateSlug}' not found or inactive`)
      return { success: false, error: `Template '${templateSlug}' not found` }
    }

    // Replace variables in subject and content
    let subject = template.subject
    let htmlContent = template.html_content

    for (const [key, value] of Object.entries(variables)) {
      const regex = new RegExp(`{{${key}}}`, 'g')
      subject = subject.replace(regex, value)
      htmlContent = htmlContent.replace(regex, value)
    }

    // Send via SendGrid
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: fromName },
        subject,
        content: [{ type: 'text/html', value: htmlContent }],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('SendGrid error:', errorText)
      return { success: false, error: 'SendGrid API error' }
    }

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}
