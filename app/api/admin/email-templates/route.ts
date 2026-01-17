import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY!
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'hello@mineglance.com'

async function getAdminFromToken(token: string) {
  const { data: session } = await supabase
    .from('admin_sessions')
    .select('admin_id')
    .eq('token', token)
    .gt('expires_at', new Date().toISOString())
    .single()

  if (!session?.admin_id) return null

  const { data: admin } = await supabase
    .from('admin_users')
    .select('*')
    .eq('id', session.admin_id)
    .single()

  return admin || null
}

// GET - List all email templates
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

    const { data: templates, error } = await supabase
      .from('email_templates')
      .select('*')
      .order('name')

    if (error) {
      console.error('Error fetching templates:', error)
      return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
    }

    return NextResponse.json({ templates: templates || [] })
  } catch (error) {
    console.error('Email templates fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 })
  }
}

// POST - Send test email or update template
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

    const body = await request.json()
    const { action, templateId, testEmail, ...updateData } = body

    if (action === 'test') {
      // Send test email
      if (!templateId || !testEmail) {
        return NextResponse.json({ error: 'Template ID and test email required' }, { status: 400 })
      }

      const { data: template, error: templateError } = await supabase
        .from('email_templates')
        .select('*')
        .eq('id', templateId)
        .single()

      if (templateError || !template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 })
      }

      // Replace variables with test values
      let htmlContent = template.html_content
      const testVariables: Record<string, string> = {
        email: testEmail,
        licenseKey: 'TEST-XXXX-XXXX-XXXX',
        daysUntilExpiry: '7',
        resetLink: 'https://www.mineglance.com/auth/reset-password?token=test123',
        verifyLink: 'https://www.mineglance.com/api/auth/verify-email?token=test123',
        fullName: 'Test User'
      }

      for (const [key, value] of Object.entries(testVariables)) {
        htmlContent = htmlContent.replace(new RegExp(`{{${key}}}`, 'g'), value)
      }

      // Send via SendGrid
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: testEmail }] }],
          from: { email: FROM_EMAIL, name: 'MineGlance' },
          subject: `[TEST] ${template.subject}`,
          content: [{ type: 'text/html', value: htmlContent }],
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('SendGrid error:', errorText)
        return NextResponse.json({ error: 'Failed to send test email' }, { status: 500 })
      }

      // Log the test
      await supabase.from('admin_audit_log').insert({
        admin_email: admin.email,
        action: 'test_email_template',
        details: { templateId, templateName: template.name, testEmail }
      })

      return NextResponse.json({ success: true, message: `Test email sent to ${testEmail}` })
    }

    // Update template
    if (!templateId) {
      return NextResponse.json({ error: 'Template ID required' }, { status: 400 })
    }

    const { error: updateError } = await supabase
      .from('email_templates')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)

    if (updateError) {
      console.error('Error updating template:', updateError)
      return NextResponse.json({ error: 'Failed to update template' }, { status: 500 })
    }

    // Log the update
    await supabase.from('admin_audit_log').insert({
      admin_email: admin.email,
      action: 'update_email_template',
      details: { templateId, updates: Object.keys(updateData) }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Email template action error:', error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
