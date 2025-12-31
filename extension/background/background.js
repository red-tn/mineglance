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

// Pool API configurations
const POOL_APIS = {
  '2miners': {
    baseUrl: 'https://eth.2miners.com/api',
    getStats: (coin, address) => `https://${coin}.2miners.com/api/accounts/${address}`,
  },
  'nanopool': {
    baseUrl: 'https://api.nanopool.org/v1',
    getStats: (coin, address) => `https://api.nanopool.org/v1/${coin}/user/${address}`,
  },
  'f2pool': {
    baseUrl: 'https://api.f2pool.com',
    getStats: (coin, address) => `https://api.f2pool.com/${coin}/${address}`,
  },
  'flexpool': {
    baseUrl: 'https://api.flexpool.io/v2',
    getStats: (coin, address) => `https://api.flexpool.io/v2/miner/stats?coin=${coin}&address=${address}`,
  }
};

// Coin configurations
const COINS = {
  'rvn': { name: 'Ravencoin', symbol: 'RVN', algorithm: 'kawpow' },
  'etc': { name: 'Ethereum Classic', symbol: 'ETC', algorithm: 'etchash' },
  'flux': { name: 'Flux', symbol: 'FLUX', algorithm: 'zelHash' },
  'erg': { name: 'Ergo', symbol: 'ERG', algorithm: 'autolykos2' },
  'kas': { name: 'Kaspa', symbol: 'KAS', algorithm: 'kheavyhash' }
};

// Fetch pool data for a wallet
async function fetchPoolData(pool, coin, address) {
  const poolConfig = POOL_APIS[pool];
  if (!poolConfig) {
    throw new Error(`Unsupported pool: ${pool}`);
  }

  const url = poolConfig.getStats(coin, address);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Pool API error: ${response.status}`);
    }

    const data = await response.json();
    return normalizePoolData(pool, coin, data);
  } catch (error) {
    console.error(`Error fetching pool data:`, error);
    throw error;
  }
}

// Normalize pool data to common format
function normalizePoolData(pool, coin, rawData) {
  // Each pool has different response formats, normalize them
  switch (pool) {
    case '2miners':
      return {
        hashrate: rawData.currentHashrate || 0,
        hashrate24h: rawData.hashrate || 0,
        workers: (rawData.workers || []).map(w => ({
          name: w.name || 'Worker',
          hashrate: w.hr || 0,
          lastSeen: w.lastBeat,
          offline: (Date.now() / 1000 - w.lastBeat) > 600 // 10 min threshold
        })),
        balance: rawData.stats?.balance || 0,
        paid: rawData.stats?.paid || 0,
        earnings24h: rawData.sumrewards?.[0]?.reward || 0,
        lastShare: rawData.stats?.lastShare
      };

    case 'nanopool':
      return {
        hashrate: rawData.data?.hashrate || 0,
        hashrate24h: rawData.data?.avgHashrate?.h24 || 0,
        workers: (rawData.data?.workers || []).map(w => ({
          name: w.id || 'Worker',
          hashrate: w.hashrate || 0,
          lastSeen: w.lastshare,
          offline: (Date.now() / 1000 - w.lastshare) > 600
        })),
        balance: rawData.data?.balance || 0,
        paid: rawData.data?.paid || 0,
        earnings24h: 0, // Calculate from other data
        lastShare: rawData.data?.lastShare
      };

    case 'f2pool':
      return {
        hashrate: rawData.hashrate || 0,
        hashrate24h: rawData.hashrate_24h || 0,
        workers: (rawData.workers || []).map(w => ({
          name: w.name || 'Worker',
          hashrate: w.hashrate || 0,
          lastSeen: w.last_share_time,
          offline: (Date.now() / 1000 - w.last_share_time) > 600
        })),
        balance: rawData.balance || 0,
        paid: rawData.paid || 0,
        earnings24h: rawData.value_24h || 0,
        lastShare: rawData.last_share_time
      };

    case 'flexpool':
      return {
        hashrate: rawData.result?.currentEffectiveHashrate || 0,
        hashrate24h: rawData.result?.averageEffectiveHashrate || 0,
        workers: [], // Flexpool needs separate worker endpoint
        balance: rawData.result?.balance || 0,
        paid: rawData.result?.paid || 0,
        earnings24h: 0,
        lastShare: rawData.result?.lastSeen
      };

    default:
      return rawData;
  }
}

// Fetch current coin price from CoinGecko
async function fetchCoinPrice(coinSymbol) {
  const coinIds = {
    'RVN': 'ravencoin',
    'ETC': 'ethereum-classic',
    'FLUX': 'zelcash',
    'ERG': 'ergo',
    'KAS': 'kaspa'
  };

  const coinId = coinIds[coinSymbol.toUpperCase()];
  if (!coinId) return null;

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${coinId}&vs_currencies=usd`
    );
    const data = await response.json();
    return data[coinId]?.usd || null;
  } catch (error) {
    console.error('Error fetching coin price:', error);
    return null;
  }
}

// Calculate electricity cost
function calculateElectricityCost(powerWatts, hours, ratePerKwh) {
  const kWh = (powerWatts / 1000) * hours;
  return kWh * ratePerKwh;
}

// Calculate net profit
function calculateNetProfit(earnings, coinPrice, electricityCost) {
  const grossRevenue = earnings * coinPrice;
  return grossRevenue - electricityCost;
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

// Refresh data and check for alerts
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
            iconUrl: '../icons/icon128.png',
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
    return true; // Keep channel open for async response
  }

  if (message.action === 'fetchPoolData') {
    fetchPoolData(message.pool, message.coin, message.address)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
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
});

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = {
    fetchPoolData,
    fetchCoinPrice,
    calculateElectricityCost,
    calculateNetProfit
  };
}
