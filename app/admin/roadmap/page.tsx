'use client'

import { useEffect, useState } from 'react'

interface RoadmapItem {
  id: string
  category: string
  priority: string
  platforms: string[]
  title: string
  description: string
  submitter_email: string
  submitter_license: string
  status: string
  progress: number
  admin_response: string
  target_version: string
  is_public: boolean
  is_internal: boolean
  created_at: string
  updated_at: string
}

const CATEGORIES = {
  new_pool: 'New Pool',
  new_coin: 'New Coin',
  feature: 'Feature Request',
  ui_ux: 'UI/UX Improvement',
  integration: 'Integration',
  bug_report: 'Bug Report',
  other: 'Other'
}

const PRIORITIES = {
  nice_to_have: 'Nice to Have',
  would_help: 'Would Help',
  really_need: 'Really Need'
}

const STATUSES = {
  submitted: 'Submitted',
  reviewing: 'Reviewing',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  declined: 'Declined'
}

const STATUS_COLORS: Record<string, string> = {
  submitted: 'bg-gray-100 text-gray-800',
  reviewing: 'bg-yellow-100 text-yellow-800',
  planned: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  declined: 'bg-red-100 text-red-800'
}

export default function AdminRoadmapPage() {
  const [items, setItems] = useState<RoadmapItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingItem, setEditingItem] = useState<RoadmapItem | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state for add/edit
  const [formData, setFormData] = useState({
    category: 'feature',
    priority: 'would_help',
    platforms: [] as string[],
    title: '',
    description: '',
    status: 'submitted',
    progress: 0,
    admin_response: '',
    target_version: '',
    is_public: true,
    is_internal: false
  })

  useEffect(() => {
    fetchItems()
  }, [])

  async function fetchItems() {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/roadmap', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setItems(data.items || [])
      }
    } catch (error) {
      console.error('Failed to fetch roadmap items:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    setSaving(true)
    try {
      const token = localStorage.getItem('admin_token')
      const url = editingItem
        ? `/api/admin/roadmap/${editingItem.id}`
        : '/api/admin/roadmap'

      const res = await fetch(url, {
        method: editingItem ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        fetchItems()
        closeModal()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save')
      }
    } catch (error) {
      console.error('Failed to save:', error)
      alert('Failed to save item')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/admin/roadmap/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        fetchItems()
      }
    } catch (error) {
      console.error('Failed to delete:', error)
    }
  }

  function openAddModal() {
    setFormData({
      category: 'feature',
      priority: 'would_help',
      platforms: [],
      title: '',
      description: '',
      status: 'planned',
      progress: 0,
      admin_response: '',
      target_version: '',
      is_public: true,
      is_internal: true
    })
    setEditingItem(null)
    setShowAddModal(true)
  }

  function openEditModal(item: RoadmapItem) {
    setFormData({
      category: item.category,
      priority: item.priority,
      platforms: item.platforms || [],
      title: item.title,
      description: item.description || '',
      status: item.status,
      progress: item.progress,
      admin_response: item.admin_response || '',
      target_version: item.target_version || '',
      is_public: item.is_public,
      is_internal: item.is_internal
    })
    setEditingItem(item)
    setShowAddModal(true)
  }

  function closeModal() {
    setShowAddModal(false)
    setEditingItem(null)
  }

  function togglePlatform(platform: string) {
    setFormData(prev => ({
      ...prev,
      platforms: prev.platforms.includes(platform)
        ? prev.platforms.filter(p => p !== platform)
        : [...prev.platforms, platform]
    }))
  }

  const filteredItems = filter === 'all'
    ? items
    : items.filter(item => item.status === filter)

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
        <h1 className="text-2xl font-bold text-gray-900">Roadmap Management</h1>
        <button
          onClick={openAddModal}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition"
        >
          + Add Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-full text-sm ${filter === 'all' ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          All ({items.length})
        </button>
        {Object.entries(STATUSES).map(([key, label]) => {
          const count = items.filter(i => i.status === key).length
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1 rounded-full text-sm ${filter === key ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700'}`}
            >
              {label} ({count})
            </button>
          )
        })}
      </div>

      {/* Items List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No roadmap items found
                </td>
              </tr>
            ) : (
              filteredItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{item.title}</div>
                    {item.description && (
                      <div className="text-sm text-gray-500 truncate max-w-xs">{item.description}</div>
                    )}
                    {item.target_version && (
                      <div className="text-xs text-primary">Target: v{item.target_version}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {CATEGORIES[item.category as keyof typeof CATEGORIES] || item.category}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      item.priority === 'really_need' ? 'bg-red-100 text-red-800' :
                      item.priority === 'would_help' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {PRIORITIES[item.priority as keyof typeof PRIORITIES] || item.priority}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUSES[item.status as keyof typeof STATUSES] || item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">{item.progress}%</div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.is_internal ? (
                      <span className="text-primary font-medium">Internal</span>
                    ) : (
                      <span className="text-gray-500">User</span>
                    )}
                    {!item.is_public && (
                      <span className="ml-1 text-xs text-red-500">(Hidden)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => openEditModal(item)}
                      className="text-primary hover:underline mr-3"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
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

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-bold">
                {editingItem ? 'Edit Roadmap Item' : 'Add Roadmap Item'}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  placeholder="Feature title..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={e => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(CATEGORIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(PRIORITIES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Platforms</label>
                <div className="flex gap-2 flex-wrap">
                  {['Extension', 'Mobile App', 'Website', 'Dashboard'].map(platform => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() => togglePlatform(platform)}
                      className={`px-3 py-1 rounded-full text-sm border ${
                        formData.platforms.includes(platform)
                          ? 'bg-primary text-white border-primary'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="Describe the feature or request..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  >
                    {Object.entries(STATUSES).map(([key, label]) => (
                      <option key={key} value={key}>{label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Progress ({formData.progress}%)</label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={formData.progress}
                    onChange={e => setFormData(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
                    className="w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Version</label>
                <input
                  type="text"
                  value={formData.target_version}
                  onChange={e => setFormData(prev => ({ ...prev, target_version: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="e.g., 1.0.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Admin Response</label>
                <textarea
                  value={formData.admin_response}
                  onChange={e => setFormData(prev => ({ ...prev, admin_response: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary"
                  placeholder="Response to user (shown on public roadmap)..."
                />
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={e => setFormData(prev => ({ ...prev, is_public: e.target.checked }))}
                    className="rounded text-primary"
                  />
                  <span className="text-sm text-gray-700">Show on public roadmap</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.is_internal}
                    onChange={e => setFormData(prev => ({ ...prev, is_internal: e.target.checked }))}
                    className="rounded text-primary"
                  />
                  <span className="text-sm text-gray-700">Internal (admin-created)</span>
                </label>
              </div>
            </div>

            <div className="p-6 border-t flex justify-end gap-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !formData.title}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingItem ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
