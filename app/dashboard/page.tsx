'use client'

import { useState, useEffect } from 'react'
import { useAuth } from './auth-context'
import Link from 'next/link'
import Image from 'next/image'
import UpgradeModal from '@/components/UpgradeModal'
import ExtensionDownloadModal from '@/components/ExtensionDownloadModal'

interface DashboardStats {
  activeDevices: number
  profileComplete: number
  memberSince: string
}

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string
  featured_image_url: string | null
  published_at: string
  read_time: number
}

interface UpdateInfo {
  available: boolean
  currentVersion: string | null
  latestVersion: string
  downloadUrl: string
  releaseNotes: string | null
}

interface ExtensionRelease {
  version: string
  downloadUrl: string
  fileName: string
}

export default function DashboardOverview() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showLicenseKey, setShowLicenseKey] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showDownloadModal, setShowDownloadModal] = useState(false)
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([])
  const [renewalIgnored, setRenewalIgnored] = useState(false)
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null)
  const [updateDismissed, setUpdateDismissed] = useState(false)
  const [extensionRelease, setExtensionRelease] = useState<ExtensionRelease | null>(null)

  // Calculate days until subscription expires
  const daysUntilExpiry = user?.subscriptionEndDate
    ? Math.ceil((new Date(user.subscriptionEndDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  // Don't show renewal alert for lifetime users
  const isLifetime = user?.billingType === 'lifetime'
  const showRenewalAlert = user?.plan === 'pro' && !isLifetime && daysUntilExpiry !== null && daysUntilExpiry <= 30 && !renewalIgnored && !user?.renewalIgnored

  useEffect(() => {
    loadStats()
    loadBlogPosts()
    loadExtensionRelease()
  }, [])

  async function loadExtensionRelease() {
    try {
      const res = await fetch('/api/software/latest?platform=extension')
      if (res.ok) {
        const data = await res.json()
        if (data.version && data.downloadUrl) {
          // Extract filename from URL
          const fileName = data.downloadUrl.split('/').pop() || `mineglance-extension-${data.version}.zip`
          setExtensionRelease({
            version: data.version,
            downloadUrl: data.downloadUrl,
            fileName
          })
        }
      }
    } catch (e) {
      console.error('Failed to load extension release:', e)
    }
  }

  async function loadBlogPosts() {
    try {
      const res = await fetch('/api/blog?limit=5&pinned=dashboard')
      if (res.ok) {
        const data = await res.json()
        setBlogPosts(data.posts || [])
      }
    } catch (e) {
      console.error('Failed to load blog posts:', e)
    }
  }

  async function checkForUpdates(installedVersion: string | null) {
    try {
      const res = await fetch('/api/software/latest?platform=extension')
      if (!res.ok) return

      const data = await res.json()
      if (!data.version) return

      // Compare versions if user has an extension installed
      if (installedVersion) {
        const isNewer = compareVersions(data.version, installedVersion) > 0
        if (isNewer) {
          setUpdateInfo({
            available: true,
            currentVersion: installedVersion,
            latestVersion: data.version,
            downloadUrl: data.downloadUrl || '',
            releaseNotes: data.releaseNotes || null
          })
        }
      }
    } catch (e) {
      console.error('Failed to check for updates:', e)
    }
  }

  // Compare semantic versions: returns 1 if a > b, -1 if a < b, 0 if equal
  function compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number)
    const bParts = b.split('.').map(Number)

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0
      const bVal = bParts[i] || 0
      if (aVal > bVal) return 1
      if (aVal < bVal) return -1
    }
    return 0
  }

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
      let installedVersion: string | null = null

      if (devicesRes.ok) {
        const devicesData = await devicesRes.json()
        activeDevices = devicesData.activeCount || 0
        // Find the highest version among installed devices (most recent extension)
        if (devicesData.devices && devicesData.devices.length > 0) {
          const versions = devicesData.devices
            .map((d: { version?: string }) => d.version)
            .filter(Boolean) as string[]
          if (versions.length > 0) {
            installedVersion = versions.sort((a: string, b: string) => compareVersions(b, a))[0]
          }
        }
      }

      // Check for updates with the installed version
      checkForUpdates(installedVersion)

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
          <div className="ml-auto flex items-center gap-2">
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              user?.plan === 'pro' || user?.plan === 'bundle'
                ? 'bg-primary text-white'
                : 'bg-dark-border text-dark-text-muted'
            }`}>
              {user?.plan === 'bundle' ? 'PRO+' : user?.plan === 'pro' ? 'PRO' : 'FREE'}
            </span>
            {user?.plan === 'pro' && user?.billingType && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                user.billingType === 'lifetime'
                  ? 'bg-purple-500/20 text-purple-300'
                  : user.billingType === 'annual'
                  ? 'bg-blue-500/20 text-blue-300'
                  : 'bg-yellow-500/20 text-yellow-300'
              }`}>
                {user.billingType === 'lifetime' ? 'Lifetime' : user.billingType === 'annual' ? 'Annual' : 'Monthly'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Renewal Alert Banner */}
      {showRenewalAlert && (
        <div className={`glass-card rounded-xl p-4 border ${
          daysUntilExpiry !== null && daysUntilExpiry <= 7
            ? 'border-red-500/50 bg-red-500/10'
            : 'border-yellow-500/50 bg-yellow-500/10'
        }`}>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'bg-red-500/20' : 'bg-yellow-500/20'
              }`}>
                <svg className={`w-5 h-5 ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-red-400' : 'text-yellow-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className={`font-medium ${daysUntilExpiry !== null && daysUntilExpiry <= 7 ? 'text-red-400' : 'text-yellow-400'}`}>
                  {daysUntilExpiry !== null && daysUntilExpiry <= 0
                    ? 'Your subscription has expired'
                    : `Your subscription expires in ${daysUntilExpiry} days`}
                </p>
                <p className="text-sm text-dark-text-muted">
                  Renew now to keep Pro features.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-sm font-medium rounded-lg transition-colors"
              >
                Renew Now
              </button>
              <button
                onClick={() => setRenewalIgnored(true)}
                className="p-2 text-dark-text-muted hover:text-dark-text transition-colors"
                title="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Extension Update Available Banner */}
      {updateInfo?.available && !updateDismissed && (
        <div className="glass-card rounded-xl p-4 border border-blue-500/50 bg-blue-500/10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-blue-500/20">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-blue-400">
                  Extension Update Available
                </p>
                <p className="text-sm text-dark-text-muted">
                  Version {updateInfo.latestVersion} is available
                  {updateInfo.currentVersion && ` (you have ${updateInfo.currentVersion})`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {updateInfo.downloadUrl ? (
                <a
                  href={updateInfo.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Update Now
                </a>
              ) : (
                <button
                  onClick={() => setShowDownloadModal(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Update Now
                </button>
              )}
              <button
                onClick={() => setUpdateDismissed(true)}
                className="p-2 text-dark-text-muted hover:text-dark-text transition-colors"
                title="Dismiss"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

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
            <p className="mt-3 text-xs text-dark-text-muted">Browser Extension</p>
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
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="text-sm text-primary hover:underline"
              >
                Upgrade to Pro →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pro Upgrade Offer - Show for Free users */}
      {user?.plan === 'free' && (
        <div className="glass-card rounded-xl p-6 border border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-lg font-semibold text-dark-text">Upgrade to Pro</h3>
                <span className="px-2 py-0.5 bg-primary/20 text-primary text-xs font-medium rounded">10% OFF</span>
              </div>
              <p className="text-dark-text-muted text-sm mb-3">
                Unlock unlimited wallets, cloud sync, and email alerts.
              </p>
              <ul className="text-sm text-dark-text-muted space-y-1 mb-4">
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Unlimited wallets &amp; pools
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Cloud sync across devices
                </li>
                <li className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Email &amp; browser alerts
                </li>
              </ul>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="px-4 py-2 bg-primary hover:bg-primary-dark text-white font-medium rounded-lg transition-colors"
                >
                  Upgrade Now
                </button>
              </div>
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

          <Link
            href="/dashboard/alerts"
            className="flex items-center gap-3 p-4 bg-dark-card-hover rounded-lg hover:bg-dark-border transition-colors"
          >
            <svg className="w-5 h-5 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-sm font-medium text-dark-text">Alert Settings</span>
          </Link>

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

      {/* Download Extension */}
      <div className="glass-card rounded-xl p-6 border border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-dark-text">Download Extension</h2>
          {extensionRelease && (
            <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
              v{extensionRelease.version}
            </span>
          )}
        </div>
        {extensionRelease ? (
          <a
            href={extensionRelease.downloadUrl}
            download
            className="flex items-center gap-4 p-4 bg-dark-card-hover rounded-lg hover:bg-dark-border transition-colors group text-left w-full"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29L1.931 5.47zm13.412 2.514l-3.766 6.522a5.45 5.45 0 0 1 3.768 5.167A5.454 5.454 0 0 1 12 21.818l-.391.001h10.073A11.944 11.944 0 0 0 24 12c0-1.387-.236-2.721-.669-3.962H15.343z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-dark-text group-hover:text-primary transition-colors">Browser Extension</p>
              <p className="text-xs text-dark-text-muted">{extensionRelease.fileName}</p>
            </div>
            <svg className="w-5 h-5 text-dark-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </a>
        ) : (
          <button
            onClick={() => setShowDownloadModal(true)}
            className="flex items-center gap-4 p-4 bg-dark-card-hover rounded-lg hover:bg-dark-border transition-colors group text-left w-full"
          >
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C8.21 0 4.831 1.757 2.632 4.501l3.953 6.848A5.454 5.454 0 0 1 12 6.545h10.691A12 12 0 0 0 12 0zM1.931 5.47A11.943 11.943 0 0 0 0 12c0 6.012 4.42 10.991 10.189 11.864l3.953-6.847a5.45 5.45 0 0 1-6.865-2.29L1.931 5.47zm13.412 2.514l-3.766 6.522a5.45 5.45 0 0 1 3.768 5.167A5.454 5.454 0 0 1 12 21.818l-.391.001h10.073A11.944 11.944 0 0 0 24 12c0-1.387-.236-2.721-.669-3.962H15.343z"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="font-medium text-dark-text group-hover:text-primary transition-colors">Browser Extension</p>
              <p className="text-xs text-dark-text-muted">Works on Chrome, Edge, Brave, Opera</p>
            </div>
            <svg className="w-5 h-5 text-dark-text-muted group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        )}
        <p className="text-xs text-dark-text-dim mt-3">Works on Chrome, Edge, Brave, Opera</p>
      </div>

      {/* Blog Feed */}
      {blogPosts.length > 0 && (
        <div className="glass-card rounded-xl p-6 border border-dark-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-dark-text">Mining News</h2>
            <Link href="/blog" className="text-sm text-primary hover:text-primary-light transition-colors">
              View All →
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-dark-border scrollbar-track-transparent">
            {blogPosts.map((post) => (
              <Link
                key={post.id}
                href={`/blog/${post.slug}`}
                className="flex-shrink-0 w-64 glass-card rounded-lg overflow-hidden hover:border-primary/50 transition-all group"
              >
                {post.featured_image_url ? (
                  <div className="relative h-28 overflow-hidden">
                    <Image
                      src={post.featured_image_url}
                      alt={post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                ) : (
                  <div className="h-28 bg-gradient-to-br from-primary/20 to-dark-card flex items-center justify-center">
                    <svg className="w-8 h-8 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                    </svg>
                  </div>
                )}
                <div className="p-3">
                  <p className="text-xs text-dark-text-dim mb-1">
                    {new Date(post.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {' • '}{post.read_time} min
                  </p>
                  <h3 className="text-sm font-medium text-dark-text group-hover:text-primary transition-colors line-clamp-2">
                    {post.title}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userEmail={user?.email}
      />

      {/* Extension Download Modal */}
      <ExtensionDownloadModal
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
    </div>
  )
}
