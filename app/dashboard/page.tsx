'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './auth-context'
import Link from 'next/link'
import Image from 'next/image'
import CheckoutModal from '@/components/CheckoutModal'

interface DashboardStats {
  activeDevices: number
  profileComplete: number
  memberSince: string
}

export default function DashboardOverview() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLicenseKey, setShowLicenseKey] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

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
      let profileComplete = 0
      let memberSince = new Date().toISOString()

      if (devicesRes.ok) {
        const devicesData = await devicesRes.json()
        activeDevices = devicesData.activeCount || 0
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

      setStats({ activeDevices, profileComplete, memberSince })
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
      <div className="glass-card rounded-xl p-6 border border-primary/30">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
            {user?.profilePhoto ? (
              <Image
                src={user.profilePhoto}
                alt="Profile"
                width={64}
                height={64}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-primary">
                {user?.email?.[0]?.toUpperCase() || '?'}
              </span>
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-dark-text">
              Welcome back{user?.fullName ? `, ${user.fullName.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-dark-text-muted mt-1">
              MineGlance member since {new Date(stats?.memberSince || '').toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="ml-auto">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              user?.plan === 'pro' || user?.plan === 'bundle'
                ? 'bg-primary text-white'
                : 'bg-dark-border text-dark-text-muted'
            }`}>
              {user?.plan === 'bundle' ? 'PRO+' : user?.plan === 'pro' ? 'PRO' : 'FREE'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Devices Card */}
        <Link href="/dashboard/devices" className="block">
          <div className="glass-card rounded-xl p-6 hover:border-primary/50 transition-colors border border-dark-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-dark-text-muted">Connected Devices</p>
                <p className="text-2xl font-bold text-dark-text">
                  {stats?.activeDevices || 0}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-dark-text-muted">Extension, iOS &amp; Android</p>
          </div>
        </Link>

        {/* Profile Card */}
        <Link href="/dashboard/profile" className="block">
          <div className="glass-card rounded-xl p-6 hover:border-primary/50 transition-colors border border-dark-border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center">
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-dark-text-muted">Profile Complete</p>
                <p className="text-2xl font-bold text-dark-text">{stats?.profileComplete}%</p>
              </div>
            </div>
            <div className="mt-4 h-2 bg-dark-card-hover rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${(stats?.profileComplete || 0) >= 80 ? 'bg-primary' : 'bg-amber-500'}`}
                style={{ width: `${stats?.profileComplete}%` }}
              />
            </div>
          </div>
        </Link>

        {/* License Card */}
        <div className="glass-card rounded-xl p-6 border border-dark-border">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              user?.licenseKey ? 'bg-purple-500/20' : 'bg-dark-card-hover'
            }`}>
              <svg className={`w-6 h-6 ${user?.licenseKey ? 'text-purple-400' : 'text-dark-text-muted'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm text-dark-text-muted">License</p>
              {user?.licenseKey ? (
                <div className="flex items-center gap-2">
                  <p className="text-lg font-mono text-dark-text">
                    {showLicenseKey
                      ? user.licenseKey
                      : `${user.licenseKey.substring(0, 4)}-****-****-****`}
                  </p>
                  <button
                    onClick={() => setShowLicenseKey(!showLicenseKey)}
                    className="p-1 text-dark-text-muted hover:text-dark-text transition-colors"
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
              ) : (
                <p className="text-lg text-dark-text-muted">Free Plan</p>
              )}
            </div>
          </div>
          {user?.licenseKey ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-primary">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Pro License Active
            </div>
          ) : (
            <div className="mt-4">
              <a href="/#pricing" className="text-sm text-primary hover:underline">
                Upgrade to Pro →
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Pro Plus Upgrade Ad - Show for Pro members who don't have Pro Plus */}
      {user?.plan && user.plan !== 'bundle' && (
        <div className="glass-card rounded-xl p-6 border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full -translate-y-32 translate-x-32" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full translate-y-24 -translate-x-24" />
          <div className="relative z-10">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-yellow-400 text-yellow-900">
                    EXISTING MEMBER OFFER
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-primary/20 text-primary">
                    10% OFF
                  </span>
                </div>
                <h3 className="text-xl font-bold text-dark-text mb-2">Add Mobile App Access</h3>
                <p className="text-dark-text-muted text-sm max-w-lg">
                  As a valued Pro member, get exclusive access to the mobile app at 10% off:
                </p>
                <ul className="mt-3 space-y-1.5 text-sm text-dark-text-muted">
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    iOS &amp; Android mobile app access
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Push notifications for alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Monitor rigs on the go
                  </li>
                  <li className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Cloud sync across all devices
                  </li>
                </ul>
              </div>
              <div className="flex-shrink-0 text-center">
                <div className="text-3xl font-bold text-dark-text">$27</div>
                <div className="text-sm text-dark-text-dim line-through">$30</div>
                <div className="text-xs text-dark-text-muted mt-1">upgrade price</div>
              </div>
            </div>
            <div className="mt-4">
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg font-semibold hover:bg-primary-light transition-colors shadow-glow hover:shadow-glow-lg"
              >
                Upgrade Now
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
              <p className="text-xs text-dark-text-dim mt-2">10% off for existing members</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="glass-card rounded-xl p-6 border border-dark-border">
        <h2 className="text-lg font-semibold text-dark-text mb-4">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/dashboard/profile"
            className="flex items-center gap-3 p-4 bg-dark-card-hover rounded-lg hover:bg-dark-border transition-colors"
          >
            <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span className="text-sm font-medium text-dark-text">Edit Profile</span>
          </Link>

          <Link
            href="/dashboard/devices"
            className="flex items-center gap-3 p-4 bg-dark-card-hover rounded-lg hover:bg-dark-border transition-colors"
          >
            <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            <span className="text-sm font-medium text-dark-text">Manage Devices</span>
          </Link>

          <a
            href="https://chrome.google.com/webstore/detail/mineglance"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-4 bg-dark-card-hover rounded-lg hover:bg-dark-border transition-colors"
          >
            <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span className="text-sm font-medium text-dark-text">Install Extension</span>
          </a>

          <a
            href="mailto:control@mineglance.com"
            className="flex items-center gap-3 p-4 bg-dark-card-hover rounded-lg hover:bg-dark-border transition-colors"
          >
            <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <span className="text-sm font-medium text-dark-text">Get Support</span>
          </a>
        </div>
      </div>

      {/* Upgrade Modal */}
      <CheckoutModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        plan="pro"
        userEmail={user?.email}
      />
    </div>
  )
}
