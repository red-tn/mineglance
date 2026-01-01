'use client'

import { useEffect, useState } from 'react'

interface DashboardStats {
  totalInstalls: number
  proUsers: number
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    )
  }

  const statCards = [
    { name: 'Total Installs', value: stats?.totalInstalls || 0, icon: '📥', color: 'bg-blue-500' },
    { name: 'Pro Users', value: stats?.proUsers || 0, icon: '⭐', color: 'bg-amber-500' },
    { name: 'Revenue (30d)', value: `$${((stats?.revenue30d || 0) / 100).toFixed(0)}`, icon: '💰', color: 'bg-green-500' },
    { name: 'Active Users (7d)', value: stats?.activeUsers || 0, icon: '👥', color: 'bg-purple-500' },
    { name: 'Alerts Sent (24h)', value: stats?.alertsSent24h || 0, icon: '🔔', color: 'bg-orange-500' },
    { name: 'New Installs (7d)', value: stats?.newInstalls7d || 0, icon: '📈', color: 'bg-teal-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Welcome back! Here&apos;s what&apos;s happening.</p>
        </div>
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 ${stat.color} rounded-xl flex items-center justify-center text-2xl`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Installs Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Installs (Last 30 Days)</h3>
          <div className="h-48 flex items-end gap-1">
            {chartData.length > 0 ? (
              chartData.slice(-30).map((day, i) => {
                const maxInstalls = Math.max(...chartData.map(d => d.installs), 1)
                const height = (day.installs / maxInstalls) * 100
                return (
                  <div
                    key={i}
                    className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors group relative"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${day.date}: ${day.installs} installs`}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                      {day.installs}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                No data yet
              </div>
            )}
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue (Last 30 Days)</h3>
          <div className="h-48 flex items-end gap-1">
            {chartData.length > 0 ? (
              chartData.slice(-30).map((day, i) => {
                const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1)
                const height = (day.revenue / maxRevenue) * 100
                return (
                  <div
                    key={i}
                    className="flex-1 bg-green-500/20 hover:bg-green-500/40 rounded-t transition-colors group relative"
                    style={{ height: `${Math.max(height, 2)}%` }}
                    title={`${day.date}: $${(day.revenue / 100).toFixed(0)}`}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                      ${(day.revenue / 100).toFixed(0)}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400">
                No data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, i) => (
              <div key={i} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                  activity.type === 'license_activated' ? 'bg-green-100' :
                  activity.type === 'alert_sent' ? 'bg-orange-100' :
                  'bg-blue-100'
                }`}>
                  {activity.type === 'license_activated' ? '🔑' :
                   activity.type === 'alert_sent' ? '🔔' :
                   activity.type === 'purchase' ? '💰' : '📋'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.type === 'license_activated' ? 'License Activated' :
                     activity.type === 'alert_sent' ? `Alert Sent: ${activity.identifier}` :
                     activity.type === 'purchase' ? 'New Purchase' :
                     activity.type}
                  </p>
                  <p className="text-sm text-gray-500 truncate">{activity.detail}</p>
                </div>
                <div className="text-xs text-gray-400">
                  {formatTimeAgo(activity.created_at)}
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-8">No recent activity</p>
          )}
        </div>
      </div>
    </div>
  )
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString()
}
