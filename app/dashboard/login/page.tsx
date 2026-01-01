'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function DashboardLogin() {
  const [licenseKey, setLicenseKey] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [needsPassword, setNeedsPassword] = useState(false)
  const router = useRouter()

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
        router.push('/dashboard')
      } else {
        localStorage.removeItem('user_token')
      }
    } catch {
      localStorage.removeItem('user_token')
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/dashboard/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey, email, password: needsPassword ? password : undefined })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      if (data.requiresPasswordSetup) {
        // Store setup token and redirect to password setup
        localStorage.setItem('setup_token', data.setupToken)
        router.push('/dashboard/set-password')
        return
      }

      // Successful login
      localStorage.setItem('user_token', data.token)
      router.push('/dashboard')

    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleInitialCheck(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch('/api/dashboard/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ licenseKey, email })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Login failed')
        return
      }

      if (data.requiresPasswordSetup) {
        localStorage.setItem('setup_token', data.setupToken)
        router.push('/dashboard/set-password')
        return
      }

      // User has a password, show password field
      setNeedsPassword(true)

    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
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
          <h1 className="text-xl font-semibold text-gray-900">Pro Dashboard</h1>
          <p className="text-gray-500 mt-2">Sign in with your license</p>
        </div>

        <form onSubmit={needsPassword ? handleSubmit : handleInitialCheck} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="licenseKey" className="block text-sm font-medium text-gray-700 mb-1">
              License Key
            </label>
            <input
              id="licenseKey"
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all font-mono"
              placeholder="XXXX-XXXX-XXXX-XXXX"
              required
              disabled={needsPassword}
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="you@example.com"
              required
              disabled={needsPassword}
            />
          </div>

          {needsPassword && (
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="Enter your password"
                required
                autoFocus
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary text-white py-3 px-4 rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {needsPassword ? 'Signing in...' : 'Checking...'}
              </span>
            ) : (
              needsPassword ? 'Sign In' : 'Continue'
            )}
          </button>

          {needsPassword && (
            <button
              type="button"
              onClick={() => {
                setNeedsPassword(false)
                setPassword('')
                setError('')
              }}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Use a different license
            </button>
          )}
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500">
            Don&apos;t have a license?{' '}
            <a href="/#pricing" className="text-primary hover:underline font-medium">
              Get MineGlance Pro
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
