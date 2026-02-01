import { useEffect, useState, useMemo } from "react";
import { useWalletStore } from "../stores/walletStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useAuthStore } from "../stores/authStore";
import { RefreshCw, TrendingUp, TrendingDown, Zap, ExternalLink, Newspaper, Coins, Flame, Users } from "lucide-react";
import WalletCard from "../components/WalletCard";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  published_at: string;
  image_url?: string;
}

interface MinableCoin {
  symbol: string;
  name: string;
  algorithm: string;
  profitPerDay: number;
  change24h: number;
  isNew: boolean;
  isHot: boolean;
}

export default function Dashboard() {
  const { wallets, isLoading, lastRefresh, syncWallets, refreshStats, getTotalProfit, getTotalRevenue } = useWalletStore();
  const { electricityCost } = useSettingsStore();
  const { user, token } = useAuthStore();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loadingBlog, setLoadingBlog] = useState(true);
  const [minableCoins, setMinableCoins] = useState<MinableCoin[]>([]);
  const [loadingCoins, setLoadingCoins] = useState(true);
  const [coinsTab, setCoinsTab] = useState<'trending' | 'top' | 'new'>('trending');

  // Sync wallets from server on mount
  useEffect(() => {
    if (token) {
      syncWallets();
    }
  }, [token, syncWallets]);

  // Fetch blog posts
  useEffect(() => {
    async function fetchBlog() {
      try {
        const response = await fetch('https://www.mineglance.com/api/blog?limit=3');
        if (response.ok) {
          const data = await response.json();
          setBlogPosts(data.posts || []);
        }
      } catch (error) {
        console.error('Failed to fetch blog:', error);
      } finally {
        setLoadingBlog(false);
      }
    }
    fetchBlog();
  }, []);

  // Fetch minable coins data from WhatToMine
  useEffect(() => {
    async function fetchMinableCoins() {
      try {
        const response = await fetch('https://whattomine.com/coins.json');
        if (!response.ok) throw new Error('Failed to fetch');

        const data = await response.json();

        // Map known coins
        const knownCoins: Record<string, { name: string; symbol: string }> = {
          'etc': { name: 'Ethereum Classic', symbol: 'ETC' },
          'rvn': { name: 'Ravencoin', symbol: 'RVN' },
          'erg': { name: 'Ergo', symbol: 'ERG' },
          'flux': { name: 'Flux', symbol: 'FLUX' },
          'kas': { name: 'Kaspa', symbol: 'KAS' },
          'nexa': { name: 'Nexa', symbol: 'NEXA' },
          'alph': { name: 'Alephium', symbol: 'ALPH' },
          'xmr': { name: 'Monero', symbol: 'XMR' },
          'firo': { name: 'Firo', symbol: 'FIRO' },
          'rtm': { name: 'Raptoreum', symbol: 'RTM' },
          'xna': { name: 'Neurai', symbol: 'XNA' },
          'cfx': { name: 'Conflux', symbol: 'CFX' },
          'btg': { name: 'Bitcoin Gold', symbol: 'BTG' },
          'beam': { name: 'Beam', symbol: 'BEAM' },
          'zec': { name: 'Zcash', symbol: 'ZEC' },
        };

        const newCoins = ['xna', 'nexa', 'alph', 'kas', 'firo'];
        const coins: MinableCoin[] = [];

        if (data.coins) {
          for (const [, coin] of Object.entries(data.coins) as [string, any][]) {
            const tag = coin.tag?.toLowerCase();
            if (!tag || !knownCoins[tag]) continue;

            const profitability = parseFloat(coin.profitability) || 0;
            if (profitability <= 0) continue;

            coins.push({
              symbol: coin.tag,
              name: knownCoins[tag].name,
              algorithm: coin.algorithm || 'Unknown',
              profitPerDay: profitability / 100, // Normalize
              change24h: (profitability - 100), // Relative to 100%
              isNew: newCoins.includes(tag),
              isHot: profitability > 120
            });
          }
        }

        // Sort by profitability
        coins.sort((a, b) => b.profitPerDay - a.profitPerDay);
        setMinableCoins(coins.slice(0, 12)); // Top 12 coins
      } catch (error) {
        console.error('Failed to fetch minable coins:', error);
        // Use fallback data
        setMinableCoins([
          { symbol: 'KAS', name: 'Kaspa', algorithm: 'kHeavyHash', profitPerDay: 2.50, change24h: 5.2, isNew: true, isHot: true },
          { symbol: 'RVN', name: 'Ravencoin', algorithm: 'KAWPOW', profitPerDay: 1.20, change24h: 2.1, isNew: false, isHot: false },
          { symbol: 'ETC', name: 'Ethereum Classic', algorithm: 'Etchash', profitPerDay: 1.80, change24h: -1.5, isNew: false, isHot: false },
          { symbol: 'FLUX', name: 'Flux', algorithm: 'ZelHash', profitPerDay: 1.10, change24h: 3.8, isNew: false, isHot: false },
          { symbol: 'ERG', name: 'Ergo', algorithm: 'Autolykos2', profitPerDay: 0.95, change24h: 1.2, isNew: false, isHot: false },
          { symbol: 'ALPH', name: 'Alephium', algorithm: 'Blake3', profitPerDay: 1.50, change24h: 8.5, isNew: true, isHot: true },
        ]);
      } finally {
        setLoadingCoins(false);
      }
    }
    fetchMinableCoins();
  }, []);

  useEffect(() => {
    if (wallets.length > 0) {
      refreshStats();
    }
  }, [wallets, refreshStats]);

  const totalProfit = getTotalProfit();
  const totalRevenue = getTotalRevenue();
  const enabledWallets = wallets.filter((w) => w.enabled);

  // Calculate total electricity cost
  const totalPower = wallets.reduce((sum, w) => sum + (w.power || 0), 0);
  const dailyElectricityCost = (totalPower / 1000) * 24 * electricityCost;

  const handleRefresh = () => {
    refreshStats();
  };

  const formatCurrency = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  };

  const formatTime = (date: Date | null) => {
    if (!date) return "--";
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Helper to convert hashrate to base H/s
  const normalizeHashrate = (value: number, unit: string): number => {
    const multipliers: Record<string, number> = {
      'H/s': 1,
      'KH/s': 1e3,
      'MH/s': 1e6,
      'GH/s': 1e9,
      'TH/s': 1e12,
      'PH/s': 1e15,
    };
    return value * (multipliers[unit] || 1);
  };

  // Helper to format hashrate with appropriate unit
  const formatHashrate = (hashesPerSec: number): string => {
    if (hashesPerSec === 0) return '0 H/s';
    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s', 'PH/s'];
    let unitIndex = 0;
    let value = hashesPerSec;
    while (value >= 1000 && unitIndex < units.length - 1) {
      value /= 1000;
      unitIndex++;
    }
    return `${value.toFixed(2)} ${units[unitIndex]}`;
  };

  // Calculate aggregate stats from all enabled wallets
  const aggregateStats = useMemo(() => {
    const { stats } = useWalletStore.getState();
    let totalHashrateNormalized = 0;
    let workersOnline = 0;
    let workersTotal = 0;

    enabledWallets.forEach((wallet) => {
      const walletStats = stats.get(wallet.id);
      if (walletStats) {
        totalHashrateNormalized += normalizeHashrate(walletStats.hashrate || 0, walletStats.hashrateUnit || 'H/s');
        workersOnline += walletStats.workersOnline || 0;
        workersTotal += (walletStats.workersOnline || 0) + (walletStats.workersOffline || 0);
      }
    });

    return {
      totalHashrate: formatHashrate(totalHashrateNormalized),
      workersOnline,
      workersTotal,
      workersAllOnline: workersTotal > 0 && workersOnline === workersTotal,
    };
  }, [enabledWallets, lastRefresh]);

  return (
    <div className="space-y-6">
      {/* Summary Stats Grid */}
      <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border)] overflow-hidden">
        <div className="grid grid-cols-3 divide-x divide-[var(--border)]">
          {/* Net Profit */}
          <div className="p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
              Net Profit
            </p>
            <p
              className={`text-2xl font-extrabold font-mono tracking-tight ${
                totalProfit >= 0 ? "profit-positive" : "profit-negative"
              }`}
            >
              {formatCurrency(totalProfit)}
            </p>
            <div className="flex justify-center gap-3 mt-2 text-xs">
              <span className="flex items-center gap-1 text-primary">
                <TrendingUp size={10} />
                ${totalRevenue.toFixed(2)}
              </span>
              <span className="flex items-center gap-1 text-danger">
                <TrendingDown size={10} />
                ${dailyElectricityCost.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Hashrate */}
          <div className="p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
              Hashrate
            </p>
            <p className="text-2xl font-extrabold font-mono tracking-tight text-[var(--text)]">
              {aggregateStats.totalHashrate}
            </p>
            <p className="text-xs text-[var(--text-muted)] mt-2 flex items-center justify-center gap-1">
              <Zap size={10} className="text-yellow-500" />
              {totalPower.toLocaleString()} W
            </p>
          </div>

          {/* Workers */}
          <div className="p-4 text-center">
            <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
              Workers
            </p>
            <p className="text-2xl font-extrabold font-mono tracking-tight text-[var(--text)]">
              {aggregateStats.workersOnline}/{aggregateStats.workersTotal}
            </p>
            <p className={`text-xs mt-2 flex items-center justify-center gap-1 ${
              aggregateStats.workersAllOnline ? 'text-primary' : 'text-yellow-500'
            }`}>
              <Users size={10} />
              {aggregateStats.workersAllOnline
                ? 'All online'
                : `${aggregateStats.workersTotal - aggregateStats.workersOnline} offline`}
            </p>
          </div>
        </div>
      </div>

      {/* Upgrade Banner for Free Users */}
      {user?.plan === "free" && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Zap className="text-primary" size={20} />
            </div>
            <div>
              <p className="font-medium text-[var(--text)]">Unlock Unlimited Wallets</p>
              <p className="text-sm text-[var(--text-muted)]">
                Upgrade to Pro for unlimited wallets & cloud sync
              </p>
            </div>
          </div>
          <a
            href="https://mineglance.com/#pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-all shadow-glow flex items-center gap-2"
          >
            Upgrade to Pro
            <ExternalLink size={14} />
          </a>
        </div>
      )}

      {/* Wallet List Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--text)]">
          Wallets ({enabledWallets.length})
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-[var(--text-muted)]">
            Last updated: {formatTime(lastRefresh)}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="p-2 rounded-lg bg-[var(--card-bg)] border border-[var(--border)] hover:bg-[var(--card-hover)] text-[var(--text-muted)] hover:text-[var(--text)] transition-all disabled:opacity-50"
          >
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && wallets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-[var(--text-muted)]">
          <div className="spinner mb-4" />
          <p>Loading wallets...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && wallets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 bg-[var(--card-bg)] rounded-xl border border-[var(--border)]">
          <div className="text-5xl mb-4">💰</div>
          <p className="text-lg text-[var(--text-muted)] mb-4">No wallets configured</p>
          <a
            href="/wallets"
            className="px-6 py-3 bg-primary hover:bg-primary-light text-white font-semibold rounded-lg transition-all shadow-glow"
          >
            Add Wallet
          </a>
        </div>
      )}

      {/* Wallet Cards */}
      <div className="space-y-4">
        {enabledWallets.map((wallet, index) => (
          <WalletCard key={wallet.id} wallet={wallet} index={index} />
        ))}
      </div>

      {/* Disabled Wallets */}
      {wallets.filter((w) => !w.enabled).length > 0 && (
        <div className="pt-4 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--text-muted)] mb-3">
            Disabled ({wallets.filter((w) => !w.enabled).length})
          </p>
          <div className="space-y-2 opacity-50">
            {wallets
              .filter((w) => !w.enabled)
              .map((wallet) => (
                <div
                  key={wallet.id}
                  className="bg-[var(--card-bg)] rounded-lg p-3 border border-[var(--border)] flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-medium text-[var(--text)]">{wallet.name}</span>
                    <span className="coin-badge">{wallet.coin}</span>
                  </div>
                  <span className="text-xs text-[var(--text-dim)]">{wallet.pool}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Minable Coins Section */}
      <div className="pt-6 border-t border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
            <Coins size={20} className="text-primary" />
            Minable Coins
          </h2>
          <div className="flex gap-1 bg-[var(--card-bg)] border border-[var(--border)] rounded-lg p-1">
            {(['trending', 'top', 'new'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setCoinsTab(tab)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  coinsTab === tab
                    ? 'bg-primary text-white'
                    : 'text-[var(--text-muted)] hover:text-[var(--text)]'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loadingCoins ? (
          <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
            <div className="spinner" />
          </div>
        ) : minableCoins.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)]">
            No coin data available
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {minableCoins
              .filter(coin => {
                if (coinsTab === 'new') return coin.isNew;
                if (coinsTab === 'trending') return Math.abs(coin.change24h) > 3 || coin.isHot;
                return true; // top shows all sorted by profitability
              })
              .slice(0, 6)
              .map((coin) => (
                <div
                  key={coin.symbol}
                  className="bg-[var(--card-bg)] rounded-lg p-3 border border-[var(--border)] hover:border-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[var(--text)]">{coin.symbol}</span>
                      {coin.isHot && (
                        <Flame size={12} className="text-orange-500" />
                      )}
                      {coin.isNew && (
                        <span className="px-1.5 py-0.5 bg-primary/20 text-primary text-[10px] font-semibold rounded">NEW</span>
                      )}
                    </div>
                    <span className={`text-xs font-medium ${coin.change24h >= 0 ? 'text-primary' : 'text-danger'}`}>
                      {coin.change24h >= 0 ? '+' : ''}{coin.change24h.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-muted)] truncate">{coin.algorithm}</p>
                  <p className="text-sm font-semibold text-primary mt-1">${coin.profitPerDay.toFixed(2)}/day</p>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Blog Posts Section */}
      <div className="pt-6 border-t border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[var(--text)] flex items-center gap-2">
            <Newspaper size={20} className="text-primary" />
            Mining in the News
          </h2>
          <a
            href="https://mineglance.com/blog"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            View all <ExternalLink size={12} />
          </a>
        </div>

        {loadingBlog ? (
          <div className="flex items-center justify-center py-8 text-[var(--text-muted)]">
            <div className="spinner" />
          </div>
        ) : blogPosts.length === 0 ? (
          <div className="text-center py-8 text-[var(--text-muted)]">
            No blog posts available
          </div>
        ) : (
          <div className="grid gap-4">
            {blogPosts.map((post) => (
              <a
                key={post.id}
                href={`https://mineglance.com/blog/${post.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--border)] hover:border-primary/50 transition-all group"
              >
                <div className="flex gap-4">
                  {post.image_url && (
                    <img
                      src={post.image_url}
                      alt={post.title}
                      className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-[var(--text)] group-hover:text-primary transition-colors line-clamp-2">
                      {post.title}
                    </h3>
                    <p className="text-sm text-[var(--text-muted)] mt-1 line-clamp-2">
                      {post.excerpt}
                    </p>
                    <p className="text-xs text-[var(--text-dim)] mt-2">
                      {new Date(post.published_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
