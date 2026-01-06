// Wallet types
export interface Wallet {
  id: string;
  name: string;
  address: string;
  coin: string;
  pool: string;
  enabled: boolean;
  order?: number;
  power?: number; // watts for this wallet/rig
}

export interface WalletData {
  walletId: string;
  hashrate: number;
  hashrate24h?: number;
  balance: number;
  earnings24h?: number;
  workers: Worker[];
  lastUpdated: number;
  error?: string;
  restricted?: boolean; // Wallet restricted due to free tier limitations
}

export interface Worker {
  name: string;
  hashrate: number;
  lastSeen?: number;
  online: boolean;
  shares?: number;
  rating?: number;
}

// Pool types
export interface Pool {
  id: string;
  name: string;
  coins: string[];
  getApiUrl: (coin: string, address: string) => string;
  parseResponse: (data: unknown, coin: string) => PoolResponse;
  getPoolUrl?: (coin: string, address: string) => string;
}

export interface PoolResponse {
  hashrate: number;
  hashrate24h?: number;
  balance: number;
  earnings24h?: number;
  workers: Worker[];
}

// Coin types
export interface Coin {
  id: string;
  symbol: string;
  name: string;
  coingeckoId: string;
  algorithm: string;
  pools: string[];
}

// Price types
export interface CoinPrice {
  usd: number;
  usd_24h_change?: number;
  lastUpdated: number;
}

// Settings types
export interface Settings {
  refreshInterval: number; // in minutes
  electricityRate: number; // cost per kWh
  electricityCurrency: string;
  powerConsumption: number; // watts
  currency: string;
  notifications: NotificationSettings;
  showDiscoveryCoins: boolean;
  liteMode: boolean; // false = dark mode (default), true = light mode
}

export interface NotificationSettings {
  enabled: boolean;
  workerOffline: boolean;
  profitDrop: boolean;
  profitDropThreshold: number; // percentage
  betterCoin: boolean;
}

// Auth types
export interface AuthState {
  licenseKey: string | null;
  plan: 'free' | 'pro' | 'bundle' | null;
  instanceId: string | null;
  isActivated: boolean;
}

// QR Code payload
export interface QRPayload {
  wallets: Wallet[];
  settings: Partial<Settings>;
  licenseKey: string;
  signature: string;
  timestamp: number;
}

// Alert types
export interface Alert {
  id: string;
  type: 'worker_offline' | 'profit_drop' | 'better_coin';
  walletId: string;
  message: string;
  timestamp: number;
  read: boolean;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
