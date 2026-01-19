import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';

const API_BASE = 'https://www.mineglance.com';

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
  pendingLicenseKey: string | null;
  pendingEmail: string | null;
  pendingPassword: string | null;
  error: string | null;

  // Actions
  checkAuth: () => Promise<void>;
  login: (email: string, password: string, licenseKey?: string) => Promise<{ success: boolean; requires2FA?: boolean; requiresPasswordSetup?: boolean; error?: string }>;
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
  pendingLicenseKey: null,
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

  login: async (email: string, password: string, licenseKey?: string) => {
    set({ error: null });

    try {
      const body: Record<string, string> = { email, password };
      if (licenseKey) {
        body.licenseKey = licenseKey;
      }

      const response = await fetch(`${API_BASE}/api/dashboard/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
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
          pendingLicenseKey: licenseKey || null,
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

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      set({ error: errorMessage });
      return { success: false, error: errorMessage };
    }
  },

  verify2FA: async (code: string) => {
    const { pendingLicenseKey, pendingEmail, pendingPassword } = get();

    if (!pendingEmail || !pendingPassword) {
      return { success: false, error: 'No pending login' };
    }

    try {
      const body: Record<string, string> = {
        email: pendingEmail,
        password: pendingPassword,
        totpCode: code,
      };
      if (pendingLicenseKey) {
        body.licenseKey = pendingLicenseKey;
      }

      const response = await fetch(`${API_BASE}/api/dashboard/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

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

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Network error';
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
      pendingLicenseKey: null,
      pendingEmail: null,
      pendingPassword: null,
    });
  },

  clearError: () => set({ error: null }),
}));
