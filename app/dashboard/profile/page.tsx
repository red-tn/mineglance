'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../auth-context'
import Image from 'next/image'

// Format phone number as user types: (555) 123-4567 or +1 (555) 123-4567
function formatPhoneNumber(value: string): string {
  // Remove all non-digits except + at start
  const hasPlus = value.startsWith('+')
  const digits = value.replace(/\D/g, '')

  if (digits.length === 0) return ''

  // Handle US/Canada format
  if (digits.length <= 10 || (hasPlus && digits.length <= 11)) {
    const start = hasPlus && digits.length > 10 ? 1 : 0
    const areaCode = digits.slice(start, start + 3)
    const middle = digits.slice(start + 3, start + 6)
    const last = digits.slice(start + 6, start + 10)

    let formatted = ''
    if (hasPlus && digits.length > 10) {
      formatted = '+' + digits.slice(0, 1) + ' '
    }

    if (areaCode) {
      formatted += '(' + areaCode
      if (areaCode.length === 3) formatted += ') '
    }
    if (middle) {
      formatted += middle
      if (middle.length === 3) formatted += '-'
    }
    if (last) {
      formatted += last
    }

    return formatted
  }

  // For international, just add spaces every 3-4 digits
  if (hasPlus) {
    return '+' + digits.slice(0, 1) + ' ' + digits.slice(1, 4) + ' ' + digits.slice(4, 7) + ' ' + digits.slice(7, 11) + (digits.length > 11 ? ' ' + digits.slice(11, 15) : '')
  }

  return digits
}

interface Profile {
  email: string
  fullName: string | null
  phone: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
  profilePhoto: string | null
  plan: string
  createdAt: string
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
    country: ''
  })

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    const token = localStorage.getItem('user_token')
    if (!token) return

    try {
      const res = await fetch('/api/dashboard/profile', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setProfile(data.profile)
        setFormData({
          fullName: data.profile.fullName || '',
          phone: formatPhoneNumber(data.profile.phone || ''),
          addressLine1: data.profile.addressLine1 || '',
          addressLine2: data.profile.addressLine2 || '',
          city: data.profile.city || '',
          state: data.profile.state || '',
          zip: data.profile.zip || '',
          country: data.profile.country || ''
        })
      }
    } catch (e) {
      console.error('Failed to load profile:', e)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSaving(true)

    const token = localStorage.getItem('user_token')
    if (!token) return

    try {
      const res = await fetch('/api/dashboard/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Failed to save profile')
        return
      }

      setSuccess('Profile saved successfully')
      refreshUser()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch {
      setError('Connection error. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file')
      return
    }

    // Validate file size (500KB max)
    if (file.size > 500000) {
      setError('Image too large. Max 500KB.')
      return
    }

    setUploadingPhoto(true)
    setError('')

    try {
      // Convert to base64
      const reader = new FileReader()
      reader.onloadend = async () => {
        const base64 = reader.result as string

        const token = localStorage.getItem('user_token')
        if (!token) return

        const res = await fetch('/api/dashboard/profile/photo', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ photo: base64 })
        })

        const data = await res.json()

        if (!res.ok) {
          setError(data.error || 'Failed to upload photo')
        } else {
          setProfile(prev => prev ? { ...prev, profilePhoto: data.photoUrl } : prev)
          refreshUser()
        }

        setUploadingPhoto(false)
      }
      reader.readAsDataURL(file)

    } catch {
      setError('Failed to upload photo')
      setUploadingPhoto(false)
    }
  }

  async function handleRemovePhoto() {
    const token = localStorage.getItem('user_token')
    if (!token) return

    setUploadingPhoto(true)
    setError('')

    try {
      const res = await fetch('/api/dashboard/profile/photo', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (res.ok) {
        setProfile(prev => prev ? { ...prev, profilePhoto: null } : prev)
        refreshUser()
      } else {
        setError('Failed to remove photo')
      }
    } catch {
      setError('Failed to remove photo')
    } finally {
      setUploadingPhoto(false)
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
    <div className="max-w-2xl">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {/* Photo Section */}
        <div className="px-6 py-8 bg-gradient-to-r from-primary to-primary/80 text-white">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-white/20 flex items-center justify-center overflow-hidden border-4 border-white/30">
                {profile?.profilePhoto ? (
                  <Image
                    src={profile.profilePhoto}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold">
                    {user?.email?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
              {uploadingPhoto && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                  <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                </div>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold">{profile?.fullName || user?.email}</h2>
              <p className="text-white/70">{profile?.email}</p>
              <div className="flex gap-2 mt-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Change Photo
                </button>
                {profile?.profilePhoto && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    className="px-3 py-1.5 bg-white/10 hover:bg-red-500/50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Personal Info */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData(prev => ({ ...prev, addressLine1: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="123 Main St"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData(prev => ({ ...prev, addressLine2: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Apt 4B"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="New York"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">State / Province</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="NY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ZIP / Postal Code</label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="10001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="United States"
                />
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Subscription</h3>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                {profile?.plan?.toUpperCase() || 'PRO'}
              </span>
              <span className="text-sm text-gray-500">
                Member since {new Date(profile?.createdAt || '').toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
