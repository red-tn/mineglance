// MineGlance Popup Script

// Pool dashboard URLs
const POOL_URLS = {
  '2miners': (coin, address) => `https://${coin}.2miners.com/account/${address}`,
  'nanopool': (coin, address) => `https://${coin}.nanopool.org/account/${address}`,
  'f2pool': (coin, address) => `https://www.f2pool.com/${coin}/${address}`,
  'flexpool': (coin, address) => `https://www.flexpool.io/miner/${coin.toUpperCase()}/${address}`,
  'ethermine': (coin, address) => `https://ethermine.org/miners/${address}/dashboard`,
  'hiveon': (coin, address) => `https://hiveon.net/${coin}/miner/${address}`,
  'herominers': (coin, address) => `https://${coin}.herominers.com/#/dashboard?addr=${address}`,
  'woolypooly': (coin, address) => `https://woolypooly.com/${coin}/miner/${address}`
};

function getPoolUrl(pool, coin, address) {
  const urlFn = POOL_URLS[pool];
  if (urlFn) {
    return urlFn(coin.toLowerCase(), address);
  }
  return null;
}

document.addEventListener('DOMContentLoaded', async () => {
  // DOM Elements
  const loading = document.getElementById('loading');
  const noWallets = document.getElementById('noWallets');
  const dashboard = document.getElementById('dashboard');
  const walletList = document.getElementById('walletList');
  const totalProfit = document.getElementById('totalProfit');
  const profitBreakdown = document.getElementById('profitBreakdown');
  const lastUpdated = document.getElementById('lastUpdated');
  const upgradeBanner = document.getElementById('upgradeBanner');
  const coinComparison = document.getElementById('coinComparison');
  const comparisonList = document.getElementById('comparisonList');
  const proBadge = document.getElementById('proBadge');
  const coinDiscovery = document.getElementById('coinDiscovery');
  const discoveryContent = document.getElementById('discoveryContent');
  const discoveryList = document.getElementById('discoveryList');
  const toggleDiscovery = document.getElementById('toggleDiscovery');

  // Buttons
  const settingsBtn = document.getElementById('settingsBtn');
  const addWalletBtn = document.getElementById('addWalletBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const upgradeBtn = document.getElementById('upgradeBtn');

  // State
  let currentTab = 'trending';
  let discoveryData = { trending: [], top: [], new: [] };

  // Event Listeners
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  addWalletBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  refreshBtn.addEventListener('click', async () => {
    refreshBtn.disabled = true;
    refreshBtn.textContent = '...';
    await fetchAllWalletData();
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Refresh';
  });

  upgradeBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://mineglance.com/#pricing' });
  });

  // Discovery toggle
  toggleDiscovery.addEventListener('click', async () => {
    const isCollapsed = discoveryContent.classList.toggle('collapsed');
    toggleDiscovery.classList.toggle('collapsed', isCollapsed);
    await chrome.storage.local.set({ discoveryCollapsed: isCollapsed });
  });

  // Tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      renderDiscoveryList(discoveryData[currentTab] || []);
    });
  });

  // Initialize
  await initPopup();

  async function initPopup() {
    showLoading();

    try {
      const { wallets, isPaid, electricity, settings, discoveryCollapsed } = await chrome.storage.local.get([
        'wallets',
        'isPaid',
        'electricity',
        'settings',
        'discoveryCollapsed'
      ]);

      // Show upgrade banner for free users, or PRO badge for paid users
      if (!isPaid) {
        upgradeBanner.classList.remove('hidden');
      } else {
        proBadge.classList.remove('hidden');
      }

      // Show/hide discovery section based on settings
      const showDiscoverySetting = settings?.showDiscovery !== false; // Default to true
      if (showDiscoverySetting) {
        coinDiscovery.classList.remove('hidden');
        if (discoveryCollapsed) {
          discoveryContent.classList.add('collapsed');
          toggleDiscovery.classList.add('collapsed');
        }
        // Fetch discovery data
        fetchDiscoveryData();
      }

      // Check if we have wallets
      if (!wallets || wallets.length === 0) {
        showNoWallets();
        return;
      }

      // Fetch fresh data for all wallets
      await fetchAllWalletData();

    } catch (error) {
      console.error('Error initializing popup:', error);
      showNoWallets();
    }
  }

  async function fetchAllWalletData() {
    showLoading();

    const { wallets, electricity } = await chrome.storage.local.get(['wallets', 'electricity']);

    if (!wallets || wallets.length === 0) {
      showNoWallets();
      return;
    }

    let totalRevenue = 0;
    let totalElectricityCost = 0;
    const walletResults = [];

    for (const wallet of wallets.filter(w => w.enabled)) {
      try {
        // Fetch pool data via background script
        const poolData = await fetchPoolData(wallet.pool, wallet.coin, wallet.address);

        // Fetch coin price and 24h change
        const priceData = await fetchCoinPriceWithChange(wallet.coin);
        const price = priceData.price || 0;
        const priceChange24h = priceData.change24h || 0;

        // Calculate earnings (24h estimate)
        const earnings24h = poolData.earnings24h || 0;
        const revenue = earnings24h * price;

        // Calculate electricity cost (24h)
        const powerWatts = wallet.power || 200;
        const rate = electricity?.rate || 0.12;
        const electricityCost = (powerWatts / 1000) * 24 * rate;

        const netProfit = revenue - electricityCost;

        // Calculate wallet balance in USD
        const balanceUSD = (poolData.balance || 0) * price;

        totalRevenue += revenue;
        totalElectricityCost += electricityCost;

        walletResults.push({
          wallet,
          poolData,
          price,
          priceChange24h,
          balanceUSD,
          revenue,
          electricityCost,
          netProfit
        });

        // Cache the data
        await chrome.storage.local.set({
          [`poolData_${wallet.id}`]: poolData,
          [`price_${wallet.coin}`]: price,
          [`priceChange_${wallet.coin}`]: priceChange24h
        });

      } catch (error) {
        let errorMsg = error.message;
        if (error.message.includes('404')) {
          errorMsg = 'No mining data found. Start mining to see stats.';
        } else if (error.message.includes('Failed to fetch')) {
          errorMsg = 'Unable to connect to pool. Check your internet.';
        }
        walletResults.push({
          wallet,
          error: errorMsg
        });
      }
    }

    // Update last refresh time
    await chrome.storage.local.set({ lastRefresh: new Date().toISOString() });

    // Render dashboard
    showDashboard();
    renderWallets(walletResults);
    updateSummary(totalRevenue - totalElectricityCost, totalRevenue, totalElectricityCost);
    lastUpdated.textContent = `Last updated: just now`;

    // Fetch and render coin comparisons
    const { isPaid } = await chrome.storage.local.get(['isPaid']);
    if (walletResults.length > 0) {
      const primaryWallet = walletResults.find(r => !r.error) || walletResults[0];
      if (primaryWallet && !primaryWallet.error) {
        await fetchAndRenderComparison(
          primaryWallet.wallet.coin,
          primaryWallet.poolData?.hashrate || 0,
          electricity?.rate || 0.12,
          primaryWallet.wallet.power || 200,
          isPaid,
          primaryWallet.revenue || 0
        );
      }
    }
  }

  // Fetch coin price with 24h change
  async function fetchCoinPriceWithChange(coinSymbol) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'fetchCoinPriceWithChange', coin: coinSymbol },
        (response) => {
          resolve({
            price: response?.price || 0,
            change24h: response?.change24h || 0
          });
        }
      );
    });
  }

  // Fetch discovery coins from background
  async function fetchDiscoveryData() {
    chrome.runtime.sendMessage(
      { action: 'getDiscoveryCoins' },
      (response) => {
        if (response?.success) {
          discoveryData = {
            trending: response.trending || [],
            top: response.top || [],
            new: response.new || []
          };
          renderDiscoveryList(discoveryData[currentTab]);
        }
      }
    );
  }

  function renderDiscoveryList(coins) {
    if (!coins || coins.length === 0) {
      discoveryList.innerHTML = `
        <div style="text-align: center; padding: 20px; color: var(--text-muted); font-size: 12px;">
          No coins available
        </div>
      `;
      return;
    }

    discoveryList.innerHTML = coins.map(coin => {
      const changeClass = coin.change24h >= 0 ? 'up' : 'down';
      const changeSign = coin.change24h >= 0 ? '+' : '';
      const badges = [];
      if (coin.isNew) badges.push('<span class="new-badge">NEW</span>');
      if (coin.isHot) badges.push('<span class="hot-badge">HOT</span>');

      return `
        <div class="discovery-item" title="Click to learn more about ${coin.symbol}">
          <div class="discovery-coin">
            <div class="coin-icon">${coin.symbol.substring(0, 2)}</div>
            <div class="coin-details">
              <span class="coin-symbol">${coin.symbol}${badges.join('')}</span>
              <span class="coin-algo-tag">${coin.algorithm || 'Unknown'}</span>
            </div>
          </div>
          <div class="discovery-stats">
            <span class="discovery-profit">$${coin.profitPerDay?.toFixed(2) || '0.00'}/day</span>
            <span class="discovery-change ${changeClass}">${changeSign}${coin.change24h?.toFixed(1) || 0}%</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Fetch alternative coins from background
  async function fetchAlternativeCoins(currentCoin, hashrate, electricityRate, powerWatts, userRevenue) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        {
          action: 'getAlternativeCoins',
          currentCoin,
          hashrate,
          electricityRate,
          powerWatts,
          userRevenue
        },
        (response) => {
          resolve(response?.alternatives || []);
        }
      );
    });
  }

  // Fetch and render coin comparison
  async function fetchAndRenderComparison(currentCoin, hashrate, electricityRate, powerWatts, isPaid, userRevenue) {
    try {
      const alternatives = await fetchAlternativeCoins(currentCoin, hashrate, electricityRate, powerWatts, userRevenue);

      if (alternatives.length === 0) {
        coinComparison.classList.add('hidden');
        return;
      }

      coinComparison.classList.remove('hidden');

      comparisonList.innerHTML = alternatives.map((alt, index) => {
        const isBetter = alt.profitDiff > 0;
        const diffSign = isBetter ? '+' : '';
        const diffClass = isBetter ? 'better' : 'worse';
        const isLocked = !isPaid && index > 0;

        if (isLocked) {
          return `
            <div class="comparison-item locked" title="Upgrade to Pro to see all alternatives">
              <div class="coin-info">
                <span class="coin-name">${alt.coin}</span>
                <span class="coin-algo">${alt.isSameAlgo ? '(same algo)' : ''}</span>
              </div>
              <div class="profit-diff locked-value">🔒 Pro</div>
            </div>
          `;
        }

        return `
          <div class="comparison-item">
            <div class="coin-info">
              <span class="coin-name">${alt.coin}</span>
              <span class="coin-algo">${alt.isSameAlgo ? '✓ same algo' : alt.algorithm || ''}</span>
            </div>
            <div class="profit-diff ${diffClass}">
              ${diffSign}$${alt.profitDiff.toFixed(2)}/day
            </div>
          </div>
        `;
      }).join('');

    } catch (error) {
      console.error('Error fetching coin comparison:', error);
      coinComparison.classList.add('hidden');
    }
  }

  function renderWallets(walletResults) {
    walletList.innerHTML = '';

    for (const result of walletResults) {
      const card = document.createElement('div');
      card.className = 'wallet-card';

      const poolUrl = getPoolUrl(result.wallet.pool, result.wallet.coin, result.wallet.address);
      if (poolUrl) {
        card.style.cursor = 'pointer';
        card.title = 'Click to view on pool dashboard';
        card.addEventListener('click', () => {
          chrome.tabs.create({ url: poolUrl });
        });
      }

      if (result.error) {
        card.classList.add('error');
        card.innerHTML = `
          <div class="wallet-card-header">
            <div class="wallet-name">
              <span>${result.wallet.name || 'Wallet'}</span>
              <span class="wallet-coin">${result.wallet.coin.toUpperCase()}</span>
            </div>
            <div class="wallet-profit" style="color: var(--warning)">--</div>
          </div>
          <div class="wallet-error">${result.error}</div>
        `;
      } else {
        const { wallet, poolData, price, priceChange24h, balanceUSD, netProfit } = result;
        const onlineWorkers = poolData.workersOnline ?? poolData.workers?.filter(w => !w.offline).length ?? 0;
        const totalWorkers = poolData.workersTotal ?? poolData.workers?.length ?? 0;
        const changeClass = priceChange24h >= 0 ? 'positive' : 'negative';
        const changeSign = priceChange24h >= 0 ? '+' : '';

        card.innerHTML = `
          <div class="wallet-card-header">
            <div class="wallet-name">
              <span>${wallet.name || 'Wallet'}</span>
              <span class="wallet-coin">${wallet.coin.toUpperCase()}</span>
              ${poolUrl ? '<span class="external-link" title="Open in pool">↗</span>' : ''}
            </div>
            <div class="wallet-profit ${netProfit >= 0 ? 'profit-positive' : 'profit-negative'}">
              ${netProfit >= 0 ? '+' : ''}$${netProfit.toFixed(2)}
            </div>
          </div>
          <div class="wallet-stats">
            <div class="stat">
              <div class="stat-label">Hashrate</div>
              <div class="stat-value">${formatHashrate(poolData.hashrate)}</div>
            </div>
            <div class="stat">
              <div class="stat-label">Workers</div>
              <div class="stat-value ${totalWorkers > 0 && onlineWorkers === totalWorkers ? 'online' : onlineWorkers === 0 ? 'offline' : ''}">
                ${totalWorkers > 0 ? `${onlineWorkers}/${totalWorkers}` : '--'}
              </div>
            </div>
            <div class="stat">
              <div class="stat-label">Balance</div>
              <div class="stat-value">${poolData.balance ? poolData.balance.toFixed(6) : '0'}</div>
            </div>
          </div>
          <div class="wallet-ribbon">
            <div class="ribbon-item">
              <span class="ribbon-label"><span class="live-dot"></span>Price</span>
              <span class="ribbon-value">$${price ? price.toFixed(4) : '0.00'}</span>
            </div>
            <div class="ribbon-divider"></div>
            <div class="ribbon-item">
              <span class="ribbon-label">24h</span>
              <span class="ribbon-value ${changeClass}">${changeSign}${priceChange24h.toFixed(1)}%</span>
            </div>
            <div class="ribbon-divider"></div>
            <div class="ribbon-item">
              <span class="ribbon-label">Value</span>
              <span class="ribbon-value">$${balanceUSD.toFixed(2)}</span>
            </div>
          </div>
        `;
      }

      walletList.appendChild(card);
    }
  }

  function updateSummary(netProfit, revenue, electricityCost) {
    const profitClass = netProfit >= 0 ? 'profit-positive' : 'profit-negative';
    const sign = netProfit >= 0 ? '+' : '-';

    totalProfit.className = `summary-value ${profitClass}`;
    totalProfit.textContent = `${sign}$${Math.abs(netProfit).toFixed(2)}`;

    profitBreakdown.innerHTML = `
      <span class="revenue">↑ $${revenue.toFixed(2)} revenue</span>
      <span class="electricity">↓ $${electricityCost.toFixed(2)} electricity</span>
    `;
  }

  async function fetchPoolData(pool, coin, address) {
    return new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'fetchPoolData', pool, coin, address },
        (response) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (response?.success) {
            resolve(response.data);
          } else {
            reject(new Error(response?.error || 'Failed to fetch pool data'));
          }
        }
      );
    });
  }

  async function fetchCoinPrice(coinSymbol) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: 'fetchCoinPrice', coin: coinSymbol },
        (response) => {
          resolve(response?.price || 0);
        }
      );
    });
  }

  // Utility Functions
  function showLoading() {
    loading.classList.remove('hidden');
    noWallets.classList.add('hidden');
    dashboard.classList.add('hidden');
  }

  function showNoWallets() {
    loading.classList.add('hidden');
    noWallets.classList.remove('hidden');
    dashboard.classList.add('hidden');
  }

  function showDashboard() {
    loading.classList.add('hidden');
    noWallets.classList.add('hidden');
    dashboard.classList.remove('hidden');
  }

  function formatHashrate(hashrate) {
    if (!hashrate || hashrate === 0) return '0 H/s';

    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s'];
    let unitIndex = 0;
    let value = hashrate;

    while (value >= 1000 && unitIndex < units.length - 1) {
      value /= 1000;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }
});
