'use client'

import { useState, useEffect, useCallback } from 'react'

interface Installation {
  id: string
  instance_id: string
  email?: string
  license_key?: string
  device_type: string
  device_name?: string
  browser?: string
  version?: string
  first_seen: string
  last_seen: string
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
  total: number
}

export default function InstallsPage() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [summary, setSummary] = useState<InstallSummary | null>(null)
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
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
      default: return '❓'
    }
  }

  const getPlatformLabel = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile_ios': return 'iOS'
      case 'mobile_android': return 'Android'
      case 'extension': return 'Extension'
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

  return (
    <div>
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-text">Installations</h1>
          <p className="text-dark-text-muted">Track extension and app installations across platforms</p>
        </div>
        <div className="flex flex-wrap gap-3">
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
            <option value="mobile_ios">iOS</option>
            <option value="mobile_android">Android</option>
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
        </div>
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
            <span className="text-dark-text-muted text-sm">iOS</span>
            <span className="text-blue-400 text-xl">📱</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{platformStats?.ios.total || 0}</p>
          <p className="text-xs text-dark-text-dim mt-1">
            {platformStats?.ios.active || 0} active
          </p>
        </div>

        <div className="glass-card rounded-xl border border-dark-border p-5 opacity-60">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-text-muted text-sm">Android</span>
            <span className="text-green-400 text-xl">🤖</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{platformStats?.android.total || 0}</p>
          <p className="text-xs text-amber-400 mt-1">Coming Soon</p>
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

        {/* iOS Chart */}
        <div className="glass-card rounded-xl border border-dark-border p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center gap-2">
            <span>📱</span> iOS Installs
          </h3>
          <div className="h-24">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-dark-text-dim">No data</div>
            ) : (
              <div className="flex items-end h-full gap-0.5">
                {chartData.map((item, index) => {
                  const maxIos = Math.max(...chartData.map(d => d.ios), 1)
                  return (
                    <div
                      key={index}
                      className="flex-1 group relative"
                      title={`${item.date}: ${item.ios}`}
                    >
                      <div
                        className="bg-blue-500/50 hover:bg-blue-500 rounded-t transition-colors"
                        style={{
                          height: `${Math.max((item.ios / maxIos) * 100, 2)}%`,
                          minHeight: item.ios > 0 ? '4px' : '2px'
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Android Chart (Placeholder) */}
        <div className="glass-card rounded-xl border border-dark-border p-6 opacity-60">
          <h3 className="text-lg font-semibold text-dark-text mb-4 flex items-center gap-2">
            <span>🤖</span> Android Installs
          </h3>
          <div className="h-24 flex items-center justify-center">
            <span className="text-amber-400 text-sm">Coming Soon</span>
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
    </div>
  )
}
