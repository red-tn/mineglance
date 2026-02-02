// Pool minimum payout thresholds
// Used for payout prediction calculations
// Values in native coin units

export const POOL_THRESHOLDS: Record<string, Record<string, number>> = {
  '2miners': {
    etc: 0.1,
    rvn: 10,
    ergo: 0.5,
    flux: 1,
    kas: 100,
    alph: 0.1,
    nexa: 10000,
    xna: 1,
    rtm: 10,
    ctxc: 1,
    clore: 1,
    dnx: 0.5,
    zil: 50,
    btc: 0.0005, // solo pool
  },
  nanopool: {
    etc: 0.05,
    rvn: 10,
    ergo: 1,
    cfx: 1,
    xmr: 0.1,
    zec: 0.01,
  },
  f2pool: {
    etc: 0.1,
    rvn: 10,
    kas: 100,
    alph: 0.1,
    ckb: 100,
    hns: 10,
    sc: 100,
    btc: 0.001,
  },
  ethermine: {
    etc: 0.1,
  },
  hiveon: {
    etc: 0.1,
    rvn: 10,
  },
  herominers: {
    etc: 0.1,
    rvn: 10,
    ergo: 0.5,
    flux: 1,
    kas: 100,
    xmr: 0.1,
    rtm: 10,
    neox: 1,
    xna: 1000,
  },
  woolypooly: {
    etc: 0.1,
    rvn: 10,
    ergo: 0.5,
    flux: 1,
    kas: 100,
    alph: 0.1,
    cfx: 1,
    ctxc: 1,
    xna: 1000,
  },
  'cedric-crispin': {
    firo: 0.1,
  },
  ckpool: {
    btc: 0.001, // solo - no threshold, but estimated
  },
  'ckpool-eu': {
    btc: 0.001,
  },
  'public-pool': {
    btc: 0.001,
  },
  ocean: {
    btc: 0.0001,
  },
}

// Get threshold for a specific pool and coin
export function getPoolThreshold(pool: string, coin: string): number | null {
  const poolLower = pool.toLowerCase()
  const coinLower = coin.toLowerCase()

  const poolData = POOL_THRESHOLDS[poolLower]
  if (!poolData) return null

  return poolData[coinLower] ?? null
}

// Calculate estimated time to payout
export function calculatePayoutEstimate(
  currentBalance: number,
  dailyEarnings: number,
  threshold: number
): { hours: number; ready: boolean; formatted: string } {
  // Already at threshold
  if (currentBalance >= threshold) {
    return { hours: 0, ready: true, formatted: 'Ready!' }
  }

  // No earnings data
  if (!dailyEarnings || dailyEarnings <= 0) {
    return { hours: Infinity, ready: false, formatted: 'N/A' }
  }

  const remaining = threshold - currentBalance
  const hoursToEarn = (remaining / dailyEarnings) * 24

  if (hoursToEarn < 1) {
    return { hours: hoursToEarn, ready: false, formatted: '<1h' }
  } else if (hoursToEarn < 24) {
    return { hours: hoursToEarn, ready: false, formatted: `~${Math.ceil(hoursToEarn)}h` }
  } else if (hoursToEarn < 168) { // Less than a week
    const days = Math.ceil(hoursToEarn / 24)
    return { hours: hoursToEarn, ready: false, formatted: `~${days}d` }
  } else {
    const weeks = Math.ceil(hoursToEarn / 168)
    return { hours: hoursToEarn, ready: false, formatted: `~${weeks}w` }
  }
}

// Calculate payout progress percentage
export function calculatePayoutProgress(currentBalance: number, threshold: number): number {
  if (threshold <= 0) return 0
  const progress = (currentBalance / threshold) * 100
  return Math.min(progress, 100) // Cap at 100%
}
