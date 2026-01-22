'use client'

import { useState } from 'react'

interface ManagePlanModalProps {
  isOpen: boolean
  onClose: () => void
  billingType: 'monthly' | 'annual' | 'lifetime' | null | undefined
}

export default function ManagePlanModal({ isOpen, onClose, billingType }: ManagePlanModalProps) {
  const [loading, setLoading] = useState<string | null>(null)

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

  const handleUpgrade = (plan: 'annual' | 'lifetime') => {
    setLoading(plan)
    // Direct to Stripe checkout with coupons
    if (plan === 'annual') {
      // STAY10 = 10% off annual
      window.location.href = 'https://buy.stripe.com/dR617I4DP42l1LqcMN?prefilled_promo_code=STAY10'
    } else {
      // STAY25 = 25% off lifetime
      window.location.href = 'https://buy.stripe.com/4gw4jUcglaUNc0U7st?prefilled_promo_code=STAY25'
    }
  }

  const handleSwitchToMonthly = () => {
    setLoading('monthly')
    window.location.href = 'https://buy.stripe.com/8wMcQq2vH6at0HmeUX'
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-dark-card rounded-xl border border-dark-border max-w-lg w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-dark-text">Manage Your Plan</h3>
          <button onClick={onClose} className="text-dark-text-muted hover:text-dark-text p-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
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

          {/* Options based on billing type */}
          {billingType === 'monthly' && (
            <>
              <p className="text-sm text-dark-text-muted">Upgrade your plan to save money:</p>

              {/* Annual Option */}
              <button
                onClick={() => handleUpgrade('annual')}
                disabled={loading !== null}
                className="w-full p-4 bg-dark-card-hover rounded-lg border border-dark-border hover:border-blue-500 transition-colors text-left group disabled:opacity-50"
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
                    <p className="text-sm text-dark-text-dim line-through">$59</p>
                    <p className="text-xl font-bold text-green-400">$53.10</p>
                    <p className="text-xs text-dark-text-dim">per year</p>
                  </div>
                </div>
                {loading === 'annual' && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Redirecting to checkout...
                  </div>
                )}
              </button>

              {/* Lifetime Option */}
              <button
                onClick={() => handleUpgrade('lifetime')}
                disabled={loading !== null}
                className="w-full p-4 bg-dark-card-hover rounded-lg border border-dark-border hover:border-purple-500 transition-colors text-left group disabled:opacity-50"
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
                    <p className="text-sm text-dark-text-dim line-through">$99</p>
                    <p className="text-xl font-bold text-purple-400">$74.25</p>
                    <p className="text-xs text-dark-text-dim">one-time</p>
                  </div>
                </div>
                {loading === 'lifetime' && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Redirecting to checkout...
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
                onClick={() => handleUpgrade('lifetime')}
                disabled={loading !== null}
                className="w-full p-4 bg-dark-card-hover rounded-lg border border-dark-border hover:border-purple-500 transition-colors text-left group disabled:opacity-50"
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
                    <p className="text-sm text-dark-text-dim line-through">$99</p>
                    <p className="text-xl font-bold text-purple-400">$74.25</p>
                    <p className="text-xs text-dark-text-dim">one-time</p>
                  </div>
                </div>
                {loading === 'lifetime' && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Redirecting to checkout...
                  </div>
                )}
              </button>

              {/* Switch to Monthly */}
              <button
                onClick={handleSwitchToMonthly}
                disabled={loading !== null}
                className="w-full p-4 bg-dark-bg rounded-lg border border-dark-border hover:border-yellow-500/50 transition-colors text-left group disabled:opacity-50"
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
                {loading === 'monthly' && (
                  <div className="mt-2 flex items-center gap-2 text-sm text-primary">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Redirecting to checkout...
                  </div>
                )}
              </button>

              <p className="text-xs text-dark-text-dim text-center">
                Switching to monthly will take effect when your current annual subscription ends.
              </p>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-dark-border">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-dark-text-muted hover:text-dark-text transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
