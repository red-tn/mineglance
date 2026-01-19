import { create } from 'zustand';
import { fetch } from '@tauri-apps/plugin-http';
import { Store } from '@tauri-apps/plugin-store';
import { tempDir, join } from '@tauri-apps/api/path';
import { writeFile } from '@tauri-apps/plugin-fs';
import { open } from '@tauri-apps/plugin-shell';
import { exit } from '@tauri-apps/plugin-process';

const API_BASE = 'https://www.mineglance.com/api';
const APP_VERSION = '1.3.5';

interface UpdateState {
  latestVersion: string | null;
  downloadUrl: string | null;
  hasUpdate: boolean;
  dismissed: boolean;
  downloading: boolean;
  downloadProgress: number;
  downloadedPath: string | null;
  error: string | null;

  checkForUpdates: () => Promise<void>;
  downloadUpdate: () => Promise<void>;
  installUpdate: () => Promise<void>;
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
  downloading: false,
  downloadProgress: 0,
  downloadedPath: null,
  error: null,

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

      // Auto-download in background
      get().downloadUpdate();
    } catch (e) {
      console.error('Failed to check for updates:', e);
    }
  },

  downloadUpdate: async () => {
    const { downloadUrl, latestVersion, downloading } = get();
    if (!downloadUrl || !latestVersion || downloading) return;

    set({ downloading: true, downloadProgress: 0, error: null });

    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error('Failed to download update');
      }

      const blob = await response.blob();
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);

      // Save to temp directory
      const temp = await tempDir();
      const fileName = `MineGlance_${latestVersion}_x64-setup.exe`;
      const filePath = await join(temp, fileName);

      await writeFile(filePath, bytes);

      set({
        downloading: false,
        downloadProgress: 100,
        downloadedPath: filePath,
      });
    } catch (e) {
      console.error('Failed to download update:', e);
      set({
        downloading: false,
        error: e instanceof Error ? e.message : 'Download failed',
      });
    }
  },

  installUpdate: async () => {
    const { downloadedPath } = get();
    if (!downloadedPath) return;

    try {
      // Launch the installer
      await open(downloadedPath);
      // Exit the app so installer can proceed
      await exit(0);
    } catch (e) {
      console.error('Failed to install update:', e);
      set({ error: e instanceof Error ? e.message : 'Install failed' });
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
