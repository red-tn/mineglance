'use client'

import { useState, useEffect, useCallback } from 'react'
import UpgradeModal from '@/components/UpgradeModal'
import RetentionOfferModal from '@/components/RetentionOfferModal'
import ManagePlanModal from '@/components/ManagePlanModal'

interface PaymentHistoryItem {
  id: string
  stripe_payment_id?: string
  stripe_payment_intent?: string
  amount: number
  currency: string
  status: 'succeeded' | 'pending' | 'failed' | 'refunded'
  type: 'subscription' | 'renewal' | 'refund' | 'upgrade'
  description?: string
  created_at: string
}

interface SubscriptionData {
  plan: 'free' | 'pro'
  billingType?: 'monthly' | 'annual' | 'lifetime' | null
  licenseKey?: string
  amountPaid?: number
  subscriptionStartDate?: string
  subscriptionEndDate?: string
  stripePaymentId?: string
  createdAt: string
  isRevoked: boolean
  daysSinceSubscription?: number
  daysUntilExpiry?: number
  canRequestRefund: boolean
  shouldShowRenew: boolean
  isLifetime?: boolean
}

export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showRetentionModal, setShowRetentionModal] = useState(false)
  const [showManagePlanModal, setShowManagePlanModal] = useState(false)

  const fetchSubscription = useCallback(async () => {
    try {
      const token = localStorage.getItem('user_token')
      const response = await fetch('/api/dashboard/subscription', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch subscription')
      }

      const data = await response.json()
      setSubscription(data.subscription)
      setPaymentHistory(data.paymentHistory || [])
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSubscription()
  }, [fetchSubscription])

  const handleRequestRefund = () => {
    setShowRetentionModal(true)
  }

  const handleAcceptOffer = async (offer: 'free_month' | 'annual_discount' | 'lifetime_discount') => {
    const token = localStorage.getItem('user_token')
    const response = await fetch('/api/dashboard/subscription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'accept_retention_offer', offer })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to apply offer')
    }

    setMessage({ type: 'success', text: data.message })
    fetchSubscription()

    // Return the response for potential checkout URL redirect
    return data
  }

  const handleProceedWithRefund = async () => {
    const token = localStorage.getItem('user_token')
    const response = await fetch('/api/dashboard/subscription', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ action: 'request_refund' })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Failed to submit refund request')
    }

    setMessage({ type: 'success', text: data.message })
    fetchSubscription()
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatAmount = (amount: number) => {
    const dollars = Math.abs(amount) / 100
    const sign = amount < 0 ? '-' : ''
    return `${sign}$${dollars.toFixed(2)}`
  }

  const getPaymentStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      succeeded: 'bg-green-900 text-green-200',
      pending: 'bg-yellow-900 text-yellow-200',
      failed: 'bg-red-900 text-red-200',
      refunded: 'bg-purple-900 text-purple-200'
    }
    return colors[status] || 'bg-gray-700 text-gray-200'
  }

  const getPaymentTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      subscription: 'bg-blue-900 text-blue-200',
      renewal: 'bg-cyan-900 text-cyan-200',
      refund: 'bg-purple-900 text-purple-200',
      upgrade: 'bg-green-900 text-green-200'
    }
    return colors[type] || 'bg-gray-700 text-gray-200'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Message Banner */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-900/50 border border-green-700 text-green-200' : 'bg-red-900/50 border border-red-700 text-red-200'}`}>
          {message.text}
        </div>
      )}

      {/* Subscription Overview */}
      <div className="glass-card rounded-xl border border-dark-border p-6">
        <h2 className="text-xl font-bold text-dark-text mb-6">Subscription Status</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Plan */}
          <div className="bg-dark-card-hover rounded-lg p-4">
            <p className="text-sm text-dark-text-muted mb-1">Current Plan</p>
            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-sm ${subscription?.plan === 'pro' ? 'bg-green-700 text-green-200' : 'bg-gray-700 text-gray-200'}`}>
                {subscription?.plan === 'pro' ? 'PRO' : 'FREE'}
              </span>
              {subscription?.plan === 'pro' && subscription?.billingType && (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  subscription.billingType === 'lifetime'
                    ? 'bg-purple-700 text-purple-200'
                    : subscription.billingType === 'annual'
                    ? 'bg-blue-700 text-blue-200'
                    : 'bg-yellow-700 text-yellow-200'
                }`}>
                  {subscription.billingType === 'lifetime' ? 'Lifetime' : subscription.billingType === 'annual' ? 'Annual' : 'Monthly'}
                </span>
              )}
            </div>
          </div>

          {/* Amount Paid */}
          {subscription?.plan === 'pro' && (
            <div className="bg-dark-card-hover rounded-lg p-4">
              <p className="text-sm text-dark-text-muted mb-1">Amount Paid</p>
              <p className="text-2xl font-bold text-dark-text">
                {subscription?.amountPaid ? formatAmount(subscription.amountPaid) : '$59.00'}
              </p>
            </div>
          )}

          {/* Subscription Date */}
          {subscription?.subscriptionStartDate && (
            <div className="bg-dark-card-hover rounded-lg p-4">
              <p className="text-sm text-dark-text-muted mb-1">Subscribed Since</p>
              <p className="text-lg font-semibold text-dark-text">
                {formatDate(subscription.subscriptionStartDate)}
              </p>
              <p className="text-xs text-dark-text-dim">
                {subscription.daysSinceSubscription} days ago
              </p>
            </div>
          )}

          {/* Expiry Date */}
          {subscription?.plan === 'pro' && (
            <div className="bg-dark-card-hover rounded-lg p-4">
              <p className="text-sm text-dark-text-muted mb-1">
                {subscription?.isLifetime ? 'Status' : 'Expires'}
              </p>
              {subscription?.isLifetime ? (
                <>
                  <p className="text-lg font-semibold text-purple-400">Never Expires</p>
                  <p className="text-xs text-dark-text-dim">Lifetime access</p>
                </>
              ) : subscription?.subscriptionEndDate ? (
                <>
                  <p className="text-lg font-semibold text-dark-text">
                    {formatDate(subscription.subscriptionEndDate)}
                  </p>
                  {subscription.daysUntilExpiry !== null && subscription.daysUntilExpiry !== undefined && (
                    <p className={`text-xs ${(subscription.daysUntilExpiry ?? 0) <= 30 ? 'text-yellow-400' : 'text-dark-text-dim'}`}>
                      {(subscription.daysUntilExpiry ?? 0) > 0 ? `${subscription.daysUntilExpiry} days remaining` : 'Expired'}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-lg font-semibold text-dark-text-muted">-</p>
              )}
            </div>
          )}
        </div>

        {/* License Key */}
        {subscription?.licenseKey && (
          <div className="mt-6 p-4 bg-dark-bg rounded-lg">
            <p className="text-sm text-dark-text-muted mb-2">License Key</p>
            <code className="text-lg font-mono text-primary break-all">{subscription.licenseKey}</code>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-4 items-center">
          {/* Renew Button */}
          {subscription?.shouldShowRenew && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-light font-medium transition-colors"
            >
              Renew Subscription
            </button>
          )}

          {/* Upgrade Button for Free Users */}
          {subscription?.plan === 'free' && (
            <button
              onClick={() => setShowUpgradeModal(true)}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-light font-medium transition-colors"
            >
              Upgrade to Pro
            </button>
          )}

          {/* Manage Plan Button for Pro Users (not lifetime) */}
          {subscription?.plan === 'pro' && subscription?.billingType !== 'lifetime' && (
            <button
              onClick={() => setShowManagePlanModal(true)}
              className="px-4 py-2 text-sm bg-dark-card-hover text-dark-text rounded-lg hover:bg-dark-border transition-colors"
            >
              Manage Plan
            </button>
          )}

          {/* Cancel Plan Button */}
          {subscription?.canRequestRefund && (
            <button
              onClick={handleRequestRefund}
              disabled={actionLoading}
              className="px-4 py-2 text-sm text-dark-text-muted hover:text-red-400 transition-colors"
            >
              {actionLoading ? 'Submitting...' : 'Cancel Plan'}
            </button>
          )}
        </div>

        {/* Billing Info Note */}
        {subscription?.plan === 'pro' && (
          <p className="mt-4 text-sm text-dark-text-dim">
            {subscription.isLifetime ? (
              'You have lifetime access - your subscription never expires.'
            ) : subscription.canRequestRefund ? (
              `You have ${30 - (subscription.daysSinceSubscription || 0)} days remaining to request a refund.`
            ) : subscription.billingType === 'monthly' ? (
              'Your subscription renews monthly at $6.99.'
            ) : (
              'The 30-day refund period has ended. Your subscription renews yearly at $59.'
            )}
          </p>
        )}
      </div>

      {/* Payment History */}
      <div className="glass-card rounded-xl border border-dark-border p-6">
        <h2 className="text-xl font-bold text-dark-text mb-6">Payment History</h2>

        {paymentHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-card-hover">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-dark-text-muted uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-border">
                {paymentHistory.map((payment) => (
                  <tr key={payment.id} className="hover:bg-dark-card-hover">
                    <td className="px-4 py-3 text-dark-text">
                      {formatDate(payment.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPaymentTypeBadge(payment.type)}`}>
                        {payment.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-dark-text-muted text-sm">
                      {payment.description || '-'}
                    </td>
                    <td className={`px-4 py-3 font-medium ${payment.amount < 0 ? 'text-red-400' : 'text-green-400'}`}>
                      {formatAmount(payment.amount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${getPaymentStatusBadge(payment.status)}`}>
                        {payment.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8">
            <svg className="w-12 h-12 text-dark-text-muted mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-dark-text-muted">No payment history found</p>
            {subscription?.plan === 'free' && (
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="inline-block mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-light text-sm font-medium"
              >
                Upgrade to Pro
              </button>
            )}
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="glass-card rounded-xl border border-dark-border p-6">
        <h3 className="text-lg font-semibold text-dark-text mb-4">Need Help?</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-dark-card-hover rounded-lg">
            <h4 className="font-medium text-dark-text mb-2">Refund Policy</h4>
            <p className="text-sm text-dark-text-muted">
              You can request a full refund within 30 days of your subscription purchase. Refunds are processed within 3-5 business days.
            </p>
          </div>
          <div className="p-4 bg-dark-card-hover rounded-lg">
            <h4 className="font-medium text-dark-text mb-2">Contact Support</h4>
            <p className="text-sm text-dark-text-muted">
              For billing questions or issues, contact us at{' '}
              <a href="mailto:support@mineglance.com" className="text-primary hover:text-primary-light">
                support@mineglance.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      {/* Retention Offer Modal */}
      <RetentionOfferModal
        isOpen={showRetentionModal}
        onClose={() => setShowRetentionModal(false)}
        onAcceptOffer={handleAcceptOffer}
        onProceedWithRefund={handleProceedWithRefund}
        billingType={subscription?.billingType}
      />

      {/* Manage Plan Modal */}
      <ManagePlanModal
        isOpen={showManagePlanModal}
        onClose={() => setShowManagePlanModal(false)}
        billingType={subscription?.billingType}
      />
    </div>
  )
}
