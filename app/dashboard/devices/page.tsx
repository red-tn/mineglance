'use client'

import { useState, useEffect } from 'react'

interface Device {
  id: string
  installId: string  // API returns installId, not instanceId
  deviceName: string
  deviceType: string
  browser: string | null
  version: string | null
  createdAt: string
  lastSeen: string | null
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDevices()
  }, [])

  async function loadDevices() {
    const token = localStorage.getItem('user_token')
    if (!token) return

    try {
      const res = await fetch('/api/dashboard/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setDevices(data.devices || [])
      }
    } catch (e) {
      console.error('Failed to load devices:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemove(installId: string | undefined) {
    if (!installId) return

    if (!confirm('Are you sure you want to remove this device? It will be signed out.')) {
      return
    }

    setRemoving(installId)
    setError('')

    const token = localStorage.getItem('user_token')
    if (!token) return

    try {
      const res = await fetch(`/api/dashboard/devices?instanceId=${installId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        loadDevices()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to remove device')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setRemoving(null)
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getTimeSince(dateString: string | null) {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 5) return 'Active now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 30) return `${diffDays}d ago`
    return `${diffDays}d ago`
  }

  function getDaysUntilPurge(dateString: string | null): number | null {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    return Math.max(0, 30 - diffDays)
  }

  function isNearPurge(dateString: string | null): boolean {
    const daysLeft = getDaysUntilPurge(dateString)
    return daysLeft !== null && daysLeft <= 7
  }

  function getPlatformIcon(deviceType: string) {
    switch (deviceType) {
      case 'extension':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        )
    }
  }

  function getPlatformLabel(deviceType: string) {
    switch (deviceType) {
      case 'extension':
        return 'Browser Extension'
      default:
        return 'Unknown'
    }
  }

  function getPlatformColor(deviceType: string) {
    switch (deviceType) {
      case 'extension':
        return 'text-blue-400 bg-blue-500/20'
      default:
        return 'text-dark-text-muted bg-dark-card-hover'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  // Count by platform
  const extensionCount = devices.filter(d => d.deviceType === 'extension').length

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="glass-card rounded-xl p-6 border border-dark-border">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-dark-text">Connected Devices</h2>
            <p className="text-sm text-dark-text-muted mt-1">
              Devices signed in with your MineGlance account
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{devices.length}</p>
            <p className="text-xs text-dark-text-muted">total devices</p>
          </div>
        </div>
        {/* Auto-purge notice */}
        <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="text-sm text-amber-200 font-medium">Inactive devices are automatically removed</p>
            <p className="text-xs text-amber-300/70 mt-1">
              Devices not seen for 30 days are purged automatically to keep your account clean.
              Simply open the app or extension to reset the timer.
            </p>
          </div>
        </div>
      </div>

      {/* Platform Summary */}
      <div className="glass-card rounded-xl p-4 border border-dark-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
            {getPlatformIcon('extension')}
          </div>
          <div>
            <p className="text-2xl font-bold text-dark-text">{extensionCount}</p>
            <p className="text-xs text-dark-text-muted">Browser Extensions</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Devices List */}
      <div className="glass-card rounded-xl border border-dark-border overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border">
          <h3 className="font-semibold text-dark-text">All Devices</h3>
        </div>

        {devices.length === 0 ? (
          <div className="px-6 py-12 text-center text-dark-text-muted">
            <svg className="w-12 h-12 mx-auto text-dark-text-dim mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="font-medium text-dark-text">No devices found</p>
            <p className="text-sm mt-1">Sign in to MineGlance on any device to see it here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-dark-border">
            {devices.map((device) => {
              const recentActivity = getTimeSince(device.lastSeen)
              const isOnline = recentActivity === 'Active now'
              const colorClass = getPlatformColor(device.deviceType)
              const nearPurge = isNearPurge(device.lastSeen)
              const daysLeft = getDaysUntilPurge(device.lastSeen)

              return (
                <li key={device.id} className={`px-6 py-4 ${nearPurge ? 'bg-red-900/10' : ''}`}>
                  <div className="flex items-start gap-4">
                    {/* Platform Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      {getPlatformIcon(device.deviceType)}
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-dark-text">
                          {device.deviceName || 'Unknown Device'}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                          {getPlatformLabel(device.deviceType)}
                        </span>
                        {isOnline && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1 animate-pulse" />
                            Online
                          </span>
                        )}
                        {nearPurge && daysLeft !== null && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            {daysLeft === 0 ? 'Purge imminent' : `${daysLeft}d until purge`}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-dark-text-muted">
                        {device.browser && (
                          <span>{device.browser}</span>
                        )}
                        {device.version && (
                          <span>v{device.version}</span>
                        )}
                        {(device.browser || device.version) && <span className="text-dark-border">|</span>}
                        <span>Added {formatDate(device.createdAt)}</span>
                      </div>
                      {recentActivity && (
                        <p className="text-xs text-dark-text-dim mt-1">Last seen: {recentActivity}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <p
                          className="text-xs text-dark-text-dim font-mono cursor-pointer hover:text-dark-text-muted transition-colors"
                          title="Click to copy"
                          onClick={() => {
                            if (device.installId) {
                              navigator.clipboard.writeText(device.installId)
                            }
                          }}
                        >
                          ID: {device.installId || 'N/A'}
                        </p>
                        {device.installId && (
                          <button
                            onClick={() => navigator.clipboard.writeText(device.installId)}
                            className="p-1 text-dark-text-dim hover:text-primary transition-colors"
                            title="Copy ID"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleRemove(device.installId)}
                      disabled={removing === device.installId}
                      className="px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {removing === device.installId ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Info Card */}
      <div className="glass-card rounded-xl p-6 border border-dark-border">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-dark-card-hover flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-dark-text mb-1">Unlimited Devices</h4>
            <p className="text-sm text-dark-text-muted">
              Your MineGlance Pro license works on unlimited browser extensions. Install on Chrome, Edge,
              Brave, or Opera - all your data syncs automatically via the cloud.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
