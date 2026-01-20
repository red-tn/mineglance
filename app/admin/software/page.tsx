'use client'

import { useEffect, useState } from 'react'

interface SoftwareRelease {
  id: string
  version: string
  platform: string
  released_at: string
  download_url: string
  release_notes: string
  is_latest: boolean
  created_at: string
}

interface BugFix {
  id: string
  title: string
  description: string
  platform: string
  severity: string
  fixed_in_version: string
  reported_by: string | null
  fixed_at: string
  created_at: string
}

interface EmailStats {
  freeSubscribers: number
  proSubscribers: number
  latestBlog: { id: string; title: string; slug: string } | null
}

const PLATFORMS = {
  extension: 'Chrome Extension',
  desktop_windows: 'Windows Desktop',
  desktop_macos: 'macOS Desktop'
}

const SEVERITY_LEVELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical'
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-gray-500/20 text-gray-300',
  medium: 'bg-yellow-500/20 text-yellow-400',
  high: 'bg-orange-500/20 text-orange-400',
  critical: 'bg-red-500/20 text-red-400'
}

export default function AdminSoftwarePage() {
  const [releases, setReleases] = useState<SoftwareRelease[]>([])
  const [bugFixes, setBugFixes] = useState<BugFix[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'releases' | 'bugs'>('releases')
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalType, setModalType] = useState<'release' | 'bug'>('release')
  const [saving, setSaving] = useState(false)

  // Email modal state
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [selectedReleases, setSelectedReleases] = useState<string[]>([])
  const [emailStats, setEmailStats] = useState<EmailStats | null>(null)
  const [emailForm, setEmailForm] = useState({
    sendToFree: true,
    sendToPro: true,
    includeBlog: true,
    testEmail: ''
  })
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailResult, setEmailResult] = useState<{ sent: number; failed: number } | null>(null)

  // Release form
  const [releaseForm, setReleaseForm] = useState({
    version: '',
    platform: 'extension',
    download_url: '',
    release_notes: '',
    is_latest: false
  })

  // Bug fix form
  const [bugForm, setBugForm] = useState({
    fixed_in_version: '',
    platform: 'extension',
    severity: 'medium',
    title: '',
    description: ''
  })

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const token = localStorage.getItem('admin_token')

      const [releasesRes, bugsRes] = await Promise.all([
        fetch('/api/admin/software/releases', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/software/bugs', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (releasesRes.ok) {
        const data = await releasesRes.json()
        setReleases(data.releases || [])
      }

      if (bugsRes.ok) {
        const data = await bugsRes.json()
        setBugFixes(data.bugs || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveRelease() {
    setSaving(true)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/software/releases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(releaseForm)
      })

      if (res.ok) {
        fetchData()
        closeModal()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save')
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveBug() {
    setSaving(true)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/software/bugs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(bugForm)
      })

      if (res.ok) {
        fetchData()
        closeModal()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save')
      }
    } catch (error) {
      console.error('Failed to save:', error)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(type: 'release' | 'bug', id: string) {
    if (!confirm('Are you sure you want to delete this?')) return

    try {
      const token = localStorage.getItem('admin_token')
      const endpoint = type === 'release' ? 'releases' : 'bugs'
      const res = await fetch(`/api/admin/software/${endpoint}/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        fetchData()
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  // Email functions
  async function fetchEmailStats() {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/software/send-email', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setEmailStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch email stats:', error)
    }
  }

  function openEmailModal(releaseId?: string) {
    if (releaseId) {
      setSelectedReleases([releaseId])
    } else {
      // Select all latest releases by default
      const latestIds = releases.filter(r => r.is_latest).map(r => r.id)
      setSelectedReleases(latestIds)
    }
    setEmailForm({ sendToFree: true, sendToPro: true, includeBlog: true, testEmail: '' })
    setEmailResult(null)
    fetchEmailStats()
    setShowEmailModal(true)
  }

  function toggleReleaseSelection(id: string) {
    setSelectedReleases(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    )
  }

  async function handleSendEmail(isTest: boolean) {
    if (selectedReleases.length === 0) {
      alert('Please select at least one release')
      return
    }

    if (isTest && !emailForm.testEmail) {
      alert('Please enter a test email address')
      return
    }

    if (!isTest && !emailForm.sendToFree && !emailForm.sendToPro) {
      alert('Please select at least one audience (Free or Pro)')
      return
    }

    setSendingEmail(true)
    setEmailResult(null)

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/software/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          releaseIds: selectedReleases,
          sendToFree: isTest ? false : emailForm.sendToFree,
          sendToPro: isTest ? false : emailForm.sendToPro,
          includeBlog: emailForm.includeBlog,
          testEmail: isTest ? emailForm.testEmail : undefined
        })
      })

      const data = await res.json()

      if (res.ok) {
        setEmailResult({ sent: data.sent, failed: data.failed })
        if (!isTest && data.sent > 0) {
          alert(`Successfully sent ${data.sent} emails!`)
        }
      } else {
        alert(data.error || 'Failed to send emails')
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      alert('Failed to send emails')
    } finally {
      setSendingEmail(false)
    }
  }

  function openAddModal(type: 'release' | 'bug') {
    setModalType(type)
    if (type === 'release') {
      setReleaseForm({
        version: '',
        platform: 'extension',
        download_url: '',
        release_notes: '',
        is_latest: false
      })
    } else {
      setBugForm({
        fixed_in_version: releases.find(r => r.is_latest && r.platform === 'extension')?.version || '',
        platform: 'extension',
        severity: 'medium',
        title: '',
        description: ''
      })
    }
    setShowAddModal(true)
  }

  function closeModal() {
    setShowAddModal(false)
  }

  // Get latest versions per platform
  const latestVersions = releases.reduce((acc, r) => {
    if (r.is_latest) acc[r.platform] = r.version
    return acc
  }, {} as Record<string, string>)

  // Sort releases: latest first (grouped at top), then by date descending
  const sortedReleases = [...releases].sort((a, b) => {
    // Latest releases come first
    if (a.is_latest && !b.is_latest) return -1
    if (!a.is_latest && b.is_latest) return 1
    // Within same category, sort by release date descending
    return new Date(b.released_at).getTime() - new Date(a.released_at).getTime()
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-dark-text">Software Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => openEmailModal()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition flex items-center gap-2"
          >
            📧 Send Update Email
          </button>
          <button
            onClick={() => openAddModal('bug')}
            className="px-4 py-2 bg-dark-card-hover text-dark-text rounded-lg hover:bg-dark-border transition border border-dark-border"
          >
            + Log Bug/Fix
          </button>
          <button
            onClick={() => openAddModal('release')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition shadow-glow"
          >
            + New Release
          </button>
        </div>
      </div>

      {/* Latest Versions Summary */}
      <div className="grid grid-cols-3 gap-4">
        {Object.entries(PLATFORMS).map(([key, label]) => (
          <div key={key} className="glass-card rounded-xl p-4 border border-dark-border">
            <div className="text-sm text-dark-text-muted">{label}</div>
            <div className="text-2xl font-bold text-primary">
              v{latestVersions[key] || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-dark-border">
        <button
          onClick={() => setActiveTab('releases')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'releases'
              ? 'border-primary text-primary'
              : 'border-transparent text-dark-text-muted hover:text-dark-text'
          }`}
        >
          Releases ({releases.length})
        </button>
        <button
          onClick={() => setActiveTab('bugs')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'bugs'
              ? 'border-primary text-primary'
              : 'border-transparent text-dark-text-muted hover:text-dark-text'
          }`}
        >
          Bug Fixes ({bugFixes.length})
        </button>
      </div>

      {/* Releases Tab */}
      {activeTab === 'releases' && (
        <div className="glass-card rounded-xl border border-dark-border overflow-hidden">
          <table className="min-w-full divide-y divide-dark-border">
            <thead className="bg-dark-card-hover">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Release Notes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Download</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {sortedReleases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-dark-text-muted">
                    No releases found
                  </td>
                </tr>
              ) : (
                sortedReleases.map(release => (
                  <tr key={release.id} className="hover:bg-dark-card-hover">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-dark-text">v{release.version}</span>
                        {release.is_latest && (
                          <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">Latest</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-text-muted">
                      {PLATFORMS[release.platform as keyof typeof PLATFORMS] || release.platform}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-text-muted max-w-xs truncate">
                      {release.release_notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-text-muted">
                      {new Date(release.released_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {release.download_url ? (
                        <a href={release.download_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Download
                        </a>
                      ) : (
                        <span className="text-dark-text-dim">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => openEmailModal(release.id)}
                          className="text-blue-400 hover:underline"
                          title="Send update email for this release"
                        >
                          Email
                        </button>
                        <button
                          onClick={() => handleDelete('release', release.id)}
                          className="text-red-400 hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Bug Fixes Tab */}
      {activeTab === 'bugs' && (
        <div className="glass-card rounded-xl border border-dark-border overflow-hidden">
          <table className="min-w-full divide-y divide-dark-border">
            <thead className="bg-dark-card-hover">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Fixed In</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {bugFixes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-dark-text-muted">
                    No bug fixes logged
                  </td>
                </tr>
              ) : (
                bugFixes.map(bug => (
                  <tr key={bug.id} className="hover:bg-dark-card-hover">
                    <td className="px-4 py-3">
                      <div className="font-medium text-dark-text">{bug.title}</div>
                      {bug.description && (
                        <div className="text-sm text-dark-text-muted truncate max-w-xs">{bug.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${SEVERITY_COLORS[bug.severity] || 'bg-gray-500/20 text-gray-300'}`}>
                        {SEVERITY_LEVELS[bug.severity as keyof typeof SEVERITY_LEVELS] || bug.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-text-muted">
                      {PLATFORMS[bug.platform as keyof typeof PLATFORMS] || bug.platform}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-text-muted">
                      v{bug.fixed_in_version}
                    </td>
                    <td className="px-4 py-3 text-sm text-dark-text-muted">
                      {new Date(bug.fixed_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDelete('bug', bug.id)}
                        className="text-red-400 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-lg w-full border border-dark-border">
            <div className="p-6 border-b border-dark-border">
              <h2 className="text-xl font-bold text-dark-text">
                {modalType === 'release' ? 'Add New Release' : 'Log Bug Fix'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {modalType === 'release' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-text mb-1">Version *</label>
                      <input
                        type="text"
                        value={releaseForm.version}
                        onChange={e => setReleaseForm(p => ({ ...p, version: e.target.value }))}
                        className="w-full px-3 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="1.0.4"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-text mb-1">Platform</label>
                      <select
                        value={releaseForm.platform}
                        onChange={e => setReleaseForm(p => ({ ...p, platform: e.target.value }))}
                        className="w-full px-3 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {Object.entries(PLATFORMS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">Download URL</label>
                    <input
                      type="url"
                      value={releaseForm.download_url}
                      onChange={e => setReleaseForm(p => ({ ...p, download_url: e.target.value }))}
                      className="w-full px-3 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">Release Notes</label>
                    <textarea
                      value={releaseForm.release_notes}
                      onChange={e => setReleaseForm(p => ({ ...p, release_notes: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Fixed offline alert false positives, updated refresh intervals..."
                    />
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={releaseForm.is_latest}
                      onChange={e => setReleaseForm(p => ({ ...p, is_latest: e.target.checked }))}
                      className="rounded text-primary bg-dark-card-hover border-dark-border"
                    />
                    <span className="text-sm text-dark-text-muted">Mark as latest version</span>
                  </label>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">Title *</label>
                    <input
                      type="text"
                      value={bugForm.title}
                      onChange={e => setBugForm(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-3 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Fix offline alert false positives"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-text mb-1">Severity</label>
                      <select
                        value={bugForm.severity}
                        onChange={e => setBugForm(p => ({ ...p, severity: e.target.value }))}
                        className="w-full px-3 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {Object.entries(SEVERITY_LEVELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-text mb-1">Platform</label>
                      <select
                        value={bugForm.platform}
                        onChange={e => setBugForm(p => ({ ...p, platform: e.target.value }))}
                        className="w-full px-3 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text focus:ring-2 focus:ring-primary focus:border-transparent"
                      >
                        {Object.entries(PLATFORMS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-text mb-1">Fixed In</label>
                      <input
                        type="text"
                        value={bugForm.fixed_in_version}
                        onChange={e => setBugForm(p => ({ ...p, fixed_in_version: e.target.value }))}
                        className="w-full px-3 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                        placeholder="1.0.4"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">Description</label>
                    <textarea
                      value={bugForm.description}
                      onChange={e => setBugForm(p => ({ ...p, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                      placeholder="Details about the fix..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t border-dark-border flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-dark-text-muted hover:bg-dark-card-hover rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={modalType === 'release' ? handleSaveRelease : handleSaveBug}
                disabled={saving || (modalType === 'release' ? !releaseForm.version : !bugForm.title)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50 transition shadow-glow"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-xl max-w-2xl w-full border border-dark-border max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-dark-border">
              <h2 className="text-xl font-bold text-dark-text flex items-center gap-2">
                <span>📧</span> Send Software Update Email
              </h2>
              <p className="text-sm text-dark-text-muted mt-1">
                Notify users about new software updates
              </p>
            </div>

            <div className="p-6 space-y-6">
              {/* Select Releases */}
              <div>
                <label className="block text-sm font-medium text-dark-text mb-3">Select Releases to Include</label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-dark-border rounded-lg p-3">
                  {releases.filter(r => r.is_latest).length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs text-dark-text-muted uppercase tracking-wider mb-2">Latest Versions</div>
                      {releases.filter(r => r.is_latest).map(release => (
                        <label key={release.id} className="flex items-center gap-3 p-2 hover:bg-dark-card-hover rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedReleases.includes(release.id)}
                            onChange={() => toggleReleaseSelection(release.id)}
                            className="rounded text-primary bg-dark-card-hover border-dark-border"
                          />
                          <span className="text-dark-text">
                            {PLATFORMS[release.platform as keyof typeof PLATFORMS]} v{release.version}
                          </span>
                          <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs rounded-full">Latest</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {releases.filter(r => !r.is_latest).slice(0, 5).length > 0 && (
                    <div>
                      <div className="text-xs text-dark-text-muted uppercase tracking-wider mb-2">Previous Versions</div>
                      {releases.filter(r => !r.is_latest).slice(0, 5).map(release => (
                        <label key={release.id} className="flex items-center gap-3 p-2 hover:bg-dark-card-hover rounded cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedReleases.includes(release.id)}
                            onChange={() => toggleReleaseSelection(release.id)}
                            className="rounded text-primary bg-dark-card-hover border-dark-border"
                          />
                          <span className="text-dark-text-muted">
                            {PLATFORMS[release.platform as keyof typeof PLATFORMS]} v{release.version}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
                {selectedReleases.length === 0 && (
                  <p className="text-sm text-red-400 mt-2">Please select at least one release</p>
                )}
              </div>

              {/* Audience Selection */}
              <div>
                <label className="block text-sm font-medium text-dark-text mb-3">Send To</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailForm.sendToFree}
                      onChange={e => setEmailForm(f => ({ ...f, sendToFree: e.target.checked }))}
                      className="rounded text-primary bg-dark-card-hover border-dark-border"
                    />
                    <span className="text-dark-text">Free Users</span>
                    {emailStats && (
                      <span className="text-sm text-dark-text-muted">({emailStats.freeSubscribers})</span>
                    )}
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={emailForm.sendToPro}
                      onChange={e => setEmailForm(f => ({ ...f, sendToPro: e.target.checked }))}
                      className="rounded text-primary bg-dark-card-hover border-dark-border"
                    />
                    <span className="text-dark-text">Pro Users</span>
                    {emailStats && (
                      <span className="text-sm text-dark-text-muted">({emailStats.proSubscribers})</span>
                    )}
                  </label>
                </div>
                {emailStats && (
                  <p className="text-sm text-dark-text-muted mt-2">
                    Total recipients: {(emailForm.sendToFree ? emailStats.freeSubscribers : 0) + (emailForm.sendToPro ? emailStats.proSubscribers : 0)}
                  </p>
                )}
              </div>

              {/* Include Blog */}
              <div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={emailForm.includeBlog}
                    onChange={e => setEmailForm(f => ({ ...f, includeBlog: e.target.checked }))}
                    className="rounded text-primary bg-dark-card-hover border-dark-border"
                  />
                  <div>
                    <span className="text-dark-text">Include Latest Blog Post</span>
                    {emailStats?.latestBlog && (
                      <p className="text-sm text-dark-text-muted">"{emailStats.latestBlog.title}"</p>
                    )}
                  </div>
                </label>
              </div>

              {/* Test Email */}
              <div className="p-4 bg-dark-card-hover rounded-lg border border-dark-border">
                <label className="block text-sm font-medium text-dark-text mb-2">Send Test Email</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emailForm.testEmail}
                    onChange={e => setEmailForm(f => ({ ...f, testEmail: e.target.value }))}
                    placeholder="test@example.com"
                    className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                  <button
                    onClick={() => handleSendEmail(true)}
                    disabled={sendingEmail || !emailForm.testEmail || selectedReleases.length === 0}
                    className="px-4 py-2 bg-dark-border text-dark-text rounded-lg hover:bg-dark-text-muted/30 disabled:opacity-50 transition"
                  >
                    {sendingEmail ? 'Sending...' : 'Send Test'}
                  </button>
                </div>
                {emailResult && emailForm.testEmail && (
                  <p className={`text-sm mt-2 ${emailResult.sent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {emailResult.sent > 0 ? '✓ Test email sent!' : '✗ Failed to send test email'}
                  </p>
                )}
              </div>
            </div>

            <div className="p-6 border-t border-dark-border flex justify-between items-center">
              <button
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 text-dark-text-muted hover:bg-dark-card-hover rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSendEmail(false)}
                disabled={sendingEmail || selectedReleases.length === 0 || (!emailForm.sendToFree && !emailForm.sendToPro)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 transition flex items-center gap-2"
              >
                {sendingEmail ? (
                  <>
                    <span className="animate-spin">⏳</span> Sending...
                  </>
                ) : (
                  <>
                    <span>📧</span> Send to {emailStats ? ((emailForm.sendToFree ? emailStats.freeSubscribers : 0) + (emailForm.sendToPro ? emailStats.proSubscribers : 0)) : 0} Users
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
