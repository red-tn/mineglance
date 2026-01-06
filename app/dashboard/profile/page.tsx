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
  blogDisplayName: string | null
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
    country: '',
    blogDisplayName: ''
  })

  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [changingPassword, setChangingPassword] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')

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
          country: data.profile.country || '',
          blogDisplayName: data.profile.blogDisplayName || ''
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

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (passwordData.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters')
      return
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    setChangingPassword(true)

    const token = localStorage.getItem('user_token')
    if (!token) return

    try {
      const res = await fetch('/api/dashboard/profile/password', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      })

      const data = await res.json()

      if (!res.ok) {
        setPasswordError(data.error || 'Failed to change password')
        return
      }

      setPasswordSuccess('Password changed successfully')
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })

      // Clear success message after 3 seconds
      setTimeout(() => setPasswordSuccess(''), 3000)

    } catch {
      setPasswordError('Connection error. Please try again.')
    } finally {
      setChangingPassword(false)
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
    <div className="space-y-6">
      <div className="glass-card rounded-xl border border-dark-border overflow-hidden">
        {/* Photo Section */}
        <div className="px-6 py-8 bg-gradient-to-r from-primary/20 to-primary/10 border-b border-dark-border">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-dark-card-hover flex items-center justify-center overflow-hidden border-4 border-primary/30">
                {profile?.profilePhoto ? (
                  <Image
                    src={profile.profilePhoto}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-bold text-primary">
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
              <h2 className="text-xl font-semibold text-dark-text">{profile?.fullName || user?.email}</h2>
              <p className="text-dark-text-muted">{profile?.email}</p>
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
                  className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 text-primary rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  Change Photo
                </button>
                {profile?.profilePhoto && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={uploadingPhoto}
                    className="px-3 py-1.5 bg-dark-card-hover hover:bg-red-500/20 hover:text-red-400 text-dark-text-muted rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
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
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-primary/10 border border-primary/30 text-primary px-4 py-3 rounded-lg text-sm">
              {success}
            </div>
          )}

          {/* Blog Display Name */}
          <div>
            <h3 className="text-lg font-semibold text-dark-text mb-4">Blog Display Name</h3>
            <p className="text-sm text-dark-text-muted mb-4">
              This name will be shown on your blog comments. Choose something unique!
            </p>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">Display Name</label>
              <input
                type="text"
                value={formData.blogDisplayName}
                onChange={(e) => setFormData(prev => ({ ...prev, blogDisplayName: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') }))}
                className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="CryptoMiner42"
                maxLength={30}
              />
              <p className="text-xs text-dark-text-dim mt-1">
                3-30 characters, letters, numbers and underscores only
              </p>
            </div>
          </div>

          {/* Personal Info */}
          <div>
            <h3 className="text-lg font-semibold text-dark-text mb-4">Personal Information</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-dark-text mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">Email</label>
                <input
                  type="email"
                  value={profile?.email || ''}
                  disabled
                  className="w-full px-4 py-2.5 bg-dark-border border border-dark-border rounded-lg text-dark-text-muted"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">Phone</label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: formatPhoneNumber(e.target.value) }))}
                  className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="+1 (555) 123-4567"
                />
              </div>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="text-lg font-semibold text-dark-text mb-4">Address</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-dark-text mb-1">Address Line 1</label>
                <input
                  type="text"
                  value={formData.addressLine1}
                  onChange={(e) => setFormData(prev => ({ ...prev, addressLine1: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="123 Main St"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-dark-text mb-1">Address Line 2</label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => setFormData(prev => ({ ...prev, addressLine2: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Apt 4B"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="New York"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">State / Province</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="NY"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">ZIP / Postal Code</label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => setFormData(prev => ({ ...prev, zip: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="10001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                  className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="United States"
                />
              </div>
            </div>
          </div>

          {/* Subscription Info */}
          <div className="pt-4 border-t border-dark-border">
            <h3 className="text-lg font-semibold text-dark-text mb-4">Subscription</h3>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary text-white">
                {profile?.plan === 'bundle' ? 'PRO PLUS' : profile?.plan === 'pro' ? 'PRO' : 'FREE'}
              </span>
              <span className="text-sm text-dark-text-muted">
                Member since {new Date(profile?.createdAt || '').toLocaleDateString()}
              </span>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="w-full sm:w-auto px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-glow hover:shadow-glow-lg"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Section */}
      <div className="glass-card rounded-xl border border-dark-border p-6">
        <h3 className="text-lg font-semibold text-dark-text mb-4">Change Password</h3>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {passwordError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
              {passwordError}
            </div>
          )}
          {passwordSuccess && (
            <div className="bg-primary/10 border border-primary/30 text-primary px-4 py-3 rounded-lg text-sm">
              {passwordSuccess}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-dark-text mb-1">Current Password</label>
            <input
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
              className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="Enter current password"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">New Password</label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="At least 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-dark-text mb-1">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Re-enter new password"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={changingPassword}
              className="px-6 py-2.5 bg-dark-card-hover border border-dark-border text-dark-text rounded-lg font-medium hover:bg-primary/20 hover:border-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {changingPassword ? 'Changing...' : 'Change Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
