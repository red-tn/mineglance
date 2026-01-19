'use client'

import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

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
  tags?: string[]
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
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Preview modal state
  const [showPreviewModal, setShowPreviewModal] = useState(false)
  const [previewPost, setPreviewPost] = useState<BlogPost | null>(null)

  // Status change state
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [statusPost, setStatusPost] = useState<BlogPost | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  // Email modal states
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailPost, setEmailPost] = useState<BlogPost | null>(null)
  const [sendingEmail, setSendingEmail] = useState(false)
  const [emailResult, setEmailResult] = useState<{ sent: number; failed: number } | null>(null)
  const [subscriberCounts, setSubscriberCounts] = useState({ free: 0, pro: 0 })
  const [latestExtension, setLatestExtension] = useState<{ version: string; notes: string[] } | null>(null)
  const [latestWindows, setLatestWindows] = useState<{ version: string; notes: string[] } | null>(null)
  const [latestMac, setLatestMac] = useState<{ version: string; notes: string[] } | null>(null)
  const [emailOptions, setEmailOptions] = useState({
    sendToFree: true,
    sendToPro: true,
    includeExtensionUpdate: false,
    includeWindowsUpdate: false,
    includeMacUpdate: false,
    testEmail: ''
  })

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
    scheduled_at: '',
    tags: ''
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
      scheduled_at: '',
      tags: ''
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
      scheduled_at: post.scheduled_at || '',
      tags: (post.tags || []).join(', ')
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

  async function handleStatusChange(post: BlogPost, newStatus: 'draft' | 'published' | 'scheduled') {
    if (post.status === newStatus) {
      setShowStatusModal(false)
      return
    }

    setUpdatingStatus(true)
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch(`/api/admin/blog/${post.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          title: post.title,
          slug: post.slug,
          content: post.content,
          excerpt: post.excerpt,
          featured_image_url: post.featured_image_url,
          seo_description: post.seo_description,
          status: newStatus,
          is_pinned_homepage: post.is_pinned_homepage,
          is_pinned_dashboard: post.is_pinned_dashboard,
          author_name: post.author_name,
          tags: (post.tags || []).join(', ')
        })
      })

      if (res.ok) {
        fetchPosts()
        setShowStatusModal(false)
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to update status')
      }
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status')
    } finally {
      setUpdatingStatus(false)
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

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const token = localStorage.getItem('admin_token')
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/admin/blog/upload', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`
        },
        body: formData
      })

      if (res.ok) {
        const data = await res.json()
        setForm({ ...form, featured_image_url: data.url })
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to upload image')
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert('Failed to upload image')
    } finally {
      setUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  function handleRemoveImage() {
    setForm({ ...form, featured_image_url: '' })
  }

  async function openEmailModal(post: BlogPost) {
    setEmailPost(post)
    setEmailResult(null)
    setEmailOptions({
      sendToFree: true,
      sendToPro: true,
      includeExtensionUpdate: false,
      includeWindowsUpdate: false,
      includeMacUpdate: false,
      testEmail: ''
    })
    setShowEmailModal(true)

    // Fetch subscriber counts and latest extension
    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/blog/send-email', {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (res.ok) {
        const data = await res.json()
        setSubscriberCounts({
          free: data.freeSubscribers || 0,
          pro: data.proSubscribers || 0
        })
        if (data.latestExtensionVersion) {
          setLatestExtension({
            version: data.latestExtensionVersion,
            notes: data.latestReleaseNotes || []
          })
        }
        if (data.latestWindowsVersion) {
          setLatestWindows({
            version: data.latestWindowsVersion,
            notes: data.windowsReleaseNotes || []
          })
        }
        if (data.latestMacVersion) {
          setLatestMac({
            version: data.latestMacVersion,
            notes: data.macReleaseNotes || []
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch subscriber counts:', error)
    }
  }

  async function handleSendEmail(isTest: boolean) {
    if (!emailPost) return

    setSendingEmail(true)
    setEmailResult(null)

    try {
      const token = localStorage.getItem('admin_token')
      const res = await fetch('/api/admin/blog/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          postId: emailPost.id,
          sendToFree: emailOptions.sendToFree,
          sendToPro: emailOptions.sendToPro,
          includeExtensionUpdate: emailOptions.includeExtensionUpdate,
          extensionVersion: latestExtension?.version,
          releaseNotes: latestExtension?.notes,
          includeWindowsUpdate: emailOptions.includeWindowsUpdate,
          windowsVersion: latestWindows?.version,
          windowsReleaseNotes: latestWindows?.notes,
          includeMacUpdate: emailOptions.includeMacUpdate,
          macVersion: latestMac?.version,
          macReleaseNotes: latestMac?.notes,
          testEmail: isTest ? emailOptions.testEmail : undefined
        })
      })

      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Failed to send emails')
        return
      }

      setEmailResult({ sent: data.sent, failed: data.failed })

      if (isTest) {
        alert(`Test email sent to ${emailOptions.testEmail}`)
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      alert('Failed to send emails')
    } finally {
      setSendingEmail(false)
    }
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

          {/* Posts Table/Cards */}
          {loading ? (
            <div className="text-center py-12 text-dark-text-muted">Loading...</div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12 text-dark-text-muted">No posts found</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block glass-card rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-dark-border">
                      <th className="px-4 py-3 text-left text-dark-text-muted font-medium">Post</th>
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
                          <div className="flex items-center gap-3">
                            {/* Thumbnail */}
                            <div className="w-12 h-12 flex-shrink-0 rounded overflow-hidden border-2 border-white/20">
                              {post.featured_image_url ? (
                                <Image
                                  src={post.featured_image_url}
                                  alt={post.title}
                                  width={48}
                                  height={48}
                                  className="w-full h-full object-cover"
                                  unoptimized
                                />
                              ) : (
                                <div className="w-full h-full bg-dark-border flex items-center justify-center">
                                  <svg className="w-5 h-5 text-dark-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            {/* Title & Info */}
                            <div className="min-w-0">
                              <a
                                href={`/blog/${post.slug}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-white font-medium hover:text-primary transition-colors line-clamp-1"
                              >
                                {post.title}
                                <svg className="inline-block w-3 h-3 ml-1 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                              <div className="text-dark-text-muted text-sm truncate">/blog/{post.slug}</div>
                              <div className="flex gap-2 mt-1">
                                {post.is_pinned_homepage && (
                                  <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Homepage</span>
                                )}
                                {post.is_pinned_dashboard && (
                                  <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Dashboard</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => { setStatusPost(post); setShowStatusModal(true) }}
                            className={`px-2 py-1 rounded text-xs font-medium cursor-pointer hover:ring-2 hover:ring-white/30 transition ${STATUS_COLORS[post.status]}`}
                          >
                            {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                          </button>
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
                            onClick={() => { setPreviewPost(post); setShowPreviewModal(true) }}
                            className="text-purple-400 hover:text-purple-300 mr-3"
                          >
                            Preview
                          </button>
                          {post.status === 'published' && (
                            <button
                              onClick={() => openEmailModal(post)}
                              className="text-blue-400 hover:text-blue-300 mr-3"
                            >
                              Email
                            </button>
                          )}
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

              {/* Mobile Cards */}
              <div className="lg:hidden space-y-3">
                {posts.map((post) => (
                  <div key={post.id} className="glass-card rounded-xl p-4">
                    <div className="flex gap-3 mb-2">
                      {/* Thumbnail */}
                      <div className="w-14 h-14 flex-shrink-0 rounded overflow-hidden border-2 border-white/20">
                        {post.featured_image_url ? (
                          <Image
                            src={post.featured_image_url}
                            alt={post.title}
                            width={56}
                            height={56}
                            className="w-full h-full object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full bg-dark-border flex items-center justify-center">
                            <svg className="w-6 h-6 text-dark-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                      </div>
                      {/* Title & Status */}
                      <div className="flex-1 min-w-0">
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white font-medium hover:text-primary transition-colors block line-clamp-2"
                        >
                          {post.title}
                        </a>
                        <div className="text-dark-text-dim text-xs truncate">/blog/{post.slug}</div>
                      </div>
                      <button
                        onClick={() => { setStatusPost(post); setShowStatusModal(true) }}
                        className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap cursor-pointer hover:ring-2 hover:ring-white/30 transition ${STATUS_COLORS[post.status]}`}
                      >
                        {post.status.charAt(0).toUpperCase() + post.status.slice(1)}
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-3">
                      {post.is_pinned_homepage && (
                        <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">Homepage</span>
                      )}
                      {post.is_pinned_dashboard && (
                        <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">Dashboard</span>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-dark-text-muted mb-3">
                      <span>{post.view_count || 0} views</span>
                      <span>{post.comment_count || 0} comments</span>
                      <span>
                        {post.published_at
                          ? new Date(post.published_at).toLocaleDateString()
                          : new Date(post.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex gap-3 pt-3 border-t border-dark-border flex-wrap">
                      <button
                        onClick={() => { setPreviewPost(post); setShowPreviewModal(true) }}
                        className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg font-medium"
                      >
                        Preview
                      </button>
                      {post.status === 'published' && (
                        <>
                          <a
                            href={`/blog/${post.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-dark-card-hover text-dark-text-muted hover:text-white rounded-lg font-medium transition-colors"
                          >
                            View
                          </a>
                          <button
                            onClick={() => openEmailModal(post)}
                            className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg font-medium"
                          >
                            Email
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => openEditPost(post)}
                        className="flex-1 px-4 py-2 bg-primary/20 text-primary rounded-lg font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
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
        <div className="fixed inset-0 bg-black/70 z-50 overflow-y-auto">
          <div className="min-h-full flex items-start sm:items-center justify-center p-2 sm:p-4">
            <div className="bg-dark-card rounded-xl p-4 sm:p-6 max-w-3xl w-full my-4 sm:my-8">
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
                <label className="block text-dark-text-muted text-sm mb-1">Content (Markdown + HTML supported)</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  rows={12}
                  className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm"
                  placeholder="Write your content using Markdown or HTML. Examples:&#10;&#10;## Heading&#10;**Bold text** and *italic*&#10;&#10;<a href='https://example.com' class='btn'>Click Here</a>&#10;<img src='https://...' alt='Image' />"
                />
                <p className="text-xs text-dark-text-dim mt-1">
                  Supports Markdown (headings, bold, lists, tables) and HTML (images, links, buttons, custom styling)
                </p>
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

              <div>
                <label className="block text-dark-text-muted text-sm mb-2">Featured Image</label>

                {form.featured_image_url ? (
                  <div className="space-y-3">
                    {/* Image Preview */}
                    <div className="relative w-full h-48 bg-dark-bg rounded-lg overflow-hidden border border-dark-border">
                      <Image
                        src={form.featured_image_url}
                        alt="Featured image preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>

                    {/* Image URL (readonly) */}
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={form.featured_image_url}
                        readOnly
                        className="flex-1 px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text-muted text-sm focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => navigator.clipboard.writeText(form.featured_image_url)}
                        className="px-3 py-2 bg-dark-border text-white rounded-lg hover:bg-dark-border/80 text-sm"
                        title="Copy URL"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>

                    {/* Replace/Remove Buttons */}
                    <div className="flex gap-2">
                      <label className="flex-1 cursor-pointer">
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                        <span className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium">
                          {uploading ? (
                            <>
                              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                              Uploading...
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                              </svg>
                              Replace Image
                            </>
                          )}
                        </span>
                      </label>
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Upload Area */}
                    <label className="flex flex-col items-center justify-center w-full h-48 bg-dark-bg border-2 border-dashed border-dark-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      {uploading ? (
                        <div className="flex flex-col items-center">
                          <svg className="w-10 h-10 text-primary animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span className="mt-2 text-dark-text-muted">Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <svg className="w-10 h-10 text-dark-text-muted mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="text-dark-text-muted">Click to upload image</span>
                          <span className="text-dark-text-dim text-sm mt-1">JPG, PNG, GIF, WebP (max 5MB)</span>
                        </>
                      )}
                    </label>

                    {/* Or enter URL manually */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-dark-border"></div>
                      <span className="text-dark-text-dim text-sm">or enter URL</span>
                      <div className="flex-1 h-px bg-dark-border"></div>
                    </div>

                    <input
                      type="text"
                      placeholder="https://example.com/image.jpg"
                      value={form.featured_image_url}
                      onChange={(e) => setForm({ ...form, featured_image_url: e.target.value })}
                      className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-dark-text-dim focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                )}
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

              <div>
                <label className="block text-dark-text-muted text-sm mb-1">SEO Description</label>
                <input
                  type="text"
                  value={form.seo_description}
                  onChange={(e) => setForm({ ...form, seo_description: e.target.value })}
                  className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-dark-text-muted text-sm mb-1">Tags</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                  placeholder="bitcoin, mining, crypto, news"
                  className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white placeholder-dark-text-dim focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <p className="text-xs text-dark-text-dim mt-1">Comma-separated tags for categorization and search</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    <label className="block text-dark-text-muted text-sm mb-1">Scheduled Date & Time</label>
                    <input
                      type="datetime-local"
                      value={form.scheduled_at}
                      onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary [color-scheme:dark]"
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date()
                          d.setHours(d.getHours() + 1, 0, 0, 0)
                          setForm({ ...form, scheduled_at: d.toISOString().slice(0, 16) })
                        }}
                        className="px-3 py-1 text-xs bg-dark-border text-dark-text-muted rounded hover:bg-dark-card-hover"
                      >
                        +1 hour
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date()
                          d.setDate(d.getDate() + 1)
                          d.setHours(9, 0, 0, 0)
                          setForm({ ...form, scheduled_at: d.toISOString().slice(0, 16) })
                        }}
                        className="px-3 py-1 text-xs bg-dark-border text-dark-text-muted rounded hover:bg-dark-card-hover"
                      >
                        Tomorrow 9am
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const d = new Date()
                          d.setDate(d.getDate() + 7)
                          d.setHours(9, 0, 0, 0)
                          setForm({ ...form, scheduled_at: d.toISOString().slice(0, 16) })
                        }}
                        className="px-3 py-1 text-xs bg-dark-border text-dark-text-muted rounded hover:bg-dark-card-hover"
                      >
                        Next week
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
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

            <div className="flex gap-3 mt-6 sticky bottom-0 bg-dark-card pt-4 -mx-4 sm:-mx-6 px-4 sm:px-6 pb-4 sm:pb-6 -mb-4 sm:-mb-6 border-t border-dark-border">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-3 bg-dark-border text-white rounded-lg hover:bg-dark-border/80"
              >
                Cancel
              </button>
              <button
                onClick={handleSavePost}
                disabled={saving}
                className="flex-1 btn-primary px-4 py-3 rounded-lg font-medium disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingPost ? 'Update Post' : 'Create Post'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && emailPost && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-card rounded-xl p-6 max-w-lg w-full">
            <h2 className="text-xl font-bold text-white mb-4">
              Send Blog Email
            </h2>

            <div className="mb-4 p-3 bg-dark-bg rounded-lg">
              <p className="text-white font-medium truncate">{emailPost.title}</p>
              <p className="text-dark-text-muted text-sm">/blog/{emailPost.slug}</p>
            </div>

            {emailResult ? (
              <div className="mb-6">
                <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
                  <p className="text-green-400 font-semibold text-lg mb-1">Emails Sent!</p>
                  <p className="text-dark-text-muted">
                    {emailResult.sent} sent, {emailResult.failed} failed
                  </p>
                </div>
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="w-full mt-4 px-4 py-3 bg-dark-border text-white rounded-lg hover:bg-dark-border/80"
                >
                  Close
                </button>
              </div>
            ) : (
              <>
                {/* Audience Selection */}
                <div className="mb-4">
                  <label className="block text-dark-text-muted text-sm mb-2">Send to:</label>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-dark-bg rounded-lg cursor-pointer hover:bg-dark-card-hover">
                      <input
                        type="checkbox"
                        checked={emailOptions.sendToFree}
                        onChange={(e) => setEmailOptions({ ...emailOptions, sendToFree: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-white">Free users</span>
                      <span className="ml-auto text-dark-text-muted text-sm">{subscriberCounts.free} subscribers</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-dark-bg rounded-lg cursor-pointer hover:bg-dark-card-hover">
                      <input
                        type="checkbox"
                        checked={emailOptions.sendToPro}
                        onChange={(e) => setEmailOptions({ ...emailOptions, sendToPro: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <span className="text-white">Pro users</span>
                      <span className="ml-auto text-dark-text-muted text-sm">{subscriberCounts.pro} subscribers</span>
                    </label>
                  </div>
                </div>

                {/* Software Update Options */}
                <div className="mb-4 space-y-2">
                  <p className="text-dark-text-muted text-sm mb-2">Include software updates:</p>
                  {latestExtension && (
                    <label className="flex items-center gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailOptions.includeExtensionUpdate}
                        onChange={(e) => setEmailOptions({ ...emailOptions, includeExtensionUpdate: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-white font-medium">🧩 Browser Extension</span>
                        <p className="text-blue-400 text-sm">v{latestExtension.version}</p>
                      </div>
                    </label>
                  )}
                  {latestWindows && (
                    <label className="flex items-center gap-3 p-3 bg-sky-500/10 border border-sky-500/30 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailOptions.includeWindowsUpdate}
                        onChange={(e) => setEmailOptions({ ...emailOptions, includeWindowsUpdate: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-white font-medium">🖥️ Windows Desktop</span>
                        <p className="text-sky-400 text-sm">v{latestWindows.version}</p>
                      </div>
                    </label>
                  )}
                  {latestMac && (
                    <label className="flex items-center gap-3 p-3 bg-gray-500/10 border border-gray-500/30 rounded-lg cursor-pointer">
                      <input
                        type="checkbox"
                        checked={emailOptions.includeMacUpdate}
                        onChange={(e) => setEmailOptions({ ...emailOptions, includeMacUpdate: e.target.checked })}
                        className="w-4 h-4 rounded"
                      />
                      <div className="flex-1">
                        <span className="text-white font-medium">🍎 macOS Desktop</span>
                        <p className="text-gray-400 text-sm">v{latestMac.version}</p>
                      </div>
                    </label>
                  )}
                </div>

                {/* Test Email */}
                <div className="mb-4">
                  <label className="block text-dark-text-muted text-sm mb-2">Send test email to:</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={emailOptions.testEmail}
                      onChange={(e) => setEmailOptions({ ...emailOptions, testEmail: e.target.value })}
                      placeholder="your@email.com"
                      className="flex-1 px-4 py-2 bg-dark-bg border border-dark-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <button
                      onClick={() => handleSendEmail(true)}
                      disabled={sendingEmail || !emailOptions.testEmail}
                      className="px-4 py-2 bg-dark-border text-white rounded-lg hover:bg-dark-border/80 disabled:opacity-50"
                    >
                      {sendingEmail ? 'Sending...' : 'Test'}
                    </button>
                  </div>
                </div>

                {/* Total Recipients */}
                <div className="mb-6 p-3 bg-dark-bg rounded-lg text-center">
                  <p className="text-dark-text-muted text-sm">Total recipients:</p>
                  <p className="text-white text-2xl font-bold">
                    {(emailOptions.sendToFree ? subscriberCounts.free : 0) + (emailOptions.sendToPro ? subscriberCounts.pro : 0)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="flex-1 px-4 py-3 bg-dark-border text-white rounded-lg hover:bg-dark-border/80"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleSendEmail(false)}
                    disabled={sendingEmail || (!emailOptions.sendToFree && !emailOptions.sendToPro)}
                    className="flex-1 btn-primary px-4 py-3 rounded-lg font-medium disabled:opacity-50"
                  >
                    {sendingEmail ? 'Sending...' : 'Send to All'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {showPreviewModal && previewPost && (
        <div className="fixed inset-0 bg-black/80 z-50 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4">
            <div className="bg-dark-bg rounded-xl max-w-4xl w-full my-8 border border-dark-border">
              {/* Header */}
              <div className="sticky top-0 bg-dark-card border-b border-dark-border p-4 flex items-center justify-between rounded-t-xl">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${STATUS_COLORS[previewPost.status]}`}>
                    {previewPost.status.charAt(0).toUpperCase() + previewPost.status.slice(1)}
                  </span>
                  <h2 className="text-lg font-semibold text-white">Preview</h2>
                </div>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-2 hover:bg-dark-border rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Featured Image */}
                {previewPost.featured_image_url && (
                  <div className="relative h-64 rounded-xl overflow-hidden mb-6">
                    <Image
                      src={previewPost.featured_image_url}
                      alt={previewPost.title}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                )}

                {/* Title & Meta */}
                <h1 className="text-3xl font-bold text-white mb-4">{previewPost.title}</h1>
                <div className="flex flex-wrap items-center gap-4 text-dark-text-muted mb-8">
                  <span>By {previewPost.author_name}</span>
                  <span>•</span>
                  <span>/blog/{previewPost.slug}</span>
                </div>

                {/* Excerpt */}
                {previewPost.excerpt && (
                  <p className="text-lg text-dark-text-muted italic border-l-4 border-primary pl-4 mb-8">
                    {previewPost.excerpt}
                  </p>
                )}

                {/* Content */}
                <div className="prose prose-invert max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: ({ children }) => <h1 className="text-3xl font-bold text-white mt-8 mb-4">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-2xl font-bold text-white mt-8 mb-4">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-xl font-semibold text-white mt-6 mb-3">{children}</h3>,
                      h4: ({ children }) => <h4 className="text-lg font-semibold text-white mt-4 mb-2">{children}</h4>,
                      p: ({ children }) => <p className="mb-4 text-dark-text-muted leading-relaxed">{children}</p>,
                      a: ({ href, children }) => <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                      strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                      em: ({ children }) => <em>{children}</em>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-4 text-dark-text-muted space-y-2">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-4 text-dark-text-muted space-y-2">{children}</ol>,
                      li: ({ children }) => <li>{children}</li>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-primary pl-4 my-4 italic text-dark-text-muted">{children}</blockquote>,
                      code: ({ className, children }) => {
                        const isInline = !className
                        return isInline
                          ? <code className="bg-dark-card px-1.5 py-0.5 rounded text-primary text-sm">{children}</code>
                          : <code className={`block bg-dark-card p-4 rounded-lg overflow-x-auto text-sm ${className || ''}`}>{children}</code>
                      },
                      pre: ({ children }) => <pre className="bg-dark-card p-4 rounded-lg overflow-x-auto mb-4">{children}</pre>,
                      table: ({ children }) => <table className="w-full border-collapse mb-4">{children}</table>,
                      th: ({ children }) => <th className="border border-dark-border px-4 py-2 bg-dark-card text-left text-white font-semibold">{children}</th>,
                      td: ({ children }) => <td className="border border-dark-border px-4 py-2 text-dark-text-muted">{children}</td>,
                      img: ({ src, alt }) => (
                        <span className="block my-4">
                          <Image src={src || ''} alt={alt || ''} width={800} height={400} className="rounded-lg max-w-full h-auto" unoptimized />
                        </span>
                      ),
                      hr: () => <hr className="border-dark-border my-8" />,
                    }}
                  >
                    {previewPost.content || '*No content yet*'}
                  </ReactMarkdown>
                </div>
              </div>

              {/* Footer */}
              <div className="sticky bottom-0 bg-dark-card border-t border-dark-border p-4 flex gap-3 rounded-b-xl">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="flex-1 px-4 py-3 bg-dark-border text-white rounded-lg hover:bg-dark-border/80"
                >
                  Close
                </button>
                <button
                  onClick={() => { setShowPreviewModal(false); openEditPost(previewPost) }}
                  className="flex-1 btn-primary px-4 py-3 rounded-lg font-medium"
                >
                  Edit Post
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && statusPost && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-dark-card rounded-xl p-6 max-w-sm w-full">
            <h2 className="text-xl font-bold text-white mb-4">Change Status</h2>
            <p className="text-dark-text-muted mb-4 text-sm truncate">{statusPost.title}</p>

            <div className="space-y-2 mb-6">
              {(['draft', 'published', 'scheduled'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(statusPost, status)}
                  disabled={updatingStatus}
                  className={`w-full p-3 rounded-lg text-left flex items-center justify-between transition ${
                    statusPost.status === status
                      ? 'bg-primary/20 border-2 border-primary'
                      : 'bg-dark-bg hover:bg-dark-card-hover border-2 border-transparent'
                  } ${updatingStatus ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-3 h-3 rounded-full ${
                      status === 'draft' ? 'bg-gray-400' :
                      status === 'published' ? 'bg-green-400' :
                      'bg-blue-400'
                    }`} />
                    <span className="text-white font-medium capitalize">{status}</span>
                  </div>
                  {statusPost.status === status && (
                    <span className="text-primary text-sm">Current</span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowStatusModal(false)}
                disabled={updatingStatus}
                className="flex-1 px-4 py-2 bg-dark-border text-white rounded-lg hover:bg-dark-border/80 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
