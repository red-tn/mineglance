'use client'

import { useState, useEffect, useRef } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout
} from '@stripe/react-stripe-js'

const stripeKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
const stripePromise = stripeKey ? loadStripe(stripeKey) : null

interface ManagePlanModalProps {
  isOpen: boolean
  onClose: () => void
  billingType: 'monthly' | 'annual' | 'lifetime' | null | undefined
  userEmail?: string
}

type UpgradePlan = 'annual' | 'lifetime' | 'monthly'

const PLAN_INFO: Record<UpgradePlan, {
  price: number
  discountedPrice?: number
  label: string
  coupon?: string
  badge: string
  badgeColor: string
  description: string
}> = {
  annual: {
    price: 5900,
    discountedPrice: 5310, // 10% off
    label: 'Annual Plan',
    coupon: 'STAY10',
    badge: '10% OFF',
    badgeColor: 'bg-green-700 text-green-200',
    description: 'STAY10 coupon auto-applied'
  },
  lifetime: {
    price: 9900,
    discountedPrice: 7425, // 25% off
    label: 'Lifetime Plan',
    coupon: 'STAY25',
    badge: '25% OFF',
    badgeColor: 'bg-purple-700 text-purple-200',
    description: 'STAY25 coupon auto-applied'
  },
  monthly: {
    price: 699,
    label: 'Monthly Plan',
    badge: '',
    badgeColor: '',
    description: 'Billed monthly at $6.99'
  }
}

export default function ManagePlanModal({ isOpen, onClose, billingType, userEmail }: ManagePlanModalProps) {
  const [step, setStep] = useState<'select' | 'checkout'>('select')
  const [selectedPlan, setSelectedPlan] = useState<UpgradePlan | null>(null)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const currentSessionRef = useRef<string | null>(null)

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      setStep('select')
      setSelectedPlan(null)
      setClientSecret(null)
      setLoading(false)
      setError(null)
      currentSessionRef.current = null
    }
  }, [isOpen])

  if (!isOpen) return null

  // Lifetime users shouldn't see this modal
  if (billingType === 'lifetime') {
    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
        <div className="bg-dark-card rounded-xl border border-dark-border max-w-md w-full">
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-dark-text mb-2">You Have Lifetime Access</h3>
            <p className="text-dark-text-muted mb-6">
              You already have the best plan! Your MineGlance Pro subscription never expires.
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-dark-card-hover text-dark-text rounded-lg hover:bg-dark-border transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleSelectPlan = async (plan: UpgradePlan) => {
    setSelectedPlan(plan)
    setLoading(true)
    setError(null)

    try {
      const planInfo = PLAN_INFO[plan]
      const sessionId = `manage-${plan}-${Date.now()}`
      currentSessionRef.current = sessionId

      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          email: userEmail,
          coupon: planInfo.coupon // Pre-apply coupon if available
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
      setError(err instanceof Error ? err.message : 'Failed to load checkout')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    setStep('select')
    setSelectedPlan(null)
    setClientSecret(null)
    setError(null)
    currentSessionRef.current = null
  }

  const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-xl border border-dark-border max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between flex-shrink-0">
          <h3 className="text-lg font-bold text-dark-text">
            {step === 'checkout' ? 'Complete Your Upgrade' : 'Manage Your Plan'}
          </h3>
          <button onClick={onClose} className="text-dark-text-muted hover:text-dark-text p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1" style={{ minHeight: step === 'checkout' ? '450px' : 'auto' }}>
          {step === 'select' ? (
            <div className="space-y-4">
              {/* Current Plan */}
              <div className="bg-dark-bg rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-dark-text-muted uppercase">Current Plan</p>
                  <p className="text-lg font-semibold text-dark-text">
                    Pro {billingType === 'monthly' ? 'Monthly' : 'Annual'}
                  </p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  billingType === 'monthly' ? 'bg-yellow-700 text-yellow-200' : 'bg-blue-700 text-blue-200'
                }`}>
                  {billingType === 'monthly' ? '$6.99/mo' : '$59/yr'}
                </span>
              </div>

              {error && (
                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              {/* Options based on billing type */}
              {billingType === 'monthly' && (
                <>
                  <p className="text-sm text-dark-text-muted">Upgrade your plan to save money:</p>

                  {/* Annual Option */}
                  <button
                    onClick={() => handleSelectPlan('annual')}
                    disabled={loading}
                    className="w-full p-4 bg-dark-card-hover rounded-lg border border-dark-border hover:border-blue-500 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-dark-text">Annual Plan</span>
                          <span className="px-2 py-0.5 bg-green-700 text-green-200 text-xs rounded">10% OFF</span>
                        </div>
                        <p className="text-sm text-dark-text-muted mt-1">STAY10 coupon auto-applied</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-dark-text-dim line-through">$59.00</p>
                        <p className="text-xl font-bold text-green-400">$53.10</p>
                        <p className="text-xs text-dark-text-dim">per year</p>
                      </div>
                    </div>
                    {loading && selectedPlan === 'annual' && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Loading checkout...
                      </div>
                    )}
                  </button>

                  {/* Lifetime Option */}
                  <button
                    onClick={() => handleSelectPlan('lifetime')}
                    disabled={loading}
                    className="w-full p-4 bg-dark-card-hover rounded-lg border border-dark-border hover:border-purple-500 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-dark-text">Lifetime Plan</span>
                          <span className="px-2 py-0.5 bg-purple-700 text-purple-200 text-xs rounded">25% OFF</span>
                        </div>
                        <p className="text-sm text-dark-text-muted mt-1">STAY25 coupon auto-applied</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-dark-text-dim line-through">$99.00</p>
                        <p className="text-xl font-bold text-purple-400">$74.25</p>
                        <p className="text-xs text-dark-text-dim">one-time</p>
                      </div>
                    </div>
                    {loading && selectedPlan === 'lifetime' && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Loading checkout...
                      </div>
                    )}
                  </button>
                </>
              )}

              {billingType === 'annual' && (
                <>
                  <p className="text-sm text-dark-text-muted">Change your plan:</p>

                  {/* Lifetime Upgrade */}
                  <button
                    onClick={() => handleSelectPlan('lifetime')}
                    disabled={loading}
                    className="w-full p-4 bg-dark-card-hover rounded-lg border border-dark-border hover:border-purple-500 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-dark-text">Upgrade to Lifetime</span>
                          <span className="px-2 py-0.5 bg-purple-700 text-purple-200 text-xs rounded">25% OFF</span>
                        </div>
                        <p className="text-sm text-dark-text-muted mt-1">STAY25 coupon auto-applied</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-dark-text-dim line-through">$99.00</p>
                        <p className="text-xl font-bold text-purple-400">$74.25</p>
                        <p className="text-xs text-dark-text-dim">one-time</p>
                      </div>
                    </div>
                    {loading && selectedPlan === 'lifetime' && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Loading checkout...
                      </div>
                    )}
                  </button>

                  {/* Switch to Monthly */}
                  <button
                    onClick={() => handleSelectPlan('monthly')}
                    disabled={loading}
                    className="w-full p-4 bg-dark-bg rounded-lg border border-dark-border hover:border-yellow-500/50 transition-colors text-left disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-medium text-dark-text">Switch to Monthly</span>
                        <p className="text-sm text-dark-text-muted mt-1">Takes effect at next renewal</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-dark-text-muted">$6.99</p>
                        <p className="text-xs text-dark-text-dim">per month</p>
                      </div>
                    </div>
                    {loading && selectedPlan === 'monthly' && (
                      <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                        Loading checkout...
                      </div>
                    )}
                  </button>

                  <p className="text-xs text-dark-text-dim text-center">
                    Switching to monthly will take effect when your current annual subscription ends.
                  </p>
                </>
              )}
            </div>
          ) : !stripePromise ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-amber-400 mb-4">Payment system is being configured.</p>
              <p className="text-gray-400 text-sm">Please contact support@mineglance.com</p>
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
                Back to options
              </button>
              <div style={{ minHeight: '400px' }}>
                <EmbeddedCheckoutProvider
                  stripe={stripePromise}
                  options={{
                    clientSecret,
                    onComplete: () => {
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-gray-400">Loading checkout...</p>
            </div>
          )}
        </div>

        {/* Footer - only show on select step */}
        {step === 'select' && (
          <div className="px-6 py-4 border-t border-dark-border flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full px-4 py-2 text-dark-text-muted hover:text-dark-text transition-colors text-sm"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
