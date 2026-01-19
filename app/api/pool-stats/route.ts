import { NextRequest, NextResponse } from 'next/server'

// Pool API configurations
const POOL_APIS: Record<string, Record<string, string>> = {
  '2miners': {
    'etc': 'https://etc.2miners.com/api/accounts/{address}',
    'rvn': 'https://rvn.2miners.com/api/accounts/{address}',
    'ergo': 'https://ergo.2miners.com/api/accounts/{address}',
    'flux': 'https://flux.2miners.com/api/accounts/{address}',
    'kas': 'https://kas.2miners.com/api/accounts/{address}',
    'btc': 'https://solo-btc.2miners.com/api/accounts/{address}',
  },
  'nanopool': {
    'etc': 'https://api.nanopool.org/v1/etc/user/{address}',
    'rvn': 'https://api.nanopool.org/v1/rvn/user/{address}',
    'ergo': 'https://api.nanopool.org/v1/ergo/user/{address}',
  },
  'f2pool': {
    'etc': 'https://api.f2pool.com/etc/{address}',
    'btc': 'https://api.f2pool.com/bitcoin/{address}',
  },
  'ethermine': {
    'etc': 'https://api-etc.ethermine.org/miner/{address}/dashboard',
  },
  'herominers': {
    'etc': 'https://etc.herominers.com/api/stats_address?address={address}',
    'rvn': 'https://rvn.herominers.com/api/stats_address?address={address}',
    'ergo': 'https://ergo.herominers.com/api/stats_address?address={address}',
    'flux': 'https://flux.herominers.com/api/stats_address?address={address}',
    'kas': 'https://kas.herominers.com/api/stats_address?address={address}',
  },
  'woolypooly': {
    'etc': 'https://api.woolypooly.com/api/etc-1/accounts/{address}',
    'rvn': 'https://api.woolypooly.com/api/rvn-1/accounts/{address}',
    'ergo': 'https://api.woolypooly.com/api/ergo-1/accounts/{address}',
    'flux': 'https://api.woolypooly.com/api/flux-1/accounts/{address}',
  },
  'hiveon': {
    'etc': 'https://hiveon.net/api/v1/stats/miner/{address}/ETC/billing-acc',
    'rvn': 'https://hiveon.net/api/v1/stats/miner/{address}/RVN/billing-acc',
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

// Coin prices cache (simplified - in production would use CoinGecko API)
async function getCoinPrice(coin: string): Promise<number> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${getCoinGeckoId(coin)}&vs_currencies=usd`,
      { next: { revalidate: 300 } } // Cache for 5 minutes
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
  }
  return ids[coin.toLowerCase()] || coin.toLowerCase()
}

function getHashrateUnit(pool: string, coin: string): string {
  // BTC uses TH/s, most others use MH/s
  if (coin.toLowerCase() === 'btc') return 'TH/s'
  if (coin.toLowerCase() === 'kas') return 'GH/s'
  return 'MH/s'
}

function normalizeHashrate(hashrate: number, pool: string, coin: string): number {
  // Normalize to the appropriate unit based on coin
  // Most pools return hashrate in H/s, need to convert
  return hashrate
}

async function fetch2MinersStats(coin: string, address: string) {
  const url = POOL_APIS['2miners'][coin.toLowerCase()]?.replace('{address}', address)
  if (!url) throw new Error('Unsupported coin for 2miners')

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from 2miners')

  const data = await response.json()

  return {
    hashrate: data.currentHashrate || 0,
    workersOnline: data.workersOnline || 0,
    workersOffline: data.workersOffline || 0,
    balance: (data.stats?.balance || 0) / 1e9, // Convert from nanocoins
    pendingBalance: (data.stats?.immature || 0) / 1e9,
  }
}

async function fetchNanopoolStats(coin: string, address: string) {
  const url = POOL_APIS['nanopool'][coin.toLowerCase()]?.replace('{address}', address)
  if (!url) throw new Error('Unsupported coin for nanopool')

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

async function fetchHeroMinersStats(coin: string, address: string) {
  const url = POOL_APIS['herominers'][coin.toLowerCase()]?.replace('{address}', address)
  if (!url) throw new Error('Unsupported coin for herominers')

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from herominers')

  const data = await response.json()

  return {
    hashrate: data.stats?.hashrate || 0,
    workersOnline: Object.keys(data.workers || {}).filter(w => data.workers[w].hashrate > 0).length,
    workersOffline: Object.keys(data.workers || {}).filter(w => data.workers[w].hashrate === 0).length,
    balance: (data.stats?.balance || 0) / 1e9,
    pendingBalance: (data.stats?.pendingIncome || 0) / 1e9,
  }
}

async function fetchWoolyPoolyStats(coin: string, address: string) {
  const url = POOL_APIS['woolypooly'][coin.toLowerCase()]?.replace('{address}', address)
  if (!url) throw new Error('Unsupported coin for woolypooly')

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from woolypooly')

  const data = await response.json()

  return {
    hashrate: data.stats?.hashrate || 0,
    workersOnline: data.workersOnline || 0,
    workersOffline: data.workersOffline || 0,
    balance: data.stats?.balance || 0,
    pendingBalance: data.stats?.immature || 0,
  }
}

async function fetchOceanStats(address: string) {
  const url = POOL_APIS['ocean']['btc'].replace('{address}', address)

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from ocean')

  const data = await response.json()

  return {
    hashrate: data.hashrate_300s || 0, // In TH/s
    workersOnline: data.worker_count || 0,
    workersOffline: 0,
    balance: data.estimated_earn_next_block || 0,
    pendingBalance: data.pending_balance || 0,
  }
}

async function fetchPublicPoolStats(address: string) {
  const url = POOL_APIS['publicpool']['btc'].replace('{address}', address)

  const response = await fetch(url)
  if (!response.ok) throw new Error('Failed to fetch from Public Pool')

  const data = await response.json()

  // Public Pool returns hashrate in H/s, convert to TH/s
  const hashrateHs = data.hashRate || data.hashrate || 0
  const hashrateTHs = hashrateHs / 1e12

  return {
    hashrate: hashrateTHs,
    workersOnline: data.workerCount || data.workers?.length || 0,
    workersOffline: 0,
    balance: (data.totalEarned || 0) / 1e8, // Satoshis to BTC
    pendingBalance: 0,
  }
}

async function fetchCkPoolStats(address: string, isEU: boolean = false) {
  const poolKey = isEU ? 'ckpool-eu' : 'ckpool'
  const url = POOL_APIS[poolKey]['btc'].replace('{address}', address)

  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to fetch from ${poolKey}`)

  const data = await response.json()

  // CKPool returns hashrate in various units
  const hashrate1hr = data.hashrate1hr || 0
  // Convert to TH/s (CKPool typically returns in appropriate units)
  const hashrateTHs = typeof hashrate1hr === 'string'
    ? parseFloat(hashrate1hr)
    : hashrate1hr / 1e12

  return {
    hashrate: hashrateTHs,
    workersOnline: data.workers || 0,
    workersOffline: 0,
    balance: data.balance || 0,
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
    case 'herominers':
      return await fetchHeroMinersStats(coin, address)
    case 'woolypooly':
      return await fetchWoolyPoolyStats(coin, address)
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

    // Calculate daily estimates (simplified)
    const hashrateUnit = getHashrateUnit(pool, coin)
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
