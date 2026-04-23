/**
 * In-memory token-bucket rate limiter keyed by client IP.
 *
 * Scope: per serverless-instance (Vercel). Good enough for MVP; a Redis/KV
 * backed limiter is tracked as Wave 3 follow-up.
 */

interface Bucket {
  tokens: number;
  lastRefillMs: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Max tokens the bucket can hold (= burst size). */
  capacity: number;
  /** Tokens added per second. */
  refillPerSec: number;
}

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds until the next token is available (integer, >= 1 when blocked). */
  retryAfterSec: number;
  remaining: number;
}

const DEFAULT_OPTS: RateLimitOptions = {
  capacity: 30,
  refillPerSec: 30 / 60, // 30 req/min
};

/**
 * Consume one token for `key`. Returns `{ allowed: false, retryAfterSec }`
 * when the bucket is empty.
 */
export function rateLimit(key: string, opts: RateLimitOptions = DEFAULT_OPTS): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  const bucket: Bucket = existing ?? { tokens: opts.capacity, lastRefillMs: now };

  // Refill based on elapsed time.
  const elapsedSec = (now - bucket.lastRefillMs) / 1000;
  if (elapsedSec > 0) {
    bucket.tokens = Math.min(opts.capacity, bucket.tokens + elapsedSec * opts.refillPerSec);
    bucket.lastRefillMs = now;
  }

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    buckets.set(key, bucket);
    return { allowed: true, retryAfterSec: 0, remaining: Math.floor(bucket.tokens) };
  }

  const needed = 1 - bucket.tokens;
  const retryAfterSec = Math.max(1, Math.ceil(needed / opts.refillPerSec));
  buckets.set(key, bucket);
  return { allowed: false, retryAfterSec, remaining: 0 };
}

/**
 * Extract a client IP from a Next.js request. Prefers `x-forwarded-for`
 * (Vercel pattern), falls back to `x-real-ip`, then a sentinel.
 */
export function getClientIp(headers: Headers): string {
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }
  const real = headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

/** Test-only: clear all buckets. */
export function __resetRateLimitForTests(): void {
  buckets.clear();
}

