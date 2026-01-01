'use client'

import { useState, useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js'

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  plan: 'pro' | 'bundle' | null
}

interface PricingInfo {
  amount: number
  isUpgrade: boolean
  existingPlan: string | null
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

type Step = 'email' | 'checkout'

export default function CheckoutModal({ isOpen, onClose, plan }: CheckoutModalProps) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pricingInfo, setPricingInfo] = useState<PricingInfo | null>(null)
  const [alreadyOwned, setAlreadyOwned] = useState<'pro' | 'bundle' | null>(null)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const currentSessionRef = useRef<string | null>(null)

  // Reset when modal closes or plan changes
  useEffect(() => {
    if (!isOpen) {
      setStep('email')
      setEmail('')
      setError(null)
      setClientSecret(null)
      setLoading(false)
      setPricingInfo(null)
      setAlreadyOwned(null)
      setResendStatus('idle')
      currentSessionRef.current = null
    }
  }, [isOpen])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !plan) return

    setLoading(true)
    setError(null)

    try {
      // Check if user is an existing Pro customer
      const checkResponse = await fetch('/api/check-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const customerData = await checkResponse.json()
      console.log('Customer check:', customerData)

      // Calculate pricing
      let amount = planDetails[plan].amount
      let isUpgrade = false
      const existingPlan = customerData.plan || null

      if (plan === 'bundle' && existingPlan === 'pro') {
        // Existing Pro user upgrading to Bundle - charge difference
        amount = 3000 // $30 upgrade price
        isUpgrade = true
      } else if (existingPlan === plan || existingPlan === 'bundle') {
        // Already has this plan or higher
        setAlreadyOwned(existingPlan === 'bundle' ? 'bundle' : plan)
        setLoading(false)
        return
      }

      setPricingInfo({ amount, isUpgrade, existingPlan })

      // Create checkout session with the calculated amount
      const sessionId = `${email}-${plan}-${Date.now()}`
      currentSessionRef.current = sessionId

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          email,
          isUpgrade,
          amount
        }),
      })

      const data = await response.json()
      console.log('Checkout response:', response.status, data)

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }
      if (!data.clientSecret) {
        throw new Error('No client secret returned')
      }

      // Only update if this is still the current session
      if (currentSessionRef.current === sessionId) {
        setClientSecret(data.clientSecret)
        setStep('checkout')
      }
    } catch (err) {
      console.error('Checkout error:', err)
      setError(err instanceof Error ? err.message : 'Failed to load checkout. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep('email')
    setClientSecret(null)
    setError(null)
    setAlreadyOwned(null)
    setResendStatus('idle')
    currentSessionRef.current = null
  }

  const handleResendLicense = async () => {
    setResendStatus('sending')
    try {
      const response = await fetch('/api/resend-license', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      if (!response.ok) {
        throw new Error('Failed to resend')
      }

      setResendStatus('sent')
    } catch {
      setResendStatus('error')
    }
  }

  if (!isOpen || !plan) return null

  const details = planDetails[plan]
  const displayAmount = pricingInfo?.amount || details.amount

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
                {pricingInfo?.isUpgrade ? 'Upgrade to Bundle' : details.name}
              </h2>
              <p className="text-sm text-gray-500">
                {pricingInfo?.isUpgrade
                  ? 'Add mobile app access to your Pro license'
                  : details.description
                }
              </p>
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

          {/* Content */}
          <div className="p-6" style={{ minHeight: step === 'checkout' ? '450px' : 'auto' }}>
            {alreadyOwned ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    You already have {alreadyOwned === 'bundle' ? 'the Bundle' : 'Pro'}!
                  </h3>
                  <p className="text-gray-600 text-sm">
                    A license key was sent to <strong>{email}</strong> when you purchased.
                  </p>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-600 mb-3">
                    Can&apos;t find your license key?
                  </p>
                  {resendStatus === 'sent' ? (
                    <div className="text-green-600 font-medium">
                      License key sent! Check your email.
                    </div>
                  ) : resendStatus === 'error' ? (
                    <div className="space-y-2">
                      <p className="text-red-600 text-sm">Failed to send. Please try again.</p>
                      <button
                        onClick={handleResendLicense}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleResendLicense}
                      disabled={resendStatus === 'sending'}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50"
                    >
                      {resendStatus === 'sending' ? (
                        <span className="flex items-center justify-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Sending...
                        </span>
                      ) : (
                        'Resend License Key'
                      )}
                    </button>
                  )}
                </div>

                <button
                  onClick={handleBack}
                  className="w-full py-2 text-gray-500 hover:text-gray-700 text-sm"
                >
                  Use a different email
                </button>
              </div>
            ) : step === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Your license key will be sent to this email
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-600 text-sm">{error}</p>
                  </div>
                )}

                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">{details.name}</span>
                    <span className="text-xl font-bold text-primary">
                      ${(details.amount / 100).toFixed(0)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">One-time payment, lifetime access</p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Checking...
                    </span>
                  ) : (
                    'Continue to Payment'
                  )}
                </button>
              </form>
            ) : !stripePromise ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-amber-600 mb-4">Payment system is being configured.</p>
                <p className="text-gray-500 text-sm">Please contact control@mineglance.com to purchase.</p>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-500">Loading secure checkout...</p>
              </div>
            ) : clientSecret ? (
              <div>
                {pricingInfo?.isUpgrade && (
                  <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-green-800 text-sm font-medium">
                      Pro user upgrade pricing applied!
                    </p>
                    <p className="text-green-600 text-xs mt-1">
                      You&apos;re paying ${(displayAmount / 100).toFixed(0)} instead of $59
                    </p>
                  </div>
                )}
                <button
                  onClick={handleBack}
                  className="mb-4 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Change email
                </button>
                <div id="checkout-container" style={{ minHeight: '400px' }}>
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
