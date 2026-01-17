'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface EmailTemplate {
  id: string
  slug: string
  name: string
  subject: string
  html_content: string
  description: string | null
  variables: string[]
  is_active: boolean
  created_at: string
  updated_at: string
}

export default function EmailTemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [editedContent, setEditedContent] = useState({
    subject: '',
    html_content: '',
    description: '',
    is_active: true
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  async function fetchTemplates() {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/email-templates', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.status === 401) {
        router.push('/admin/login')
        return
      }

      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (error) {
      console.error('Error fetching templates:', error)
    } finally {
      setLoading(false)
    }
  }

  function selectTemplate(template: EmailTemplate) {
    setSelectedTemplate(template)
    setEditedContent({
      subject: template.subject,
      html_content: template.html_content,
      description: template.description || '',
      is_active: template.is_active
    })
    setEditMode(false)
    setMessage(null)
  }

  async function handleSave() {
    if (!selectedTemplate) return

    setSaving(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          ...editedContent
        })
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'Template saved successfully' })
        setEditMode(false)
        // Update local state
        setTemplates(templates.map(t =>
          t.id === selectedTemplate.id
            ? { ...t, ...editedContent, updated_at: new Date().toISOString() }
            : t
        ))
        setSelectedTemplate({ ...selectedTemplate, ...editedContent })
      } else {
        const data = await res.json()
        setMessage({ type: 'error', text: data.error || 'Failed to save' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save template' })
    } finally {
      setSaving(false)
    }
  }

  async function handleTest() {
    if (!selectedTemplate || !testEmail) return

    setTesting(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/email-templates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'test',
          templateId: selectedTemplate.id,
          testEmail
        })
      })

      const data = await res.json()
      if (res.ok) {
        setMessage({ type: 'success', text: data.message })
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send test' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send test email' })
    } finally {
      setTesting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Email Templates</h1>
          <p className="text-dark-text-muted mt-1">Manage and test email templates</p>
        </div>
      </div>

      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-900/50 border border-green-700 text-green-200' : 'bg-red-900/50 border border-red-700 text-red-200'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="glass-card rounded-xl border border-dark-border p-4">
          <h2 className="text-lg font-semibold text-dark-text mb-4">Templates</h2>
          <div className="space-y-2">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => selectTemplate(template)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'bg-primary/20 border border-primary/50'
                    : 'bg-dark-card-hover hover:bg-dark-border'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-dark-text">{template.name}</span>
                  {!template.is_active && (
                    <span className="text-xs bg-red-900 text-red-200 px-2 py-0.5 rounded">Disabled</span>
                  )}
                </div>
                <p className="text-xs text-dark-text-muted mt-1">{template.slug}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Template Editor */}
        <div className="lg:col-span-2">
          {selectedTemplate ? (
            <div className="glass-card rounded-xl border border-dark-border p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-dark-text">{selectedTemplate.name}</h2>
                  <p className="text-sm text-dark-text-muted">{selectedTemplate.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  {editMode ? (
                    <>
                      <button
                        onClick={() => setEditMode(false)}
                        className="px-4 py-2 text-dark-text-muted hover:text-dark-text transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50"
                      >
                        {saving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditMode(true)}
                      className="px-4 py-2 bg-dark-card-hover text-dark-text rounded-lg hover:bg-dark-border"
                    >
                      Edit Template
                    </button>
                  )}
                </div>
              </div>

              {/* Variables */}
              <div className="bg-dark-bg rounded-lg p-3">
                <p className="text-xs text-dark-text-muted mb-2">Available Variables:</p>
                <div className="flex flex-wrap gap-2">
                  {(selectedTemplate.variables || []).map((v: string) => (
                    <code key={v} className="px-2 py-1 bg-dark-card-hover rounded text-xs text-primary">
                      {`{{${v}}}`}
                    </code>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-2">Subject Line</label>
                {editMode ? (
                  <input
                    type="text"
                    value={editedContent.subject}
                    onChange={(e) => setEditedContent({ ...editedContent, subject: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <p className="text-dark-text">{selectedTemplate.subject}</p>
                )}
              </div>

              {/* Active Toggle */}
              {editMode && (
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={editedContent.is_active}
                    onChange={(e) => setEditedContent({ ...editedContent, is_active: e.target.checked })}
                    className="w-4 h-4 rounded border-dark-border bg-dark-bg text-primary focus:ring-primary"
                  />
                  <label htmlFor="is_active" className="text-dark-text">Template Active</label>
                </div>
              )}

              {/* HTML Content */}
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-2">HTML Content</label>
                {editMode ? (
                  <textarea
                    value={editedContent.html_content}
                    onChange={(e) => setEditedContent({ ...editedContent, html_content: e.target.value })}
                    rows={20}
                    className="w-full px-4 py-3 bg-dark-bg border border-dark-border rounded-lg text-dark-text font-mono text-sm focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                ) : (
                  <div className="bg-dark-bg border border-dark-border rounded-lg p-4 max-h-96 overflow-auto">
                    <pre className="text-xs text-dark-text-muted whitespace-pre-wrap font-mono">
                      {selectedTemplate.html_content}
                    </pre>
                  </div>
                )}
              </div>

              {/* Preview */}
              {!editMode && (
                <div>
                  <label className="block text-sm font-medium text-dark-text-muted mb-2">Preview</label>
                  <div className="bg-white rounded-lg p-4 max-h-96 overflow-auto">
                    <iframe
                      srcDoc={selectedTemplate.html_content
                        .replace(/{{email}}/g, 'test@example.com')
                        .replace(/{{licenseKey}}/g, 'TEST-XXXX-XXXX-XXXX')
                        .replace(/{{daysUntilExpiry}}/g, '7')
                        .replace(/{{resetLink}}/g, '#')
                        .replace(/{{verifyLink}}/g, '#')
                        .replace(/{{fullName}}/g, 'Test User')}
                      className="w-full h-64 border-0"
                      title="Email Preview"
                    />
                  </div>
                </div>
              )}

              {/* Test Email */}
              <div className="border-t border-dark-border pt-6">
                <h3 className="text-lg font-semibold text-dark-text mb-4">Send Test Email</h3>
                <div className="flex items-center gap-3">
                  <input
                    type="email"
                    placeholder="Enter test email address"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <button
                    onClick={handleTest}
                    disabled={testing || !testEmail}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {testing ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
                <p className="text-xs text-dark-text-muted mt-2">
                  Test emails will have [TEST] prefix in subject and use placeholder values for variables.
                </p>
              </div>

              {/* Metadata */}
              <div className="text-xs text-dark-text-dim border-t border-dark-border pt-4">
                <p>Last updated: {new Date(selectedTemplate.updated_at).toLocaleString()}</p>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-xl border border-dark-border p-12 text-center">
              <svg className="w-16 h-16 text-dark-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-dark-text-muted">Select a template to view and edit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
