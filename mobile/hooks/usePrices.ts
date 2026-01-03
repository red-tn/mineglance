// Hook for fetching and caching coin prices

import { useState, useCallback, useEffect, useRef } from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { fetchCoinPrices, getCachedPrice, getPriceWithFallback } from '@/services/coingecko';

// Refresh prices every 5 minutes
const PRICE_REFRESH_INTERVAL = 5 * 60 * 1000;

export function usePrices() {
  const { wallets } = useWalletStore();
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /**
   * Get unique coins from all wallets
   */
  const getUniqueCoins = useCallback((): string[] => {
    const coins = new Set<string>();
    for (const wallet of wallets) {
      coins.add(wallet.coin.toLowerCase());
    }
    return Array.from(coins);
  }, [wallets]);

  /**
   * Fetch prices for all wallet coins
   */
  const fetchPrices = useCallback(async () => {
    const coins = getUniqueCoins();
    if (coins.length === 0) return;

    setIsLoading(true);

    try {
      const fetchedPrices = await fetchCoinPrices(coins);
      setPrices(prev => ({ ...prev, ...fetchedPrices }));
      setLastUpdated(Date.now());
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    } finally {
      setIsLoading(false);
    }
  }, [getUniqueCoins]);

  /**
   * Get price for a specific coin
   */
  const getPrice = useCallback((coin: string): number => {
    const coinLower = coin.toLowerCase();

    // First check our state
    if (prices[coinLower]) {
      return prices[coinLower];
    }

    // Then check cache
    const cached = getCachedPrice(coin);
    if (cached) return cached;

    // Finally use fallback
    return getPriceWithFallback(coin);
  }, [prices]);

  /**
   * Calculate USD value
   */
  const calculateUsdValue = useCallback((coin: string, amount: number): number => {
    const price = getPrice(coin);
    return amount * price;
  }, [getPrice]);

  // Fetch prices on mount and when wallets change
  useEffect(() => {
    fetchPrices();

    // Set up refresh interval
    intervalRef.current = setInterval(fetchPrices, PRICE_REFRESH_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchPrices]);

  return {
    prices,
    isLoading,
    lastUpdated,
    fetchPrices,
    getPrice,
    calculateUsdValue,
  };
}
