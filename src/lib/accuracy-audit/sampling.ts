/**
 * Seeded random sampling for the accuracy audit.
 *
 * Goal: every run samples a different slice of the data, but a given seed is
 * reproducible — AND stable across data changes. We select rows by a
 * deterministic hash of `(seed, stable row key)` and keep the lowest-N hashes
 * ("bottom-k" / consistent sampling). Because each row's membership depends only
 * on its own key + the seed (not on an offset into a live row count), reseeding
 * with the same seed re-selects the same rows even after the table mutates
 * (rows added, removed, or re-tagged). A previously-sampled row only drops out
 * if it itself stops matching the filter — then the next-lowest hash takes its
 * place. This fixes the old offset-into-COUNT sampler, where any change to the
 * filtered population shifted the window and produced a different sample for the
 * same seed.
 */
import type { SupabaseClient } from '@supabase/supabase-js';

/** Deterministic PRNG (mulberry32). Same seed => same sequence. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(arr: readonly T[], rng: () => number): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/**
 * Deterministic 32-bit hash of a string key salted by `seed` (FNV-1a core +
 * final avalanche). Same (seed, key) => same value, well-distributed so
 * bottom-k selection spreads across the corpus.
 */
export function hashKey(seed: number, key: string): number {
  let h = (seed ^ 0x811c9dc5) >>> 0;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 0x01000193) >>> 0;
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b) >>> 0;
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}

type QueryBuilder = ReturnType<SupabaseClient['from']>;
// PostgREST filter builders are returned by .select(); type them loosely.
type FilteredQuery = ReturnType<QueryBuilder['select']>;

export interface SampleParams {
  table: string;
  /** Columns to fetch for the sampled rows. */
  select: string;
  seed: number;
  /** Number of rows to return. */
  limit: number;
  /**
   * Stable, unique key column used for hashing + selection (default "id").
   * Must be unique per row so a bill is consistently in-or-out for a given seed.
   */
  keyColumn?: string;
  /** Optional filter applied to BOTH the key scan and the row fetch. */
  filter?: (q: FilteredQuery) => FilteredQuery;
  /**
   * Identifies the (table, filter) population so its key scan can be reused
   * within a run. Two calls sharing a `cacheKey` MUST apply the same filter.
   * Omit to force a fresh scan.
   */
  cacheKey?: string;
}

/** PostgREST caps a single response; page the key scan to cover the whole table. */
const KEY_PAGE_SIZE = 1000;

/**
 * Key scans memoized for the lifetime of a run (the audit is a single short
 * process, so this is a per-run cache, not a stale-data risk). A scan of
 * `ky_bills` is ~23 paged requests returning ~22k UUIDs to choose 40 rows;
 * repeating it for every sample of the same population was pure waste.
 */
const keyScanCache = new Map<string, string[]>();

/** Drop memoized key scans. Exposed for tests and long-lived callers. */
export function clearKeyScanCache(): void {
  keyScanCache.clear();
}

/**
 * Seed-sample up to `limit` rows from `table`, stably (see file header).
 *
 * 1. Scan the filtered table for just the stable key column (cheap, indexed),
 *    paging until exhausted.
 * 2. Hash each key with the seed and keep the `limit` lowest hashes.
 * 3. Fetch the full rows for those keys with one `IN (...)` query.
 *
 * Returns fewer rows when the filtered table is smaller than `limit`.
 */
export async function sampleTable<T>(db: SupabaseClient, p: SampleParams): Promise<T[]> {
  const keyColumn = p.keyColumn ?? 'id';
  const applyFilter = p.filter ?? ((q: FilteredQuery) => q);

  // 1) Collect all candidate keys under the filter (memoized per run).
  const cacheId = p.cacheKey ? `${p.table}|${keyColumn}|${p.cacheKey}` : null;
  let keys: string[];
  const cached = cacheId ? keyScanCache.get(cacheId) : undefined;
  if (cached) {
    keys = cached;
  } else {
    keys = [];
    for (let from = 0; ; from += KEY_PAGE_SIZE) {
      const pageQuery = applyFilter(
        db
          .from(p.table)
          .select(keyColumn)
          .order(keyColumn, { ascending: true })
          .range(from, from + KEY_PAGE_SIZE - 1) as FilteredQuery,
      );
      const { data, error } = await pageQuery;
      if (error) throw new Error(error.message);
      const rows = (data ?? []) as Array<Record<string, unknown>>;
      if (rows.length === 0) break;
      for (const r of rows) {
        const v = r[keyColumn];
        if (v != null) keys.push(String(v));
      }
      if (rows.length < KEY_PAGE_SIZE) break;
    }
    if (cacheId) keyScanCache.set(cacheId, keys);
  }
  if (keys.length === 0) return [];

  // 2) Bottom-k by deterministic hash (tie-break on key for full determinism).
  const chosen = keys
    .map((k) => ({ k, h: hashKey(p.seed, k) }))
    .sort((a, b) => a.h - b.h || (a.k < b.k ? -1 : a.k > b.k ? 1 : 0))
    .slice(0, p.limit)
    .map((x) => x.k);

  // 3) Fetch full rows for the chosen keys (ensure the key column is present so
  //    we can re-order deterministically; an extra column is harmless to callers).
  const selectWithKey = p.select
    .split(',')
    .map((s) => s.trim())
    .includes(keyColumn)
    ? p.select
    : `${p.select}, ${keyColumn}`;

  const rowsQuery = applyFilter(
    db.from(p.table).select(selectWithKey).in(keyColumn, chosen) as FilteredQuery,
  );
  const { data, error } = await rowsQuery;
  if (error) throw new Error(error.message);

  const byKey = new Map<string, T>();
  for (const r of (data ?? []) as Array<Record<string, unknown>>) {
    byKey.set(String(r[keyColumn]), r as T);
  }
  return chosen.map((k) => byKey.get(k)).filter((r): r is T => r != null);
}

/** {@link sampleTableSplit} parameters. */
export interface SplitSampleParams extends SampleParams {
  /**
   * Narrows the population to rows that can still change (for bills, those with
   * recent legislative action). Applied *in addition to* `filter`.
   */
  activeFilter: (q: FilteredQuery) => FilteredQuery;
  /** Cache key for the active population; see {@link SampleParams.cacheKey}. */
  activeCacheKey?: string;
  /** Fraction of `limit` drawn from the active window. Clamped to [0, 1]. */
  activeShare: number;
}

/**
 * Sample with a bias toward rows that can still drift, while keeping a slice of
 * the draw on the full corpus.
 *
 * Uniform sampling over `ky_bills` spends ~92% of a run's LegiScan budget
 * re-verifying bills from closed sessions whose upstream record is frozen, while
 * current-session rows — the only ones that change — are sampled at their
 * population share. Splitting the draw puts most of the budget where drift is
 * possible and leaves the remainder rotating across history, so old rows still
 * accrue coverage.
 *
 * The two halves use different seed streams so they cannot select correlated
 * offsets, and the active draw is de-duplicated against the corpus draw.
 */
export async function sampleTableSplit<T>(
  db: SupabaseClient,
  p: SplitSampleParams,
  keyOf: (row: T) => string,
): Promise<T[]> {
  const share = Math.min(1, Math.max(0, p.activeShare));
  const activeLimit = Math.round(p.limit * share);
  const corpusLimit = p.limit - activeLimit;

  const active =
    activeLimit > 0
      ? await sampleTable<T>(db, {
          ...p,
          limit: activeLimit,
          cacheKey: p.activeCacheKey,
          filter: (q) => p.activeFilter(p.filter ? p.filter(q) : q),
        })
      : [];

  // A small active population can return fewer rows than asked; spend the
  // shortfall on the corpus draw rather than under-sampling the run.
  const remaining = p.limit - active.length;
  if (remaining <= 0) return active;

  const corpus = await sampleTable<T>(db, {
    ...p,
    limit: Math.max(corpusLimit, remaining) + active.length,
    seed: p.seed ^ 0x7f4a7c15,
  });

  const seen = new Set(active.map(keyOf));
  const out = [...active];
  for (const row of corpus) {
    if (out.length >= p.limit) break;
    const k = keyOf(row);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(row);
  }
  return out;
}
