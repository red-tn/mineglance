import { useState, useEffect } from 'react';
import { fetch } from '@tauri-apps/plugin-http';
import { useAuthStore } from '../stores/authStore';
import { Monitor, Puzzle, Smartphone, Trash2, AlertTriangle, Copy, CheckCircle, Crown } from 'lucide-react';

const API_BASE = 'https://www.mineglance.com';

interface Device {
  id: string;
  installId: string;
  deviceName: string;
  deviceType: string;
  browser: string | null;
  version: string | null;
  createdAt: string;
  lastSeen: string | null;
}

export default function Devices() {
  const { token, user } = useAuthStore();
  const isPro = user?.plan === 'pro';
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadDevices();
  }, []);

  async function loadDevices() {
    if (!token) return;

    try {
      const res = await fetch(`${API_BASE}/api/dashboard/devices`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (e) {
      console.error('Failed to load devices:', e);
      setError('Failed to load devices');
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove(installId: string | undefined) {
    if (!installId || !token) return;

    const confirmed = window.confirm('Are you sure you want to remove this device? It will be signed out.');
    if (!confirmed) return;

    setRemoving(installId);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/api/dashboard/devices?instanceId=${installId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        loadDevices();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to remove device');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setRemoving(null);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function formatDate(dateString: string | null) {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  function getTimeSince(dateString: string | null) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 5) return 'Active now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  }

  function getDaysUntilPurge(dateString: string | null): number | null {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, 30 - diffDays);
  }

  function isNearPurge(dateString: string | null): boolean {
    const daysLeft = getDaysUntilPurge(dateString);
    return daysLeft !== null && daysLeft <= 7;
  }

  function getPlatformIcon(deviceType: string) {
    if (deviceType === 'extension') {
      return <Puzzle size={20} />;
    }
    if (deviceType.includes('mobile') || deviceType.includes('ios') || deviceType.includes('android')) {
      return <Smartphone size={20} />;
    }
    return <Monitor size={20} />;
  }

  function getPlatformLabel(deviceType: string) {
    switch (deviceType) {
      case 'extension':
        return 'Browser Extension';
      case 'desktop_windows':
        return 'Windows Desktop';
      case 'desktop_macos':
        return 'macOS Desktop';
      case 'mobile_ios':
        return 'iOS App';
      case 'mobile_android':
        return 'Android App';
      default:
        return deviceType;
    }
  }

  function getPlatformColor(deviceType: string) {
    if (deviceType === 'extension') {
      return 'text-blue-400 bg-blue-500/20';
    }
    if (deviceType.includes('desktop')) {
      return 'text-purple-400 bg-purple-500/20';
    }
    if (deviceType.includes('mobile') || deviceType.includes('ios') || deviceType.includes('android')) {
      return 'text-orange-400 bg-orange-500/20';
    }
    return 'text-[var(--text-muted)] bg-[var(--card-hover)]';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="spinner" />
      </div>
    );
  }

  const extensionCount = devices.filter(d => d.deviceType === 'extension').length;
  const desktopCount = devices.filter(d => d.deviceType.includes('desktop')).length;
  const mobileCount = devices.filter(d => d.deviceType.includes('mobile') || d.deviceType.includes('ios') || d.deviceType.includes('android')).length;

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header Card */}
      <div className="card p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text)]">Connected Devices</h2>
            <p className="text-sm text-[var(--text-muted)] mt-1">
              Devices signed in with your MineGlance account
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-primary">{devices.length}</p>
            <p className="text-xs text-[var(--text-muted)]">total devices</p>
          </div>
        </div>

        {/* Auto-purge notice */}
        <div className="mt-4 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-amber-200 font-medium">Inactive devices are automatically removed</p>
            <p className="text-xs text-amber-300/70 mt-1">
              Devices not seen for 30 days are purged automatically. Simply open the app to reset the timer.
            </p>
          </div>
        </div>
      </div>

      {/* Platform Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
              <Puzzle size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--text)]">{extensionCount}</p>
              <p className="text-xs text-[var(--text-muted)]">Extensions</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
              <Monitor size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--text)]">{desktopCount}</p>
              <p className="text-xs text-[var(--text-muted)]">Desktop Apps</p>
            </div>
          </div>
        </div>

        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center text-orange-400">
              <Smartphone size={20} />
            </div>
            <div>
              <p className="text-xl font-bold text-[var(--text)]">{mobileCount}</p>
              <p className="text-xs text-[var(--text-muted)]">Mobile Apps</p>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Devices List */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-[var(--border)]">
          <h3 className="font-semibold text-[var(--text)]">All Devices</h3>
        </div>

        {devices.length === 0 ? (
          <div className="px-6 py-12 text-center text-[var(--text-muted)]">
            <Monitor className="w-12 h-12 mx-auto text-[var(--text-dim)] mb-4" />
            <p className="font-medium text-[var(--text)]">No devices found</p>
            <p className="text-sm mt-1">Sign in to MineGlance on any device to see it here.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {devices.map((device) => {
              const recentActivity = getTimeSince(device.lastSeen);
              const isOnline = recentActivity === 'Active now';
              const colorClass = getPlatformColor(device.deviceType);
              const nearPurge = isNearPurge(device.lastSeen);
              const daysLeft = getDaysUntilPurge(device.lastSeen);

              return (
                <li key={device.id} className={`px-6 py-4 ${nearPurge ? 'bg-red-900/10' : ''}`}>
                  <div className="flex items-start gap-4">
                    {/* Platform Icon */}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorClass}`}>
                      {getPlatformIcon(device.deviceType)}
                    </div>

                    {/* Device Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-medium text-[var(--text)]">
                          {device.deviceName || 'Unknown Device'}
                        </h4>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
                          {getPlatformLabel(device.deviceType)}
                        </span>
                        {isOnline && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/20 text-primary">
                            <span className="w-1.5 h-1.5 rounded-full bg-primary mr-1 animate-pulse" />
                            Online
                          </span>
                        )}
                        {nearPurge && daysLeft !== null && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            {daysLeft === 0 ? 'Purge imminent' : `${daysLeft}d until purge`}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-[var(--text-muted)]">
                        {device.browser && <span>{device.browser}</span>}
                        {device.version && <span>v{device.version}</span>}
                        {(device.browser || device.version) && <span className="text-[var(--border)]">|</span>}
                        <span>Added {formatDate(device.createdAt)}</span>
                      </div>
                      {recentActivity && (
                        <p className="text-xs text-[var(--text-dim)] mt-1">Last seen: {recentActivity}</p>
                      )}
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-[var(--text-dim)] font-mono">
                          ID: {device.installId || 'N/A'}
                        </p>
                        {device.installId && (
                          <button
                            onClick={() => copyToClipboard(device.installId)}
                            className="p-1 text-[var(--text-dim)] hover:text-primary transition-colors"
                            title="Copy ID"
                          >
                            {copiedId === device.installId ? (
                              <CheckCircle className="w-3 h-3 text-primary" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleRemove(device.installId)}
                      disabled={removing === device.installId}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={14} />
                      {removing === device.installId ? 'Removing...' : 'Remove'}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Info Card */}
      <div className="card p-6">
        <div className="flex items-start gap-4">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${isPro ? 'bg-primary/20' : 'bg-[var(--card-hover)]'}`}>
            {isPro ? (
              <Crown className="w-5 h-5 text-primary" />
            ) : (
              <CheckCircle className="w-5 h-5 text-[var(--text-muted)]" />
            )}
          </div>
          <div>
            {isPro ? (
              <>
                <h4 className="font-medium text-[var(--text)] mb-1">Unlimited Devices</h4>
                <p className="text-sm text-[var(--text-muted)]">
                  Your MineGlance Pro license works on unlimited devices. Install on any browser, desktop, or mobile device - all your data syncs automatically via the cloud.
                </p>
              </>
            ) : (
              <>
                <h4 className="font-medium text-[var(--text)] mb-1">Free Plan</h4>
                <p className="text-sm text-[var(--text-muted)]">
                  You can use MineGlance on multiple devices with the free plan. Upgrade to Pro for unlimited wallets, email alerts, and priority support.
                </p>
                <a
                  href="https://mineglance.com/#pricing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 mt-2 text-sm text-primary hover:underline"
                >
                  <Crown size={14} />
                  Upgrade to Pro
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
