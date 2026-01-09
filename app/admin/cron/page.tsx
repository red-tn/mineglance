'use client'

import { useState, useEffect, useCallback } from 'react'

interface CronJob {
  id: string
  name: string
  description: string | null
  schedule: string
  endpoint: string
  is_enabled: boolean
  last_run: string | null
  last_status: 'success' | 'failed' | null
  created_at: string
}

interface CronExecution {
  id: string
  job_id: string
  status: 'running' | 'success' | 'failed'
  started_at: string
  completed_at: string | null
  duration_ms: number | null
  triggered_by: string | null
  result: Record<string, unknown> | null
  error: string | null
}

export default function CronJobsPage() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [executions, setExecutions] = useState<CronExecution[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editingJob, setEditingJob] = useState<CronJob | null>(null)
  const [triggeringJob, setTriggeringJob] = useState<string | null>(null)

  // Form state
  const [formName, setFormName] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formSchedule, setFormSchedule] = useState('0 0 * * *')
  const [formEndpoint, setFormEndpoint] = useState('')
  const [formEnabled, setFormEnabled] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('admin_token')
      const response = await fetch('/api/admin/cron', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const data = await response.json()
      setJobs(data.jobs || [])
      setExecutions(data.executions || [])
    } catch (error) {
      console.error('Failed to fetch cron data:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const token = localStorage.getItem('admin_token')

    try {
      if (editingJob) {
        // Update existing job
        await fetch(`/api/admin/cron/${editingJob.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formName,
            description: formDescription,
            schedule: formSchedule,
            endpoint: formEndpoint,
            isEnabled: formEnabled
          })
        })
      } else {
        // Create new job
        await fetch('/api/admin/cron', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: formName,
            description: formDescription,
            schedule: formSchedule,
            endpoint: formEndpoint,
            isEnabled: formEnabled
          })
        })
      }

      setShowModal(false)
      resetForm()
      fetchData()
    } catch (error) {
      console.error('Failed to save cron job:', error)
    }
  }

  const handleTrigger = async (job: CronJob) => {
    if (!confirm(`Run "${job.name}" now?`)) return

    setTriggeringJob(job.id)
    const token = localStorage.getItem('admin_token')

    try {
      const response = await fetch('/api/admin/cron', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'trigger',
          jobId: job.id
        })
      })

      const result = await response.json()
      if (result.success) {
        alert(`Job completed successfully in ${result.duration}ms`)
      } else {
        alert(`Job failed: ${result.error || 'Unknown error'}`)
      }
      fetchData()
    } catch (error) {
      console.error('Failed to trigger job:', error)
      alert('Failed to trigger job')
    } finally {
      setTriggeringJob(null)
    }
  }

  const handleDelete = async (job: CronJob) => {
    if (!confirm(`Delete "${job.name}"? This cannot be undone.`)) return

    const token = localStorage.getItem('admin_token')
    try {
      await fetch(`/api/admin/cron/${job.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      fetchData()
    } catch (error) {
      console.error('Failed to delete job:', error)
    }
  }

  const handleToggle = async (job: CronJob) => {
    const token = localStorage.getItem('admin_token')
    try {
      await fetch(`/api/admin/cron/${job.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isEnabled: !job.is_enabled })
      })
      fetchData()
    } catch (error) {
      console.error('Failed to toggle job:', error)
    }
  }

  const openEditModal = (job: CronJob) => {
    setEditingJob(job)
    setFormName(job.name)
    setFormDescription(job.description || '')
    setFormSchedule(job.schedule)
    setFormEndpoint(job.endpoint)
    setFormEnabled(job.is_enabled)
    setShowModal(true)
  }

  const resetForm = () => {
    setEditingJob(null)
    setFormName('')
    setFormDescription('')
    setFormSchedule('0 0 * * *')
    setFormEndpoint('')
    setFormEnabled(true)
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'success':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">Success</span>
      case 'failed':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">Failed</span>
      case 'running':
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">Running</span>
      default:
        return <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">Never Run</span>
    }
  }

  const formatSchedule = (schedule: string) => {
    // Simple cron schedule descriptions
    const common: Record<string, string> = {
      '0 0 * * *': 'Daily at midnight UTC',
      '0 * * * *': 'Every hour',
      '*/15 * * * *': 'Every 15 minutes',
      '0 0 * * 0': 'Weekly on Sunday',
      '0 0 1 * *': 'Monthly on the 1st'
    }
    return common[schedule] || schedule
  }

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
          <h1 className="text-2xl font-bold text-dark-text">Cron Jobs</h1>
          <p className="text-dark-text-muted">Manage scheduled tasks and view execution history</p>
        </div>
        <button
          onClick={() => {
            resetForm()
            setShowModal(true)
          }}
          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Cron Job
        </button>
      </div>

      {/* Cron Jobs List */}
      <div className="glass-card rounded-xl border border-dark-border overflow-hidden mb-8">
        <div className="p-6 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-dark-text">Scheduled Jobs</h3>
        </div>
        {jobs.length === 0 ? (
          <div className="p-12 text-center text-dark-text-muted">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p>No cron jobs configured</p>
            <p className="text-sm mt-2">Add a cron job to automate tasks</p>
          </div>
        ) : (
          <div className="divide-y divide-dark-border">
            {jobs.map(job => (
              <div key={job.id} className="p-6 hover:bg-dark-card-hover">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-semibold text-dark-text">{job.name}</h4>
                      {getStatusBadge(job.last_status)}
                      {!job.is_enabled && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-700 text-gray-300">Disabled</span>
                      )}
                    </div>
                    {job.description && (
                      <p className="text-sm text-dark-text-muted mb-2">{job.description}</p>
                    )}
                    <div className="flex items-center gap-6 text-sm text-dark-text-muted">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {formatSchedule(job.schedule)}
                      </span>
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        {job.endpoint}
                      </span>
                      {job.last_run && (
                        <span>Last run: {new Date(job.last_run).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTrigger(job)}
                      disabled={triggeringJob === job.id}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                    >
                      {triggeringJob === job.id ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                          Running...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Run Now
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleToggle(job)}
                      className={`px-3 py-1.5 text-sm rounded ${job.is_enabled ? 'bg-amber-600 hover:bg-amber-700' : 'bg-green-600 hover:bg-green-700'} text-white`}
                    >
                      {job.is_enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => openEditModal(job)}
                      className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(job)}
                      className="px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Execution History */}
      <div className="glass-card rounded-xl border border-dark-border overflow-hidden">
        <div className="p-6 border-b border-dark-border">
          <h3 className="text-lg font-semibold text-dark-text">Execution History</h3>
        </div>
        {executions.length === 0 ? (
          <div className="p-12 text-center text-dark-text-muted">
            <p>No executions yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-card-hover">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Job</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Started</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Triggered By</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {executions.map(exec => {
                  const job = jobs.find(j => j.id === exec.job_id)
                  return (
                    <tr key={exec.id} className="hover:bg-dark-card-hover">
                      <td className="px-6 py-4 text-sm text-dark-text">{job?.name || 'Unknown'}</td>
                      <td className="px-6 py-4">{getStatusBadge(exec.status)}</td>
                      <td className="px-6 py-4 text-sm text-dark-text-muted">
                        {new Date(exec.started_at).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-text-muted">
                        {exec.duration_ms ? `${exec.duration_ms}ms` : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-dark-text-muted">
                        {exec.triggered_by || 'System'}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {exec.error ? (
                          <span className="text-red-500">{exec.error}</span>
                        ) : exec.result ? (
                          <span className="text-dark-text-muted">
                            {JSON.stringify(exec.result).slice(0, 50)}...
                          </span>
                        ) : '-'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-card border border-dark-border rounded-xl p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold text-dark-text mb-6">
              {editingJob ? 'Edit Cron Job' : 'Add Cron Job'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text"
                  placeholder="e.g., Purge Stale Instances"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">Description</label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text"
                  placeholder="Optional description"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">Schedule (Cron Expression)</label>
                <input
                  type="text"
                  value={formSchedule}
                  onChange={e => setFormSchedule(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text font-mono"
                  placeholder="0 0 * * *"
                  required
                />
                <p className="text-xs text-dark-text-muted mt-1">
                  Format: minute hour day month weekday (e.g., &quot;0 0 * * *&quot; = daily at midnight)
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">Endpoint</label>
                <input
                  type="text"
                  value={formEndpoint}
                  onChange={e => setFormEndpoint(e.target.value)}
                  className="w-full px-4 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text font-mono"
                  placeholder="/api/cron/my-task"
                  required
                />
                <p className="text-xs text-dark-text-muted mt-1">
                  Must start with /api/cron/
                </p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formEnabled}
                  onChange={e => setFormEnabled(e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="enabled" className="text-sm text-dark-text">Enabled</label>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    resetForm()
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  {editingJob ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
