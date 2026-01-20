'use client'

import { useState } from 'react'

interface RetentionOfferResult {
  checkoutUrl?: string
}

interface RetentionOfferModalProps {
  isOpen: boolean
  onClose: () => void
  onAcceptOffer: (offer: 'free_month' | 'annual_discount' | 'lifetime_discount') => Promise<RetentionOfferResult | void>
  onProceedWithRefund: () => Promise<void>
  billingType?: 'monthly' | 'annual' | 'lifetime' | null
}

export default function RetentionOfferModal({
  isOpen,
  onClose,
  onAcceptOffer,
  onProceedWithRefund,
  billingType
}: RetentionOfferModalProps) {
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleAcceptOffer = async (offer: 'free_month' | 'annual_discount' | 'lifetime_discount') => {
    setLoading(offer)
    setError(null)
    try {
      const result = await onAcceptOffer(offer)
      // If there's a checkout URL, redirect to it
      if (result && typeof result === 'object' && 'checkoutUrl' in result) {
        window.open((result as { checkoutUrl: string }).checkoutUrl, '_blank')
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to apply offer')
    } finally {
      setLoading(null)
    }
  }

  const handleProceedWithRefund = async () => {
    setLoading('refund')
    setError(null)
    try {
      await onProceedWithRefund()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process refund')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-dark-card border border-dark-border rounded-2xl p-8 max-w-lg w-full mx-4 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-dark-text-muted hover:text-dark-text transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-dark-text mb-2">Wait! Before You Go...</h2>
          <p className="text-dark-text-muted">
            We&apos;d hate to see you leave. Here are some special offers just for you:
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-200 text-sm">
            {error}
          </div>
        )}

        {/* Offer Cards */}
        <div className="space-y-3 mb-6">
          {/* Free Month Offer */}
          <button
            onClick={() => handleAcceptOffer('free_month')}
            disabled={loading !== null}
            className="w-full p-4 bg-gradient-to-r from-green-900/50 to-green-800/30 border border-green-700/50 rounded-xl hover:border-green-500 transition-all group text-left disabled:opacity-50"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-dark-text group-hover:text-green-400 transition-colors">
                  Free Month Extension
                </h3>
                <p className="text-sm text-dark-text-muted">
                  Get 1 month added to your subscription for free
                </p>
              </div>
              <div className="text-green-400 font-bold">FREE</div>
            </div>
            {loading === 'free_month' && (
              <div className="mt-2 flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-400"></div>
              </div>
            )}
          </button>

          {/* 10% Off Annual Offer - only show if not already on annual */}
          {billingType !== 'annual' && billingType !== 'lifetime' && (
            <button
              onClick={() => handleAcceptOffer('annual_discount')}
              disabled={loading !== null}
              className="w-full p-4 bg-gradient-to-r from-blue-900/50 to-blue-800/30 border border-blue-700/50 rounded-xl hover:border-blue-500 transition-all group text-left disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-dark-text group-hover:text-blue-400 transition-colors">
                    10% Off Annual Plan
                  </h3>
                  <p className="text-sm text-dark-text-muted">
                    Switch to annual and save 10% - only $53.10/year
                  </p>
                </div>
                <div className="text-blue-400 font-bold">10% OFF</div>
              </div>
              {loading === 'annual_discount' && (
                <div className="mt-2 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-400"></div>
                </div>
              )}
            </button>
          )}

          {/* 25% Off Lifetime Offer - only show if not already lifetime */}
          {billingType !== 'lifetime' && (
            <button
              onClick={() => handleAcceptOffer('lifetime_discount')}
              disabled={loading !== null}
              className="w-full p-4 bg-gradient-to-r from-purple-900/50 to-purple-800/30 border border-purple-700/50 rounded-xl hover:border-purple-500 transition-all group text-left disabled:opacity-50"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-dark-text group-hover:text-purple-400 transition-colors">
                    25% Off Lifetime Access
                  </h3>
                  <p className="text-sm text-dark-text-muted">
                    Go lifetime and never pay again - only $74.25
                  </p>
                </div>
                <div className="text-purple-400 font-bold">25% OFF</div>
              </div>
              {loading === 'lifetime_discount' && (
                <div className="mt-2 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
                </div>
              )}
            </button>
          )}
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-dark-border"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-dark-card text-dark-text-muted">or</span>
          </div>
        </div>

        {/* Proceed with Refund Button */}
        <button
          onClick={handleProceedWithRefund}
          disabled={loading !== null}
          className="w-full py-3 text-dark-text-muted hover:text-red-400 transition-colors text-sm disabled:opacity-50"
        >
          {loading === 'refund' ? (
            <span className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-400"></div>
              Processing refund...
            </span>
          ) : (
            'No thanks, proceed with refund request'
          )}
        </button>
      </div>
    </div>
  )
}
