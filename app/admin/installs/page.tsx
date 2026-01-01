'use client'

import { useState, useEffect, useCallback } from 'react'

interface Installation {
  id: string
  instance_id: string
  license_key?: string
  browser?: string
  os?: string
  extension_version?: string
  first_seen: string
  last_seen: string
  isPro?: boolean
  isOrphan?: boolean
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
  installs: number
  active: number
}

export default function InstallsPage() {
  const [installations, setInstallations] = useState<Installation[]>([])
  const [summary, setSummary] = useState<InstallSummary | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [period, setPeriod] = useState('30')
  const [isPro, setIsPro] = useState<string>('all')

  const fetchInstalls = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        period
      })

      if (isPro !== 'all') {
        params.set('isPro', isPro)
      }

      const response = await fetch(`/api/admin/installs?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      setInstallations(data.installations || [])
      setSummary(data.summary)
      setChartData(data.chartData || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to fetch installations:', error)
    } finally {
      setLoading(false)
    }
  }, [page, period, isPro])

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

  const maxInstalls = Math.max(...chartData.map(d => d.installs), 1)

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Installations</h1>
          <p className="text-gray-600">Track extension installations and activity</p>
        </div>
        <div className="flex gap-3">
          <select
            value={isPro}
            onChange={(e) => { setIsPro(e.target.value); setPage(1) }}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Users</option>
            <option value="true">Pro Users</option>
            <option value="false">Free Users</option>
          </select>
          <select
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setPage(1) }}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Total Installs</span>
            <span className="text-blue-600 text-xl">📦</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary?.total || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Pro Users</span>
            <span className="text-purple-600 text-xl">⭐</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary?.proUsers || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Free Users</span>
            <span className="text-gray-500 text-xl">👤</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary?.freeUsers || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Active (7d)</span>
            <span className="text-green-600 text-xl">✓</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary?.activeUsers || 0}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Conversion</span>
            <span className="text-amber-600 text-xl">📈</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary?.conversionRate || 0}%</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily New Installs</h3>
        <div className="h-32">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              No data available
            </div>
          ) : (
            <div className="flex items-end h-full gap-1">
              {chartData.map((item, index) => (
                <div
                  key={index}
                  className="flex-1 group relative"
                  title={`${item.date}: ${item.installs} new installs, ${item.active} active`}
                >
                  <div
                    className="bg-blue-500 hover:bg-blue-600 rounded-t transition-colors"
                    style={{
                      height: `${Math.max((item.installs / maxInstalls) * 100, 2)}%`,
                      minHeight: item.installs > 0 ? '8px' : '2px'
                    }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      <br />
                      New: {item.installs} | Active: {item.active}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{chartData[0]?.date ? new Date(chartData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          <span>{chartData[chartData.length - 1]?.date ? new Date(chartData[chartData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-gray-600">
        Showing {installations.length} of {total} installations
      </div>

      {/* Installations Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading installations...</p>
          </div>
        ) : installations.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No installations found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Instance ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">License</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Browser</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Seen</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Active</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {installations.map((install) => (
                <tr key={install.id} className={`hover:bg-gray-50 ${install.isOrphan ? 'bg-amber-50' : ''}`}>
                  <td className="px-4 py-3">
                    <code
                      className="text-sm bg-gray-100 px-2 py-1 rounded cursor-pointer hover:bg-gray-200"
                      title={install.instance_id}
                      onClick={() => {
                        navigator.clipboard.writeText(install.instance_id)
                        alert('Copied: ' + install.instance_id)
                      }}
                    >
                      {install.instance_id.substring(0, 12)}...
                    </code>
                    {install.isOrphan && (
                      <span className="ml-2 px-1.5 py-0.5 text-xs font-medium rounded bg-amber-200 text-amber-800" title="Orphan: License activation without matching extension install">
                        ⚠️
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isActive(install.last_seen) ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {install.license_key ? (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
                        Pro
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                        Free
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{install.browser || '-'}</td>
                  <td className="px-4 py-3 text-gray-600">{install.extension_version || '-'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatDate(install.first_seen)}</td>
                  <td className="px-4 py-3">
                    <span className={isActive(install.last_seen) ? 'text-green-600' : 'text-gray-500'}>
                      {getTimeSince(install.last_seen)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t flex items-center justify-between">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
