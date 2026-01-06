'use client'

import { useState, useEffect } from 'react'

interface RenewalUser {
  id: string
  email: string
  plan: string
  subscription_start_date: string | null
  subscription_end_date: string | null
  renewal_reminder_sent: boolean
  renewal_ignored: boolean
  created_at: string
  daysUntilExpiry: number | null
  status: 'active' | 'due_soon' | 'due_30' | 'overdue'
}

interface Stats {
  dueSoon7Days: number
  dueSoon30Days: number
  overdue: number
  ignoredReminder: number
  totalPro: number
}

export default function RenewalsPage() {
  const [users, setUsers] = useState<RenewalUser[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [extendDays, setExtendDays] = useState<{ [key: string]: number }>({})
  const [showExtendModal, setShowExtendModal] = useState<string | null>(null)

  useEffect(() => {
    fetchRenewals()
  }, [filter])

  async function fetchRenewals() {
    setLoading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/admin/renewals?filter=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users || [])
        setStats(data.stats || null)
      }
    } catch (error) {
      console.error('Error fetching renewals:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(action: string, userId: string, days?: number) {
    setActionLoading(userId)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/renewals', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ action, userId, days })
      })

      if (res.ok) {
        const data = await res.json()
        alert(data.message || 'Action completed')
        fetchRenewals()
      } else {
        const error = await res.json()
        alert(error.error || 'Action failed')
      }
    } catch (error) {
      console.error('Error performing action:', error)
      alert('Action failed')
    } finally {
      setActionLoading(null)
      setShowExtendModal(null)
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case 'overdue':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-900/50 text-red-200">Overdue</span>
      case 'due_soon':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-900/50 text-yellow-200">Due Soon</span>
      case 'due_30':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-amber-900/50 text-amber-200">Due in 30 days</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-900/50 text-green-200">Active</span>
    }
  }

  return (
    <div className="space-y-6 pt-16 lg:pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Subscription Renewals</h1>
        <button
          onClick={() => fetchRenewals()}
          className="px-4 py-2 bg-dark-card hover:bg-dark-card-hover text-white rounded-lg border border-dark-border transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-dark-card rounded-xl p-4 border border-dark-border">
            <p className="text-sm text-dark-text-muted">Total Pro Users</p>
            <p className="text-2xl font-bold text-white">{stats.totalPro}</p>
          </div>
          <div className="bg-dark-card rounded-xl p-4 border border-yellow-500/30">
            <p className="text-sm text-dark-text-muted">Due in 7 Days</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.dueSoon7Days}</p>
          </div>
          <div className="bg-dark-card rounded-xl p-4 border border-amber-500/30">
            <p className="text-sm text-dark-text-muted">Due in 30 Days</p>
            <p className="text-2xl font-bold text-amber-400">{stats.dueSoon30Days}</p>
          </div>
          <div className="bg-dark-card rounded-xl p-4 border border-red-500/30">
            <p className="text-sm text-dark-text-muted">Overdue</p>
            <p className="text-2xl font-bold text-red-400">{stats.overdue}</p>
          </div>
          <div className="bg-dark-card rounded-xl p-4 border border-dark-border">
            <p className="text-sm text-dark-text-muted">Ignored Reminders</p>
            <p className="text-2xl font-bold text-dark-text-dim">{stats.ignoredReminder}</p>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b border-dark-border pb-4">
        {[
          { value: 'all', label: 'All Pro Users' },
          { value: 'due_soon', label: 'Due Soon' },
          { value: 'overdue', label: 'Overdue' },
          { value: 'ignored', label: 'Ignored Reminder' }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-primary text-white'
                : 'bg-dark-card text-dark-text-muted hover:bg-dark-card-hover hover:text-white'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Users Table */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-dark-text-muted">
          No users found with current filter
        </div>
      ) : (
        <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-border">
                  <th className="text-left px-4 py-3 text-sm font-medium text-dark-text-muted">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-dark-text-muted">Status</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-dark-text-muted">Expires</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-dark-text-muted">Days Left</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-dark-text-muted">Reminder Sent</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-dark-text-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id} className="border-b border-dark-border/50 hover:bg-dark-card-hover">
                    <td className="px-4 py-3">
                      <span className="text-white">{user.email}</span>
                    </td>
                    <td className="px-4 py-3">
                      {getStatusBadge(user.status)}
                    </td>
                    <td className="px-4 py-3 text-dark-text-muted">
                      {user.subscription_end_date
                        ? new Date(user.subscription_end_date).toLocaleDateString()
                        : 'Not set'}
                    </td>
                    <td className="px-4 py-3">
                      {user.daysUntilExpiry !== null ? (
                        <span className={`font-medium ${
                          user.daysUntilExpiry < 0 ? 'text-red-400' :
                          user.daysUntilExpiry <= 7 ? 'text-yellow-400' :
                          user.daysUntilExpiry <= 30 ? 'text-amber-400' :
                          'text-green-400'
                        }`}>
                          {user.daysUntilExpiry < 0 ? `${Math.abs(user.daysUntilExpiry)} days overdue` : `${user.daysUntilExpiry} days`}
                        </span>
                      ) : (
                        <span className="text-dark-text-dim">--</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {user.renewal_reminder_sent ? (
                        <span className="text-green-400">Yes</span>
                      ) : (
                        <span className="text-dark-text-dim">No</span>
                      )}
                      {user.renewal_ignored && (
                        <span className="ml-2 text-xs text-amber-400">(ignored)</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleAction('send_reminder', user.id)}
                          disabled={actionLoading === user.id}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50"
                        >
                          Send Reminder
                        </button>
                        <button
                          onClick={() => setShowExtendModal(user.id)}
                          disabled={actionLoading === user.id}
                          className="px-3 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-500 text-white rounded transition-colors disabled:opacity-50"
                        >
                          Extend
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Downgrade this user to free tier?')) {
                              handleAction('downgrade', user.id)
                            }
                          }}
                          disabled={actionLoading === user.id}
                          className="px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-500 text-white rounded transition-colors disabled:opacity-50"
                        >
                          Downgrade
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Extend Modal */}
      {showExtendModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-dark-card rounded-xl border border-dark-border p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-white mb-4">Extend Subscription</h3>
            <div className="mb-4">
              <label className="block text-sm text-dark-text-muted mb-2">Days to extend</label>
              <input
                type="number"
                min="1"
                max="365"
                value={extendDays[showExtendModal] || 30}
                onChange={(e) => setExtendDays({ ...extendDays, [showExtendModal]: parseInt(e.target.value) || 30 })}
                className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:border-primary"
              />
              <p className="text-xs text-dark-text-dim mt-2">
                Common values: 30 (1 month), 90 (3 months), 365 (1 year)
              </p>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowExtendModal(null)}
                className="px-4 py-2 text-sm text-dark-text-muted hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction('extend', showExtendModal, extendDays[showExtendModal] || 30)}
                disabled={actionLoading === showExtendModal}
                className="px-4 py-2 text-sm font-medium bg-primary hover:bg-primary-dark text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {actionLoading === showExtendModal ? 'Extending...' : 'Extend'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
