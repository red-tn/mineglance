// Hook for fetching pool data for all wallets
// Uses singleton interval to prevent duplicate fetches across components

import { useCallback, useEffect, useRef } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { fetchPoolData, isWalletAllowed } from '@/services/pools';
import { WalletData, Worker } from '@/types';

// Global state to prevent multiple intervals and duplicate fetches
let globalIntervalId: ReturnType<typeof setInterval> | null = null;
let globalIsFetching = false;
let globalHasFetched = false;
let globalLastRefreshInterval = 30;
let globalLastFetchTime = 0;
let globalLastWalletIds = '';

export function usePoolData() {
  const { wallets, setWalletData, setLoading, setLastRefresh, isLoading } = useWalletStore();
  const { refreshInterval } = useSettingsStore();
  const { plan } = useAuthStore();
  const mountedRef = useRef(true);
  const isPro = plan === 'pro' || plan === 'bundle';

  /**
   * Fetch data for a single wallet
   */
  const fetchWallet = useCallback(async (walletId: string): Promise<WalletData | null> => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet || !wallet.enabled) return null;

    try {
      console.log(`Fetching pool data for ${wallet.pool}/${wallet.coin}/${wallet.address.slice(0, 8)}...`);
      const poolStats = await fetchPoolData(wallet.pool, wallet.coin, wallet.address);
      console.log(`Pool data received:`, poolStats);

      const walletData: WalletData = {
        walletId: wallet.id,
        hashrate: poolStats.hashrate,
        hashrate24h: poolStats.hashrate24h,
        balance: poolStats.balance,
        earnings24h: poolStats.earnings24h,
        workers: poolStats.workers.map(w => ({
          name: w.name,
          hashrate: w.hashrate,
          lastSeen: w.lastSeen,
          online: !w.offline,
          shares: w.shares,
        })),
        lastUpdated: Date.now(),
      };

      setWalletData(wallet.id, walletData);
      return walletData;
    } catch (error) {
      console.error(`Error fetching ${wallet.pool}/${wallet.coin}:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch data';

      const walletData: WalletData = {
        walletId: wallet.id,
        hashrate: 0,
        balance: 0,
        workers: [],
        lastUpdated: Date.now(),
        error: errorMessage,
      };

      setWalletData(wallet.id, walletData);
      return walletData;
    }
  }, [wallets, setWalletData]);

  /**
   * Fetch data for all enabled wallets (with free tier restrictions)
   */
  const fetchAllWallets = useCallback(async () => {
    const enabledWallets = wallets.filter(w => w.enabled);
    console.log(`[PoolData] fetchAllWallets called, ${enabledWallets.length} enabled wallets`);

    if (enabledWallets.length === 0) {
      console.log('[PoolData] No enabled wallets, skipping fetch');
      setLoading(false);
      return;
    }

    // Reset stuck fetch flag if it's been more than 2 minutes
    const now = Date.now();
    if (globalIsFetching && (now - globalLastFetchTime) > 120000) {
      console.log('[PoolData] Resetting stuck globalIsFetching flag');
      globalIsFetching = false;
    }

    // Prevent concurrent fetches globally
    if (globalIsFetching) {
      console.log('[PoolData] Skipping fetch - already in progress globally');
      return;
    }

    globalIsFetching = true;
    globalLastFetchTime = now;
    setLoading(true);

    try {
      console.log(`[PoolData] Fetching data for ${enabledWallets.length} wallets...`);

      // Apply free tier restrictions
      const fetchPromises = enabledWallets.map((wallet, index) => {
        const restriction = isWalletAllowed(wallet, isPro, index);
        if (!restriction.allowed) {
          console.log(`[PoolData] Wallet ${wallet.name || wallet.coin} restricted: ${restriction.reason}`);
          // Set restriction error instead of fetching
          const restrictedData: WalletData = {
            walletId: wallet.id,
            hashrate: 0,
            balance: 0,
            workers: [],
            lastUpdated: Date.now(),
            error: restriction.reason,
            restricted: true,
          };
          setWalletData(wallet.id, restrictedData);
          return Promise.resolve(restrictedData);
        }
        return fetchWallet(wallet.id);
      });

      const results = await Promise.all(fetchPromises);
      console.log(`[PoolData] Fetch complete, results:`, results.map(r => ({
        id: r?.walletId,
        hashrate: r?.hashrate,
        error: r?.error
      })));
      setLastRefresh(Date.now());
      console.log('[PoolData] All wallets fetched successfully');
    } catch (error) {
      console.error('[PoolData] Error fetching wallets:', error);
    } finally {
      globalIsFetching = false;
      setLoading(false);
    }
  }, [wallets, fetchWallet, setLoading, setLastRefresh, setWalletData, isPro]);

  // Initial fetch on first mount (global, not per-component)
  // Also refetch when wallets change (e.g., synced from server)
  useEffect(() => {
    // Create a string of current wallet IDs to detect changes
    const currentWalletIds = wallets.filter(w => w.enabled).map(w => w.id).sort().join(',');
    const walletsChanged = currentWalletIds !== globalLastWalletIds && currentWalletIds.length > 0;

    console.log(`[PoolData] useEffect triggered, wallets.length=${wallets.length}, enabled=${wallets.filter(w => w.enabled).length}, globalHasFetched=${globalHasFetched}, walletsChanged=${walletsChanged}`);
    console.log(`[PoolData] currentIds: ${currentWalletIds.slice(0, 50)}...`);
    console.log(`[PoolData] lastIds: ${globalLastWalletIds.slice(0, 50)}...`);

    // Fetch if: (1) first time with wallets, OR (2) wallet list changed (new wallets synced)
    if (wallets.length > 0 && (!globalHasFetched || walletsChanged)) {
      console.log('[PoolData] Fetch triggered - reason:', !globalHasFetched ? 'first fetch' : 'wallets changed');
      globalHasFetched = true;
      globalLastWalletIds = currentWalletIds;
      fetchAllWallets();
    }
  }, [wallets, fetchAllWallets]);

  // Set up global auto-refresh interval (only one instance)
  useEffect(() => {
    // Only set up interval if it doesn't exist or interval changed
    if (refreshInterval !== globalLastRefreshInterval || !globalIntervalId) {
      // Clear existing interval
      if (globalIntervalId) {
        clearInterval(globalIntervalId);
        globalIntervalId = null;
      }

      globalLastRefreshInterval = refreshInterval;

      // Convert minutes to milliseconds
      const intervalMs = refreshInterval * 60 * 1000;
      console.log(`Setting up auto-refresh every ${refreshInterval} minutes`);

      globalIntervalId = setInterval(() => {
        if (!globalIsFetching) {
          fetchAllWallets();
        }
      }, intervalMs);
    }

    // Cleanup on unmount - but don't clear global interval
    // Only clear if this was the last component using it
    return () => {
      mountedRef.current = false;
    };
  }, [refreshInterval, fetchAllWallets]);

  return {
    fetchWallet,
    fetchAllWallets,
    isLoading,
  };
}

// Export function to reset global state (useful for testing or logout)
export function resetPoolDataState() {
  if (globalIntervalId) {
    clearInterval(globalIntervalId);
    globalIntervalId = null;
  }
  globalIsFetching = false;
  globalHasFetched = false;
  globalLastWalletIds = '';
}
