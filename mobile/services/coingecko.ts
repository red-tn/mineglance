// CoinGecko price fetching service with caching

import { COINS, getCoinGeckoId } from '@/constants/coins';

interface PriceCache {
  [geckoId: string]: {
    usd: number;
    usd_24h_change?: number;
    lastUpdated: number;
  };
}

// Cache prices for 5 minutes
const CACHE_DURATION = 5 * 60 * 1000;
let priceCache: PriceCache = {};

/**
 * Fetch price for a single coin
 */
export async function fetchCoinPrice(coin: string): Promise<number | null> {
  const geckoId = getCoinGeckoId(coin);
  if (!geckoId) return null;

  // Check cache
  const cached = priceCache[geckoId];
  if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
    return cached.usd;
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd&include_24hr_change=true`
    );

    if (!response.ok) {
      // Return cached price if available, even if stale
      return cached?.usd || null;
    }

    const data = await response.json();

    if (data[geckoId]?.usd) {
      priceCache[geckoId] = {
        usd: data[geckoId].usd,
        usd_24h_change: data[geckoId].usd_24h_change,
        lastUpdated: Date.now(),
      };
      return data[geckoId].usd;
    }

    return cached?.usd || null;
  } catch {
    return cached?.usd || null;
  }
}

/**
 * Fetch prices for multiple coins at once (more efficient)
 */
export async function fetchCoinPrices(
  coins: string[]
): Promise<Record<string, number>> {
  // Get gecko IDs for all coins
  const geckoIds = coins
    .map(coin => getCoinGeckoId(coin))
    .filter((id): id is string => id !== null);

  if (geckoIds.length === 0) return {};

  // Check which ones we need to fetch (not in cache or expired)
  const needFetch: string[] = [];
  const result: Record<string, number> = {};

  for (const coin of coins) {
    const geckoId = getCoinGeckoId(coin);
    if (!geckoId) continue;

    const cached = priceCache[geckoId];
    if (cached && Date.now() - cached.lastUpdated < CACHE_DURATION) {
      result[coin.toLowerCase()] = cached.usd;
    } else {
      needFetch.push(geckoId);
    }
  }

  // Fetch missing prices
  if (needFetch.length > 0) {
    try {
      const response = await fetch(
        `https://api.coingecko.com/api/v3/simple/price?ids=${needFetch.join(',')}&vs_currencies=usd&include_24hr_change=true`
      );

      if (response.ok) {
        const data = await response.json();

        for (const geckoId of needFetch) {
          if (data[geckoId]?.usd) {
            priceCache[geckoId] = {
              usd: data[geckoId].usd,
              usd_24h_change: data[geckoId].usd_24h_change,
              lastUpdated: Date.now(),
            };

            // Find the coin that matches this geckoId
            const coin = coins.find(c => getCoinGeckoId(c) === geckoId);
            if (coin) {
              result[coin.toLowerCase()] = data[geckoId].usd;
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to fetch prices:', error);
    }
  }

  // Fill in any missing with cached values
  for (const coin of coins) {
    const coinLower = coin.toLowerCase();
    if (!result[coinLower]) {
      const geckoId = getCoinGeckoId(coin);
      if (geckoId && priceCache[geckoId]) {
        result[coinLower] = priceCache[geckoId].usd;
      }
    }
  }

  return result;
}

/**
 * Get cached price (doesn't fetch)
 */
export function getCachedPrice(coin: string): number | null {
  const geckoId = getCoinGeckoId(coin);
  if (!geckoId) return null;
  return priceCache[geckoId]?.usd || null;
}

/**
 * Get all cached prices
 */
export function getAllCachedPrices(): Record<string, number> {
  const result: Record<string, number> = {};

  for (const [coinId, config] of Object.entries(COINS)) {
    const cached = priceCache[config.geckoId];
    if (cached) {
      result[coinId] = cached.usd;
    }
  }

  return result;
}

/**
 * Clear price cache
 */
export function clearPriceCache(): void {
  priceCache = {};
}

/**
 * Fallback prices for when API is unavailable
 */
export const FALLBACK_PRICES: Record<string, number> = {
  'bitcoin': 45000,
  'ethereum-classic': 25,
  'ravencoin': 0.025,
  'ergo': 1.5,
  'zelcash': 0.5,
  'kaspa': 0.15,
  'monero': 170,
  'zcash': 30,
  'litecoin': 80,
  'dash': 30,
  'conflux-token': 0.15,
  'nervos-network': 0.005,
  'beam': 0.05,
  'zcoin': 2,
  'raptoreum': 0.002,
  'neurai': 0.0001,
  'bitcoin-gold': 15,
  'alephium': 1.5,
  'nexa': 0.00005,
  'mimblewimblecoin': 5,
  'zilliqa': 0.02,
  'cortex': 0.1,
};

/**
 * Get price with fallback
 */
export function getPriceWithFallback(coin: string): number {
  const geckoId = getCoinGeckoId(coin);
  if (!geckoId) return 0;

  const cached = priceCache[geckoId];
  if (cached) return cached.usd;

  return FALLBACK_PRICES[geckoId] || 0;
}
