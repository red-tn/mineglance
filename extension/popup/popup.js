// MineGlance Popup Script

// Pool dashboard URLs - validated for each pool
const POOL_URLS = {
  '2miners': (coin, address) => {
    // Special case for FIRO - use dedicated explorer
    if (coin === 'firo') {
      return `https://firo.cedric-crispin.com/wallet/${address}`;
    }
    return `https://${coin}.2miners.com/account/${address}`;
  },
  'cedriccrispin': (coin, address) => `https://firo.cedric-crispin.com/wallet/${address}`,
  'nanopool': (coin, address) => `https://${coin}.nanopool.org/account/${address}`,
  'f2pool': (coin, address) => `https://www.f2pool.com/${coin}/${address}`,
  'flexpool': (coin, address) => `https://www.flexpool.io/miner/${coin.toUpperCase()}/${address}`,
  'ethermine': (coin, address) => `https://ethermine.org/miners/${address}/dashboard`,
  'hiveon': (coin, address) => `https://hiveon.net/${coin}/miner/${address}`,
  'herominers': (coin, address) => `https://${coin}.herominers.com/#/dashboard?addr=${address}`,
  'woolypooly': (coin, address) => `https://woolypooly.com/en/coin/${coin}/wallet/${address}`,
  'ckpool': (coin, address) => `https://solostats.ckpool.org/users/${address}`,
  'ckpool-eu': (coin, address) => `https://eusolostats.ckpool.org/users/${address}`,
  'publicpool': (coin, address) => `https://web.public-pool.io/#/app;address=${address}`,
  'ocean': (coin, address) => `https://ocean.xyz/stats/${address}`
};

function getPoolUrl(pool, coin, address) {
  const urlFn = POOL_URLS[pool];
  if (urlFn) {
    return urlFn(coin.toLowerCase(), address);
  }
  return null;
}

const API_BASE = 'https://www.mineglance.com/api';

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
  const proBadge = document.getElementById('proBadge');
  const coinDiscovery = document.getElementById('coinDiscovery');
  const discoveryContent = document.getElementById('discoveryContent');
  const discoveryList = document.getElementById('discoveryList');
  const toggleDiscovery = document.getElementById('toggleDiscovery');
  const renewalBanner = document.getElementById('renewalBanner');
  const renewalMessage = document.getElementById('renewalMessage');
  const dismissRenewal = document.getElementById('dismissRenewal');
  const updateBanner = document.getElementById('updateBanner');
  const latestVersionText = document.getElementById('latestVersionText');
  const updateLink = document.getElementById('updateLink');
  const dismissUpdate = document.getElementById('dismissUpdate');

  // Auth Modal Elements
  const authModal = document.getElementById('authModal');
  const authEmailStep = document.getElementById('authEmailStep');
  const authPasswordStep = document.getElementById('authPasswordStep');
  const authEmail = document.getElementById('authEmail');
  const authPassword = document.getElementById('authPassword');
  const authPasswordInfo = document.getElementById('authPasswordInfo');
  const authContinueBtn = document.getElementById('authContinueBtn');
  const authPasswordBtn = document.getElementById('authPasswordBtn');
  const authBackBtn = document.getElementById('authBackBtn');
  const authMessage = document.getElementById('authMessage');

  // Buttons
  const settingsBtn = document.getElementById('settingsBtn');
  const addWalletBtn = document.getElementById('addWalletBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const upgradeBtn = document.getElementById('upgradeBtn');

  // Auth state
  let pendingEmail = '';
  let isNewUser = false;

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
    // Sync wallets and settings from database first, then fetch pool data
    await Promise.all([
      syncWalletsFromDatabase(),
      syncSettingsFromDatabase()
    ]);
    await fetchAllWalletData();
    refreshBtn.disabled = false;
    refreshBtn.textContent = 'Refresh';
  });

  upgradeBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: 'https://mineglance.com/#pricing' });
  });

  dismissRenewal.addEventListener('click', () => {
    renewalBanner.classList.add('hidden');
    chrome.storage.local.set({ renewalDismissed: true });
  });

  // Update dismiss handler
  dismissUpdate.addEventListener('click', () => {
    updateBanner.classList.add('hidden');
    // Store the dismissed version so we don't show again until a newer version
    chrome.storage.local.get(['latestDismissedVersion'], (result) => {
      const currentLatest = latestVersionText.textContent.replace('v', '');
      chrome.storage.local.set({ latestDismissedVersion: currentLatest });
    });
  });

  // Auth Modal Event Handlers
  authContinueBtn.addEventListener('click', handleEmailContinue);
  authEmail.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleEmailContinue();
  });

  authPasswordBtn.addEventListener('click', handlePasswordSubmit);
  authPassword.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handlePasswordSubmit();
  });

  authBackBtn.addEventListener('click', () => {
    authPasswordStep.classList.add('hidden');
    authEmailStep.classList.remove('hidden');
    authPassword.value = '';
    hideAuthMessage();
  });

  // Check for extension updates
  async function checkForUpdates() {
    try {
      const currentVersion = chrome.runtime.getManifest().version;
      const response = await fetch(`${API_BASE}/software/latest?platform=extension`);
      if (!response.ok) return;

      const data = await response.json();
      if (!data.version) return;

      // Compare versions
      const isNewer = compareVersions(data.version, currentVersion) > 0;
      if (!isNewer) return;

      // Check if user already dismissed this version
      const { latestDismissedVersion } = await chrome.storage.local.get(['latestDismissedVersion']);
      if (latestDismissedVersion && compareVersions(data.version, latestDismissedVersion) <= 0) {
        return; // Already dismissed this version
      }

      // Show update banner
      latestVersionText.textContent = `v${data.version}`;
      if (data.downloadUrl) {
        updateLink.href = data.downloadUrl;
      } else {
        // Fallback to Chrome Web Store
        updateLink.href = 'https://chromewebstore.google.com/detail/mineglance-mining-dashboa/idkfpdlpgeehohomaklljfnppfifhegn';
      }
      updateBanner.classList.remove('hidden');
    } catch (e) {
      console.log('Failed to check for updates:', e);
    }
  }

  // Compare semantic versions: returns 1 if a > b, -1 if a < b, 0 if equal
  function compareVersions(a, b) {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);

    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aVal = aParts[i] || 0;
      const bVal = bParts[i] || 0;
      if (aVal > bVal) return 1;
      if (aVal < bVal) return -1;
    }
    return 0;
  }

  async function handleEmailContinue() {
    const email = authEmail.value.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      showAuthMessage('Please enter a valid email', 'error');
      return;
    }

    pendingEmail = email;
    authContinueBtn.disabled = true;
    authContinueBtn.textContent = 'Checking...';
    hideAuthMessage();

    try {
      // Try to login with email only to check if user exists
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, instanceId: await getInstallId(), deviceType: 'extension' })
      });
      const data = await response.json();

      if (data.requiresPassword) {
        // Existing user - needs password
        isNewUser = false;
        authPasswordInfo.textContent = 'Enter your password to sign in';
        authPasswordBtn.textContent = 'Sign In';
        authEmailStep.classList.add('hidden');
        authPasswordStep.classList.remove('hidden');
      } else if (data.token) {
        // Login successful (shouldn't happen without password)
        await handleLoginSuccess(data);
      } else if (data.exists === false) {
        // New user - needs to create password
        isNewUser = true;
        authPasswordInfo.textContent = 'This is a new account, create a password.';
        authPasswordBtn.textContent = 'Create Account';
        authEmailStep.classList.add('hidden');
        authPasswordStep.classList.remove('hidden');
      } else {
        showAuthMessage(data.error || 'Login failed', 'error');
      }
    } catch (err) {
      showAuthMessage('Connection error. Please try again.', 'error');
    } finally {
      authContinueBtn.disabled = false;
      authContinueBtn.textContent = 'Continue';
    }
  }

  async function handlePasswordSubmit() {
    const password = authPassword.value.trim();
    if (!password || password.length < 6) {
      showAuthMessage('Password must be at least 6 characters', 'error');
      return;
    }

    authPasswordBtn.disabled = true;
    authPasswordBtn.textContent = isNewUser ? 'Creating...' : 'Signing in...';
    hideAuthMessage();

    try {
      if (isNewUser) {
        // Register new user with password
        await registerNewUser(pendingEmail, password);
      } else {
        // Login existing free user with password
        const response = await fetch(`${API_BASE}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: pendingEmail,
            password: password,
            instanceId: await getInstallId(),
            deviceType: 'extension',
            deviceName: navigator.userAgent.includes('Chrome') ? 'Chrome Extension' : 'Browser Extension',
            browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other',
            version: chrome.runtime.getManifest().version
          })
        });
        const data = await response.json();

        if (data.token) {
          await handleLoginSuccess(data);
        } else {
          showAuthMessage(data.error || 'Invalid password', 'error');
        }
      }
    } catch (err) {
      showAuthMessage('Connection error. Please try again.', 'error');
    } finally {
      authPasswordBtn.disabled = false;
      authPasswordBtn.textContent = isNewUser ? 'Create Account' : 'Sign In';
    }
  }

  async function handleLoginSuccess(data) {
    // Store auth data
    await chrome.storage.local.set({
      authToken: data.token,
      userId: data.userId,
      userEmail: data.email,
      plan: data.plan,
      isPaid: data.plan === 'pro',
      licenseKey: data.licenseKey || null,
      wallets: data.wallets || [],
      settings: data.settings || {}
    });

    // Hide auth modal and show dashboard
    authModal.classList.add('hidden');
    await initPopup();
  }

  async function registerNewUser(email, password) {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          instanceId: await getInstallId(),
          deviceType: 'extension',
          deviceName: navigator.userAgent.includes('Chrome') ? 'Chrome Extension' : 'Browser Extension',
          browser: navigator.userAgent.includes('Chrome') ? 'Chrome' : 'Other',
          version: chrome.runtime.getManifest().version
        })
      });
      const data = await response.json();

      if (data.token) {
        await handleLoginSuccess(data);
      } else if (data.requiresVerification) {
        // Registration succeeded - user needs to verify email
        showAuthMessage(data.message || 'Please check your email to verify your account', 'success');
        // Return to login screen after 10 seconds
        setTimeout(() => {
          hideAuthMessage();
          authPasswordStep.classList.add('hidden');
          authEmailStep.classList.remove('hidden');
          authEmail.value = '';
          authPassword.value = '';
          isNewUser = false;
        }, 10000);
      } else {
        showAuthMessage(data.error || 'Registration failed', 'error');
      }
    } catch (err) {
      showAuthMessage('Connection error. Please try again.', 'error');
    }
  }

  async function getInstallId() {
    let { installId } = await chrome.storage.local.get('installId');
    if (!installId) {
      installId = 'ext_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      await chrome.storage.local.set({ installId });
    }
    return installId;
  }

  function showAuthMessage(message, type) {
    authMessage.textContent = message;
    authMessage.className = `auth-message ${type}`;
    authMessage.classList.remove('hidden');
  }

  function hideAuthMessage() {
    authMessage.classList.add('hidden');
  }

  async function syncWalletsFromDatabase() {
    try {
      const { authToken } = await chrome.storage.local.get(['authToken']);
      if (!authToken) return;

      const response = await fetch(`${API_BASE}/wallets/sync`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.wallets) {
          await chrome.storage.local.set({ wallets: data.wallets });
          console.log('Wallets synced from database:', data.wallets.length);
        }
      } else {
        console.log('Wallet sync failed:', response.status);
      }
    } catch (err) {
      console.log('Wallet sync error:', err);
    }
  }

  // Sync settings from database to ensure parity across all devices
  async function syncSettingsFromDatabase() {
    try {
      const { authToken } = await chrome.storage.local.get(['authToken']);
      if (!authToken) return;

      const response = await fetch(`${API_BASE}/settings/sync`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.settings) {
          const s = data.settings;
          // Update local storage with server settings
          await chrome.storage.local.set({
            electricity: {
              rate: s.electricityRate || 0.12,
              currency: s.electricityCurrency || 'USD'
            },
            settings: {
              refreshInterval: s.refreshInterval || 30,
              showDiscovery: s.showDiscoveryCoins,
              liteMode: s.liteMode,
              notifications: {
                workerOffline: s.notifyWorkerOffline,
                profitDrop: s.notifyProfitDrop,
                profitDropThreshold: s.profitDropThreshold || 20,
                betterCoin: s.notifyBetterCoin,
                emailEnabled: s.emailAlertsEnabled,
                alertEmail: s.emailAlertsAddress || '',
                emailFrequency: s.emailFrequency || 'daily'
              }
            }
          });
          console.log('Settings synced from database');
        }
      } else {
        console.log('Settings sync failed:', response.status);
      }
    } catch (err) {
      console.log('Settings sync error:', err);
    }
  }

  async function verifyAuthToken(token) {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();

      if (!data.valid) {
        // Token expired or invalid - show auth modal
        await chrome.storage.local.remove(['authToken', 'userId', 'userEmail']);
        authModal.classList.remove('hidden');
        loading.classList.add('hidden');
        dashboard.classList.add('hidden');
      } else {
        // Update plan info and license key
        await chrome.storage.local.set({
          plan: data.plan,
          isPaid: data.plan === 'pro',
          licenseKey: data.licenseKey || null
        });
      }
    } catch (err) {
      // Network error - continue with cached data
      console.log('Token verification failed, using cached data');
    }
  }

  // Discovery toggle
  toggleDiscovery.addEventListener('click', async () => {
    const isCollapsed = discoveryContent.classList.toggle('collapsed');
    toggleDiscovery.classList.toggle('collapsed', isCollapsed);
    await chrome.storage.local.set({ discoveryCollapsed: isCollapsed });
  });

  // Blog Elements
  const blogSection = document.getElementById('blogSection');
  const blogLink = document.getElementById('blogLink');
  const blogImage = document.getElementById('blogImage');
  const blogTitle = document.getElementById('blogTitle');
  const blogDate = document.getElementById('blogDate');

  // Fetch and display blog post
  async function fetchBlogPost() {
    try {
      const res = await fetch(`${API_BASE}/blog?limit=1`);
      if (!res.ok) return;

      const data = await res.json();
      if (data.posts && data.posts.length > 0) {
        const post = data.posts[0];

        blogLink.href = `https://www.mineglance.com/blog/${post.slug}`;
        blogTitle.textContent = post.title;

        const date = new Date(post.published_at);
        blogDate.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' • ' + (post.read_time || 3) + ' min read';

        if (post.featured_image_url) {
          blogImage.style.backgroundImage = `url(${post.featured_image_url})`;
          blogImage.innerHTML = '';
        } else {
          blogImage.innerHTML = '📰';
        }

        blogSection.classList.remove('hidden');
      }
    } catch (err) {
      console.log('Blog fetch error:', err);
    }
  }

  // Resize handle for wallet list
  const resizeHandle = document.getElementById('resizeHandle');
  let isResizing = false;
  let startY = 0;
  let startHeight = 0;

  // Load saved height
  chrome.storage.local.get(['walletListHeight'], (result) => {
    if (result.walletListHeight) {
      walletList.style.maxHeight = result.walletListHeight + 'px';
      document.body.style.height = 'auto';
    }
  });

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startY = e.clientY;
    startHeight = walletList.offsetHeight;
    document.body.style.cursor = 'ns-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const deltaY = e.clientY - startY;
    // Limit to 300px max so coin discovery section stays visible
    const newHeight = Math.min(Math.max(startHeight + deltaY, 100), 300);
    walletList.style.maxHeight = newHeight + 'px';
  });

  document.addEventListener('mouseup', async () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = '';
      // Save the new height
      const currentHeight = parseInt(walletList.style.maxHeight) || 180;
      await chrome.storage.local.set({ walletListHeight: currentHeight });
    }
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

    // Load version from manifest
    const manifest = chrome.runtime.getManifest();
    const versionNumber = document.getElementById('versionNumber');
    if (versionNumber) {
      versionNumber.textContent = `v${manifest.version}`;
    }

    // Check for updates in the background
    checkForUpdates();

    try {
      let { authToken, wallets, isPaid, electricity, settings, discoveryCollapsed, plan } = await chrome.storage.local.get([
        'authToken',
        'wallets',
        'isPaid',
        'electricity',
        'settings',
        'discoveryCollapsed',
        'plan'
      ]);

      // Check if user is logged in
      if (!authToken) {
        // Show auth modal
        loading.classList.add('hidden');
        authModal.classList.remove('hidden');
        return;
      }

      // Verify token is still valid (non-blocking)
      verifyAuthToken(authToken);

      // Sync wallets and settings from database before displaying (blocking with timeout)
      await Promise.race([
        Promise.all([syncWalletsFromDatabase(), syncSettingsFromDatabase()]),
        new Promise(resolve => setTimeout(resolve, 3000)) // 3 second timeout
      ]);

      // Re-read wallets after sync
      const syncResult = await chrome.storage.local.get(['wallets']);
      wallets = syncResult.wallets || wallets;

      // Verify license with server (non-blocking, runs in background)
      if (isPaid) {
        chrome.runtime.sendMessage({ action: 'checkLicenseStatus' }, async (response) => {
          if (response && !response.isPro) {
            // License revoked - update UI
            proBadge.classList.add('hidden');
            upgradeBanner.classList.remove('hidden');
          } else if (response && response.plan) {
            // Update badge text based on plan
            proBadge.textContent = response.plan === 'pro' ? 'PRO' : 'PRO';
            chrome.storage.local.set({ plan: response.plan });

            // Check subscription expiry and show renewal banner if needed
            if (response.subscriptionEndDate) {
              const { renewalDismissed } = await chrome.storage.local.get(['renewalDismissed']);
              const endDate = new Date(response.subscriptionEndDate);
              const daysUntilExpiry = Math.ceil((endDate - Date.now()) / (1000 * 60 * 60 * 24));

              if (daysUntilExpiry <= 30 && !renewalDismissed) {
                if (daysUntilExpiry <= 0) {
                  renewalMessage.textContent = 'Your subscription has expired';
                  renewalBanner.classList.add('urgent');
                } else if (daysUntilExpiry <= 7) {
                  renewalMessage.textContent = `Subscription expires in ${daysUntilExpiry} days`;
                  renewalBanner.classList.add('urgent');
                } else {
                  renewalMessage.textContent = `Subscription expires in ${daysUntilExpiry} days`;
                }
                renewalBanner.classList.remove('hidden');
              }
            }
          }
        });
      }

      // Show upgrade banner for free users, or PRO badge for paid users
      if (!isPaid) {
        upgradeBanner.classList.remove('hidden');
      } else {
        proBadge.classList.remove('hidden');
        // Set badge text based on plan
        proBadge.textContent = plan === 'bundle' ? 'PRO+' : 'PRO';
      }

      // Show/hide discovery section based on settings
      const showDiscoverySetting = settings?.showDiscovery ?? true;
      if (showDiscoverySetting) {
        coinDiscovery.classList.remove('hidden');
        if (discoveryCollapsed) {
          discoveryContent.classList.add('collapsed');
          toggleDiscovery.classList.add('collapsed');
        }
        // Fetch discovery data
        fetchDiscoveryData();
      }

      // Fetch latest blog post
      fetchBlogPost();

      // Apply Lite Mode if enabled (dark is default)
      if (settings?.liteMode) {
        document.body.classList.add('lite-mode');
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

    const { wallets, electricity, isPaid } = await chrome.storage.local.get(['wallets', 'electricity', 'isPaid']);

    if (!wallets || wallets.length === 0) {
      showNoWallets();
      return;
    }

    let totalRevenue = 0;
    let totalElectricityCost = 0;
    const walletResults = [];

    const enabledWallets = wallets.filter(w => w.enabled);

    for (let i = 0; i < enabledWallets.length; i++) {
      const wallet = enabledWallets[i];

      // Free users only get 1 wallet - others are locked
      if (!isPaid && i > 0) {
        walletResults.push({
          wallet,
          locked: true
        });
        continue;
      }

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
        console.error('Wallet fetch error:', wallet.name, error);
        let errorMsg = error.message;
        if (error.message.includes('404') || error.message.includes('not found')) {
          errorMsg = 'Wallet not found on pool. Make sure you are mining to this address.';
        } else if (error.message.includes('Failed to fetch') || error.message.includes('network')) {
          errorMsg = 'Unable to connect to pool. Check your internet.';
        } else if (error.message.includes('error')) {
          errorMsg = 'Pool returned an error. Verify wallet address is correct.';
        }

        // Still try to get price data even if pool fails
        let price = 0;
        let priceChange24h = 0;
        try {
          const priceData = await fetchCoinPriceWithChange(wallet.coin);
          price = priceData.price || 0;
          priceChange24h = priceData.change24h || 0;
        } catch (e) {
          // Ignore price fetch errors
        }

        walletResults.push({
          wallet,
          error: errorMsg,
          price,
          priceChange24h
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

  // Fetch coin price with 24h change (with fallback to cached data)
  async function fetchCoinPriceWithChange(coinSymbol) {
    return new Promise(async (resolve) => {
      // Try to get cached price first as fallback
      const cacheKey = `price_${coinSymbol.toLowerCase()}`;
      const cacheChangeKey = `priceChange_${coinSymbol.toLowerCase()}`;
      const cached = await chrome.storage.local.get([cacheKey, cacheChangeKey]);

      chrome.runtime.sendMessage(
        { action: 'fetchCoinPriceWithChange', coin: coinSymbol },
        (response) => {
          const price = response?.price || cached[cacheKey] || 0;
          const change24h = response?.change24h || cached[cacheChangeKey] || 0;

          // Cache the new values if we got them
          if (response?.price > 0) {
            chrome.storage.local.set({
              [cacheKey]: response.price,
              [cacheChangeKey]: response.change24h || 0
            });
          }

          resolve({ price, change24h });
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

  function renderWallets(walletResults) {
    walletList.innerHTML = '';

    for (const result of walletResults) {
      const card = document.createElement('div');
      card.className = 'wallet-card';

      // Handle locked wallets (free users with 2+ wallets)
      if (result.locked) {
        card.classList.add('locked');
        card.innerHTML = `
          <div class="wallet-card-header">
            <div class="wallet-name">
              <span>${result.wallet.name || 'Wallet'}</span>
              <span class="wallet-coin">${result.wallet.coin.toUpperCase()}</span>
            </div>
            <div class="wallet-profit" style="color: var(--text-muted)">---</div>
          </div>
          <div style="text-align: center; padding: 12px 0;">
            <span style="font-size: 18px;">🔒</span>
            <p style="margin: 6px 0 0; font-size: 11px; color: var(--text-muted);">Upgrade to Pro to track multiple wallets</p>
          </div>
        `;
        walletList.appendChild(card);
        continue;
      }

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
