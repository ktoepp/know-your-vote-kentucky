/**
 * Caller tagging for LegiScan quota accounting.
 *
 * `KyLegiScanClient` is a process-wide singleton (`getKyLegiScanClient`), so the
 * caller can't be a constructor argument — the accuracy audit, the sync
 * pipeline and a one-off backfill script all share the same instance. The tag
 * is therefore ambient: either set for the whole process (`LEGISCAN_CALLER`,
 * which is how cron workflows and CLI scripts identify themselves) or scoped to
 * one call tree with `withLegiscanCaller`.
 *
 * Tags land in the `legiscan_query_counter` payload as `month:op@caller`
 * buckets, so keep the vocabulary small and stable — every distinct tag is a
 * permanent key in that JSON blob.
 */
import { AsyncLocalStorage } from 'node:async_hooks';

/** Recorded when nothing set a tag — a call path we haven't attributed yet. */
export const UNTAGGED_LEGISCAN_CALLER = 'untagged';

const store = new AsyncLocalStorage<string>();

/**
 * Lowercase, `[a-z0-9-]`, 32 chars max. Bucket keys are `month:op@caller`, so a
 * tag carrying `:` or `@` would produce keys no reader can split back apart.
 */
export function normalizeLegiscanCaller(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32)
    .replace(/-+$/g, '');
  return slug || null;
}

/** Tags every LegiScan call made inside `fn` (including awaited ones). */
export function withLegiscanCaller<T>(caller: string, fn: () => T): T {
  const slug = normalizeLegiscanCaller(caller);
  if (!slug) return fn();
  return store.run(slug, fn);
}

/** Scoped tag, else `LEGISCAN_CALLER`, else `UNTAGGED_LEGISCAN_CALLER`. */
export function currentLegiscanCaller(): string {
  return (
    store.getStore() ??
    normalizeLegiscanCaller(process.env.LEGISCAN_CALLER) ??
    UNTAGGED_LEGISCAN_CALLER
  );
}
