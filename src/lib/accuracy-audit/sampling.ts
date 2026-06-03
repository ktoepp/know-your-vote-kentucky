/**
 * Seeded random sampling for the accuracy audit.
 *
 * Every run samples a different slice of the data, but the slice is reproducible:
 * pass the same seed (printed on every run, or via --seed / ACCURACY_SEED) to
 * re-check exactly the same rows. Sampling is done with a windowed range query
 * (one COUNT + one bounded fetch) plus an in-process seeded shuffle, so it stays
 * cheap regardless of table size.
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
  /** Candidate window size pulled before shuffling (default max(limit*6, 60)). */
  poolSize?: number;
  /** Stable ordering column for the window (default "id"). */
  orderColumn?: string;
  /** Optional filter applied to BOTH the count and the row fetch. */
  filter?: (q: FilteredQuery) => FilteredQuery;
}

/**
 * Seed-sample up to `limit` rows from `table`. Picks a random window of
 * `poolSize` rows (seeded offset over the filtered count), then seed-shuffles the
 * window and slices `limit`. Returns fewer rows when the table is smaller.
 */
export async function sampleTable<T>(db: SupabaseClient, p: SampleParams): Promise<T[]> {
  const poolSize = p.poolSize ?? Math.max(p.limit * 6, 60);
  const orderColumn = p.orderColumn ?? 'id';
  const applyFilter = p.filter ?? ((q: FilteredQuery) => q);

  const countQuery = applyFilter(
    db.from(p.table).select(orderColumn, { count: 'exact', head: true }) as FilteredQuery,
  );
  const { count, error: countError } = await countQuery;
  if (countError) throw new Error(countError.message);
  const total = count ?? 0;
  if (total === 0) return [];

  const rng = makeRng(p.seed);
  const maxOffset = Math.max(0, total - poolSize);
  const offset = maxOffset > 0 ? Math.floor(rng() * (maxOffset + 1)) : 0;

  const rowsQuery = applyFilter(
    db
      .from(p.table)
      .select(p.select)
      .order(orderColumn, { ascending: true })
      .range(offset, offset + poolSize - 1) as FilteredQuery,
  );
  const { data, error } = await rowsQuery;
  if (error) throw new Error(error.message);

  const pool = (data ?? []) as T[];
  return seededShuffle(pool, rng).slice(0, p.limit);
}
