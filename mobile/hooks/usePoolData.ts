// Hook for fetching pool data for all wallets

import { useCallback, useEffect, useRef } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { fetchPoolData } from '@/services/pools';
import { WalletData, Worker } from '@/types';

export function usePoolData() {
  const { wallets, setWalletData, setLoading, setLastRefresh, isLoading } = useWalletStore();
  const { refreshInterval } = useSettingsStore();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isFetchingRef = useRef(false); // Prevent concurrent fetches

  /**
   * Fetch data for a single wallet
   */
  const fetchWallet = useCallback(async (walletId: string): Promise<WalletData | null> => {
    const wallet = wallets.find(w => w.id === walletId);
    if (!wallet || !wallet.enabled) return null;

    try {
      const poolStats = await fetchPoolData(wallet.pool, wallet.coin, wallet.address);

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
   * Fetch data for all enabled wallets
   */
  const fetchAllWallets = useCallback(async () => {
    const enabledWallets = wallets.filter(w => w.enabled);
    if (enabledWallets.length === 0) {
      setLoading(false);
      return;
    }

    // Prevent concurrent fetches - if already fetching, skip
    if (isFetchingRef.current) {
      console.log('Skipping fetch - already in progress');
      return;
    }

    isFetchingRef.current = true;
    setLoading(true);

    try {
      // Fetch all wallets in parallel
      await Promise.all(enabledWallets.map(w => fetchWallet(w.id)));
      setLastRefresh(Date.now());
    } catch (error) {
      console.error('Error fetching wallets:', error);
    } finally {
      isFetchingRef.current = false;
      setLoading(false);
    }
  }, [wallets, fetchWallet, setLoading, setLastRefresh]);

  /**
   * Start auto-refresh interval
   */
  const startAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Convert minutes to milliseconds
    const intervalMs = refreshInterval * 60 * 1000;

    intervalRef.current = setInterval(() => {
      fetchAllWallets();
    }, intervalMs);
  }, [refreshInterval, fetchAllWallets]);

  /**
   * Stop auto-refresh interval
   */
  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initial fetch on mount
  const hasFetchedRef = useRef(false);
  useEffect(() => {
    if (wallets.length > 0 && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchAllWallets();
    }
  }, [wallets.length, fetchAllWallets]);

  // Set up auto-refresh interval
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Convert minutes to milliseconds
    const intervalMs = refreshInterval * 60 * 1000;

    intervalRef.current = setInterval(() => {
      fetchAllWallets();
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [refreshInterval, fetchAllWallets]);

  return {
    fetchWallet,
    fetchAllWallets,
    isLoading,
    startAutoRefresh,
    stopAutoRefresh,
  };
}
