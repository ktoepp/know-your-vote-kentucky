/**
 * Resumable, chunked core of the hash-gated bills sync (WS4-06).
 *
 * `syncKyBillsByHash` in `ky-sync-pipeline.ts` uses these helpers. They hold no
 * Supabase or LegiScan client of their own: every dependency is passed in, so
 * the tests drive them with stubs and an in-memory hash store.
 *
 * Why chunks: a bill's `change_hash` is written in the same upsert as its row,
 * and that hash is what makes the next run skip it. Writing every
 * `HASH_SYNC_CHUNK_SIZE` rows (and on every exit from the loop) means a run that
 * stops early (deadline, run budget, quota hold, an error) keeps what it paid
 * for, and the next run continues with the bills it did not reach.
 */

/** Rows per write. */
export const HASH_SYNC_CHUNK_SIZE = 25;

/** Why a run stopped before it reached every changed bill. */
export type HashSyncStopReason = 'deadline' | 'run budget';

export type HashSyncRow = Record<string, unknown>;

type RawBillLike = { bill_id: number; change_hash?: string | null };

export type HashPartition<T> = {
  /** New bills first (no stored row), then changed bills; each group by `bill_id` ascending. */
  changedOrNew: T[];
  unchanged: number;
  changed: number;
  inserted: number;
};

/**
 * Splits a master list against stored `change_hash` values. A missing row is
 * new. A stored `NULL` hash, a missing list hash or a different hash is
 * changed. Only an equal, non-empty hash is unchanged.
 *
 * The order is stable across runs, so a run that stops early is followed by
 * one that starts where it left off. The master list carries no action date,
 * so recency is not used.
 */
export function partitionByStoredHash<T extends RawBillLike>(
  rawBills: readonly T[],
  existingHashes: ReadonlyMap<number, string | null>,
): HashPartition<T> {
  const newBills: T[] = [];
  const changedBills: T[] = [];
  let unchanged = 0;
  for (const b of rawBills) {
    const stored = existingHashes.get(b.bill_id);
    if (stored === undefined) {
      newBills.push(b);
    } else if (stored && b.change_hash && stored === b.change_hash) {
      unchanged++;
    } else {
      changedBills.push(b);
    }
  }
  const byId = (a: T, b: T) => a.bill_id - b.bill_id;
  newBills.sort(byId);
  changedBills.sort(byId);
  return {
    changedOrNew: [...newBills, ...changedBills],
    unchanged,
    changed: changedBills.length,
    inserted: newBills.length,
  };
}

/** The writes one chunk makes, in this order. */
export type HashSyncChunkWriteDeps<T, S> = {
  /** Reads the stored rows before the upsert, for status history. */
  snapshot: (legiscanIds: number[]) => Promise<S>;
  /** Upserts the rows (with their `change_hash`). Returns rows written. */
  upsert: (rows: HashSyncRow[]) => Promise<number>;
  /** Records status-history events by comparing the snapshot with the rows. */
  recordHistory: (args: { prevByLegiscan: S; rawBills: T[]; builtRows: HashSyncRow[] }) => Promise<void>;
  /** Called when `recordHistory` throws. History is advisory and never stops the sync. */
  onHistoryError?: (err: unknown) => void;
};

/**
 * Writes one chunk: snapshot, upsert, then status history. `rawBills[i]` is the
 * master-list entry that `builtRows[i]` was built from.
 */
export async function writeHashSyncChunk<T extends RawBillLike, S>(
  rawBills: T[],
  builtRows: HashSyncRow[],
  deps: HashSyncChunkWriteDeps<T, S>,
): Promise<number> {
  if (!builtRows.length) return 0;
  const prevByLegiscan = await deps.snapshot(rawBills.map((b) => b.bill_id));
  const synced = await deps.upsert(builtRows);
  try {
    await deps.recordHistory({ prevByLegiscan, rawBills, builtRows });
  } catch (err) {
    deps.onHistoryError?.(err);
  }
  return synced;
}

export type HashSyncLoopDeps<T, D> = {
  /** One LegiScan `getBill`. May return `null` or throw. */
  fetchDetail: (raw: T) => Promise<D | null>;
  /** Builds the `ky_bills` row. An error here stops the run (after a flush). */
  buildRow: (raw: T, detail: D) => HashSyncRow;
  /** Writes one chunk. In the pipeline this is `writeHashSyncChunk`. */
  writeChunk: (rawBills: T[], builtRows: HashSyncRow[]) => Promise<number>;
  /**
   * Fetch errors that stop the run instead of skipping one bill. The pipeline
   * passes `isLegiscanStopError` (quota hold and run budget).
   */
  isStopError: (err: unknown) => boolean;
  /** The per-run budget error. It ends the loop as an early stop, not a failure. */
  isRunBudgetError: (err: unknown) => boolean;
  /** Calls left in the run; `null` when uncapped. */
  budgetRemaining: () => number | null;
  /** Epoch ms. No deadline when unset. */
  deadlineAt?: number;
  now?: () => number;
  chunkSize?: number;
  log?: (msg: string) => void;
  /** Label for log lines, for example the bill number. */
  describe?: (raw: T) => string;
};

export type HashSyncLoopResult = {
  /** Bills whose `getBill` was started (including ones that failed). */
  attempted: number;
  /** Rows built and handed to `writeChunk`. */
  built: number;
  /** Rows `writeChunk` reported written. */
  synced: number;
  /** `writeChunk` calls. */
  flushes: number;
  /** Set when the loop stopped before the last bill. */
  stoppedEarly: HashSyncStopReason | null;
};

/**
 * Fetches and writes `bills` in order, in chunks.
 *
 * - Before each fetch it stops (early stop) when the deadline has passed or the
 *   run budget has no calls left.
 * - A fetch that fails with an ordinary error skips that bill, as before. Its
 *   hash is not written, so the next run retries it.
 * - A `LegiscanRunBudgetError` thrown during a fetch (for example on a retry)
 *   flushes and ends the loop as an early stop.
 * - Any other stop error (the quota hold), a fatal error or a `buildRow` error
 *   flushes and is re-thrown.
 *
 * Every exit goes through a flush, so no fetched row is dropped unwritten. If
 * that flush itself fails while an error is already propagating, the flush
 * error is logged and the original error is re-thrown.
 */
export async function runHashSyncChunks<T extends RawBillLike, D>(
  bills: readonly T[],
  deps: HashSyncLoopDeps<T, D>,
): Promise<HashSyncLoopResult> {
  const chunkSize = Math.max(1, deps.chunkSize ?? HASH_SYNC_CHUNK_SIZE);
  const now = deps.now ?? Date.now;
  const log = deps.log ?? (() => {});
  const describe = deps.describe ?? ((raw: T) => String(raw.bill_id));

  const result: HashSyncLoopResult = { attempted: 0, built: 0, synced: 0, flushes: 0, stoppedEarly: null };
  let pendingRaws: T[] = [];
  let pendingRows: HashSyncRow[] = [];

  const flush = async () => {
    if (!pendingRows.length) return;
    const raws = pendingRaws;
    const rows = pendingRows;
    pendingRaws = [];
    pendingRows = [];
    result.flushes++;
    result.synced += await deps.writeChunk(raws, rows);
  };

  try {
    for (const raw of bills) {
      if (deps.deadlineAt !== undefined && now() >= deps.deadlineAt) {
        result.stoppedEarly = 'deadline';
        break;
      }
      if (deps.budgetRemaining() === 0) {
        result.stoppedEarly = 'run budget';
        break;
      }

      let detail: D | null = null;
      try {
        detail = await deps.fetchDetail(raw);
      } catch (err) {
        if (deps.isStopError(err)) throw err;
        log(`Detail fetch failed for ${describe(raw)}: ${err instanceof Error ? err.message : String(err)}`);
        result.attempted++;
        continue;
      }
      result.attempted++;
      if (!detail) continue;

      pendingRaws.push(raw);
      pendingRows.push(deps.buildRow(raw, detail));
      result.built++;
      if (pendingRows.length >= chunkSize) {
        log(`Hash-gated enrich ${result.attempted}/${bills.length}`);
        await flush();
      }
    }
  } catch (err) {
    try {
      await flush();
    } catch (flushErr) {
      log(
        `Flush after a stopped run failed: ${flushErr instanceof Error ? flushErr.message : String(flushErr)}`,
      );
    }
    if (!deps.isRunBudgetError(err)) throw err;
    result.stoppedEarly = 'run budget';
    return result;
  }

  await flush();
  return result;
}

/** The log line, `SyncResult.error` and `ky_sources` note for an early stop. */
export function earlyStopNote(reason: HashSyncStopReason, attempted: number, total: number): string {
  return `Hash-gated: stopped early (${reason}) after ${attempted} of ${total} changed bills; the next run continues`;
}

/** `ky_sync_state` key that counts consecutive early-stopped bills runs (read by WS4-08). */
export const BILLS_HASH_EARLY_STOP_STREAK_KEY = 'bills_hash_early_stop_streak';

export type EarlyStopStreak = {
  count: number;
  lastReason: HashSyncStopReason | null;
  updatedAt: string;
};

/**
 * The next streak payload: `count + 1` on an early stop, `0` on a complete run.
 * A complete run keeps the previous `lastReason` so the last cause stays visible.
 */
export function nextEarlyStopStreak(
  prev: unknown,
  stoppedEarly: HashSyncStopReason | null,
  nowIso: string,
): EarlyStopStreak {
  const p = (prev && typeof prev === 'object' ? prev : {}) as Partial<Record<keyof EarlyStopStreak, unknown>>;
  const prevCount = typeof p.count === 'number' && Number.isFinite(p.count) && p.count > 0 ? Math.floor(p.count) : 0;
  const prevReason =
    p.lastReason === 'deadline' || p.lastReason === 'run budget' ? (p.lastReason as HashSyncStopReason) : null;
  if (stoppedEarly) return { count: prevCount + 1, lastReason: stoppedEarly, updatedAt: nowIso };
  return { count: 0, lastReason: prevReason, updatedAt: nowIso };
}
