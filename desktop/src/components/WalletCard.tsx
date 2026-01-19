import { useWalletStore, Wallet } from "../stores/walletStore";
import { ExternalLink, AlertTriangle } from "lucide-react";

interface WalletCardProps {
  wallet: Wallet;
  index: number;
}

export default function WalletCard({ wallet, index }: WalletCardProps) {
  const { getWalletStats } = useWalletStore();
  const stats = getWalletStats(wallet.id);

  const getPoolUrl = () => {
    // Generate pool dashboard URL based on pool and coin
    const poolUrls: Record<string, string> = {
      "2miners": `https://${wallet.coin.toLowerCase()}.2miners.com/account/${wallet.address}`,
      nanopool: `https://${wallet.coin.toLowerCase()}.nanopool.org/account/${wallet.address}`,
      f2pool: `https://www.f2pool.com/${wallet.coin.toLowerCase()}/${wallet.address}`,
      ethermine: `https://${wallet.coin.toLowerCase()}.ethermine.org/miner/${wallet.address}`,
      hiveon: `https://hiveon.net/${wallet.coin.toLowerCase()}/${wallet.address}`,
      herominers: `https://${wallet.coin.toLowerCase()}.herominers.com/#miner-stats&params=${wallet.address}`,
      woolypooly: `https://woolypooly.com/${wallet.coin.toLowerCase()}/${wallet.address}`,
    };
    return poolUrls[wallet.pool.toLowerCase()] || "#";
  };

  const formatHashrate = (hashrate: number, unit: string) => {
    return `${hashrate.toFixed(2)} ${unit}`;
  };

  const formatCurrency = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}$${Math.abs(value).toFixed(2)}`;
  };

  return (
    <a
      href={getPoolUrl()}
      target="_blank"
      rel="noopener noreferrer"
      className={`block bg-[var(--card-bg)] rounded-xl p-4 border border-[var(--border)] hover:border-primary hover:shadow-md transition-all animate-fade-in group ${
        stats?.error ? "border-warning bg-warning/5" : ""
      }`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-[var(--text)]">{wallet.name}</span>
          <span className="coin-badge">{wallet.coin}</span>
          <ExternalLink
            size={14}
            className="text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity"
          />
        </div>
        <span
          className={`font-bold text-lg font-mono ${
            (stats?.dailyProfit || 0) >= 0 ? "profit-positive" : "profit-negative"
          }`}
        >
          {stats ? formatCurrency(stats.dailyProfit) : "--"}
        </span>
      </div>

      {/* Error State */}
      {stats?.error && (
        <div className="flex items-center gap-2 text-sm text-warning bg-warning/10 rounded-lg p-2 mb-3">
          <AlertTriangle size={14} />
          <span>{stats.error}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4 bg-[var(--bg)] rounded-lg p-3">
        <div className="text-center">
          <p className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
            Hashrate
          </p>
          <p className="font-semibold font-mono text-sm text-[var(--text)]">
            {stats ? formatHashrate(stats.hashrate, stats.hashrateUnit) : "--"}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
            Workers
          </p>
          <p className="font-semibold font-mono text-sm">
            <span className={stats?.workersOnline ? "text-primary" : "text-[var(--text)]"}>
              {stats?.workersOnline ?? "--"}
            </span>
            {stats && stats.workersOffline > 0 && (
              <span className="text-danger">/{stats.workersOffline}</span>
            )}
          </p>
        </div>
        <div className="text-center">
          <p className="text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-semibold mb-1">
            Balance
          </p>
          <p className="font-semibold font-mono text-sm text-[var(--text)]">
            {stats ? `${stats.balance.toFixed(6)}` : "--"}
          </p>
        </div>
      </div>

      {/* Balance Ribbon */}
      {stats && !stats.error && (
        <div className="mt-3 flex justify-between items-center bg-primary/10 border border-primary/30 rounded-lg p-2 text-xs">
          <div className="text-center flex-1">
            <p className="text-[7px] uppercase tracking-wider opacity-70">Pending</p>
            <p className="font-bold font-mono">
              {stats.pendingBalance?.toFixed(6) ?? "0.000000"}
            </p>
          </div>
          <div className="w-px h-6 bg-white/20" />
          <div className="text-center flex-1">
            <p className="text-[7px] uppercase tracking-wider opacity-70">USD Value</p>
            <p className="font-bold font-mono text-primary">${stats.balanceUSD.toFixed(2)}</p>
          </div>
          <div className="w-px h-6 bg-white/20" />
          <div className="text-center flex-1">
            <p className="text-[7px] uppercase tracking-wider opacity-70">Daily Rev</p>
            <p className={`font-bold font-mono ${stats.dailyRevenue >= 0 ? "text-primary" : "text-danger"}`}>
              ${stats.dailyRevenue.toFixed(2)}
            </p>
          </div>
        </div>
      )}
    </a>
  );
}
