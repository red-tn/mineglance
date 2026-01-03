// MineGlance API client

const API_BASE = 'https://www.mineglance.com/api';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface LicenseStatus {
  isPro: boolean;
  plan?: 'pro' | 'bundle';
  email?: string;
}

interface QRVerifyResponse {
  success: boolean;
  plan?: string;
  error?: string;
}

/**
 * Verify license key with server
 */
export async function verifyLicense(
  licenseKey: string,
  instanceId: string
): Promise<LicenseStatus> {
  if (!licenseKey || !instanceId) {
    return { isPro: false };
  }

  try {
    const response = await fetch(
      `${API_BASE}/activate-license?key=${encodeURIComponent(licenseKey)}&installId=${encodeURIComponent(instanceId)}`
    );
    const data = await response.json();
    return data;
  } catch {
    return { isPro: false };
  }
}

/**
 * Activate license on this device
 */
export async function activateLicense(
  licenseKey: string,
  instanceId: string
): Promise<ApiResponse<LicenseStatus>> {
  if (!licenseKey || !instanceId) {
    return { success: false, error: 'License key required' };
  }

  try {
    const response = await fetch(`${API_BASE}/activate-license`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey: licenseKey.toUpperCase().trim(),
        installId: instanceId,
        deviceName: 'Mobile App',
      }),
    });
    const data = await response.json();
    return { success: data.success, data, error: data.error };
  } catch {
    return { success: false, error: 'Connection failed. Please try again.' };
  }
}

/**
 * Verify QR code signature with server
 */
export async function verifyQRCode(
  licenseKey: string,
  signature: string,
  timestamp: number
): Promise<QRVerifyResponse> {
  try {
    const response = await fetch(`${API_BASE}/dashboard/qr`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${licenseKey}`,
      },
      body: JSON.stringify({ signature, timestamp }),
    });

    if (!response.ok) {
      const error = await response.json();
      return { success: false, error: error.error || 'Verification failed' };
    }

    const data = await response.json();
    return { success: true, plan: data.plan };
  } catch {
    return { success: false, error: 'Connection failed' };
  }
}

/**
 * Send email alert (Pro feature)
 */
export async function sendEmailAlert(
  licenseKey: string,
  alertType: string,
  walletName: string,
  message: string,
  email: string
): Promise<boolean> {
  try {
    await fetch(`${API_BASE}/send-alert`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        licenseKey,
        alertType,
        walletName,
        message,
        email,
      }),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Fetch coin price from CoinGecko
 */
export async function fetchCoinPrice(geckoId: string): Promise<number | null> {
  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoId}&vs_currencies=usd`
    );
    const data = await response.json();
    return data[geckoId]?.usd || null;
  } catch {
    return null;
  }
}

/**
 * Fetch multiple coin prices at once
 */
export async function fetchCoinPrices(
  geckoIds: string[]
): Promise<Record<string, number>> {
  if (geckoIds.length === 0) return {};

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${geckoIds.join(',')}&vs_currencies=usd`
    );
    const data = await response.json();

    const prices: Record<string, number> = {};
    for (const id of geckoIds) {
      if (data[id]?.usd) {
        prices[id] = data[id].usd;
      }
    }
    return prices;
  } catch {
    return {};
  }
}

/**
 * Generate unique instance ID for this app installation
 */
export function generateInstanceId(): string {
  return 'mg_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
