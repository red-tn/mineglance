// Formatting utilities for display

/**
 * Format hashrate to human-readable string
 */
export function formatHashrate(hashrate: number): string {
  if (hashrate >= 1e15) return `${(hashrate / 1e15).toFixed(2)} PH/s`;
  if (hashrate >= 1e12) return `${(hashrate / 1e12).toFixed(2)} TH/s`;
  if (hashrate >= 1e9) return `${(hashrate / 1e9).toFixed(2)} GH/s`;
  if (hashrate >= 1e6) return `${(hashrate / 1e6).toFixed(2)} MH/s`;
  if (hashrate >= 1e3) return `${(hashrate / 1e3).toFixed(2)} KH/s`;
  return `${hashrate.toFixed(2)} H/s`;
}

/**
 * Format currency amount
 */
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format coin amount with appropriate decimals
 */
export function formatCoinAmount(amount: number, decimals = 6): string {
  if (amount === 0) return '0';
  if (amount < 0.000001) return amount.toExponential(2);
  return amount.toFixed(decimals).replace(/\.?0+$/, '');
}

/**
 * Format relative time (e.g., "5 minutes ago")
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000; // Assuming timestamp is in seconds

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp * 1000).toLocaleDateString();
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Truncate wallet address for display
 */
export function truncateAddress(address: string, startChars = 8, endChars = 6): string {
  if (address.length <= startChars + endChars + 3) return address;
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}

/**
 * Format number with thousands separators
 */
export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Parse hashrate string to number (e.g., "100 GH/s" -> 100000000000)
 */
export function parseHashrateString(str: string): number {
  if (!str || typeof str !== 'string') return 0;

  const match = str.match(/^([\d.]+)\s*(\w+)/);
  if (!match) return parseFloat(str) || 0;

  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase().replace('/S', '');

  const multipliers: Record<string, number> = {
    'H': 1,
    'KH': 1e3,
    'MH': 1e6,
    'GH': 1e9,
    'TH': 1e12,
    'PH': 1e15,
    'EH': 1e18,
  };

  return value * (multipliers[unit] || 1);
}
