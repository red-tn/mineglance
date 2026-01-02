'use client'

import { useState, useEffect, useCallback } from 'react'

interface Alert {
  id: string
  email: string
  alert_type: string
  subject: string
  wallet_name?: string
  worker_id?: string
  coin?: string
  sendgrid_message_id?: string
  sendgrid_status?: string
  sendgrid_response?: string
  created_at: string
  metadata?: Record<string, unknown>
}

interface AlertSummary {
  total: number
  last24h: number
  byType: Record<string, number>
  last24hByType: Record<string, number>
}

interface ChartData {
  label: string
  count: number
}

const alertTypeLabels: Record<string, string> = {
  worker_offline: 'Worker Offline',
  worker_back_online: 'Worker Online',
  profit_drop: 'Profit Drop',
  profit_recovery: 'Profit Recovery',
  better_coin: 'Better Coin Found',
  test: 'Test Alert'
}

const alertTypeColors: Record<string, string> = {
  worker_offline: 'bg-red-100 text-red-800',
  worker_back_online: 'bg-green-100 text-green-800',
  profit_drop: 'bg-amber-100 text-amber-800',
  profit_recovery: 'bg-emerald-100 text-emerald-800',
  better_coin: 'bg-blue-100 text-blue-800',
  test: 'bg-gray-100 text-gray-800'
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<AlertSummary | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [alertType, setAlertType] = useState('all')
  const [period, setPeriod] = useState('7')

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        type: alertType,
        period
      })

      const response = await fetch(`/api/admin/alerts?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      setAlerts(data.alerts || [])
      setSummary(data.summary)
      setChartData(data.chartData || [])
      setTotalPages(data.totalPages || 1)
    } catch (error) {
      console.error('Failed to fetch alerts:', error)
    } finally {
      setLoading(false)
    }
  }, [page, alertType, period])

  useEffect(() => {
    fetchAlerts()
  }, [fetchAlerts])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const maxCount = Math.max(...chartData.map(d => d.count), 1)

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Alerts</h1>
          <p className="text-gray-600">Monitor alert notifications sent to users</p>
        </div>
        <div className="flex gap-3">
          <select
            value={alertType}
            onChange={(e) => { setAlertType(e.target.value); setPage(1) }}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="worker_offline">Worker Offline</option>
            <option value="worker_back_online">Worker Online</option>
            <option value="profit_drop">Profit Drop</option>
            <option value="profit_recovery">Profit Recovery</option>
            <option value="better_coin">Better Coin</option>
            <option value="test">Test Alerts</option>
          </select>
          <select
            value={period}
            onChange={(e) => { setPeriod(e.target.value); setPage(1) }}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="1">Last 24 hours</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Total Alerts</span>
            <span className="text-blue-600 text-xl">📧</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary?.total || 0}</p>
          <p className="text-sm text-gray-500 mt-1">In selected period</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Last 24 Hours</span>
            <span className="text-green-600 text-xl">⏰</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary?.last24h || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Recent activity</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Worker Alerts</span>
            <span className="text-red-500 text-xl">⚠️</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {(summary?.byType?.worker_offline || 0) + (summary?.byType?.worker_back_online || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Offline + Online alerts</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Profit Alerts</span>
            <span className="text-amber-500 text-xl">📊</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">
            {(summary?.byType?.profit_drop || 0) + (summary?.byType?.better_coin || 0)}
          </p>
          <p className="text-sm text-gray-500 mt-1">Profit + coin alerts</p>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Alert Volume</h3>
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
                  title={`${item.label}: ${item.count} alerts`}
                >
                  <div
                    className="bg-blue-500 hover:bg-blue-600 rounded-t transition-colors"
                    style={{
                      height: `${Math.max((item.count / maxCount) * 100, 2)}%`,
                      minHeight: item.count > 0 ? '8px' : '2px'
                    }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                    <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                      {item.label}: {item.count}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          <span>{chartData[0]?.label || ''}</span>
          <span>{chartData[chartData.length - 1]?.label || ''}</span>
        </div>
      </div>

      {/* Alerts by Type */}
      {summary && Object.keys(summary.byType).length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Alert Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(summary.byType).map(([type, count]) => (
              <div key={type} className="text-center">
                <span className={`inline-block px-3 py-1 text-sm font-medium rounded-full ${alertTypeColors[type] || 'bg-gray-100 text-gray-800'}`}>
                  {alertTypeLabels[type] || type}
                </span>
                <p className="text-2xl font-bold text-gray-900 mt-2">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alerts Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Alerts</h3>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-500">Loading alerts...</p>
          </div>
        ) : alerts.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No alerts found for the selected period
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent At</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Message ID</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipient</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Response</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-gray-500 whitespace-nowrap text-sm">
                    {formatDate(alert.created_at)}
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-xs text-gray-600 truncate max-w-[150px] inline-block" title={alert.sendgrid_message_id || 'N/A'}>
                      {alert.sendgrid_message_id ? alert.sendgrid_message_id.substring(0, 20) + '...' : '-'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-gray-900 text-sm">{alert.email}</td>
                  <td className="px-4 py-4 text-gray-600 text-sm max-w-xs truncate" title={alert.subject || ''}>
                    {alert.subject || alert.wallet_name || '-'}
                  </td>
                  <td className="px-4 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      alert.sendgrid_status === 'accepted' || alert.sendgrid_status === 'delivered'
                        ? 'bg-green-100 text-green-800'
                        : alert.sendgrid_status === 'failed'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {alert.sendgrid_status || 'unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-500 max-w-[200px] truncate" title={alert.sendgrid_response || ''}>
                    {alert.sendgrid_response || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-3 border-t flex items-center justify-between">
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
