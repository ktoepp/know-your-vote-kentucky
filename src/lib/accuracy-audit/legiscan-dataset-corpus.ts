/**
 * Session-scale LegiScan reference data for the accuracy audit.
 *
 * The bills and votes checkers used to spend one `getBill` or `getRollCall` per
 * sampled row: 40 + 15 = 55 quota points a week to verify 0.18% of the corpus.
 * The bulk dataset ships a whole session's bills, history and roll calls for
 * **one** point, so the same verification costs `1 + (sessions in the sample)`
 * — typically 2 or 3 — regardless of how many rows are checked
 * ([decisions.md § 2026-06-26 quota-guard](../../../decisions.md), TASKS.md).
 *
 * Two properties make this a drop-in swap rather than a rewrite:
 *
 *   - `fetchBillDetail` returns `d.bill` and `fetchRollCall` returns
 *     `vd.roll_call` — the raw LegiScan objects. `parseDatasetZip` collects
 *     exactly those same two shapes out of the ZIP. The comparison code does
 *     not need to change, only where the object comes from.
 *   - Sessions are cached across checkers for the life of the process, so the
 *     votes checker pays nothing for a session the bills checker already
 *     pulled.
 *
 * The cost is freshness. A dataset is a **weekly snapshot**, so it can trail
 * live `getBill` by up to seven days, while our own rows are synced 6-hourly.
 * Comparing a fresher row against a staler reference manufactures drift that
 * does not exist. `snapshotDateBySession` exists so callers can refuse to judge
 * a row that changed after the snapshot was cut — see `isRowNewerThanSnapshot`.
 */
import { getKyLegiScanClient, type LegiScanDatasetListEntry } from '../ky-legiscan-client';
import { parseDatasetZip } from '../ky-legiscan-dataset-import';

/**
 * Ranks sessions by how many sampled rows each covers and returns the top
 * `limit`, so a bounded number of dataset downloads buys the most verification.
 *
 * The cap exists because the sample is deliberately split between the active
 * window and the rest of history. The active side is one session (the 2026
 * Regular Session holds every bill with action in the last 365 days), but the
 * historical side draws across all 25 sessions, so an uncapped run could pull a
 * dozen full-session ZIPs for a handful of rows each — slow, memory-hungry, and
 * a worse quota trade than the per-bill calls it replaced.
 *
 * Ties break on session id descending, so recent sessions win: they are where
 * upstream can still change.
 */
export function rankSessionsByRowCount(
  sessionIds: Iterable<number | null | undefined>,
  limit: number,
): number[] {
  const counts = new Map<number, number>();
  for (const id of sessionIds) {
    if (typeof id !== 'number' || !Number.isFinite(id)) continue;
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0] - a[0])
    .slice(0, Math.max(0, limit))
    .map(([id]) => id);
}

export type DatasetSession = {
  sessionId: number;
  sessionName: string;
  /** `dataset_date` from the dataset list — the day the snapshot was cut. */
  snapshotDate: string;
  billsByLegiscanId: Map<number, Record<string, unknown>>;
  rollCallsById: Map<number, Record<string, unknown>>;
};

export type DatasetCorpus = {
  billsByLegiscanId: Map<number, Record<string, unknown>>;
  rollCallsById: Map<number, Record<string, unknown>>;
  /** session_id -> snapshot date, for the freshness guard. */
  snapshotDateBySession: Map<number, string>;
  /** Sessions whose dataset is loaded and usable. */
  sessionsLoaded: number[];
  /**
   * Sessions asked for but not usable — absent from the dataset list, or a
   * download/parse failure — with the reason. Rows in these sessions must be
   * skipped rather than judged.
   */
  sessionsUnavailable: { sessionId: number; reason: string }[];
  /** LegiScan queries this load actually spent (0 when fully cached). */
  quotaCost: number;
};

// Process-lifetime caches. The audit is a single short-lived run, so there is
// no invalidation story to get wrong; a fresh run is a fresh process.
const sessionCache = new Map<number, DatasetSession>();
const failureCache = new Map<number, string>();
let datasetListCache: LegiScanDatasetListEntry[] | null = null;

/** Test seam — resets caches so a case can't be contaminated by an earlier one. */
export function __resetDatasetCorpusCacheForTests(): void {
  sessionCache.clear();
  failureCache.clear();
  datasetListCache = null;
}

/**
 * The slice of the LegiScan client this module needs. Named so a test can pass
 * a stub — the real client is a process-wide singleton reading a live API key,
 * which would otherwise make this module untestable offline.
 */
export type DatasetClient = {
  fetchDatasetList: (state: string) => Promise<LegiScanDatasetListEntry[]>;
  fetchDataset: (sessionId: number, accessKey: string) => Promise<{ zip?: string } | null>;
};

async function loadDatasetList(client: DatasetClient): Promise<{ list: LegiScanDatasetListEntry[]; cost: number }> {
  if (datasetListCache) return { list: datasetListCache, cost: 0 };
  datasetListCache = await client.fetchDatasetList('KY');
  return { list: datasetListCache, cost: 1 };
}

/**
 * Loads the datasets covering `sessionIds`, reusing anything already cached.
 *
 * Never throws for a single bad session: an unavailable one lands in
 * `sessionsUnavailable` so the caller can skip its rows and say why. A failure
 * to fetch the dataset *list* is fatal, because then nothing can be verified
 * and silently returning an empty corpus would read as "everything checked out".
 */
export async function loadDatasetCorpus(
  sessionIds: Iterable<number | null | undefined>,
  deps: { client?: DatasetClient } = {},
): Promise<DatasetCorpus> {
  const client = deps.client ?? getKyLegiScanClient();
  const wanted = [...new Set([...sessionIds].filter((s): s is number => typeof s === 'number' && Number.isFinite(s)))];

  const corpus: DatasetCorpus = {
    billsByLegiscanId: new Map(),
    rollCallsById: new Map(),
    snapshotDateBySession: new Map(),
    sessionsLoaded: [],
    sessionsUnavailable: [],
    quotaCost: 0,
  };
  if (wanted.length === 0) return corpus;

  const needsFetch = wanted.filter((id) => !sessionCache.has(id) && !failureCache.has(id));

  let byId = new Map<number, LegiScanDatasetListEntry>();
  if (needsFetch.length > 0) {
    const { list, cost } = await loadDatasetList(client);
    corpus.quotaCost += cost;
    byId = new Map(list.map((e) => [e.session_id, e]));
  }

  for (const sessionId of needsFetch) {
    const entry = byId.get(sessionId);
    if (!entry) {
      failureCache.set(sessionId, 'session not present in LegiScan dataset list');
      continue;
    }
    try {
      const dataset = await client.fetchDataset(sessionId, entry.access_key);
      corpus.quotaCost += 1;
      if (!dataset?.zip) {
        failureCache.set(sessionId, 'getDataset returned no zip payload');
        continue;
      }
      const payloads = parseDatasetZip(dataset.zip);
      const bills = new Map<number, Record<string, unknown>>();
      for (const b of payloads.bills) {
        const id = Number((b as { bill_id?: unknown })?.bill_id);
        if (Number.isFinite(id)) bills.set(id, b as Record<string, unknown>);
      }
      const rollCalls = new Map<number, Record<string, unknown>>();
      for (const rc of payloads.rollCalls) {
        const id = Number((rc as { roll_call_id?: unknown })?.roll_call_id);
        if (Number.isFinite(id)) rollCalls.set(id, rc as Record<string, unknown>);
      }
      sessionCache.set(sessionId, {
        sessionId,
        sessionName: entry.session_name,
        snapshotDate: entry.dataset_date,
        billsByLegiscanId: bills,
        rollCallsById: rollCalls,
      });
    } catch (err) {
      failureCache.set(sessionId, err instanceof Error ? err.message : String(err));
    }
  }

  for (const sessionId of wanted) {
    const loaded = sessionCache.get(sessionId);
    if (!loaded) {
      corpus.sessionsUnavailable.push({ sessionId, reason: failureCache.get(sessionId) ?? 'not loaded' });
      continue;
    }
    corpus.sessionsLoaded.push(sessionId);
    corpus.snapshotDateBySession.set(sessionId, loaded.snapshotDate);
    for (const [id, bill] of loaded.billsByLegiscanId) corpus.billsByLegiscanId.set(id, bill);
    for (const [id, rc] of loaded.rollCallsById) corpus.rollCallsById.set(id, rc);
  }

  return corpus;
}

/**
 * True when our row records legislative action *after* the snapshot was cut,
 * which makes the snapshot the stale side of the comparison. Such a row is not
 * evidence of drift and must not be judged against this corpus.
 *
 * The argument must be an **event** date — when something happened to the bill
 * — not a sync-write timestamp. That distinction is the whole guard.
 * `updated_from_legiscan_at`, which this took until 2026-08-24, records when we
 * last *wrote* the row, and the dataset import rewrites every row in a session
 * unconditionally (it is hash-gated per dataset, not per row). So every bill in
 * the corpus carried the timestamp of the last full import — 2026-08-01 for all
 * 22,547 of them — while the newest snapshot LegiScan offers is dated
 * 2026-07-12. Every row read as "fresher than the snapshot" and the bills
 * checker skipped 100% of its sample. Passing `last_action_date` instead
 * matches what the votes checker already does with the roll-call date, and
 * measures the thing the guard is actually about.
 *
 * Unknown action date is treated as "not newer": the row still gets checked,
 * rather than silently dropping out of the audit.
 */
export function isRowNewerThanSnapshot(
  corpus: DatasetCorpus,
  sessionId: number | null | undefined,
  rowEventDate: string | null | undefined,
): boolean {
  if (!rowEventDate || sessionId == null) return false;
  const snapshot = corpus.snapshotDateBySession.get(sessionId);
  if (!snapshot) return false;
  const rowTime = Date.parse(rowEventDate);
  // dataset_date is a day stamp; compare against its end so an action dated
  // earlier the same day is not mistaken for one that outran the snapshot.
  const snapshotEnd = Date.parse(`${snapshot}T23:59:59Z`);
  if (!Number.isFinite(rowTime) || !Number.isFinite(snapshotEnd)) return false;
  return rowTime > snapshotEnd;
}
