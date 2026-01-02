'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../auth-context'
import { loadStripe } from '@stripe/stripe-js'
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface Device {
  id: string
  installId: string
  deviceName: string
  browser: string | null
  version: string | null
  activatedAt: string
  lastSeen: string | null
  isActive: boolean
}

export default function DevicesPage() {
  const { user } = useAuth()
  const [devices, setDevices] = useState<Device[]>([])
  const [maxActivations, setMaxActivations] = useState(3)
  const [activeCount, setActiveCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [deactivating, setDeactivating] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [licenseQuantity, setLicenseQuantity] = useState(1)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [purchasing, setPurchasing] = useState(false)
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)

  useEffect(() => {
    loadDevices()
    // Check for success param in URL (returned from Stripe checkout)
    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.get('success') === 'true') {
      setPurchaseSuccess(true)
      // Remove the query param from URL
      window.history.replaceState({}, '', '/dashboard/devices')
      // Reload devices to get updated max_activations
      setTimeout(() => loadDevices(), 1000)
    }
  }, [])

  const fetchClientSecret = useCallback(async () => {
    if (!user?.email) return ''
    const res = await fetch('/api/create-license-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, quantity: licenseQuantity })
    })
    const data = await res.json()
    if (data.error) {
      setError(data.error)
      return ''
    }
    return data.clientSecret
  }, [user?.email, licenseQuantity])

  async function startPurchase() {
    setPurchasing(true)
    setError('')
    try {
      const secret = await fetchClientSecret()
      if (secret) {
        setClientSecret(secret)
      }
    } catch (e) {
      setError('Failed to start checkout. Please try again.')
    } finally {
      setPurchasing(false)
    }
  }

  function closePurchaseModal() {
    setShowPurchaseModal(false)
    setClientSecret(null)
    setLicenseQuantity(1)
  }

  async function loadDevices() {
    const token = localStorage.getItem('user_token')
    if (!token) return

    try {
      const res = await fetch('/api/dashboard/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setDevices(data.devices)
        setMaxActivations(data.maxActivations)
        setActiveCount(data.activeCount)
      }
    } catch (e) {
      console.error('Failed to load devices:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleDeactivate(installId: string) {
    if (!confirm('Are you sure you want to deactivate this device? It will need to be re-activated to use MineGlance Pro.')) {
      return
    }

    setDeactivating(installId)
    setError('')

    const token = localStorage.getItem('user_token')
    if (!token) return

    try {
      const res = await fetch(`/api/dashboard/devices?installId=${installId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        // Refresh the list
        loadDevices()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to deactivate device')
      }
    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setDeactivating(null)
    }
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  function getTimeSince(dateString: string | null) {
    if (!dateString) return null
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffMins < 5) return 'Active now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <svg className="animate-spin h-8 w-8 text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Active Devices</h2>
            <p className="text-sm text-gray-500 mt-1">
              Manage devices using your MineGlance Pro license
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{activeCount}/{maxActivations}</p>
            <p className="text-xs text-gray-500">activations used</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${activeCount >= maxActivations ? 'bg-amber-500' : 'bg-accent'}`}
            style={{ width: `${(activeCount / maxActivations) * 100}%` }}
          />
        </div>

        {activeCount >= maxActivations && (
          <p className="mt-3 text-sm text-amber-600">
            You&apos;ve reached your activation limit. Deactivate a device to activate a new one.
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
          {error}
        </div>
      )}

      {/* Devices List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">All Devices</h3>
        </div>

        {devices.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <p className="font-medium">No devices found</p>
            <p className="text-sm mt-1">Activate MineGlance Pro in your browser extension to see devices here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {devices.map((device) => {
              const recentActivity = getTimeSince(device.lastSeen)
              const isOnline = recentActivity === 'Active now'

              return (
                <li key={device.id} className="px-6 py-4">
                  <div className="flex items-start gap-4">
                    {/* Device Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${device.isActive ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400'}`}>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-medium ${device.isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                          {device.deviceName}
                        </h4>
                        {device.isActive ? (
                          isOnline ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
                              Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              Active
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-600">
                            Deactivated
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-gray-500">
                        {device.browser && (
                          <span>{device.browser}</span>
                        )}
                        {device.version && (
                          <span>v{device.version}</span>
                        )}
                        <span className="text-gray-300">|</span>
                        <span>Activated {formatDate(device.activatedAt)}</span>
                      </div>
                      {recentActivity && device.isActive && (
                        <p className="text-xs text-gray-400 mt-1">Last seen: {recentActivity}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1 font-mono">ID: {device.installId.substring(0, 16)}...</p>
                    </div>

                    {/* Actions */}
                    {device.isActive && (
                      <button
                        onClick={() => handleDeactivate(device.installId)}
                        disabled={deactivating === device.installId}
                        className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {deactivating === device.installId ? 'Deactivating...' : 'Deactivate'}
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Purchase Success Banner */}
      {purchaseSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h4 className="font-medium text-green-900">Additional licenses purchased!</h4>
            <p className="text-sm text-green-700">Your new activation limit has been updated.</p>
          </div>
          <button
            onClick={() => setPurchaseSuccess(false)}
            className="ml-auto text-green-600 hover:text-green-800"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Buy More Licenses */}
      <div className="bg-gradient-to-r from-primary/5 to-accent/5 border border-primary/20 rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 mb-1">Need more activations?</h4>
            <p className="text-sm text-gray-600 mb-4">
              Purchase additional licenses to use MineGlance Pro on more devices.
              Each license pack includes <strong>5 additional activations</strong> for only <strong>$5</strong>.
            </p>
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Buy More Licenses
            </button>
          </div>
        </div>
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Buy Additional Licenses</h3>
              <button
                onClick={closePurchaseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {clientSecret ? (
                <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                  <EmbeddedCheckout />
                </EmbeddedCheckoutProvider>
              ) : (
                <>
                  <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-4">
                      Each license pack adds <strong>5 activations</strong> to your account for <strong>$5</strong>.
                    </p>

                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Number of license packs
                    </label>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setLicenseQuantity(Math.max(1, licenseQuantity - 1))}
                        disabled={licenseQuantity <= 1}
                        className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        -
                      </button>
                      <span className="text-2xl font-bold text-gray-900 w-12 text-center">{licenseQuantity}</span>
                      <button
                        onClick={() => setLicenseQuantity(licenseQuantity + 1)}
                        className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 mb-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>License packs ({licenseQuantity}x)</span>
                      <span>${licenseQuantity * 5}.00</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Activations added</span>
                      <span className="font-medium text-accent">+{licenseQuantity * 5}</span>
                    </div>
                    <div className="border-t border-gray-200 my-2 pt-2">
                      <div className="flex justify-between text-base font-semibold text-gray-900">
                        <span>Total</span>
                        <span>${licenseQuantity * 5}.00</span>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
                      {error}
                    </div>
                  )}

                  <button
                    onClick={startPurchase}
                    disabled={purchasing}
                    className="w-full py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
                  >
                    {purchasing ? 'Loading...' : `Pay $${licenseQuantity * 5}.00`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
