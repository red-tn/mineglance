import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';
import { fetch } from '@tauri-apps/plugin-http';
import { useAuthStore } from './authStore';

const API_BASE = 'https://www.mineglance.com';

interface SettingsState {
  liteMode: boolean;
  refreshInterval: number; // in minutes
  electricityCost: number; // per kWh
  currency: string;
  startOnBoot: boolean;
  minimizeToTray: boolean;
  showNotifications: boolean;
  isSyncing: boolean;

  // Actions
  loadSettings: () => Promise<void>;
  syncFromCloud: () => Promise<void>;
  syncToCloud: () => Promise<void>;
  setLiteMode: (enabled: boolean) => Promise<void>;
  setRefreshInterval: (minutes: number) => Promise<void>;
  setElectricityCost: (cost: number) => Promise<void>;
  setCurrency: (currency: string) => Promise<void>;
  setStartOnBoot: (enabled: boolean) => Promise<void>;
  setMinimizeToTray: (enabled: boolean) => Promise<void>;
  setShowNotifications: (enabled: boolean) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  liteMode: false,
  refreshInterval: 30,
  electricityCost: 0.12,
  currency: 'USD',
  startOnBoot: false,
  minimizeToTray: true,
  showNotifications: true,
  isSyncing: false,

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

      // Also try to sync from cloud
      await get().syncFromCloud();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  },

  syncFromCloud: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    set({ isSyncing: true });

    try {
      const response = await fetch(`${API_BASE}/api/settings/sync`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const cloudSettings = data.settings;

        if (cloudSettings) {
          const store = await Store.load('settings.json');

          // Update local settings from cloud
          if (cloudSettings.refreshInterval !== undefined) {
            await store.set('refreshInterval', cloudSettings.refreshInterval);
            set({ refreshInterval: cloudSettings.refreshInterval });
          }
          if (cloudSettings.electricityRate !== undefined) {
            await store.set('electricityCost', cloudSettings.electricityRate);
            set({ electricityCost: cloudSettings.electricityRate });
          }
          if (cloudSettings.currency !== undefined) {
            await store.set('currency', cloudSettings.currency);
            set({ currency: cloudSettings.currency });
          }
          if (cloudSettings.notifyWorkerOffline !== undefined) {
            await store.set('showNotifications', cloudSettings.notifyWorkerOffline);
            set({ showNotifications: cloudSettings.notifyWorkerOffline });
          }
          if (cloudSettings.liteMode !== undefined) {
            await store.set('liteMode', cloudSettings.liteMode);
            set({ liteMode: cloudSettings.liteMode });
          }

          await store.save();
          console.log('Settings synced from cloud');
        }
      }
    } catch (error) {
      console.error('Failed to sync settings from cloud:', error);
    } finally {
      set({ isSyncing: false });
    }
  },

  syncToCloud: async () => {
    const { token } = useAuthStore.getState();
    if (!token) return;

    const state = get();

    try {
      await fetch(`${API_BASE}/api/settings/sync`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshInterval: state.refreshInterval,
          electricityRate: state.electricityCost,
          currency: state.currency,
          notifyWorkerOffline: state.showNotifications,
          notifyProfitDrop: state.showNotifications,
          liteMode: state.liteMode,
        }),
      });
      console.log('Settings synced to cloud');
    } catch (error) {
      console.error('Failed to sync settings to cloud:', error);
    }
  },

  setLiteMode: async (enabled: boolean) => {
    try {
      const store = await Store.load('settings.json');
      await store.set('liteMode', enabled);
      await store.save();
      set({ liteMode: enabled });
      // Sync to cloud
      get().syncToCloud();
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
      // Sync to cloud
      get().syncToCloud();
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
      // Sync to cloud
      get().syncToCloud();
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
      // Sync to cloud
      get().syncToCloud();
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
      // Sync to cloud
      get().syncToCloud();
    } catch (error) {
      console.error('Failed to save showNotifications:', error);
    }
  },
}));
