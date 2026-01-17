'use client'

import { useState, useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js'

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

type PlanType = 'monthly' | 'annual' | 'lifetime' | null

interface CheckoutModalProps {
  isOpen: boolean
  onClose: () => void
  plan: PlanType
  userEmail?: string  // Pre-fill email from dashboard
}

const planConfigs = {
  monthly: {
    name: 'MineGlance Pro Monthly',
    description: 'Monthly subscription to all Pro features',
    amount: 699,  // $6.99/month
    priceId: '', // Will be set by user
    interval: 'month'
  },
  annual: {
    name: 'MineGlance Pro Annual',
    description: 'Annual subscription - save 30%',
    amount: 5900,  // $59/year
    priceId: '', // Will be set by user
    interval: 'year'
  },
  lifetime: {
    name: 'MineGlance Pro Lifetime',
    description: 'One-time payment, lifetime access',
    amount: 9900,  // $99 lifetime
    priceId: '', // Will be set by user
    interval: 'once'
  }
}

type Step = 'email' | 'checkout'

export default function CheckoutModal({ isOpen, onClose, plan, userEmail }: CheckoutModalProps) {
  const [step, setStep] = useState<Step>('email')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [alreadyOwned, setAlreadyOwned] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const currentSessionRef = useRef<string | null>(null)

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('email')
      setEmail(userEmail || '')
      setError(null)
      setClientSecret(null)
      setLoading(false)
      setAlreadyOwned(false)
      setResendStatus('idle')
      currentSessionRef.current = null
    } else if (userEmail && !email) {
      setEmail(userEmail)
    }
  }, [isOpen, userEmail])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !plan) return

    setLoading(true)
    setError(null)

    try {
      // Check if user already has Pro
      const checkResponse = await fetch('/api/check-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })

      const customerData = await checkResponse.json()

      if (customerData.plan === 'pro') {
        setAlreadyOwned(true)
        setLoading(false)
        return
      }

      // Create checkout session
      const planConfig = planConfigs[plan]
      const sessionId = `${email}-${plan}-${Date.now()}`
      currentSessionRef.current = sessionId

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          email,
          amount: planConfig.amount,
          interval: planConfig.interval
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }
      if (!data.clientSecret) {
        throw new Error('No client secret returned')
      }

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
    setAlreadyOwned(false)
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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative glass-card rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-dark-border">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-border">
            <div>
              <h2 className="text-lg font-semibold text-dark-text">
                {plan ? planConfigs[plan].name : 'MineGlance Pro'}
              </h2>
              <p className="text-sm text-dark-text-muted">
                {plan ? planConfigs[plan].description : ''}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-dark-card-hover transition-colors"
            >
              <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6" style={{ minHeight: step === 'checkout' ? '450px' : 'auto' }}>
            {alreadyOwned ? (
              <div className="space-y-4">
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-dark-text mb-2">
                    You already have Pro!
                  </h3>
                  <p className="text-dark-text-muted text-sm">
                    A license key was sent to <strong className="text-dark-text">{email}</strong> when you purchased.
                  </p>
                </div>

                <div className="bg-dark-card-hover rounded-lg p-4 text-center">
                  <p className="text-sm text-dark-text-muted mb-3">
                    Can&apos;t find your license key?
                  </p>
                  {resendStatus === 'sent' ? (
                    <div className="text-primary font-medium">
                      License key sent! Check your email.
                    </div>
                  ) : resendStatus === 'error' ? (
                    <div className="space-y-2">
                      <p className="text-red-400 text-sm">Failed to send. Please try again.</p>
                      <button
                        onClick={handleResendLicense}
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleResendLicense}
                      disabled={resendStatus === 'sending'}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light disabled:opacity-50 transition-colors"
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
                  className="w-full py-2 text-dark-text-muted hover:text-dark-text text-sm transition-colors"
                >
                  Use a different email
                </button>
              </div>
            ) : step === 'email' ? (
              <form onSubmit={handleEmailSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-dark-text mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full px-4 py-3 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-dark-text-dim mt-1">
                    Your license key will be sent to this email
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="bg-dark-card-hover rounded-lg p-4">
                  <div className="flex justify-between items-center">
                    <span className="text-dark-text-muted">{plan ? planConfigs[plan].name : ''}</span>
                    <span className="text-xl font-bold text-primary">
                      ${plan ? (planConfigs[plan].amount / 100).toFixed(2) : '0'}
                    </span>
                  </div>
                  <p className="text-xs text-dark-text-dim mt-1">
                    {plan === 'monthly' && 'Billed monthly, cancel anytime'}
                    {plan === 'annual' && 'Billed annually, cancel anytime'}
                    {plan === 'lifetime' && 'One-time payment, lifetime access'}
                  </p>
                </div>

                {/* Coupon Code Banner */}
                <div className="bg-primary/10 border border-primary/30 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-primary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    <div>
                      <p className="text-sm text-dark-text">
                        Use code <span className="font-bold text-primary">MINE26</span> for 10% off!
                      </p>
                      <p className="text-xs text-dark-text-muted">Enter at checkout → Pay only $53/year</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-glow hover:shadow-glow-lg"
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
                <p className="text-amber-400 mb-4">Payment system is being configured.</p>
                <p className="text-dark-text-muted text-sm">Please contact control@mineglance.com to purchase.</p>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-dark-text-muted">Loading secure checkout...</p>
              </div>
            ) : clientSecret ? (
              <div>
                <button
                  onClick={handleBack}
                  className="mb-4 text-sm text-dark-text-muted hover:text-dark-text flex items-center gap-1 transition-colors"
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
                <p className="text-dark-text-muted">Initializing checkout...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
