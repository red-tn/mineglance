// MineGlance Background Service Worker

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
        isPaid: false
      });
    }
  });
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
  const { wallets, settings, isPaid } = await chrome.storage.local.get(['wallets', 'settings', 'isPaid']);

  if (!wallets || wallets.length === 0) return;

  for (const wallet of wallets.filter(w => w.enabled)) {
    try {
      const poolData = await fetchPoolData(wallet.pool, wallet.coin, wallet.address);

      // Check for offline workers
      if (isPaid && settings?.notifications?.workerOffline) {
        const offlineWorkers = poolData.workers.filter(w => w.offline);
        if (offlineWorkers.length > 0) {
          chrome.notifications.create({
            type: 'basic',
            iconUrl: 'icons/logo-icon.svg',
            title: 'MineGlance Alert',
            message: `${offlineWorkers.length} worker(s) offline: ${offlineWorkers.map(w => w.name).join(', ')}`
          });
        }
      }

      // Store latest data
      await chrome.storage.local.set({
        [`poolData_${wallet.id}`]: poolData,
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
});
