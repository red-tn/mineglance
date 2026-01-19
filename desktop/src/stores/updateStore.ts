import { create } from 'zustand';
import { fetch } from '@tauri-apps/plugin-http';
import { Store } from '@tauri-apps/plugin-store';

const API_BASE = 'https://www.mineglance.com/api';
const APP_VERSION = '1.3.2';

interface UpdateState {
  latestVersion: string | null;
  downloadUrl: string | null;
  hasUpdate: boolean;
  dismissed: boolean;

  checkForUpdates: () => Promise<void>;
  dismissUpdate: () => Promise<void>;
}

function compareVersions(a: string, b: string): number {
  const aParts = a.split('.').map(Number);
  const bParts = b.split('.').map(Number);

  for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
    const aVal = aParts[i] || 0;
    const bVal = bParts[i] || 0;
    if (aVal > bVal) return 1;
    if (aVal < bVal) return -1;
  }
  return 0;
}

export const useUpdateStore = create<UpdateState>((set, get) => ({
  latestVersion: null,
  downloadUrl: null,
  hasUpdate: false,
  dismissed: false,

  checkForUpdates: async () => {
    try {
      const store = await Store.load('settings.json');
      const dismissedVersion = await store.get<string>('dismissedUpdateVersion');

      const response = await fetch(`${API_BASE}/software/latest?platform=desktop_windows`);
      if (!response.ok) return;

      const data = await response.json();
      if (!data.version) return;

      const isNewer = compareVersions(data.version, APP_VERSION) > 0;
      if (!isNewer) return;

      // Check if already dismissed this version
      if (dismissedVersion && compareVersions(data.version, dismissedVersion) <= 0) {
        return;
      }

      set({
        latestVersion: data.version,
        downloadUrl: data.downloadUrl || null,
        hasUpdate: true,
        dismissed: false,
      });
    } catch (e) {
      console.error('Failed to check for updates:', e);
    }
  },

  dismissUpdate: async () => {
    const { latestVersion } = get();
    if (latestVersion) {
      const store = await Store.load('settings.json');
      await store.set('dismissedUpdateVersion', latestVersion);
      await store.save();
    }
    set({ dismissed: true });
  },
}));
