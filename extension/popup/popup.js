// MineGlance Popup Script

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

  // Buttons
  const settingsBtn = document.getElementById('settingsBtn');
  const addWalletBtn = document.getElementById('addWalletBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const upgradeBtn = document.getElementById('upgradeBtn');

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

  // Initialize
  await initPopup();

  async function initPopup() {
    showLoading();

    try {
      const { wallets, isPaid, electricity } = await chrome.storage.local.get([
        'wallets',
        'isPaid',
        'electricity'
      ]);

      // Show upgrade banner for free users
      if (!isPaid) {
        upgradeBanner.classList.remove('hidden');
      } else {
        coinComparison.classList.remove('hidden');
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

        // Fetch coin price
        const price = await fetchCoinPrice(wallet.coin);

        // Calculate earnings (24h estimate)
        const earnings24h = poolData.earnings24h || 0;
        const revenue = earnings24h * (price || 0);

        // Calculate electricity cost (24h)
        const powerWatts = wallet.power || 200;
        const rate = electricity?.rate || 0.12;
        const electricityCost = (powerWatts / 1000) * 24 * rate;

        const netProfit = revenue - electricityCost;

        totalRevenue += revenue;
        totalElectricityCost += electricityCost;

        walletResults.push({
          wallet,
          poolData,
          price,
          revenue,
          electricityCost,
          netProfit
        });

        // Cache the data
        await chrome.storage.local.set({
          [`poolData_${wallet.id}`]: poolData,
          [`price_${wallet.coin}`]: price
        });

      } catch (error) {
        // Make error messages more user-friendly
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
  }

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
        const { wallet, poolData, netProfit } = result;
        // Use workersOnline/workersTotal if available, otherwise count from array
        const onlineWorkers = poolData.workersOnline ?? poolData.workers?.filter(w => !w.offline).length ?? 0;
        const totalWorkers = poolData.workersTotal ?? poolData.workers?.length ?? 0;

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
