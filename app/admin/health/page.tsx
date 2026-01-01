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

interface HealthData {
  overallStatus: 'healthy' | 'degraded' | 'down' | 'unknown'
  services: ServiceStatus[]
  environment: Environment
  recentErrors: Array<{ action: string; details: Record<string, unknown>; created_at: string }>
  checkedAt: string
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchHealth = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    else setLoading(true)

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/health', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setHealth(data)
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Health</h1>
          <p className="text-gray-600">Monitor service status and configuration</p>
        </div>
        <button
          onClick={() => fetchHealth(true)}
          disabled={refreshing}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
        >
          {refreshing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-full ${getStatusColor(health?.overallStatus || 'unknown')} flex items-center justify-center`}>
              <span className="text-white text-2xl font-bold">
                {getStatusIcon(health?.overallStatus || 'unknown')}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                System Status: <span className="capitalize">{health?.overallStatus || 'Unknown'}</span>
              </h2>
              <p className="text-gray-500">
                Last checked: {health?.checkedAt ? new Date(health.checkedAt).toLocaleString() : 'Never'}
              </p>
            </div>
          </div>
          <span className={`px-4 py-2 text-lg font-medium rounded-full ${getStatusBadge(health?.overallStatus || 'unknown')}`}>
            {health?.overallStatus?.toUpperCase() || 'UNKNOWN'}
          </span>
        </div>
      </div>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {health?.services.map((service) => (
          <div key={service.name} className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(service.status)}`}></div>
                <h3 className="font-semibold text-gray-900">{service.name}</h3>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(service.status)}`}>
                {service.status}
              </span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className="text-gray-900">{service.details || 'No details'}</span>
              </div>
              {service.latency !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Latency</span>
                  <span className={`font-medium ${service.latency > 1000 ? 'text-amber-600' : 'text-green-600'}`}>
                    {service.latency}ms
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Last Check</span>
                <span className="text-gray-900">
                  {new Date(service.lastCheck).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Environment Configuration */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Environment Configuration</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {health?.environment && Object.entries(health.environment).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-600">
                  {key.replace(/^has/, '').replace(/([A-Z])/g, ' $1').trim()}
                </span>
                {typeof value === 'boolean' ? (
                  value ? (
                    <span className="text-green-600 font-medium">✓</span>
                  ) : (
                    <span className="text-red-600 font-medium">✕</span>
                  )
                ) : (
                  <span className="text-gray-900 font-medium">{String(value)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Required Configuration Checklist */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden mb-8">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Configuration Checklist</h3>
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
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recent Errors</h3>
          </div>
          <div className="divide-y">
            {health.recentErrors.map((error, index) => (
              <div key={index} className="p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-600">{error.action}</span>
                  <span className="text-sm text-gray-500">
                    {new Date(error.created_at).toLocaleString()}
                  </span>
                </div>
                {error.details && (
                  <pre className="text-sm text-gray-600 bg-gray-50 p-2 rounded overflow-x-auto">
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
    <div className="flex items-center justify-between p-3 rounded-lg border">
      <div>
        <span className="font-medium text-gray-900">{label}</span>
        <p className="text-sm text-gray-500">{description}</p>
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
