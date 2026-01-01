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
              <p className="text-lg font-mono text-gray-900">
                {user?.licenseKey ? `${user.licenseKey.substring(0, 7)}...` : '••••-••••'}
              </p>
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
