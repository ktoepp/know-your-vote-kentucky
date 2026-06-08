/**
 * Shared-store token-bucket rate limiter keyed by client IP.
 *
 * Backed by Supabase Postgres (`ky_rate_limit_buckets` table + `ky_rate_limit_consume` RPC)
 * so the 30 req/min limit is enforced consistently across all Vercel serverless instances.
 *
 * Fails open: if the RPC errors the request is allowed through and a warning is logged.
 */
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '../app/lib/supabaseAdminCore';

export interface RateLimitOptions {
  /** Max tokens the bucket can hold (= burst size). */
  capacity: number;
  /** Tokens added per second. */
  refillPerSec: number;
  /** Optional route label included in deny log lines. */
  route?: string;
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
  route: 'unknown',
};

/**
 * Consume one token for `key`. Returns `{ allowed: false, retryAfterSec }`
 * when the bucket is empty.
 *
 * Async — uses Supabase RPC so the limit applies across all serverless instances.
 */
export async function rateLimit(
  key: string,
  opts: RateLimitOptions = DEFAULT_OPTS,
): Promise<RateLimitResult> {
  const { capacity, refillPerSec, route = 'unknown' } = opts;

  if (!supabaseAdmin) {
    // No admin client configured — fail open.
    console.warn('[rate-limit] supabaseAdmin not configured, failing open');
    return { allowed: true, retryAfterSec: 0, remaining: -1 };
  }

  try {
    const { data, error } = await supabaseAdmin.rpc('ky_rate_limit_consume', {
      p_key: key,
      p_capacity: capacity,
      p_refill_per_sec: refillPerSec,
    });

    if (error) throw error;

    // RPC returns an array with one row.
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('ky_rate_limit_consume returned no rows');

    const result: RateLimitResult = {
      allowed: row.allowed,
      retryAfterSec: row.retry_after_sec ?? 0,
      remaining: row.remaining ?? 0,
    };

    if (!result.allowed) {
      const ipHash = createHash('sha256').update(key).digest('hex').slice(0, 8);
      console.log(
        `[rate-limit] denied route=${route} ip_hash=${ipHash} remaining=0 retry_after=${result.retryAfterSec}`,
      );
      // Fire-and-forget deny counter — never throw.
      void supabaseAdmin
        ?.rpc('ky_increment_counter', {
          counter_key: 'rate_limit_denies',
          bucket_key: new Date().toISOString().slice(0, 10),
        })
        .then(() => undefined, () => undefined);
    }

    return result;
  } catch (err: any) {
    console.warn(`[rate-limit] RPC error, failing open: ${err?.message ?? err}`);
    return { allowed: true, retryAfterSec: 0, remaining: -1 };
  }
}

/**
 * Extract a client IP from a Next.js request.
 *
 * Priority:
 *  1. `x-real-ip` — Vercel's edge sets this to the connecting IP; clients
 *     cannot forge it because the edge overwrites any client-supplied value.
 *  2. Last entry of `x-forwarded-for` — Vercel appends the real client IP at
 *     the end of the chain, so the last entry is trustworthy. The first entry
 *     may be client-supplied and must not be used for rate-limiting.
 */
export function getClientIp(headers: Headers): string {
  const real = headers.get('x-real-ip');
  if (real) return real.trim();

  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',');
    const last = parts[parts.length - 1]?.trim();
    if (last) return last;
  }
  return 'unknown';
}

/** Test-only: no-op (state now lives in Supabase, not in-process memory). */
export function __resetRateLimitForTests(): void {
  // State is in the Supabase `ky_rate_limit_buckets` table.
  // To reset in tests, truncate that table directly via supabaseAdmin.
}
