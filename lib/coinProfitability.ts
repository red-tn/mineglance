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
  // GPU Mineable Coins - Etchash
  {
    symbol: 'ETC',
    name: 'Ethereum Classic',
    algorithm: 'etchash',
    dailyEarningsPerUnit: 0.018, // $0.018 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'CLO',
    name: 'Callisto',
    algorithm: 'etchash',
    dailyEarningsPerUnit: 0.004, // $0.004 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  // GPU Mineable Coins - KawPow
  {
    symbol: 'RVN',
    name: 'Ravencoin',
    algorithm: 'kawpow',
    dailyEarningsPerUnit: 0.012, // $0.012 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'MEWC',
    name: 'Meowcoin',
    algorithm: 'kawpow',
    dailyEarningsPerUnit: 0.008, // $0.008 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'CLORE',
    name: 'Clore.ai',
    algorithm: 'kawpow',
    dailyEarningsPerUnit: 0.015, // $0.015 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  // GPU Mineable Coins - Autolykos2
  {
    symbol: 'ERG',
    name: 'Ergo',
    algorithm: 'autolykos2',
    dailyEarningsPerUnit: 0.008, // $0.008 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  // GPU Mineable Coins - kHeavyHash (GPU rates)
  {
    symbol: 'KAS',
    name: 'Kaspa',
    algorithm: 'kheavyhash',
    dailyEarningsPerUnit: 0.0015, // $0.0015 per MH/s per day (GPU)
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  // GPU Mineable Coins - ZelHash/Equihash
  {
    symbol: 'FLUX',
    name: 'Flux',
    algorithm: 'zelhash',
    dailyEarningsPerUnit: 0.015, // $0.015 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'ZEC',
    name: 'Zcash',
    algorithm: 'equihash',
    dailyEarningsPerUnit: 0.022, // $0.022 per KSol/s per day
    hashrateUnit: 'KSol/s',
    unitDivisor: 1_000,
  },
  {
    symbol: 'ZEN',
    name: 'Horizen',
    algorithm: 'equihash',
    dailyEarningsPerUnit: 0.018, // $0.018 per KSol/s per day
    hashrateUnit: 'KSol/s',
    unitDivisor: 1_000,
  },
  // GPU Mineable Coins - FiroPow
  {
    symbol: 'FIRO',
    name: 'Firo',
    algorithm: 'firopow',
    dailyEarningsPerUnit: 0.025, // $0.025 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  // GPU Mineable Coins - Other Algorithms
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
  {
    symbol: 'CFX',
    name: 'Conflux',
    algorithm: 'octopus',
    dailyEarningsPerUnit: 0.010, // $0.010 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'CTXC',
    name: 'Cortex',
    algorithm: 'cortex',
    dailyEarningsPerUnit: 0.006, // $0.006 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'BEAM',
    name: 'Beam',
    algorithm: 'beamhash',
    dailyEarningsPerUnit: 0.012, // $0.012 per Sol/s per day
    hashrateUnit: 'Sol/s',
    unitDivisor: 1,
  },
  {
    symbol: 'XNA',
    name: 'Neurai',
    algorithm: 'kawpow',
    dailyEarningsPerUnit: 0.009, // $0.009 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'SERO',
    name: 'Super Zero',
    algorithm: 'progpow',
    dailyEarningsPerUnit: 0.007, // $0.007 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'DNX',
    name: 'Dynex',
    algorithm: 'dynexsolve',
    dailyEarningsPerUnit: 0.035, // $0.035 per MH/s per day
    hashrateUnit: 'MH/s',
    unitDivisor: 1_000_000,
  },
  {
    symbol: 'ZEPH',
    name: 'Zephyr',
    algorithm: 'randomx',
    dailyEarningsPerUnit: 0.15, // $0.15 per KH/s per day (CPU focused)
    hashrateUnit: 'KH/s',
    unitDivisor: 1_000,
  },
  {
    symbol: 'XMR',
    name: 'Monero',
    algorithm: 'randomx',
    dailyEarningsPerUnit: 0.12, // $0.12 per KH/s per day (CPU focused)
    hashrateUnit: 'KH/s',
    unitDivisor: 1_000,
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
    symbol: 'BCH',
    name: 'Bitcoin Cash',
    algorithm: 'sha256',
    dailyEarningsPerUnit: 0.055, // $0.055 per TH/s per day
    hashrateUnit: 'TH/s',
    unitDivisor: 1_000_000_000_000,
  },
  {
    symbol: 'BSV',
    name: 'Bitcoin SV',
    algorithm: 'sha256',
    dailyEarningsPerUnit: 0.045, // $0.045 per TH/s per day
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
  {
    symbol: 'CKB',
    name: 'Nervos',
    algorithm: 'eaglesong',
    dailyEarningsPerUnit: 0.025, // $0.025 per TH/s per day
    hashrateUnit: 'TH/s',
    unitDivisor: 1_000_000_000_000,
  },
  {
    symbol: 'HNS',
    name: 'Handshake',
    algorithm: 'blake2b',
    dailyEarningsPerUnit: 0.018, // $0.018 per TH/s per day
    hashrateUnit: 'TH/s',
    unitDivisor: 1_000_000_000_000,
  },
  {
    symbol: 'SC',
    name: 'Siacoin',
    algorithm: 'blake2b',
    dailyEarningsPerUnit: 0.012, // $0.012 per TH/s per day
    hashrateUnit: 'TH/s',
    unitDivisor: 1_000_000_000_000,
  },
  {
    symbol: 'DCR',
    name: 'Decred',
    algorithm: 'blake256r14',
    dailyEarningsPerUnit: 0.035, // $0.035 per TH/s per day
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
    return [
      'etchash', 'kawpow', 'autolykos2', 'kheavyhash', 'zelhash',
      'firopow', 'blake3', 'ghostrider', 'octopus', 'equihash',
      'cortex', 'beamhash', 'progpow', 'dynexsolve', 'randomx', 'nexapow'
    ]
  }
  return ['sha256', 'scrypt', 'kheavyhash', 'kadena', 'etchash', 'eaglesong', 'blake2b', 'blake256r14']
}

/**
 * Get coins available for hardware type
 */
export function getCoinsForHardwareType(type: 'gpu' | 'asic'): CoinData[] {
  const algorithms = getAlgorithmsForType(type)
  return COINS.filter(c => algorithms.includes(c.algorithm))
}
