'use client'

import { useState, useEffect, useCallback } from 'react'

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
  free: { count: number; revenue: number }
}

interface ChartData {
  date: string
  revenue: number
  sales: number
}

interface Transaction {
  id: string
  user_id?: string
  email: string
  plan: string
  amount: number
  date: string
  stripePaymentId?: string
  license_key?: string
  is_refunded?: boolean
  refunded_at?: string
}

export default function RevenuePage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null)
  const [byPlan, setByPlan] = useState<ByPlan | null>(null)
  const [chartData, setChartData] = useState<ChartData[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState('30')
  const [sortBy, setSortBy] = useState('date')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [viewingTx, setViewingTx] = useState<Transaction | null>(null)
  const [refundingId, setRefundingId] = useState<string | null>(null)
  const [actionResult, setActionResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const fetchRevenue = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/revenue?period=${period}&sortBy=${sortBy}&sortOrder=${sortOrder}`, {
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
  }, [period, sortBy, sortOrder])

  useEffect(() => {
    fetchRevenue()
  }, [fetchRevenue])

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('desc')
    }
  }

  const handleRefund = async (tx: Transaction) => {
    if (!confirm(`Are you sure you want to refund this transaction?\n\nCustomer: ${tx.email}\nAmount: ${formatCurrency(tx.amount)}\n\nThis will:\n- Refund the payment via Stripe\n- Set account to FREE\n- Remove license key\n- Deactivate all devices`)) {
      return
    }

    setRefundingId(tx.id)
    setActionResult(null)

    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/revenue/refund', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userId: tx.user_id,
          stripePaymentId: tx.stripePaymentId
        })
      })

      const data = await response.json()

      if (response.ok) {
        setActionResult({ type: 'success', message: `Refund processed: ${data.message}` })
        fetchRevenue()
        setViewingTx(null)
      } else {
        setActionResult({ type: 'error', message: data.error || 'Refund failed' })
      }
    } catch (error) {
      console.error('Refund error:', error)
      setActionResult({ type: 'error', message: 'Failed to process refund' })
    } finally {
      setRefundingId(null)
      setTimeout(() => setActionResult(null), 5000)
    }
  }

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
          <h1 className="text-2xl font-bold text-dark-text">Revenue & Analytics</h1>
          <p className="text-dark-text">Track sales and revenue metrics</p>
        </div>
        <select
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="px-4 py-2 bg-dark-card-hover border border-dark-border text-dark-text rounded-lg focus:ring-2 focus:ring-primary"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="365">Last year</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="glass-card rounded-xl border border-dark-border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-text text-sm">Total Revenue</span>
            <span className="text-green-600 text-2xl">$</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{formatCurrency(summary?.totalRevenue || 0)}</p>
          <p className="text-sm text-dark-text mt-1">All time</p>
        </div>

        <div className="glass-card rounded-xl border border-dark-border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-text text-sm">Period Revenue</span>
            <span className="text-blue-600 text-2xl">$</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{formatCurrency(summary?.periodRevenue || 0)}</p>
          <p className="text-sm text-dark-text mt-1">Last {period} days</p>
        </div>

        <div className="glass-card rounded-xl border border-dark-border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-text text-sm">Total Sales</span>
            <span className="text-purple-600 text-2xl">#</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{summary?.totalSales || 0}</p>
          <p className="text-sm text-dark-text mt-1">{summary?.periodSales || 0} in period</p>
        </div>

        <div className="glass-card rounded-xl border border-dark-border p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-dark-text text-sm">Avg Order Value</span>
            <span className="text-amber-600 text-2xl">~</span>
          </div>
          <p className="text-3xl font-bold text-dark-text">{formatCurrency(summary?.avgOrderValue || 0)}</p>
          <p className="text-sm text-dark-text mt-1">{formatCurrency(summary?.dailyAvgRevenue || 0)}/day avg</p>
        </div>
      </div>

      {/* Revenue by Plan */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="glass-card rounded-xl border border-dark-border p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Revenue by Plan</h3>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-green-400">Pro ($59)</span>
                <span className="text-sm text-dark-text">{byPlan?.pro?.count || 0} sales</span>
              </div>
              <div className="h-3 bg-dark-card-hover rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full"
                  style={{
                    width: `${(summary?.totalRevenue || 0) > 0
                      ? ((byPlan?.pro?.revenue || 0) / (summary?.totalRevenue || 1)) * 100
                      : 0}%`
                  }}
                />
              </div>
              <p className="text-lg font-bold text-dark-text mt-1">{formatCurrency(byPlan?.pro?.revenue || 0)}</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-400">Free</span>
                <span className="text-sm text-dark-text">{byPlan?.free?.count || 0} users</span>
              </div>
              <div className="h-3 bg-dark-card-hover rounded-full overflow-hidden">
                <div
                  className="h-full bg-gray-500 rounded-full"
                  style={{ width: '0%' }}
                />
              </div>
              <p className="text-lg font-bold text-dark-text mt-1">$0.00</p>
            </div>
          </div>
        </div>

        {/* Revenue Chart */}
        <div className="lg:col-span-2 glass-card rounded-xl border border-dark-border p-6">
          <h3 className="text-lg font-semibold text-dark-text mb-4">Daily Revenue</h3>
          <div className="h-48">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-dark-text">
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
                      <div className="bg-dark-card border border-dark-border text-dark-text text-xs rounded px-2 py-1 whitespace-nowrap">
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
          <div className="flex justify-between text-xs text-dark-text mt-2">
            <span>{chartData[0]?.date ? new Date(chartData[0].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
            <span>{chartData[chartData.length - 1]?.date ? new Date(chartData[chartData.length - 1].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}</span>
          </div>
        </div>
      </div>

      {/* Action Result Banner */}
      {actionResult && (
        <div className={`mb-4 px-4 py-3 rounded-lg ${
          actionResult.type === 'success'
            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
            : 'bg-red-500/20 text-red-400 border border-red-500/30'
        }`}>
          {actionResult.message}
        </div>
      )}

      {/* Recent Transactions */}
      <div className="glass-card rounded-xl border border-dark-border overflow-hidden">
        <div className="p-6 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-dark-text">Recent Transactions</h3>
        </div>
        {transactions.length === 0 ? (
          <div className="p-12 text-center text-dark-text">
            No transactions yet
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-card-hover border-b border-dark-border">
                <tr>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase cursor-pointer hover:text-dark-text"
                    onClick={() => handleSort('email')}
                  >
                    Customer {sortBy === 'email' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase cursor-pointer hover:text-dark-text"
                    onClick={() => handleSort('plan')}
                  >
                    Plan {sortBy === 'plan' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase cursor-pointer hover:text-dark-text"
                    onClick={() => handleSort('amount')}
                  >
                    Amount {sortBy === 'amount' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th
                    className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase cursor-pointer hover:text-dark-text"
                    onClick={() => handleSort('date')}
                  >
                    Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-dark-card-hover">
                    <td className="px-6 py-4 font-medium text-dark-text">{tx.email}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        tx.plan === 'free' ? 'bg-gray-700 text-gray-300' : 'bg-green-900 text-green-200'
                      }`}>
                        {tx.plan === 'free' ? 'FREE' : 'PRO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-green-400">{formatCurrency(tx.amount)}</td>
                    <td className="px-6 py-4 text-dark-text">{formatDate(tx.date)}</td>
                    <td className="px-6 py-4">
                      {tx.is_refunded ? (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-900 text-red-200">
                          Refunded
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-900 text-green-200">
                          Paid
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setViewingTx(tx)}
                          className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/20 rounded transition-colors"
                          title="View details"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        {!tx.is_refunded && tx.stripePaymentId && (
                          <button
                            onClick={() => handleRefund(tx)}
                            disabled={refundingId === tx.id}
                            className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors disabled:opacity-50"
                            title="Refund"
                          >
                            {refundingId === tx.id ? (
                              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Details Modal */}
      {viewingTx && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl border border-dark-border max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-dark-border flex items-center justify-between">
              <h2 className="text-xl font-semibold text-dark-text">Transaction Details</h2>
              <button
                onClick={() => setViewingTx(null)}
                className="p-2 hover:bg-dark-card-hover rounded-lg transition-colors"
              >
                <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Status Badge */}
              <div className="flex items-center gap-3">
                {viewingTx.is_refunded ? (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-red-900 text-red-200">
                    Refunded
                  </span>
                ) : (
                  <span className="px-3 py-1 text-sm font-medium rounded-full bg-green-900 text-green-200">
                    Paid
                  </span>
                )}
                <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                  viewingTx.plan === 'free' ? 'bg-gray-700 text-gray-300' : 'bg-primary/20 text-primary'
                }`}>
                  {viewingTx.plan === 'free' ? 'FREE' : 'PRO'}
                </span>
              </div>

              {/* Details Grid */}
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">Transaction ID</label>
                  <p className="text-dark-text font-mono text-sm">{viewingTx.id}</p>
                </div>

                <div>
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">Customer Email</label>
                  <p className="text-dark-text">{viewingTx.email}</p>
                </div>

                <div>
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">User ID</label>
                  <p className="text-dark-text font-mono text-sm">{viewingTx.user_id || 'N/A'}</p>
                </div>

                <div>
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">Amount</label>
                  <p className="text-2xl font-bold text-green-400">{formatCurrency(viewingTx.amount)}</p>
                </div>

                <div>
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">Date</label>
                  <p className="text-dark-text">{formatDate(viewingTx.date)}</p>
                </div>

                <div>
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">Stripe Payment ID</label>
                  {viewingTx.stripePaymentId ? (
                    <div className="flex items-center gap-2">
                      <code className="text-sm bg-dark-bg text-dark-text px-2 py-1 rounded break-all">
                        {viewingTx.stripePaymentId}
                      </code>
                      <button
                        onClick={() => navigator.clipboard.writeText(viewingTx.stripePaymentId || '')}
                        className="p-1.5 text-dark-text-muted hover:text-dark-text hover:bg-dark-card-hover rounded transition-colors"
                        title="Copy"
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

                <div>
                  <label className="text-xs text-dark-text-muted uppercase tracking-wide">License Key</label>
                  {viewingTx.license_key ? (
                    <code className="block text-sm bg-dark-bg text-dark-text px-2 py-1 rounded">
                      {viewingTx.license_key}
                    </code>
                  ) : (
                    <p className="text-dark-text-dim">None</p>
                  )}
                </div>

                {viewingTx.is_refunded && viewingTx.refunded_at && (
                  <div>
                    <label className="text-xs text-dark-text-muted uppercase tracking-wide">Refunded At</label>
                    <p className="text-red-400">{formatDate(viewingTx.refunded_at)}</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-dark-border flex justify-end gap-3">
                <button
                  onClick={() => setViewingTx(null)}
                  className="px-4 py-2 text-dark-text-muted hover:text-dark-text transition-colors"
                >
                  Close
                </button>
                {!viewingTx.is_refunded && viewingTx.stripePaymentId && (
                  <button
                    onClick={() => handleRefund(viewingTx)}
                    disabled={refundingId === viewingTx.id}
                    className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {refundingId === viewingTx.id ? (
                      <>
                        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Processing...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                        </svg>
                        Refund Transaction
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
