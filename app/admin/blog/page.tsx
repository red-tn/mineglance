'use client'

import { useEffect, useState } from 'react'

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  featured_image_url: string | null
  seo_description: string | null
  status: 'draft' | 'published' | 'scheduled'
  is_pinned_homepage: boolean
  is_pinned_dashboard: boolean
  view_count: number
  author_name: string
  published_at: string | null
  scheduled_at: string | null
  created_at: string
  comment_count?: number
}

interface BlogComment {
  id: string
  content: string
  is_approved: boolean
  is_flagged: boolean
  admin_response: string | null
  created_at: string
  blog_posts: { id: string; title: string; slug: string }
  users: { id: string; email: string }
}

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-500/20 text-gray-300',
  published: 'bg-green-500/20 text-green-400',
  scheduled: 'bg-blue-500/20 text-blue-400'
}

export default function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [comments, setComments] = useState<BlogComment[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'posts' | 'comments'>('posts')
  const [statusFilter, setStatusFilter] = useState('all')
  const [commentFilter, setCommentFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Modal states
  const [showModal, setShowModal] = useState(false)
  const [editingPost, setEditingPost] = useState<BlogPost | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [form, setForm] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featured_image_url: '',
    seo_description: '',
    status: 'draft' as 'draft' | 'published' | 'scheduled',
    is_pinned_homepage: false,
    is_pinned_dashboard: false,
    author_name: 'MineGlance Team',
    scheduled_at: ''
  })

  useEffect(() => {
    if (activeTab === 'posts') {
      fetchPosts()
    } else {
      fetchComments()
    }
  }, [activeTab, statusFilter, commentFilter, search, page])

  async function fetchPosts() {
    try {
      setLoading(true)
      const token = localStorage.getItem('admin_token')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(search && { search })
      })

      const res = await fetch(`/api/admin/blog?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch posts:', error)
    } finally {
      setLoading(false)
    }
  }

  async function fetchComments() {
    try {
      setLoading(true)
      const token = localStorage.getItem('admin_token')
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(commentFilter !== 'all' && { filter: commentFilter })
      })

      const res = await fetch(`/api/admin/blog/comments?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setComments(data.comments || [])
        setTotalPages(data.totalPages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch comments:', error)
    } finally {
      setLoading(false)
    }
  }

  function openNewPost() {
    setEditingPost(null)
    setForm({
      title: '',
      slug: '',
      content: '',
      excerpt: '',
      featured_image_url: '',
      seo_description: '',
      status: 'draft',
      is_pinned_homepage: false,
      is_pinned_dashboard: false,
      author_name: 'MineGlance Team',
      scheduled_at: ''
    })
    setShowModal(true)
  }

  function openEditPost(post: BlogPost) {
    setEditingPost(post)
    setForm({
      title: post.title,
      slug: post.slug,
      content: post.content || '',
      excerpt: post.excerpt || '',
      featured_image_url: post.featured_image_url || '',
      seo_description: post.seo_description || '',
      status: post.status,
      is_pinned_homepage: post.is_pinned_homepage,
      is_pinned_dashboard: post.is_pinned_dashboard,
      author_name: post.author_name || 'MineGlance Team',
      scheduled_at: post.scheduled_at || ''
    })
    setShowModal(true)
  }

  async function handleSavePost() {
    if (!form.title.trim()) {
      alert('Title is required')
      return
    }

    setSaving(true)
    try {
      const token = localStorage.getItem('admin_token')
      const url = editingPost
        ? `/api/admin/blog/${editingPost.id}`
        : '/api/admin/blog'

      const res = await fetch(url, {
        method: editingPost ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(form)
      })

      if (res.ok) {
        setShowModal(false)
        fetchPosts()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to save post')
      }
    } catch (error) {
      console.error('Failed to save post:', error)
      alert('Failed to save post')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeletePost(id: string) {
    if (!confirm('Are you sure you want to delete this post? This will also delete all comments.')) {
      return
    }

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/admin/blog/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        fetchPosts()
      } else {
        alert('Failed to delete post')
      }
    } catch (error) {
      console.error('Failed to delete post:', error)
    }
  }

  async function handleCommentAction(id: string, action: string, adminResponse?: string) {
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/blog/comments', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ id, action, admin_response: adminResponse })
      })

      if (res.ok) {
        fetchComments()
      }
    } catch (error) {
      console.error('Failed to update comment:', error)
    }
  }

  async function handleDeleteComment(id: string) {
    if (!confirm('Delete this comment?')) return

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/admin/blog/comments?id=${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        fetchComments()
      }
    } catch (error) {
      console.error('Failed to delete comment:', error)
    }
  }

  function generateSlug(title: string) {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 100)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Blog Management</h1>
        {activeTab === 'posts' && (
          <button
            onClick={openNewPost}
            className="btn-primary px-4 py-2 rounded-lg font-medium"
          >
            + New Post
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-dark-border">
        <button
          onClick={() => { setActiveTab('posts'); setPage(1) }}
          className={`pb-3 px-2 font-medium transition-colors ${
            activeTab === 'posts'
              ? 'text-primary border-b-2 border-primary'
              : 'text-dark-text-muted hover:text-white'
          }`}
        >
          Posts
        </button>
        <button
          onClick={() => { setActiveTab('comments'); setPage(1) }}
          className={`pb-3 px-2 font-medium transition-colors ${
            activeTab === 'comments'
              ? 'text-primary border-b-2 border-primary'
              : 'text-dark-text-muted hover:text-white'
          }`}
        >
          Comments
        </button>
      </div>

      {/* Posts Tab */}
      {activeTab === 'posts' && (
        <>
          {/* Filters */}
          <div className="flex gap-4 flex-wrap">
            <input
              type="text"
              placeholder="Search posts..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white placeholder-dark-text-muted focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
              className="px-4 py-2 bg-dark-card border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
            </select>
          </div>

          {/* Posts Table */}
          {loading ? (
            <div className="text-center py-12 text-dark-text-muted">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-dark-text-muted">No posts found</div>
          ) : (
            <div className="glass-card rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-dark-border">
                    <th className="px-4 py-3 text-left text-dark-text-muted font-medium">Title</th>
                    <th className="px-4 py-3 text-left text-dark-text-muted font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-dark-text-muted font-medium">Views</th>
                    <th className="px-4 py-3 text-left text-dark-text-muted font-medium">Comments</th>
                    <th className="px-4 py-3 text-left text-dark-text-muted font-medium">Date</th>
                    <th className="px-4 py-3 text-right text-dark-text-muted font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {posts.map((post) => (
                    <tr key={post.id} className="border-b border-dark-border/50 hover:bg-dark-card/50">
                      <td className="px-4 py-3">
                        <div>
                          <div className="text-white font-medium">{post.title}</div>
                          <div className="text-dark-text-muted text-sm">/blog/{post.slug}</div>
                          <div className="flex gap-2 mt-1">
                            {post.is_pinned_homepage && (
                              <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Homepage</span>
                            )}
                            {post.is_pinned_dashboard && (
                              <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Dashboard</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[post.status]}`}>
                          {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-dark-text-muted">{post.view_count || 0}</td>
                      <td className="px-4 py-3 text-dark-text-muted">{post.comment_count || 0}</td>
                      <td className="px-4 py-3 text-dark-text-muted text-sm">
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString()
                          : new Date(post.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => openEditPost(post)}
                          className="text-primary hover:text-primary-light mr-3"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          className="text-red-400 hover:text-red-300"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && (
        <>
          {/* Comment Filters */}
          <div className="flex gap-2">
            {['all', 'pending', 'flagged'].map((filter) => (
              <button
                key={filter}
                onClick={() => { setCommentFilter(filter); setPage(1) }}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  commentFilter === filter
                    ? 'bg-primary text-white'
                    : 'bg-dark-card text-dark-text-muted hover:text-white'
                }`}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          {/* Comments List */}
          {loading ? (
            <div className="text-center py-12 text-dark-text-muted">Loading...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-dark-text-muted">No comments found</div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="glass-card rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-white font-medium">{comment.users?.email}</span>
                      <span className="text-dark-text-muted mx-2">on</span>
                      <span className="text-primary">{comment.blog_posts?.title}</span>
                    </div>
                    <div className="flex gap-2">
                      {comment.is_flagged && (
                        <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">Flagged</span>
                      )}
                      {!comment.is_approved && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded">Pending</span>
                      )}
                    </div>
                  </div>
                  <p className="text-dark-text-muted mb-3">{comment.content}</p>
                  {comment.admin_response && (
                    <div className="bg-primary/10 rounded-lg p-3 mb-3">
                      <div className="text-xs text-primary mb-1">Admin Response:</div>
                      <p className="text-white text-sm">{comment.admin_response}</p>
                    </div>
                  )}
                  <div className="flex gap-2 text-sm">
                    {!comment.is_approved && (
                      <button
                        onClick={() => handleCommentAction(comment.id, 'approve')}
                        className="text-green-400 hover:text-green-300"
                      >
                        Approve
                      </button>
                    )}
                    {comment.is_flagged ? (
                      <button
                        onClick={() => handleCommentAction(comment.id, 'unflag')}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Unflag
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCommentAction(comment.id, 'flag')}
                        className="text-yellow-400 hover:text-yellow-300"
                      >
                        Flag
                      </button>
                    )}
                    <button
                      onClick={() => {
                        const response = prompt('Admin response:')
                        if (response) handleCommentAction(comment.id, 'respond', response)
                      }}
                      className="text-primary hover:text-primary-light"
                    >
                      Respond
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 bg-dark-card rounded-lg text-white disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-4 py-2 text-dark-text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 bg-dark-card rounded-lg text-white disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Post Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-dark-card rounded-xl p-6 max-w-3xl w-full my-8 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-white mb-6">
              {editingPost ? 'Edit Post' : 'New Post'}
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-dark-text-muted text-sm mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => {
                    setForm({ ...form, title: e.target.value })
                    if (!editingPost) {
                      setForm(f => ({ ...f, slug: generateSlug(e.target.value) }))
                    }
                  }}
                  className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-dark-text-muted text-sm mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-dark-text-muted text-sm mb-1">Content (Markdown)</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={12}
                  className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                />
              </div>

              <div>
                <label className="block text-dark-text-muted text-sm mb-1">Excerpt</label>
                <textarea
                  value={form.excerpt}
                  onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
                  rows={2}
                  className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-text-muted text-sm mb-1">Featured Image URL</label>
                  <input
                    type="text"
                    value={form.featured_image_url}
                    onChange={(e) => setForm({ ...form, featured_image_url: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-dark-text-muted text-sm mb-1">Author</label>
                  <input
                    type="text"
                    value={form.author_name}
                    onChange={(e) => setForm({ ...form, author_name: e.target.value })}
                    className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label className="block text-dark-text-muted text-sm mb-1">SEO Description</label>
                <input
                  type="text"
                  value={form.seo_description}
                  onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-text-muted text-sm mb-1">Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as typeof form.status })}
                    className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="scheduled">Scheduled</option>
                  </select>
                </div>

                {form.status === 'scheduled' && (
                  <div>
                    <label className="block text-dark-text-muted text-sm mb-1">Scheduled Date</label>
                    <input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                      className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_pinned_homepage}
                    onChange={(e) => setForm({ ...form, is_pinned_homepage: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-white">Pin to Homepage</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={form.is_pinned_dashboard}
                    onChange={(e) => setForm({ ...form, is_pinned_dashboard: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-white">Pin to Dashboard</span>
                </label>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 bg-dark-border text-white rounded-lg hover:bg-dark-border/80"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePost}
                disabled={saving}
                className="flex-1 btn-primary px-4 py-2 rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingPost ? 'Update Post' : 'Create Post'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
