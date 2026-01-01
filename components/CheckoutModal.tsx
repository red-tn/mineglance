'use client'

import { useCallback, useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  plan: 'pro' | 'bundle' | null
}

const planDetails = {
  pro: {
    name: 'MineGlance Pro',
    description: 'Lifetime access to all Pro features',
    amount: 2900
  },
  bundle: {
    name: 'MineGlance Pro + Mobile Bundle',
    description: 'Lifetime access to Pro extension + upcoming mobile app',
    amount: 5900
  }
}

export default function CheckoutModal({ isOpen, onClose, plan }: CheckoutModalProps) {
  const [error, setError] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  // Reset when plan changes
  useEffect(() => {
    if (isOpen && plan) {
      setError(null)
      setKey(prev => prev + 1)
    }
  }, [isOpen, plan])

  const fetchClientSecret = useCallback(async () => {
    if (!plan) throw new Error('No plan selected')

    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })

      if (!response.ok) {
        throw new Error('Failed to create checkout session')
      }

      const data = await response.json()
      return data.clientSecret
    } catch (err) {
      setError('Failed to load checkout. Please try again.')
      throw err
    }
  }, [plan])

  if (!isOpen || !plan) return null

  const details = planDetails[plan]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                {details.name}
              </h2>
              <p className="text-sm text-gray-500">{details.description}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Checkout Content */}
          <div className="p-4" style={{ minHeight: '400px' }}>
            {error ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={() => {
                    setError(null)
                    setKey(prev => prev + 1)
                  }}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Try Again
                </button>
              </div>
            ) : !process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-amber-600 mb-4">Payment system is being configured.</p>
                <p className="text-gray-500 text-sm mb-4">Please contact control@mineglance.com to purchase.</p>
              </div>
            ) : (
              <div className="relative">
                {/* Loading placeholder */}
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg" style={{ minHeight: '350px' }}>
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
                    <p className="text-gray-500 text-sm">Loading secure checkout...</p>
                  </div>
                </div>
                <EmbeddedCheckoutProvider
                  key={key}
                  stripe={stripePromise}
                  options={{ fetchClientSecret }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
