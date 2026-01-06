/**
 * Wallet Address Encryption Utility
 * Uses AES-256-GCM for encrypting sensitive wallet data
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16

// Get encryption key from environment
function getEncryptionKey(): Buffer {
  const key = process.env.WALLET_ENCRYPTION_KEY
  if (!key) {
    throw new Error('WALLET_ENCRYPTION_KEY environment variable is not set')
  }
  // Key should be 32 bytes (256 bits) - hash if different length
  if (key.length === 64) {
    // Key is already hex-encoded 32 bytes
    return Buffer.from(key, 'hex')
  }
  // Hash the key to get exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest()
}

/**
 * Encrypt a wallet address
 * Returns a base64-encoded string containing: IV + ciphertext + auth tag
 */
export function encryptWalletAddress(address: string): string {
  if (!address) return ''

  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

    let encrypted = cipher.update(address, 'utf8', 'hex')
    encrypted += cipher.final('hex')

    const authTag = cipher.getAuthTag()

    // Combine IV + encrypted data + auth tag
    const combined = Buffer.concat([
      iv,
      Buffer.from(encrypted, 'hex'),
      authTag
    ])

    return combined.toString('base64')
  } catch (error) {
    console.error('Encryption error:', error)
    // Return original if encryption fails (allows graceful fallback)
    return address
  }
}

/**
 * Decrypt a wallet address
 * Input should be base64-encoded string from encryptWalletAddress
 */
export function decryptWalletAddress(encryptedAddress: string): string {
  if (!encryptedAddress) return ''

  try {
    const key = getEncryptionKey()
    const combined = Buffer.from(encryptedAddress, 'base64')

    // Check if this looks like an encrypted value
    if (combined.length < IV_LENGTH + TAG_LENGTH + 1) {
      // Too short to be encrypted - return as-is (unencrypted legacy data)
      return encryptedAddress
    }

    // Extract IV, encrypted data, and auth tag
    const iv = combined.subarray(0, IV_LENGTH)
    const authTag = combined.subarray(combined.length - TAG_LENGTH)
    const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH)

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)

    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])

    return decrypted.toString('utf8')
  } catch (error) {
    // If decryption fails, the data might be unencrypted (legacy)
    // Check if it looks like a wallet address (alphanumeric)
    if (/^[a-zA-Z0-9]+$/.test(encryptedAddress)) {
      return encryptedAddress
    }
    console.error('Decryption error:', error)
    return encryptedAddress
  }
}

/**
 * Check if a value is encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false

  try {
    const decoded = Buffer.from(value, 'base64')
    // Encrypted values should be at least IV + TAG + 1 byte of data
    return decoded.length >= IV_LENGTH + TAG_LENGTH + 1
  } catch {
    return false
  }
}

/**
 * Migrate wallet address from plain text to encrypted
 * Returns encrypted address or original if already encrypted
 */
export function migrateWalletAddress(address: string): string {
  if (!address) return ''

  // Check if already encrypted
  if (isEncrypted(address)) {
    // Verify it can be decrypted
    try {
      decryptWalletAddress(address)
      return address // Already encrypted and valid
    } catch {
      // Invalid encrypted data - re-encrypt
    }
  }

  // Encrypt the plain text address
  return encryptWalletAddress(address)
}
