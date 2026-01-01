'use client'

import { useState, useEffect } from 'react'

interface RevenueSummary {
  totalRevenue: number
  periodRevenue: number
  totalSales: number
  periodSales: number
  avgOrderValue: number
  dailyAvgRevenue: number
}

interface ByPlan {
  pro: { count: number; revenue: number }
  bundle: { count: number; revenue: number }
}

interface ChartData {
  date: string
  revenue: number
  sales: number
}

interface Transaction {
  id: string
  email: string
  plan: string
  amount: number
  date: string
  stripePaymentId?: string
}

export default function RevenuePage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null)
  const [byPlan, setByPlan] = useState<ByPlan | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')

  useEffect(() => {
    async function fetchRevenue() {
      setLoading(true)
      try {
        const token = localStorage.getItem('admin_token')
        const response = await fetch(`/api/admin/revenue?period=${period}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        const data = await response.json()
        setSummary(data.summary)
        setByPlan(data.byPlan)
        setChartData(data.chartData || [])
        setTransactions(data.recentTransactions || [])
      } catch (error) {
        console.error('Failed to fetch revenue:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchRevenue()
  }, [period])

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(cents / 100)
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revenue & Analytics</h1>
          <p className="text-gray-600">Track sales and revenue metrics</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Total Revenue</span>
            <span className="text-green-600 text-2xl">$</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary?.totalRevenue || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">All time</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Period Revenue</span>
            <span className="text-blue-600 text-2xl">$</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary?.periodRevenue || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">Last {period} days</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Total Sales</span>
            <span className="text-purple-600 text-2xl">#</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{summary?.totalSales || 0}</p>
          <p className="text-sm text-gray-500 mt-1">{summary?.periodSales || 0} in period</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-gray-500 text-sm">Avg Order Value</span>
            <span className="text-amber-600 text-2xl">~</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{formatCurrency(summary?.avgOrderValue || 0)}</p>
          <p className="text-sm text-gray-500 mt-1">{formatCurrency(summary?.dailyAvgRevenue || 0)}/day avg</p>
        </div>
      </div>

      {/* Revenue by Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue by Plan</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-blue-700">Pro ($29)</span>
                <span className="text-sm text-gray-600">{byPlan?.pro.count || 0} sales</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${(summary?.totalRevenue || 0) > 0
                      ? ((byPlan?.pro.revenue || 0) / (summary?.totalRevenue || 1)) * 100
                      : 0}%`
                  }}
                />
              </div>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(byPlan?.pro.revenue || 0)}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-purple-700">Bundle ($59)</span>
                <span className="text-sm text-gray-600">{byPlan?.bundle.count || 0} sales</span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-purple-500 rounded-full"
                  style={{
                    width: `${(summary?.totalRevenue || 0) > 0
                      ? ((byPlan?.bundle.revenue || 0) / (summary?.totalRevenue || 1)) * 100
                      : 0}%`
                  }}
                />
              </div>
              <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(byPlan?.bundle.revenue || 0)}</p>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Revenue</h3>
          <div className="h-48">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-400">
                No data available
              </div>
            ) : (
              <div className="flex items-end h-full gap-1">
                {chartData.map((day, index) => (
                  <div
                    key={day.date}
                    className="flex-1 group relative"
                    title={`${day.date}: ${formatCurrency(day.revenue)} (${day.sales} sales)`}
                  >
                    <div
                      className="bg-green-500 hover:bg-green-600 rounded-t transition-colors"
                      style={{
                        height: `${Math.max((day.revenue / maxRevenue) * 100, 2)}%`,
                        minHeight: day.revenue > 0 ? '8px' : '2px'
                      }}
                    />
                    {/* Tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                      <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                        {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        <br />
                        {formatCurrency(day.revenue)} ({day.sales})
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
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
        </div>
        {transactions.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            No transactions yet
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stripe ID</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{tx.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      tx.plan === 'bundle' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {tx.plan === 'bundle' ? 'Bundle' : 'Pro'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-green-600">{formatCurrency(tx.amount)}</td>
                  <td className="px-6 py-4 text-gray-500">{formatDate(tx.date)}</td>
                  <td className="px-6 py-4">
                    {tx.stripePaymentId ? (
                      <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {tx.stripePaymentId.substring(0, 16)}...
                      </code>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
