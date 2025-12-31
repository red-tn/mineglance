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
    await refreshData();
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Refresh';
  });

  upgradeBtn.addEventListener('click', () => {
    // TODO: Integrate ExtensionPay
    chrome.tabs.create({ url: 'https://mineglance.com/#pricing' });
  });

  // Initialize
  await initPopup();

  async function initPopup() {
    showLoading();

    try {
      const { wallets, isPaid, lastRefresh, electricity } = await chrome.storage.local.get([
        'wallets',
        'isPaid',
        'lastRefresh',
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

      // Load and display data
      await loadDashboard(wallets, electricity, isPaid);

      // Update last refresh time
      if (lastRefresh) {
        const date = new Date(lastRefresh);
        lastUpdated.textContent = `Last updated: ${formatTime(date)}`;
      }

    } catch (error) {
      console.error('Error initializing popup:', error);
      showNoWallets();
    }
  }

  async function loadDashboard(wallets, electricity, isPaid) {
    showDashboard();

    let totalRevenue = 0;
    let totalElectricityCost = 0;

    walletList.innerHTML = '';

    for (const wallet of wallets.filter(w => w.enabled)) {
      // Get cached pool data
      const key = `poolData_${wallet.id}`;
      const { [key]: poolData } = await chrome.storage.local.get([key]);

      if (poolData) {
        // Fetch current price
        const price = await getCoinPrice(wallet.coin);

        // Calculate earnings
        const earnings24h = poolData.earnings24h || 0;
        const revenue = earnings24h * (price || 0);

        // Calculate electricity cost (24h)
        const powerWatts = wallet.power || 200; // Default 200W
        const electricityCost = calculateElectricityCost(
          powerWatts,
          24,
          electricity?.rate || 0.12
        );

        const netProfit = revenue - electricityCost;

        totalRevenue += revenue;
        totalElectricityCost += electricityCost;

        // Create wallet card
        const card = createWalletCard(wallet, poolData, netProfit, price);
        walletList.appendChild(card);
      } else {
        // No data yet, show placeholder
        const card = createWalletCardPlaceholder(wallet);
        walletList.appendChild(card);
      }
    }

    // Update summary
    const totalNetProfit = totalRevenue - totalElectricityCost;
    updateSummary(totalNetProfit, totalRevenue, totalElectricityCost);
  }

  function createWalletCard(wallet, poolData, netProfit, price) {
    const card = document.createElement('div');
    card.className = 'wallet-card';

    const onlineWorkers = poolData.workers.filter(w => !w.offline).length;
    const totalWorkers = poolData.workers.length;
    const workersOnline = totalWorkers > 0;

    card.innerHTML = `
      <div class="wallet-card-header">
        <div class="wallet-name">
          <span>${wallet.name || 'Wallet'}</span>
          <span class="wallet-coin">${wallet.coin}</span>
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
          <div class="stat-value ${workersOnline ? 'online' : 'offline'}">
            ${onlineWorkers}/${totalWorkers}
          </div>
        </div>
        <div class="stat">
          <div class="stat-label">Balance</div>
          <div class="stat-value">${poolData.balance?.toFixed(4) || '0'}</div>
        </div>
      </div>
    `;

    return card;
  }

  function createWalletCardPlaceholder(wallet) {
    const card = document.createElement('div');
    card.className = 'wallet-card';
    card.innerHTML = `
      <div class="wallet-card-header">
        <div class="wallet-name">
          <span>${wallet.name || 'Wallet'}</span>
          <span class="wallet-coin">${wallet.coin}</span>
        </div>
        <div class="wallet-profit" style="color: var(--text-muted)">--</div>
      </div>
      <div class="wallet-stats">
        <div class="stat">
          <div class="stat-label">Hashrate</div>
          <div class="stat-value">--</div>
        </div>
        <div class="stat">
          <div class="stat-label">Workers</div>
          <div class="stat-value">--</div>
        </div>
        <div class="stat">
          <div class="stat-label">Balance</div>
          <div class="stat-value">--</div>
        </div>
      </div>
    `;
    return card;
  }

  function updateSummary(netProfit, revenue, electricityCost) {
    const profitClass = netProfit >= 0 ? 'profit-positive' : 'profit-negative';
    const sign = netProfit >= 0 ? '+' : '';

    totalProfit.className = `summary-value ${profitClass}`;
    totalProfit.textContent = `${sign}$${Math.abs(netProfit).toFixed(2)}`;

    profitBreakdown.innerHTML = `
      <span class="revenue">↑ $${revenue.toFixed(2)} revenue</span>
      <span class="electricity">↓ $${electricityCost.toFixed(2)} electricity</span>
    `;
  }

  async function refreshData() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'refresh' }, async () => {
        await initPopup();
        resolve();
      });
    });
  }

  async function getCoinPrice(coinSymbol) {
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
    if (!hashrate) return '0 H/s';

    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s'];
    let unitIndex = 0;
    let value = hashrate;

    while (value >= 1000 && unitIndex < units.length - 1) {
      value /= 1000;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  function formatTime(date) {
    const now = new Date();
    const diff = Math.floor((now - date) / 1000);

    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  }

  function calculateElectricityCost(powerWatts, hours, ratePerKwh) {
    const kWh = (powerWatts / 1000) * hours;
    return kWh * ratePerKwh;
  }
});
