'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../auth-context'

interface Device {
  id: string
  installId: string
  deviceName: string
  browser: string | null
  version: string | null
  activatedAt: string
  lastSeen: string | null
  isActive: boolean
}

export default function DevicesPage() {
  const { user } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [maxActivations, setMaxActivations] = useState(3)
  const [activeCount, setActiveCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deactivating, setDeactivating] = useState<string | null>(null)
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
        setDevices(data.devices)
        setMaxActivations(data.maxActivations)
        setActiveCount(data.activeCount)
      }
    } catch (e) {
      console.error('Failed to load devices:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivate(installId: string) {
    if (!confirm('Are you sure you want to deactivate this device? It will need to be re-activated to use MineGlance Pro.')) {
      return
    }

    setDeactivating(installId)
    setError('')

    const token = localStorage.getItem('user_token')
    if (!token) return

    try {
      const res = await fetch(`/api/dashboard/devices?installId=${installId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        // Refresh the list
        loadDevices()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to deactivate device')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setDeactivating(null)
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
    if (diffDays < 7) return `${diffDays}d ago`
    return null
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

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Active Devices</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage devices using your MineGlance Pro license
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{activeCount}/{maxActivations}</p>
            <p className="text-xs text-gray-500">activations used</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${activeCount >= maxActivations ? 'bg-amber-500' : 'bg-accent'}`}
            style={{ width: `${(activeCount / maxActivations) * 100}%` }}
          />
        </div>

        {activeCount >= maxActivations && (
          <p className="mt-3 text-sm text-amber-600">
            You&apos;ve reached your activation limit. Deactivate a device to activate a new one.
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {/* Devices List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden max-w-4xl">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">All Devices</h3>
        </div>

        {devices.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="font-medium">No devices found</p>
            <p className="text-sm mt-1">Activate MineGlance Pro in your browser extension to see devices here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {devices.map((device) => {
              const recentActivity = getTimeSince(device.lastSeen)
              const isOnline = recentActivity === 'Active now'

              return (
                <li key={device.id} className="px-6 py-4">
                  <div className="flex items-start gap-4">
                    {/* Device Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${device.isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${device.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                          {device.deviceName}
                        </h4>
                        {device.isActive ? (
                          isOnline ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              Active
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                        {device.browser && (
                          <span>{device.browser}</span>
                        )}
                        {device.version && (
                          <span>v{device.version}</span>
                        )}
                        <span className="text-gray-300">|</span>
                        <span>Activated {formatDate(device.activatedAt)}</span>
                      </div>
                      {recentActivity && device.isActive && (
                        <p className="text-xs text-gray-400 mt-1">Last seen: {recentActivity}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 font-mono">ID: {device.installId.substring(0, 16)}...</p>
                    </div>

                    {/* Actions */}
                    {device.isActive && (
                      <button
                        onClick={() => handleDeactivate(device.installId)}
                        disabled={deactivating === device.installId}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deactivating === device.installId ? 'Deactivating...' : 'Deactivate'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-4xl">
        <h4 className="font-medium text-blue-900 mb-1">Need more activations?</h4>
        <p className="text-sm text-blue-700">
          Your license allows up to {maxActivations} active devices. If you need more, contact support at{' '}
          <a href="mailto:control@mineglance.com" className="underline">control@mineglance.com</a>.
        </p>
      </div>
    </div>
  )
}
