'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'

export default function DashboardLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'email' | 'password'>('email')
  const [isNewUser, setIsNewUser] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect') || '/dashboard'

  useEffect(() => {
    // Check if already logged in
    const token = localStorage.getItem('user_token')
    if (token) {
      verifyExistingSession(token)
    }
  }, [])

  async function verifyExistingSession(token: string) {
    try {
      const res = await fetch('/api/dashboard/auth/verify', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        router.push(redirectUrl)
      } else {
        localStorage.removeItem('user_token')
      }
    } catch {
      localStorage.removeItem('user_token')
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Check if user exists
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })

      const data = await res.json()

      if (data.requiresPassword) {
        // Existing user - needs password
        setIsNewUser(false)
        setStep('password')
      } else if (data.exists === false || data.error?.includes('not found')) {
        // New user - can create account
        setIsNewUser(true)
        setStep('password')
      } else if (res.ok && data.token) {
        // Logged in (shouldn't happen without password)
        localStorage.setItem('user_token', data.token)
        router.push(redirectUrl)
      } else {
        setError(data.error || 'Something went wrong')
      }

    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (isNewUser) {
        // Register new user
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Registration failed')
          return
        }

        localStorage.setItem('user_token', data.token)
        router.push(redirectUrl)
      } else {
        // Login existing user
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Invalid password')
          return
        }

        localStorage.setItem('user_token', data.token)
        router.push(redirectUrl)
      }

    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="glass-card rounded-2xl shadow-2xl w-full max-w-md p-8 border border-dark-border">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image
              src="/logo-icon.svg"
              alt="MineGlance"
              width={40}
              height={40}
            />
            <span className="text-2xl font-bold text-primary">MineGlance</span>
          </div>
          <h1 className="text-xl font-semibold text-dark-text">Dashboard</h1>
          <p className="text-dark-text-muted mt-2">
            {step === 'email' ? 'Sign in to manage your account' : (isNewUser ? 'Create a password' : 'Enter your password')}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-dark-text mb-1">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark-card-hover border border-dark-border text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="you@example.com"
                required
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-glow hover:shadow-glow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <div className="bg-dark-card-hover px-4 py-3 rounded-lg border border-dark-border">
              <p className="text-sm text-dark-text-muted">Signing in as:</p>
              <p className="text-dark-text font-medium">{email}</p>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-dark-text mb-1">
                {isNewUser ? 'Create Password' : 'Password'}
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-dark-card-hover border border-dark-border text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder={isNewUser ? 'Create a password (min 6 characters)' : 'Enter your password'}
                required
                autoFocus
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-glow hover:shadow-glow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isNewUser ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                isNewUser ? 'Create Account' : 'Sign In'
              )}
            </button>

            <div className="flex justify-between">
              <button
                type="button"
                onClick={() => {
                  setStep('email')
                  setPassword('')
                  setError('')
                }}
                className="text-sm text-dark-text-muted hover:text-dark-text transition-colors"
              >
                Back
              </button>

              {!isNewUser && (
                <a
                  href="/reset-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </a>
              )}
            </div>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-dark-border">
          <p className="text-center text-sm text-dark-text-muted">
            Don&apos;t have Pro?{' '}
            <a href="/#pricing" className="text-primary hover:underline font-medium">
              Upgrade to Pro - $59
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
