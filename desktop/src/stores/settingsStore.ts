import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';

interface SettingsState {
  liteMode: boolean;
  refreshInterval: number; // in minutes
  electricityCost: number; // per kWh
  currency: string;
  startOnBoot: boolean;
  minimizeToTray: boolean;
  showNotifications: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  setLiteMode: (enabled: boolean) => Promise<void>;
  setRefreshInterval: (minutes: number) => Promise<void>;
  setElectricityCost: (cost: number) => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
  setStartOnBoot: (enabled: boolean) => Promise<void>;
  setMinimizeToTray: (enabled: boolean) => Promise<void>;
  setShowNotifications: (enabled: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  liteMode: false,
  refreshInterval: 30,
  electricityCost: 0.12,
  currency: 'USD',
  startOnBoot: false,
  minimizeToTray: true,
  showNotifications: true,

  loadSettings: async () => {
    try {
      const store = await Store.load('settings.json');

      const liteMode = await store.get<boolean>('liteMode') ?? false;
      const refreshInterval = await store.get<number>('refreshInterval') ?? 30;
      const electricityCost = await store.get<number>('electricityCost') ?? 0.12;
      const currency = await store.get<string>('currency') ?? 'USD';
      const startOnBoot = await store.get<boolean>('startOnBoot') ?? false;
      const minimizeToTray = await store.get<boolean>('minimizeToTray') ?? true;
      const showNotifications = await store.get<boolean>('showNotifications') ?? true;

      set({
        liteMode,
        refreshInterval,
        electricityCost,
        currency,
        startOnBoot,
        minimizeToTray,
        showNotifications,
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  setLiteMode: async (enabled: boolean) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('liteMode', enabled);
      await store.save();
      set({ liteMode: enabled });
    } catch (error) {
      console.error('Failed to save liteMode:', error);
    }
  },

  setRefreshInterval: async (minutes: number) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('refreshInterval', minutes);
      await store.save();
      set({ refreshInterval: minutes });
    } catch (error) {
      console.error('Failed to save refreshInterval:', error);
    }
  },

  setElectricityCost: async (cost: number) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('electricityCost', cost);
      await store.save();
      set({ electricityCost: cost });
    } catch (error) {
      console.error('Failed to save electricityCost:', error);
    }
  },

  setCurrency: async (currency: string) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('currency', currency);
      await store.save();
      set({ currency });
    } catch (error) {
      console.error('Failed to save currency:', error);
    }
  },

  setStartOnBoot: async (enabled: boolean) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('startOnBoot', enabled);
      await store.save();
      set({ startOnBoot: enabled });

      // Configure autostart with Tauri plugin
      // This will be handled in the main app
    } catch (error) {
      console.error('Failed to save startOnBoot:', error);
    }
  },

  setMinimizeToTray: async (enabled: boolean) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('minimizeToTray', enabled);
      await store.save();
      set({ minimizeToTray: enabled });
    } catch (error) {
      console.error('Failed to save minimizeToTray:', error);
    }
  },

  setShowNotifications: async (enabled: boolean) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('showNotifications', enabled);
      await store.save();
      set({ showNotifications: enabled });
    } catch (error) {
      console.error('Failed to save showNotifications:', error);
    }
  },
}));
