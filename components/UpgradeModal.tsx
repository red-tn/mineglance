'use client'

import { useState, useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js'

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  userEmail?: string
  trigger?: string // What triggered the modal (e.g., 'wallet_limit', 'upgrade_link')
}

type Step = 'info' | 'checkout'
type BillingPlan = 'monthly' | 'annual' | 'lifetime'

const PLAN_PRICES: Record<BillingPlan, { amount: number; label: string; description: string }> = {
  monthly: { amount: 699, label: '$6.99/mo', description: 'Billed monthly' },
  annual: { amount: 5900, label: '$59/yr', description: 'Save 30% vs monthly' },
  lifetime: { amount: 9900, label: '$99', description: 'One-time payment, forever' }
}

export default function UpgradeModal({ isOpen, onClose, userEmail, trigger }: UpgradeModalProps) {
  const [step, setStep] = useState<Step>('info')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [alreadyOwned, setAlreadyOwned] = useState(false)
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan>('annual')
  const currentSessionRef = useRef<string | null>(null)

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('info')
      setEmail(userEmail || '')
      setError(null)
      setClientSecret(null)
      setLoading(false)
      setAlreadyOwned(false)
      setResendStatus('idle')
      setSelectedPlan('annual')
      currentSessionRef.current = null
    } else if (userEmail && !email) {
      setEmail(userEmail)
    }
  }, [isOpen, userEmail])

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return

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

      if (customerData.plan === 'pro' || customerData.plan === 'bundle') {
        setAlreadyOwned(true)
        setLoading(false)
        return
      }

      // Create checkout session
      const sessionId = `${email}-${selectedPlan}-${Date.now()}`
      currentSessionRef.current = sessionId

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          email,
          amount: PLAN_PRICES[selectedPlan].amount
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
    setStep('info')
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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-[#1a1a1a] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-[#333]">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-[#333]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-green-400 flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">MineGlance Pro</h2>
                <p className="text-sm text-gray-400">Unlock all features</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#333] transition-colors text-gray-400 hover:text-white"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                  <h3 className="text-lg font-semibold text-white mb-2">
                    You already have Pro!
                  </h3>
                  <p className="text-gray-400 text-sm">
                    A license key was sent to <strong className="text-white">{email}</strong> when you purchased.
                  </p>
                </div>

                <div className="bg-[#252525] rounded-lg p-4 text-center">
                  <p className="text-sm text-gray-400 mb-3">
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
                        className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={handleResendLicense}
                      disabled={resendStatus === 'sending'}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
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
                  className="w-full py-2 text-gray-400 hover:text-white text-sm transition-colors"
                >
                  Use a different email
                </button>
              </div>
            ) : step === 'info' ? (
              <div className="space-y-5">
                {/* Trigger message */}
                {trigger === 'wallet_limit' && (
                  <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-center">
                    <p className="text-amber-400 text-sm">
                      Free accounts are limited to 1 wallet. Upgrade for unlimited!
                    </p>
                  </div>
                )}

                {/* Plan Selector */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {(['monthly', 'annual', 'lifetime'] as BillingPlan[]).map((plan) => (
                    <button
                      key={plan}
                      type="button"
                      onClick={() => setSelectedPlan(plan)}
                      className={`relative pt-4 pb-3 px-2 rounded-lg border-2 transition-all ${
                        selectedPlan === plan
                          ? 'border-primary bg-primary/10'
                          : 'border-[#333] bg-[#252525] hover:border-[#444]'
                      }`}
                    >
                      {plan === 'annual' && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-white text-[10px] font-bold rounded whitespace-nowrap">
                          POPULAR
                        </span>
                      )}
                      {plan === 'lifetime' && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 bg-amber-500 text-white text-[9px] font-bold rounded whitespace-nowrap">
                          BEST VALUE
                        </span>
                      )}
                      <div className="text-center">
                        <div className={`text-lg font-bold ${selectedPlan === plan ? 'text-primary' : 'text-white'}`}>
                          {plan === 'monthly' && '$6.99'}
                          {plan === 'annual' && '$59'}
                          {plan === 'lifetime' && '$99'}
                        </div>
                        <div className="text-xs text-gray-400 capitalize">{plan}</div>
                      </div>
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 text-center">{PLAN_PRICES[selectedPlan].description}</p>

                {/* Features */}
                <div className="bg-[#252525] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-white text-sm">Unlimited wallets & rigs</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-white text-sm">Cloud sync across devices</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-white text-sm">Price alerts & payout predictions</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-white text-sm">Performance charts (7/30/90 days)</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-3 h-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <span className="text-white text-sm">Email & push alerts</span>
                  </div>
                </div>

                {/* Email Form */}
                <form onSubmit={handleContinue} className="space-y-4">
                  <div>
                    <label htmlFor="upgrade-email" className="block text-sm font-medium text-gray-300 mb-2">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="upgrade-email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full px-4 py-3 bg-[#252525] border border-[#333] rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-primary transition-all"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Your license key will be sent to this email
                    </p>
                  </div>

                  {error && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full py-3 px-4 bg-primary text-white font-semibold rounded-lg hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40"
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Loading...
                      </span>
                    ) : (
                      'Continue to Checkout'
                    )}
                  </button>
                </form>
              </div>
            ) : !stripePromise ? (
              <div className="flex flex-col items-center justify-center h-64">
                <p className="text-amber-400 mb-4">Payment system is being configured.</p>
                <p className="text-gray-400 text-sm">Please contact control@mineglance.com to purchase.</p>
              </div>
            ) : loading ? (
              <div className="flex flex-col items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
                <p className="text-gray-400">Loading secure checkout...</p>
              </div>
            ) : clientSecret ? (
              <div>
                <button
                  onClick={handleBack}
                  className="mb-4 text-sm text-gray-400 hover:text-white flex items-center gap-1 transition-colors"
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
                <p className="text-gray-400">Initializing checkout...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
