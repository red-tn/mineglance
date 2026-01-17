'use client'

import { useState, useEffect, useCallback } from 'react'

interface PaymentHistoryItem {
  id: string
  stripe_payment_id?: string
  stripe_payment_intent?: string
  amount: number
  currency: string
  status: 'succeeded' | 'pending' | 'failed' | 'refunded'
  type: 'subscription' | 'renewal' | 'refund' | 'upgrade'
  description?: string
  created_at: string
}

interface License {
  id: string
  key: string
  email: string
  plan: 'free' | 'pro'
  billingType?: 'monthly' | 'annual' | 'lifetime' | null
  status: 'active' | 'revoked' | 'expired'
  created_at: string
  subscription_start_date?: string
  subscription_end_date?: string
  amount_paid?: number
  stripe_customer_id?: string
  stripe_payment_id?: string
  installCount: number
  walletCount: number
  rigCount: number
  blog_display_name?: string
  profile_photo_url?: string
  full_name?: string
  paymentHistory?: PaymentHistoryItem[]
}

export default function UsersPage() {
  const [users, setUsers] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [planFilter, setPlanFilter] = useState('all')
  const [billingTypeFilter, setBillingTypeFilter] = useState('all')
  const [sortBy, setSortBy] = useState('created_at')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [selectedUser, setSelectedUser] = useState<License | null>(null)
  const [userLoading, setUserLoading] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ userId: string; email: string; plan: string } | null>(null)
  const [deleteTypedEmail, setDeleteTypedEmail] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        status: statusFilter,
        plan: planFilter,
        billingType: billingTypeFilter,
        sortBy,
        sortOrder
      })

      const response = await fetch(`/api/admin/users?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      const data = await response.json()
      setUsers(data.users || [])
      setTotalPages(data.totalPages || 1)
      setTotal(data.total || 0)
    } catch (error) {
      console.error('Failed to fetch users:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search, statusFilter, planFilter, billingTypeFilter, sortBy, sortOrder])

  const fetchUserDetails = useCallback(async (userId: string) => {
    setUserLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch(`/api/admin/users?userId=${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      if (data.user) {
        setSelectedUser(data.user)
      }
    } catch (error) {
      console.error('Failed to fetch user details:', error)
    } finally {
      setUserLoading(false)
    }
  }, [])

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
    setPage(1)
  }

  const SortIcon = ({ column }: { column: string }) => (
    <span className="ml-1 inline-block">
      {sortBy === column ? (
        sortOrder === 'asc' ? '↑' : '↓'
      ) : (
        <span className="text-dark-text-dim">↕</span>
      )}
    </span>
  )

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const handleAction = async (licenseKey: string, action: 'revoke' | 'activate') => {
    if (!confirm(`Are you sure you want to ${action} this license?`)) return

    setActionLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ licenseKey, action })
      })
      fetchUsers()
      setSelectedUser(null)
    } catch (error) {
      console.error('Action failed:', error)
    } finally {
      setActionLoading(false)
    }
  }

  const handleResendLicense = async (email: string) => {
    if (!confirm(`Resend license key email to ${email}?`)) return

    setActionLoading(true)
    try {
      const response = await fetch('/api/resend-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to resend email')
        return
      }

      alert('License key email sent successfully!')
    } catch (error) {
      console.error('Resend failed:', error)
      alert('Failed to resend email')
    } finally {
      setActionLoading(false)
    }
  }

  const openDeleteConfirm = (userId: string, email: string, plan: string) => {
    setDeleteConfirm({ userId, email, plan })
    setDeleteTypedEmail('')
  }

  const handleDeleteUser = async () => {
    if (!deleteConfirm) return

    setActionLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ userId: deleteConfirm.userId })
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Failed to delete user')
        return
      }

      alert('User account and all data deleted successfully')
      fetchUsers()
      setSelectedUser(null)
      setDeleteConfirm(null)
    } catch (error) {
      console.error('Delete failed:', error)
      alert('Failed to delete user')
    } finally {
      setActionLoading(false)
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-900 text-green-200',
      revoked: 'bg-red-900 text-red-200',
      expired: 'bg-gray-700 text-gray-300'
    }
    return colors[status] || 'bg-gray-700 text-gray-300'
  }

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      free: 'bg-gray-700 text-gray-200',
      pro: 'bg-green-700 text-green-200'
    }
    return colors[plan] || 'bg-gray-700 text-gray-200'
  }

  const getBillingTypeBadge = (billingType: string | null | undefined) => {
    const colors: Record<string, string> = {
      monthly: 'bg-yellow-700 text-yellow-200',
      annual: 'bg-blue-700 text-blue-200',
      lifetime: 'bg-purple-700 text-purple-200'
    }
    return colors[billingType || 'annual'] || 'bg-blue-700 text-blue-200'
  }

  const getBillingTypeLabel = (billingType: string | null | undefined) => {
    if (billingType === 'monthly') return 'Monthly'
    if (billingType === 'lifetime') return 'Lifetime'
    return 'Annual'
  }

  const formatAmount = (amount: number) => {
    const dollars = Math.abs(amount) / 100
    const sign = amount < 0 ? '-' : ''
    return `${sign}$${dollars.toFixed(2)}`
  }

  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      succeeded: 'bg-green-900 text-green-200',
      pending: 'bg-yellow-900 text-yellow-200',
      failed: 'bg-red-900 text-red-200',
      refunded: 'bg-purple-900 text-purple-200'
    }
    return colors[status] || 'bg-gray-700 text-gray-200'
  }

  const getPaymentTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      subscription: 'bg-blue-900 text-blue-200',
      renewal: 'bg-cyan-900 text-cyan-200',
      refund: 'bg-purple-900 text-purple-200',
      upgrade: 'bg-green-900 text-green-200'
    }
    return colors[type] || 'bg-gray-700 text-gray-200'
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-dark-text">Users & Licenses</h1>
        <p className="text-dark-text">Manage user licenses and subscriptions</p>
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl border border-dark-border p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Search</label>
            <input
              type="text"
              placeholder="Email or license key..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="revoked">Revoked</option>
              <option value="expired">Expired</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Plan</label>
            <select
              value={planFilter}
              onChange={(e) => { setPlanFilter(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Plans</option>
              <option value="free">Free</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Billing</label>
            <select
              value={billingTypeFilter}
              onChange={(e) => { setBillingTypeFilter(e.target.value); setPage(1) }}
              className="w-full px-3 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Billing</option>
              <option value="monthly">Monthly</option>
              <option value="annual">Annual</option>
              <option value="lifetime">Lifetime</option>
            </select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => { setSearch(''); setStatusFilter('all'); setPlanFilter('all'); setBillingTypeFilter('all'); setPage(1) }}
            className="px-4 py-2 text-dark-text hover:text-primary"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="mb-4 text-sm text-dark-text">
        Showing {users.length} of {total} licenses
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl border border-dark-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-dark-text">Loading users...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-dark-text">
            No licenses found
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-dark-card-hover border-b border-dark-border">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase cursor-pointer hover:text-dark-text"
                  onClick={() => handleSort('email')}
                >
                  Email<SortIcon column="email" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">License Key</th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase cursor-pointer hover:text-dark-text"
                  onClick={() => handleSort('plan')}
                >
                  Plan<SortIcon column="plan" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Billing</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Installs</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Wallets</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Rigs</th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase cursor-pointer hover:text-dark-text"
                  onClick={() => handleSort('subscription_start_date')}
                >
                  Subscribed<SortIcon column="subscription_start_date" />
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase cursor-pointer hover:text-dark-text"
                  onClick={() => handleSort('created_at')}
                >
                  Created<SortIcon column="created_at" />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-dark-card-hover">
                  <td className="px-4 py-3">
                    <span className="font-medium text-dark-text">{user.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    {user.key ? (
                      <code className="text-sm bg-dark-bg text-dark-text px-2 py-1 rounded">
                        {user.key.substring(0, 12)}...
                      </code>
                    ) : (
                      <span className="text-dark-text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPlanBadge(user.plan)}`}>
                      {user.plan === 'free' ? 'FREE' : 'PRO'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.plan === 'pro' ? (
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBillingTypeBadge(user.billingType)}`}>
                        {getBillingTypeLabel(user.billingType)}
                      </span>
                    ) : (
                      <span className="text-dark-text-muted">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dark-text">
                    {user.installCount}
                  </td>
                  <td className="px-4 py-3 text-dark-text">
                    {user.walletCount}
                  </td>
                  <td className="px-4 py-3 text-dark-text">
                    {user.rigCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-text">
                    {user.subscription_start_date ? formatDate(user.subscription_start_date) : '-'}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-text">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => fetchUserDetails(user.id)}
                      className="text-primary hover:text-primary-light text-sm font-medium"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            <span className="text-sm text-dark-text">
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

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="glass-card rounded-xl border border-dark-border max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-dark-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-dark-text">User Details</h2>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-dark-text-muted hover:text-dark-text"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {userLoading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-dark-text">Loading user details...</p>
              </div>
            ) : (
              <>
                <div className="p-6 space-y-4">
                  {/* Profile Photo & Name Section */}
                  <div className="flex items-center gap-4">
                    {selectedUser.profile_photo_url ? (
                      <img
                        src={selectedUser.profile_photo_url}
                        alt="Profile"
                        className="w-16 h-16 rounded-full object-cover border-2 border-dark-border"
                      />
                    ) : (
                      <div className="w-16 h-16 rounded-full bg-dark-card-hover border-2 border-dark-border flex items-center justify-center">
                        <svg className="w-8 h-8 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <p className="text-lg font-semibold text-dark-text">
                        {selectedUser.full_name || 'No name set'}
                      </p>
                      <p className="text-sm text-primary">@{selectedUser.blog_display_name || 'Anonymous'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Full Name</label>
                      <p className="text-dark-text">{selectedUser.full_name || '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Display Name</label>
                      <p className="text-dark-text">{selectedUser.blog_display_name || '-'}</p>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-dark-text-muted">Email</label>
                    <p className="text-dark-text">{selectedUser.email}</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-dark-text-muted">License Key</label>
                    <p className="font-mono text-sm bg-dark-bg text-dark-text p-2 rounded break-all">{selectedUser.key || '-'}</p>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Plan</label>
                      <p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPlanBadge(selectedUser.plan)}`}>
                          {selectedUser.plan === 'free' ? 'FREE' : 'PRO'}
                        </span>
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Billing</label>
                      <p>
                        {selectedUser.plan === 'pro' ? (
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getBillingTypeBadge(selectedUser.billingType)}`}>
                            {getBillingTypeLabel(selectedUser.billingType)}
                          </span>
                        ) : (
                          <span className="text-dark-text-muted">-</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Status</label>
                      <p>
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(selectedUser.status)}`}>
                          {selectedUser.status}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Subscription Started</label>
                      <p className="text-dark-text">{selectedUser.subscription_start_date ? formatDate(selectedUser.subscription_start_date) : '-'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Subscription Expires</label>
                      <p className="text-dark-text">{selectedUser.subscription_end_date ? formatDate(selectedUser.subscription_end_date) : '-'}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Installations</label>
                      <p className="text-dark-text">{selectedUser.installCount}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Wallets</label>
                      <p className="text-dark-text">{selectedUser.walletCount}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Mining Rigs</label>
                      <p className="text-dark-text">{selectedUser.rigCount}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Created</label>
                      <p className="text-dark-text">{formatDate(selectedUser.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Amount Paid</label>
                      <p className="text-dark-text">{selectedUser.amount_paid ? formatAmount(selectedUser.amount_paid) : '-'}</p>
                    </div>
                  </div>

                  {selectedUser.stripe_customer_id && (
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Stripe Customer</label>
                      <p className="font-mono text-sm text-dark-text">{selectedUser.stripe_customer_id}</p>
                    </div>
                  )}

                  {selectedUser.stripe_payment_id && (
                    <div>
                      <label className="text-sm font-medium text-dark-text-muted">Stripe Payment</label>
                      <p className="font-mono text-sm text-dark-text">{selectedUser.stripe_payment_id}</p>
                    </div>
                  )}

                  {/* Payment History Section */}
                  <div className="pt-4 border-t border-dark-border">
                    <h3 className="text-lg font-semibold text-dark-text mb-3">Payment History</h3>
                    {selectedUser.paymentHistory && selectedUser.paymentHistory.length > 0 ? (
                      <div className="max-h-48 overflow-y-auto border border-dark-border rounded-lg">
                        <table className="w-full text-sm">
                          <thead className="bg-dark-card-hover sticky top-0">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs text-dark-text-muted">Date</th>
                              <th className="px-3 py-2 text-left text-xs text-dark-text-muted">Type</th>
                              <th className="px-3 py-2 text-left text-xs text-dark-text-muted">Amount</th>
                              <th className="px-3 py-2 text-left text-xs text-dark-text-muted">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-dark-border">
                            {selectedUser.paymentHistory.map((payment) => (
                              <tr key={payment.id} className="hover:bg-dark-card-hover">
                                <td className="px-3 py-2 text-dark-text">
                                  {new Date(payment.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${getPaymentTypeBadge(payment.type)}`}>
                                    {payment.type}
                                  </span>
                                </td>
                                <td className={`px-3 py-2 font-medium ${payment.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                  {formatAmount(payment.amount)}
                                </td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-0.5 text-xs rounded-full ${getPaymentStatusBadge(payment.status)}`}>
                                    {payment.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-dark-text-muted text-sm">No payment history found</p>
                    )}
                  </div>
                </div>

                <div className="p-6 border-t border-dark-border bg-dark-card-hover flex gap-3 flex-wrap">
                  {selectedUser.plan !== 'free' && selectedUser.key && (
                    <button
                      onClick={() => handleResendLicense(selectedUser.email)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Sending...' : 'Resend License Email'}
                    </button>
                  )}
                  {selectedUser.status === 'active' ? (
                    <button
                      onClick={() => handleAction(selectedUser.key, 'revoke')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : 'Revoke License'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction(selectedUser.key, 'activate')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {actionLoading ? 'Processing...' : 'Reactivate License'}
                    </button>
                  )}
                  <button
                    onClick={() => openDeleteConfirm(selectedUser.id, selectedUser.email, selectedUser.plan)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-red-900 text-red-200 rounded-lg hover:bg-red-800 disabled:opacity-50 border border-red-700"
                  >
                    Delete & Purge All Data
                  </button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-4 py-2 border border-dark-border text-dark-text rounded-lg hover:bg-dark-card-hover"
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60]">
          <div className="bg-dark-card rounded-xl border-2 border-red-600 max-w-md w-full mx-4 overflow-hidden">
            {/* Warning Header */}
            <div className="bg-red-900/50 px-6 py-4 border-b border-red-600">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-red-200">DANGER ZONE</h3>
                  <p className="text-red-300 text-sm">This action is irreversible</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Pro User Warning */}
              {deleteConfirm.plan === 'pro' && (
                <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-yellow-200 font-semibold mb-1">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    PAID PRO USER
                  </div>
                  <p className="text-yellow-300 text-sm">This user has a paid subscription. Deleting will remove their license permanently.</p>
                </div>
              )}

              {/* What will be deleted */}
              <div>
                <p className="text-dark-text font-medium mb-2">The following will be permanently deleted:</p>
                <ul className="text-dark-text-muted text-sm space-y-1">
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">✕</span> User account & license key
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">✕</span> All saved wallets & settings
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">✕</span> All device connections
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">✕</span> Payment history records
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">✕</span> Blog comments & activity
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-red-400">✕</span> Roadmap submissions
                  </li>
                </ul>
              </div>

              {/* Type email to confirm */}
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Type <span className="text-red-400 font-mono">{deleteConfirm.email}</span> to confirm:
                </label>
                <input
                  type="text"
                  value={deleteTypedEmail}
                  onChange={(e) => setDeleteTypedEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 bg-dark-card-hover border-t border-dark-border flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-dark-text-muted hover:text-dark-text transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={actionLoading || deleteTypedEmail.toLowerCase() !== deleteConfirm.email.toLowerCase()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors"
              >
                {actionLoading ? 'Deleting...' : 'Delete Forever'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
