// MineGlance Background Service Worker

const API_BASE = 'https://mineglance.com/api';

// Send email alert for Pro users
async function sendEmailAlert(alertType, walletName, message) {
  const { settings, licenseKey, isPaid } = await chrome.storage.local.get([
    'settings', 'licenseKey', 'isPaid'
  ]);

  // Only send if email alerts are enabled and user is Pro
  if (!isPaid || !settings?.notifications?.emailEnabled) {
    return;
  }

  const email = settings.notifications.alertEmail;

  try {
    await fetch(`${API_BASE}/send-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey,
        alertType,
        walletName,
        message,
        email
      })
    });
  } catch (e) {
    console.error('Failed to send email alert:', e);
  }
}

// Generate unique install ID
function generateInstallId() {
  return 'mg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// Track extension install/usage
async function trackInstall() {
  const { installId } = await chrome.storage.local.get(['installId']);

  let id = installId;
  if (!id) {
    id = generateInstallId();
    await chrome.storage.local.set({ installId: id });
  }

  try {
    await fetch(`${API_BASE}/track-install`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        installId: id,
        browser: 'chrome',
        version: chrome.runtime.getManifest().version
      })
    });
  } catch (e) {
    // Silent fail - tracking is non-critical
  }
}

// Check Pro status from server using license key
async function checkLicenseStatus(licenseKey, installId) {
  if (!licenseKey || !installId) return { isPro: false };

  try {
    const response = await fetch(
      `${API_BASE}/activate-license?key=${encodeURIComponent(licenseKey)}&installId=${encodeURIComponent(installId)}`
    );
    const data = await response.json();
    return data;
  } catch {
    return { isPro: false };
  }
}

// Activate license on this device
async function activateLicense(licenseKey, installId) {
  if (!licenseKey || !installId) {
    return { success: false, error: 'License key required' };
  }

  try {
    const response = await fetch(`${API_BASE}/activate-license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: licenseKey.toUpperCase().trim(),
        installId,
        deviceName: 'Chrome Extension'
      })
    });
    return await response.json();
  } catch {
    return { success: false, error: 'Connection failed. Please try again.' };
  }
}

// Initialize default storage on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['wallets'], (result) => {
    if (!result.wallets) {
      chrome.storage.local.set({
        wallets: [],
        electricity: { rate: 0.12, currency: 'USD' },
        rigs: [],
        settings: {
          refreshInterval: 5,
          notifications: {
            workerOffline: true,
            profitDrop: true,
            profitDropThreshold: 20,
            betterCoin: true
          },
          currency: 'USD'
        },
        isPaid: false,
        proEmail: null
      });
    }
  });

  // Track this install
  trackInstall();
});

// Also track on startup (for returning users)
chrome.runtime.onStartup.addListener(() => {
  trackInstall();
});

// Coin configurations with CoinGecko IDs and decimal places
// MUST be defined before POOLS since POOLS references getCoinDivisor
const COINS = {
  'eth': { name: 'Ethereum', symbol: 'ETH', geckoId: 'ethereum', decimals: 18 },
  'etc': { name: 'Ethereum Classic', symbol: 'ETC', geckoId: 'ethereum-classic', decimals: 18 },
  'rvn': { name: 'Ravencoin', symbol: 'RVN', geckoId: 'ravencoin', decimals: 8 },
  'ergo': { name: 'Ergo', symbol: 'ERG', geckoId: 'ergo', decimals: 9 },
  'flux': { name: 'Flux', symbol: 'FLUX', geckoId: 'zelcash', decimals: 8 },
  'kas': { name: 'Kaspa', symbol: 'KAS', geckoId: 'kaspa', decimals: 8 },
  'nexa': { name: 'Nexa', symbol: 'NEXA', geckoId: 'nexa', decimals: 2 },
  'alph': { name: 'Alephium', symbol: 'ALPH', geckoId: 'alephium', decimals: 18 },
  'xmr': { name: 'Monero', symbol: 'XMR', geckoId: 'monero', decimals: 12 },
  'zec': { name: 'Zcash', symbol: 'ZEC', geckoId: 'zcash', decimals: 8 },
  'btc': { name: 'Bitcoin', symbol: 'BTC', geckoId: 'bitcoin', decimals: 8 },
  'ltc': { name: 'Litecoin', symbol: 'LTC', geckoId: 'litecoin', decimals: 8 },
  'dash': { name: 'Dash', symbol: 'DASH', geckoId: 'dash', decimals: 8 },
  'cfx': { name: 'Conflux', symbol: 'CFX', geckoId: 'conflux-token', decimals: 18 },
  'ckb': { name: 'Nervos', symbol: 'CKB', geckoId: 'nervos-network', decimals: 8 },
  'beam': { name: 'Beam', symbol: 'BEAM', geckoId: 'beam', decimals: 8 },
  'firo': { name: 'Firo', symbol: 'FIRO', geckoId: 'firo', decimals: 8 },
  'rtm': { name: 'Raptoreum', symbol: 'RTM', geckoId: 'raptoreum', decimals: 8 },
  'xna': { name: 'Neurai', symbol: 'XNA', geckoId: 'neurai', decimals: 8 },
  'btg': { name: 'Bitcoin Gold', symbol: 'BTG', geckoId: 'bitcoin-gold', decimals: 8 },
  'mwc': { name: 'MimbleWimbleCoin', symbol: 'MWC', geckoId: 'mimblewimblecoin', decimals: 9 },
  'zil': { name: 'Zilliqa', symbol: 'ZIL', geckoId: 'zilliqa', decimals: 12 },
  'ctxc': { name: 'Cortex', symbol: 'CTXC', geckoId: 'cortex', decimals: 18 }
};

// Helper to get divisor for coin decimals
function getCoinDivisor(coin) {
  const coinConfig = COINS[coin.toLowerCase()];
  return Math.pow(10, coinConfig?.decimals || 8);
}

// Supported pools and their API configurations
// Note: parseResponse receives (data, coin) so it can use correct decimals
const POOLS = {
  '2miners': {
    name: '2Miners',
    coins: ['eth', 'etc', 'rvn', 'ergo', 'flux', 'kas', 'btg', 'ckb', 'ctxc', 'beam', 'firo', 'mwc', 'nexa', 'xna', 'zil'],
    getStatsUrl: (coin, address) => `https://${coin}.2miners.com/api/accounts/${address}`,
    parseResponse: (data, coin) => {
      const divisor = getCoinDivisor(coin);

      // 2Miners API returns 24hreward field directly (in smallest units)
      // 915750000 / 10^8 = 9.1575 RVN
      const earnings24h = (data['24hreward'] || 0) / divisor;

      // Parse workers - 2Miners returns object with worker names as keys
      const workers = [];
      if (data.workers && typeof data.workers === 'object') {
        for (const [name, w] of Object.entries(data.workers)) {
          workers.push({
            name: name,
            hashrate: w.hr || 0,
            hashrate24h: w.hr2 || 0,
            lastSeen: w.lastBeat,
            offline: (Date.now() / 1000 - (w.lastBeat || 0)) > 600
          });
        }
      }

      // workersOffline and workersOnline give us counts even when workers object is empty
      const workersOnline = data.workersOnline || 0;
      const workersOffline = data.workersOffline || 0;
      const totalWorkers = workersOnline + workersOffline;

      // If no worker details but we have counts, create placeholder entries
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
        workers: workers,
        workersOnline: workersOnline,
        workersTotal: totalWorkers,
        balance: (data.stats?.balance || 0) / divisor,
        paid: (data.stats?.paid || 0) / divisor,
        earnings24h: earnings24h,
        lastShare: data.stats?.lastShare
      };
    }
  },
  'nanopool': {
    name: 'Nanopool',
    coins: ['eth', 'etc', 'zec', 'xmr', 'ergo', 'rvn', 'cfx'],
    getStatsUrl: (coin, address) => `https://api.nanopool.org/v1/${coin}/user/${address}`,
    parseResponse: (data, coin) => ({
      // Nanopool returns balance already in coin units (not smallest unit)
      hashrate: data.data?.hashrate || 0,
      hashrate24h: data.data?.avgHashrate?.h24 || 0,
      workers: (data.data?.workers || []).map(w => ({
        name: w.id || 'Worker',
        hashrate: w.hashrate || 0,
        lastSeen: w.lastshare,
        offline: (Date.now() / 1000 - (w.lastshare || 0)) > 600
      })),
      balance: data.data?.balance || 0,
      paid: 0,
      earnings24h: data.data?.estimatedRoundEarnings || 0,
      lastShare: data.data?.workers?.[0]?.lastshare
    })
  },
  'f2pool': {
    name: 'F2Pool',
    coins: ['btc', 'eth', 'etc', 'ltc', 'dash', 'zec', 'xmr', 'rvn', 'ckb'],
    getStatsUrl: (coin, address) => `https://api.f2pool.com/${coin}/${address}`,
    parseResponse: (data, coin) => ({
      // F2Pool returns values already in coin units
      hashrate: data.hashrate || 0,
      hashrate24h: data.hashrate_24h || 0,
      workers: (data.workers || []).map(w => ({
        name: w.worker_name || 'Worker',
        hashrate: w.hashrate || 0,
        lastSeen: w.last_share_time,
        offline: (Date.now() / 1000 - (w.last_share_time || 0)) > 600
      })),
      balance: data.balance || 0,
      paid: data.paid || 0,
      earnings24h: data.value_last_day || 0,
      lastShare: data.last_share_time
    })
  },
  'flexpool': {
    name: 'Flexpool',
    coins: ['eth', 'etc'],
    getStatsUrl: (coin, address) => `https://api.flexpool.io/v2/miner/stats?coin=${coin.toUpperCase()}&address=${address}`,
    parseResponse: (data, coin) => {
      const divisor = getCoinDivisor(coin);
      return {
        hashrate: data.result?.currentEffectiveHashrate || 0,
        hashrate24h: data.result?.averageEffectiveHashrate || 0,
        workers: [],
        balance: (data.result?.balance || 0) / divisor,
        paid: 0,
        earnings24h: (data.result?.averageEarnings || 0) / divisor,
        lastShare: data.result?.lastSeen
      };
    }
  },
  'ethermine': {
    name: 'Ethermine',
    coins: ['eth', 'etc'],
    getStatsUrl: (coin, address) => `https://api.ethermine.org/miner/${address}/currentStats`,
    parseResponse: (data, coin) => {
      const divisor = getCoinDivisor(coin);
      return {
        hashrate: data.data?.currentHashrate || 0,
        hashrate24h: data.data?.averageHashrate || 0,
        workers: [],
        balance: (data.data?.unpaid || 0) / divisor,
        paid: 0,
        earnings24h: (data.data?.coinsPerMin || 0) * 60 * 24,
        lastShare: data.data?.lastSeen
      };
    }
  },
  'hiveon': {
    name: 'Hiveon Pool',
    coins: ['eth', 'etc', 'rvn'],
    getStatsUrl: (coin, address) => `https://hiveon.net/api/v1/stats/miner/${address}/${coin.toUpperCase()}/billing-acc`,
    parseResponse: (data, coin) => ({
      // Hiveon returns values in coin units
      hashrate: data.hashrate || 0,
      hashrate24h: data.hashrate24h || 0,
      workers: [],
      balance: data.balance || 0,
      paid: data.paid || 0,
      earnings24h: data.expectedReward24H || 0,
      lastShare: null
    })
  },
  'herominers': {
    name: 'HeroMiners',
    coins: ['rvn', 'ergo', 'flux', 'kas', 'nexa', 'alph', 'xmr', 'rtm'],
    getStatsUrl: (coin, address) => `https://${coin}.herominers.com/api/stats_address?address=${address}`,
    parseResponse: (data, coin) => {
      const divisor = getCoinDivisor(coin);
      return {
        hashrate: data.stats?.hashrate || 0,
        hashrate24h: data.stats?.hashrate || 0,
        workers: (data.workers || []).map(w => ({
          name: w.name || 'Worker',
          hashrate: w.hashrate || 0,
          lastSeen: w.lastShare,
          offline: (Date.now() / 1000 - (w.lastShare || 0)) > 600
        })),
        balance: (data.stats?.balance || 0) / divisor,
        paid: (data.stats?.paid || 0) / divisor,
        earnings24h: (data.stats?.hashes || 0) / divisor, // Approximate from shares
        lastShare: data.stats?.lastShare
      };
    }
  },
  'woolypooly': {
    name: 'WoolyPooly',
    coins: ['rvn', 'ergo', 'flux', 'kas', 'etc', 'cfx', 'nexa', 'alph'],
    getStatsUrl: (coin, address) => `https://api.woolypooly.com/api/${coin}-1/accounts/${address}`,
    parseResponse: (data, coin) => ({
      // WoolyPooly returns values in coin units
      hashrate: data.perfomance?.currentHashrate || 0,
      hashrate24h: data.perfomance?.averageHashrate || 0,
      workers: (data.workers || []).map(w => ({
        name: w.worker || 'Worker',
        hashrate: w.hashrate || 0,
        lastSeen: w.lastshare,
        offline: (Date.now() / 1000 - (w.lastshare || 0)) > 600
      })),
      balance: data.stats?.balance || 0,
      paid: data.stats?.paid || 0,
      earnings24h: data.rewards?.day || 0,
      lastShare: data.stats?.lastShare
    })
  },
  'cedriccrispin': {
    name: 'Cedric Crispin Pool',
    coins: ['firo'],
    getStatsUrl: (coin, address) => `https://firo.cedric-crispin.com/api/pool/miner/${address}/`,
    parseResponse: (data, coin) => {
      const divisor = getCoinDivisor(coin);
      return {
        hashrate: data.currentHashrate || 0,
        hashrate24h: data.hashrate || 0,
        workers: (data.workers || []).map(w => ({
          name: w.name || 'Worker',
          hashrate: w.hashrate || 0,
          lastSeen: w.lastShare,
          offline: (Date.now() / 1000 - (w.lastShare || 0)) > 600
        })),
        workersOnline: data.workersOnline || 0,
        workersTotal: (data.workersOnline || 0) + (data.workersOffline || 0),
        balance: (data.balance || 0) / divisor,
        paid: (data.paid || 0) / divisor,
        earnings24h: (data.earnings24h || 0) / divisor,
        lastShare: data.lastShare
      };
    }
  }
};

// Fetch pool data for a wallet
async function fetchPoolData(pool, coin, address) {
  const poolConfig = POOLS[pool];
  if (!poolConfig) {
    throw new Error(`Unsupported pool: ${pool}`);
  }

  // Normalize coin name
  const coinLower = coin.toLowerCase();

  const url = poolConfig.getStatsUrl(coinLower, address);

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Pool API returned ${response.status}`);
    }

    const data = await response.json();

    // Check for error responses
    if (data.error || data.status === 'error') {
      throw new Error(data.error || data.message || 'Pool returned error');
    }

    return poolConfig.parseResponse(data, coinLower);
  } catch (error) {
    console.error(`Error fetching pool data:`, error);
    throw error;
  }
}

// Fetch current coin price from CoinGecko
async function fetchCoinPrice(coinSymbol) {
  const coinLower = coinSymbol.toLowerCase();
  const coinConfig = COINS[coinLower];

  if (!coinConfig?.geckoId) {
    console.warn(`No CoinGecko ID for coin: ${coinSymbol}`);
    return null;
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinConfig.geckoId}&vs_currencies=usd`,
      {
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API returned ${response.status}`);
    }

    const data = await response.json();
    return data[coinConfig.geckoId]?.usd || null;
  } catch (error) {
    console.error('Error fetching coin price:', error);
    return null;
  }
}

// Estimate earnings (placeholder for pools that don't provide this)
function estimateEarnings(hashrate) {
  // This is a very rough estimate, actual implementation would use network difficulty
  return 0;
}

// Algorithm groups - coins that can be mined with same hardware
const ALGORITHM_GROUPS = {
  'kawpow': ['rvn', 'xna'],           // GPU - KAWPOW
  'autolykos': ['ergo'],              // GPU - Autolykos2
  'ethash': ['etc'],                  // GPU - Ethash (ETH moved to PoS)
  'kheavyhash': ['kas'],              // GPU/ASIC - kHeavyHash
  'zelhash': ['flux'],                // GPU - ZelHash
  'equihash': ['zec', 'btg'],         // GPU - Equihash variants
  'randomx': ['xmr'],                 // CPU - RandomX
  'ghostrider': ['rtm'],              // CPU - GhostRider
  'sha256': ['btc'],                  // ASIC - SHA256
  'scrypt': ['ltc'],                  // ASIC - Scrypt
  'beamhash': ['beam'],               // GPU - BeamHash
  'firopow': ['firo'],                // GPU - FiroPow
  'octopus': ['cfx'],                 // GPU - Octopus
  'eaglesong': ['ckb'],               // ASIC - Eaglesong
  'blake3': ['alph'],                 // GPU - Blake3
  'nexapow': ['nexa']                 // GPU - NexaPow
};

// Get algorithm for a coin
function getCoinAlgorithm(coin) {
  const coinLower = coin.toLowerCase();
  for (const [algo, coins] of Object.entries(ALGORITHM_GROUPS)) {
    if (coins.includes(coinLower)) {
      return algo;
    }
  }
  return null;
}

// WhatToMine coin IDs (for API calls)
const WHATTOMINE_IDS = {
  'rvn': 234,
  'etc': 162,
  'ergo': 340,
  'flux': 185,
  'kas': 352,
  'xna': 388,
  'firo': 175,
  'beam': 294,
  'cfx': 351,
  'alph': 398,
  'nexa': 399,
  'rtm': 361,
  'zec': 166,
  'btg': 181,
  'xmr': 101
};

// Cache for profitability data (5 min TTL)
let profitabilityCache = {
  data: null,
  timestamp: 0
};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Fetch coin profitability data from WhatToMine
async function fetchCoinProfitability() {
  // Check cache
  if (profitabilityCache.data && (Date.now() - profitabilityCache.timestamp) < CACHE_TTL) {
    return profitabilityCache.data;
  }

  try {
    // WhatToMine API for GPU coins
    const response = await fetch('https://whattomine.com/coins.json', {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`WhatToMine API returned ${response.status}`);
    }

    const data = await response.json();

    // Parse into our format
    const profitability = {};

    if (data.coins) {
      for (const [name, coin] of Object.entries(data.coins)) {
        const tag = coin.tag?.toLowerCase();
        if (tag && COINS[tag]) {
          profitability[tag] = {
            name: coin.tag,
            algorithm: coin.algorithm,
            price: parseFloat(coin.exchange_rate) || 0,
            btcRevenue: parseFloat(coin.btc_revenue) || 0,
            revenue24h: parseFloat(coin.estimated_rewards) || 0,
            profitability: parseFloat(coin.profitability) || 0,
            profitability24: parseFloat(coin.profitability24) || 0,
            difficulty: parseFloat(coin.difficulty) || 0,
            networkHashrate: coin.nethash || 0,
            blockReward: parseFloat(coin.block_reward) || 0,
            blockTime: parseFloat(coin.block_time) || 0
          };
        }
      }
    }

    // Cache the result
    profitabilityCache = {
      data: profitability,
      timestamp: Date.now()
    };

    return profitability;
  } catch (error) {
    console.error('Error fetching profitability data:', error);
    // Return cached data even if expired, or empty object
    return profitabilityCache.data || {};
  }
}

// Calculate comparison for alternative coins
// userRevenue = user's actual 24h revenue in USD from their pool
async function getAlternativeCoins(currentCoin, userHashrate, electricityRate, powerWatts, userRevenue = 0) {
  const profitability = await fetchCoinProfitability();
  const currentAlgo = getCoinAlgorithm(currentCoin);

  if (!currentAlgo) {
    return [];
  }

  // Get coins with same algorithm (can mine with same hardware)
  const sameAlgoCoins = ALGORITHM_GROUPS[currentAlgo] || [];

  // Only compare same-algorithm coins for accurate results
  const comparableCoins = sameAlgoCoins.filter(c => c !== currentCoin.toLowerCase());

  const currentData = profitability[currentCoin.toLowerCase()];
  if (!currentData) {
    return [];
  }

  // Daily electricity cost
  const dailyElectricity = (powerWatts / 1000) * 24 * electricityRate;

  // User's actual profit
  const userProfit = userRevenue - dailyElectricity;

  const alternatives = [];

  for (const coinId of comparableCoins) {
    const coinData = profitability[coinId];
    if (!coinData) continue;

    // Same algorithm - we can directly compare using profitability ratio
    // WhatToMine profitability is normalized per unit hashrate
    const isSameAlgo = true;

    let estimatedRevenue;
    let profitDiff;

    if (currentData.profitability > 0 && userRevenue > 0) {
      // Scale user's actual revenue by the profitability ratio
      const profitRatio = coinData.profitability / currentData.profitability;
      estimatedRevenue = userRevenue * profitRatio;
    } else if (currentData.profitability > 0) {
      // No user revenue data - use relative profitability difference
      const profitRatio = coinData.profitability / currentData.profitability;
      // Express as percentage difference
      estimatedRevenue = 0;
    } else {
      estimatedRevenue = 0;
    }

    const estimatedProfit = estimatedRevenue - dailyElectricity;
    profitDiff = estimatedProfit - userProfit;

    // Only show if we have meaningful data
    if (estimatedRevenue > 0 || userRevenue > 0) {
      const percentDiff = userProfit !== 0 ? (profitDiff / Math.abs(userProfit)) * 100 : 0;

      alternatives.push({
        coin: coinId.toUpperCase(),
        name: COINS[coinId]?.name || coinId,
        algorithm: coinData.algorithm,
        isSameAlgo,
        estimatedRevenue,
        estimatedProfit,
        profitDiff,
        percentDiff,
        price: coinData.price,
        difficulty: coinData.difficulty
      });
    }
  }

  // Sort by profit difference (best first)
  alternatives.sort((a, b) => b.profitDiff - a.profitDiff);

  // Return top 4 alternatives
  return alternatives.slice(0, 4);
}

// Set up alarm for auto-refresh (paid users only)
async function setupAutoRefresh() {
  const { isPaid, settings } = await chrome.storage.local.get(['isPaid', 'settings']);

  if (isPaid && settings?.refreshInterval) {
    chrome.alarms.create('refresh', { periodInMinutes: settings.refreshInterval });
  } else {
    chrome.alarms.clear('refresh');
  }
}

// Handle alarm
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'refresh') {
    await refreshAllData();
  }
});

// Refresh all wallet data
async function refreshAllData() {
  const { wallets, settings, isPaid, electricity } = await chrome.storage.local.get([
    'wallets', 'settings', 'isPaid', 'electricity'
  ]);

  if (!wallets || wallets.length === 0) return;

  for (const wallet of wallets.filter(w => w.enabled)) {
    try {
      const poolData = await fetchPoolData(wallet.pool, wallet.coin, wallet.address);
      const price = await fetchCoinPrice(wallet.coin);
      const previousData = await chrome.storage.local.get([`poolData_${wallet.id}`, `profit_${wallet.id}`]);

      // Calculate current profit
      const earnings24h = poolData.earnings24h || 0;
      const revenue = earnings24h * (price || 0);
      const powerWatts = wallet.power || 200;
      const rate = electricity?.rate || 0.12;
      const electricityCost = (powerWatts / 1000) * 24 * rate;
      const currentProfit = revenue - electricityCost;

      // Check for offline workers
      if (isPaid && settings?.notifications?.workerOffline) {
        const offlineWorkers = poolData.workers.filter(w => w.offline);
        if (offlineWorkers.length > 0) {
          // Only notify if this is a new offline event (wasn't offline before)
          const prevPoolData = previousData[`poolData_${wallet.id}`];
          const prevOfflineCount = prevPoolData?.workers?.filter(w => w.offline).length || 0;

          if (offlineWorkers.length > prevOfflineCount) {
            const alertMessage = `${offlineWorkers.length} worker(s) went offline`;
            chrome.notifications.create(`worker-offline-${wallet.id}-${Date.now()}`, {
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: 'Worker Offline',
              message: `${wallet.name}: ${alertMessage}`
            });
            // Send email alert
            sendEmailAlert('worker_offline', wallet.name, alertMessage);
          }
        }
      }

      // Check for profit drop
      if (isPaid && settings?.notifications?.profitDrop) {
        const previousProfit = previousData[`profit_${wallet.id}`];
        if (previousProfit && previousProfit > 0) {
          const dropThreshold = settings.notifications.profitDropThreshold || 20;
          const dropPercent = ((previousProfit - currentProfit) / previousProfit) * 100;

          if (dropPercent >= dropThreshold) {
            const alertMessage = `Profit dropped ${dropPercent.toFixed(0)}% (now $${currentProfit.toFixed(2)}/day)`;
            chrome.notifications.create(`profit-drop-${wallet.id}-${Date.now()}`, {
              type: 'basic',
              iconUrl: 'icons/icon128.png',
              title: 'Profit Drop Alert',
              message: `${wallet.name}: ${alertMessage}`
            });
            // Send email alert
            sendEmailAlert('profit_drop', wallet.name, alertMessage);
          }
        }
      }

      // Check for better coin
      if (isPaid && settings?.notifications?.betterCoin) {
        try {
          const alternatives = await getAlternativeCoins(
            wallet.coin,
            poolData.hashrate || 0,
            rate,
            powerWatts
          );

          // Find coins that are significantly more profitable (>10% better)
          const betterCoin = alternatives.find(alt =>
            alt.isSameAlgo && alt.profitDiff > 0 && alt.percentDiff > 10
          );

          if (betterCoin) {
            // Only notify once per coin switch opportunity (use a flag)
            const notifiedKey = `notified_better_${wallet.id}_${betterCoin.coin}`;
            const { [notifiedKey]: alreadyNotified } = await chrome.storage.local.get([notifiedKey]);

            if (!alreadyNotified) {
              const alertMessage = `Consider switching from ${wallet.coin.toUpperCase()} to ${betterCoin.coin} for +$${betterCoin.profitDiff.toFixed(2)}/day more profit`;
              chrome.notifications.create(`better-coin-${wallet.id}-${Date.now()}`, {
                type: 'basic',
                iconUrl: 'icons/icon128.png',
                title: 'Better Coin Available',
                message: `Switch ${wallet.coin.toUpperCase()} → ${betterCoin.coin} for +$${betterCoin.profitDiff.toFixed(2)}/day`
              });
              // Send email alert
              sendEmailAlert('better_coin', wallet.name, alertMessage);

              // Mark as notified (expires in 6 hours)
              await chrome.storage.local.set({ [notifiedKey]: Date.now() });
              setTimeout(async () => {
                await chrome.storage.local.remove([notifiedKey]);
              }, 6 * 60 * 60 * 1000);
            }
          }
        } catch (e) {
          console.error('Error checking better coins:', e);
        }
      }

      // Store latest data
      await chrome.storage.local.set({
        [`poolData_${wallet.id}`]: poolData,
        [`profit_${wallet.id}`]: currentProfit,
        lastRefresh: new Date().toISOString()
      });

    } catch (error) {
      console.error(`Error refreshing ${wallet.name}:`, error);
    }
  }
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  if (message.action === 'refresh') {
    refreshAllData().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.action === 'fetchPoolData') {
    fetchPoolData(message.pool, message.coin, message.address)
      .then(data => {
        sendResponse({ success: true, data });
      })
      .catch(error => {
        console.error('Pool fetch error:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep channel open for async response
  }

  if (message.action === 'fetchCoinPrice') {
    fetchCoinPrice(message.coin)
      .then(price => sendResponse({ success: true, price }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  if (message.action === 'setupAutoRefresh') {
    setupAutoRefresh().then(() => sendResponse({ success: true }));
    return true;
  }

  if (message.action === 'getPools') {
    const pools = Object.entries(POOLS).map(([id, config]) => ({
      id,
      name: config.name,
      coins: config.coins
    }));
    sendResponse({ success: true, pools });
    return true;
  }

  if (message.action === 'getCoins') {
    const coins = Object.entries(COINS).map(([id, config]) => ({
      id,
      ...config
    }));
    sendResponse({ success: true, coins });
    return true;
  }

  if (message.action === 'checkLicenseStatus') {
    chrome.storage.local.get(['licenseKey', 'installId'], async (data) => {
      if (!data.licenseKey || !data.installId) {
        sendResponse({ success: false, isPro: false });
        return;
      }
      const result = await checkLicenseStatus(data.licenseKey, data.installId);
      if (result.isPro) {
        chrome.storage.local.set({ isPaid: true, plan: result.plan });
      }
      sendResponse({ success: true, ...result });
    });
    return true;
  }

  if (message.action === 'activateLicense') {
    chrome.storage.local.get(['installId'], async (data) => {
      let installId = data.installId;
      if (!installId) {
        installId = generateInstallId();
        await chrome.storage.local.set({ installId });
      }

      const result = await activateLicense(message.licenseKey, installId);

      if (result.success && result.isPro) {
        await chrome.storage.local.set({
          isPaid: true,
          licenseKey: message.licenseKey.toUpperCase().trim(),
          plan: result.plan
        });
      }

      sendResponse(result);
    });
    return true;
  }

  // Legacy support for email-based activation (will be removed)
  if (message.action === 'activatePro') {
    sendResponse({ success: false, error: 'Please use your license key to activate.' });
    return true;
  }

  // Get alternative coins for comparison (Pro feature)
  if (message.action === 'getAlternativeCoins') {
    getAlternativeCoins(
      message.currentCoin,
      message.hashrate || 0,
      message.electricityRate || 0.12,
      message.powerWatts || 200,
      message.userRevenue || 0  // User's actual 24h revenue in USD
    )
      .then(alternatives => sendResponse({ success: true, alternatives }))
      .catch(error => {
        console.error('Error getting alternatives:', error);
        sendResponse({ success: false, error: error.message, alternatives: [] });
      });
    return true;
  }

  // Get profitability data for all coins
  if (message.action === 'getCoinProfitability') {
    fetchCoinProfitability()
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }

  // Fetch coin price with 24h change
  if (message.action === 'fetchCoinPriceWithChange') {
    fetchCoinPriceWithChange(message.coin)
      .then(data => sendResponse(data))
      .catch(error => sendResponse({ price: 0, change24h: 0 }));
    return true;
  }

  // Get discovery coins (trending, top, new)
  if (message.action === 'getDiscoveryCoins') {
    getDiscoveryCoins()
      .then(data => sendResponse({ success: true, ...data }))
      .catch(error => sendResponse({ success: false, trending: [], top: [], new: [] }));
    return true;
  }
});

// Fetch coin price with 24h change from CoinGecko
async function fetchCoinPriceWithChange(coinSymbol) {
  const coinLower = coinSymbol.toLowerCase();
  const coinConfig = COINS[coinLower];

  if (!coinConfig?.geckoId) {
    return { price: 0, change24h: 0 };
  }

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinConfig.geckoId}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API returned ${response.status}`);
    }

    const data = await response.json();
    const coinData = data[coinConfig.geckoId];

    return {
      price: coinData?.usd || 0,
      change24h: coinData?.usd_24h_change || 0
    };
  } catch (error) {
    console.error('Error fetching coin price with change:', error);
    return { price: 0, change24h: 0 };
  }
}

// Cache for price changes (to avoid rate limiting)
let priceChangeCache = {
  data: {},
  timestamp: 0
};
const PRICE_CACHE_TTL = 10 * 60 * 1000; // 10 minutes

// Batch fetch price changes for multiple coins
async function fetchBatchPriceChanges(symbols) {
  // Check cache first
  if (priceChangeCache.timestamp && (Date.now() - priceChangeCache.timestamp) < PRICE_CACHE_TTL) {
    return priceChangeCache.data;
  }

  const geckoIds = symbols
    .map(s => COINS[s.toLowerCase()]?.geckoId)
    .filter(Boolean);

  if (geckoIds.length === 0) return {};

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds.join(',')}&vs_currencies=usd&include_24hr_change=true`,
      { headers: { 'Accept': 'application/json' } }
    );

    if (!response.ok) {
      console.error('CoinGecko batch fetch failed:', response.status);
      return priceChangeCache.data || {};
    }

    const data = await response.json();

    // Map back to our symbols
    const result = {};
    for (const symbol of symbols) {
      const geckoId = COINS[symbol.toLowerCase()]?.geckoId;
      if (geckoId && data[geckoId]) {
        result[symbol.toLowerCase()] = {
          price: data[geckoId].usd || 0,
          change24h: data[geckoId].usd_24h_change || 0
        };
      }
    }

    // Update cache
    priceChangeCache = { data: result, timestamp: Date.now() };
    return result;
  } catch (error) {
    console.error('Error batch fetching prices:', error);
    return priceChangeCache.data || {};
  }
}

// Get discovery coins for the popup
async function getDiscoveryCoins() {
  try {
    const profitability = await fetchCoinProfitability();

    if (!profitability || Object.keys(profitability).length === 0) {
      console.error('No profitability data received');
      return getFallbackDiscoveryCoins();
    }

    // Get all symbols we need price data for
    const symbols = Object.keys(profitability).filter(s => COINS[s]);

    // Batch fetch all price changes in one request
    const priceChanges = await fetchBatchPriceChanges(symbols);

    // Convert to array and add metadata
    const coins = [];
    for (const [symbol, data] of Object.entries(profitability)) {
      if (!data.profitability || data.profitability <= 0) continue;

      const coinConfig = COINS[symbol];
      if (!coinConfig) continue;

      const priceData = priceChanges[symbol] || { price: data.price, change24h: 0 };
      const change24h = priceData.change24h || 0;

      coins.push({
        symbol: symbol.toUpperCase(),
        name: coinConfig.name,
        algorithm: data.algorithm,
        profitPerDay: data.profitability / 100, // Normalize to approx daily profit
        change24h: change24h,
        difficulty: data.difficulty,
        networkHashrate: data.networkHashrate,
        price: priceData.price || data.price,
        isNew: isNewCoin(symbol),
        isHot: Math.abs(change24h) > 10 || data.profitability > 150
      });
    }

    if (coins.length === 0) {
      console.error('No coins after filtering');
      return getFallbackDiscoveryCoins();
    }

    // Sort by different criteria for each tab
    const trending = [...coins]
      .sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h))
      .slice(0, 8);

    const top = [...coins]
      .sort((a, b) => b.profitPerDay - a.profitPerDay)
      .slice(0, 8);

    const newCoins = [...coins]
      .filter(c => c.isNew)
      .sort((a, b) => b.profitPerDay - a.profitPerDay)
      .slice(0, 8);

    // If no new coins, show promising coins
    if (newCoins.length === 0) {
      const promising = [...coins]
        .filter(c => c.change24h > 0)
        .sort((a, b) => b.change24h - a.change24h)
        .slice(0, 8);
      return { trending, top, new: promising.length > 0 ? promising : top.slice(0, 4) };
    }

    return { trending, top, new: newCoins };
  } catch (error) {
    console.error('Error in getDiscoveryCoins:', error);
    return getFallbackDiscoveryCoins();
  }
}

// Fallback data when API fails
function getFallbackDiscoveryCoins() {
  const fallbackCoins = [
    { symbol: 'KAS', name: 'Kaspa', algorithm: 'kHeavyHash', profitPerDay: 2.50, change24h: 5.2, isNew: true, isHot: true },
    { symbol: 'RVN', name: 'Ravencoin', algorithm: 'KAWPOW', profitPerDay: 1.20, change24h: 2.1, isNew: false, isHot: false },
    { symbol: 'ETC', name: 'Ethereum Classic', algorithm: 'Etchash', profitPerDay: 1.80, change24h: -1.5, isNew: false, isHot: false },
    { symbol: 'FLUX', name: 'Flux', algorithm: 'ZelHash', profitPerDay: 1.10, change24h: 3.8, isNew: false, isHot: false },
    { symbol: 'ERG', name: 'Ergo', algorithm: 'Autolykos2', profitPerDay: 0.95, change24h: 1.2, isNew: false, isHot: false },
    { symbol: 'ALPH', name: 'Alephium', algorithm: 'Blake3', profitPerDay: 1.50, change24h: 8.5, isNew: true, isHot: true },
    { symbol: 'NEXA', name: 'Nexa', algorithm: 'NexaPow', profitPerDay: 0.80, change24h: -2.3, isNew: true, isHot: false },
    { symbol: 'FIRO', name: 'Firo', algorithm: 'FiroPow', profitPerDay: 0.70, change24h: 1.5, isNew: false, isHot: false }
  ];

  return {
    trending: [...fallbackCoins].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)),
    top: [...fallbackCoins].sort((a, b) => b.profitPerDay - a.profitPerDay),
    new: fallbackCoins.filter(c => c.isNew)
  };
}

// Check if a coin is considered "new" (launched recently or emerging)
function isNewCoin(symbol) {
  const newCoins = ['xna', 'nexa', 'alph', 'kas', 'firo']; // Recently popular coins
  return newCoins.includes(symbol.toLowerCase());
}
