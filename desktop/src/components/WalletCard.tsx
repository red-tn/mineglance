import { useWalletStore, Wallet } from "../stores/walletStore";
import { ExternalLink, AlertTriangle } from "lucide-react";

// Pool minimum payout thresholds
const POOL_THRESHOLDS: Record<string, Record<string, number>> = {
  "2miners": { etc: 0.1, rvn: 10, ergo: 0.5, flux: 1, kas: 100, alph: 0.1, nexa: 10000, xna: 1, rtm: 10, ctxc: 1, clore: 1, dnx: 0.5, zil: 50, btc: 0.0005 },
  nanopool: { etc: 0.05, rvn: 10, ergo: 1, cfx: 1, xmr: 0.1, zec: 0.01 },
  f2pool: { etc: 0.1, rvn: 10, kas: 100, alph: 0.1, ckb: 100, hns: 10, sc: 100, btc: 0.001 },
  ethermine: { etc: 0.1 },
  hiveon: { etc: 0.1, rvn: 10 },
  herominers: { etc: 0.1, rvn: 10, ergo: 0.5, flux: 1, kas: 100, xmr: 0.1, rtm: 10, neox: 1 },
  woolypooly: { etc: 0.1, rvn: 10, ergo: 0.5, flux: 1, kas: 100, alph: 0.1, cfx: 1, ctxc: 1 },
  cedriccrispin: { firo: 0.1 },
  ckpool: { btc: 0.001 },
  "ckpool-eu": { btc: 0.001 },
  publicpool: { btc: 0.001 },
  ocean: { btc: 0.0001 },
};

function getPoolThreshold(pool: string, coin: string): number | null {
  return POOL_THRESHOLDS[pool.toLowerCase()]?.[coin.toLowerCase()] ?? null;
}

function calculatePayoutEstimate(
  currentBalance: number,
  dailyEarnings: number,
  threshold: number
): { hours: number; ready: boolean; formatted: string; progress: number } {
  const progress = Math.min((currentBalance / threshold) * 100, 100);

  if (currentBalance >= threshold) {
    return { hours: 0, ready: true, formatted: "Ready!", progress: 100 };
  }
  if (!dailyEarnings || dailyEarnings <= 0) {
    return { hours: Infinity, ready: false, formatted: "N/A", progress };
  }

  const remaining = threshold - currentBalance;
  const hoursToEarn = (remaining / dailyEarnings) * 24;

  if (hoursToEarn < 1) {
    return { hours: hoursToEarn, ready: false, formatted: "<1h", progress };
  } else if (hoursToEarn < 24) {
    return { hours: hoursToEarn, ready: false, formatted: `~${Math.ceil(hoursToEarn)}h`, progress };
  } else if (hoursToEarn < 168) {
    const days = Math.ceil(hoursToEarn / 24);
    return { hours: hoursToEarn, ready: false, formatted: `~${days}d`, progress };
  } else {
    const weeks = Math.ceil(hoursToEarn / 168);
    return { hours: hoursToEarn, ready: false, formatted: `~${weeks}w`, progress };
  }
}

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

  const formatHashrate = (hashrate: number) => {
    if (!hashrate || hashrate === 0) return '0 H/s';

    const units = ['H/s', 'KH/s', 'MH/s', 'GH/s', 'TH/s'];
    let unitIndex = 0;
    let value = hashrate;

    while (value >= 1000 && unitIndex < units.length - 1) {
      value /= 1000;
      unitIndex++;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
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
            {stats ? formatHashrate(stats.hashrate) : "--"}
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

      {/* Payout Prediction (Pro feature) */}
      {stats && !stats.error && wallet.payoutPredictionEnabled && (() => {
        const threshold = getPoolThreshold(wallet.pool, wallet.coin);
        if (!threshold) return null;

        const dailyEarnings = stats.dailyEarnings || 0;
        const payout = calculatePayoutEstimate(stats.balance, dailyEarnings, threshold);
        const progressColor = payout.ready ? "#38a169" : payout.progress > 75 ? "#ecc94b" : "var(--primary)";

        return (
          <div className="mt-2 p-2 bg-[var(--bg)] rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">Payout Progress</span>
              <span className={`text-xs font-bold ${payout.ready ? "text-primary" : "text-[var(--text)]"}`}>
                {payout.formatted}
              </span>
            </div>
            <div className="h-1 bg-[var(--border)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${payout.progress}%`, backgroundColor: progressColor }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[8px] text-[var(--text-dim)]">{stats.balance.toFixed(4)}</span>
              <span className="text-[8px] text-[var(--text-dim)]">{threshold} {wallet.coin.toUpperCase()}</span>
            </div>
          </div>
        );
      })()}
    </a>
  );
}
