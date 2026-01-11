// Coin profitability data
// Earnings estimates based on current network conditions (updated periodically)
// Last updated: January 2026

export interface CoinData {
  symbol: string
  name: string
  algorithm: string
  // Daily USD earnings per hashrate unit
  // For GPU coins: per 1 MH/s
  // For ASIC coins: per 1 TH/s (sha256) or per 1 GH/s (scrypt, kheavyhash)
  dailyEarningsPerUnit: number
  hashrateUnit: string // 'MH/s', 'GH/s', 'TH/s'
  unitDivisor: number // hashrate / this = units for calculation
}

export const COINS: CoinData[] = [
  // GPU Mineable Coins
  {
    symbol: 'ETC',
    name: 'Ethereum Classic',
    algorithm: 'etchash',
    dailyEarningsPerUnit: 0.018, // $0.018 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'RVN',
    name: 'Ravencoin',
    algorithm: 'kawpow',
    dailyEarningsPerUnit: 0.012, // $0.012 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'ERG',
    name: 'Ergo',
    algorithm: 'autolykos2',
    dailyEarningsPerUnit: 0.008, // $0.008 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'KAS',
    name: 'Kaspa',
    algorithm: 'kheavyhash',
    dailyEarningsPerUnit: 0.0015, // $0.0015 per MH/s per day (GPU)
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'FLUX',
    name: 'Flux',
    algorithm: 'zelhash',
    dailyEarningsPerUnit: 0.015, // $0.015 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'FIRO',
    name: 'Firo',
    algorithm: 'firopow',
    dailyEarningsPerUnit: 0.025, // $0.025 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'NEXA',
    name: 'Nexa',
    algorithm: 'nexapow',
    dailyEarningsPerUnit: 0.00002, // $0.00002 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'ALPH',
    name: 'Alephium',
    algorithm: 'blake3',
    dailyEarningsPerUnit: 0.003, // $0.003 per GH/s per day
    hashrateUnit: 'GH/s',
    unitDivisor: 1_000_000_000,
  },
  {
    symbol: 'RTM',
    name: 'Raptoreum',
    algorithm: 'ghostrider',
    dailyEarningsPerUnit: 0.08, // $0.08 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  // ASIC Coins
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    algorithm: 'sha256',
    dailyEarningsPerUnit: 0.065, // $0.065 per TH/s per day
    hashrateUnit: 'TH/s',
    unitDivisor: 1_000_000_000_000,
  },
  {
    symbol: 'LTC',
    name: 'Litecoin',
    algorithm: 'scrypt',
    dailyEarningsPerUnit: 0.08, // $0.08 per GH/s per day
    hashrateUnit: 'GH/s',
    unitDivisor: 1_000_000_000,
  },
  {
    symbol: 'DOGE',
    name: 'Dogecoin',
    algorithm: 'scrypt',
    dailyEarningsPerUnit: 0.06, // $0.06 per GH/s per day (merge mined with LTC)
    hashrateUnit: 'GH/s',
    unitDivisor: 1_000_000_000,
  },
  {
    symbol: 'KDA',
    name: 'Kadena',
    algorithm: 'kadena',
    dailyEarningsPerUnit: 0.0008, // $0.0008 per TH/s per day
    hashrateUnit: 'TH/s',
    unitDivisor: 1_000_000_000_000,
  },
]

/**
 * Get coins that can be mined with a specific algorithm
 */
export function getCoinsForAlgorithm(algorithm: string): CoinData[] {
  return COINS.filter(c => c.algorithm === algorithm)
}

/**
 * Get coin by symbol
 */
export function getCoinBySymbol(symbol: string): CoinData | undefined {
  return COINS.find(c => c.symbol === symbol)
}

/**
 * Calculate daily earnings for given hashrate and coin
 */
export function calculateDailyEarnings(hashrate: number, coin: CoinData): number {
  const units = hashrate / coin.unitDivisor
  return units * coin.dailyEarningsPerUnit
}

/**
 * Calculate profit after electricity
 */
export interface ProfitResult {
  dailyGross: number
  dailyElectricity: number
  dailyNet: number
  monthlyGross: number
  monthlyElectricity: number
  monthlyNet: number
  isProfitable: boolean
  roiDays: number | null
}

export function calculateProfit(
  hashrate: number,
  coin: CoinData,
  powerWatts: number,
  electricityRate: number, // $/kWh
  hardwareCost?: number
): ProfitResult {
  // Daily earnings
  const dailyGross = calculateDailyEarnings(hashrate, coin)

  // Daily electricity cost
  const dailyKwh = (powerWatts / 1000) * 24
  const dailyElectricity = dailyKwh * electricityRate

  // Net profit
  const dailyNet = dailyGross - dailyElectricity

  // Monthly projections
  const monthlyGross = dailyGross * 30
  const monthlyElectricity = dailyElectricity * 30
  const monthlyNet = dailyNet * 30

  // ROI calculation
  const roiDays = dailyNet > 0 && hardwareCost
    ? Math.ceil(hardwareCost / dailyNet)
    : null

  return {
    dailyGross,
    dailyElectricity,
    dailyNet,
    monthlyGross,
    monthlyElectricity,
    monthlyNet,
    isProfitable: dailyNet > 0,
    roiDays,
  }
}

/**
 * Get algorithms available for hardware type
 */
export function getAlgorithmsForType(type: 'gpu' | 'asic'): string[] {
  if (type === 'gpu') {
    return ['etchash', 'kawpow', 'autolykos2', 'kheavyhash', 'zelhash', 'firopow', 'blake3', 'ghostrider']
  }
  return ['sha256', 'scrypt', 'kheavyhash', 'kadena', 'etchash']
}

/**
 * Get coins available for hardware type
 */
export function getCoinsForHardwareType(type: 'gpu' | 'asic'): CoinData[] {
  const algorithms = getAlgorithmsForType(type)
  return COINS.filter(c => algorithms.includes(c.algorithm))
}
