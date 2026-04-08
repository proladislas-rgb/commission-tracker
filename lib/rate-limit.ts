// lib/rate-limit.ts
// Simple in-memory sliding-window rate limiter. Acceptable pour un outil interne
// mono-instance (Vercel serverless fonctionne par instance, donc par région).
// Pour du multi-instance avec vraie reliability, migrer vers Upstash Redis.

interface Bucket {
  timestamps: number[]
}

const buckets = new Map<string, Bucket>()

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function rateLimit(
  key: string,
  maxRequests: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now()
  const bucket = buckets.get(key) ?? { timestamps: [] }
  // Purge timestamps outside the window
  bucket.timestamps = bucket.timestamps.filter(t => now - t < windowMs)
  const allowed = bucket.timestamps.length < maxRequests
  if (allowed) bucket.timestamps.push(now)
  buckets.set(key, bucket)
  return {
    allowed,
    remaining: Math.max(0, maxRequests - bucket.timestamps.length),
    resetAt: bucket.timestamps[0] ? bucket.timestamps[0] + windowMs : now + windowMs,
  }
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()
  return 'unknown'
}
