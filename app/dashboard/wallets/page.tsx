'use client'

import { useState, useEffect, useContext } from 'react'
import { AuthContext } from '../auth-context'
import UpgradeModal from '@/components/UpgradeModal'

interface Wallet {
  id: string
  name: string
  pool: string
  coin: string
  address: string
  power: number
  enabled: boolean
  order: number
}

interface Rig {
  id: string
  name: string
  gpu: string
  power: number
  quantity: number
}

const POOLS = [
  { value: '2miners', label: '2Miners' },
  { value: 'nanopool', label: 'Nanopool' },
  { value: 'herominers', label: 'HeroMiners' },
  { value: 'f2pool', label: 'F2Pool' },
  { value: 'ethermine', label: 'Ethermine' },
  { value: 'hiveon', label: 'Hiveon Pool' },
  { value: 'woolypooly', label: 'WoolyPooly' },
  { value: 'cedriccrispin', label: 'Cedric Crispin (FIRO)' },
  { value: 'ckpool', label: 'CKPool Solo (BTC)' },
  { value: 'ckpool-eu', label: 'CKPool Solo EU (BTC)' },
  { value: 'ocean', label: 'OCEAN (BTC)' },
  { value: 'publicpool', label: 'Public Pool (BTC)' },
]

const COINS = [
  { value: 'btc', label: 'Bitcoin (BTC)' },
  { value: 'etc', label: 'Ethereum Classic (ETC)' },
  { value: 'rvn', label: 'Ravencoin (RVN)' },
  { value: 'ergo', label: 'Ergo (ERG)' },
  { value: 'kas', label: 'Kaspa (KAS)' },
  { value: 'flux', label: 'Flux (FLUX)' },
  { value: 'alph', label: 'Alephium (ALPH)' },
  { value: 'beam', label: 'Beam (BEAM)' },
  { value: 'btg', label: 'Bitcoin Gold (BTG)' },
  { value: 'cfx', label: 'Conflux (CFX)' },
  { value: 'ckb', label: 'Nervos (CKB)' },
  { value: 'ctxc', label: 'Cortex (CTXC)' },
  { value: 'dash', label: 'Dash (DASH)' },
  { value: 'firo', label: 'Firo (FIRO)' },
  { value: 'ltc', label: 'Litecoin (LTC)' },
  { value: 'mwc', label: 'MimbleWimbleCoin (MWC)' },
  { value: 'nexa', label: 'Nexa (NEXA)' },
  { value: 'rtm', label: 'Raptoreum (RTM)' },
  { value: 'xmr', label: 'Monero (XMR)' },
  { value: 'xna', label: 'Neurai (XNA)' },
  { value: 'zec', label: 'Zcash (ZEC)' },
  { value: 'zil', label: 'Zilliqa (ZIL)' },
]

// Free tier restrictions
const FREE_POOLS = ['2miners', 'nanopool', 'herominers']
const FREE_COINS = ['btc', 'etc', 'rvn', 'ergo', 'kas']
const FREE_WALLET_LIMIT = 2

// GPU options with power values (same as extension)
const GPU_OPTIONS = [
  { group: 'NVIDIA RTX 50 Series', options: [
    { value: 'RTX 5090 (575W)', power: 575 },
    { value: 'RTX 5080 (360W)', power: 360 },
    { value: 'RTX 5070 Ti (300W)', power: 300 },
    { value: 'RTX 5070 (250W)', power: 250 },
    { value: 'RTX 5060 (150W)', power: 150 },
  ]},
  { group: 'NVIDIA RTX 40 Series', options: [
    { value: 'RTX 4090 (450W)', power: 450 },
    { value: 'RTX 4080 (320W)', power: 320 },
    { value: 'RTX 4070 Ti (285W)', power: 285 },
    { value: 'RTX 4070 (200W)', power: 200 },
    { value: 'RTX 4060 Ti (165W)', power: 165 },
    { value: 'RTX 4060 (115W)', power: 115 },
  ]},
  { group: 'NVIDIA RTX 30 Series', options: [
    { value: 'RTX 3090 (350W)', power: 350 },
    { value: 'RTX 3080 (320W)', power: 320 },
    { value: 'RTX 3070 (220W)', power: 220 },
    { value: 'RTX 3060 Ti (200W)', power: 200 },
    { value: 'RTX 3060 (170W)', power: 170 },
  ]},
  { group: 'NVIDIA RTX 20 Series', options: [
    { value: 'RTX 2080 Ti (250W)', power: 250 },
    { value: 'RTX 2080 (215W)', power: 215 },
    { value: 'RTX 2070 (175W)', power: 175 },
    { value: 'RTX 2060 (160W)', power: 160 },
  ]},
  { group: 'AMD RX 7000 Series', options: [
    { value: 'RX 7900 XTX (355W)', power: 355 },
    { value: 'RX 7900 XT (315W)', power: 315 },
    { value: 'RX 7800 XT (263W)', power: 263 },
    { value: 'RX 7700 XT (245W)', power: 245 },
    { value: 'RX 7600 (165W)', power: 165 },
  ]},
  { group: 'AMD RX 6000 Series', options: [
    { value: 'RX 6900 XT (300W)', power: 300 },
    { value: 'RX 6800 XT (300W)', power: 300 },
    { value: 'RX 6700 XT (230W)', power: 230 },
    { value: 'RX 6600 XT (160W)', power: 160 },
  ]},
]

export default function WalletsPage() {
  const auth = useContext(AuthContext)
  const [wallets, setWallets] = useState<Wallet[]>([])
  const [rigs, setRigs] = useState<Rig[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showRigModal, setShowRigModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [upgradeTrigger, setUpgradeTrigger] = useState<string>('')
  const [editingWallet, setEditingWallet] = useState<Wallet | null>(null)
  const [editingRig, setEditingRig] = useState<Rig | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    pool: '2miners',
    coin: 'etc',
    address: '',
    power: 200
  })

  // Rig form state
  const [rigFormData, setRigFormData] = useState({
    name: '',
    gpu: '',
    power: 200,
    quantity: 1
  })

  const isPro = auth?.user?.plan === 'pro' || auth?.user?.plan === 'bundle'

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      const token = localStorage.getItem('user_token')

      // Fetch both wallets and rigs in parallel
      const [walletsRes, rigsRes] = await Promise.all([
        fetch('/api/wallets/sync', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/rigs/sync', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])

      if (walletsRes.ok) {
        const data = await walletsRes.json()
        setWallets(data.wallets || [])
      }

      if (rigsRes.ok) {
        const data = await rigsRes.json()
        setRigs(data.rigs || [])
      }
    } catch (err) {
      console.error('Error fetching data:', err)
      setError('Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  function handleAddWallet() {
    // Check wallet limit for free users
    if (!isPro && wallets.length >= FREE_WALLET_LIMIT) {
      setUpgradeTrigger('wallet_limit')
      setShowUpgradeModal(true)
      return
    }

    setEditingWallet(null)
    setFormData({
      name: '',
      pool: '2miners',
      coin: 'etc',
      address: '',
      power: 200
    })
    setShowModal(true)
  }

  function handleEditWallet(wallet: Wallet) {
    setEditingWallet(wallet)
    setFormData({
      name: wallet.name,
      pool: wallet.pool,
      coin: wallet.coin,
      address: wallet.address,
      power: wallet.power
    })
    setShowModal(true)
  }

  async function handleSaveWallet(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const token = localStorage.getItem('user_token')

      if (editingWallet) {
        // Update existing wallet
        const res = await fetch('/api/wallets/sync', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: editingWallet.id,
            ...formData
          })
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update wallet')
        }

        const data = await res.json()
        setWallets(wallets.map(w => w.id === editingWallet.id ? data.wallet : w))
      } else {
        // Create new wallet
        const res = await fetch('/api/wallets/sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        })

        const data = await res.json()

        if (!res.ok) {
          if (data.limitReached) {
            setShowModal(false)
            setUpgradeTrigger('wallet_limit')
            setShowUpgradeModal(true)
            return
          }
          throw new Error(data.error || 'Failed to create wallet')
        }

        setWallets([...wallets, data.wallet])
      }

      setShowModal(false)
    } catch (err) {
      console.error('Error saving wallet:', err)
      setError(err instanceof Error ? err.message : 'Failed to save wallet')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteWallet(walletId: string) {
    if (!confirm('Are you sure you want to delete this wallet?')) return

    try {
      const token = localStorage.getItem('user_token')
      const res = await fetch(`/api/wallets/sync?id=${walletId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Failed to delete wallet')

      setWallets(wallets.filter(w => w.id !== walletId))
    } catch (err) {
      console.error('Error deleting wallet:', err)
      setError('Failed to delete wallet')
    }
  }

  async function handleToggleWallet(wallet: Wallet) {
    try {
      const token = localStorage.getItem('user_token')
      const res = await fetch('/api/wallets/sync', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: wallet.id,
          enabled: !wallet.enabled
        })
      })

      if (!res.ok) throw new Error('Failed to update wallet')

      setWallets(wallets.map(w => w.id === wallet.id ? { ...w, enabled: !w.enabled } : w))
    } catch (err) {
      console.error('Error toggling wallet:', err)
    }
  }

  // Rig handlers
  function handleAddRig() {
    setEditingRig(null)
    setRigFormData({
      name: '',
      gpu: '',
      power: 200,
      quantity: 1
    })
    setShowRigModal(true)
  }

  function handleEditRig(rig: Rig) {
    setEditingRig(rig)
    setRigFormData({
      name: rig.name,
      gpu: rig.gpu,
      power: rig.power,
      quantity: rig.quantity
    })
    setShowRigModal(true)
  }

  async function handleSaveRig(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    try {
      const token = localStorage.getItem('user_token')

      if (editingRig) {
        // Update existing rig
        const res = await fetch('/api/rigs/sync', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            id: editingRig.id,
            ...rigFormData
          })
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to update rig')
        }

        const data = await res.json()
        setRigs(rigs.map(r => r.id === editingRig.id ? data.rig : r))
      } else {
        // Create new rig
        const res = await fetch('/api/rigs/sync', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(rigFormData)
        })

        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Failed to create rig')
        }

        const data = await res.json()
        setRigs([...rigs, data.rig])
      }

      setShowRigModal(false)
    } catch (err) {
      console.error('Error saving rig:', err)
      setError(err instanceof Error ? err.message : 'Failed to save rig')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteRig(rigId: string) {
    if (!confirm('Are you sure you want to delete this rig?')) return

    try {
      const token = localStorage.getItem('user_token')
      const res = await fetch(`/api/rigs/sync?id=${rigId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (!res.ok) throw new Error('Failed to delete rig')

      setRigs(rigs.filter(r => r.id !== rigId))
    } catch (err) {
      console.error('Error deleting rig:', err)
      setError('Failed to delete rig')
    }
  }

  function getPoolLabel(value: string) {
    return POOLS.find(p => p.value === value)?.label || value
  }

  function getCoinLabel(value: string) {
    return COINS.find(c => c.value === value)?.label || value.toUpperCase()
  }

  // Filter pools/coins for free users
  const availablePools = isPro ? POOLS : POOLS.filter(p => FREE_POOLS.includes(p.value))
  const availableCoins = isPro ? COINS : COINS.filter(c => FREE_COINS.includes(c.value))

  const totalWalletPower = wallets.reduce((sum, w) => w.enabled ? sum + (w.power || 0) : sum, 0)
  const totalRigPower = rigs.reduce((sum, r) => sum + ((r.power || 0) * (r.quantity || 1)), 0)
  const totalPower = totalWalletPower + totalRigPower

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-dark-text-muted">Loading wallets...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-xl p-5 border border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-dark-text-muted">Wallets</p>
              <p className="text-2xl font-bold text-dark-text">
                {wallets.length}
                {!isPro && <span className="text-sm font-normal text-dark-text-dim"> / {FREE_WALLET_LIMIT}</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-dark-text-muted">Mining Rigs</p>
              <p className="text-2xl font-bold text-dark-text">{rigs.length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-dark-text-muted">Active Wallets</p>
              <p className="text-2xl font-bold text-dark-text">{wallets.filter(w => w.enabled).length}</p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-dark-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm text-dark-text-muted">Total Power</p>
              <p className="text-2xl font-bold text-dark-text">{totalPower}W</p>
            </div>
          </div>
        </div>
      </div>

      {/* Wallets Section */}
      <div className="glass-card rounded-xl border border-dark-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-dark-border">
          <div>
            <h2 className="text-lg font-semibold text-dark-text">Mining Wallets</h2>
            <p className="text-sm text-dark-text-muted">Configure your mining pool wallets</p>
          </div>
          <button
            onClick={handleAddWallet}
            className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Wallet
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-5 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {wallets.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-dark-card-hover flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-dark-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-dark-text mb-1">No wallets configured</h3>
            <p className="text-dark-text-muted mb-4">Add your mining pool wallets to start tracking</p>
            <button
              onClick={handleAddWallet}
              className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-green-600 transition-colors"
            >
              Add Your First Wallet
            </button>
          </div>
        ) : (
          <div className="divide-y divide-dark-border">
            {wallets.map((wallet) => (
              <div
                key={wallet.id}
                className={`p-5 hover:bg-dark-card-hover/50 transition-colors ${!wallet.enabled ? 'opacity-50' : ''}`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Toggle */}
                    <button
                      onClick={() => handleToggleWallet(wallet)}
                      className={`mt-1 w-10 h-6 rounded-full p-1 transition-colors ${wallet.enabled ? 'bg-primary' : 'bg-dark-border'}`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition-transform ${wallet.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-dark-text">{wallet.name}</h3>
                        <span className="px-2 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded">
                          {getCoinLabel(wallet.coin).split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-sm text-dark-text-muted mb-2">
                        {getPoolLabel(wallet.pool)} • {wallet.power}W
                      </p>
                      <p className="text-xs text-dark-text-dim font-mono truncate">
                        {wallet.address}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditWallet(wallet)}
                      className="p-2 text-dark-text-muted hover:text-dark-text hover:bg-dark-card-hover rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteWallet(wallet.id)}
                      className="p-2 text-dark-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mining Rigs Section */}
      <div className="glass-card rounded-xl border border-dark-border overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-dark-border">
          <div>
            <h2 className="text-lg font-semibold text-dark-text">Mining Rigs</h2>
            <p className="text-sm text-dark-text-muted">Configure your mining hardware for profit calculations</p>
          </div>
          <button
            onClick={handleAddRig}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Rig
          </button>
        </div>

        {rigs.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 rounded-full bg-dark-card-hover flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-dark-text-dim" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-dark-text mb-1">No rigs configured</h3>
            <p className="text-dark-text-muted mb-4">Add your mining rigs for accurate power cost calculations</p>
            <button
              onClick={handleAddRig}
              className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              Add Your First Rig
            </button>
          </div>
        ) : (
          <div className="divide-y divide-dark-border">
            {rigs.map((rig) => (
              <div
                key={rig.id}
                className="p-5 hover:bg-dark-card-hover/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1 min-w-0">
                    {/* Rig Icon */}
                    <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                      </svg>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-dark-text">{rig.name}</h3>
                        {rig.quantity > 1 && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-blue-500/20 text-blue-400 rounded">
                            x{rig.quantity}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-dark-text-muted mb-1">
                        {rig.gpu}
                      </p>
                      <p className="text-xs text-dark-text-dim">
                        {rig.power}W per unit • {rig.power * rig.quantity}W total
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditRig(rig)}
                      className="p-2 text-dark-text-muted hover:text-dark-text hover:bg-dark-card-hover rounded-lg transition-colors"
                      title="Edit"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteRig(rig.id)}
                      className="p-2 text-dark-text-muted hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Free tier upgrade prompt */}
      {!isPro && (
        <div className="glass-card rounded-xl border border-primary/30 p-5 bg-primary/5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-dark-text">Unlock Unlimited Wallets</p>
                <p className="text-sm text-dark-text-muted">Pro users get unlimited wallets, all pools, and cloud sync</p>
              </div>
            </div>
            <button
              onClick={() => {
                setUpgradeTrigger('upgrade_link')
                setShowUpgradeModal(true)
              }}
              className="px-4 py-2 bg-primary text-white font-medium rounded-lg hover:bg-green-600 transition-colors whitespace-nowrap"
            >
              Upgrade to Pro
            </button>
          </div>
        </div>
      )}

      {/* Add/Edit Wallet Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-dark-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-dark-border">
              <div className="flex items-center justify-between p-5 border-b border-dark-border">
                <h2 className="text-lg font-semibold text-dark-text">
                  {editingWallet ? 'Edit Wallet' : 'Add Wallet'}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="p-2 rounded-full hover:bg-dark-card-hover transition-colors text-dark-text-muted"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveWallet} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-1">Wallet Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Main Rig"
                    required
                    className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-text mb-1">
                    Mining Pool
                    {!isPro && <span className="text-xs text-dark-text-dim ml-2">(Pro unlocks all pools)</span>}
                  </label>
                  <select
                    value={formData.pool}
                    onChange={(e) => setFormData({ ...formData, pool: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    {availablePools.map(pool => (
                      <option key={pool.value} value={pool.value}>{pool.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-text mb-1">
                    Coin
                    {!isPro && <span className="text-xs text-dark-text-dim ml-2">(Pro unlocks all coins)</span>}
                  </label>
                  <select
                    value={formData.coin}
                    onChange={(e) => setFormData({ ...formData, coin: e.target.value })}
                    className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    {availableCoins.map(coin => (
                      <option key={coin.value} value={coin.value}>{coin.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-text mb-1">Wallet Address</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Your mining wallet address"
                    required
                    className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-text mb-1">Power Consumption (Watts)</label>
                  <input
                    type="number"
                    value={formData.power}
                    onChange={(e) => setFormData({ ...formData, power: parseInt(e.target.value) || 0 })}
                    placeholder="e.g., 200"
                    min="0"
                    className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                  <p className="text-xs text-dark-text-dim mt-1">
                    Total watts your rig uses. Used to calculate electricity costs.
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2.5 bg-dark-card-hover text-dark-text font-medium rounded-lg hover:bg-dark-border transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-primary text-white font-medium rounded-lg hover:bg-green-600 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving...' : editingWallet ? 'Update Wallet' : 'Add Wallet'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Rig Modal */}
      {showRigModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowRigModal(false)} />
          <div className="flex min-h-full items-center justify-center p-4">
            <div className="relative bg-dark-card rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-dark-border">
              <div className="flex items-center justify-between p-5 border-b border-dark-border">
                <h2 className="text-lg font-semibold text-dark-text">
                  {editingRig ? 'Edit Rig' : 'Add Rig'}
                </h2>
                <button
                  onClick={() => setShowRigModal(false)}
                  className="p-2 rounded-full hover:bg-dark-card-hover transition-colors text-dark-text-muted"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSaveRig} className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-text mb-1">Rig Name</label>
                  <input
                    type="text"
                    value={rigFormData.name}
                    onChange={(e) => setRigFormData({ ...rigFormData, name: e.target.value })}
                    placeholder="e.g., Main Mining Rig"
                    required
                    className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-text mb-1">GPU Model</label>
                  <select
                    value={rigFormData.gpu}
                    onChange={(e) => {
                      const selectedGpu = e.target.value
                      // Find power for selected GPU
                      let power = rigFormData.power
                      for (const group of GPU_OPTIONS) {
                        const found = group.options.find(opt => opt.value === selectedGpu)
                        if (found) {
                          power = found.power
                          break
                        }
                      }
                      setRigFormData({ ...rigFormData, gpu: selectedGpu, power })
                    }}
                    required
                    className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select GPU...</option>
                    {GPU_OPTIONS.map((group) => (
                      <optgroup key={group.group} label={group.group}>
                        {group.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.value}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">Power (Watts)</label>
                    <input
                      type="number"
                      value={rigFormData.power}
                      onChange={(e) => setRigFormData({ ...rigFormData, power: parseInt(e.target.value) || 0 })}
                      placeholder="e.g., 320"
                      min="0"
                      required
                      className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-dark-text-dim mt-1">Per GPU</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-dark-text mb-1">Quantity</label>
                    <input
                      type="number"
                      value={rigFormData.quantity}
                      onChange={(e) => setRigFormData({ ...rigFormData, quantity: parseInt(e.target.value) || 1 })}
                      min="1"
                      required
                      className="w-full px-4 py-2.5 bg-dark-card-hover border border-dark-border rounded-lg text-dark-text placeholder-dark-text-dim focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-dark-text-dim mt-1">GPUs in rig</p>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRigModal(false)}
                    className="flex-1 px-4 py-2.5 bg-dark-card-hover text-dark-text font-medium rounded-lg hover:bg-dark-border transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? 'Saving...' : editingRig ? 'Update Rig' : 'Add Rig'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        userEmail={auth?.user?.email}
        trigger={upgradeTrigger}
      />
    </div>
  )
}
