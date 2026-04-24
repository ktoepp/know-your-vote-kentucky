/**
 * Short-TTL in-memory cache for Anthropic-generated text keyed by a stable
 * hash of the source item plus a prompt-version tag.
 *
 * Scope: per serverless-instance (Vercel). A shared KV-backed cache is tracked
 * as Wave 3 follow-up.
 *
 * Hit/miss events are fire-and-forget incremented into the `ky_sync_state`
 * table via the `ky_increment_counter` RPC for observability.
 */
import { createHash } from 'node:crypto';
import { supabaseAdmin } from '../app/lib/supabaseAdminCore';

interface Entry {
  value: string;
  expiresAtMs: number;
}

const store = new Map<string, Entry>();

/** Bump when the prompt or model changes to invalidate old entries. */
export const INTELLIGENCE_PROMPT_VERSION = 'why-it-matters-v1';

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export interface CacheKeyParts {
  type: string;
  id: string | number;
  updated_at: string | null | undefined;
  promptVersion: string;
}

/** SHA-256 of the stable (type, id, updated_at, promptVersion) tuple. */
export function makeCacheKey(parts: CacheKeyParts): string {
  const canonical = JSON.stringify({
    type: parts.type,
    id: String(parts.id),
    updated_at: parts.updated_at ?? '',
    promptVersion: parts.promptVersion,
  });
  return createHash('sha256').update(canonical).digest('hex');
}

/** Returns the cached value if present and not expired. */
export function getCached(key: string): string | null {
  const entry = store.get(key);
  if (!entry) {
    void supabaseAdmin
      ?.rpc('ky_increment_counter', {
        counter_key: 'anthropic_cache_misses',
        bucket_key: new Date().toISOString().slice(0, 10),
      })
      .then(() => undefined, () => undefined);
    return null;
  }
  if (entry.expiresAtMs <= Date.now()) {
    store.delete(key);
    void supabaseAdmin
      ?.rpc('ky_increment_counter', {
        counter_key: 'anthropic_cache_misses',
        bucket_key: new Date().toISOString().slice(0, 10),
      })
      .then(() => undefined, () => undefined);
    return null;
  }
  void supabaseAdmin
    ?.rpc('ky_increment_counter', {
      counter_key: 'anthropic_cache_hits',
      bucket_key: new Date().toISOString().slice(0, 10),
    })
    .then(() => undefined, () => undefined);
  return entry.value;
}

/** Store `value` under `key` with `ttlMs` (default 15 minutes). */
export function setCached(key: string, value: string, ttlMs: number = DEFAULT_TTL_MS): void {
  store.set(key, { value, expiresAtMs: Date.now() + ttlMs });
}

/** Test-only: clear all entries. */
export function __resetCacheForTests(): void {
  store.clear();
}
