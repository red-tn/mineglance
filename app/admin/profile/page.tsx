'use client'

import { useState, useEffect, useRef } from 'react'

interface AdminUser {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  profilePhotoUrl: string | null
  role: 'admin' | 'super_admin'
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  invitedBy: string | null
}

interface MyProfile {
  id: string
  email: string
  fullName: string | null
  phone: string | null
  profilePhotoUrl: string | null
  role: 'admin' | 'super_admin'
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  totpEnabled?: boolean
}

export default function AdminProfilePage() {
  const [profile, setProfile] = useState<MyProfile | null>(null)
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [currentAdminId, setCurrentAdminId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Profile form
  const [editingProfile, setEditingProfile] = useState(false)
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Invite modal
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'super_admin'>('admin')
  const [inviting, setInviting] = useState(false)
  const [inviteResult, setInviteResult] = useState<{ password?: string; emailSent: boolean } | null>(null)

  // Edit admin modal
  const [editingAdmin, setEditingAdmin] = useState<AdminUser | null>(null)
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editRole, setEditRole] = useState<'admin' | 'super_admin'>('admin')
  const [editActive, setEditActive] = useState(true)
  const [updatingAdmin, setUpdatingAdmin] = useState(false)
  const [resetPasswordResult, setResetPasswordResult] = useState<string | null>(null)

  // File upload
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)

  // 2FA
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [totpSecret, setTotpSecret] = useState('')
  const [verifyCode, setVerifyCode] = useState('')
  const [verifying2FA, setVerifying2FA] = useState(false)
  const [disabling2FA, setDisabling2FA] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [showDisable2FA, setShowDisable2FA] = useState(false)
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [showBackupCodes, setShowBackupCodes] = useState(false)

  // Phone formatting function
  function formatPhoneNumber(value: string): string {
    const numbers = value.replace(/\D/g, '')
    if (numbers.length <= 3) return numbers
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`
  }

  function handlePhoneChange(value: string, setter: (v: string) => void) {
    setter(formatPhoneNumber(value))
  }

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const token = localStorage.getItem('admin_token')
    if (!token) return

    try {
      const [profileRes, adminsRes] = await Promise.all([
        fetch('/api/admin/profile', {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch('/api/admin/admins', {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (profileRes.ok) {
        const data = await profileRes.json()
        setProfile(data.profile)
        setFullName(data.profile.fullName || '')
        setPhone(data.profile.phone || '')
      }

      if (adminsRes.ok) {
        const data = await adminsRes.json()
        setAdmins(data.admins)
        setCurrentAdminId(data.currentAdminId)
      }
    } catch (e) {
      console.error('Failed to load data:', e)
      setError('Failed to load profile data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveProfile() {
    if (newPassword && newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setSaving(true)
    setError('')
    setSuccess('')

    const token = localStorage.getItem('admin_token')
    if (!token) return

    try {
      const body: Record<string, string> = { fullName, phone }
      if (newPassword) {
        body.currentPassword = currentPassword
        body.newPassword = newPassword
      }

      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })

      if (res.ok) {
        setSuccess('Profile updated successfully')
        setEditingProfile(false)
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        loadData()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update profile')
      }
    } catch {
      setError('Connection error')
    } finally {
      setSaving(false)
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingPhoto(true)
    setError('')

    try {
      // Compress and resize image
      const compressedDataUrl = await compressImage(file, 200, 0.8)

      const token = localStorage.getItem('admin_token')
      if (!token) {
        setError('Not authenticated')
        setUploadingPhoto(false)
        return
      }

      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ profilePhotoUrl: compressedDataUrl })
      })

      if (res.ok) {
        setSuccess('Photo updated!')
        loadData()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to upload photo')
      }
    } catch (err) {
      console.error('Upload error:', err)
      setError('Upload failed - try a smaller image')
    } finally {
      setUploadingPhoto(false)
    }
  }

  // Compress image to reduce size
  function compressImage(file: File, maxSize: number, quality: number): Promise<string> {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate new dimensions
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        canvas.width = width
        canvas.height = height

        ctx?.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }

      img.onerror = reject
      img.src = URL.createObjectURL(file)
    })
  }

  // 2FA Functions
  async function setup2FA() {
    const token = localStorage.getItem('admin_token')
    if (!token) return

    setError('')
    try {
      const res = await fetch('/api/admin/auth/2fa/setup', {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        const data = await res.json()
        setQrCode(data.qrCode)
        setTotpSecret(data.secret)
        setShow2FASetup(true)
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to setup 2FA')
      }
    } catch {
      setError('Connection error')
    }
  }

  async function verify2FA() {
    if (!verifyCode || verifyCode.length < 6) {
      setError('Please enter a valid 6-digit code')
      return
    }

    const token = localStorage.getItem('admin_token')
    if (!token) return

    setVerifying2FA(true)
    setError('')

    try {
      const res = await fetch('/api/admin/auth/2fa/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: verifyCode })
      })

      const data = await res.json()

      if (res.ok) {
        setSuccess('2FA enabled successfully!')
        setShow2FASetup(false)
        setQrCode('')
        setTotpSecret('')
        setVerifyCode('')
        // Show backup codes
        if (data.backupCodes) {
          setBackupCodes(data.backupCodes)
          setShowBackupCodes(true)
        }
        loadData()
      } else {
        setError(data.error || 'Invalid code')
      }
    } catch {
      setError('Connection error')
    } finally {
      setVerifying2FA(false)
    }
  }

  async function disable2FA() {
    if (!disableCode || disableCode.length < 6) {
      setError('Please enter your authenticator code')
      return
    }

    const token = localStorage.getItem('admin_token')
    if (!token) return

    setDisabling2FA(true)
    setError('')

    try {
      const res = await fetch('/api/admin/auth/2fa/disable', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ code: disableCode })
      })

      if (res.ok) {
        setSuccess('2FA disabled successfully')
        setShowDisable2FA(false)
        setDisableCode('')
        loadData()
      } else {
        const data = await res.json()
        setError(data.error || 'Invalid code')
      }
    } catch {
      setError('Connection error')
    } finally {
      setDisabling2FA(false)
    }
  }

  async function handleInviteAdmin() {
    if (!inviteEmail) {
      setError('Email is required')
      return
    }

    setInviting(true)
    setError('')
    setInviteResult(null)

    const token = localStorage.getItem('admin_token')
    if (!token) return

    try {
      const res = await fetch('/api/admin/admins', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: inviteEmail,
          fullName: inviteName || null,
          role: inviteRole
        })
      })

      const data = await res.json()

      if (res.ok) {
        setInviteResult({
          emailSent: data.emailSent,
          password: data.initialPassword
        })
        loadData()
      } else {
        setError(data.error || 'Failed to invite admin')
      }
    } catch {
      setError('Connection error')
    } finally {
      setInviting(false)
    }
  }

  function openEditAdmin(admin: AdminUser) {
    setEditingAdmin(admin)
    setEditName(admin.fullName || '')
    setEditPhone(admin.phone || '')
    setEditRole(admin.role)
    setEditActive(admin.isActive)
    setResetPasswordResult(null)
  }

  async function handleUpdateAdmin() {
    if (!editingAdmin) return

    setUpdatingAdmin(true)
    setError('')

    const token = localStorage.getItem('admin_token')
    if (!token) return

    try {
      const res = await fetch(`/api/admin/admins/${editingAdmin.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          fullName: editName || null,
          phone: editPhone || null,
          role: editRole,
          isActive: editActive
        })
      })

      if (res.ok) {
        setEditingAdmin(null)
        loadData()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to update admin')
      }
    } catch {
      setError('Connection error')
    } finally {
      setUpdatingAdmin(false)
    }
  }

  async function handleResetPassword() {
    if (!editingAdmin) return

    if (!confirm(`Reset password for ${editingAdmin.email}? They will receive a new password.`)) {
      return
    }

    setUpdatingAdmin(true)
    const token = localStorage.getItem('admin_token')
    if (!token) return

    try {
      const res = await fetch(`/api/admin/admins/${editingAdmin.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ resetPassword: true })
      })

      const data = await res.json()

      if (res.ok && data.newPassword) {
        setResetPasswordResult(data.newPassword)
      } else {
        setError(data.error || 'Failed to reset password')
      }
    } catch {
      setError('Connection error')
    } finally {
      setUpdatingAdmin(false)
    }
  }

  async function handleDeleteAdmin(admin: AdminUser) {
    if (!confirm(`Are you sure you want to delete ${admin.email}? This action cannot be undone.`)) {
      return
    }

    const token = localStorage.getItem('admin_token')
    if (!token) return

    try {
      const res = await fetch(`/api/admin/admins/${admin.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })

      if (res.ok) {
        loadData()
      } else {
        const data = await res.json()
        setError(data.error || 'Failed to delete admin')
      }
    } catch {
      setError('Connection error')
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

  function closeInviteModal() {
    setShowInviteModal(false)
    setInviteEmail('')
    setInviteName('')
    setInviteRole('admin')
    setInviteResult(null)
    setError('')
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

  const isSuperAdmin = profile?.role === 'super_admin'

  return (
    <div className="space-y-6">
      {/* Error/Success messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-500/10 border border-green-500/30 text-green-400 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* My Profile Section */}
      <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <h2 className="text-lg font-semibold text-dark-text">My Profile</h2>
          {!editingProfile && (
            <button
              onClick={() => setEditingProfile(true)}
              className="text-sm text-primary hover:text-primary/80 font-medium"
            >
              Edit Profile
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="flex items-start gap-6">
            {/* Profile Photo */}
            <div className="flex-shrink-0">
              <div className="relative">
                {profile?.profilePhotoUrl ? (
                  <img
                    src={profile.profilePhotoUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-2 border-dark-border"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center border-2 border-dark-border">
                    <span className="text-3xl font-bold text-primary">
                      {profile?.email?.[0]?.toUpperCase() || 'A'}
                    </span>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handlePhotoUpload}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-dark-card border border-dark-border rounded-full flex items-center justify-center hover:bg-dark-card-hover transition-colors"
                >
                  {uploadingPhoto ? (
                    <svg className="animate-spin h-4 w-4 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-dark-text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              {editingProfile ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-dark-text-muted mb-1">Full Name</label>
                      <input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-dark-text-muted mb-1">Phone</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value, setPhone)}
                        className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary"
                        placeholder="(555) 000-0000"
                      />
                    </div>
                  </div>

                  <div className="border-t border-dark-border pt-4 mt-4">
                    <h4 className="text-sm font-medium text-dark-text mb-3">Change Password</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm text-dark-text-muted mb-1">Current Password</label>
                        <input
                          type="password"
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-dark-text-muted mb-1">New Password</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-dark-text-muted mb-1">Confirm Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingProfile(false)
                        setFullName(profile?.fullName || '')
                        setPhone(profile?.phone || '')
                        setCurrentPassword('')
                        setNewPassword('')
                        setConfirmPassword('')
                      }}
                      className="px-4 py-2 bg-dark-card-hover text-dark-text rounded-lg font-medium hover:bg-dark-border transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-dark-text">
                      {profile?.fullName || 'No name set'}
                    </h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      profile?.role === 'super_admin'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {profile?.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </div>
                  <p className="text-dark-text-muted">{profile?.email}</p>
                  {profile?.phone && (
                    <p className="text-dark-text-muted">{profile.phone}</p>
                  )}
                  <div className="flex gap-6 text-sm text-dark-text-dim pt-2">
                    <span>Last login: {formatDate(profile?.lastLogin ?? null)}</span>
                    <span>Member since: {formatDate(profile?.createdAt ?? null)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Two-Factor Authentication Section */}
      <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border">
          <h2 className="text-lg font-semibold text-dark-text">Two-Factor Authentication</h2>
          <p className="text-sm text-dark-text-muted mt-0.5">Add an extra layer of security to your account</p>
        </div>

        <div className="p-6">
          {profile?.totpEnabled ? (
            // 2FA is enabled
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-dark-text">2FA is enabled</p>
                  <p className="text-sm text-dark-text-muted">Your account is protected with an authenticator app</p>
                </div>
              </div>
              <button
                onClick={() => setShowDisable2FA(true)}
                className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg font-medium transition-colors"
              >
                Disable 2FA
              </button>
            </div>
          ) : (
            // 2FA is not enabled
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <p className="font-medium text-dark-text">2FA is not enabled</p>
                  <p className="text-sm text-dark-text-muted">Enable 2FA for additional account security</p>
                </div>
              </div>
              <button
                onClick={setup2FA}
                className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
              >
                Enable 2FA
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 2FA Setup Modal */}
      {show2FASetup && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl border border-dark-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-text">Set Up 2FA</h3>
              <button
                onClick={() => {
                  setShow2FASetup(false)
                  setQrCode('')
                  setTotpSecret('')
                  setVerifyCode('')
                }}
                className="text-dark-text-muted hover:text-dark-text"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-sm text-dark-text-muted mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                {qrCode && (
                  <div className="inline-block p-4 bg-white rounded-lg">
                    <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
                  </div>
                )}
              </div>

              <div className="text-center">
                <p className="text-xs text-dark-text-dim mb-1">Or enter this code manually:</p>
                <code className="text-sm font-mono text-primary bg-dark-bg px-3 py-1 rounded">
                  {totpSecret}
                </code>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">
                  Enter the 6-digit code from your app
                </label>
                <input
                  type="text"
                  value={verifyCode}
                  onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-primary"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <button
                onClick={verify2FA}
                disabled={verifying2FA || verifyCode.length < 6}
                className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {verifying2FA ? 'Verifying...' : 'Verify & Enable 2FA'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {showDisable2FA && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl border border-dark-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-text">Disable 2FA</h3>
              <button
                onClick={() => {
                  setShowDisable2FA(false)
                  setDisableCode('')
                }}
                className="text-dark-text-muted hover:text-dark-text"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                <p className="text-red-400 text-sm">
                  Disabling 2FA will make your account less secure. Enter your current authenticator code to confirm.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">
                  Enter your authenticator code
                </label>
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-primary"
                  placeholder="000000"
                  maxLength={6}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={disable2FA}
                  disabled={disabling2FA || disableCode.length < 6}
                  className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {disabling2FA ? 'Disabling...' : 'Disable 2FA'}
                </button>
                <button
                  onClick={() => {
                    setShowDisable2FA(false)
                    setDisableCode('')
                  }}
                  className="px-4 py-2 bg-dark-card-hover text-dark-text rounded-lg font-medium hover:bg-dark-border transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Backup Codes Modal */}
      {showBackupCodes && backupCodes.length > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl border border-dark-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-dark-border">
              <h3 className="text-lg font-semibold text-dark-text">Save Your Backup Codes</h3>
              <p className="text-sm text-dark-text-muted mt-1">
                Store these codes in a safe place. Each code can only be used once.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <p className="text-amber-400 text-sm">
                  <strong>Important:</strong> These codes will not be shown again. If you lose access to your authenticator app, you can use these codes to sign in.
                </p>
              </div>

              <div className="bg-dark-bg rounded-lg p-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, index) => (
                    <div key={index} className="font-mono text-sm text-dark-text bg-dark-card px-3 py-2 rounded text-center">
                      {code}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    const codesText = backupCodes.join('\n')
                    navigator.clipboard.writeText(codesText)
                    setSuccess('Backup codes copied to clipboard!')
                  }}
                  className="flex-1 px-4 py-2 bg-dark-card-hover text-dark-text rounded-lg font-medium hover:bg-dark-border transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Copy All
                </button>
                <button
                  onClick={() => {
                    setShowBackupCodes(false)
                    setBackupCodes([])
                  }}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
                >
                  I&apos;ve Saved These
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Users Section */}
      <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden">
        <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-dark-text">Admin Users</h2>
            <p className="text-sm text-dark-text-muted mt-0.5">{admins.length} admin{admins.length !== 1 ? 's' : ''}</p>
          </div>
          {isSuperAdmin && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Invite Admin
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-bg">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-medium text-dark-text-muted uppercase tracking-wider">Admin</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-dark-text-muted uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-dark-text-muted uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-3 text-xs font-medium text-dark-text-muted uppercase tracking-wider">Last Login</th>
                {isSuperAdmin && (
                  <th className="text-right px-6 py-3 text-xs font-medium text-dark-text-muted uppercase tracking-wider">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-border">
              {admins.map((admin) => (
                <tr key={admin.id} className={admin.id === currentAdminId ? 'bg-primary/5' : ''}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {admin.profilePhotoUrl ? (
                        <img
                          src={admin.profilePhotoUrl}
                          alt=""
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {admin.email[0].toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div>
                        <p className="text-sm font-medium text-dark-text">
                          {admin.fullName || admin.email.split('@')[0]}
                          {admin.id === currentAdminId && (
                            <span className="ml-2 text-xs text-primary">(You)</span>
                          )}
                        </p>
                        <p className="text-xs text-dark-text-muted">{admin.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      admin.role === 'super_admin'
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {admin.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      admin.isActive
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {admin.isActive ? 'Active' : 'Disabled'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-dark-text-muted">
                    {formatDate(admin.lastLogin)}
                  </td>
                  {isSuperAdmin && (
                    <td className="px-6 py-4 text-right">
                      {admin.id !== currentAdminId && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditAdmin(admin)}
                            className="p-2 text-dark-text-muted hover:text-primary hover:bg-dark-card-hover rounded-lg transition-colors"
                            title="Edit"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteAdmin(admin)}
                            className="p-2 text-dark-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite Admin Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl border border-dark-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-text">Invite New Admin</h3>
              <button
                onClick={closeInviteModal}
                className="text-dark-text-muted hover:text-dark-text"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              {inviteResult ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-green-400">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="font-medium">Admin invited successfully!</span>
                  </div>

                  {inviteResult.emailSent ? (
                    <p className="text-dark-text-muted text-sm">
                      An email with login credentials has been sent to <strong>{inviteEmail}</strong>.
                    </p>
                  ) : (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                      <p className="text-amber-400 text-sm mb-2">
                        Email could not be sent. Please share these credentials manually:
                      </p>
                      <div className="bg-dark-bg rounded p-3 font-mono text-sm text-dark-text">
                        <p>Email: {inviteEmail}</p>
                        <p>Password: {inviteResult.password}</p>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={closeInviteModal}
                    className="w-full px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-dark-text-muted mb-1">Email *</label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary"
                      placeholder="admin@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-text-muted mb-1">Full Name</label>
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary"
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-dark-text-muted mb-1">Role</label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'admin' | 'super_admin')}
                      className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary"
                    >
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                    <p className="text-xs text-dark-text-dim mt-1">
                      Super Admins can manage other admin users.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={handleInviteAdmin}
                      disabled={inviting || !inviteEmail}
                      className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                    >
                      {inviting ? 'Sending Invite...' : 'Send Invite'}
                    </button>
                    <button
                      onClick={closeInviteModal}
                      className="px-4 py-2 bg-dark-card-hover text-dark-text rounded-lg font-medium hover:bg-dark-border transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {editingAdmin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-card rounded-xl border border-dark-border w-full max-w-md">
            <div className="px-6 py-4 border-b border-dark-border flex items-center justify-between">
              <h3 className="text-lg font-semibold text-dark-text">Edit Admin</h3>
              <button
                onClick={() => setEditingAdmin(null)}
                className="text-dark-text-muted hover:text-dark-text"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3 pb-2">
                {editingAdmin.profilePhotoUrl ? (
                  <img src={editingAdmin.profilePhotoUrl} alt="" className="w-12 h-12 rounded-full" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <span className="text-lg font-medium text-primary">
                      {editingAdmin.email[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <p className="font-medium text-dark-text">{editingAdmin.email}</p>
                  <p className="text-sm text-dark-text-muted">Created {formatDate(editingAdmin.createdAt)}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Phone</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => handlePhoneChange(e.target.value, setEditPhone)}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary"
                  placeholder="(555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-text-muted mb-1">Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'admin' | 'super_admin')}
                  className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-lg text-dark-text focus:outline-none focus:border-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-dark-text-muted">Account Status</span>
                <button
                  onClick={() => setEditActive(!editActive)}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    editActive ? 'bg-primary' : 'bg-dark-border'
                  }`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                    editActive ? 'left-7' : 'left-1'
                  }`} />
                </button>
              </div>

              {/* Reset Password */}
              <div className="border-t border-dark-border pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-dark-text">Reset Password</p>
                    <p className="text-xs text-dark-text-muted">Generate a new password for this admin</p>
                  </div>
                  <button
                    onClick={handleResetPassword}
                    disabled={updatingAdmin}
                    className="px-3 py-1.5 text-sm bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg transition-colors"
                  >
                    Reset
                  </button>
                </div>
                {resetPasswordResult && (
                  <div className="mt-3 bg-dark-bg rounded-lg p-3">
                    <p className="text-xs text-dark-text-muted mb-1">New password:</p>
                    <code className="text-sm text-dark-text font-mono">{resetPasswordResult}</code>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleUpdateAdmin}
                  disabled={updatingAdmin}
                  className="flex-1 px-4 py-2 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {updatingAdmin ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={() => setEditingAdmin(null)}
                  className="px-4 py-2 bg-dark-card-hover text-dark-text rounded-lg font-medium hover:bg-dark-border transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
