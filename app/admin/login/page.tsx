'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [totpCode, setTotpCode] = useState('')
  const [requires2FA, setRequires2FA] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          totpCode: requires2FA ? totpCode : undefined
        })
      })

      const data = await res.json()

      // Check if 2FA is required
      if (data.requires2FA) {
        setRequires2FA(true)
        setLoading(false)
        return
      }

      if (!res.ok) {
        setError(data.error || 'Login failed')
        // If 2FA code was wrong, don't reset the 2FA state
        if (!data.error?.includes('authenticator')) {
          setRequires2FA(false)
          setTotpCode('')
        }
        return
      }

      localStorage.setItem('admin_token', data.token)
      // Use full page reload to ensure fresh state after login
      window.location.href = '/admin'
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  function handleBack() {
    setRequires2FA(false)
    setTotpCode('')
    setError('')
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl w-full max-w-md p-8 border border-dark-border">
        <div className="text-center mb-8">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 ${
            requires2FA ? 'bg-blue-500/20' : 'bg-primary/20'
          }`}>
            {requires2FA ? (
              <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            )}
          </div>
          <h1 className="text-2xl font-bold text-dark-text">
            {requires2FA ? 'Two-Factor Authentication' : 'Admin Login'}
          </h1>
          <p className="text-dark-text-muted mt-2">
            {requires2FA ? 'Enter the code from your authenticator app' : 'MineGlance Dashboard'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {!requires2FA ? (
            // Email & Password form
            <>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-dark-text mb-1">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark-card-hover border border-dark-border text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="admin@mineglance.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-dark-text mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-dark-card-hover border border-dark-border text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </>
          ) : (
            // 2FA code form
            <>
              <div className="bg-dark-card-hover rounded-lg p-4 mb-4">
                <p className="text-sm text-dark-text-muted">
                  Signing in as <span className="text-dark-text font-medium">{email}</span>
                </p>
              </div>

              <div>
                <label htmlFor="totpCode" className="block text-sm font-medium text-dark-text mb-1">
                  Authentication Code
                </label>
                <input
                  id="totpCode"
                  type="text"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-4 py-4 rounded-lg bg-dark-card-hover border border-dark-border text-dark-text text-center text-2xl tracking-widest font-mono placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  required
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading || (requires2FA && totpCode.length < 6)}
            className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-glow"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {requires2FA ? 'Verifying...' : 'Signing in...'}
              </span>
            ) : (
              requires2FA ? 'Verify & Sign In' : 'Sign In'
            )}
          </button>

          {requires2FA && (
            <button
              type="button"
              onClick={handleBack}
              className="w-full text-dark-text-muted hover:text-dark-text py-2 transition-colors text-sm"
            >
              Back to login
            </button>
          )}
        </form>

        <p className="mt-6 text-center text-sm text-dark-text-dim">
          Contact control@mineglance.com for access
        </p>
      </div>
    </div>
  )
}
