/**
 * Rate limiting utility for auth endpoints
 * Prevents brute force attacks by limiting login attempts per IP
 */

interface RateLimitRecord {
  count: number
  resetTime: number
}

// In-memory store (resets on server restart, which is fine for rate limiting)
const attempts = new Map<string, RateLimitRecord>()

// Clean up old entries every 15 minutes
setInterval(() => {
  const now = Date.now()
  for (const [key, record] of attempts.entries()) {
    if (now > record.resetTime) {
      attempts.delete(key)
    }
  }
}, 15 * 60 * 1000)

interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterSeconds?: number
}

/**
 * Check if an IP is allowed to make a request
 * @param ip - The IP address to check
 * @param maxAttempts - Maximum attempts allowed in the window (default: 5)
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 */
export function checkRateLimit(
  ip: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000
): RateLimitResult {
  const now = Date.now()
  const key = `auth:${ip}`
  const record = attempts.get(key)

  // First attempt or window expired - allow and start fresh
  if (!record || now > record.resetTime) {
    attempts.set(key, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: maxAttempts - 1 }
  }

  // Check if over limit
  if (record.count >= maxAttempts) {
    const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000)
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds
    }
  }

  // Increment and allow
  record.count++
  return { allowed: true, remaining: maxAttempts - record.count }
}

/**
 * Reset rate limit for an IP (call after successful login)
 */
export function resetRateLimit(ip: string): void {
  attempts.delete(`auth:${ip}`)
}

/**
 * Get client IP from request headers
 */
export function getClientIp(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown'
}
