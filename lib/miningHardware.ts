// Mining hardware database with hashrates and power consumption
// Data based on typical mining performance

export interface MiningHardware {
  id: string
  name: string
  type: 'gpu' | 'asic'
  manufacturer: string
  algorithms: string[]
  hashrates: Record<string, number> // algorithm -> hashrate in H/s
  power: number // Watts
  msrp: number // USD (approximate)
}

// GPU Mining Hardware
export const GPUS: MiningHardware[] = [
  // NVIDIA RTX 40 Series
  {
    id: 'rtx-4090',
    name: 'RTX 4090',
    type: 'gpu',
    manufacturer: 'NVIDIA',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 132_000_000, // 132 MH/s
      'kawpow': 75_000_000,   // 75 MH/s
      'autolykos2': 280_000_000, // 280 MH/s
      'kheavyhash': 950_000_000, // 950 MH/s
    },
    power: 350,
    msrp: 1599
  },
  {
    id: 'rtx-4080',
    name: 'RTX 4080',
    type: 'gpu',
    manufacturer: 'NVIDIA',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 98_000_000,
      'kawpow': 52_000_000,
      'autolykos2': 195_000_000,
      'kheavyhash': 680_000_000,
    },
    power: 280,
    msrp: 1199
  },
  {
    id: 'rtx-4070-ti',
    name: 'RTX 4070 Ti',
    type: 'gpu',
    manufacturer: 'NVIDIA',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 87_000_000,
      'kawpow': 46_000_000,
      'autolykos2': 175_000_000,
      'kheavyhash': 600_000_000,
    },
    power: 220,
    msrp: 799
  },
  {
    id: 'rtx-4070',
    name: 'RTX 4070',
    type: 'gpu',
    manufacturer: 'NVIDIA',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 62_000_000,
      'kawpow': 35_000_000,
      'autolykos2': 130_000_000,
      'kheavyhash': 450_000_000,
    },
    power: 180,
    msrp: 599
  },
  // NVIDIA RTX 30 Series
  {
    id: 'rtx-3090',
    name: 'RTX 3090',
    type: 'gpu',
    manufacturer: 'NVIDIA',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 120_000_000,
      'kawpow': 55_000_000,
      'autolykos2': 240_000_000,
      'kheavyhash': 820_000_000,
    },
    power: 300,
    msrp: 1499
  },
  {
    id: 'rtx-3080',
    name: 'RTX 3080',
    type: 'gpu',
    manufacturer: 'NVIDIA',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 98_000_000,
      'kawpow': 48_000_000,
      'autolykos2': 195_000_000,
      'kheavyhash': 680_000_000,
    },
    power: 280,
    msrp: 699
  },
  {
    id: 'rtx-3070',
    name: 'RTX 3070',
    type: 'gpu',
    manufacturer: 'NVIDIA',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 62_000_000,
      'kawpow': 32_000_000,
      'autolykos2': 125_000_000,
      'kheavyhash': 450_000_000,
    },
    power: 200,
    msrp: 499
  },
  {
    id: 'rtx-3060-ti',
    name: 'RTX 3060 Ti',
    type: 'gpu',
    manufacturer: 'NVIDIA',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 60_000_000,
      'kawpow': 30_000_000,
      'autolykos2': 120_000_000,
      'kheavyhash': 420_000_000,
    },
    power: 180,
    msrp: 399
  },
  {
    id: 'rtx-3060',
    name: 'RTX 3060',
    type: 'gpu',
    manufacturer: 'NVIDIA',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 48_000_000,
      'kawpow': 25_000_000,
      'autolykos2': 95_000_000,
      'kheavyhash': 350_000_000,
    },
    power: 150,
    msrp: 329
  },
  // AMD RX 7000 Series
  {
    id: 'rx-7900-xtx',
    name: 'RX 7900 XTX',
    type: 'gpu',
    manufacturer: 'AMD',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 95_000_000,
      'kawpow': 58_000_000,
      'autolykos2': 190_000_000,
      'kheavyhash': 750_000_000,
    },
    power: 320,
    msrp: 999
  },
  {
    id: 'rx-7900-xt',
    name: 'RX 7900 XT',
    type: 'gpu',
    manufacturer: 'AMD',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 85_000_000,
      'kawpow': 52_000_000,
      'autolykos2': 170_000_000,
      'kheavyhash': 680_000_000,
    },
    power: 280,
    msrp: 899
  },
  // AMD RX 6000 Series
  {
    id: 'rx-6900-xt',
    name: 'RX 6900 XT',
    type: 'gpu',
    manufacturer: 'AMD',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 65_000_000,
      'kawpow': 35_000_000,
      'autolykos2': 135_000_000,
      'kheavyhash': 520_000_000,
    },
    power: 250,
    msrp: 799
  },
  {
    id: 'rx-6800-xt',
    name: 'RX 6800 XT',
    type: 'gpu',
    manufacturer: 'AMD',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 64_000_000,
      'kawpow': 33_000_000,
      'autolykos2': 130_000_000,
      'kheavyhash': 500_000_000,
    },
    power: 230,
    msrp: 599
  },
  {
    id: 'rx-6700-xt',
    name: 'RX 6700 XT',
    type: 'gpu',
    manufacturer: 'AMD',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 47_000_000,
      'kawpow': 24_000_000,
      'autolykos2': 95_000_000,
      'kheavyhash': 380_000_000,
    },
    power: 180,
    msrp: 379
  },
  {
    id: 'rx-6600-xt',
    name: 'RX 6600 XT',
    type: 'gpu',
    manufacturer: 'AMD',
    algorithms: ['etchash', 'kawpow', 'autolykos2', 'kheavyhash'],
    hashrates: {
      'etchash': 32_000_000,
      'kawpow': 18_000_000,
      'autolykos2': 65_000_000,
      'kheavyhash': 280_000_000,
    },
    power: 120,
    msrp: 299
  },
]

// ASIC Mining Hardware
export const ASICS: MiningHardware[] = [
  // Bitcoin SHA-256 Miners
  {
    id: 'antminer-s21',
    name: 'Antminer S21',
    type: 'asic',
    manufacturer: 'Bitmain',
    algorithms: ['sha256'],
    hashrates: {
      'sha256': 200_000_000_000_000, // 200 TH/s
    },
    power: 3500,
    msrp: 5500
  },
  {
    id: 'antminer-s19-pro',
    name: 'Antminer S19 Pro',
    type: 'asic',
    manufacturer: 'Bitmain',
    algorithms: ['sha256'],
    hashrates: {
      'sha256': 110_000_000_000_000, // 110 TH/s
    },
    power: 3250,
    msrp: 3500
  },
  {
    id: 'whatsminer-m50s',
    name: 'Whatsminer M50S',
    type: 'asic',
    manufacturer: 'MicroBT',
    algorithms: ['sha256'],
    hashrates: {
      'sha256': 126_000_000_000_000, // 126 TH/s
    },
    power: 3276,
    msrp: 4200
  },
  // Bitaxe Solo Miners
  {
    id: 'bitaxe-ultra',
    name: 'Bitaxe Ultra',
    type: 'asic',
    manufacturer: 'Bitaxe',
    algorithms: ['sha256'],
    hashrates: {
      'sha256': 500_000_000_000, // 500 GH/s
    },
    power: 15,
    msrp: 199
  },
  {
    id: 'bitaxe-supra',
    name: 'Bitaxe Supra',
    type: 'asic',
    manufacturer: 'Bitaxe',
    algorithms: ['sha256'],
    hashrates: {
      'sha256': 700_000_000_000, // 700 GH/s
    },
    power: 25,
    msrp: 299
  },
  // Litecoin/Doge Scrypt Miners
  {
    id: 'antminer-l7',
    name: 'Antminer L7',
    type: 'asic',
    manufacturer: 'Bitmain',
    algorithms: ['scrypt'],
    hashrates: {
      'scrypt': 9_500_000_000, // 9.5 GH/s
    },
    power: 3425,
    msrp: 8500
  },
  {
    id: 'goldshell-mini-doge',
    name: 'Goldshell Mini-DOGE',
    type: 'asic',
    manufacturer: 'Goldshell',
    algorithms: ['scrypt'],
    hashrates: {
      'scrypt': 185_000_000, // 185 MH/s
    },
    power: 233,
    msrp: 349
  },
  // Kaspa kHeavyHash Miners
  {
    id: 'antminer-ka3',
    name: 'Antminer KA3',
    type: 'asic',
    manufacturer: 'Bitmain',
    algorithms: ['kheavyhash'],
    hashrates: {
      'kheavyhash': 166_000_000_000_000, // 166 TH/s
    },
    power: 3154,
    msrp: 12000
  },
  {
    id: 'iceriver-ks3',
    name: 'IceRiver KS3',
    type: 'asic',
    manufacturer: 'IceRiver',
    algorithms: ['kheavyhash'],
    hashrates: {
      'kheavyhash': 8_000_000_000_000, // 8 TH/s
    },
    power: 3200,
    msrp: 8000
  },
  // Kadena Miners
  {
    id: 'goldshell-kd6',
    name: 'Goldshell KD6',
    type: 'asic',
    manufacturer: 'Goldshell',
    algorithms: ['kadena'],
    hashrates: {
      'kadena': 29_200_000_000_000, // 29.2 TH/s
    },
    power: 2630,
    msrp: 6000
  },
  // Ethereum Classic / Etchash Miners
  {
    id: 'ipollo-v1-mini',
    name: 'iPollo V1 Mini',
    type: 'asic',
    manufacturer: 'iPollo',
    algorithms: ['etchash'],
    hashrates: {
      'etchash': 300_000_000, // 300 MH/s
    },
    power: 240,
    msrp: 450
  },
]

// Combined list
export const ALL_HARDWARE: MiningHardware[] = [...GPUS, ...ASICS]

/**
 * Get hardware by ID
 */
export function getHardwareById(id: string): MiningHardware | undefined {
  return ALL_HARDWARE.find(h => h.id === id)
}

/**
 * Get hardware by type
 */
export function getHardwareByType(type: 'gpu' | 'asic'): MiningHardware[] {
  return ALL_HARDWARE.filter(h => h.type === type)
}

/**
 * Get hardware that can mine a specific algorithm
 */
export function getHardwareForAlgorithm(algorithm: string): MiningHardware[] {
  return ALL_HARDWARE.filter(h => h.algorithms.includes(algorithm))
}

/**
 * Format hashrate for display
 */
export function formatHashrate(hashrate: number): string {
  if (hashrate >= 1_000_000_000_000_000) {
    return `${(hashrate / 1_000_000_000_000_000).toFixed(1)} PH/s`
  }
  if (hashrate >= 1_000_000_000_000) {
    return `${(hashrate / 1_000_000_000_000).toFixed(1)} TH/s`
  }
  if (hashrate >= 1_000_000_000) {
    return `${(hashrate / 1_000_000_000).toFixed(1)} GH/s`
  }
  if (hashrate >= 1_000_000) {
    return `${(hashrate / 1_000_000).toFixed(1)} MH/s`
  }
  if (hashrate >= 1_000) {
    return `${(hashrate / 1_000).toFixed(1)} KH/s`
  }
  return `${hashrate.toFixed(0)} H/s`
}
