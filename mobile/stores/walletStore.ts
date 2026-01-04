import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Wallet, WalletData } from '@/types';

const API_BASE = 'https://www.mineglance.com/api';

interface WalletStore {
  wallets: Wallet[];
  walletData: Record<string, WalletData>;
  isLoading: boolean;
  lastRefresh: number | null;

  // Wallet management
  addWallet: (wallet: Wallet) => Promise<void>;
  removeWallet: (id: string) => Promise<void>;
  updateWallet: (id: string, updates: Partial<Wallet>) => Promise<void>;
  setWallets: (wallets: Wallet[]) => void;
  reorderWallets: (wallets: Wallet[]) => Promise<void>;

  // Wallet data
  setWalletData: (id: string, data: WalletData) => void;
  clearWalletData: (id: string) => void;

  // Loading state
  setLoading: (loading: boolean) => void;
  setLastRefresh: (timestamp: number) => void;

  // Storage & Sync
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;
  loadFromServer: () => Promise<void>;
  syncToServer: (wallet: Wallet, method: 'POST' | 'PUT' | 'DELETE') => Promise<void>;

  // Computed values
  getTotalHashrate: () => number;
  getTotalEarnings24h: () => number;
  getOnlineWorkerCount: () => { online: number; total: number };
  getEnabledWallets: () => Wallet[];
}

async function getAuthToken(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync('authToken');
  } catch {
    return null;
  }
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  wallets: [],
  walletData: {},
  isLoading: false,
  lastRefresh: null,

  addWallet: async (wallet: Wallet) => {
    const newWallet = { ...wallet, order: get().wallets.length };

    set((state) => ({
      wallets: [...state.wallets, newWallet],
    }));

    await get().saveToStorage();
    await get().syncToServer(newWallet, 'POST');
  },

  removeWallet: async (id: string) => {
    const wallet = get().wallets.find(w => w.id === id);

    set((state) => ({
      wallets: state.wallets.filter((w) => w.id !== id),
      walletData: Object.fromEntries(
        Object.entries(state.walletData).filter(([key]) => key !== id)
      ),
    }));

    await get().saveToStorage();

    if (wallet) {
      await get().syncToServer(wallet, 'DELETE');
    }
  },

  updateWallet: async (id: string, updates: Partial<Wallet>) => {
    set((state) => ({
      wallets: state.wallets.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
    }));

    await get().saveToStorage();

    const updatedWallet = get().wallets.find(w => w.id === id);
    if (updatedWallet) {
      await get().syncToServer(updatedWallet, 'PUT');
    }
  },

  setWallets: (wallets: Wallet[]) => {
    set({ wallets });
    get().saveToStorage();
  },

  reorderWallets: async (wallets: Wallet[]) => {
    const reordered = wallets.map((w, index) => ({ ...w, order: index }));
    set({ wallets: reordered });
    await get().saveToStorage();

    // Sync each wallet order to server
    const authToken = await getAuthToken();
    if (authToken) {
      for (const wallet of reordered) {
        await get().syncToServer(wallet, 'PUT');
      }
    }
  },

  setWalletData: (id: string, data: WalletData) => {
    set((state) => ({
      walletData: { ...state.walletData, [id]: data },
    }));
  },

  clearWalletData: (id: string) => {
    set((state) => {
      const newData = { ...state.walletData };
      delete newData[id];
      return { walletData: newData };
    });
  },

  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },

  setLastRefresh: (timestamp: number) => {
    set({ lastRefresh: timestamp });
  },

  loadFromStorage: async () => {
    try {
      const stored = await AsyncStorage.getItem('wallets');
      if (stored) {
        const wallets = JSON.parse(stored);
        set({ wallets });
      }
    } catch (error) {
      console.error('Failed to load wallets:', error);
    }
  },

  saveToStorage: async () => {
    try {
      const { wallets } = get();
      await AsyncStorage.setItem('wallets', JSON.stringify(wallets));
    } catch (error) {
      console.error('Failed to save wallets:', error);
    }
  },

  loadFromServer: async () => {
    const authToken = await getAuthToken();
    if (!authToken) return;

    try {
      const response = await fetch(`${API_BASE}/wallets/sync`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.wallets && Array.isArray(data.wallets)) {
          // Map server wallets to local format
          const wallets: Wallet[] = data.wallets.map((w: any) => ({
            id: w.id,
            name: w.name,
            pool: w.pool,
            coin: w.coin,
            address: w.address,
            power: w.power || 200,
            enabled: w.enabled !== false,
            order: w.display_order || 0,
          }));

          set({ wallets });
          await get().saveToStorage();
        }
      }
    } catch (error) {
      console.error('Failed to load wallets from server:', error);
    }
  },

  syncToServer: async (wallet: Wallet, method: 'POST' | 'PUT' | 'DELETE') => {
    const authToken = await getAuthToken();
    if (!authToken) return;

    try {
      const url = method === 'DELETE'
        ? `${API_BASE}/wallets/sync?id=${wallet.id}`
        : `${API_BASE}/wallets/sync`;

      const options: RequestInit = {
        method,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      };

      if (method !== 'DELETE') {
        options.body = JSON.stringify({
          id: wallet.id,
          name: wallet.name,
          pool: wallet.pool,
          coin: wallet.coin,
          address: wallet.address,
          power: wallet.power || 200,
          enabled: wallet.enabled,
          display_order: wallet.order || 0,
        });
      }

      const response = await fetch(url, options);

      if (method === 'POST' && response.ok) {
        const data = await response.json();
        if (data.wallet?.id && data.wallet.id !== wallet.id) {
          // Update local wallet with server-assigned ID
          set((state) => ({
            wallets: state.wallets.map(w =>
              w.id === wallet.id ? { ...w, id: data.wallet.id } : w
            ),
          }));
          await get().saveToStorage();
        }
      }
    } catch (error) {
      console.log('Wallet sync to server failed:', error);
    }
  },

  getTotalHashrate: () => {
    const { wallets, walletData } = get();
    return wallets
      .filter((w) => w.enabled)
      .reduce((total, wallet) => {
        const data = walletData[wallet.id];
        return total + (data?.hashrate || 0);
      }, 0);
  },

  getTotalEarnings24h: () => {
    const { wallets, walletData } = get();
    return wallets
      .filter((w) => w.enabled)
      .reduce((total, wallet) => {
        const data = walletData[wallet.id];
        return total + (data?.earnings24h || 0);
      }, 0);
  },

  getOnlineWorkerCount: () => {
    const { wallets, walletData } = get();
    let online = 0;
    let total = 0;

    wallets.filter((w) => w.enabled).forEach((wallet) => {
      const data = walletData[wallet.id];
      if (data?.workers) {
        total += data.workers.length;
        online += data.workers.filter((w) => w.online).length;
      }
    });

    return { online, total };
  },

  getEnabledWallets: () => {
    const { wallets } = get();
    return wallets
      .filter((w) => w.enabled)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  },
}));
