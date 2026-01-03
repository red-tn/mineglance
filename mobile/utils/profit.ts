// Profit calculation utilities

export interface ProfitCalculation {
  grossEarnings: number;    // USD earnings before costs
  electricityCost: number;  // USD electricity cost
  netProfit: number;        // USD profit after electricity
  profitMargin: number;     // Percentage profit margin
}

/**
 * Calculate daily profit based on earnings and electricity costs
 */
export function calculateDailyProfit(
  earnings24hUsd: number,
  powerWatts: number,
  electricityRate: number // Cost per kWh
): ProfitCalculation {
  // Calculate daily electricity cost
  // Power (kW) * 24 hours * rate per kWh
  const dailyKwh = (powerWatts / 1000) * 24;
  const electricityCost = dailyKwh * electricityRate;

  const netProfit = earnings24hUsd - electricityCost;
  const profitMargin = earnings24hUsd > 0
    ? (netProfit / earnings24hUsd) * 100
    : 0;

  return {
    grossEarnings: earnings24hUsd,
    electricityCost,
    netProfit,
    profitMargin,
  };
}

/**
 * Calculate monthly profit projection
 */
export function calculateMonthlyProfit(
  dailyProfit: ProfitCalculation
): ProfitCalculation {
  return {
    grossEarnings: dailyProfit.grossEarnings * 30,
    electricityCost: dailyProfit.electricityCost * 30,
    netProfit: dailyProfit.netProfit * 30,
    profitMargin: dailyProfit.profitMargin,
  };
}

/**
 * Calculate break-even electricity rate
 * Returns the max $/kWh rate where mining is still profitable
 */
export function calculateBreakEvenRate(
  earnings24hUsd: number,
  powerWatts: number
): number {
  if (powerWatts <= 0) return Infinity;

  const dailyKwh = (powerWatts / 1000) * 24;
  return earnings24hUsd / dailyKwh;
}

/**
 * Calculate ROI for hardware investment
 */
export function calculateRoi(
  hardwareCost: number,
  dailyNetProfit: number
): { days: number; months: number } | null {
  if (dailyNetProfit <= 0) return null;

  const days = hardwareCost / dailyNetProfit;
  return {
    days: Math.ceil(days),
    months: Math.ceil(days / 30),
  };
}

/**
 * Check if mining is profitable
 */
export function isProfitable(
  earnings24hUsd: number,
  powerWatts: number,
  electricityRate: number
): boolean {
  const profit = calculateDailyProfit(earnings24hUsd, powerWatts, electricityRate);
  return profit.netProfit > 0;
}

/**
 * Calculate profit change percentage
 */
export function calculateProfitChange(
  currentProfit: number,
  previousProfit: number
): number {
  if (previousProfit === 0) {
    return currentProfit > 0 ? 100 : 0;
  }
  return ((currentProfit - previousProfit) / Math.abs(previousProfit)) * 100;
}

/**
 * Format profit with sign
 */
export function formatProfit(amount: number): string {
  const sign = amount >= 0 ? '+' : '';
  return `${sign}$${Math.abs(amount).toFixed(2)}`;
}
