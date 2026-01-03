'use client'

import { useState, useEffect, useCallback } from 'react'

interface License {
  id: string
  key: string
  email: string
  plan: 'pro' | 'bundle'
  status: 'active' | 'revoked' | 'expired'
  created_at: string
  stripe_customer_id?: string
  stripe_payment_id?: string
  installCount: number
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
  const [selectedUser, setSelectedUser] = useState<License | null>(null)
  const [actionLoading, setActionLoading] = useState(false)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        status: statusFilter,
        plan: planFilter
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
  }, [page, search, statusFilter, planFilter])

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
      active: 'bg-green-100 text-green-800',
      revoked: 'bg-red-100 text-red-800',
      expired: 'bg-gray-100 text-gray-800'
    }
    return colors[status] || 'bg-gray-100 text-gray-800'
  }

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      pro: 'bg-blue-100 text-blue-800',
      bundle: 'bg-purple-100 text-purple-800'
    }
    return colors[plan] || 'bg-gray-100 text-gray-800'
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
              <option value="pro">Pro ($29)</option>
              <option value="bundle">Pro Plus ($59)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => { setSearch(''); setStatusFilter('all'); setPlanFilter('all'); setPage(1) }}
              className="px-4 py-2 text-dark-text hover:text-primary"
            >
              Clear Filters
            </button>
          </div>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">License Key</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Plan</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Installs</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Created</th>
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
                    <code className="text-sm bg-dark-bg text-dark-text px-2 py-1 rounded">
                      {user.key.substring(0, 12)}...
                    </code>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPlanBadge(user.plan)}`}>
                      {user.plan === 'bundle' ? 'PRO PLUS' : 'PRO'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-dark-text">
                    {user.installCount}
                  </td>
                  <td className="px-4 py-3 text-sm text-dark-text">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedUser(user)}
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
          <div className="glass-card rounded-xl border border-dark-border max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-dark-border">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-dark-text">License Details</h2>
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

            <div className="p-6 space-y-4">
              <div>
                <label className="text-sm font-medium text-dark-text-muted">Email</label>
                <p className="text-dark-text">{selectedUser.email}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-dark-text-muted">License Key</label>
                <p className="font-mono text-sm bg-dark-bg text-dark-text p-2 rounded break-all">{selectedUser.key}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-dark-text-muted">Plan</label>
                  <p>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPlanBadge(selectedUser.plan)}`}>
                      {selectedUser.plan === 'bundle' ? 'PRO PLUS ($59)' : 'PRO ($29)'}
                    </span>
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
                  <label className="text-sm font-medium text-dark-text-muted">Installations</label>
                  <p className="text-dark-text">{selectedUser.installCount}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-dark-text-muted">Created</label>
                  <p className="text-dark-text">{formatDate(selectedUser.created_at)}</p>
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
            </div>

            <div className="p-6 border-t border-dark-border bg-dark-card-hover flex gap-3">
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
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 border border-dark-border text-dark-text rounded-lg hover:bg-dark-card-hover"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
