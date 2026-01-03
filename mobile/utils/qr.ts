// QR Code parsing utilities

import { QRPayload, Wallet, Settings } from '@/types';

/**
 * Parse QR code data from MineGlance extension
 */
export function parseQRCode(data: string): QRPayload {
  let payload: QRPayload;

  try {
    // Try parsing as base64 first
    const decoded = atob(data);
    payload = JSON.parse(decoded);
  } catch {
    // Try parsing as plain JSON
    try {
      payload = JSON.parse(data);
    } catch {
      throw new Error('Invalid QR code format');
    }
  }

  // Validate required fields
  if (!payload.licenseKey) {
    throw new Error('QR code missing license key');
  }

  if (!payload.signature) {
    throw new Error('QR code missing signature');
  }

  if (!payload.timestamp) {
    throw new Error('QR code missing timestamp');
  }

  // Check if QR code is expired (24 hours)
  const maxAge = 24 * 60 * 60 * 1000; // 24 hours in ms
  if (Date.now() - payload.timestamp > maxAge) {
    throw new Error('QR code has expired. Please generate a new one.');
  }

  return payload;
}

/**
 * Validate wallet data from QR payload
 */
export function validateWallets(wallets: unknown[]): Wallet[] {
  if (!Array.isArray(wallets)) {
    return [];
  }

  return wallets
    .filter((w): w is Record<string, unknown> => typeof w === 'object' && w !== null)
    .map((w, index) => ({
      id: (w.id as string) || `wallet-${index}-${Date.now()}`,
      name: (w.name as string) || '',
      address: (w.address as string) || '',
      coin: (w.coin as string) || '',
      pool: (w.pool as string) || '',
      enabled: w.enabled !== false,
      order: (w.order as number) || index,
    }))
    .filter(w => w.address && w.coin && w.pool);
}

/**
 * Validate settings from QR payload
 */
export function validateSettings(settings: unknown): Partial<Settings> {
  if (!settings || typeof settings !== 'object') {
    return {};
  }

  const s = settings as Record<string, unknown>;

  return {
    refreshInterval: typeof s.ref === 'number' ? s.ref : undefined,
    electricityRate: typeof s.elec === 'number' ? s.elec : undefined,
    electricityCurrency: typeof s.curr === 'string' ? s.curr : undefined,
  };
}

/**
 * Check if string looks like a MineGlance QR code
 */
export function isMineGlanceQR(data: string): boolean {
  try {
    const payload = parseQRCode(data);
    return !!(payload.licenseKey && payload.signature);
  } catch {
    return false;
  }
}

/**
 * Base64 decode (for environments without atob)
 */
function atob(input: string): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let str = input.replace(/=+$/, '');
  let output = '';

  if (str.length % 4 === 1) {
    throw new Error('Invalid base64 string');
  }

  for (let bc = 0, bs = 0, buffer, i = 0; (buffer = str.charAt(i++));) {
    buffer = chars.indexOf(buffer);
    if (buffer === -1) continue;
    bs = bc % 4 ? bs * 64 + buffer : buffer;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
    }
  }

  return output;
}
