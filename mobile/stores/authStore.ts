import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { AuthState } from '@/types';

interface AuthStore extends AuthState {
  onboardingCompleted: boolean;
  isLoading: boolean;
  setLicenseKey: (key: string) => Promise<void>;
  setPlan: (plan: 'free' | 'pro' | 'bundle') => Promise<void>;
  setInstanceId: (id: string) => Promise<void>;
  setOnboardingCompleted: (completed: boolean) => Promise<void>;
  loadFromStorage: () => Promise<void>;
  clearAuth: () => Promise<void>;
  isPro: () => boolean;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  licenseKey: null,
  plan: null,
  instanceId: null,
  isActivated: false,
  onboardingCompleted: false,
  isLoading: true,

  setLicenseKey: async (key: string) => {
    await SecureStore.setItemAsync('licenseKey', key);
    await SecureStore.setItemAsync('onboardingCompleted', 'true');
    set({ licenseKey: key, isActivated: true, onboardingCompleted: true });
  },

  setPlan: async (plan: 'free' | 'pro' | 'bundle') => {
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
      const licenseKey = await SecureStore.getItemAsync('licenseKey');
      const instanceId = await SecureStore.getItemAsync('instanceId');
      const onboardingCompleted = await SecureStore.getItemAsync('onboardingCompleted');
      const plan = await SecureStore.getItemAsync('plan') as 'free' | 'pro' | 'bundle' | null;

      set({
        licenseKey,
        instanceId,
        plan,
        isActivated: !!licenseKey,
        onboardingCompleted: onboardingCompleted === 'true',
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to load auth from storage:', error);
      set({ isLoading: false });
    }
  },

  clearAuth: async () => {
    await SecureStore.deleteItemAsync('licenseKey');
    await SecureStore.deleteItemAsync('instanceId');
    await SecureStore.deleteItemAsync('onboardingCompleted');
    await SecureStore.deleteItemAsync('plan');
    set({
      licenseKey: null,
      plan: null,
      instanceId: null,
      isActivated: false,
      onboardingCompleted: false,
    });
  },

  isPro: () => {
    const { plan } = get();
    return plan === 'pro' || plan === 'bundle';
  },
}));
