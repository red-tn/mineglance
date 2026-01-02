import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Settings, NotificationSettings } from '@/types';
import { defaults } from '@/constants/theme';

interface SettingsStore extends Settings {
  setRefreshInterval: (interval: number) => void;
  setElectricityRate: (rate: number) => void;
  setElectricityCurrency: (currency: string) => void;
  setPowerConsumption: (watts: number) => void;
  setCurrency: (currency: string) => void;
  setNotifications: (settings: Partial<NotificationSettings>) => void;
  setShowDiscoveryCoins: (show: boolean) => void;
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
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
  },
  showDiscoveryCoins: true,
};

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
      };
      await AsyncStorage.setItem('settings', JSON.stringify(toSave));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  },

  importSettings: (settings: Partial<Settings>) => {
    set((state) => ({ ...state, ...settings }));
    get().saveToStorage();
  },
}));
