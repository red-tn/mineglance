export interface Pool {
  id: string;
  name: string;
  coins: Coin[];
}

export interface Coin {
  id: string;
  name: string;
  algorithm?: string;
}

export const POOLS: Pool[] = [
  {
    id: "2miners",
    name: "2Miners",
    coins: [
      { id: "ETC", name: "Ethereum Classic", algorithm: "Etchash" },
      { id: "RVN", name: "Ravencoin", algorithm: "KawPoW" },
      { id: "ERGO", name: "Ergo", algorithm: "Autolykos" },
      { id: "FLUX", name: "Flux", algorithm: "ZelHash" },
      { id: "FIRO", name: "Firo", algorithm: "FiroPow" },
      { id: "CFX", name: "Conflux", algorithm: "Octopus" },
      { id: "KAS", name: "Kaspa", algorithm: "kHeavyHash" },
      { id: "NEXA", name: "Nexa", algorithm: "NexaPow" },
      { id: "ALPH", name: "Alephium", algorithm: "Blake3" },
      { id: "DNX", name: "Dynex", algorithm: "DynexSolve" },
      { id: "XNA", name: "Neurai", algorithm: "KawPoW" },
      { id: "CLORE", name: "Clore.ai", algorithm: "KawPoW" },
    ],
  },
  {
    id: "nanopool",
    name: "Nanopool",
    coins: [
      { id: "ETC", name: "Ethereum Classic", algorithm: "Etchash" },
      { id: "RVN", name: "Ravencoin", algorithm: "KawPoW" },
      { id: "ERGO", name: "Ergo", algorithm: "Autolykos" },
      { id: "CFX", name: "Conflux", algorithm: "Octopus" },
      { id: "ZEC", name: "Zcash", algorithm: "Equihash" },
    ],
  },
  {
    id: "f2pool",
    name: "F2Pool",
    coins: [
      { id: "ETC", name: "Ethereum Classic", algorithm: "Etchash" },
      { id: "RVN", name: "Ravencoin", algorithm: "KawPoW" },
      { id: "KAS", name: "Kaspa", algorithm: "kHeavyHash" },
      { id: "ZEC", name: "Zcash", algorithm: "Equihash" },
      { id: "LTC", name: "Litecoin", algorithm: "Scrypt" },
      { id: "DOGE", name: "Dogecoin", algorithm: "Scrypt" },
    ],
  },
  {
    id: "ethermine",
    name: "Ethermine",
    coins: [
      { id: "ETC", name: "Ethereum Classic", algorithm: "Etchash" },
    ],
  },
  {
    id: "hiveon",
    name: "Hiveon Pool",
    coins: [
      { id: "ETC", name: "Ethereum Classic", algorithm: "Etchash" },
      { id: "RVN", name: "Ravencoin", algorithm: "KawPoW" },
      { id: "KAS", name: "Kaspa", algorithm: "kHeavyHash" },
    ],
  },
  {
    id: "herominers",
    name: "HeroMiners",
    coins: [
      { id: "RVN", name: "Ravencoin", algorithm: "KawPoW" },
      { id: "ERGO", name: "Ergo", algorithm: "Autolykos" },
      { id: "FLUX", name: "Flux", algorithm: "ZelHash" },
      { id: "KAS", name: "Kaspa", algorithm: "kHeavyHash" },
      { id: "NEXA", name: "Nexa", algorithm: "NexaPow" },
      { id: "ALPH", name: "Alephium", algorithm: "Blake3" },
      { id: "DNX", name: "Dynex", algorithm: "DynexSolve" },
      { id: "XNA", name: "Neurai", algorithm: "KawPoW" },
      { id: "CLORE", name: "Clore.ai", algorithm: "KawPoW" },
      { id: "RTM", name: "Raptoreum", algorithm: "GhostRider" },
      { id: "ZEPH", name: "Zephyr", algorithm: "RandomX" },
    ],
  },
  {
    id: "woolypooly",
    name: "WoolyPooly",
    coins: [
      { id: "ETC", name: "Ethereum Classic", algorithm: "Etchash" },
      { id: "RVN", name: "Ravencoin", algorithm: "KawPoW" },
      { id: "ERGO", name: "Ergo", algorithm: "Autolykos" },
      { id: "FLUX", name: "Flux", algorithm: "ZelHash" },
      { id: "CFX", name: "Conflux", algorithm: "Octopus" },
      { id: "KAS", name: "Kaspa", algorithm: "kHeavyHash" },
      { id: "ALPH", name: "Alephium", algorithm: "Blake3" },
    ],
  },
  {
    id: "cedric-crispin",
    name: "Cedric Crispin (FIRO)",
    coins: [
      { id: "FIRO", name: "Firo", algorithm: "FiroPow" },
    ],
  },
  {
    id: "ckpool",
    name: "CKPool Solo (BTC)",
    coins: [
      { id: "BTC", name: "Bitcoin", algorithm: "SHA-256" },
    ],
  },
  {
    id: "ckpool-eu",
    name: "CKPool Solo EU (BTC)",
    coins: [
      { id: "BTC", name: "Bitcoin", algorithm: "SHA-256" },
    ],
  },
  {
    id: "ocean",
    name: "OCEAN (BTC)",
    coins: [
      { id: "BTC", name: "Bitcoin", algorithm: "SHA-256" },
    ],
  },
  {
    id: "publicpool",
    name: "Public Pool (BTC)",
    coins: [
      { id: "BTC", name: "Bitcoin", algorithm: "SHA-256" },
    ],
  },
];

export function getCoinsForPool(poolId: string): Coin[] {
  const pool = POOLS.find((p) => p.id === poolId);
  return pool?.coins || [];
}

export function getPoolById(poolId: string): Pool | undefined {
  return POOLS.find((p) => p.id === poolId);
}
