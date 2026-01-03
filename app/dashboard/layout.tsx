'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { AuthContext, User } from './auth-context'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { href: '/dashboard/profile', label: 'Profile', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { href: '/dashboard/devices', label: 'Devices', icon: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
  { href: '/dashboard/alerts', label: 'Alerts', icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
  { href: '/dashboard/roadmap', label: 'Roadmap', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' }
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  // Skip auth for login and set-password pages
  const isAuthPage = pathname === '/dashboard/login' || pathname === '/dashboard/set-password'

  useEffect(() => {
    if (isAuthPage) {
      setLoading(false)
      return
    }
    verifyAuth()
  }, [isAuthPage])

  async function verifyAuth() {
    const token = localStorage.getItem('user_token')
    if (!token) {
      router.push('/dashboard/login')
      return
    }

    try {
      const res = await fetch('/api/dashboard/auth/verify', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) {
        localStorage.removeItem('user_token')
        router.push('/dashboard/login')
        return
      }

      const data = await res.json()
      setUser(data.user)
    } catch {
      localStorage.removeItem('user_token')
      router.push('/dashboard/login')
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    const token = localStorage.getItem('user_token')
    if (token) {
      try {
        await fetch('/api/dashboard/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      } catch (e) {
        console.error('Logout error:', e)
      }
    }
    localStorage.removeItem('user_token')
    setUser(null)
    router.push('/dashboard/login')
  }

  async function refreshUser() {
    await verifyAuth()
  }

  // For auth pages, render without layout
  if (isAuthPage) {
    return children
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-dark-text-muted">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, refreshUser }}>
      <div className="min-h-screen bg-dark-bg">
        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside className={`fixed top-0 left-0 z-50 h-full w-64 bg-dark-card border-r border-dark-border transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center gap-3 px-6 py-5 border-b border-dark-border">
              <Image src="/icon48.png" alt="MineGlance" width={32} height={32} />
              <span className="text-lg font-bold text-dark-text">MineGlance</span>
              <span className="ml-auto bg-primary text-white text-xs font-bold px-2 py-0.5 rounded">
                {user?.plan === 'bundle' ? 'PRO+' : 'PRO'}
              </span>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1">
              {NAV_ITEMS.map((item) => {
                const isActive = pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-primary/20 text-primary'
                        : 'text-dark-text-muted hover:bg-dark-card-hover hover:text-dark-text'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                    </svg>
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* User section */}
            <div className="px-4 py-4 border-t border-dark-border">
              <div className="flex items-center gap-3 px-2 py-2">
                <div className="w-10 h-10 rounded-full bg-dark-card-hover flex items-center justify-center overflow-hidden">
                  {user?.profilePhoto ? (
                    <Image
                      src={user.profilePhoto}
                      alt="Profile"
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-primary font-semibold">
                      {user?.email?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-dark-text truncate">
                    {user?.fullName || user?.email}
                  </p>
                  <p className="text-xs text-dark-text-dim truncate">{user?.email}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-2 text-sm text-dark-text-muted hover:text-dark-text hover:bg-dark-card-hover rounded-lg transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="lg:ml-64">
          {/* Top bar */}
          <header className="sticky top-0 z-30 bg-dark-card/80 backdrop-blur-md border-b border-dark-border px-4 py-3 lg:px-8">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 -ml-2 text-dark-text-muted hover:text-dark-text"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <div className="flex-1 lg:flex-none">
                <h1 className="text-lg font-semibold text-dark-text lg:text-xl">
                  {NAV_ITEMS.find(item => item.href === pathname)?.label || 'Dashboard'}
                </h1>
              </div>
              <a
                href="/"
                target="_blank"
                className="text-sm text-dark-text-muted hover:text-primary flex items-center gap-1 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                Website
              </a>
            </div>
          </header>

          {/* Page content */}
          <main className="p-4 lg:p-8">
            {children}
          </main>
        </div>
      </div>
    </AuthContext.Provider>
  )
}
