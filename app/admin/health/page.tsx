'use client'

import { useState, useEffect, useCallback } from 'react'

interface ServiceStatus {
  name: string
  status: 'healthy' | 'degraded' | 'down' | 'unknown'
  latency?: number
  lastCheck: string
  details?: string
}

interface Environment {
  nodeEnv: string
  hasSupabaseUrl: boolean
  hasSupabaseKey: boolean
  hasStripePublicKey: boolean
  hasStripeSecretKey: boolean
  hasStripeWebhookSecret: boolean
  hasSendGridKey: boolean
  hasAdminEmails: boolean
}

interface SendGridStats {
  dailyLimit: number
  usedToday: number
  remainingToday: number
  planName: string
}

interface HealthData {
  overallStatus: 'healthy' | 'degraded' | 'down' | 'unknown'
  services: ServiceStatus[]
  environment: Environment
  sendgridStats?: SendGridStats
  recentErrors: Array<{ action: string; details: Record<string, unknown>; created_at: string }>
  checkedAt: string
}

interface CronJob {
  id: string
  name: string
  schedule: string
  last_run: string | null
  last_status: 'success' | 'failed' | null
  is_enabled: boolean
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [purging, setPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<{ success: boolean; purged: number; error?: string } | null>(null)

  const fetchHealth = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)

    try {
      const token = localStorage.getItem('admin_token')

      // Fetch health data
      const response = await fetch('/api/admin/health', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setHealth(data)

      // Fetch cron jobs
      const cronResponse = await fetch('/api/admin/cron', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const cronData = await cronResponse.json()
      setCronJobs(cronData.jobs || [])
    } catch (error) {
      console.error('Failed to fetch health:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchHealth()
  }, [fetchHealth])

  const handlePurgeInstances = async () => {
    if (!confirm('This will delete all device instances not seen in the last 30 days. Continue?')) return

    setPurging(true)
    setPurgeResult(null)

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/cron/purge-instances', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()

      if (response.ok) {
        setPurgeResult({ success: true, purged: data.purged })
      } else {
        setPurgeResult({ success: false, purged: 0, error: data.error || 'Purge failed' })
      }
    } catch (error) {
      setPurgeResult({ success: false, purged: 0, error: 'Connection error' })
    } finally {
      setPurging(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500'
      case 'degraded': return 'bg-amber-500'
      case 'down': return 'bg-red-500'
      default: return 'bg-gray-400'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800'
      case 'degraded': return 'bg-amber-100 text-amber-800'
      case 'down': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return '✓'
      case 'degraded': return '!'
      case 'down': return '✕'
      default: return '?'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b border-dark-border-2 border-b border-dark-borderlue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">System Health</h1>
          <p className="text-dark-text">Monitor service status and configuration</p>
        </div>
        <button
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {refreshing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b border-dark-border-2 border-white"></div>
              Checking...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh
            </>
          )}
        </button>
      </div>

      {/* Overall Status */}
      <div className="glass-card rounded-xl border border-dark-border p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full ${getStatusColor(health?.overallStatus || 'unknown')} flex items-center justify-center`}>
              <span className="text-white text-2xl font-bold">
                {getStatusIcon(health?.overallStatus || 'unknown')}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-dark-text">
                System Status: <span className="capitalize">{health?.overallStatus || 'Unknown'}</span>
              </h2>
              <p className="text-dark-text">
                Last checked: {health?.checkedAt ? new Date(health.checkedAt).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>
          <span className={`px-4 py-2 text-lg font-medium rounded-full ${getStatusBadge(health?.overallStatus || 'unknown')}`}>
            {health?.overallStatus?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
      </div>

      {/* SendGrid Stats Card */}
      {health?.sendgridStats && (
        <div className="glass-card rounded-xl border border-dark-border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-text">SendGrid Email Stats</h3>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-800">
              {health.sendgridStats.planName} Plan
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-dark-card-hover rounded-lg">
              <p className="text-3xl font-bold text-dark-text">{health.sendgridStats.usedToday}</p>
              <p className="text-sm text-dark-text mt-1">Sent Today</p>
            </div>
            <div className="text-center p-4 bg-dark-card-hover rounded-lg">
              <p className="text-3xl font-bold text-dark-text">{health.sendgridStats.dailyLimit}</p>
              <p className="text-sm text-dark-text mt-1">Daily Limit</p>
            </div>
            <div className="text-center p-4 bg-dark-card-hover rounded-lg">
              <p className={`text-3xl font-bold ${health.sendgridStats.remainingToday < 20 ? 'text-amber-600' : 'text-green-600'}`}>
                {health.sendgridStats.remainingToday}
              </p>
              <p className="text-sm text-dark-text mt-1">Remaining Today</p>
            </div>
          </div>
          {/* Usage Bar */}
          <div className="mt-4">
            <div className="flex justify-between text-sm text-dark-text mb-1">
              <span>Usage</span>
              <span>{Math.round((health.sendgridStats.usedToday / health.sendgridStats.dailyLimit) * 100)}%</span>
            </div>
            <div className="w-full bg-dark-border rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  health.sendgridStats.usedToday / health.sendgridStats.dailyLimit > 0.9
                    ? 'bg-red-500'
                    : health.sendgridStats.usedToday / health.sendgridStats.dailyLimit > 0.7
                    ? 'bg-amber-500'
                    : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, (health.sendgridStats.usedToday / health.sendgridStats.dailyLimit) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Cron Jobs Status */}
      {cronJobs.length > 0 && (
        <div className="glass-card rounded-xl border border-dark-border p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-dark-text">Scheduled Jobs</h3>
            <a href="/admin/cron" className="text-sm text-blue-500 hover:text-blue-400">
              Manage Jobs →
            </a>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cronJobs.map(job => (
              <div key={job.id} className="p-4 bg-dark-card-hover rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-dark-text">{job.name}</span>
                  <span className={`w-2 h-2 rounded-full ${
                    !job.is_enabled ? 'bg-gray-500' :
                    job.last_status === 'success' ? 'bg-green-500' :
                    job.last_status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                  }`}></span>
                </div>
                <div className="text-xs text-dark-text-muted space-y-1">
                  <p>Schedule: {job.schedule}</p>
                  <p>Last run: {job.last_run ? new Date(job.last_run).toLocaleString() : 'Never'}</p>
                  <p>Status: {
                    !job.is_enabled ? 'Disabled' :
                    job.last_status === 'success' ? 'Success' :
                    job.last_status === 'failed' ? 'Failed' : 'Not run yet'
                  }</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Maintenance Section */}
      <div className="glass-card rounded-xl border border-dark-border p-6 mb-8">
        <h3 className="text-lg font-semibold text-dark-text mb-4">Maintenance</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-dark-card-hover rounded-lg">
            <div>
              <p className="font-medium text-dark-text">Purge Stale Data</p>
              <p className="text-sm text-dark-text-muted">
                Delete device instances not seen in 30 days and unverified user accounts older than 30 days. Runs daily at midnight UTC.
              </p>
            </div>
            <button
              onClick={handlePurgeInstances}
              disabled={purging}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
            >
              {purging ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Purging...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Purge Now
                </>
              )}
            </button>
          </div>
          {purgeResult && (
            <div className={`p-4 rounded-lg ${purgeResult.success ? 'bg-green-900/30 border border-green-700' : 'bg-red-900/30 border border-red-700'}`}>
              {purgeResult.success ? (
                <p className="text-green-400">
                  Successfully purged {purgeResult.purged} stale instance{purgeResult.purged !== 1 ? 's' : ''}.
                </p>
              ) : (
                <p className="text-red-400">
                  Error: {purgeResult.error}
                </p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {health?.services.map((service) => (
          <div key={service.name} className="glass-card rounded-xl border border-dark-border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}></div>
                <h3 className="font-semibold text-dark-text">{service.name}</h3>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(service.status)}`}>
                {service.status}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-dark-text">Status</span>
                <span className="text-dark-text">{service.details || 'No details'}</span>
              </div>
              {service.latency !== undefined && (
                <div className="flex justify-between">
                  <span className="text-dark-text">Latency</span>
                  <span className={`font-medium ${service.latency > 1000 ? 'text-amber-600' : 'text-green-600'}`}>
                    {service.latency}ms
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-dark-text">Last Check</span>
                <span className="text-dark-text">
                  {new Date(service.lastCheck).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Environment Configuration */}
      <div className="glass-card rounded-xl border border-dark-border overflow-hidden mb-8">
        <div className="p-6 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-dark-text">Environment Configuration</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {health?.environment && Object.entries(health.environment).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-dark-card-hover rounded-lg">
                <span className="text-sm text-dark-text">
                  {key.replace(/^has/, '').replace(/([A-Z])/g, ' $1').trim()}
                </span>
                {typeof value === 'boolean' ? (
                  value ? (
                    <span className="text-green-600 font-medium">✓</span>
                  ) : (
                    <span className="text-red-600 font-medium">✕</span>
                  )
                ) : (
                  <span className="text-dark-text font-medium">{String(value)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Required Configuration Checklist */}
      <div className="glass-card rounded-xl border border-dark-border overflow-hidden mb-8">
        <div className="p-6 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-dark-text">Configuration Checklist</h3>
        </div>
        <div className="p-6">
          <div className="space-y-3">
            <ConfigItem
              label="Supabase URL"
              configured={health?.environment?.hasSupabaseUrl}
              description="NEXT_PUBLIC_SUPABASE_URL environment variable"
            />
            <ConfigItem
              label="Supabase Service Key"
              configured={health?.environment?.hasSupabaseKey}
              description="SUPABASE_SERVICE_ROLE_KEY environment variable"
            />
            <ConfigItem
              label="Stripe Public Key"
              configured={health?.environment?.hasStripePublicKey}
              description="NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable"
            />
            <ConfigItem
              label="Stripe Secret Key"
              configured={health?.environment?.hasStripeSecretKey}
              description="STRIPE_SECRET_KEY environment variable"
            />
            <ConfigItem
              label="Stripe Webhook Secret"
              configured={health?.environment?.hasStripeWebhookSecret}
              description="STRIPE_WEBHOOK_SECRET environment variable"
            />
            <ConfigItem
              label="SendGrid API Key"
              configured={health?.environment?.hasSendGridKey}
              description="SENDGRID_API_KEY environment variable"
            />
            <ConfigItem
              label="Admin Emails"
              configured={health?.environment?.hasAdminEmails}
              description="ADMIN_EMAILS environment variable"
            />
          </div>
        </div>
      </div>

      {/* Recent Errors */}
      {health?.recentErrors && health.recentErrors.length > 0 && (
        <div className="glass-card rounded-xl border border-dark-border overflow-hidden">
          <div className="p-6 border-b border-dark-border">
            <h3 className="text-lg font-semibold text-dark-text">Recent Errors</h3>
          </div>
          <div className="divide-y">
            {health.recentErrors.map((error, index) => (
              <div key={index} className="p-4 hover:bg-dark-card-hover">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-600">{error.action}</span>
                  <span className="text-sm text-dark-text">
                    {new Date(error.created_at).toLocaleString()}
                  </span>
                </div>
                {error.details && (
                  <pre className="text-sm text-dark-text bg-dark-card-hover p-2 rounded overflow-x-auto">
                    {JSON.stringify(error.details, null, 2)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ConfigItem({ label, configured, description }: { label: string; configured?: boolean; description: string }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border border-dark-border">
      <div>
        <span className="font-medium text-dark-text">{label}</span>
        <p className="text-sm text-dark-text">{description}</p>
      </div>
      {configured ? (
        <span className="flex items-center gap-1 text-green-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          Configured
        </span>
      ) : (
        <span className="flex items-center gap-1 text-red-600">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          Missing
        </span>
      )}
    </div>
  )
}
