import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { AuthState } from '@/types';

const API_BASE = 'https://www.mineglance.com/api';

// Generate or retrieve a unique instance ID for this device
async function getOrCreateInstanceId(): Promise<string> {
  let instanceId = await SecureStore.getItemAsync('instanceId');
  if (!instanceId) {
    instanceId = 'mobile_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
    await SecureStore.setItemAsync('instanceId', instanceId);
  }
  return instanceId;
}

// Get human-readable device name
function getDeviceName(): string {
  const modelName = Device.modelName || Device.deviceName;
  if (modelName) {
    return modelName;
  }
  return Platform.OS === 'ios' ? 'iPhone' : 'Android Device';
}

// Get device type for database
function getDeviceType(): string {
  return Platform.OS === 'ios' ? 'mobile_ios' : 'mobile_android';
}

// Get app version
function getAppVersion(): string {
  // This will be set from app.json at build time
  return '1.2.0';
}

interface AuthStore extends AuthState {
  email: string | null;
  authToken: string | null;
  userId: string | null;
  onboardingCompleted: boolean;
  isLoading: boolean;
  setAuthData: (data: { email: string; authToken: string; userId: string; plan: 'free' | 'pro'; licenseKey?: string }) => Promise<void>;
  setLicenseKey: (key: string) => Promise<void>;
  setPlan: (plan: 'free' | 'pro') => Promise<void>;
  setInstanceId: (id: string) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  loadFromStorage: () => Promise<void>;
  registerAnonymousInstance: () => Promise<void>;
  verifyAuth: () => Promise<boolean>;
  clearAuth: () => Promise<void>;
  isPro: () => boolean;
  login: (email: string, password?: string) => Promise<{ success: boolean; error?: string; requiresPassword?: boolean; exists?: boolean }>;
  activateLicense: (licenseKey: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string) => Promise<{ success: boolean; error?: string; requiresVerification?: boolean; message?: string }>;
  resendKey: (email: string) => Promise<{ success: boolean; error?: string }>;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  email: null,
  authToken: null,
  userId: null,
  licenseKey: null,
  plan: null,
  instanceId: null,
  isActivated: false,
  onboardingCompleted: false,
  isLoading: true,

  setAuthData: async (data) => {
    await SecureStore.setItemAsync('email', data.email);
    await SecureStore.setItemAsync('authToken', data.authToken);
    await SecureStore.setItemAsync('userId', data.userId);
    await SecureStore.setItemAsync('plan', data.plan);
    await SecureStore.setItemAsync('onboardingCompleted', 'true');
    if (data.licenseKey) {
      await SecureStore.setItemAsync('licenseKey', data.licenseKey);
    }
    set({
      email: data.email,
      authToken: data.authToken,
      userId: data.userId,
      plan: data.plan,
      licenseKey: data.licenseKey || null,
      isActivated: true,
      onboardingCompleted: true,
    });
  },

  setLicenseKey: async (key: string) => {
    await SecureStore.setItemAsync('licenseKey', key);
    await SecureStore.setItemAsync('onboardingCompleted', 'true');
    set({ licenseKey: key, isActivated: true, onboardingCompleted: true });
  },

  setPlan: async (plan: 'free' | 'pro') => {
    await SecureStore.setItemAsync('plan', plan);
    set({ plan });
  },

  setInstanceId: async (id: string) => {
    await SecureStore.setItemAsync('instanceId', id);
    set({ instanceId: id });
  },

  setOnboardingCompleted: async (completed: boolean) => {
    await SecureStore.setItemAsync('onboardingCompleted', completed ? 'true' : 'false');
    set({ onboardingCompleted: completed });
  },

  loadFromStorage: async () => {
    try {
      const [email, authToken, userId, licenseKey, instanceId, onboardingCompleted, plan] = await Promise.all([
        SecureStore.getItemAsync('email'),
        SecureStore.getItemAsync('authToken'),
        SecureStore.getItemAsync('userId'),
        SecureStore.getItemAsync('licenseKey'),
        SecureStore.getItemAsync('instanceId'),
        SecureStore.getItemAsync('onboardingCompleted'),
        SecureStore.getItemAsync('plan') as Promise<'free' | 'pro' | null>,
      ]);

      set({
        email,
        authToken,
        userId,
        licenseKey,
        instanceId,
        plan,
        isActivated: !!authToken,
        onboardingCompleted: onboardingCompleted === 'true',
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load auth from storage:', error);
      set({ isLoading: false });
    }
  },

  // Register instance anonymously on first launch (for tracking installs before login)
  registerAnonymousInstance: async () => {
    try {
      const instanceId = await getOrCreateInstanceId();
      const deviceType = getDeviceType();
      const deviceName = getDeviceName();
      const version = getAppVersion();

      // Call the anonymous register endpoint
      const response = await fetch(`${API_BASE}/instances/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          instanceId,
          deviceType,
          deviceName,
          version,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Instance registered:', data.isNew ? 'new install' : 'existing');
      }

      // Store instanceId locally
      await SecureStore.setItemAsync('instanceId', instanceId);
      set({ instanceId });
    } catch (error) {
      console.error('Failed to register anonymous instance:', error);
      // Non-blocking - don't prevent app from working
    }
  },

  verifyAuth: async () => {
    const { authToken } = get();

    if (!authToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/wallets/sync`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.status === 401) {
        // Token expired or invalid
        await get().clearAuth();
        return false;
      }

      return response.ok;
    } catch (error) {
      console.error('Auth verification failed:', error);
      // Don't clear on network errors - be lenient
      return true;
    }
  },

  login: async (email: string, password?: string) => {
    try {
      // Get device info for registration
      const instanceId = await getOrCreateInstanceId();
      const deviceType = getDeviceType();
      const deviceName = getDeviceName();
      const version = getAppVersion();

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          instanceId,
          deviceType,
          deviceName,
          version,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.requiresPassword) {
          return { success: false, requiresPassword: true, exists: true };
        }
        return { success: false, error: data.error || 'Login failed', exists: data.exists };
      }

      await get().setAuthData({
        email: data.email,
        authToken: data.token,
        userId: data.userId,
        plan: data.plan,
        licenseKey: data.licenseKey,
      });

      // Store instanceId
      await get().setInstanceId(instanceId);

      // Sync wallets from server after login
      // Import dynamically to avoid circular dependency
      const { useWalletStore } = await import('./walletStore');
      await useWalletStore.getState().loadFromServer();

      return { success: true };
    } catch (error) {
      console.error('Login failed:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  activateLicense: async (licenseKey: string) => {
    try {
      const { authToken } = get();
      if (!authToken) {
        return { success: false, error: 'Not logged in' };
      }

      const response = await fetch(`${API_BASE}/auth/activate-license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({ licenseKey: licenseKey.toUpperCase().trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Invalid license key' };
      }

      // Update local state to Pro
      await get().setLicenseKey(licenseKey);
      await get().setPlan('pro');

      return { success: true };
    } catch (error) {
      console.error('License activation failed:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  register: async (email: string, password: string) => {
    try {
      // Get device info for registration
      const instanceId = await getOrCreateInstanceId();
      const deviceType = getDeviceType();
      const deviceName = getDeviceName();
      const version = getAppVersion();

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          instanceId,
          deviceType,
          deviceName,
          version,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Registration failed' };
      }

      // Check if email verification is required
      if (data.requiresVerification) {
        // Store instanceId locally
        await get().setInstanceId(instanceId);
        return {
          success: true,
          requiresVerification: true,
          message: data.message || 'Please check your email to verify your account'
        };
      }

      // If we get a token (legacy flow or no verification needed)
      if (data.token) {
        await get().setAuthData({
          email: data.email,
          authToken: data.token,
          userId: data.userId,
          plan: 'free',
        });
        await get().setInstanceId(instanceId);
      }

      return { success: true };
    } catch (error) {
      console.error('Registration failed:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  resendKey: async (email: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/resend-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Failed to send key' };
      }

      return { success: true };
    } catch (error) {
      console.error('Resend key failed:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('email');
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('userId');
    await SecureStore.deleteItemAsync('licenseKey');
    await SecureStore.deleteItemAsync('instanceId');
    await SecureStore.deleteItemAsync('onboardingCompleted');
    await SecureStore.deleteItemAsync('plan');
    set({
      email: null,
      authToken: null,
      userId: null,
      licenseKey: null,
      plan: null,
      instanceId: null,
      isActivated: false,
      onboardingCompleted: false,
    });
  },

  isPro: () => {
    const { plan } = get();
    return plan === 'pro';
  },
}));
