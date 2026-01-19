'use client'

import { useState, useEffect, useCallback } from 'react'

interface Installation {
  id: string
  instance_id: string
  user_id?: string
  email?: string
  license_key?: string
  device_type: string
  device_name?: string
  browser?: string
  version?: string
  first_seen: string
  last_seen: string
  created_at?: string
  isPro?: boolean
  plan?: string
}

interface PlatformStat {
  total: number
  pro: number
  free: number
  active: number
}

interface PlatformStats {
  total: number
  extension: PlatformStat
  ios: PlatformStat
  android: PlatformStat
  desktop_windows: PlatformStat
  desktop_macos: PlatformStat
}

interface InstallSummary {
  total: number
  proUsers: number
  freeUsers: number
  activeUsers: number
  conversionRate: string
}

interface ChartData {
  date: string
  extension: number
  ios: number
  android: number
  desktop_windows: number
  desktop_macos: number
  total: number
}

export default function InstallsPage() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [summary, setSummary] = useState<InstallSummary | null>(null)
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [purging, setPurging] = useState(false)
  const [purgeResult, setPurgeResult] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewingInstall, setViewingInstall] = useState<Installation | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [period, setPeriod] = useState('30')
  const [isPro, setIsPro] = useState<string>('all')
  const [platform, setPlatform] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('last_seen')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')

  const fetchInstalls = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        period,
        sortBy,
        sortOrder
      })

      if (isPro !== 'all') params.set('isPro', isPro)
      if (platform !== 'all') params.set('platform', platform)
      if (search) params.set('search', search)

      const response = await fetch(`/api/admin/installs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      setInstallations(data.installations || [])
      setSummary(data.summary)
      setPlatformStats(data.platformStats)
      setChartData(data.chartData || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to fetch installations:', error)
    } finally {
      setLoading(false)
    }
  }, [page, period, isPro, platform, search, sortBy, sortOrder])

  useEffect(() => {
    fetchInstalls()
  }, [fetchInstalls])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTimeSince = (dateStr: string) => {
    const now = new Date()
    const date = new Date(dateStr)
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    return `${diffDays}d ago`
  }

  const isActive = (lastSeen: string) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    return new Date(lastSeen) >= sevenDaysAgo
  }

  const getPlatformIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile_ios': return '📱'
      case 'mobile_android': return '🤖'
      case 'extension': return '🧩'
      case 'desktop_windows': return '🖥️'
      case 'desktop_macos': return '🍎'
      default: return '❓'
    }
  }

  const getPlatformLabel = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile_ios': return 'iOS'
      case 'mobile_android': return 'Android'
      case 'extension': return 'Extension'
      case 'desktop_windows': return 'Windows'
      case 'desktop_macos': return 'macOS'
      default: return 'Unknown'
    }
  }

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const maxInstalls = Math.max(...chartData.map(d => d.total), 1)

  const handleDeleteInstance = async (install: Installation) => {
    if (!confirm(`Delete this installation?\n\nInstance: ${install.instance_id?.substring(0, 16)}...\nEmail: ${install.email || 'Anonymous'}\nPlatform: ${getPlatformLabel(install.device_type)}\n\nThis will remove the instance and clean up related data.`)) {
      return
    }

    setDeletingId(install.id)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/installs?id=${install.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok) {
        setPurgeResult(`Deleted: ${data.message}`)
        fetchInstalls()
      } else {
        setPurgeResult(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Delete error:', error)
      setPurgeResult('Error: Failed to delete installation')
    } finally {
      setDeletingId(null)
      setTimeout(() => setPurgeResult(null), 5000)
    }
  }

  const handlePurgeStale = async () => {
    if (!confirm('Are you sure you want to purge all stale installations?\n\nThis will delete all installations from FREE users that have been inactive for more than 120 days.\n\nThis action cannot be undone.')) {
      return
    }

    setPurging(true)
    setPurgeResult(null)

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/installs', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()

      if (response.ok) {
        setPurgeResult(`Success: ${data.message}`)
        fetchInstalls() // Refresh the list
      } else {
        setPurgeResult(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error('Purge error:', error)
      setPurgeResult('Error: Failed to purge stale installations')
    } finally {
      setPurging(false)
      // Clear result after 5 seconds
      setTimeout(() => setPurgeResult(null), 5000)
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Installations</h1>
          <p className="text-dark-text-muted">Track extension and app installations across platforms</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search instance/email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="px-4 py-2 bg-dark-card border border-dark-border text-dark-text rounded-lg focus:ring-2 focus:ring-primary w-48"
          />
          <select
            value={platform}
            onChange={(e) => { setPlatform(e.target.value); setPage(1) }}
            className="px-4 py-2 bg-dark-card border border-dark-border text-dark-text rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Platforms</option>
            <option value="extension">Extension</option>
            <option value="desktop_windows">Windows Desktop</option>
            <option value="desktop_macos">macOS Desktop</option>
          </select>
          <select
            value={isPro}
            onChange={(e) => { setIsPro(e.target.value); setPage(1) }}
            className="px-4 py-2 bg-dark-card border border-dark-border text-dark-text rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Users</option>
            <option value="true">Pro Users</option>
            <option value="false">Free Users</option>
          </select>
          <select
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setPage(1) }}
            className="px-4 py-2 bg-dark-card border border-dark-border text-dark-text rounded-lg focus:ring-2 focus:ring-primary"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button
            onClick={handlePurgeStale}
            disabled={purging}
            className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {purging ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Purging...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Purge Stale (120d+)
              </>
            )}
          </button>
        </div>
        {purgeResult && (
          <div className={`mt-2 px-4 py-2 rounded-lg text-sm ${
            purgeResult.startsWith('Success')
              ? 'bg-primary/20 text-primary border border-primary/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {purgeResult}
          </div>
        )}
      </div>

      {/* Platform Cards - Top Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="glass-card rounded-xl border border-dark-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-text-muted text-sm">Total</span>
            <span className="text-blue-400 text-xl">📦</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{platformStats?.total || 0}</p>
        </div>

        <div className="glass-card rounded-xl border border-dark-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-text-muted text-sm">Extension</span>
            <span className="text-purple-400 text-xl">🧩</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{platformStats?.extension.total || 0}</p>
          <p className="text-xs text-dark-text-dim mt-1">
            {platformStats?.extension.active || 0} active
          </p>
        </div>

        <div className="glass-card rounded-xl border border-dark-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-text-muted text-sm">Windows</span>
            <span className="text-sky-400 text-xl">🖥️</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{platformStats?.desktop_windows?.total || 0}</p>
          <p className="text-xs text-dark-text-dim mt-1">
            {platformStats?.desktop_windows?.active || 0} active
          </p>
        </div>

        <div className="glass-card rounded-xl border border-dark-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-text-muted text-sm">macOS</span>
            <span className="text-gray-400 text-xl">🍎</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{platformStats?.desktop_macos?.total || 0}</p>
          <p className="text-xs text-dark-text-dim mt-1">
            {platformStats?.desktop_macos?.active || 0} active
          </p>
        </div>
      </div>

      {/* Stats Cards - Second Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="glass-card rounded-xl border border-dark-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-text-muted text-sm">Pro Users</span>
            <span className="text-primary text-xl">⭐</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{summary?.proUsers || 0}</p>
        </div>

        <div className="glass-card rounded-xl border border-dark-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-text-muted text-sm">Free Users</span>
            <span className="text-dark-text-muted text-xl">👤</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{summary?.freeUsers || 0}</p>
        </div>

        <div className="glass-card rounded-xl border border-dark-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-text-muted text-sm">Active (7d)</span>
            <span className="text-primary text-xl">✓</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{summary?.activeUsers || 0}</p>
        </div>

        <div className="glass-card rounded-xl border border-dark-border p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-text-muted text-sm">Conversion</span>
            <span className="text-amber-400 text-xl">📈</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{summary?.conversionRate || 0}%</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Extension Chart */}
        <div className="glass-card rounded-xl border border-dark-border p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center gap-2">
            <span>🧩</span> Extension Installs
          </h3>
          <div className="h-24">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-dark-text-dim">No data</div>
            ) : (
              <div className="flex items-end h-full gap-0.5">
                {chartData.map((item, index) => {
                  const maxExt = Math.max(...chartData.map(d => d.extension), 1)
                  return (
                    <div
                      key={index}
                      className="flex-1 group relative"
                      title={`${item.date}: ${item.extension}`}
                    >
                      <div
                        className="bg-purple-500/50 hover:bg-purple-500 rounded-t transition-colors"
                        style={{
                          height: `${Math.max((item.extension / maxExt) * 100, 2)}%`,
                          minHeight: item.extension > 0 ? '4px' : '2px'
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Windows Chart */}
        <div className="glass-card rounded-xl border border-dark-border p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center gap-2">
            <span>🖥️</span> Windows Installs
          </h3>
          <div className="h-24">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-dark-text-dim">No data</div>
            ) : (
              <div className="flex items-end h-full gap-0.5">
                {chartData.map((item, index) => {
                  const maxWin = Math.max(...chartData.map(d => d.desktop_windows), 1)
                  return (
                    <div
                      key={index}
                      className="flex-1 group relative"
                      title={`${item.date}: ${item.desktop_windows}`}
                    >
                      <div
                        className="bg-sky-500/50 hover:bg-sky-500 rounded-t transition-colors"
                        style={{
                          height: `${Math.max((item.desktop_windows / maxWin) * 100, 2)}%`,
                          minHeight: item.desktop_windows > 0 ? '4px' : '2px'
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* macOS Chart */}
        <div className="glass-card rounded-xl border border-dark-border p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center gap-2">
            <span>🍎</span> macOS Installs
          </h3>
          <div className="h-24">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-dark-text-dim">No data</div>
            ) : (
              <div className="flex items-end h-full gap-0.5">
                {chartData.map((item, index) => {
                  const maxMac = Math.max(...chartData.map(d => d.desktop_macos), 1)
                  return (
                    <div
                      key={index}
                      className="flex-1 group relative"
                      title={`${item.date}: ${item.desktop_macos}`}
                    >
                      <div
                        className="bg-gray-500/50 hover:bg-gray-400 rounded-t transition-colors"
                        style={{
                          height: `${Math.max((item.desktop_macos / maxMac) * 100, 2)}%`,
                          minHeight: item.desktop_macos > 0 ? '4px' : '2px'
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-dark-text-muted">
        Showing {installations.length} of {total} installations
      </div>

      {/* Installations Table */}
      <div className="glass-card rounded-xl border border-dark-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-dark-text-muted">Loading installations...</p>
          </div>
        ) : installations.length === 0 ? (
          <div className="p-12 text-center text-dark-text-muted">
            No installations found
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-card-hover border-b border-dark-border">
                <tr>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase cursor-pointer hover:text-dark-text"
                    onClick={() => handleSort('instance_id')}
                  >
                    Instance ID {sortBy === 'instance_id' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase cursor-pointer hover:text-dark-text"
                    onClick={() => handleSort('device_type')}
                  >
                    Platform {sortBy === 'device_type' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase cursor-pointer hover:text-dark-text"
                    onClick={() => handleSort('email')}
                  >
                    User {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Plan</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Version</th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase cursor-pointer hover:text-dark-text"
                    onClick={() => handleSort('created_at')}
                  >
                    First Seen {sortBy === 'created_at' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase cursor-pointer hover:text-dark-text"
                    onClick={() => handleSort('last_seen')}
                  >
                    Last Active {sortBy === 'last_seen' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {installations.map((install) => (
                  <tr key={install.id} className="hover:bg-dark-card-hover">
                    <td className="px-4 py-3">
                      <code
                        className="text-sm bg-dark-bg text-dark-text px-2 py-1 rounded cursor-pointer hover:bg-dark-card-hover"
                        title={install.instance_id || 'N/A'}
                        onClick={() => {
                          if (install.instance_id) {
                            navigator.clipboard.writeText(install.instance_id)
                          }
                        }}
                      >
                        {install.instance_id ? `${install.instance_id.substring(0, 16)}...` : 'N/A'}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span>{getPlatformIcon(install.device_type)}</span>
                        <span className="text-dark-text">{getPlatformLabel(install.device_type)}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {install.email ? (
                        <span className="text-dark-text">{install.email}</span>
                      ) : (
                        <span className="text-dark-text-dim italic">Anonymous</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {isActive(install.last_seen) ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-dark-card-hover text-dark-text-muted">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {install.isPro ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary">
                          Pro
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-dark-card-hover text-dark-text-muted">
                          Free
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-dark-text-muted">{install.version || '-'}</td>
                    <td className="px-4 py-3 text-sm text-dark-text-dim">{formatDate(install.first_seen)}</td>
                    <td className="px-4 py-3">
                      <span className={isActive(install.last_seen) ? 'text-primary' : 'text-dark-text-dim'}>
                        {getTimeSince(install.last_seen)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setViewingInstall(install)}
                          className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                          title="View installation details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteInstance(install)}
                          disabled={deletingId === install.id}
                          className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete this installation"
                        >
                          {deletingId === install.id ? (
                            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-dark-border flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-dark-border text-dark-text rounded hover:bg-dark-card-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-dark-text-muted">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-dark-border text-dark-text rounded hover:bg-dark-card-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Installation Details Modal */}
      {viewingInstall && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl border border-dark-border max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-dark-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-dark-text">Installation Details</h2>
              <button
                onClick={() => setViewingInstall(null)}
                className="p-2 hover:bg-dark-card-hover rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Status & Plan Row */}
              <div className="flex items-center gap-4 mb-6">
                {isActive(viewingInstall.last_seen) ? (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-primary/20 text-primary">
                    Active
                  </span>
                ) : (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-dark-card-hover text-dark-text-muted">
                    Inactive
                  </span>
                )}
                {viewingInstall.isPro ? (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-primary/20 text-primary">
                    Pro
                  </span>
                ) : (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-dark-card-hover text-dark-text-muted">
                    Free
                  </span>
                )}
              </div>

              {/* Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">Instance ID</label>
                  <div className="flex items-center gap-2">
                    <code className="text-sm bg-dark-bg text-dark-text px-2 py-1 rounded break-all flex-1">
                      {viewingInstall.instance_id || 'N/A'}
                    </code>
                    {viewingInstall.instance_id && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(viewingInstall.instance_id)
                        }}
                        className="p-1.5 text-dark-text-muted hover:text-dark-text hover:bg-dark-card-hover rounded transition-colors flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">User ID</label>
                  {viewingInstall.user_id ? (
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-dark-bg text-dark-text px-2 py-1 rounded break-all flex-1">
                        {viewingInstall.user_id}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(viewingInstall.user_id || '')
                        }}
                        className="p-1.5 text-dark-text-muted hover:text-dark-text hover:bg-dark-card-hover rounded transition-colors flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <p className="text-dark-text-dim">None (Anonymous)</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">Email</label>
                  <p className="text-dark-text">{viewingInstall.email || 'Anonymous'}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">License Key</label>
                  {viewingInstall.license_key ? (
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-dark-bg text-dark-text px-2 py-1 rounded flex-1">
                        {viewingInstall.license_key}
                      </code>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(viewingInstall.license_key || '')
                        }}
                        className="p-1.5 text-dark-text-muted hover:text-dark-text hover:bg-dark-card-hover rounded transition-colors flex-shrink-0"
                        title="Copy to clipboard"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <p className="text-dark-text-dim">None</p>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">Platform</label>
                  <p className="text-dark-text flex items-center gap-2">
                    <span>{getPlatformIcon(viewingInstall.device_type)}</span>
                    {getPlatformLabel(viewingInstall.device_type)}
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">Device Name</label>
                  <p className="text-dark-text">{viewingInstall.device_name || 'Unknown'}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">Browser</label>
                  <p className="text-dark-text">{viewingInstall.browser || 'N/A'}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">Version</label>
                  <p className="text-dark-text">{viewingInstall.version || 'Unknown'}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">First Seen</label>
                  <p className="text-dark-text">{formatDate(viewingInstall.first_seen)}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">Last Active</label>
                  <p className="text-dark-text">
                    {formatDate(viewingInstall.last_seen)}
                    <span className={`ml-2 text-sm ${isActive(viewingInstall.last_seen) ? 'text-primary' : 'text-dark-text-dim'}`}>
                      ({getTimeSince(viewingInstall.last_seen)})
                    </span>
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-dark-border flex justify-end gap-3">
                <button
                  onClick={() => setViewingInstall(null)}
                  className="px-4 py-2 text-dark-text-muted hover:text-dark-text transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    handleDeleteInstance(viewingInstall)
                    setViewingInstall(null)
                  }}
                  className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                >
                  Delete Installation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
