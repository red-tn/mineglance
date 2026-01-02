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

const PLATFORMS = {
  extension: 'Chrome Extension',
  mobile_ios: 'Mobile iOS',
  mobile_android: 'Mobile Android',
  website: 'Website',
  api: 'API'
}

const SEVERITY_LEVELS = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  critical: 'Critical'
}

const SEVERITY_COLORS: Record<string, string> = {
  low: 'bg-gray-100 text-gray-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  critical: 'bg-red-100 text-red-800'
}

export default function AdminSoftwarePage() {
  const [releases, setReleases] = useState<SoftwareRelease[]>([])
  const [bugFixes, setBugFixes] = useState<BugFix[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'releases' | 'bugs'>('releases')
  const [showAddModal, setShowAddModal] = useState(false)
  const [modalType, setModalType] = useState<'release' | 'bug'>('release')
  const [saving, setSaving] = useState(false)

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
        <h1 className="text-2xl font-bold text-gray-900">Software Management</h1>
        <div className="flex gap-2">
          <button
            onClick={() => openAddModal('bug')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition"
          >
            + Log Bug/Fix
          </button>
          <button
            onClick={() => openAddModal('release')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
          >
            + New Release
          </button>
        </div>
      </div>

      {/* Latest Versions Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(PLATFORMS).filter(([k]) => k !== 'api').map(([key, label]) => (
          <div key={key} className="bg-white rounded-xl p-4 shadow-sm">
            <div className="text-sm text-gray-500">{label}</div>
            <div className="text-2xl font-bold text-primary">
              v{latestVersions[key] || '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        <button
          onClick={() => setActiveTab('releases')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'releases'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Releases ({releases.length})
        </button>
        <button
          onClick={() => setActiveTab('bugs')}
          className={`px-4 py-2 font-medium border-b-2 transition ${
            activeTab === 'bugs'
              ? 'border-primary text-primary'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          Bug Fixes ({bugFixes.length})
        </button>
      </div>

      {/* Releases Tab */}
      {activeTab === 'releases' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Version</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Release Notes</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Download</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {releases.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No releases found
                  </td>
                </tr>
              ) : (
                releases.map(release => (
                  <tr key={release.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">v{release.version}</span>
                        {release.is_latest && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full">Latest</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {PLATFORMS[release.platform as keyof typeof PLATFORMS] || release.platform}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {release.release_notes || '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(release.released_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {release.download_url ? (
                        <a href={release.download_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Download
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDelete('release', release.id)}
                        className="text-red-600 hover:underline"
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

      {/* Bug Fixes Tab */}
      {activeTab === 'bugs' && (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Platform</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fixed In</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {bugFixes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No bug fixes logged
                  </td>
                </tr>
              ) : (
                bugFixes.map(bug => (
                  <tr key={bug.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{bug.title}</div>
                      {bug.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">{bug.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs ${SEVERITY_COLORS[bug.severity] || 'bg-gray-100 text-gray-800'}`}>
                        {SEVERITY_LEVELS[bug.severity as keyof typeof SEVERITY_LEVELS] || bug.severity}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {PLATFORMS[bug.platform as keyof typeof PLATFORMS] || bug.platform}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      v{bug.fixed_in_version}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(bug.fixed_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleDelete('bug', bug.id)}
                        className="text-red-600 hover:underline"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {modalType === 'release' ? 'Add New Release' : 'Log Bug Fix'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              {modalType === 'release' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Version *</label>
                      <input
                        type="text"
                        value={releaseForm.version}
                        onChange={e => setReleaseForm(p => ({ ...p, version: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="1.0.4"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                      <select
                        value={releaseForm.platform}
                        onChange={e => setReleaseForm(p => ({ ...p, platform: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      >
                        {Object.entries(PLATFORMS).filter(([k]) => k !== 'api').map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Download URL</label>
                    <input
                      type="url"
                      value={releaseForm.download_url}
                      onChange={e => setReleaseForm(p => ({ ...p, download_url: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Release Notes</label>
                    <textarea
                      value={releaseForm.release_notes}
                      onChange={e => setReleaseForm(p => ({ ...p, release_notes: e.target.value }))}
                      rows={4}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      placeholder="Fixed offline alert false positives, updated refresh intervals..."
                    />
                  </div>

                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={releaseForm.is_latest}
                      onChange={e => setReleaseForm(p => ({ ...p, is_latest: e.target.checked }))}
                      className="rounded text-primary"
                    />
                    <span className="text-sm text-gray-700">Mark as latest version</span>
                  </label>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                    <input
                      type="text"
                      value={bugForm.title}
                      onChange={e => setBugForm(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      placeholder="Fix offline alert false positives"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                      <select
                        value={bugForm.severity}
                        onChange={e => setBugForm(p => ({ ...p, severity: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      >
                        {Object.entries(SEVERITY_LEVELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
                      <select
                        value={bugForm.platform}
                        onChange={e => setBugForm(p => ({ ...p, platform: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      >
                        {Object.entries(PLATFORMS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fixed In</label>
                      <input
                        type="text"
                        value={bugForm.fixed_in_version}
                        onChange={e => setBugForm(p => ({ ...p, fixed_in_version: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                        placeholder="1.0.4"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={bugForm.description}
                      onChange={e => setBugForm(p => ({ ...p, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                      placeholder="Details about the fix..."
                    />
                  </div>
                </>
              )}
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={modalType === 'release' ? handleSaveRelease : handleSaveBug}
                disabled={saving || (modalType === 'release' ? !releaseForm.version : !bugForm.title)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
