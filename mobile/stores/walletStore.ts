import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Wallet, WalletData } from '@/types';

interface WalletStore {
  wallets: Wallet[];
  walletData: Record<string, WalletData>;
  isLoading: boolean;
  lastRefresh: number | null;

  // Wallet management
  addWallet: (wallet: Wallet) => void;
  removeWallet: (id: string) => void;
  updateWallet: (id: string, updates: Partial<Wallet>) => void;
  setWallets: (wallets: Wallet[]) => void;
  reorderWallets: (wallets: Wallet[]) => void;

  // Wallet data
  setWalletData: (id: string, data: WalletData) => void;
  clearWalletData: (id: string) => void;

  // Loading state
  setLoading: (loading: boolean) => void;
  setLastRefresh: (timestamp: number) => void;

  // Storage
  loadFromStorage: () => Promise<void>;
  saveToStorage: () => Promise<void>;

  // Computed values
  getTotalHashrate: () => number;
  getTotalEarnings24h: () => number;
  getOnlineWorkerCount: () => { online: number; total: number };
  getEnabledWallets: () => Wallet[];
}

export const useWalletStore = create<WalletStore>((set, get) => ({
  wallets: [],
  walletData: {},
  isLoading: false,
  lastRefresh: null,

  addWallet: (wallet: Wallet) => {
    set((state) => ({
      wallets: [...state.wallets, { ...wallet, order: state.wallets.length }],
    }));
    get().saveToStorage();
  },

  removeWallet: (id: string) => {
    set((state) => ({
      wallets: state.wallets.filter((w) => w.id !== id),
      walletData: Object.fromEntries(
        Object.entries(state.walletData).filter(([key]) => key !== id)
      ),
    }));
    get().saveToStorage();
  },

  updateWallet: (id: string, updates: Partial<Wallet>) => {
    set((state) => ({
      wallets: state.wallets.map((w) =>
        w.id === id ? { ...w, ...updates } : w
      ),
    }));
    get().saveToStorage();
  },

  setWallets: (wallets: Wallet[]) => {
    set({ wallets });
    get().saveToStorage();
  },

  reorderWallets: (wallets: Wallet[]) => {
    set({
      wallets: wallets.map((w, index) => ({ ...w, order: index })),
    });
    get().saveToStorage();
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
