'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './auth-context'
import Link from 'next/link'
import Image from 'next/image'

interface DashboardStats {
  activeDevices: number
  maxDevices: number
  profileComplete: number
  memberSince: string
}

export default function DashboardOverview() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLicenseKey, setShowLicenseKey] = useState(false)

  useEffect(() => {
    loadStats()
  }, [])

  async function loadStats() {
    const token = localStorage.getItem('user_token')
    if (!token) return

    try {
      // Get devices count
      const devicesRes = await fetch('/api/dashboard/devices', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      // Get profile completion
      const profileRes = await fetch('/api/dashboard/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      let activeDevices = 0
      let maxDevices = 3
      let profileComplete = 0
      let memberSince = new Date().toISOString()

      if (devicesRes.ok) {
        const devicesData = await devicesRes.json()
        activeDevices = devicesData.activeCount || 0
        maxDevices = devicesData.maxActivations || 3
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json()
        memberSince = profileData.profile?.createdAt || new Date().toISOString()

        // Calculate profile completion percentage
        const fields = [
          profileData.profile?.fullName,
          profileData.profile?.phone,
          profileData.profile?.addressLine1,
          profileData.profile?.city,
          profileData.profile?.country,
          profileData.profile?.profilePhoto
        ]
        const filledFields = fields.filter(Boolean).length
        profileComplete = Math.round((filledFields / fields.length) * 100)
      }

      setStats({ activeDevices, maxDevices, profileComplete, memberSince })
    } catch (e) {
      console.error('Failed to load stats:', e)
    } finally {
      setLoading(false)
    }
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
      {/* Welcome Card */}
      <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center overflow-hidden">
            {user?.profilePhoto ? (
              <Image
                src={user.profilePhoto}
                alt="Profile"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold">
                {user?.email?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-white/70 mt-1">
              MineGlance Pro member since {new Date(stats?.memberSince || '').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="ml-auto">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-400 text-yellow-900">
              {user?.plan?.toUpperCase() || 'PRO'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Devices Card */}
        <Link href="/dashboard/devices" className="block">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Active Devices</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats?.activeDevices}/{stats?.maxDevices}
                </p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all"
                style={{ width: `${((stats?.activeDevices || 0) / (stats?.maxDevices || 3)) * 100}%` }}
              />
            </div>
          </div>
        </Link>

        {/* Profile Card */}
        <Link href="/dashboard/profile" className="block">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:border-primary/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-gray-500">Profile Complete</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.profileComplete}%</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${(stats?.profileComplete || 0) >= 80 ? 'bg-green-500' : 'bg-amber-500'}`}
                style={{ width: `${stats?.profileComplete}%` }}
              />
            </div>
          </div>
        </Link>

        {/* License Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-gray-500">License Key</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-mono text-gray-900">
                  {showLicenseKey
                    ? user?.licenseKey
                    : user?.licenseKey
                      ? `${user.licenseKey.substring(0, 4)}-••••-••••-••••`
                      : '••••-••••-••••-••••'}
                </p>
                <button
                  onClick={() => setShowLicenseKey(!showLicenseKey)}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                  title={showLicenseKey ? 'Hide license key' : 'Show license key'}
                >
                  {showLicenseKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-green-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            License Active
          </div>
        </div>
      </div>

      {/* Pro Plus Upgrade Ad - Only shown for Pro (not Pro Plus) members */}
      {user?.plan?.toLowerCase() === 'pro' && (
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-24 -translate-x-24" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-400 text-yellow-900">
                    LIMITED OFFER
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-white/20 text-white">
                    10% OFF
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2">Upgrade to Pro Plus</h3>
                <p className="text-white/80 text-sm max-w-lg">
                  As a valued Pro member, get exclusive access to Pro Plus features at 10% off:
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-white/90">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Unlimited wallet tracking (no 1-wallet limit)
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Priority email alerts with custom thresholds
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    5 device activations (vs 3)
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Early access to mobile app
                  </li>
                </ul>
              </div>
              <div className="flex-shrink-0 text-center">
                <div className="text-3xl font-bold">$4.49</div>
                <div className="text-sm text-white/60 line-through">$4.99</div>
                <div className="text-xs text-white/70 mt-1">one-time</div>
              </div>
            </div>
            <div className="mt-4">
              <a
                href="https://mineglance.com/#pricing"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-purple-700 rounded-lg font-semibold hover:bg-yellow-400 hover:text-yellow-900 transition-colors"
              >
                Upgrade Now
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <p className="text-xs text-white/50 mt-2">Use code PROPLUS10 at checkout</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Edit Profile</span>
          </Link>

          <Link
            href="/dashboard/devices"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Manage Devices</span>
          </Link>

          <a
            href="https://chrome.google.com/webstore/detail/mineglance"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Install Extension</span>
          </a>

          <a
            href="mailto:control@mineglance.com"
            className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-700">Get Support</span>
          </a>
        </div>
      </div>

      {/* Mobile App Coming Soon */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Mobile App Coming Soon</h3>
            <p className="text-sm text-gray-600 mt-1">
              Monitor your mining rigs on the go! The MineGlance mobile app for iOS and Android is in development.
              Your Pro subscription will include full mobile access.
            </p>
            <p className="text-sm text-amber-700 font-medium mt-2">
              Use the QR code feature in the extension settings to sync your wallets when it launches!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
