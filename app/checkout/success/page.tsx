'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface SessionInfo {
  plan: 'monthly' | 'annual' | 'lifetime'
  email?: string
}

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [sessionInfo, setSessionInfo] = useState<SessionInfo | null>(null)

  useEffect(() => {
    async function fetchSession() {
      if (!sessionId) {
        setStatus('error')
        return
      }

      try {
        const res = await fetch(`/api/checkout/session?session_id=${sessionId}`)
        if (res.ok) {
          const data = await res.json()
          setSessionInfo({
            plan: data.plan || 'annual',
            email: data.email
          })
          setStatus('success')
        } else {
          // Still show success if we can't fetch details
          setSessionInfo({ plan: 'annual' })
          setStatus('success')
        }
      } catch {
        // Still show success if fetch fails
        setSessionInfo({ plan: 'annual' })
        setStatus('success')
      }
    }

    fetchSession()
  }, [sessionId])

  if (status === 'loading') {
    return (
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-foreground/70">Confirming your purchase...</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
        <p className="text-foreground/70 mb-6">We could not confirm your purchase. Please contact support.</p>
        <Link
          href="/"
          className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Return Home
        </Link>
      </div>
    )
  }

  // Get the appropriate message based on plan type
  const getPlanMessage = () => {
    switch (sessionInfo?.plan) {
      case 'monthly':
        return 'Your subscription is now active and will renew monthly at $6.99/month.'
      case 'lifetime':
        return 'You now have lifetime access to all Pro features. Your license never expires!'
      case 'annual':
      default:
        return 'Your subscription is now active and will renew annually at $59/year.'
    }
  }

  const getPlanBadge = () => {
    switch (sessionInfo?.plan) {
      case 'monthly':
        return 'Monthly'
      case 'lifetime':
        return 'Lifetime'
      case 'annual':
      default:
        return 'Annual'
    }
  }

  return (
    <div className="text-center max-w-md">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to MineGlance Pro!</h1>
      <div className="inline-block bg-primary/20 text-primary text-sm font-semibold px-3 py-1 rounded-full mb-4">
        {getPlanBadge()} Plan
      </div>
      <p className="text-foreground/70 mb-6">
        {getPlanMessage()}
      </p>
      <div className="bg-primary/5 rounded-lg p-4 mb-6 text-left">
        <h3 className="font-semibold text-foreground mb-2">Next Steps:</h3>
        <ol className="list-decimal list-inside text-foreground/70 space-y-1 text-sm">
          <li>Check your email for your license key</li>
          <li>Open the MineGlance extension</li>
          <li>Go to Settings</li>
          <li>Enter the email you used for purchase</li>
          <li>Click Activate Pro</li>
        </ol>
      </div>
      <div className="flex gap-3 justify-center">
        <Link
          href="/dashboard"
          className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </Link>
        <Link
          href="/"
          className="inline-block bg-foreground/10 text-foreground px-6 py-3 rounded-lg font-semibold hover:bg-foreground/20 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}

export default function CheckoutSuccess() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Suspense fallback={
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground/70">Loading...</p>
        </div>
      }>
        <SuccessContent />
      </Suspense>
    </div>
  )
}
