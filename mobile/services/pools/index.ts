// Pool data fetching service
// Ported EXACTLY from extension/background/background.js to match parsing

import { POOLS, PoolStats, PoolWorker } from '@/constants/pools';
import { getCoinDivisor } from '@/constants/coins';

/**
 * Parse hashrate string like "100 GH/s" to number
 */
function parseHashrateString(str: string | number | undefined): number {
  if (!str) return 0;
  if (typeof str === 'number') return str;
  if (typeof str !== 'string') return 0;

  const match = str.match(/^([\d.]+)\s*(\w+)/);
  if (!match) return parseFloat(str) || 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = {
    'H': 1, 'KH': 1e3, 'MH': 1e6, 'GH': 1e9, 'TH': 1e12, 'PH': 1e15,
    'H/S': 1, 'KH/S': 1e3, 'MH/S': 1e6, 'GH/S': 1e9, 'TH/S': 1e12, 'PH/S': 1e15
  };
  return value * (multipliers[unit] || 1);
}

/**
 * Fetch pool data for a wallet
 */
export async function fetchPoolData(
  poolId: string,
  coin: string,
  address: string
): Promise<PoolStats> {
  const poolConfig = POOLS[poolId];
  if (!poolConfig) {
    throw new Error(`Unsupported pool: ${poolId}`);
  }

  const coinLower = coin.toLowerCase();

  // Verify coin is supported by this pool
  if (!poolConfig.coins.includes(coinLower)) {
    throw new Error(
      `${coin.toUpperCase()} is not supported by ${poolConfig.name}. Supported: ${poolConfig.coins.join(', ')}`
    );
  }

  const url = poolConfig.getStatsUrl(coinLower, address);
  console.log(`Fetching pool data: ${url}`);

  try {
    const response = await fetch(url, {
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(
          `Wallet not found on ${poolConfig.name}. Make sure this address is mining on this pool.`
        );
      }
      throw new Error(`Pool API returned ${response.status}`);
    }

    const data = await response.json();

    // Check for error responses
    if (data.error || data.status === 'error') {
      throw new Error(data.error || data.message || 'Pool returned error');
    }

    // Check for Nanopool error format
    if (data.status === false && data.error) {
      throw new Error(data.error);
    }

    // Parse using pool-specific parser
    const parser = POOL_PARSERS[poolId];
    if (!parser) {
      throw new Error(`No parser for pool: ${poolId}`);
    }

    const parsed = parser(data, coinLower);

    // Apply universal stale data detection (same as extension)
    const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
    let isStale = false;

    if (parsed.lastShare) {
      let lastShareTime: number;
      if (typeof parsed.lastShare === 'string') {
        lastShareTime = new Date(parsed.lastShare).getTime();
      } else if (parsed.lastShare > 1e12) {
        lastShareTime = parsed.lastShare;
      } else {
        lastShareTime = parsed.lastShare * 1000;
      }

      const timeSinceLastShare = Date.now() - lastShareTime;
      isStale = timeSinceLastShare > TWO_HOURS_MS;

      if (isStale) {
        console.log(`Stale data detected for ${poolId}: last share was ${Math.round(timeSinceLastShare / 60000)} minutes ago`);
        parsed.hashrate = 0;
        parsed.hashrate5m = 0;
        parsed.workersOnline = 0;
        if (parsed.workers && parsed.workers.length > 0) {
          parsed.workers = parsed.workers.map(w => ({ ...w, hashrate: 0, offline: true }));
        }
      }
    }

    return parsed;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to fetch pool data');
  }
}

// Pool-specific response parsers - EXACTLY matching extension/background/background.js
const POOL_PARSERS: Record<string, (data: any, coin: string) => PoolStats> = {
  '2miners': (data, coin) => {
    const divisor = getCoinDivisor(coin);
    const earnings24h = (data['24hreward'] || 0) / divisor;

    const workers: PoolWorker[] = [];
    if (data.workers && typeof data.workers === 'object') {
      for (const [name, w] of Object.entries(data.workers as Record<string, any>)) {
        workers.push({
          name,
          hashrate: w.hr || 0,
          hashrate24h: w.hr2 || 0,
          lastSeen: w.lastBeat,
          offline: (Date.now() / 1000 - (w.lastBeat || 0)) > 600,
        });
      }
    }

    const workersOnline = data.workersOnline || 0;
    const workersOffline = data.workersOffline || 0;
    const totalWorkers = workersOnline + workersOffline;

    // If no workers parsed but we have counts, create placeholder workers
    if (workers.length === 0 && totalWorkers > 0) {
      for (let i = 0; i < workersOffline; i++) {
        workers.push({ name: `Worker ${i + 1}`, hashrate: 0, offline: true });
      }
      for (let i = 0; i < workersOnline; i++) {
        workers.push({ name: `Worker ${workersOffline + i + 1}`, hashrate: 0, offline: false });
      }
    }

    return {
      hashrate: data.currentHashrate || 0,
      hashrate24h: data.hashrate || 0,
      workers,
      workersOnline,
      workersTotal: totalWorkers,
      balance: (data.stats?.balance || 0) / divisor,
      paid: (data.stats?.paid || 0) / divisor,
      earnings24h,
      lastShare: data.stats?.lastShare,
    };
  },

  'nanopool': (data, coin) => {
    const workers: PoolWorker[] = (data.data?.workers || []).map((w: any) => ({
      name: w.id || 'Worker',
      hashrate: w.hashrate || 0,
      lastSeen: w.lastshare,
      offline: (Date.now() / 1000 - (w.lastshare || 0)) > 600,
    }));

    return {
      hashrate: data.data?.hashrate || 0,
      hashrate24h: data.data?.avgHashrate?.h24 || 0,
      workers,
      workersOnline: workers.filter(w => !w.offline).length,
      workersTotal: workers.length,
      balance: data.data?.balance || 0,
      paid: 0,
      earnings24h: data.data?.estimatedRoundEarnings || 0,
      lastShare: data.data?.workers?.[0]?.lastshare,
    };
  },

  'f2pool': (data, coin) => {
    const workers: PoolWorker[] = (data.workers || []).map((w: any) => ({
      name: w.worker_name || 'Worker',
      hashrate: w.hashrate || 0,
      lastSeen: w.last_share_time,
      offline: (Date.now() / 1000 - (w.last_share_time || 0)) > 600,
    }));

    return {
      hashrate: data.hashrate || 0,
      hashrate24h: data.hashrate_24h || 0,
      workers,
      workersOnline: workers.filter(w => !w.offline).length,
      workersTotal: workers.length,
      balance: data.balance || 0,
      paid: data.paid || 0,
      earnings24h: data.value_last_day || 0,
      lastShare: data.last_share_time,
    };
  },

  'ethermine': (data, coin) => {
    const divisor = getCoinDivisor(coin);
    return {
      hashrate: data.data?.currentHashrate || 0,
      hashrate24h: data.data?.averageHashrate || 0,
      workers: [],
      workersOnline: data.data?.activeWorkers || 0,
      workersTotal: data.data?.activeWorkers || 0,
      balance: (data.data?.unpaid || 0) / divisor,
      paid: 0,
      earnings24h: (data.data?.coinsPerMin || 0) * 60 * 24,
      lastShare: data.data?.lastSeen,
    };
  },

  'hiveon': (data, coin) => ({
    hashrate: data.hashrate || 0,
    hashrate24h: data.hashrate24h || 0,
    workers: [],
    workersOnline: 0,
    workersTotal: 0,
    balance: data.balance || 0,
    paid: data.paid || 0,
    earnings24h: data.expectedReward24H || 0,
    lastShare: null,
  }),

  'herominers': (data, coin) => {
    const divisor = getCoinDivisor(coin);
    const workers: PoolWorker[] = (data.workers || []).map((w: any) => ({
      name: w.name || 'Worker',
      hashrate: w.hashrate || 0,
      lastSeen: w.lastShare,
      offline: (Date.now() / 1000 - (w.lastShare || 0)) > 600,
    }));

    return {
      hashrate: data.stats?.hashrate || 0,
      hashrate24h: data.stats?.hashrate || 0,
      workers,
      workersOnline: workers.filter(w => !w.offline).length,
      workersTotal: workers.length,
      balance: (data.stats?.balance || 0) / divisor,
      paid: (data.stats?.paid || 0) / divisor,
      earnings24h: (data.stats?.hashes || 0) / divisor,
      lastShare: data.stats?.lastShare,
    };
  },

  'woolypooly': (data, coin) => {
    const workers: PoolWorker[] = (data.workers || []).map((w: any) => ({
      name: w.worker || 'Worker',
      hashrate: w.hashrate || 0,
      lastSeen: w.lastshare,
      offline: (Date.now() / 1000 - (w.lastshare || 0)) > 600,
    }));

    return {
      hashrate: data.perfomance?.currentHashrate || 0,
      hashrate24h: data.perfomance?.averageHashrate || 0,
      workers,
      workersOnline: workers.filter(w => !w.offline).length,
      workersTotal: workers.length,
      balance: data.stats?.balance || 0,
      paid: data.stats?.paid || 0,
      earnings24h: data.rewards?.day || 0,
      lastShare: data.stats?.lastShare,
    };
  },

  'cedriccrispin': (data, coin) => {
    // API returns { sStatus: "OK", mResponse: { ... } }
    const miner = data.mResponse || data;

    // Get hashrate from the latest performance sample's workers
    let currentHashrate = 0;
    const workers: PoolWorker[] = [];
    let isStale = true; // Assume stale until proven otherwise
    let latestSample: any = null;

    if (miner.performanceSamples && miner.performanceSamples.length > 0) {
      // Get the most recent sample
      latestSample = miner.performanceSamples[miner.performanceSamples.length - 1];

      // Check if sample is recent (within last 2 hours)
      if (latestSample.created) {
        const sampleTime = new Date(latestSample.created).getTime();
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        isStale = sampleTime < twoHoursAgo;
      }

      // Only use hashrate if sample is recent
      if (!isStale && latestSample.workers && typeof latestSample.workers === 'object') {
        for (const [name, workerData] of Object.entries(latestSample.workers as Record<string, any>)) {
          const hr = workerData.hashrate || 0;
          currentHashrate += hr;
          workers.push({
            name: name,
            hashrate: hr,
            sharesPerSecond: workerData.sharesPerSecond || 0,
            offline: hr === 0,
          });
        }
      } else if (isStale && latestSample.workers) {
        // Sample is stale - show workers as offline with 0 hashrate
        for (const [name] of Object.entries(latestSample.workers as Record<string, any>)) {
          workers.push({
            name: name,
            hashrate: 0,
            sharesPerSecond: 0,
            offline: true,
          });
        }
      }
    }

    const onlineWorkers = workers.filter(w => !w.offline).length;

    return {
      hashrate: currentHashrate,
      hashrate24h: currentHashrate,
      workers: workers,
      workersOnline: onlineWorkers,
      workersTotal: workers.length || 1,
      balance: miner.pendingBalance || 0,
      paid: miner.totalPaid || 0,
      earnings24h: miner.todayPaid || 0,
      pendingShares: miner.pendingShares || 0,
      minerEffort: miner.minerEffort || 0,
      lastShare: latestSample?.created || null,
    };
  },

  'ckpool': (data, coin) => {
    const workers: PoolWorker[] = [];
    if (data.worker && Array.isArray(data.worker)) {
      for (const w of data.worker) {
        const lastShare = w.lastshare || 0;
        workers.push({
          name: w.workername || 'Worker',
          hashrate: parseHashrateString(w.hashrate1hr),
          hashrate5m: parseHashrateString(w.hashrate5m),
          shares: w.shares || 0,
          bestShare: w.bestshare || 0,
          lastSeen: lastShare,
          offline: (Date.now() / 1000 - lastShare) > 600,
        });
      }
    }

    const onlineWorkers = workers.filter(w => !w.offline).length;

    return {
      hashrate: parseHashrateString(data.hashrate1hr),
      hashrate5m: parseHashrateString(data.hashrate5m),
      hashrate24h: parseHashrateString(data.hashrate1d),
      workers,
      workersOnline: onlineWorkers,
      workersTotal: data.workers || workers.length,
      balance: 0,
      paid: 0,
      earnings24h: 0,
      shares: data.shares || 0,
      bestShare: data.bestshare || 0,
      bestEver: data.bestever || 0,
      lastShare: data.lastshare,
    };
  },

  'ckpool-eu': (data, coin) => {
    // Same as ckpool
    const workers: PoolWorker[] = [];
    if (data.worker && Array.isArray(data.worker)) {
      for (const w of data.worker) {
        const lastShare = w.lastshare || 0;
        workers.push({
          name: w.workername || 'Worker',
          hashrate: parseHashrateString(w.hashrate1hr),
          hashrate5m: parseHashrateString(w.hashrate5m),
          shares: w.shares || 0,
          bestShare: w.bestshare || 0,
          lastSeen: lastShare,
          offline: (Date.now() / 1000 - lastShare) > 600,
        });
      }
    }

    const onlineWorkers = workers.filter(w => !w.offline).length;

    return {
      hashrate: parseHashrateString(data.hashrate1hr),
      hashrate5m: parseHashrateString(data.hashrate5m),
      hashrate24h: parseHashrateString(data.hashrate1d),
      workers,
      workersOnline: onlineWorkers,
      workersTotal: data.workers || workers.length,
      balance: 0,
      paid: 0,
      earnings24h: 0,
      shares: data.shares || 0,
      bestShare: data.bestshare || 0,
      bestEver: data.bestever || 0,
      lastShare: data.lastshare,
    };
  },

  'publicpool': (data, coin) => {
    // Handle both string and number hashrates
    const hashrate = parseHashrateString(data.hashRate);

    // Parse workers if available
    const workers: PoolWorker[] = [];
    if (data.workers && Array.isArray(data.workers)) {
      for (const w of data.workers) {
        workers.push({
          name: w.name || w.sessionId || 'Worker',
          hashrate: parseHashrateString(w.hashRate),
          lastSeen: w.lastShare,
          offline: false, // If in workers array, assume online
        });
      }
    }

    // If no workers but we have a hashrate, create a placeholder worker
    if (workers.length === 0 && hashrate > 0) {
      workers.push({
        name: 'Worker',
        hashrate: hashrate,
        offline: false,
      });
    }

    // If no hashrate and no workers, show 1 offline worker
    if (workers.length === 0 && hashrate === 0) {
      workers.push({
        name: 'Worker',
        hashrate: 0,
        offline: true,
      });
    }

    const onlineWorkers = workers.filter(w => !w.offline).length;

    return {
      hashrate: hashrate,
      hashrate5m: hashrate,
      hashrate24h: hashrate,
      workers: workers,
      workersOnline: onlineWorkers,
      workersTotal: data.workerCount || workers.length || 1,
      balance: 0,
      paid: 0,
      earnings24h: 0,
      bestShare: data.bestDifficulty || 0,
      shares: data.shares || 0,
      lastShare: data.lastShare,
    };
  },

  'ocean': (data, coin) => {
    // OCEAN wraps response in "result" object
    const stats = data.result || data;

    // All values are STRINGS - must parse to numbers
    const hashrate = parseFloat(stats.hashrate_300s) || parseFloat(stats.hashrate_60s) || 0;

    // If hashrate > 0, assume 1 online worker
    const hasActivity = hashrate > 0;

    // unpaid is already in BTC as string like "0.00000000"
    const unpaidBtc = parseFloat(stats.unpaid) || 0;

    return {
      hashrate: hashrate,
      hashrate5m: parseFloat(stats.hashrate_300s) || hashrate,
      hashrate24h: hashrate,
      workers: [],
      workersOnline: hasActivity ? 1 : 0,
      workersTotal: 1,
      balance: unpaidBtc,
      paid: 0,
      earnings24h: parseFloat(stats.estimated_earn_next_block) || 0,
      shares: parseInt(stats.shares_300s) || 0,
      lastShare: stats.lastest_share_ts ? parseInt(stats.lastest_share_ts) : null,
    };
  },
};

export { POOL_PARSERS };
