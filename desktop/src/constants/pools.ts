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
      { id: "KAS", name: "Kaspa", algorithm: "kHeavyHash" },
      { id: "FIRO", name: "Firo", algorithm: "FiroPow" },
      { id: "NEXA", name: "Nexa", algorithm: "NexaPow" },
      { id: "XNA", name: "Neurai", algorithm: "KawPoW" },
      { id: "BTG", name: "Bitcoin Gold", algorithm: "Equihash" },
      { id: "CKB", name: "Nervos", algorithm: "Eaglesong" },
      { id: "CTXC", name: "Cortex", algorithm: "CuckooCycle" },
      { id: "BEAM", name: "Beam", algorithm: "BeamHashIII" },
      { id: "ZIL", name: "Zilliqa", algorithm: "Ethash" },
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
      { id: "XMR", name: "Monero", algorithm: "RandomX" },
    ],
  },
  {
    id: "f2pool",
    name: "F2Pool",
    coins: [
      { id: "BTC", name: "Bitcoin", algorithm: "SHA-256" },
      { id: "ETC", name: "Ethereum Classic", algorithm: "Etchash" },
      { id: "LTC", name: "Litecoin", algorithm: "Scrypt" },
      { id: "DASH", name: "Dash", algorithm: "X11" },
      { id: "ZEC", name: "Zcash", algorithm: "Equihash" },
      { id: "XMR", name: "Monero", algorithm: "RandomX" },
      { id: "RVN", name: "Ravencoin", algorithm: "KawPoW" },
      { id: "CKB", name: "Nervos", algorithm: "Eaglesong" },
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
      { id: "XMR", name: "Monero", algorithm: "RandomX" },
      { id: "RTM", name: "Raptoreum", algorithm: "GhostRider" },
      { id: "XNA", name: "Neurai", algorithm: "KawPoW" },
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
      { id: "NEXA", name: "Nexa", algorithm: "NexaPow" },
      { id: "ALPH", name: "Alephium", algorithm: "Blake3" },
      { id: "XNA", name: "Neurai", algorithm: "KawPoW" },
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
  {
    id: "braiins",
    name: "Braiins Pool (BTC)",
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
