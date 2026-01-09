/**
 * Secure password hashing with bcrypt
 * Includes silent migration from SHA256 to bcrypt
 */

import bcrypt from 'bcrypt'
import crypto from 'crypto'

// Cost factor for bcrypt (12 = ~250ms per hash, good balance of security/performance)
const BCRYPT_ROUNDS = 12

// Salts for legacy SHA256 hashing (for migration only)
const ADMIN_SALT = process.env.ADMIN_SALT || 'mineglance-salt'
const USER_SALT = process.env.USER_SALT || 'mineglance-user-salt'

/**
 * Hash a password with bcrypt (use for new passwords)
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

/**
 * Verify a password against a hash
 * Supports both bcrypt and legacy SHA256 hashes
 * Returns { valid, needsRehash } - if needsRehash is true, caller should update the stored hash
 */
export async function verifyPassword(
  password: string,
  storedHash: string,
  isAdmin: boolean = false
): Promise<{ valid: boolean; needsRehash: boolean }> {
  // bcrypt hashes start with $2a$, $2b$, or $2y$
  const isBcryptHash = storedHash.startsWith('$2')

  if (isBcryptHash) {
    // Modern bcrypt hash - just verify
    const valid = await bcrypt.compare(password, storedHash)
    return { valid, needsRehash: false }
  }

  // Legacy SHA256 hash - verify with old method
  const salt = isAdmin ? ADMIN_SALT : USER_SALT
  const legacyHash = crypto
    .createHash('sha256')
    .update(password + salt)
    .digest('hex')

  const valid = legacyHash === storedHash

  // If valid, signal that we need to rehash with bcrypt
  return { valid, needsRehash: valid }
}

/**
 * Check if a hash needs to be upgraded to bcrypt
 */
export function needsHashUpgrade(storedHash: string): boolean {
  return !storedHash.startsWith('$2')
}
