import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';
import { platform } from '@tauri-apps/plugin-os';
import { fetch } from '@tauri-apps/plugin-http';

const API_BASE = 'https://www.mineglance.com';
const APP_VERSION = '1.0.0';

// Generate a unique instance ID for this device
async function getInstanceId(): Promise<string> {
  const store = await Store.load('settings.json');
  let instanceId = await store.get<string>('instanceId');

  if (!instanceId) {
    instanceId = 'desktop-' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    await store.set('instanceId', instanceId);
    await store.save();
  }

  return instanceId;
}

// Get device type based on platform
async function getDeviceType(): Promise<string> {
  try {
    const os = await platform();
    if (os === 'macos' || os === 'darwin') return 'desktop_macos';
    return 'desktop_windows';
  } catch {
    return 'desktop_windows';
  }
}

// Get device name
function getDeviceName(): string {
  try {
    return `MineGlance Desktop`;
  } catch {
    return 'MineGlance Desktop';
  }
}

interface User {
  id: string;
  email: string;
  plan: 'free' | 'pro';
  billingType?: 'monthly' | 'annual' | 'lifetime' | null;
  fullName?: string;
  subscriptionEndDate?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  token: string | null;
  requires2FA: boolean;
  pendingEmail: string | null;
  pendingPassword: string | null;
  error: string | null;

  // Actions
  checkAuth: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ success: boolean; requires2FA?: boolean; requiresPasswordSetup?: boolean; error?: string }>;
  verify2FA: (code: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  token: null,
  requires2FA: false,
  pendingEmail: null,
  pendingPassword: null,
  error: null,

  checkAuth: async () => {
    try {
      const store = await Store.load('settings.json');
      const token = await store.get<string>('authToken');

      if (!token) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      // Verify token with server
      const response = await fetch(`${API_BASE}/api/dashboard/auth/verify`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        set({
          isAuthenticated: true,
          isLoading: false,
          token,
          user: {
            id: data.user.id,
            email: data.user.email,
            plan: data.user.plan,
            billingType: data.user.billingType,
            fullName: data.user.full_name,
            subscriptionEndDate: data.user.subscription_end_date,
          },
        });
      } else {
        // Token invalid, clear it
        await store.delete('authToken');
        set({ isLoading: false, isAuthenticated: false, token: null });
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ error: null });

    try {
      const response = await fetch(`${API_BASE}/api/dashboard/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        set({ error: data.error || 'Login failed' });
        return { success: false, error: data.error };
      }

      if (data.requiresPasswordSetup) {
        // User needs to set password first - redirect to web
        set({ error: 'Please set your password on the web dashboard first: mineglance.com/dashboard' });
        return { success: false, requiresPasswordSetup: true };
      }

      if (data.requires2FA) {
        set({
          requires2FA: true,
          pendingEmail: email,
          pendingPassword: password,
        });
        return { success: true, requires2FA: true };
      }

      // Login successful, save token
      const store = await Store.load('settings.json');
      await store.set('authToken', data.token);
      await store.save();

      set({
        isAuthenticated: true,
        token: data.token,
        user: {
          id: data.user.id,
          email: data.user.email,
          plan: data.user.plan,
          billingType: data.user.billingType,
          fullName: data.user.full_name,
          subscriptionEndDate: data.user.subscription_end_date,
        },
      });

      // Register this device
      try {
        const instanceId = await getInstanceId();
        const deviceType = await getDeviceType();
        const deviceName = getDeviceName();

        console.log('Registering device:', { instanceId, deviceType, deviceName, version: APP_VERSION });

        const regResponse = await fetch(`${API_BASE}/api/instances`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instanceId,
            deviceType,
            deviceName,
            version: APP_VERSION,
          }),
        });

        const regData = await regResponse.json();
        console.log('Device registration response:', regResponse.status, regData);
      } catch (e) {
        console.error('Failed to register device:', e);
        // Don't fail login if device registration fails
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  verify2FA: async (code: string) => {
    const { pendingEmail, pendingPassword } = get();

    console.log('verify2FA called with code:', code);
    console.log('pendingEmail:', pendingEmail);
    console.log('pendingPassword:', pendingPassword ? '[SET]' : '[NOT SET]');

    if (!pendingEmail || !pendingPassword) {
      return { success: false, error: 'No pending login - please go back and enter your credentials again' };
    }

    try {
      console.log('Sending 2FA request to:', `${API_BASE}/api/dashboard/auth/login`);

      const response = await fetch(`${API_BASE}/api/dashboard/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: pendingEmail,
          password: pendingPassword,
          totpCode: code,
        }),
      });

      console.log('2FA response status:', response.status);

      const data = await response.json();

      if (!response.ok) {
        set({ error: data.error || 'Verification failed' });
        return { success: false, error: data.error };
      }

      // Save token
      const store = await Store.load('settings.json');
      await store.set('authToken', data.token);
      await store.save();

      set({
        isAuthenticated: true,
        token: data.token,
        requires2FA: false,
        pendingLicenseKey: null,
        pendingEmail: null,
        pendingPassword: null,
        user: {
          id: data.user.id,
          email: data.user.email,
          plan: data.user.plan,
          billingType: data.user.billingType,
          fullName: data.user.full_name,
          subscriptionEndDate: data.user.subscription_end_date,
        },
      });

      // Register this device
      try {
        const instanceId = await getInstanceId();
        const deviceType = await getDeviceType();
        const deviceName = getDeviceName();

        console.log('Registering device after 2FA:', { instanceId, deviceType, deviceName, version: APP_VERSION });

        const regResponse = await fetch(`${API_BASE}/api/instances`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${data.token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            instanceId,
            deviceType,
            deviceName,
            version: APP_VERSION,
          }),
        });

        const regData = await regResponse.json();
        console.log('Device registration response after 2FA:', regResponse.status, regData);
      } catch (e) {
        console.error('Failed to register device after 2FA:', e);
      }

      return { success: true };
    } catch (error) {
      console.error('2FA verification error:', error);
      const errorMessage = error instanceof Error ? error.message : String(error) || 'Network error';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  logout: async () => {
    try {
      const store = await Store.load('settings.json');
      await store.delete('authToken');
      await store.save();
    } catch (error) {
      console.error('Failed to clear token:', error);
    }

    set({
      isAuthenticated: false,
      user: null,
      token: null,
      requires2FA: false,
      pendingEmail: null,
      pendingPassword: null,
    });
  },

  clearError: () => set({ error: null }),
}));
