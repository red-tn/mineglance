'use client'

import { useState, useEffect } from 'react'
import { GPUS, ASICS, MiningHardware, formatHashrate } from '@/lib/miningHardware'
import { COINS, CoinData, calculateProfit, getCoinsForHardwareType, ProfitResult } from '@/lib/coinProfitability'
import { lookupElectricityRate, DEFAULT_RATE } from '@/lib/electricityRates'

export default function ProfitCalculator() {
  const [hardwareType, setHardwareType] = useState<'gpu' | 'asic'>('gpu')
  const [selectedHardware, setSelectedHardware] = useState<MiningHardware | null>(null)
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null)
  const [zipCode, setZipCode] = useState('')
  const [electricityRate, setElectricityRate] = useState(DEFAULT_RATE)
  const [lookupResult, setLookupResult] = useState<string | null>(null)
  const [manualRate, setManualRate] = useState(false)
  const [result, setResult] = useState<ProfitResult | null>(null)

  // Get hardware list based on type
  const hardwareList = hardwareType === 'gpu' ? GPUS : ASICS

  // Get available coins for selected hardware
  const availableCoins = selectedHardware
    ? COINS.filter(coin => selectedHardware.algorithms.includes(coin.algorithm))
    : getCoinsForHardwareType(hardwareType)

  // Set default hardware and coin when type changes
  useEffect(() => {
    const defaultHardware = hardwareList[0]
    setSelectedHardware(defaultHardware)

    // Find first coin that matches the hardware's algorithms
    const matchingCoin = COINS.find(coin => defaultHardware.algorithms.includes(coin.algorithm))
    setSelectedCoin(matchingCoin || null)
  }, [hardwareType])

  // Update coin if current coin doesn't match new hardware
  useEffect(() => {
    if (selectedHardware && selectedCoin) {
      if (!selectedHardware.algorithms.includes(selectedCoin.algorithm)) {
        const matchingCoin = COINS.find(coin => selectedHardware.algorithms.includes(coin.algorithm))
        setSelectedCoin(matchingCoin || null)
      }
    }
  }, [selectedHardware])

  // Calculate profit when inputs change
  useEffect(() => {
    if (selectedHardware && selectedCoin) {
      const hashrate = selectedHardware.hashrates[selectedCoin.algorithm] || 0
      if (hashrate > 0) {
        const profitResult = calculateProfit(
          hashrate,
          selectedCoin,
          selectedHardware.power,
          electricityRate,
          selectedHardware.msrp
        )
        setResult(profitResult)
      } else {
        setResult(null)
      }
    }
  }, [selectedHardware, selectedCoin, electricityRate])

  // Lookup electricity rate from ZIP code
  const handleZipLookup = () => {
    const lookupData = lookupElectricityRate(zipCode)
    if (lookupData) {
      setElectricityRate(lookupData.rate)
      setLookupResult(`${lookupData.stateName} avg: $${lookupData.rate.toFixed(2)}/kWh`)
      setManualRate(false)
    } else {
      setLookupResult('ZIP not found - using national average')
      setElectricityRate(DEFAULT_RATE)
    }
  }

  const handleManualRateChange = (value: string) => {
    const rate = parseFloat(value)
    if (!isNaN(rate) && rate >= 0) {
      setElectricityRate(rate)
      setManualRate(true)
      setLookupResult(null)
    }
  }

  return (
    <section className="py-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold">
            <span className="text-gradient">Mining Profitability Calculator</span>
          </h2>
          <p className="mt-4 text-lg text-dark-text-muted max-w-2xl mx-auto">
            See your potential mining profits before you start. Select your hardware, enter your electricity rate, and get instant projections.
          </p>
        </div>

        <div className="glass-card rounded-xl p-6 sm:p-8">
          {/* Input Section */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Hardware Type */}
            <div>
              <label className="block text-sm font-medium text-dark-text-muted mb-2">
                Hardware Type
              </label>
              <select
                value={hardwareType}
                onChange={(e) => setHardwareType(e.target.value as 'gpu' | 'asic')}
                className="w-full bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-dark-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="gpu">GPU</option>
                <option value="asic">ASIC</option>
              </select>
            </div>

            {/* Hardware Model */}
            <div>
              <label className="block text-sm font-medium text-dark-text-muted mb-2">
                Hardware Model
              </label>
              <select
                value={selectedHardware?.id || ''}
                onChange={(e) => {
                  const hw = hardwareList.find(h => h.id === e.target.value)
                  setSelectedHardware(hw || null)
                }}
                className="w-full bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-dark-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {hardwareList.map(hw => (
                  <option key={hw.id} value={hw.id}>
                    {hw.name} ({hw.power}W)
                  </option>
                ))}
              </select>
            </div>

            {/* Coin */}
            <div>
              <label className="block text-sm font-medium text-dark-text-muted mb-2">
                Coin
              </label>
              <select
                value={selectedCoin?.symbol || ''}
                onChange={(e) => {
                  const coin = COINS.find(c => c.symbol === e.target.value)
                  setSelectedCoin(coin || null)
                }}
                className="w-full bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-dark-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                {availableCoins.map(coin => (
                  <option key={coin.symbol} value={coin.symbol}>
                    {coin.symbol} - {coin.name}
                  </option>
                ))}
              </select>
            </div>

            {/* ZIP Code */}
            <div>
              <label className="block text-sm font-medium text-dark-text-muted mb-2">
                ZIP Code (US)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
                  placeholder="90210"
                  maxLength={5}
                  className="flex-1 bg-dark-card border border-dark-border rounded-lg px-4 py-3 text-dark-text focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={handleZipLookup}
                  disabled={zipCode.length < 3}
                  className="px-4 py-3 bg-primary hover:bg-primary-light disabled:bg-dark-border disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  Lookup
                </button>
              </div>
              {lookupResult && (
                <p className="text-xs text-primary mt-1">{lookupResult}</p>
              )}
            </div>
          </div>

          {/* Electricity Rate Manual Entry */}
          <div className="mb-8 flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-dark-text-muted">
                Electricity Rate:
              </label>
              <div className="flex items-center gap-1">
                <span className="text-dark-text-muted">$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={electricityRate}
                  onChange={(e) => handleManualRateChange(e.target.value)}
                  className="w-20 bg-dark-card border border-dark-border rounded px-2 py-1 text-dark-text text-center focus:outline-none focus:border-primary"
                />
                <span className="text-dark-text-muted">/kWh</span>
              </div>
            </div>
            {selectedHardware && selectedCoin && (
              <div className="text-sm text-dark-text-dim">
                Hashrate: {formatHashrate(selectedHardware.hashrates[selectedCoin.algorithm] || 0)} | Power: {selectedHardware.power}W
              </div>
            )}
          </div>

          {/* Results Section */}
          {result && (
            <>
              <div className="grid sm:grid-cols-3 gap-4 mb-6">
                {/* Daily Gross */}
                <div className="bg-dark-card/50 border border-dark-border rounded-xl p-4 text-center">
                  <p className="text-sm text-dark-text-muted mb-1">Daily Gross</p>
                  <p className="text-2xl font-bold text-dark-text">
                    ${result.dailyGross.toFixed(2)}
                  </p>
                </div>

                {/* Power Cost */}
                <div className="bg-dark-card/50 border border-dark-border rounded-xl p-4 text-center">
                  <p className="text-sm text-dark-text-muted mb-1">Power Cost</p>
                  <p className="text-2xl font-bold text-red-400">
                    -${result.dailyElectricity.toFixed(2)}
                  </p>
                </div>

                {/* Net Profit */}
                <div className={`bg-dark-card/50 border rounded-xl p-4 text-center ${
                  result.isProfitable ? 'border-primary/50' : 'border-red-500/50'
                }`}>
                  <p className="text-sm text-dark-text-muted mb-1">Daily Net Profit</p>
                  <p className={`text-2xl font-bold ${
                    result.isProfitable ? 'text-primary' : 'text-red-400'
                  }`}>
                    {result.isProfitable ? '+' : ''}${result.dailyNet.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Monthly Projection */}
              <div className={`rounded-xl p-6 mb-6 ${
                result.isProfitable
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-red-500/10 border border-red-500/30'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-dark-text-muted mb-1">Monthly Projection</p>
                    <p className={`text-3xl font-bold ${
                      result.isProfitable ? 'text-primary' : 'text-red-400'
                    }`}>
                      {result.isProfitable ? '+' : ''}${result.monthlyNet.toFixed(2)}
                      <span className="text-lg font-normal text-dark-text-muted"> /month</span>
                    </p>
                  </div>
                  {result.roiDays && selectedHardware && (
                    <div className="text-right">
                      <p className="text-sm text-dark-text-muted mb-1">ROI at Current Rates</p>
                      <p className="text-xl font-semibold text-dark-text">
                        ~{Math.round(result.roiDays / 30)} months
                        <span className="text-sm font-normal text-dark-text-muted ml-1">
                          ({selectedHardware.name} ${selectedHardware.msrp.toLocaleString()})
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Disclaimer */}
              <p className="text-xs text-dark-text-dim text-center mb-6">
                * Estimates based on current network conditions. Actual profits vary with network difficulty, coin prices, and pool fees. Last updated: January 2026.
              </p>
            </>
          )}

          {/* CTA */}
          <div className="text-center">
            <a
              href="https://chromewebstore.google.com/detail/mineglance-mining-profit/fohkkkgboehiaeoakpjbipiakokdgajl"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 btn-primary text-lg"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              Start Tracking Your Profits
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
            <p className="text-sm text-dark-text-dim mt-3">
              Free Chrome extension - track real earnings from 15+ mining pools
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
