'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '../auth-context'

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

interface SoftwareRelease {
  version: string
  downloadUrl: string
  releaseNotes?: string
}

export default function DevicesPage() {
  const { user } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [loading, setLoading] = useState(true)
  const [removing, setRemoving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const isPro = user?.plan === 'pro'

  // Software release info
  const [extensionRelease, setExtensionRelease] = useState<SoftwareRelease | null>(null)
  const [windowsRelease, setWindowsRelease] = useState<SoftwareRelease | null>(null)
  const [macosRelease, setMacosRelease] = useState<SoftwareRelease | null>(null)
  const [windowsAnnouncementDismissed, setWindowsAnnouncementDismissed] = useState(true)
  const [macAnnouncementDismissed, setMacAnnouncementDismissed] = useState(true)

  // Compare semantic versions: returns 1 if a > b, -1 if a < b, 0 if equal
  function compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number)
    const bParts = b.split('.').map(Number)
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0
      const bVal = bParts[i] || 0
      if (aVal > bVal) return 1
      if (aVal < bVal) return -1
    }
    return 0
  }

  // Get highest installed version for a platform
  function getInstalledVersion(deviceType: string): string | null {
    const versions = devices
      .filter(d => d.deviceType === deviceType)
      .map(d => d.version)
      .filter(Boolean) as string[]
    if (versions.length === 0) return null
    return versions.sort((a, b) => compareVersions(b, a))[0]
  }

  const installedWindowsVersion = getInstalledVersion('desktop_windows')
  const installedMacVersion = getInstalledVersion('desktop_macos')

  // Check if update is available (latest > installed)
  const windowsUpdateAvailable = windowsRelease && installedWindowsVersion &&
    compareVersions(windowsRelease.version, installedWindowsVersion) > 0
  const macUpdateAvailable = macosRelease && installedMacVersion &&
    compareVersions(macosRelease.version, installedMacVersion) > 0

  useEffect(() => {
    loadDevices()
    loadSoftwareReleases()

    // Poll for updates every 30 seconds
    const pollInterval = setInterval(() => {
      loadDevices()
    }, 30000)

    return () => clearInterval(pollInterval)
  }, [])

  async function loadSoftwareReleases() {
    // Load extension release
    try {
      const res = await fetch('/api/software/latest?platform=extension')
      if (res.ok) {
        const data = await res.json()
        if (data.version && data.downloadUrl) {
          setExtensionRelease({ version: data.version, downloadUrl: data.downloadUrl, releaseNotes: data.releaseNotes })
        }
      }
    } catch (e) {
      console.error('Failed to load extension release:', e)
    }

    // Load Windows release
    try {
      const res = await fetch('/api/software/latest?platform=desktop_windows')
      if (res.ok) {
        const data = await res.json()
        if (data.version && data.downloadUrl) {
          setWindowsRelease({ version: data.version, downloadUrl: data.downloadUrl, releaseNotes: data.releaseNotes })
          const seenVersion = localStorage.getItem('seen_windows_version')
          setWindowsAnnouncementDismissed(seenVersion === data.version)
        }
      }
    } catch (e) {
      console.error('Failed to load Windows release:', e)
    }

    // Load macOS release
    try {
      const res = await fetch('/api/software/latest?platform=desktop_macos')
      if (res.ok) {
        const data = await res.json()
        if (data.version && data.downloadUrl) {
          setMacosRelease({ version: data.version, downloadUrl: data.downloadUrl, releaseNotes: data.releaseNotes })
          const seenVersion = localStorage.getItem('seen_mac_version')
          setMacAnnouncementDismissed(seenVersion === data.version)
        }
      }
    } catch (e) {
      console.error('Failed to load macOS release:', e)
    }
  }

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
      case 'desktop_windows':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 5.5L10.5 4.3V11.5H3V5.5ZM3 18.5V12.5H10.5V19.7L3 18.5ZM11.5 4.1L21 2.5V11.5H11.5V4.1ZM11.5 12.5H21V21.5L11.5 19.9V12.5Z"/>
          </svg>
        )
      case 'desktop_macos':
        return (
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
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
      case 'desktop_windows':
        return 'Windows'
      case 'desktop_macos':
        return 'macOS'
      default:
        return 'Unknown'
    }
  }

  function getPlatformColor(deviceType: string) {
    switch (deviceType) {
      case 'extension':
        return 'text-blue-400 bg-blue-500/20'
      case 'desktop_windows':
        return 'text-sky-400 bg-sky-500/20'
      case 'desktop_macos':
        return 'text-gray-300 bg-gray-500/20'
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
  const windowsCount = devices.filter(d => d.deviceType === 'desktop_windows').length
  const macosCount = devices.filter(d => d.deviceType === 'desktop_macos').length

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

      {/* Platform Summary - 3 cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Extensions */}
        <div className="glass-card rounded-xl p-4 border border-dark-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                {getPlatformIcon('extension')}
              </div>
              <div>
                <p className="text-2xl font-bold text-dark-text">{extensionCount}</p>
                <p className="text-xs text-dark-text-muted">Extensions</p>
              </div>
            </div>
            {extensionRelease && (
              <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full font-medium">
                v{extensionRelease.version}
              </span>
            )}
          </div>
        </div>

        {/* Windows */}
        <div className="glass-card rounded-xl p-4 border border-dark-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400">
                {getPlatformIcon('desktop_windows')}
              </div>
              <div>
                <p className="text-2xl font-bold text-dark-text">{windowsCount}</p>
                <p className="text-xs text-dark-text-muted">Windows</p>
              </div>
            </div>
            {windowsRelease && (
              <span className="text-xs bg-sky-500/20 text-sky-400 px-2 py-1 rounded-full font-medium">
                v{windowsRelease.version}
              </span>
            )}
          </div>
        </div>

        {/* macOS */}
        <div className="glass-card rounded-xl p-4 border border-dark-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-500/20 flex items-center justify-center text-gray-300">
                {getPlatformIcon('desktop_macos')}
              </div>
              <div>
                <p className="text-2xl font-bold text-dark-text">{macosCount}</p>
                <p className="text-xs text-dark-text-muted">macOS</p>
              </div>
            </div>
            {macosRelease && (
              <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded-full font-medium">
                v{macosRelease.version}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Software Announcement Banners - only show if user has older version installed */}
      {windowsUpdateAvailable && !windowsAnnouncementDismissed && (
        <div className="glass-card rounded-xl p-4 border border-sky-500/50 bg-sky-500/10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-sky-500/20 text-sky-400">
                {getPlatformIcon('desktop_windows')}
              </div>
              <div>
                <p className="font-medium text-sky-400">
                  🎉 Windows Desktop v{windowsRelease.version} Available
                </p>
                <p className="text-sm text-dark-text-muted line-clamp-1">
                  {windowsRelease.releaseNotes?.split('\n')[0] || 'New version available for download'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={windowsRelease.downloadUrl}
                download
                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Download
              </a>
              <button
                onClick={() => {
                  localStorage.setItem('seen_windows_version', windowsRelease.version)
                  setWindowsAnnouncementDismissed(true)
                }}
                className="p-2 text-dark-text-muted hover:text-dark-text transition-colors"
                title="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {macUpdateAvailable && !macAnnouncementDismissed && (
        <div className="glass-card rounded-xl p-4 border border-gray-500/50 bg-gray-500/10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-500/20 text-gray-300">
                {getPlatformIcon('desktop_macos')}
              </div>
              <div>
                <p className="font-medium text-gray-300">
                  🎉 macOS Desktop v{macosRelease.version} Available
                </p>
                <p className="text-sm text-dark-text-muted line-clamp-1">
                  {macosRelease.releaseNotes?.split('\n')[0] || 'New version available for download'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <a
                href={macosRelease.downloadUrl}
                download
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Download
              </a>
              <button
                onClick={() => {
                  localStorage.setItem('seen_mac_version', macosRelease.version)
                  setMacAnnouncementDismissed(true)
                }}
                className="p-2 text-dark-text-muted hover:text-dark-text transition-colors"
                title="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

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
                        {isOnline ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1 animate-pulse" />
                            Online
                          </span>
                        ) : recentActivity ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-500/20 text-gray-400">
                            Offline
                          </span>
                        ) : null}
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
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPro ? 'bg-primary/20' : 'bg-dark-card-hover'}`}>
            {isPro ? (
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
          <div>
            {isPro ? (
              <>
                <h4 className="font-medium text-dark-text mb-1">Unlimited Devices</h4>
                <p className="text-sm text-dark-text-muted">
                  Your MineGlance Pro license works on unlimited browser extensions and desktop apps. Install on Chrome, Edge,
                  Brave, Opera, Windows, or macOS - all your data syncs automatically via the cloud.
                </p>
              </>
            ) : (
              <>
                <h4 className="font-medium text-dark-text mb-1">Free Plan</h4>
                <p className="text-sm text-dark-text-muted">
                  You can use MineGlance on multiple devices with the free plan. Your wallets sync across all your browser extensions and desktop apps automatically.
                </p>
                <a
                  href="https://mineglance.com/#pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  Upgrade to Pro for unlimited wallets & email alerts
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
