'use client'

import { useState, useContext, useEffect } from 'react'
import { AuthContext } from '../auth-context'

interface RoadmapItem {
  id: string
  category: string
  priority: string
  platforms: string[]
  title: string
  description: string
  status: string
  progress: number
  admin_response: string | null
  target_version: string | null
  created_at: string
  isOwned?: boolean
}

const CATEGORIES = {
  new_pool: 'New Pool Support',
  new_coin: 'New Coin Support',
  feature: 'New Feature',
  ui_ux: 'UI/UX Improvement',
  integration: 'Integration',
  bug_report: 'Bug Report',
  other: 'Other'
}

const PRIORITIES = {
  nice_to_have: 'Nice to Have',
  would_help: 'Would Help',
  really_need: 'Really Need This'
}

const PLATFORMS_LIST = [
  { value: 'extension', label: 'Chrome Extension' },
  { value: 'mobile_ios', label: 'iOS App' },
  { value: 'mobile_android', label: 'Android App' },
  { value: 'website', label: 'Website/Dashboard' }
]

const STATUS_INFO: Record<string, { label: string; color: string }> = {
  submitted: { label: 'Submitted', color: 'bg-gray-700 text-gray-200' },
  reviewing: { label: 'Under Review', color: 'bg-blue-900 text-blue-200' },
  planned: { label: 'Planned', color: 'bg-purple-900 text-purple-200' },
  in_progress: { label: 'In Progress', color: 'bg-yellow-900 text-yellow-200' },
  completed: { label: 'Completed', color: 'bg-green-900 text-green-200' },
  declined: { label: 'Declined', color: 'bg-red-900 text-red-200' }
}

export default function RoadmapPage() {
  const { user } = useContext(AuthContext)
  const [activeTab, setActiveTab] = useState<'submit' | 'view'>('submit')
  const [items, setItems] = useState<RoadmapItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  // Form state
  const [form, setForm] = useState({
    category: 'feature',
    priority: 'would_help',
    platforms: [] as string[],
    title: '',
    description: ''
  })

  useEffect(() => {
    if (activeTab === 'view') {
      fetchRoadmapItems()
    }
  }, [activeTab, user?.email])

  async function fetchRoadmapItems() {
    setLoadingItems(true)
    try {
      // Pass user email to get their own submissions too
      const params = new URLSearchParams()
      if (user?.email) {
        params.set('email', user.email)
      }
      const res = await fetch(`/api/roadmap/public?${params}`)
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch roadmap items:', error)
    } finally {
      setLoadingItems(false)
    }
  }

  function togglePlatform(platform: string) {
    setForm(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.title.trim()) return

    setSubmitting(true)
    try {
      const res = await fetch('/api/roadmap/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          email: user?.email,
          licenseKey: user?.licenseKey
        })
      })

      if (res.ok) {
        setSubmitted(true)
        setForm({
          category: 'feature',
          priority: 'would_help',
          platforms: [],
          title: '',
          description: ''
        })
        // Auto switch to view tab after 2 seconds
        setTimeout(() => {
          setActiveTab('view')
          setSubmitted(false)
        }, 2000)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to submit')
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark-text">Roadmap & Feature Requests</h1>
        <p className="text-dark-text mt-1">Submit ideas or see what&apos;s coming next</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('submit')}
          className={`px-6 py-3 font-medium border-b-2 transition ${
            activeTab === 'submit'
              ? 'border-primary text-primary'
              : 'border-transparent text-dark-text hover:text-dark-text'
          }`}
        >
          Submit Request
        </button>
        <button
          onClick={() => setActiveTab('view')}
          className={`px-6 py-3 font-medium border-b-2 transition ${
            activeTab === 'view'
              ? 'border-primary text-primary'
              : 'border-transparent text-dark-text hover:text-dark-text'
          }`}
        >
          View Roadmap
        </button>
      </div>

      {/* Submit Tab */}
      {activeTab === 'submit' && (
        <div className="glass-card rounded-xl border border-dark-border p-6">
          {submitted ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-dark-text mb-2">Request Submitted!</h3>
              <p className="text-dark-text">Thank you for your feedback. We&apos;ll review it soon.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Category & Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    Category *
                  </label>
                  <select
                    value={form.category}
                    onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                    className="w-full px-4 py-3 bg-dark-card-hover border border-dark-border text-dark-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {Object.entries(CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-text mb-2">
                    Priority *
                  </label>
                  <select
                    value={form.priority}
                    onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
                    className="w-full px-4 py-3 bg-dark-card-hover border border-dark-border text-dark-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    {Object.entries(PRIORITIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Platforms */}
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Platforms (select all that apply)
                </label>
                <div className="flex flex-wrap gap-3">
                  {PLATFORMS_LIST.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => togglePlatform(value)}
                      className={`px-4 py-2 rounded-lg border transition ${
                        form.platforms.includes(value)
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-dark-border text-dark-text hover:border-dark-text'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Title / Summary *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-3 bg-dark-card-hover border border-dark-border text-dark-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Briefly describe your request..."
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-dark-text mb-2">
                  Description / Details
                </label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={5}
                  className="w-full px-4 py-3 bg-dark-card-hover border border-dark-border text-dark-text rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  placeholder="Provide any additional details, use cases, or examples..."
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || !form.title.trim()}
                  className="px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition"
                >
                  {submitting ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </span>
                  ) : (
                    'Submit Request'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* View Tab */}
      {activeTab === 'view' && (
        <div className="space-y-6">
          {loadingItems ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-primary" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
          ) : items.length === 0 ? (
            <div className="glass-card rounded-xl border border-dark-border p-12 text-center">
              <div className="w-16 h-16 bg-dark-card-hover rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-dark-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-dark-text mb-2">No roadmap items yet</h3>
              <p className="text-dark-text">Be the first to submit a feature request!</p>
            </div>
          ) : (
            <>
              {/* User's Own Submissions Section */}
              {items.filter(i => i.isOwned).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-dark-text flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Your Submissions
                  </h3>
                  {items.filter(i => i.isOwned).map(item => (
                    <div key={item.id} className={`glass-card rounded-xl border p-6 ${item.status === 'submitted' || item.status === 'reviewing' ? 'border-amber-500/30 bg-amber-500/5' : 'border-dark-border'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className="px-2 py-1 text-xs rounded-full bg-primary/20 text-primary font-medium">
                              Your Submission
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${STATUS_INFO[item.status]?.color || 'bg-dark-card-hover'}`}>
                              {STATUS_INFO[item.status]?.label || item.status}
                            </span>
                            <span className="px-2 py-1 text-xs bg-dark-card-hover text-dark-text rounded-full">
                              {CATEGORIES[item.category as keyof typeof CATEGORIES] || item.category}
                            </span>
                            {item.target_version && (
                              <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                                v{item.target_version}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-dark-text">{item.title}</h3>
                          {item.description && (
                            <p className="text-dark-text mt-1">{item.description}</p>
                          )}
                          {item.platforms?.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {item.platforms.map(p => (
                                <span key={p} className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                                  {PLATFORMS_LIST.find(pl => pl.value === p)?.label || p}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.admin_response && (
                            <div className="mt-4 p-4 bg-blue-900/30 border border-blue-800 rounded-lg">
                              <p className="text-sm font-medium text-blue-300 mb-1">Team Response:</p>
                              <p className="text-sm text-blue-200">{item.admin_response}</p>
                            </div>
                          )}
                        </div>
                        {item.progress > 0 && item.status === 'in_progress' && (
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{item.progress}%</div>
                            <div className="w-24 h-2 bg-dark-border rounded-full mt-1">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Public Roadmap Section */}
              {items.filter(i => !i.isOwned).length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-dark-text flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                    </svg>
                    Public Roadmap
                  </h3>
                  {items.filter(i => !i.isOwned).map(item => (
                    <div key={item.id} className="glass-card rounded-xl border border-dark-border p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${STATUS_INFO[item.status]?.color || 'bg-dark-card-hover'}`}>
                              {STATUS_INFO[item.status]?.label || item.status}
                            </span>
                            <span className="px-2 py-1 text-xs bg-dark-card-hover text-dark-text rounded-full">
                              {CATEGORIES[item.category as keyof typeof CATEGORIES] || item.category}
                            </span>
                            {item.target_version && (
                              <span className="px-2 py-1 text-xs bg-primary/10 text-primary rounded-full">
                                v{item.target_version}
                              </span>
                            )}
                          </div>
                          <h3 className="text-lg font-semibold text-dark-text">{item.title}</h3>
                          {item.description && (
                            <p className="text-dark-text mt-1">{item.description}</p>
                          )}
                          {item.platforms?.length > 0 && (
                            <div className="flex gap-2 mt-3">
                              {item.platforms.map(p => (
                                <span key={p} className="text-xs text-blue-400 bg-blue-500/20 px-2 py-1 rounded">
                                  {PLATFORMS_LIST.find(pl => pl.value === p)?.label || p}
                                </span>
                              ))}
                            </div>
                          )}
                          {item.admin_response && (
                            <div className="mt-4 p-4 bg-blue-900/30 border border-blue-800 rounded-lg">
                              <p className="text-sm font-medium text-blue-300 mb-1">Team Response:</p>
                              <p className="text-sm text-blue-200">{item.admin_response}</p>
                            </div>
                          )}
                        </div>
                        {item.progress > 0 && item.status === 'in_progress' && (
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary">{item.progress}%</div>
                            <div className="w-24 h-2 bg-dark-border rounded-full mt-1">
                              <div
                                className="h-full bg-primary rounded-full"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
