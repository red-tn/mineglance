// Coin configurations - ported from extension/background/background.js
// Each coin has its name, symbol, CoinGecko ID for price fetching, and decimals

export interface CoinConfig {
  name: string;
  symbol: string;
  geckoId: string;
  decimals: number;
}

export const COINS: Record<string, CoinConfig> = {
  // 'eth': Removed - Ethereum moved to Proof of Stake in Sept 2022, no longer mineable
  'etc': { name: 'Ethereum Classic', symbol: 'ETC', geckoId: 'ethereum-classic', decimals: 18 },
  'rvn': { name: 'Ravencoin', symbol: 'RVN', geckoId: 'ravencoin', decimals: 8 },
  'ergo': { name: 'Ergo', symbol: 'ERG', geckoId: 'ergo', decimals: 9 },
  'flux': { name: 'Flux', symbol: 'FLUX', geckoId: 'zelcash', decimals: 8 },
  'kas': { name: 'Kaspa', symbol: 'KAS', geckoId: 'kaspa', decimals: 8 },
  'nexa': { name: 'Nexa', symbol: 'NEXA', geckoId: 'nexa', decimals: 2 },
  'alph': { name: 'Alephium', symbol: 'ALPH', geckoId: 'alephium', decimals: 18 },
  'xmr': { name: 'Monero', symbol: 'XMR', geckoId: 'monero', decimals: 12 },
  'zec': { name: 'Zcash', symbol: 'ZEC', geckoId: 'zcash', decimals: 8 },
  'btc': { name: 'Bitcoin', symbol: 'BTC', geckoId: 'bitcoin', decimals: 8 },
  'ltc': { name: 'Litecoin', symbol: 'LTC', geckoId: 'litecoin', decimals: 8 },
  'dash': { name: 'Dash', symbol: 'DASH', geckoId: 'dash', decimals: 8 },
  'cfx': { name: 'Conflux', symbol: 'CFX', geckoId: 'conflux-token', decimals: 18 },
  'ckb': { name: 'Nervos', symbol: 'CKB', geckoId: 'nervos-network', decimals: 8 },
  'beam': { name: 'Beam', symbol: 'BEAM', geckoId: 'beam', decimals: 8 },
  'firo': { name: 'Firo', symbol: 'FIRO', geckoId: 'zcoin', decimals: 8 },
  'rtm': { name: 'Raptoreum', symbol: 'RTM', geckoId: 'raptoreum', decimals: 8 },
  'xna': { name: 'Neurai', symbol: 'XNA', geckoId: 'neurai', decimals: 8 },
  'btg': { name: 'Bitcoin Gold', symbol: 'BTG', geckoId: 'bitcoin-gold', decimals: 8 },
  'mwc': { name: 'MimbleWimbleCoin', symbol: 'MWC', geckoId: 'mimblewimblecoin', decimals: 9 },
  'zil': { name: 'Zilliqa', symbol: 'ZIL', geckoId: 'zilliqa', decimals: 12 },
  'ctxc': { name: 'Cortex', symbol: 'CTXC', geckoId: 'cortex', decimals: 18 },
};

// Helper to get divisor for coin decimals
export function getCoinDivisor(coin: string): number {
  const coinConfig = COINS[coin.toLowerCase()];
  return Math.pow(10, coinConfig?.decimals || 8);
}

// Get coin display name
export function getCoinName(coin: string): string {
  return COINS[coin.toLowerCase()]?.name || coin.toUpperCase();
}

// Get coin symbol
export function getCoinSymbol(coin: string): string {
  return COINS[coin.toLowerCase()]?.symbol || coin.toUpperCase();
}

// Get CoinGecko ID for price fetching
export function getCoinGeckoId(coin: string): string | null {
  return COINS[coin.toLowerCase()]?.geckoId || null;
}

// Get all supported coin IDs
export function getSupportedCoins(): string[] {
  return Object.keys(COINS);
}
