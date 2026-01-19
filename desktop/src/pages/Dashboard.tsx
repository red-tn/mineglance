import { useEffect, useState } from "react";
import { useWalletStore } from "../stores/walletStore";
import { useSettingsStore } from "../stores/settingsStore";
import { useAuthStore } from "../stores/authStore";
import { RefreshCw, TrendingUp, TrendingDown, Zap, ExternalLink, Newspaper } from "lucide-react";
import WalletCard from "../components/WalletCard";

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  published_at: string;
  image_url?: string;
}

export default function Dashboard() {
  const { wallets, isLoading, lastRefresh, syncWallets, refreshStats, getTotalProfit, getTotalRevenue } = useWalletStore();
  const { electricityCost } = useSettingsStore();
  const { user, token } = useAuthStore();
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loadingBlog, setLoadingBlog] = useState(true);

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

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className="bg-[var(--card-bg)] rounded-xl p-6 border border-[var(--border)]">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
            Daily Net Profit
          </p>
          <p
            className={`text-4xl font-extrabold font-mono tracking-tight ${
              totalProfit >= 0 ? "profit-positive" : "profit-negative"
            }`}
          >
            {formatCurrency(totalProfit)}
          </p>
          <div className="flex justify-center gap-4 mt-3 text-sm">
            <span className="flex items-center gap-1 text-primary">
              <TrendingUp size={14} />
              ${totalRevenue.toFixed(2)} revenue
            </span>
            <span className="flex items-center gap-1 text-danger">
              <TrendingDown size={14} />
              ${dailyElectricityCost.toFixed(2)} electricity
            </span>
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
            Upgrade $59
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
