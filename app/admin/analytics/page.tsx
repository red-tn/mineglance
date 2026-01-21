'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface AnalyticsData {
  totalViews: number
  uniqueVisitors: number
  bounceRate: number
  topPages: Array<{ path: string; views: number }>
  trafficSources: Array<{ referrer_domain: string; visits: number }>
  devices: Array<{ device: string; count: number }>
  browsers: Array<{ browser: string; count: number }>
  dailyViews: Array<{ date: string; views: number }>
  period: string
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState('7d')
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchAnalytics = useCallback(async (isInitial = false) => {
    if (isInitial) {
      setInitialLoading(true)
    } else {
      setRefreshing(true)
    }

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/analytics/track?period=${period}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const newData = await res.json()
        setData(newData)
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setInitialLoading(false)
      setRefreshing(false)
    }
  }, [period])

  // Initial fetch and period change
  useEffect(() => {
    fetchAnalytics(true)
  }, [period])

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (autoRefresh) {
      intervalRef.current = setInterval(() => {
        fetchAnalytics(false)
      }, 5000)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [autoRefresh, fetchAnalytics])

  const periods = [
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
    { value: '90d', label: '90 Days' },
  ]

  // Calculate max for chart scaling
  const maxViews = Math.max(...(data?.dailyViews?.map(d => d.views) || [1]), 1)

  // Generate nice Y-axis labels
  function getYAxisLabels(max: number): string[] {
    if (max <= 0) return ['0', '1', '2', '3', '4', '5']
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
    let niceMax = Math.ceil(max / magnitude) * magnitude
    if (niceMax < 5) niceMax = 5
    const step = niceMax / 5
    return [0, step, step * 2, step * 3, step * 4, niceMax].map(v =>
      v >= 1000 ? `${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k` : String(Math.round(v))
    )
  }

  // Generate X-axis labels based on period
  function getXAxisLabels(dailyViews: Array<{ date: string; views: number }>, currentPeriod: string): string[] {
    if (dailyViews.length === 0) return []

    if (currentPeriod === '24h') {
      // Show hourly labels (every 4 hours)
      const labels: string[] = []
      const step = Math.max(1, Math.floor(dailyViews.length / 6))
      for (let i = 0; i < dailyViews.length; i += step) {
        const date = new Date(dailyViews[i].date)
        labels.push(date.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true }))
      }
      // Always include last label
      if (labels.length > 0) {
        const lastDate = new Date(dailyViews[dailyViews.length - 1].date)
        const lastLabel = lastDate.toLocaleTimeString('en-US', { hour: 'numeric', hour12: true })
        if (labels[labels.length - 1] !== lastLabel) {
          labels.push(lastLabel)
        }
      }
      return labels
    } else if (currentPeriod === '7d') {
      // Show daily labels (day names)
      return dailyViews.map(d =>
        new Date(d.date).toLocaleDateString('en-US', { weekday: 'short' })
      )
    } else if (currentPeriod === '30d') {
      // Show weekly labels (every ~5 days)
      const labels: string[] = []
      const step = Math.max(1, Math.floor(dailyViews.length / 6))
      for (let i = 0; i < dailyViews.length; i += step) {
        labels.push(new Date(dailyViews[i].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      }
      return labels
    } else {
      // 90d - Show monthly labels
      const labels: string[] = []
      const step = Math.max(1, Math.floor(dailyViews.length / 6))
      for (let i = 0; i < dailyViews.length; i += step) {
        labels.push(new Date(dailyViews[i].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
      }
      return labels
    }
  }

  // Format tooltip date based on period
  function formatTooltipDate(dateStr: string, currentPeriod: string): string {
    const date = new Date(dateStr)
    if (currentPeriod === '24h') {
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    }
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  // Generate smooth line path for SVG
  function generateLinePath(dailyViews: Array<{ date: string; views: number }>, width: number, height: number): string {
    if (dailyViews.length === 0) return ''

    const max = Math.max(...dailyViews.map(d => d.views), 1)
    const padding = 10 // Small padding so line doesn't touch edges

    const points = dailyViews.map((d, i) => ({
      x: (i / (dailyViews.length - 1 || 1)) * (width - padding * 2) + padding,
      y: (height - padding) - (d.views / max) * (height - padding * 2)
    }))

    if (points.length === 1) {
      return `M ${points[0].x} ${points[0].y}`
    }

    // Create smooth curve using cubic bezier
    let path = `M ${points[0].x} ${points[0].y}`

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]

      const tension = 0.3
      const cp1x = p1.x + (p2.x - p0.x) * tension
      const cp1y = p1.y + (p2.y - p0.y) * tension
      const cp2x = p2.x - (p3.x - p1.x) * tension
      const cp2y = p2.y - (p3.y - p1.y) * tension

      path += ` C ${cp1x},${cp1y} ${cp2x},${cp2y} ${p2.x},${p2.y}`
    }

    return path
  }

  // Generate area path (line path + close to bottom)
  function generateAreaPath(dailyViews: Array<{ date: string; views: number }>, width: number, height: number): string {
    if (dailyViews.length === 0) return ''

    const linePath = generateLinePath(dailyViews, width, height)
    const padding = 10
    const firstX = padding
    const lastX = width - padding

    return `${linePath} L ${lastX},${height} L ${firstX},${height} Z`
  }

  return (
    <div className="space-y-6">
      {/* Header with period selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold text-dark-text">Website Traffic</h2>
          {refreshing && (
            <div className="flex items-center gap-1.5 text-xs text-primary">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              Updating...
            </div>
          )}
          {lastUpdate && !refreshing && (
            <span className="text-xs text-dark-text-dim">
              Updated {lastUpdate.toLocaleTimeString()}
            </span>
          )}
        </div>
        <div className="flex gap-2 items-center">
          {periods.map(p => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-primary text-white'
                  : 'bg-dark-card text-dark-text-muted hover:text-dark-text'
              }`}
            >
              {p.label}
            </button>
          ))}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              autoRefresh
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-dark-card text-dark-text-muted hover:text-dark-text'
            }`}
            title={autoRefresh ? 'Auto-refresh ON (5s)' : 'Auto-refresh OFF'}
          >
            <span className="flex items-center gap-1.5">
              {autoRefresh && <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />}
              Live
            </span>
          </button>
          <button
            onClick={() => fetchAnalytics(false)}
            disabled={refreshing}
            className="p-2 rounded-lg bg-dark-card text-dark-text-muted hover:text-dark-text transition-colors disabled:opacity-50"
            title="Refresh now"
          >
            <svg
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {initialLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : data ? (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <StatCard
              label="Page Views"
              value={data.totalViews.toLocaleString()}
              icon="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
            <StatCard
              label="Unique Visitors"
              value={data.uniqueVisitors.toLocaleString()}
              icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
            <StatCard
              label="Bounce Rate"
              value={`${data.bounceRate}%`}
              icon="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              color={data.bounceRate > 70 ? 'text-red-400' : data.bounceRate > 50 ? 'text-yellow-400' : 'text-green-400'}
            />
            <StatCard
              label="Avg Pages/Session"
              value={data.uniqueVisitors > 0 ? (data.totalViews / data.uniqueVisitors).toFixed(1) : '0'}
              icon="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </div>

          {/* Line Chart */}
          <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
            <h3 className="text-lg font-medium text-dark-text mb-4">Traffic Over Time</h3>
            <div className="flex">
              {/* Y-axis labels */}
              <div className="flex flex-col justify-between text-xs text-dark-text-muted pr-3 py-1" style={{ height: '240px' }}>
                {getYAxisLabels(maxViews).reverse().map((label, i) => (
                  <span key={i} className="text-right w-8">{label}</span>
                ))}
              </div>

              {/* Chart area */}
              <div className="flex-1">
                <div className="relative" style={{ height: '240px' }}>
                  {/* Grid lines */}
                  {getYAxisLabels(maxViews).map((_, i, arr) => (
                    <div
                      key={i}
                      className="absolute left-0 right-0 border-t border-dark-border/40"
                      style={{ top: `${(i / (arr.length - 1)) * 100}%` }}
                    />
                  ))}

                  {/* SVG Line Chart */}
                  <svg
                    className="absolute inset-0 w-full h-full"
                    viewBox="0 0 1000 240"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
                      </linearGradient>
                      <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>

                    {/* Area fill */}
                    <path
                      d={generateAreaPath(data.dailyViews, 1000, 240)}
                      fill="url(#areaGradient)"
                      className="transition-all duration-500"
                    />

                    {/* Line */}
                    <path
                      d={generateLinePath(data.dailyViews, 1000, 240)}
                      fill="none"
                      stroke="url(#lineGradient)"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="transition-all duration-500"
                      vectorEffect="non-scaling-stroke"
                    />
                  </svg>

                  {/* Data points overlay (separate so they scale properly) */}
                  <div className="absolute inset-0">
                    {data.dailyViews.map((day, i) => {
                      const x = (i / (data.dailyViews.length - 1 || 1)) * 100
                      const y = 100 - (day.views / maxViews) * 100
                      return (
                        <div
                          key={i}
                          className="absolute group"
                          style={{
                            left: `${x}%`,
                            top: `${y}%`,
                            transform: 'translate(-50%, -50%)'
                          }}
                        >
                          <div className="w-3 h-3 bg-dark-card border-2 border-primary rounded-full cursor-pointer hover:scale-150 transition-transform" />
                          {/* Tooltip */}
                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-dark-bg text-dark-text text-xs px-2 py-1 rounded border border-dark-border shadow-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                            <div className="font-medium">{day.views.toLocaleString()} views</div>
                            <div className="text-dark-text-muted">{formatTooltipDate(day.date, period)}</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* X-axis labels */}
                <div className="flex justify-between pt-2 text-xs text-dark-text-muted">
                  {getXAxisLabels(data.dailyViews, period).map((label, i) => (
                    <span key={i}>{label}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Summary stats below chart */}
            <div className="flex justify-around mt-4 pt-4 border-t border-dark-border/50">
              <div className="text-center">
                <div className="text-lg font-bold text-dark-text">{data.dailyViews.reduce((sum, d) => sum + d.views, 0).toLocaleString()}</div>
                <div className="text-xs text-dark-text-muted">Total Views</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-dark-text">
                  {data.dailyViews.length > 0 ? Math.round(data.dailyViews.reduce((sum, d) => sum + d.views, 0) / data.dailyViews.length).toLocaleString() : 0}
                </div>
                <div className="text-xs text-dark-text-muted">{period === '24h' ? 'Avg/Hour' : 'Avg/Day'}</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-primary">{Math.max(...data.dailyViews.map(d => d.views)).toLocaleString()}</div>
                <div className="text-xs text-dark-text-muted">{period === '24h' ? 'Peak Hour' : 'Peak Day'}</div>
              </div>
            </div>
          </div>

          {/* Two column layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Pages */}
            <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
              <h3 className="text-lg font-medium text-dark-text mb-4">Top Pages</h3>
              <div className="space-y-3">
                {data.topPages.length === 0 ? (
                  <p className="text-dark-text-muted text-sm">No data yet</p>
                ) : (
                  data.topPages.map((page, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-dark-text text-sm truncate flex-1 mr-4">{page.path}</span>
                      <span className="text-dark-text-muted text-sm">{page.views.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Traffic Sources */}
            <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
              <h3 className="text-lg font-medium text-dark-text mb-4">Traffic Sources</h3>
              <div className="space-y-3">
                {data.trafficSources.length === 0 ? (
                  <p className="text-dark-text-muted text-sm">No referrer data (direct traffic)</p>
                ) : (
                  data.trafficSources.map((source, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-dark-text text-sm truncate flex-1 mr-4">
                        {source.referrer_domain || 'Direct'}
                      </span>
                      <span className="text-dark-text-muted text-sm">{source.visits.toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Devices */}
            <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
              <h3 className="text-lg font-medium text-dark-text mb-4">Devices</h3>
              <div className="space-y-3">
                {data.devices.length === 0 ? (
                  <p className="text-dark-text-muted text-sm">No data yet</p>
                ) : (
                  data.devices.map((device, i) => {
                    const total = data.devices.reduce((sum, d) => sum + d.count, 0)
                    const percentage = Math.round((device.count / total) * 100)
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-dark-text text-sm">{device.device}</span>
                          <span className="text-dark-text-muted text-sm">{percentage}%</span>
                        </div>
                        <div className="w-full bg-dark-border rounded-full h-2">
                          <div
                            className="bg-primary rounded-full h-2 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Browsers */}
            <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
              <h3 className="text-lg font-medium text-dark-text mb-4">Browsers</h3>
              <div className="space-y-3">
                {data.browsers.length === 0 ? (
                  <p className="text-dark-text-muted text-sm">No data yet</p>
                ) : (
                  data.browsers.map((browser, i) => {
                    const total = data.browsers.reduce((sum, b) => sum + b.count, 0)
                    const percentage = Math.round((browser.count / total) * 100)
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-dark-text text-sm">{browser.browser}</span>
                          <span className="text-dark-text-muted text-sm">{percentage}%</span>
                        </div>
                        <div className="w-full bg-dark-border rounded-full h-2">
                          <div
                            className="bg-blue-500 rounded-full h-2 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-12 text-dark-text-muted">
          No analytics data available. Make sure the database tables are set up.
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, icon, color }: { label: string; value: string; icon: string; color?: string }) {
  return (
    <div className="bg-dark-card rounded-xl p-6 border border-dark-border">
      <div className="flex items-center gap-4">
        <div className="p-3 bg-primary/10 rounded-lg">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
          </svg>
        </div>
        <div>
          <p className="text-sm text-dark-text-muted">{label}</p>
          <p className={`text-2xl font-bold ${color || 'text-dark-text'} transition-all`}>{value}</p>
        </div>
      </div>
    </div>
  )
}
