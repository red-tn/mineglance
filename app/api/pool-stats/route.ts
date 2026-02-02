import { NextRequest, NextResponse } from 'next/server'

// Pool API configurations - matching extension support
const POOL_APIS: Record<string, Record<string, string>> = {
  '2miners': {
    'etc': 'https://etc.2miners.com/api/accounts/{address}',
    'rvn': 'https://rvn.2miners.com/api/accounts/{address}',
    'ergo': 'https://ergo.2miners.com/api/accounts/{address}',
    'flux': 'https://flux.2miners.com/api/accounts/{address}',
    'kas': 'https://kas.2miners.com/api/accounts/{address}',
    'btc': 'https://solo-btc.2miners.com/api/accounts/{address}',
    'firo': 'https://firo.2miners.com/api/accounts/{address}',
    'nexa': 'https://nexa.2miners.com/api/accounts/{address}',
    'xna': 'https://xna.2miners.com/api/accounts/{address}',
    'btg': 'https://btg.2miners.com/api/accounts/{address}',
    'ckb': 'https://ckb.2miners.com/api/accounts/{address}',
    'ctxc': 'https://ctxc.2miners.com/api/accounts/{address}',
    'beam': 'https://beam.2miners.com/api/accounts/{address}',
    'zil': 'https://zil.2miners.com/api/accounts/{address}',
  },
  'nanopool': {
    'etc': 'https://api.nanopool.org/v1/etc/user/{address}',
    'rvn': 'https://api.nanopool.org/v1/rvn/user/{address}',
    'ergo': 'https://api.nanopool.org/v1/ergo/user/{address}',
    'cfx': 'https://api.nanopool.org/v1/cfx/user/{address}',
    'zec': 'https://api.nanopool.org/v1/zec/user/{address}',
    'xmr': 'https://api.nanopool.org/v1/xmr/user/{address}',
  },
  'f2pool': {
    'btc': 'https://api.f2pool.com/bitcoin/{address}',
    'etc': 'https://api.f2pool.com/etc/{address}',
    'ltc': 'https://api.f2pool.com/litecoin/{address}',
    'dash': 'https://api.f2pool.com/dash/{address}',
    'zec': 'https://api.f2pool.com/zcash/{address}',
    'xmr': 'https://api.f2pool.com/monero/{address}',
    'rvn': 'https://api.f2pool.com/ravencoin/{address}',
    'ckb': 'https://api.f2pool.com/nervos/{address}',
  },
  'ethermine': {
    'etc': 'https://api.ethermine.org/miner/{address}/currentStats',
  },
  'herominers': {
    'etc': 'https://etc.herominers.com/api/stats_address?address={address}',
    'rvn': 'https://rvn.herominers.com/api/stats_address?address={address}',
    'ergo': 'https://ergo.herominers.com/api/stats_address?address={address}',
    'flux': 'https://flux.herominers.com/api/stats_address?address={address}',
    'kas': 'https://kas.herominers.com/api/stats_address?address={address}',
    'nexa': 'https://nexa.herominers.com/api/stats_address?address={address}',
    'alph': 'https://alph.herominers.com/api/stats_address?address={address}',
    'xmr': 'https://xmr.herominers.com/api/stats_address?address={address}',
    'rtm': 'https://rtm.herominers.com/api/stats_address?address={address}',
    'xna': 'https://neurai.herominers.com/api/stats_address?address={address}',
  },
  'woolypooly': {
    'etc': 'https://api.woolypooly.com/api/etc-1/accounts/{address}',
    'rvn': 'https://api.woolypooly.com/api/rvn-1/accounts/{address}',
    'ergo': 'https://api.woolypooly.com/api/ergo-1/accounts/{address}',
    'flux': 'https://api.woolypooly.com/api/flux-1/accounts/{address}',
    'cfx': 'https://api.woolypooly.com/api/cfx-1/accounts/{address}',
    'kas': 'https://api.woolypooly.com/api/kas-1/accounts/{address}',
    'nexa': 'https://api.woolypooly.com/api/nexa-1/accounts/{address}',
    'alph': 'https://api.woolypooly.com/api/alph-1/accounts/{address}',
    'xna': 'https://api.woolypooly.com/api/xna-1/accounts/{address}',
  },
  'hiveon': {
    'etc': 'https://hiveon.net/api/v1/stats/miner/{address}/ETC',
    'rvn': 'https://hiveon.net/api/v1/stats/miner/{address}/RVN',
  },
  'cedric-crispin': {
    'firo': 'https://firo.cedric-crispin.com/api/pool/miner/{address}/',
  },
  'cedriccrispin': {
    'firo': 'https://firo.cedric-crispin.com/api/pool/miner/{address}/',
  },
  'ckpool': {
    'btc': 'https://solo.ckpool.org/users/{address}',
  },
  'ckpool-eu': {
    'btc': 'https://eusolo.ckpool.org/users/{address}',
  },
  'ocean': {
    'btc': 'https://api.ocean.xyz/v1/statsnap/{address}',
  },
  'public-pool': {
    'btc': 'https://public-pool.io:40557/api/client/{address}',
  },
  'publicpool': {
    'btc': 'https://public-pool.io:40557/api/client/{address}',
  },
}

// Coin prices cache
async function getCoinPrice(coin: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${getCoinGeckoId(coin)}&vs_currencies=usd`,
      { next: { revalidate: 300 } }
    )
    const data = await response.json()
    return data[getCoinGeckoId(coin)]?.usd || 0
  } catch {
    return 0
  }
}

function getCoinGeckoId(coin: string): string {
  const ids: Record<string, string> = {
    'btc': 'bitcoin',
    'etc': 'ethereum-classic',
    'rvn': 'ravencoin',
    'ergo': 'ergo',
    'flux': 'zelcash',
    'kas': 'kaspa',
    'firo': 'firo',
    'nexa': 'nexa',
    'xna': 'neurai',
    'btg': 'bitcoin-gold',
    'ckb': 'nervos-network',
    'ctxc': 'cortex',
    'beam': 'beam',
    'zil': 'zilliqa',
    'cfx': 'conflux-token',
    'zec': 'zcash',
    'xmr': 'monero',
    'ltc': 'litecoin',
    'dash': 'dash',
    'alph': 'alephium',
    'rtm': 'raptoreum',
  }
  return ids[coin.toLowerCase()] || coin.toLowerCase()
}

function getHashrateUnit(coin: string): string {
  const coinLower = coin.toLowerCase()
  if (coinLower === 'btc') return 'TH/s'
  if (coinLower === 'kas') return 'GH/s'
  if (coinLower === 'xmr') return 'H/s'
  return 'MH/s'
}

// Get coin divisor for balance conversion
function getCoinDivisor(coin: string): number {
  const coinLower = coin.toLowerCase()
  // Most coins use 1e9 (nanocoins), some use different
  const divisors: Record<string, number> = {
    'btc': 1e8,
    'etc': 1e9,
    'rvn': 1e8,
    'ergo': 1e9,
    'flux': 1e8,
    'kas': 1e8,
    'firo': 1e8,
    'xmr': 1e12,
    'zec': 1e8,
  }
  return divisors[coinLower] || 1e9
}

async function fetch2MinersStats(coin: string, address: string) {
  const coinLower = coin.toLowerCase()
  const url = POOL_APIS['2miners'][coinLower]?.replace('{address}', address)
  if (!url) throw new Error(`Unsupported coin ${coin} for 2miners`)

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from 2miners')

  const data = await response.json()
  const divisor = getCoinDivisor(coin)

  return {
    hashrate: data.currentHashrate || 0,
    workersOnline: data.workersOnline || 0,
    workersOffline: data.workersOffline || 0,
    balance: (data.stats?.balance || 0) / divisor,
    pendingBalance: (data.stats?.immature || 0) / divisor,
  }
}

async function fetchNanopoolStats(coin: string, address: string) {
  const coinLower = coin.toLowerCase()
  const url = POOL_APIS['nanopool'][coinLower]?.replace('{address}', address)
  if (!url) throw new Error(`Unsupported coin ${coin} for nanopool`)

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from nanopool')

  const data = await response.json()

  if (!data.status) throw new Error('Nanopool returned error')

  return {
    hashrate: data.data?.hashrate || 0,
    workersOnline: data.data?.workers?.filter((w: any) => w.hashrate > 0).length || 0,
    workersOffline: data.data?.workers?.filter((w: any) => w.hashrate === 0).length || 0,
    balance: data.data?.balance || 0,
    pendingBalance: data.data?.unconfirmed_balance || 0,
  }
}

async function fetchF2PoolStats(coin: string, address: string) {
  const coinLower = coin.toLowerCase()
  const url = POOL_APIS['f2pool'][coinLower]?.replace('{address}', address)
  if (!url) throw new Error(`Unsupported coin ${coin} for f2pool`)

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from f2pool')

  const data = await response.json()

  return {
    hashrate: data.hashrate || 0,
    workersOnline: data.worker_length_online || 0,
    workersOffline: (data.worker_length || 0) - (data.worker_length_online || 0),
    balance: data.balance || 0,
    pendingBalance: data.paid || 0,
  }
}

async function fetchEthermineStats(coin: string, address: string) {
  const coinLower = coin.toLowerCase()
  const url = POOL_APIS['ethermine'][coinLower]?.replace('{address}', address)
  if (!url) throw new Error(`Unsupported coin ${coin} for ethermine`)

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from ethermine')

  const data = await response.json()
  const divisor = getCoinDivisor(coin)

  return {
    hashrate: data.data?.currentHashrate || 0,
    workersOnline: data.data?.activeWorkers || 0,
    workersOffline: 0,
    balance: (data.data?.unpaid || 0) / divisor,
    pendingBalance: 0,
  }
}

async function fetchHeroMinersStats(coin: string, address: string) {
  const coinLower = coin.toLowerCase()
  const url = POOL_APIS['herominers'][coinLower]?.replace('{address}', address)
  if (!url) throw new Error(`Unsupported coin ${coin} for herominers`)

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from herominers')

  const data = await response.json()
  const divisor = getCoinDivisor(coin)

  const workers = data.workers || {}
  const workerKeys = Object.keys(workers)

  return {
    hashrate: data.stats?.hashrate || 0,
    workersOnline: workerKeys.filter(w => workers[w].hashrate > 0).length,
    workersOffline: workerKeys.filter(w => workers[w].hashrate === 0).length,
    balance: (data.stats?.balance || 0) / divisor,
    pendingBalance: (data.stats?.pendingIncome || 0) / divisor,
  }
}

async function fetchWoolyPoolyStats(coin: string, address: string) {
  const coinLower = coin.toLowerCase()
  const url = POOL_APIS['woolypooly'][coinLower]?.replace('{address}', address)
  if (!url) throw new Error(`Unsupported coin ${coin} for woolypooly`)

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from woolypooly')

  const data = await response.json()

  // Get hashrate from performance data
  let hashrate = 0
  if (data.perfomance?.pplns && data.perfomance.pplns.length > 0) {
    const latest = data.perfomance.pplns[data.perfomance.pplns.length - 1]
    hashrate = latest.hashrate || 0
  }

  return {
    hashrate: hashrate,
    workersOnline: data.workersOnline || 0,
    workersOffline: data.workersOffline || 0,
    balance: data.stats?.balance || 0,
    pendingBalance: data.stats?.immature || 0,
  }
}

async function fetchHiveonStats(coin: string, address: string) {
  const coinLower = coin.toLowerCase()
  const url = POOL_APIS['hiveon'][coinLower]?.replace('{address}', address)
  if (!url) throw new Error(`Unsupported coin ${coin} for hiveon`)

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from hiveon')

  const data = await response.json()

  return {
    hashrate: parseFloat(data.hashrate) || 0,
    workersOnline: data.onlineWorkerCount || 0,
    workersOffline: 0,
    balance: 0, // Not available from stats endpoint
    pendingBalance: 0,
  }
}

async function fetchCedricCrispinStats(address: string) {
  const url = POOL_APIS['cedriccrispin']['firo'].replace('{address}', address)

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from Cedric Crispin')

  const data = await response.json()
  const miner = data.mResponse || data

  // Get hashrate from the latest performance sample's workers
  let currentHashrate = 0
  const workers: any[] = []
  let isStale = true

  if (miner.performanceSamples && miner.performanceSamples.length > 0) {
    const latestSample = miner.performanceSamples[miner.performanceSamples.length - 1]

    // Check if sample is recent (within last 2 hours)
    if (latestSample.created) {
      const sampleTime = new Date(latestSample.created).getTime()
      const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000)
      isStale = sampleTime < twoHoursAgo
    }

    if (!isStale && latestSample.workers && typeof latestSample.workers === 'object') {
      for (const [, workerData] of Object.entries(latestSample.workers) as [string, any][]) {
        const hr = workerData.hashrate || 0
        currentHashrate += hr
      }
    }
  }

  const onlineWorkers = isStale ? 0 : (Object.keys(miner.performanceSamples?.[miner.performanceSamples.length - 1]?.workers || {}).length || 0)

  return {
    hashrate: currentHashrate,
    workersOnline: onlineWorkers,
    workersOffline: isStale ? 1 : 0,
    balance: miner.pendingBalance || 0,
    pendingBalance: 0,
  }
}

async function fetchOceanStats(address: string) {
  const url = POOL_APIS['ocean']['btc'].replace('{address}', address)

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from OCEAN')

  const data = await response.json()
  const stats = data.result || data

  // OCEAN returns hashrate in H/s, convert to TH/s for BTC consistency
  const hashrateHs = parseFloat(stats.hashrate_300s) || parseFloat(stats.hashrate_60s) || 0
  const hashrateTHs = hashrateHs / 1e12
  const hasActivity = hashrateHs > 0

  return {
    hashrate: hashrateTHs,
    workersOnline: hasActivity ? 1 : 0,
    workersOffline: 0,
    balance: parseFloat(stats.unpaid) || 0,
    pendingBalance: 0,
  }
}

async function fetchPublicPoolStats(address: string) {
  const url = POOL_APIS['publicpool']['btc'].replace('{address}', address)

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from Public Pool')

  const data = await response.json()

  // Sum hashrates from workers
  let totalHashrate = 0
  if (data.workers && Array.isArray(data.workers)) {
    for (const w of data.workers) {
      totalHashrate += parseFloat(w.hashRate) || 0
    }
  }

  // Convert H/s to TH/s
  const hashrateTHs = totalHashrate / 1e12

  return {
    hashrate: hashrateTHs,
    workersOnline: data.workersCount || data.workers?.length || 0,
    workersOffline: 0,
    balance: 0, // Solo mining
    pendingBalance: 0,
  }
}

async function fetchCkPoolStats(address: string, isEU: boolean = false) {
  const poolKey = isEU ? 'ckpool-eu' : 'ckpool'
  const url = POOL_APIS[poolKey]['btc'].replace('{address}', address)

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch from ${poolKey}`)

  const data = await response.json()

  // CKPool returns hashrate as strings like "100 GH/s"
  const parseHashrate = (str: any): number => {
    if (!str || typeof str !== 'string') return 0
    const match = str.match(/^([\d.]+)\s*(\w+)/)
    if (!match) return 0
    const value = parseFloat(match[1])
    const unit = match[2].toUpperCase()
    const multipliers: Record<string, number> = {
      'H': 1, 'KH': 1e3, 'MH': 1e6, 'GH': 1e9, 'TH': 1e12, 'PH': 1e15,
    }
    return value * (multipliers[unit] || 1)
  }

  const hashrate1hr = parseHashrate(data.hashrate1hr)
  // Convert to TH/s
  const hashrateTHs = hashrate1hr / 1e12

  return {
    hashrate: hashrateTHs,
    workersOnline: data.workers || 0,
    workersOffline: 0,
    balance: 0, // Solo mining
    pendingBalance: 0,
  }
}

async function fetchPoolStats(pool: string, coin: string, address: string) {
  const poolLower = pool.toLowerCase()

  switch (poolLower) {
    case '2miners':
      return await fetch2MinersStats(coin, address)
    case 'nanopool':
      return await fetchNanopoolStats(coin, address)
    case 'f2pool':
      return await fetchF2PoolStats(coin, address)
    case 'ethermine':
      return await fetchEthermineStats(coin, address)
    case 'herominers':
      return await fetchHeroMinersStats(coin, address)
    case 'woolypooly':
      return await fetchWoolyPoolyStats(coin, address)
    case 'hiveon':
      return await fetchHiveonStats(coin, address)
    case 'cedric-crispin':
    case 'cedriccrispin':
      return await fetchCedricCrispinStats(address)
    case 'ocean':
      return await fetchOceanStats(address)
    case 'public-pool':
    case 'publicpool':
      return await fetchPublicPoolStats(address)
    case 'ckpool':
      return await fetchCkPoolStats(address, false)
    case 'ckpool-eu':
      return await fetchCkPoolStats(address, true)
    default:
      throw new Error(`Pool ${pool} not yet supported`)
  }
}

export async function POST(request: NextRequest) {
  try {
    const { pool, coin, address, electricityRate, power } = await request.json()

    if (!pool || !coin || !address) {
      return NextResponse.json(
        { error: 'pool, coin, and address are required' },
        { status: 400 }
      )
    }

    // Fetch pool stats
    const stats = await fetchPoolStats(pool, coin, address)

    // Get coin price
    const coinPrice = await getCoinPrice(coin)

    // Calculate daily estimates
    const hashrateUnit = getHashrateUnit(coin)
    const dailyRevenue = stats.balance * coinPrice * 0.1 // Rough estimate
    const dailyElectricity = ((power || 0) / 1000) * 24 * (electricityRate || 0.12)
    const dailyProfit = dailyRevenue - dailyElectricity

    return NextResponse.json({
      hashrate: stats.hashrate,
      hashrateUnit,
      workersOnline: stats.workersOnline,
      workersOffline: stats.workersOffline,
      balance: stats.balance,
      pendingBalance: stats.pendingBalance || 0,
      balanceUSD: stats.balance * coinPrice,
      coinPrice,
      dailyRevenue,
      dailyProfit,
    })
  } catch (error) {
    console.error('Pool stats error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch pool stats' },
      { status: 500 }
    )
  }
}
