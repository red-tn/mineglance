'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Header from '@/components/Header'
import Footer from '@/components/Footer'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image_url: string | null
  author_name: string
  published_at: string
  view_count: number
  read_time: number
}

export default function BlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchPosts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12'
      })
      if (search) params.set('search', search)

      const res = await fetch(`/api/blog?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPosts(data.posts || [])
        setTotalPages(data.totalPages || 1)
        setTotal(data.total || 0)
      }
    } catch (error) {
      console.error('Error fetching posts:', error)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchPosts()
  }, [fetchPosts])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchPosts()
  }

  return (
    <main className="min-h-screen bg-dark-bg">
      <Header />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">
            <span className="text-gradient">Mining Blog</span>
          </h1>
          <p className="text-lg text-dark-text-muted max-w-2xl mx-auto">
            Stay up to date with the latest cryptocurrency mining news, guides, and insights
          </p>
        </div>

        {/* Search */}
        <div className="max-w-xl mx-auto mb-10">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-dark-card border border-dark-border rounded-lg px-4 py-3 pl-12 text-dark-text placeholder-dark-text-dim focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <svg
              className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-text-dim"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setPage(1); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-text-dim hover:text-dark-text"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </form>
        </div>

        {/* Results Count */}
        {!loading && (
          <p className="text-center text-dark-text-muted mb-8">
            {total} {total === 1 ? 'article' : 'articles'} found
            {search && ` for "${search}"`}
          </p>
        )}

        {/* Posts Grid */}
        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="glass-card rounded-xl overflow-hidden animate-pulse">
                <div className="h-48 bg-dark-border" />
                <div className="p-5 space-y-3">
                  <div className="h-4 bg-dark-border rounded w-3/4" />
                  <div className="h-3 bg-dark-border rounded w-full" />
                  <div className="h-3 bg-dark-border rounded w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12">
            <svg className="w-16 h-16 text-dark-text-dim mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
            <h3 className="text-xl font-semibold text-dark-text mb-2">No articles found</h3>
            <p className="text-dark-text-muted">
              {search ? 'Try adjusting your search terms' : 'Check back soon for new content'}
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {posts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="glass-card rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 group"
              >
                {post.featured_image_url ? (
                  <div className="relative h-48 overflow-hidden">
                    <Image
                      src={post.featured_image_url}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-48 bg-gradient-to-br from-primary/20 to-dark-card flex items-center justify-center">
                    <svg className="w-16 h-16 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                )}
                <div className="p-5">
                  <div className="flex items-center gap-2 text-xs text-dark-text-dim mb-3">
                    <time dateTime={post.published_at}>
                      {new Date(post.published_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </time>
                    <span>•</span>
                    <span>{post.read_time} min read</span>
                    <span>•</span>
                    <span>{post.view_count} views</span>
                  </div>
                  <h2 className="font-semibold text-lg text-dark-text group-hover:text-primary transition-colors line-clamp-2 mb-2">
                    {post.title}
                  </h2>
                  <p className="text-sm text-dark-text-muted line-clamp-3">
                    {post.excerpt}
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-sm text-dark-text-dim">
                    <span>By {post.author_name}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-10">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-lg bg-dark-card border border-dark-border text-dark-text disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-dark-text-muted">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-lg bg-dark-card border border-dark-border text-dark-text disabled:opacity-50 disabled:cursor-not-allowed hover:border-primary transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      <Footer />
    </main>
  )
}
