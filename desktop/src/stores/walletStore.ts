import { create } from 'zustand';
import { Store } from '@tauri-apps/plugin-store';
import { useAuthStore } from './authStore';

const API_BASE = 'https://www.mineglance.com';

export interface Wallet {
  id: string;
  name: string;
  pool: string;
  coin: string;
  address: string;
  enabled: boolean;
  power?: number; // watts
  order?: number;
}

export interface WalletStats {
  walletId: string;
  hashrate: number;
  hashrateUnit: string;
  workersOnline: number;
  workersOffline: number;
  balance: number;
  balanceUSD: number;
  pendingBalance?: number;
  dailyRevenue: number;
  dailyProfit: number;
  coinPrice: number;
  error?: string;
  lastUpdated: Date;
}

interface WalletState {
  wallets: Wallet[];
  stats: Map<string, WalletStats>;
  isLoading: boolean;
  isSyncing: boolean;
  lastRefresh: Date | null;

  // Actions
  loadWallets: () => Promise<void>;
  syncWallets: () => Promise<void>;
  addWallet: (wallet: Omit<Wallet, 'id'>) => Promise<void>;
  updateWallet: (id: string, updates: Partial<Wallet>) => Promise<void>;
  removeWallet: (id: string) => Promise<void>;
  reorderWallets: (walletIds: string[]) => Promise<void>;
  refreshStats: () => Promise<void>;
  getWalletStats: (walletId: string) => WalletStats | undefined;
  getTotalProfit: () => number;
  getTotalRevenue: () => number;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: [],
  stats: new Map(),
  isLoading: false,
  isSyncing: false,
  lastRefresh: null,

  loadWallets: async () => {
    set({ isLoading: true });

    try {
      const store = await Store.load('wallets.json');
      const wallets = await store.get<Wallet[]>('wallets') ?? [];
      set({ wallets, isLoading: false });
    } catch (error) {
      console.error('Failed to load wallets:', error);
      set({ isLoading: false });
    }
  },

  syncWallets: async () => {
    const { token, user } = useAuthStore.getState();
    if (!token || !user) return;

    set({ isSyncing: true });

    try {
      // Fetch wallets from server
      const response = await fetch(`${API_BASE}/api/wallets/sync`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const serverWallets = data.wallets || [];

        // Save to local store
        const store = await Store.load('wallets.json');
        await store.set('wallets', serverWallets);
        await store.save();

        set({ wallets: serverWallets });
      }
    } catch (error) {
      console.error('Failed to sync wallets:', error);
    } finally {
      set({ isSyncing: false });
    }
  },

  addWallet: async (walletData: Omit<Wallet, 'id'>) => {
    const { wallets } = get();
    const { token, user } = useAuthStore.getState();

    // Check wallet limit for free users
    if (user?.plan === 'free' && wallets.length >= 2) {
      throw new Error('Free plan limited to 2 wallets. Upgrade to Pro for unlimited.');
    }

    const newWallet: Wallet = {
      ...walletData,
      id: generateId(),
      order: wallets.length,
    };

    const updatedWallets = [...wallets, newWallet];

    // Save locally
    const store = await Store.load('wallets.json');
    await store.set('wallets', updatedWallets);
    await store.save();

    set({ wallets: updatedWallets });

    // Sync to server if logged in
    if (token) {
      try {
        await fetch(`${API_BASE}/api/wallets/sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ wallets: updatedWallets }),
        });
      } catch (error) {
        console.error('Failed to sync wallet to server:', error);
      }
    }
  },

  updateWallet: async (id: string, updates: Partial<Wallet>) => {
    const { wallets } = get();
    const { token } = useAuthStore.getState();

    const updatedWallets = wallets.map(w =>
      w.id === id ? { ...w, ...updates } : w
    );

    const store = await Store.load('wallets.json');
    await store.set('wallets', updatedWallets);
    await store.save();

    set({ wallets: updatedWallets });

    // Sync to server
    if (token) {
      try {
        await fetch(`${API_BASE}/api/wallets/sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ wallets: updatedWallets }),
        });
      } catch (error) {
        console.error('Failed to sync wallet update:', error);
      }
    }
  },

  removeWallet: async (id: string) => {
    const { wallets, stats } = get();
    const { token } = useAuthStore.getState();

    const updatedWallets = wallets.filter(w => w.id !== id);
    const newStats = new Map(stats);
    newStats.delete(id);

    const store = await Store.load('wallets.json');
    await store.set('wallets', updatedWallets);
    await store.save();

    set({ wallets: updatedWallets, stats: newStats });

    // Sync to server
    if (token) {
      try {
        await fetch(`${API_BASE}/api/wallets/sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ wallets: updatedWallets }),
        });
      } catch (error) {
        console.error('Failed to sync wallet removal:', error);
      }
    }
  },

  reorderWallets: async (walletIds: string[]) => {
    const { wallets } = get();
    const { token } = useAuthStore.getState();

    const reordered = walletIds.map((id, index) => {
      const wallet = wallets.find(w => w.id === id);
      return wallet ? { ...wallet, order: index } : null;
    }).filter(Boolean) as Wallet[];

    const store = await Store.load('wallets.json');
    await store.set('wallets', reordered);
    await store.save();

    set({ wallets: reordered });

    // Sync to server
    if (token) {
      try {
        await fetch(`${API_BASE}/api/wallets/sync`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ wallets: reordered }),
        });
      } catch (error) {
        console.error('Failed to sync wallet reorder:', error);
      }
    }
  },

  refreshStats: async () => {
    const { wallets } = get();
    set({ isLoading: true });

    const newStats = new Map<string, WalletStats>();

    for (const wallet of wallets) {
      if (!wallet.enabled) continue;

      try {
        // This will be implemented with pool API parsers
        // For now, create placeholder stats
        const stats = await fetchWalletStats(wallet);
        newStats.set(wallet.id, stats);
      } catch (error) {
        console.error(`Failed to fetch stats for ${wallet.name}:`, error);
        newStats.set(wallet.id, {
          walletId: wallet.id,
          hashrate: 0,
          hashrateUnit: 'MH/s',
          workersOnline: 0,
          workersOffline: 0,
          balance: 0,
          balanceUSD: 0,
          dailyRevenue: 0,
          dailyProfit: 0,
          coinPrice: 0,
          error: 'Failed to fetch stats',
          lastUpdated: new Date(),
        });
      }
    }

    set({ stats: newStats, isLoading: false, lastRefresh: new Date() });
  },

  getWalletStats: (walletId: string) => {
    return get().stats.get(walletId);
  },

  getTotalProfit: () => {
    const { stats } = get();
    let total = 0;
    stats.forEach(s => {
      if (!s.error) total += s.dailyProfit;
    });
    return total;
  },

  getTotalRevenue: () => {
    const { stats } = get();
    let total = 0;
    stats.forEach(s => {
      if (!s.error) total += s.dailyRevenue;
    });
    return total;
  },
}));

// Placeholder function - will be replaced with actual pool API calls
async function fetchWalletStats(wallet: Wallet): Promise<WalletStats> {
  // Import and use pool parsers here
  // For now, return placeholder
  return {
    walletId: wallet.id,
    hashrate: 0,
    hashrateUnit: 'MH/s',
    workersOnline: 0,
    workersOffline: 0,
    balance: 0,
    balanceUSD: 0,
    dailyRevenue: 0,
    dailyProfit: 0,
    coinPrice: 0,
    lastUpdated: new Date(),
  };
}
