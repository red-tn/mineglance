'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function CheckoutSuccess() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')

  useEffect(() => {
    if (sessionId) {
      // Session ID exists, payment was successful
      setStatus('success')
    } else {
      setStatus('error')
    }
  }, [sessionId])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-foreground/70">Confirming your purchase...</p>
        </div>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
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
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Welcome to MineGlance Pro!</h1>
        <p className="text-foreground/70 mb-6">
          Your purchase was successful. You now have lifetime access to all Pro features.
        </p>
        <div className="bg-primary/5 rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-foreground mb-2">Next Steps:</h3>
          <ol className="list-decimal list-inside text-foreground/70 space-y-1 text-sm">
            <li>Open the MineGlance extension</li>
            <li>Go to Settings</li>
            <li>Enter the email you used for purchase</li>
            <li>Click Activate Pro</li>
          </ol>
        </div>
        <Link
          href="/"
          className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
        >
          Return Home
        </Link>
      </div>
    </div>
  )
}
