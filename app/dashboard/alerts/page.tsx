'use client'

import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../auth-context'

interface AlertSettings {
  notifyWorkerOffline: boolean
  notifyProfitDrop: boolean
  profitDropThreshold: number
  emailAlertsEnabled: boolean
  emailAlertsAddress: string
  emailFrequency: string
}

const EMAIL_FREQUENCIES = [
  { value: 'immediate', label: 'Immediate', description: 'Get notified right away' },
  { value: 'hourly', label: 'Hourly Digest', description: 'Bundled hourly summary' },
  { value: 'daily', label: 'Daily Digest', description: 'Once per day summary' },
  { value: 'weekly', label: 'Weekly Digest', description: 'Weekly summary' }
]

export default function AlertsPage() {
  const { user } = useContext(AuthContext)
  const [settings, setSettings] = useState<AlertSettings>({
    notifyWorkerOffline: true,
    notifyProfitDrop: true,
    profitDropThreshold: 20,
    emailAlertsEnabled: false,
    emailAlertsAddress: '',
    emailFrequency: 'immediate'
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saved' | 'error'>('idle')
  const [testingEmail, setTestingEmail] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      const token = localStorage.getItem('user_token')
      const res = await fetch('/api/dashboard/settings', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setSettings({
          ...data.settings,
          emailAlertsAddress: data.settings.emailAlertsAddress || user?.email || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveSettings(newSettings: Partial<AlertSettings>) {
    const updatedSettings = { ...settings, ...newSettings }
    setSettings(updatedSettings)

    setSaving(true)
    setSaveStatus('idle')

    try {
      const token = localStorage.getItem('user_token')
      const res = await fetch('/api/dashboard/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(updatedSettings)
      })

      if (res.ok) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } else {
        setSaveStatus('error')
      }
    } catch (error) {
      console.error('Failed to save settings:', error)
      setSaveStatus('error')
    } finally {
      setSaving(false)
    }
  }

  async function sendTestEmail() {
    if (!settings.emailAlertsAddress) {
      alert('Please enter an email address first')
      return
    }

    setTestingEmail(true)
    try {
      const token = localStorage.getItem('user_token')
      const res = await fetch('/api/send-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          licenseKey: user?.licenseKey,
          email: settings.emailAlertsAddress,
          alertType: 'test',
          subject: 'MineGlance Test Alert',
          message: 'This is a test alert from MineGlance. If you received this, your email alerts are working correctly!'
        })
      })

      if (res.ok) {
        alert('Test email sent! Check your inbox.')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to send test email')
      }
    } catch (error) {
      console.error('Test email error:', error)
      alert('Failed to send test email')
    } finally {
      setTestingEmail(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Alert Settings</h1>
          <p className="text-dark-text-muted mt-1">Configure notifications for your mining operations</p>
        </div>
        {saveStatus === 'saved' && (
          <span className="text-primary text-sm flex items-center gap-1">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Settings saved
          </span>
        )}
      </div>

      {/* Browser/Extension Alerts */}
      <div className="glass-card rounded-xl p-6 border border-dark-border">
        <h2 className="text-lg font-semibold text-dark-text mb-4">Browser Notifications</h2>
        <p className="text-sm text-dark-text-muted mb-6">
          These alerts appear in your browser when the extension detects issues.
        </p>

        <div className="space-y-4">
          {/* Worker Offline */}
          <div className="flex items-center justify-between py-3 border-b border-dark-border">
            <div>
              <p className="font-medium text-dark-text">Worker Offline Alert</p>
              <p className="text-sm text-dark-text-muted">Get notified when a miner goes offline</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifyWorkerOffline}
                onChange={(e) => saveSettings({ notifyWorkerOffline: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-dark-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-dark-text-muted after:border-dark-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white"></div>
            </label>
          </div>

          {/* Profit Drop */}
          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-dark-text">Profit Drop Alert</p>
              <p className="text-sm text-dark-text-muted">Alert when profit drops significantly</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-dark-text-muted">Threshold:</span>
                <select
                  value={settings.profitDropThreshold}
                  onChange={(e) => saveSettings({ profitDropThreshold: parseInt(e.target.value) })}
                  disabled={!settings.notifyProfitDrop}
                  className="px-3 py-1 bg-dark-card-hover border border-dark-border rounded-lg text-sm text-dark-text focus:ring-2 focus:ring-primary disabled:opacity-50"
                >
                  <option value={10}>10%</option>
                  <option value={20}>20%</option>
                  <option value={30}>30%</option>
                  <option value={50}>50%</option>
                </select>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.notifyProfitDrop}
                  onChange={(e) => saveSettings({ notifyProfitDrop: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-dark-text-muted after:border-dark-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Email Alerts */}
      <div className="glass-card rounded-xl p-6 border border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold text-dark-text">Email Alerts</h2>
            <p className="text-sm text-dark-text-muted">Receive alerts via email even when your browser is closed</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.emailAlertsEnabled}
              onChange={(e) => saveSettings({ emailAlertsEnabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-dark-border peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-dark-text-muted after:border-dark-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary peer-checked:after:bg-white"></div>
          </label>
        </div>

        {settings.emailAlertsEnabled && (
          <div className="space-y-4 pt-4 border-t border-dark-border">
            {/* Email Address */}
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Email Address
              </label>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={settings.emailAlertsAddress}
                  onChange={(e) => setSettings({ ...settings, emailAlertsAddress: e.target.value })}
                  onBlur={() => saveSettings({ emailAlertsAddress: settings.emailAlertsAddress })}
                  placeholder="your@email.com"
                  className="flex-1 px-4 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                <button
                  onClick={sendTestEmail}
                  disabled={testingEmail || !settings.emailAlertsAddress}
                  className="px-4 py-2 bg-dark-card-hover text-dark-text rounded-lg hover:bg-dark-border disabled:opacity-50 disabled:cursor-not-allowed transition whitespace-nowrap"
                >
                  {testingEmail ? 'Sending...' : 'Send Test'}
                </button>
              </div>
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-dark-text mb-2">
                Email Frequency
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {EMAIL_FREQUENCIES.map((freq) => (
                  <button
                    key={freq.value}
                    onClick={() => saveSettings({ emailFrequency: freq.value })}
                    className={`p-3 rounded-lg border-2 transition text-left ${
                      settings.emailFrequency === freq.value
                        ? 'border-primary bg-primary/10'
                        : 'border-dark-border hover:border-dark-text-dim'
                    }`}
                  >
                    <p className="font-medium text-dark-text">{freq.label}</p>
                    <p className="text-xs text-dark-text-muted mt-1">{freq.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="glass-card rounded-xl p-6 border border-blue-500/30 bg-gradient-to-r from-blue-500/10 to-indigo-500/10">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-blue-400">How Alerts Work</h3>
            <ul className="mt-2 text-sm text-dark-text-muted space-y-1">
              <li>- Browser notifications require the extension to be running</li>
              <li>- Email alerts are sent when issues are detected, even if browser is closed</li>
              <li>- Solo mining pools (CKPool, Public Pool, OCEAN) have a longer grace period to reduce false alerts</li>
              <li>- Settings sync across all your devices automatically</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
