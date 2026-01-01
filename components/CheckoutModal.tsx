'use client'

import { useState, useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js'

// Debug: Log if key is present (not the actual key)
const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
console.log('Stripe key configured:', stripeKey ? `Yes (starts with ${stripeKey.substring(0, 7)}...)` : 'No')

const stripePromise = stripeKey ? loadStripe(stripeKey) : null

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
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const currentPlanRef = useRef<string | null>(null)

  // Fetch client secret when modal opens
  useEffect(() => {
    if (isOpen && plan && plan !== currentPlanRef.current) {
      currentPlanRef.current = plan
      setError(null)
      setClientSecret(null)
      setLoading(true)

      console.log('Fetching checkout session for plan:', plan)
      fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
        .then(async (response) => {
          const data = await response.json()
          console.log('Checkout response:', response.status, data)

          if (!response.ok) {
            throw new Error(data.error || 'Failed to create checkout session')
          }
          if (!data.clientSecret) {
            throw new Error('No client secret returned')
          }
          setClientSecret(data.clientSecret)
        })
        .catch((err) => {
          console.error('Checkout error:', err)
          setError(err instanceof Error ? err.message : 'Failed to load checkout. Please try again.')
        })
        .finally(() => {
          setLoading(false)
        })
    }

    // Reset when modal closes
    if (!isOpen) {
      currentPlanRef.current = null
      setClientSecret(null)
      setError(null)
      setLoading(false)
    }
  }, [isOpen, plan])

  if (!isOpen || !plan) return null

  const details = planDetails[plan]

  const handleRetry = () => {
    currentPlanRef.current = null
    setError(null)
    setClientSecret(null)
    setLoading(true)

    fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Failed to create checkout session')
        }
        if (!data.clientSecret) {
          throw new Error('No client secret returned')
        }
        currentPlanRef.current = plan
        setClientSecret(data.clientSecret)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load checkout. Please try again.')
      })
      .finally(() => {
        setLoading(false)
      })
  }

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
                  onClick={handleRetry}
                  className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                >
                  Try Again
                </button>
              </div>
            ) : !stripePromise ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-amber-600 mb-4">Payment system is being configured.</p>
                <p className="text-gray-500 text-sm mb-4">Please contact control@mineglance.com to purchase.</p>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-500">Loading secure checkout...</p>
              </div>
            ) : clientSecret ? (
              <div id="checkout-container" style={{ minHeight: '450px' }}>
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    onComplete: () => {
                      console.log('Checkout completed successfully')
                      window.location.href = '/checkout/success'
                    }
                  }}
                >
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-gray-500">Initializing checkout...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
