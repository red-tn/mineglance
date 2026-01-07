import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, NotificationSettings } from '@/types';
import { defaults } from '@/constants/theme';

const API_BASE = 'https://www.mineglance.com/api';

interface SettingsStore extends Settings {
  setRefreshInterval: (interval: number) => void;
  setElectricityRate: (rate: number) => void;
  setElectricityCurrency: (currency: string) => void;
  setPowerConsumption: (watts: number) => void;
  setCurrency: (currency: string) => void;
  setNotifications: (settings: Partial<NotificationSettings>) => void;
  setShowDiscoveryCoins: (show: boolean) => void;
  setLiteMode: (enabled: boolean) => void;
  loadFromStorage: () => Promise<void>;
  loadFromServer: (authToken: string) => Promise<void>;
  saveToStorage: () => Promise<void>;
  saveToServer: (authToken: string) => Promise<void>;
  importSettings: (settings: Partial<Settings>) => void;
}

const defaultSettings: Settings = {
  refreshInterval: defaults.refreshInterval, // 30 minutes (user requested)
  electricityRate: 0.12,
  electricityCurrency: 'USD',
  powerConsumption: 0,
  currency: 'USD',
  notifications: {
    enabled: true,
    workerOffline: true,
    profitDrop: false,
    profitDropThreshold: 10,
    betterCoin: false,
    emailEnabled: false,
    emailAddress: '',
    emailFrequency: 'immediate',
  },
  showDiscoveryCoins: true,
  liteMode: false, // Dark mode by default
};

// Helper to get auth token for syncing
async function getAuthToken(): Promise<string | null> {
  try {
    const { useAuthStore } = await import('./authStore');
    return useAuthStore.getState().authToken;
  } catch {
    return null;
  }
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  ...defaultSettings,

  setRefreshInterval: (interval: number) => {
    set({ refreshInterval: interval });
    get().saveToStorage();
  },

  setElectricityRate: (rate: number) => {
    set({ electricityRate: rate });
    get().saveToStorage();
  },

  setElectricityCurrency: (currency: string) => {
    set({ electricityCurrency: currency });
    get().saveToStorage();
  },

  setPowerConsumption: (watts: number) => {
    set({ powerConsumption: watts });
    get().saveToStorage();
  },

  setCurrency: (currency: string) => {
    set({ currency: currency });
    get().saveToStorage();
  },

  setNotifications: (settings: Partial<NotificationSettings>) => {
    set((state) => ({
      notifications: { ...state.notifications, ...settings },
    }));
    get().saveToStorage();
  },

  setShowDiscoveryCoins: (show: boolean) => {
    set({ showDiscoveryCoins: show });
    get().saveToStorage();
  },

  setLiteMode: (enabled: boolean) => {
    set({ liteMode: enabled });
    get().saveToStorage();
  },

  loadFromStorage: async () => {
    try {
      const stored = await AsyncStorage.getItem('settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate refreshInterval - must be one of the valid options
        const validIntervals = [15, 30, 60, 180];
        if (!validIntervals.includes(parsed.refreshInterval)) {
          parsed.refreshInterval = 30; // Default to 30 minutes
        }
        set({ ...defaultSettings, ...parsed });
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  loadFromServer: async (authToken: string) => {
    try {
      const response = await fetch(`${API_BASE}/settings/sync`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          const s = data.settings;
          const serverSettings: Settings = {
            refreshInterval: s.refreshInterval || 30,
            electricityRate: s.electricityRate || 0.12,
            electricityCurrency: s.electricityCurrency || 'USD',
            powerConsumption: s.powerConsumption || 0,
            currency: s.currency || 'USD',
            notifications: {
              enabled: true,
              workerOffline: s.notifyWorkerOffline !== false,
              profitDrop: s.notifyProfitDrop !== false,
              profitDropThreshold: s.profitDropThreshold || 10,
              betterCoin: s.notifyBetterCoin === true,
              emailEnabled: s.emailAlertsEnabled === true,
              emailAddress: s.emailAlertsAddress || '',
              emailFrequency: s.emailFrequency || 'immediate',
            },
            showDiscoveryCoins: s.showDiscoveryCoins !== false,
            liteMode: s.liteMode === true,
          };
          set(serverSettings);
          // Only save to local storage, don't sync back to server
          const toSave: Settings = {
            refreshInterval: serverSettings.refreshInterval,
            electricityRate: serverSettings.electricityRate,
            electricityCurrency: serverSettings.electricityCurrency,
            powerConsumption: serverSettings.powerConsumption,
            currency: serverSettings.currency,
            notifications: serverSettings.notifications,
            showDiscoveryCoins: serverSettings.showDiscoveryCoins,
            liteMode: serverSettings.liteMode,
          };
          await AsyncStorage.setItem('settings', JSON.stringify(toSave));
          console.log('Settings synced from server');
        }
      }
    } catch (error) {
      console.error('Failed to load settings from server:', error);
    }
  },

  saveToServer: async (authToken: string) => {
    try {
      const state = get();
      await fetch(`${API_BASE}/settings/sync`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          refreshInterval: state.refreshInterval,
          electricityRate: state.electricityRate,
          electricityCurrency: state.electricityCurrency,
          powerConsumption: state.powerConsumption,
          currency: state.currency,
          notifyWorkerOffline: state.notifications.workerOffline,
          notifyProfitDrop: state.notifications.profitDrop,
          profitDropThreshold: state.notifications.profitDropThreshold,
          notifyBetterCoin: state.notifications.betterCoin,
          emailAlertsEnabled: state.notifications.emailEnabled,
          emailAlertsAddress: state.notifications.emailAddress,
          emailFrequency: state.notifications.emailFrequency,
          showDiscoveryCoins: state.showDiscoveryCoins,
          liteMode: state.liteMode,
        })
      });
      console.log('Settings synced to server');
    } catch (error) {
      console.error('Failed to save settings to server:', error);
    }
  },

  saveToStorage: async () => {
    try {
      const state = get();
      const toSave: Settings = {
        refreshInterval: state.refreshInterval,
        electricityRate: state.electricityRate,
        electricityCurrency: state.electricityCurrency,
        powerConsumption: state.powerConsumption,
        currency: state.currency,
        notifications: state.notifications,
        showDiscoveryCoins: state.showDiscoveryCoins,
        liteMode: state.liteMode,
      };
      await AsyncStorage.setItem('settings', JSON.stringify(toSave));

      // Also sync to server if authenticated
      const authToken = await getAuthToken();
      if (authToken) {
        get().saveToServer(authToken);
      }
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  importSettings: (settings: Partial<Settings>) => {
    set((state) => ({ ...state, ...settings }));
    get().saveToStorage();
  },
}));
