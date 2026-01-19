import { useState, useEffect, useRef } from "react";
import { useAuthStore } from "../stores/authStore";
import { User, Mail, Calendar, CreditCard, Shield, ExternalLink, Camera, Save, Eye, EyeOff, Check, X } from "lucide-react";

const API_BASE = 'https://www.mineglance.com';

interface Profile {
  email: string;
  fullName: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  country: string | null;
  profilePhoto: string | null;
  plan: string;
  billingType: string | null;
  createdAt: string;
  totpEnabled: boolean;
  blogDisplayName: string | null;
  blogEmailOptIn: boolean;
}

function formatPhoneNumber(value: string): string {
  const hasPlus = value.startsWith('+');
  const digits = value.replace(/\D/g, '');

  if (digits.length === 0) return '';

  if (digits.length <= 10 || (hasPlus && digits.length <= 11)) {
    const start = hasPlus && digits.length > 10 ? 1 : 0;
    const areaCode = digits.slice(start, start + 3);
    const middle = digits.slice(start + 3, start + 6);
    const last = digits.slice(start + 6, start + 10);

    let formatted = '';
    if (hasPlus && digits.length > 10) {
      formatted = '+' + digits.slice(0, 1) + ' ';
    }

    if (areaCode) {
      formatted += '(' + areaCode;
      if (areaCode.length === 3) formatted += ') ';
    }
    if (middle) {
      formatted += middle;
      if (middle.length === 3) formatted += '-';
    }
    if (last) {
      formatted += last;
    }

    return formatted;
  }

  if (hasPlus) {
    return '+' + digits.slice(0, 1) + ' ' + digits.slice(1, 4) + ' ' + digits.slice(4, 7) + ' ' + digits.slice(7, 11);
  }

  return digits;
}

export default function Profile() {
  const { user, token } = useAuthStore();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: '',
    country: '',
    blogDisplayName: '',
    blogEmailOptIn: true,
  });

  // Password change state
  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    loadProfile();
  }, [token]);

  async function loadProfile() {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/dashboard/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
        setFormData({
          fullName: data.profile.fullName || '',
          phone: formatPhoneNumber(data.profile.phone || ''),
          addressLine1: data.profile.addressLine1 || '',
          addressLine2: data.profile.addressLine2 || '',
          city: data.profile.city || '',
          state: data.profile.state || '',
          zip: data.profile.zip || '',
          country: data.profile.country || '',
          blogDisplayName: data.profile.blogDisplayName || '',
          blogEmailOptIn: data.profile.blogEmailOptIn !== false,
        });
      }
    } catch (e) {
      console.error('Failed to load profile:', e);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const res = await fetch(`${API_BASE}/api/dashboard/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to save profile');
        return;
      }

      setSuccess('Profile saved successfully');
      setTimeout(() => setSuccess(''), 3000);

    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploadingPhoto(true);
    setError('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;

        const res = await fetch(`${API_BASE}/api/dashboard/profile/photo`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ photo: base64 })
        });

        if (res.ok) {
          const data = await res.json();
          setProfile(prev => prev ? { ...prev, profilePhoto: data.photoUrl } : null);
          setSuccess('Photo uploaded successfully');
          setTimeout(() => setSuccess(''), 3000);
        } else {
          const data = await res.json();
          setError(data.error || 'Failed to upload photo');
        }

        setUploadingPhoto(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError('Failed to upload photo');
      setUploadingPhoto(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setChangingPassword(true);

    try {
      const res = await fetch(`${API_BASE}/api/dashboard/profile/password`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setPasswordError(data.error || 'Failed to change password');
        return;
      }

      setPasswordSuccess('Password changed successfully');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswordSection(false);
      setTimeout(() => setPasswordSuccess(''), 3000);

    } catch {
      setPasswordError('Connection error. Please try again.');
    } finally {
      setChangingPassword(false);
    }
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getPlanBadge = () => {
    if (profile?.plan === "pro") {
      const billingText = profile.billingType
        ? ` - ${profile.billingType.charAt(0).toUpperCase() + profile.billingType.slice(1)}`
        : "";
      return (
        <span className="px-3 py-1 bg-primary/20 text-primary font-semibold rounded-full text-sm">
          PRO{billingText}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 bg-[var(--border)] text-[var(--text-muted)] font-semibold rounded-full text-sm">
        Free
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-xl font-bold text-[var(--text)]">Profile</h1>
        <p className="text-sm text-[var(--text-muted)]">Manage your account information</p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-3 bg-danger/10 border border-danger/30 text-danger rounded-lg flex items-center gap-2">
          <X size={16} />
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 bg-primary/10 border border-primary/30 text-primary rounded-lg flex items-center gap-2">
          <Check size={16} />
          {success}
        </div>
      )}

      {/* Profile Photo & Name Card */}
      <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            {/* Profile Photo */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center overflow-hidden">
                {profile?.profilePhoto ? (
                  <img src={profile.profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User size={36} className="text-primary" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white hover:bg-primary-light transition-colors disabled:opacity-50"
              >
                {uploadingPhoto ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Camera size={14} />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
            </div>
            <div>
              <h2 className="text-lg font-bold text-[var(--text)]">
                {profile?.fullName || user?.email}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                {getPlanBadge()}
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-[var(--text)]">
              <Mail size={18} className="text-[var(--text-muted)]" />
              <span>{profile?.email}</span>
            </div>
            {profile?.plan === "pro" && (
              <div className="flex items-center gap-3 text-[var(--text)]">
                <CreditCard size={18} className="text-[var(--text-muted)]" />
                <span>
                  {profile.billingType === "lifetime" ? (
                    <span className="text-primary">Lifetime Access - Never expires</span>
                  ) : user?.subscriptionEndDate ? (
                    (() => {
                      const endDate = new Date(user.subscriptionEndDate);
                      const daysLeft = Math.ceil((endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      const billingLabel = profile.billingType === 'monthly' ? 'Monthly' : 'Annual';
                      if (daysLeft <= 0) {
                        return <span className="text-danger">Subscription expired - Renew now</span>;
                      } else if (daysLeft <= 7) {
                        return <span className="text-warning">{billingLabel} · Expires in {daysLeft} days</span>;
                      } else {
                        return <span>{billingLabel} · Renews {formatDate(user.subscriptionEndDate)} ({daysLeft} days)</span>;
                      }
                    })()
                  ) : (
                    <span>Subscription active</span>
                  )}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3 text-[var(--text)]">
              <Calendar size={18} className="text-[var(--text-muted)]" />
              <span>Member since {formatDate(profile?.createdAt)}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Edit Profile Form */}
      <form onSubmit={handleSubmit}>
        <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border)]">
            <h2 className="font-semibold text-[var(--text)]">Personal Information</h2>
          </div>

          <div className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Full Name</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="Your name"
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Phone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                placeholder="(555) 123-4567"
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Address Line 1</label>
              <input
                type="text"
                value={formData.addressLine1}
                onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
                placeholder="Street address"
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Address Line 2</label>
              <input
                type="text"
                value={formData.addressLine2}
                onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
                placeholder="Apt, suite, etc. (optional)"
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">City</label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="City"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">State/Province</label>
                <input
                  type="text"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="State"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">ZIP/Postal Code</label>
                <input
                  type="text"
                  value={formData.zip}
                  onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                  placeholder="ZIP code"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-muted)] mb-1">Country</label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                  placeholder="Country"
                  className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Blog Display Name */}
            <div className="pt-4 border-t border-[var(--border)]">
              <h3 className="font-medium text-[var(--text)] mb-3">Blog Display Name</h3>
              <p className="text-sm text-[var(--text-muted)] mb-3">
                This name will be shown on your blog comments. Choose something unique!
              </p>
              <input
                type="text"
                value={formData.blogDisplayName}
                onChange={(e) => {
                  const value = e.target.value.replace(/[^a-zA-Z0-9_]/g, '');
                  if (value.length <= 30) {
                    setFormData({ ...formData, blogDisplayName: value });
                  }
                }}
                placeholder="YourDisplayName"
                className="w-full px-3 py-2 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary font-mono"
              />
              <p className="text-xs text-[var(--text-dim)] mt-1">
                3-30 characters, letters, numbers and underscores only
              </p>
            </div>

            {/* Email Preferences */}
            <div className="pt-4 border-t border-[var(--border)]">
              <h3 className="font-medium text-[var(--text)] mb-3">Email Preferences</h3>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.blogEmailOptIn}
                  onChange={(e) => setFormData({ ...formData, blogEmailOptIn: e.target.checked })}
                  className="mt-1 w-4 h-4 rounded border-[var(--border)] bg-[var(--bg)] text-primary focus:ring-primary"
                />
                <div>
                  <p className="font-medium text-[var(--text)]">Receive blog updates and mining news</p>
                  <p className="text-sm text-[var(--text-muted)]">
                    Get notified about new blog posts, mining tips, extension updates, and industry news. We typically send 1-2 emails per month.
                  </p>
                </div>
              </label>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save size={18} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </section>
      </form>

      {/* Security Section */}
      <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text)]">Security</h2>
        </div>

        <div className="p-4 space-y-4">
          {/* 2FA Status */}
          <div className="flex items-center justify-between p-3 bg-[var(--bg)] rounded-lg">
            <div className="flex items-center gap-3">
              <Shield size={20} className={profile?.totpEnabled ? "text-primary" : "text-[var(--text-muted)]"} />
              <div>
                <p className="font-medium text-[var(--text)]">Two-Factor Authentication</p>
                <p className="text-sm text-[var(--text-muted)]">
                  {profile?.totpEnabled ? "Enabled - Your account is secured" : "Not enabled"}
                </p>
              </div>
            </div>
            <a
              href="https://www.mineglance.com/dashboard/profile"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text)] font-medium rounded-lg hover:bg-[var(--card-hover)] transition-all flex items-center gap-2 text-sm"
            >
              Manage
              <ExternalLink size={14} />
            </a>
          </div>

          {/* Password Change */}
          {!showPasswordSection ? (
            <button
              onClick={() => setShowPasswordSection(true)}
              className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg text-[var(--text)] font-medium hover:bg-[var(--card-hover)] transition-all text-left"
            >
              Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-3 p-3 bg-[var(--bg)] rounded-lg">
              {passwordError && (
                <div className="p-2 bg-danger/10 border border-danger/30 text-danger text-sm rounded">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-2 bg-primary/10 border border-primary/30 text-primary text-sm rounded">
                  {passwordSuccess}
                </div>
              )}

              <div className="relative">
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  placeholder="Current password"
                  className="w-full px-3 py-2 pr-10 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                >
                  {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="relative">
                <input
                  type={showNewPassword ? "text" : "password"}
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  placeholder="New password (min 8 characters)"
                  className="w-full px-3 py-2 pr-10 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                >
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg text-[var(--text)] focus:outline-none focus:border-primary"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordSection(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                    setPasswordError('');
                  }}
                  className="flex-1 py-2 bg-[var(--card-bg)] border border-[var(--border)] text-[var(--text)] font-medium rounded-lg hover:bg-[var(--card-hover)] transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword || !passwordData.currentPassword || !passwordData.newPassword}
                  className="flex-1 py-2 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-all disabled:opacity-50"
                >
                  {changingPassword ? "Changing..." : "Change Password"}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Account Actions */}
      <section className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border)]">
          <h2 className="font-semibold text-[var(--text)]">Account</h2>
        </div>

        <div className="p-4 space-y-3">
          <a
            href="https://www.mineglance.com/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg hover:bg-[var(--card-hover)] transition-all"
          >
            <span className="font-medium text-[var(--text)]">Open Web Dashboard</span>
            <ExternalLink size={16} className="text-[var(--text-muted)]" />
          </a>

          <a
            href="https://www.mineglance.com/dashboard/subscription"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-3 bg-[var(--bg)] border border-[var(--border)] rounded-lg hover:bg-[var(--card-hover)] transition-all"
          >
            <span className="font-medium text-[var(--text)]">Manage Subscription</span>
            <ExternalLink size={16} className="text-[var(--text-muted)]" />
          </a>

          {profile?.plan === "free" && (
            <a
              href="https://mineglance.com/#pricing"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2 p-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-all shadow-glow"
            >
              Upgrade to Pro
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
