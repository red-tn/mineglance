'use client'

import { useEffect, useState } from 'react'

interface DashboardStats {
  totalInstalls: number
  proUsers: number
  freeUsers: number
  revenue30d: number
  activeUsers: number
  alertsSent24h: number
  newInstalls7d: number
}

interface RecentActivity {
  type: string
  identifier: string
  detail: string
  created_at: string
}

interface DailyData {
  date: string
  installs: number
  revenue: number
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])
  const [chartData, setChartData] = useState<DailyData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchDashboardData()
  }, [])

  async function fetchDashboardData() {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/stats', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Failed to fetch stats')

      const data = await res.json()
      setStats(data.stats)
      setRecentActivity(data.recentActivity || [])
      setChartData(data.chartData || [])
    } catch (err) {
      setError('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-3 py-2 rounded-lg text-sm">
        {error}
      </div>
    )
  }

  const statCards = [
    { name: 'Installs', value: stats?.totalInstalls || 0, icon: '📥', color: 'bg-blue-500/20' },
    { name: 'PRO', value: stats?.proUsers || 0, icon: '⭐', color: 'bg-primary/20' },
    { name: 'Free', value: stats?.freeUsers || 0, icon: '👤', color: 'bg-gray-500/20' },
    { name: 'Rev (30d)', value: `$${((stats?.revenue30d || 0) / 100).toFixed(0)}`, icon: '💰', color: 'bg-green-500/20' },
    { name: 'Active (7d)', value: stats?.activeUsers || 0, icon: '👥', color: 'bg-indigo-500/20' },
    { name: 'Alerts (24h)', value: stats?.alertsSent24h || 0, icon: '🔔', color: 'bg-orange-500/20' },
    { name: 'New (7d)', value: stats?.newInstalls7d || 0, icon: '📈', color: 'bg-teal-500/20' },
  ]

  // Calculate chart scales
  const maxInstalls = Math.max(...chartData.map(d => d.installs), 1)
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 100)
  const installScale = getScale(maxInstalls)
  const revenueScale = getScale(maxRevenue / 100).map(v => v * 100)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg sm:text-xl font-bold text-dark-text">Dashboard</h1>
          <p className="text-xs sm:text-sm text-dark-text-muted">Overview</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-3 py-1.5 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors flex items-center gap-1.5 text-sm"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Stats Grid - Compact */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-2 sm:gap-3">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="glass-card rounded-lg p-2.5 sm:p-3 border border-dark-border hover:border-dark-text-dim transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 sm:w-8 sm:h-8 ${stat.color} rounded-lg flex items-center justify-center text-sm sm:text-base flex-shrink-0`}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-dark-text-muted truncate">{stat.name}</p>
                <p className="text-base sm:text-lg font-bold text-dark-text">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* Installs Chart */}
        <div className="glass-card rounded-lg p-3 sm:p-4 border border-dark-border">
          <h3 className="text-sm sm:text-base font-semibold text-dark-text mb-3">Daily Installs (30d)</h3>
          <div className="flex">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between text-[10px] text-dark-text-muted pr-2 h-32 sm:h-40">
              {installScale.slice().reverse().map((val, i) => (
                <span key={i}>{val}</span>
              ))}
            </div>
            {/* Chart */}
            <div className="flex-1 flex flex-col">
              <div className="h-32 sm:h-40 flex items-end gap-px relative border-l border-b border-dark-border">
                {/* Grid lines */}
                {installScale.slice(1).reverse().map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-dark-border/30"
                    style={{ bottom: `${((i + 1) / (installScale.length - 1)) * 100}%` }}
                  />
                ))}
                {chartData.length > 0 ? (
                  chartData.slice(-30).map((day, i) => {
                    const scaleMax = installScale[installScale.length - 1]
                    const height = (day.installs / scaleMax) * 100
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-primary/40 hover:bg-primary/60 rounded-t transition-colors group relative"
                        style={{ height: `${Math.max(height, 1)}%` }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-dark-card text-dark-text text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none border border-dark-border z-10">
                          {day.installs}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex-1 flex items-center justify-center text-dark-text-dim text-sm">
                    No data
                  </div>
                )}
              </div>
              {/* X-axis labels */}
              <div className="flex justify-between text-[9px] text-dark-text-muted pt-1 px-0.5">
                <span>{chartData.length > 0 ? formatDateShort(chartData[0]?.date) : ''}</span>
                <span>{chartData.length > 15 ? formatDateShort(chartData[Math.floor(chartData.length / 2)]?.date) : ''}</span>
                <span>{chartData.length > 0 ? formatDateShort(chartData[chartData.length - 1]?.date) : ''}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="glass-card rounded-lg p-3 sm:p-4 border border-dark-border">
          <h3 className="text-sm sm:text-base font-semibold text-dark-text mb-3">Daily Revenue (30d)</h3>
          <div className="flex">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between text-[10px] text-dark-text-muted pr-2 h-32 sm:h-40">
              {revenueScale.slice().reverse().map((val, i) => (
                <span key={i}>${val / 100}</span>
              ))}
            </div>
            {/* Chart */}
            <div className="flex-1 flex flex-col">
              <div className="h-32 sm:h-40 flex items-end gap-px relative border-l border-b border-dark-border">
                {/* Grid lines */}
                {revenueScale.slice(1).reverse().map((_, i) => (
                  <div
                    key={i}
                    className="absolute left-0 right-0 border-t border-dark-border/30"
                    style={{ bottom: `${((i + 1) / (revenueScale.length - 1)) * 100}%` }}
                  />
                ))}
                {chartData.length > 0 ? (
                  chartData.slice(-30).map((day, i) => {
                    const scaleMax = revenueScale[revenueScale.length - 1]
                    const height = (day.revenue / scaleMax) * 100
                    return (
                      <div
                        key={i}
                        className="flex-1 bg-green-500/40 hover:bg-green-500/60 rounded-t transition-colors group relative"
                        style={{ height: `${Math.max(height, 1)}%` }}
                      >
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-dark-card text-dark-text text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none border border-dark-border z-10">
                          ${(day.revenue / 100).toFixed(0)}
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="flex-1 flex items-center justify-center text-dark-text-dim text-sm">
                    No data
                  </div>
                )}
              </div>
              {/* X-axis labels */}
              <div className="flex justify-between text-[9px] text-dark-text-muted pt-1 px-0.5">
                <span>{chartData.length > 0 ? formatDateShort(chartData[0]?.date) : ''}</span>
                <span>{chartData.length > 15 ? formatDateShort(chartData[Math.floor(chartData.length / 2)]?.date) : ''}</span>
                <span>{chartData.length > 0 ? formatDateShort(chartData[chartData.length - 1]?.date) : ''}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="glass-card rounded-lg p-3 sm:p-4 border border-dark-border">
        <h3 className="text-sm sm:text-base font-semibold text-dark-text mb-3">Recent Activity</h3>
        <div className="space-y-2">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, i) => (
              <div key={i} className="flex items-center gap-2 sm:gap-3 p-2 bg-dark-card-hover rounded-lg">
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm ${
                  activity.type === 'license_activated' ? 'bg-green-500/20' :
                  activity.type === 'alert_sent' ? 'bg-orange-500/20' :
                  'bg-blue-500/20'
                }`}>
                  {activity.type === 'license_activated' ? '🔑' :
                   activity.type === 'alert_sent' ? '🔔' :
                   activity.type === 'purchase' ? '💰' : '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-dark-text">
                    {activity.type === 'license_activated' ? 'License Activated' :
                     activity.type === 'alert_sent' ? `Alert: ${activity.identifier}` :
                     activity.type === 'purchase' ? 'Purchase' :
                     activity.type}
                  </p>
                  <p className="text-[10px] sm:text-xs text-dark-text-muted truncate">{activity.detail}</p>
                </div>
                <div className="text-[10px] sm:text-xs text-dark-text-dim whitespace-nowrap">
                  {formatTimeAgo(activity.created_at)}
                </div>
              </div>
            ))
          ) : (
            <p className="text-dark-text-dim text-center py-4 text-sm">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  )
}

// Get nice scale values for charts
function getScale(max: number): number[] {
  if (max <= 0) return [0, 1, 2, 3, 4, 5]

  // Find a nice round number for the max
  const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
  let niceMax = Math.ceil(max / magnitude) * magnitude

  // Ensure we have at least 5 steps
  if (niceMax < 5) niceMax = 5

  const step = niceMax / 5
  return [0, step, step * 2, step * 3, step * 4, niceMax].map(v => Math.round(v))
}

// Format date as short string (e.g., "Dec 4")
function formatDateShort(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 7) return `${diffDays}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
