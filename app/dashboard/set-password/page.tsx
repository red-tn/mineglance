'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

export default function SetPassword() {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check if setup token exists
    const setupToken = localStorage.getItem('setup_token')
    if (!setupToken) {
      router.push('/dashboard/login')
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setLoading(true)

    try {
      const setupToken = localStorage.getItem('setup_token')

      const res = await fetch('/api/dashboard/auth/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ setupToken, password, confirmPassword })
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to set password')
        if (data.error?.includes('expired') || data.error?.includes('Invalid')) {
          localStorage.removeItem('setup_token')
          setTimeout(() => router.push('/dashboard/login'), 2000)
        }
        return
      }

      // Clear setup token and save auth token
      localStorage.removeItem('setup_token')
      localStorage.setItem('user_token', data.token)

      // Redirect to dashboard
      router.push('/dashboard')

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
          <h1 className="text-xl font-semibold text-gray-900">Create Your Password</h1>
          <p className="text-gray-500 mt-2">
            Set a password to secure your dashboard
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="At least 8 characters"
              required
              minLength={8}
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
              placeholder="Re-enter your password"
              required
            />
          </div>

          <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3">
            <p className="font-medium text-gray-700 mb-1">Password requirements:</p>
            <ul className="space-y-1">
              <li className={password.length >= 8 ? 'text-green-600' : ''}>
                {password.length >= 8 ? '✓' : '○'} At least 8 characters
              </li>
              <li className={password === confirmPassword && password.length > 0 ? 'text-green-600' : ''}>
                {password === confirmPassword && password.length > 0 ? '✓' : '○'} Passwords match
              </li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={loading || password.length < 8 || password !== confirmPassword}
            className="w-full bg-accent text-white py-3 px-4 rounded-lg font-semibold hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Setting password...
              </span>
            ) : (
              'Set Password & Continue'
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
