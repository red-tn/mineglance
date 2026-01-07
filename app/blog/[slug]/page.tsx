'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string
  featured_image_url: string | null
  seo_description: string | null
  author_name: string
  published_at: string
  view_count: number
  read_time: number
}

interface Comment {
  id: string
  content: string
  parent_id: string | null
  admin_response: string | null
  created_at: string
  user_name: string
  display_name: string
  profile_photo_url: string | null
}

interface RelatedPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image_url: string | null
  published_at: string
}

export default function BlogPostPage() {
  const params = useParams()
  const slug = params.slug as string

  const [post, setPost] = useState<BlogPost | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [relatedPosts, setRelatedPosts] = useState<RelatedPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Comment form state
  const [commentText, setCommentText] = useState('')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [commentError, setCommentError] = useState<string | null>(null)

  useEffect(() => {
    // Check for auth token in localStorage (user dashboard token)
    const token = localStorage.getItem('user_token')
    setAuthToken(token)
  }, [])

  const fetchPost = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/blog/${slug}`)
      if (!res.ok) {
        if (res.status === 404) {
          setError('Post not found')
        } else {
          setError('Failed to load post')
        }
        return
      }
      const data = await res.json()
      setPost(data.post)
      setComments(data.comments || [])
      setRelatedPosts(data.relatedPosts || [])
    } catch (err) {
      console.error('Error fetching post:', err)
      setError('Failed to load post')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    if (slug) {
      fetchPost()
    }
  }, [slug, fetchPost])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!authToken) {
      setCommentError('Please login to your dashboard to comment')
      return
    }
    if (!commentText.trim()) return

    setSubmitting(true)
    setCommentError(null)

    try {
      const res = await fetch(`/api/blog/${slug}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          content: commentText,
          parent_id: replyingTo
        })
      })

      if (!res.ok) {
        const data = await res.json()
        setCommentError(data.error || 'Failed to post comment')
        return
      }

      // Refresh comments
      const commentsRes = await fetch(`/api/blog/${slug}/comments`)
      if (commentsRes.ok) {
        const data = await commentsRes.json()
        setComments(data.comments || [])
      }

      setCommentText('')
      setReplyingTo(null)
    } catch (err) {
      console.error('Error posting comment:', err)
      setCommentError('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  // Render markdown content (basic implementation)
  const renderContent = (content: string) => {
    // Convert markdown-like content to HTML
    let html = content
      // Headers
      .replace(/^### (.*$)/gm, '<h3 class="text-xl font-semibold text-dark-text mt-6 mb-3">$1</h3>')
      .replace(/^## (.*$)/gm, '<h2 class="text-2xl font-bold text-dark-text mt-8 mb-4">$1</h2>')
      .replace(/^# (.*$)/gm, '<h1 class="text-3xl font-bold text-dark-text mt-8 mb-4">$1</h1>')
      // Bold and italic
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-dark-text">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // Links
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
      // Line breaks
      .replace(/\n\n/g, '</p><p class="mb-4 text-dark-text-muted leading-relaxed">')
      .replace(/\n/g, '<br />')

    return `<p class="mb-4 text-dark-text-muted leading-relaxed">${html}</p>`
  }

  // Get top-level comments and their replies
  const topLevelComments = comments.filter(c => !c.parent_id)
  const getReplies = (parentId: string) => comments.filter(c => c.parent_id === parentId)

  if (loading) {
    return (
      <main className="min-h-screen bg-dark-bg">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12">
          <div className="animate-pulse">
            <div className="h-8 bg-dark-border rounded w-3/4 mb-4" />
            <div className="h-4 bg-dark-border rounded w-1/2 mb-8" />
            <div className="h-64 bg-dark-border rounded mb-8" />
            <div className="space-y-4">
              <div className="h-4 bg-dark-border rounded" />
              <div className="h-4 bg-dark-border rounded" />
              <div className="h-4 bg-dark-border rounded w-2/3" />
            </div>
          </div>
        </div>
        <Footer />
      </main>
    )
  }

  if (error || !post) {
    return (
      <main className="min-h-screen bg-dark-bg">
        <Header />
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <svg className="w-16 h-16 text-dark-text-dim mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="text-2xl font-bold text-dark-text mb-2">{error || 'Post not found'}</h1>
          <p className="text-dark-text-muted mb-6">The article you&apos;re looking for doesn&apos;t exist or has been removed.</p>
          <Link href="/blog" className="text-primary hover:text-primary-light">
            &larr; Back to Blog
          </Link>
        </div>
        <Footer />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-dark-bg">
      <Header />

      <article className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8">
          <Link href="/blog" className="text-dark-text-dim hover:text-primary transition-colors">
            &larr; Back to Blog
          </Link>
        </nav>

        {/* Featured Image */}
        {post.featured_image_url && (
          <div className="relative h-64 sm:h-80 lg:h-96 rounded-xl overflow-hidden mb-8">
            <Image
              src={post.featured_image_url}
              alt={post.title}
              fill
              className="object-cover"
              priority
            />
          </div>
        )}

        {/* Title & Meta */}
        <header className="mb-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-dark-text mb-4">
            {post.title}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-dark-text-muted">
            <span>By {post.author_name}</span>
            <span>•</span>
            <time dateTime={post.published_at}>
              {new Date(post.published_at).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </time>
            <span>•</span>
            <span>{post.read_time} min read</span>
            <span>•</span>
            <span>{post.view_count} views</span>
          </div>
        </header>

        {/* Content */}
        <div
          className="prose prose-invert max-w-none mb-12"
          dangerouslySetInnerHTML={{ __html: renderContent(post.content || '') }}
        />

        {/* Share Buttons */}
        <div className="border-t border-b border-dark-border py-6 mb-12">
          <div className="flex items-center gap-4">
            <span className="text-dark-text-muted">Share:</span>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-dark-card hover:bg-dark-border transition-colors"
              aria-label="Share on Twitter"
            >
              <svg className="w-5 h-5 text-dark-text" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg bg-dark-card hover:bg-dark-border transition-colors"
              aria-label="Share on LinkedIn"
            >
              <svg className="w-5 h-5 text-dark-text" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </a>
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: post.title, url: window.location.href })
                } else {
                  navigator.clipboard.writeText(window.location.href)
                  alert('Link copied to clipboard!')
                }
              }}
              className="p-2 rounded-lg bg-dark-card hover:bg-dark-border transition-colors"
              aria-label="Copy link"
            >
              <svg className="w-5 h-5 text-dark-text" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Comments Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-dark-text mb-6">
            Comments ({comments.length})
          </h2>

          {/* Comment Form */}
          <div className="glass-card rounded-xl p-6 mb-8">
            {!authToken ? (
              <div className="text-center py-4">
                <p className="text-dark-text-muted mb-4">
                  Sign in to your MineGlance account to leave a comment
                </p>
                <Link
                  href={`/dashboard/login?redirect=/blog/${slug}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-light text-white rounded-lg transition-colors"
                >
                  Sign In to Comment
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmitComment}>
                {replyingTo && (
                  <div className="flex items-center gap-2 mb-3 text-sm text-dark-text-muted">
                    <span>Replying to comment</span>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(null)}
                      className="text-primary hover:text-primary-light"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  rows={3}
                  className="w-full bg-dark-bg border border-dark-border rounded-lg px-4 py-3 text-dark-text placeholder-dark-text-dim focus:outline-none focus:border-primary resize-none"
                  maxLength={2000}
                />
                {commentError && (
                  <p className="text-red-400 text-sm mt-2">{commentError}</p>
                )}
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-dark-text-dim">
                    {commentText.length}/2000 characters
                  </span>
                  <button
                    type="submit"
                    disabled={submitting || !commentText.trim()}
                    className="px-4 py-2 bg-primary hover:bg-primary-light disabled:bg-primary/50 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Posting...' : 'Post Comment'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Comments List */}
          {comments.length === 0 ? (
            <p className="text-center text-dark-text-muted py-8">
              No comments yet. Be the first to share your thoughts!
            </p>
          ) : (
            <div className="space-y-6">
              {topLevelComments.map((comment) => (
                <div key={comment.id} className="glass-card rounded-xl p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      {comment.profile_photo_url ? (
                        <Image
                          src={comment.profile_photo_url}
                          alt={comment.display_name || 'User'}
                          width={32}
                          height={32}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-primary font-semibold text-sm">
                            {(comment.display_name || comment.user_name || 'A').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-dark-text font-medium">{comment.display_name || comment.user_name}</span>
                        <span className="text-dark-text-dim text-sm ml-2">
                          {new Date(comment.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                    {authToken && (
                      <button
                        onClick={() => setReplyingTo(comment.id)}
                        className="text-sm text-dark-text-dim hover:text-primary transition-colors"
                      >
                        Reply
                      </button>
                    )}
                  </div>
                  <p className="text-dark-text-muted whitespace-pre-wrap">{comment.content}</p>

                  {/* Admin Response */}
                  {comment.admin_response && (
                    <div className="mt-4 pl-4 border-l-2 border-primary">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded">
                          MineGlance Team
                        </span>
                      </div>
                      <p className="text-dark-text-muted text-sm">{comment.admin_response}</p>
                    </div>
                  )}

                  {/* Replies */}
                  {getReplies(comment.id).length > 0 && (
                    <div className="mt-4 space-y-4 pl-6 border-l border-dark-border">
                      {getReplies(comment.id).map((reply) => (
                        <div key={reply.id} className="pt-4">
                          <div className="flex items-center gap-2 mb-2">
                            {reply.profile_photo_url ? (
                              <Image
                                src={reply.profile_photo_url}
                                alt={reply.display_name || 'User'}
                                width={24}
                                height={24}
                                className="w-6 h-6 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                                <span className="text-primary font-semibold text-xs">
                                  {(reply.display_name || reply.user_name || 'A').charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}
                            <span className="text-dark-text font-medium text-sm">{reply.display_name || reply.user_name}</span>
                            <span className="text-dark-text-dim text-xs">
                              {new Date(reply.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                              })}
                            </span>
                          </div>
                          <p className="text-dark-text-muted text-sm whitespace-pre-wrap">{reply.content}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Related Posts */}
        {relatedPosts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold text-dark-text mb-6">Related Articles</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedPosts.map((related) => (
                <Link
                  key={related.id}
                  href={`/blog/${related.slug}`}
                  className="glass-card rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 group"
                >
                  {related.featured_image_url ? (
                    <div className="relative h-32 overflow-hidden">
                      <Image
                        src={related.featured_image_url}
                        alt={related.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-primary/20 to-dark-card" />
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-dark-text group-hover:text-primary transition-colors line-clamp-2 mb-2">
                      {related.title}
                    </h3>
                    <p className="text-sm text-dark-text-muted line-clamp-2">
                      {related.excerpt}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </article>

      <Footer />
    </main>
  )
}
