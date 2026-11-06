import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  BILLS_HASH_EARLY_STOP_STREAK_KEY,
  HASH_SYNC_CHUNK_SIZE,
  earlyStopNote,
  nextEarlyStopStreak,
  partitionByStoredHash,
  runHashSyncChunks,
  writeHashSyncChunk,
  type HashSyncLoopDeps,
  type HashSyncRow,
} from './ky-bills-hash-sync-chunks';
import { DATA_BUDGET } from './data-budget';
import { LegiscanQuotaHoldError } from './legiscan-quota';
import {
  chargeLegiscanRunBudget,
  isLegiscanRunBudgetError,
  isLegiscanStopError,
  legiscanRunBudgetRemaining,
  withLegiscanRunBudget,
} from './legiscan-run-budget';

// WS4-06. Nothing here calls LegiScan or Supabase: `getBill` is a stub that
// charges the real per-run budget the way `KyLegiScanClient.request()` does,
// and the database is an in-memory `legiscan_id -> change_hash` map.

type Raw = { bill_id: number; number: string; change_hash: string };
type Detail = { bill_id: number; title: string };

/** Master list of `n` bills, ids 1..n, each with the given hash. */
function masterList(n: number, hash = (id: number) => `new-${id}`): Raw[] {
  return Array.from({ length: n }, (_, i) => ({ bill_id: i + 1, number: `HB ${i + 1}`, change_hash: hash(i + 1) }));
}

/** Stored hashes saying every bill exists with an old hash, so all are "changed". */
function storeWithOldHashes(n: number): Map<number, string | null> {
  return new Map(Array.from({ length: n }, (_, i) => [i + 1, `old-${i + 1}`] as [number, string | null]));
}

type Harness = {
  store: Map<number, string | null>;
  fetched: number[];
  flushSizes: number[];
  deps: HashSyncLoopDeps<Raw, Detail>;
};

/**
 * Pipeline-shaped deps. `fetchDetail` charges the run budget once per call
 * (or `chargesPerFetch` times, to model retries), then may throw from `failOn`.
 * `writeChunk` goes through the real `writeHashSyncChunk` and writes each row's
 * `change_hash` into `store`, as the `ky_bills` upsert does.
 */
function harness(opts: {
  store?: Map<number, string | null>;
  failOn?: (fetchNumber: number, raw: Raw) => unknown;
  chargesPerFetch?: number;
  deadlineAt?: number;
  now?: () => number;
  isStopError?: (err: unknown) => boolean;
  buildRowThrowsOn?: number;
  upsertThrows?: boolean;
} = {}): Harness {
  const store = opts.store ?? new Map<number, string | null>();
  const fetched: number[] = [];
  const flushSizes: number[] = [];
  let built = 0;
  const deps: HashSyncLoopDeps<Raw, Detail> = {
    fetchDetail: async (raw) => {
      for (let i = 0; i < (opts.chargesPerFetch ?? 1); i++) chargeLegiscanRunBudget();
      fetched.push(raw.bill_id);
      const err = opts.failOn?.(fetched.length, raw);
      if (err !== undefined) throw err;
      return { bill_id: raw.bill_id, title: `Title ${raw.bill_id}` };
    },
    buildRow: (raw, detail) => {
      built++;
      if (opts.buildRowThrowsOn === built) throw new Error('row build failed');
      return { legiscan_id: raw.bill_id, title: detail.title, change_hash: raw.change_hash || null };
    },
    writeChunk: (rawBills, builtRows) =>
      writeHashSyncChunk(rawBills, builtRows, {
        snapshot: async () => null,
        upsert: async (rows: HashSyncRow[]) => {
          if (opts.upsertThrows) throw new Error('database unavailable');
          flushSizes.push(rows.length);
          for (const r of rows) store.set(Number(r.legiscan_id), (r.change_hash as string | null) ?? null);
          return rows.length;
        },
        recordHistory: async () => {},
      }),
    isStopError: opts.isStopError ?? isLegiscanStopError,
    isRunBudgetError: isLegiscanRunBudgetError,
    budgetRemaining: legiscanRunBudgetRemaining,
    deadlineAt: opts.deadlineAt,
    now: opts.now,
  };
  return { store, fetched, flushSizes, deps };
}

/** One "run": partition against the store, then the chunked loop under a budget scope. */
async function runOnce(list: Raw[], h: Harness, budget: number | null) {
  const { changedOrNew } = partitionByStoredHash(list, h.store);
  const before = h.fetched.length;
  const result = await withLegiscanRunBudget(budget, () => runHashSyncChunks(changedOrNew, h.deps));
  return { result, fetchedThisRun: h.fetched.slice(before), total: changedOrNew.length };
}

class FatalTestError extends Error {}

// --- The six WP cases (step 7) ---

test('60 changed bills with budget 30: 30 detail calls, 2 flushes (25 + 5), 30 hashes written', async () => {
  const list = masterList(60);
  const h = harness({ store: storeWithOldHashes(60) });
  const { result, fetchedThisRun, total } = await runOnce(list, h, 30);

  assert.equal(total, 60);
  assert.equal(fetchedThisRun.length, 30);
  assert.deepEqual(h.flushSizes, [25, 5]);
  assert.equal(result.flushes, 2);
  assert.equal(result.synced, 30);
  assert.equal(result.attempted, 30);
  assert.equal(result.stoppedEarly, 'run budget');
  const written = list.filter((b) => h.store.get(b.bill_id) === b.change_hash).map((b) => b.bill_id);
  assert.deepEqual(written, fetchedThisRun);
  assert.equal(written.length, 30);
});

test('two runs in a row with 60 changed bills and budget 30: the second run fetches the other 30', async () => {
  const list = masterList(60);
  const h = harness({ store: storeWithOldHashes(60) });

  const first = await runOnce(list, h, 30);
  const second = await runOnce(list, h, 30);

  assert.equal(first.fetchedThisRun.length, 30);
  assert.equal(second.total, 30, 'the second run only sees the 30 bills the first did not write');
  assert.equal(second.fetchedThisRun.length, 30);
  const overlap = second.fetchedThisRun.filter((id) => first.fetchedThisRun.includes(id));
  assert.deepEqual(overlap, [], 'no bill is bought twice');
  assert.deepEqual(
    [...first.fetchedThisRun, ...second.fetchedThisRun].sort((a, b) => a - b),
    list.map((b) => b.bill_id),
  );
  assert.equal(second.result.stoppedEarly, null, 'the backlog is done, so the second run is complete');

  // A third run has nothing left to buy and completes.
  const third = await runOnce(list, h, 30);
  assert.equal(third.total, 0);
  assert.equal(third.fetchedThisRun.length, 0);
  assert.equal(third.result.stoppedEarly, null);
});

test('an error thrown on the 40th fetch: bills 1–39 are flushed and the error is re-thrown', async () => {
  const list = masterList(60);
  const fatal = new FatalTestError('connection reset');
  const h = harness({
    store: storeWithOldHashes(60),
    failOn: (n) => (n === 40 ? fatal : undefined),
    isStopError: (err) => isLegiscanStopError(err) || err instanceof FatalTestError,
  });

  await assert.rejects(runOnce(list, h, null), (err) => err === fatal);
  assert.deepEqual(h.flushSizes, [25, 14]);
  const written = list.filter((b) => h.store.get(b.bill_id) === b.change_hash).map((b) => b.bill_id);
  assert.deepEqual(written, list.slice(0, 39).map((b) => b.bill_id));
});

test('a quota hold on the 10th fetch: bills 1–9 are flushed and the hold is re-thrown', async () => {
  const list = masterList(60);
  const hold = new LegiscanQuotaHoldError('LegiScan quota hold at 95%', null);
  const h = harness({ store: storeWithOldHashes(60), failOn: (n) => (n === 10 ? hold : undefined) });

  await assert.rejects(runOnce(list, h, 250), (err) => err === hold);
  assert.deepEqual(h.flushSizes, [9]);
  const written = list.filter((b) => h.store.get(b.bill_id) === b.change_hash).map((b) => b.bill_id);
  assert.deepEqual(written, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test('a deadline already passed: 0 calls, 0 writes, and the early-stop note', async () => {
  const list = masterList(60);
  const h = harness({ store: storeWithOldHashes(60), deadlineAt: 1_000, now: () => 1_000 });
  const { result, fetchedThisRun, total } = await runOnce(list, h, 250);

  assert.equal(fetchedThisRun.length, 0);
  assert.deepEqual(h.flushSizes, []);
  assert.equal(result.flushes, 0);
  assert.equal(result.stoppedEarly, 'deadline');
  assert.equal(
    earlyStopNote(result.stoppedEarly, result.attempted, total),
    'Hash-gated: stopped early (deadline) after 0 of 60 changed bills; the next run continues',
  );
  assert.ok(list.every((b) => h.store.get(b.bill_id) === `old-${b.bill_id}`), 'nothing written');
});

test('order: new bills before changed ones, each by bill_id ascending', async () => {
  // Stored: 10, 20, 30, 40 (40 unchanged). Not stored: 5, 15, 35.
  const list: Raw[] = [30, 5, 40, 15, 20, 35, 10].map((id) => ({ bill_id: id, number: `SB ${id}`, change_hash: `h-${id}` }));
  const store = new Map<number, string | null>([
    [10, 'old'],
    [20, null],
    [30, 'old'],
    [40, 'h-40'],
  ]);
  const part = partitionByStoredHash(list, store);
  assert.deepEqual(part.changedOrNew.map((b) => b.bill_id), [5, 15, 35, 10, 20, 30]);
  assert.equal(part.inserted, 3);
  assert.equal(part.changed, 3);
  assert.equal(part.unchanged, 1);

  const h = harness({ store });
  const { fetchedThisRun } = await runOnce(list, h, null);
  assert.deepEqual(fetchedThisRun, [5, 15, 35, 10, 20, 30]);
});

// --- Further edges ---

test('partitionByStoredHash keeps the hash rules: NULL stored or missing list hash counts as changed', () => {
  const list = [
    { bill_id: 1, change_hash: 'a' },
    { bill_id: 2, change_hash: 'b' },
    { bill_id: 3, change_hash: '' },
    { bill_id: 4, change_hash: 'd' },
  ];
  const store = new Map<number, string | null>([
    [1, 'a'],
    [2, null],
    [3, ''],
  ]);
  const part = partitionByStoredHash(list, store);
  assert.deepEqual(part.changedOrNew.map((b) => b.bill_id), [4, 2, 3]);
  assert.deepEqual([part.unchanged, part.changed, part.inserted], [1, 2, 1]);
});

test('an uncapped run with no deadline fetches every bill and flushes 25 + 25 + 10', async () => {
  const h = harness({ store: storeWithOldHashes(60) });
  const { result, fetchedThisRun } = await runOnce(masterList(60), h, null);
  assert.equal(fetchedThisRun.length, 60);
  assert.deepEqual(h.flushSizes, [25, 25, 10]);
  assert.equal(result.stoppedEarly, null);
  assert.equal(result.synced, 60);
  assert.equal(HASH_SYNC_CHUNK_SIZE, 25);
});

test('the run budget running out mid-retry flushes what was fetched and stops early without throwing', async () => {
  // Each getBill costs 2 attempts. Budget 5: bills 1 and 2 cost 4; bill 3's
  // retry is denied by the budget inside the fetch.
  const h = harness({ store: storeWithOldHashes(10), chargesPerFetch: 2 });
  const { result } = await runOnce(masterList(10), h, 5);
  assert.equal(result.stoppedEarly, 'run budget');
  assert.equal(result.attempted, 2, 'the bill whose fetch was cut off is not counted');
  assert.deepEqual(h.flushSizes, [2]);
  assert.equal(h.store.get(3), 'old-3', 'bill 3 keeps its old hash, so the next run retries it');
});

test('a deadline reached mid-run stops before the next fetch and flushes', async () => {
  let clock = 0;
  const h = harness({ store: storeWithOldHashes(60), deadlineAt: 30, now: () => clock });
  h.deps.fetchDetail = ((orig) => async (raw: Raw) => {
    clock++;
    return orig(raw);
  })(h.deps.fetchDetail);
  const { result, fetchedThisRun } = await runOnce(masterList(60), h, null);
  assert.equal(fetchedThisRun.length, 30);
  assert.deepEqual(h.flushSizes, [25, 5]);
  assert.equal(result.stoppedEarly, 'deadline');
});

test('an ordinary fetch error skips that bill (hash not written) and the next run retries it', async () => {
  const list = masterList(5);
  const h = harness({
    store: storeWithOldHashes(5),
    failOn: (_n, raw) => (raw.bill_id === 3 ? new Error('HTTP 500') : undefined),
  });
  const first = await runOnce(list, h, null);
  assert.equal(first.result.stoppedEarly, null);
  assert.equal(first.result.attempted, 5);
  assert.equal(first.result.built, 4);
  assert.equal(h.store.get(3), 'old-3');

  const h2 = harness({ store: h.store });
  const second = await runOnce(list, h2, null);
  assert.deepEqual(second.fetchedThisRun, [3]);
});

test('a null detail is skipped and not written', async () => {
  const h = harness({ store: storeWithOldHashes(3) });
  h.deps.fetchDetail = async (raw) => (raw.bill_id === 2 ? null : { bill_id: raw.bill_id, title: 't' });
  const { result } = await runOnce(masterList(3), h, null);
  assert.equal(result.built, 2);
  assert.equal(h.store.get(2), 'old-2');
});

test('a buildRow error flushes the rows already built and is re-thrown', async () => {
  const h = harness({ store: storeWithOldHashes(60), buildRowThrowsOn: 30 });
  await assert.rejects(runOnce(masterList(60), h, null), /row build failed/);
  assert.deepEqual(h.flushSizes, [25, 4]);
});

test('if the flush itself fails while an error propagates, the original error is re-thrown', async () => {
  const hold = new LegiscanQuotaHoldError('hold', null);
  const logs: string[] = [];
  const h = harness({ store: storeWithOldHashes(10), failOn: (n) => (n === 3 ? hold : undefined), upsertThrows: true });
  h.deps.log = (m) => logs.push(m);
  await assert.rejects(runOnce(masterList(10), h, null), (err) => err === hold);
  assert.ok(logs.some((m) => m.includes('database unavailable')));
});

test('writeHashSyncChunk: snapshot, then upsert, then history with aligned rows; history errors do not throw', async () => {
  const calls: string[] = [];
  const raws = [
    { bill_id: 7, change_hash: 'x' },
    { bill_id: 9, change_hash: 'y' },
  ];
  const rows = [{ legiscan_id: 7 }, { legiscan_id: 9 }];
  let historyArgs: unknown;
  let historyError: unknown;
  const synced = await writeHashSyncChunk(raws, rows, {
    snapshot: async (ids) => {
      calls.push(`snapshot:${ids.join(',')}`);
      return 'prev';
    },
    upsert: async (r) => {
      calls.push(`upsert:${r.length}`);
      return r.length;
    },
    recordHistory: async (args) => {
      calls.push('history');
      historyArgs = args;
      throw new Error('history down');
    },
    onHistoryError: (err) => {
      historyError = err;
    },
  });
  assert.equal(synced, 2);
  assert.deepEqual(calls, ['snapshot:7,9', 'upsert:2', 'history']);
  assert.deepEqual(historyArgs, { prevByLegiscan: 'prev', rawBills: raws, builtRows: rows });
  assert.match(String(historyError), /history down/);

  const none: string[] = [];
  const zero = await writeHashSyncChunk([], [], {
    snapshot: async () => none.push('snapshot'),
    upsert: async () => (none.push('upsert'), 0),
    recordHistory: async () => {
      none.push('history');
    },
  });
  assert.equal(zero, 0);
  assert.deepEqual(none, []);
});

test('nextEarlyStopStreak counts early stops and resets on a complete run', () => {
  const t = '2027-01-10T00:00:00.000Z';
  assert.equal(BILLS_HASH_EARLY_STOP_STREAK_KEY, 'bills_hash_early_stop_streak');
  const a = nextEarlyStopStreak(null, 'run budget', t);
  assert.deepEqual(a, { count: 1, lastReason: 'run budget', updatedAt: t });
  const b = nextEarlyStopStreak(a, 'deadline', t);
  assert.deepEqual(b, { count: 2, lastReason: 'deadline', updatedAt: t });
  const c = nextEarlyStopStreak(b, null, t);
  assert.deepEqual(c, { count: 0, lastReason: 'deadline', updatedAt: t });
  assert.deepEqual(nextEarlyStopStreak({ count: 'x', lastReason: 'other' }, null, t), {
    count: 0,
    lastReason: null,
    updatedAt: t,
  });
});

test("perRunCap['sync-bills'] is a number (the bills cap is on)", () => {
  const cap = DATA_BUDGET.legiscan.perRunCap['sync-bills'];
  assert.equal(typeof cap, 'number');
  assert.ok((cap as number) > 0);
});
