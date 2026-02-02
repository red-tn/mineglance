// Pool configurations - ported from extension/background/background.js
// Each pool has its name, supported coins, API URL generator, and response parser

import { getCoinDivisor } from './coins';

export interface PoolWorker {
  name: string;
  hashrate: number;
  hashrate24h?: number;
  hashrate5m?: number;
  lastSeen?: number;
  offline: boolean;
  shares?: number;
  bestShare?: number;
  sharesPerSecond?: number;
}

export interface PoolStats {
  hashrate: number;
  hashrate5m?: number;
  hashrate24h: number;
  workers: PoolWorker[];
  workersOnline: number;
  workersTotal: number;
  balance: number;
  paid: number;
  earnings24h: number;
  shares?: number;
  bestShare?: number;
  bestEver?: number;
  pendingShares?: number;
  minerEffort?: number;
  lastShare?: number | null;
}

export interface PoolConfig {
  name: string;
  coins: string[];
  getStatsUrl: (coin: string, address: string) => string;
  getPoolUrl?: (coin: string, address: string) => string;
}

// Pool configurations (without parsers - those will be in services/pools/)
export const POOLS: Record<string, PoolConfig> = {
  '2miners': {
    name: '2Miners',
    coins: ['etc', 'rvn', 'ergo', 'flux', 'kas', 'btg', 'ckb', 'ctxc', 'beam', 'firo', 'mwc', 'nexa', 'xna', 'zil'],
    getStatsUrl: (coin, address) => `https://${coin}.2miners.com/api/accounts/${address}`,
    getPoolUrl: (coin, address) => `https://${coin}.2miners.com/account/${address}`,
  },
  'nanopool': {
    name: 'Nanopool',
    coins: ['etc', 'zec', 'xmr', 'ergo', 'rvn', 'cfx'],
    getStatsUrl: (coin, address) => `https://api.nanopool.org/v1/${coin}/user/${address}`,
    getPoolUrl: (coin, address) => `https://${coin}.nanopool.org/account/${address}`,
  },
  'f2pool': {
    name: 'F2Pool',
    coins: ['btc', 'etc', 'ltc', 'dash', 'zec', 'xmr', 'rvn', 'ckb'],
    getStatsUrl: (coin, address) => `https://api.f2pool.com/${coin}/${address}`,
    getPoolUrl: (coin, address) => `https://www.f2pool.com/${coin}/${address}`,
  },
  'ethermine': {
    name: 'Ethermine',
    coins: ['etc'],
    getStatsUrl: (coin, address) => `https://api.ethermine.org/miner/${address}/currentStats`,
    getPoolUrl: (coin, address) => `https://ethermine.org/miners/${address}/dashboard`,
  },
  'hiveon': {
    name: 'Hiveon Pool',
    coins: ['etc', 'rvn'],
    // Stats endpoint returns hashrate; billing-acc endpoint returns balance but no hashrate
    getStatsUrl: (coin, address) => `https://hiveon.net/api/v1/stats/miner/${address}/${coin.toUpperCase()}`,
    getPoolUrl: (coin, address) => `https://hiveon.net/pool/${coin.toUpperCase()}/${address}`,
  },
  'herominers': {
    name: 'HeroMiners',
    coins: ['rvn', 'ergo', 'flux', 'kas', 'nexa', 'alph', 'xmr', 'rtm', 'xna'],
    getStatsUrl: (coin, address) => {
      // HeroMiners uses 'neurai' subdomain for XNA
      const subdomain = coin === 'xna' ? 'neurai' : coin;
      return `https://${subdomain}.herominers.com/api/stats_address?address=${address}`;
    },
    getPoolUrl: (coin, address) => {
      const subdomain = coin === 'xna' ? 'neurai' : coin;
      return `https://${subdomain}.herominers.com/#/dashboard?addr=${address}`;
    },
  },
  'woolypooly': {
    name: 'WoolyPooly',
    coins: ['rvn', 'ergo', 'flux', 'kas', 'etc', 'cfx', 'nexa', 'alph', 'xna'],
    getStatsUrl: (coin, address) => `https://api.woolypooly.com/api/${coin}-1/accounts/${address}`,
    getPoolUrl: (coin, address) => `https://woolypooly.com/en/coin/${coin}/wallet/${address}`,
  },
  'cedriccrispin': {
    name: 'Cedric Crispin Pool',
    coins: ['firo'],
    getStatsUrl: (coin, address) => `https://firo.cedric-crispin.com/api/pool/miner/${address}/`,
    getPoolUrl: (coin, address) => `https://firo.cedric-crispin.com/`,
  },
  'ckpool': {
    name: 'CKPool Solo',
    coins: ['btc'],
    getStatsUrl: (coin, address) => `https://solo.ckpool.org/users/${address}`,
    getPoolUrl: (coin, address) => `https://solostats.ckpool.org/users/${address}`,
  },
  'ckpool-eu': {
    name: 'CKPool Solo EU',
    coins: ['btc'],
    getStatsUrl: (coin, address) => `https://eusolo.ckpool.org/users/${address}`,
    getPoolUrl: (coin, address) => `https://eusolo.ckpool.org/users/${address}`,
  },
  'publicpool': {
    name: 'Public Pool',
    coins: ['btc'],
    getStatsUrl: (coin, address) => `https://public-pool.io:40557/api/client/${address}`,
    getPoolUrl: (coin, address) => `https://web.public-pool.io/#/app/${address}`,
  },
  'ocean': {
    name: 'OCEAN',
    coins: ['btc'],
    getStatsUrl: (coin, address) => `https://api.ocean.xyz/v1/statsnap/${address}`,
    getPoolUrl: (coin, address) => `https://ocean.xyz/stats/${address}`,
  },
};

// Get pool display name
export function getPoolName(poolId: string): string {
  return POOLS[poolId]?.name || poolId;
}

// Get all supported pool IDs
export function getSupportedPools(): string[] {
  return Object.keys(POOLS);
}

// Get pools that support a specific coin
export function getPoolsForCoin(coin: string): string[] {
  const coinLower = coin.toLowerCase();
  return Object.entries(POOLS)
    .filter(([, config]) => config.coins.includes(coinLower))
    .map(([id]) => id);
}

// Get coins supported by a pool
export function getCoinsForPool(poolId: string): string[] {
  return POOLS[poolId]?.coins || [];
}

// Check if a pool supports a coin
export function poolSupportsCoin(poolId: string, coin: string): boolean {
  const pool = POOLS[poolId];
  return pool?.coins.includes(coin.toLowerCase()) || false;
}

// Get pool URL for viewing on web
export function getPoolWebUrl(poolId: string, coin: string, address: string): string | null {
  const pool = POOLS[poolId];
  if (!pool?.getPoolUrl) return null;
  return pool.getPoolUrl(coin.toLowerCase(), address);
}
