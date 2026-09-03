#!/usr/bin/env npx tsx
/**
 * Weekly LegiScan Dataset reconcile — belt-and-suspenders against a missed
 * `change_hash` update in the 6h `sync-ky-bills-status` job. LegiScan
 * regenerates state datasets weekly (Sun 04–05 ET); one `getDataset` pull is
 * ~2 quota points and ships an entire session's bills/history/texts/roll-calls
 * as a ZIP. Hash-gated against `ky_legiscan_datasets` so unchanged sessions
 * cost zero downloads (LegiScan penalises repeated unchanged pulls — see
 * `project_legiscan_dataset_hash_gating` memo, 2026-07-07).
 *
 * Usage:
 *   npm run sync:ky:dataset              # cron: reconcile all changed KY sessions
 *   npm run sync:ky:dataset:dry          # plan only, no LegiScan calls
 *   npm run sync:ky:dataset -- --limit=1 # cap sessions per run (re-run to continue)
 *
 * Behaviour vs `bulk-seed:ky` (operator-gated backfill):
 *   - Slack digest via `notifySyncSlack` (change/error only)
 *   - LegiScan quota-hold → clean skip (never reds the workflow)
 *   - Records status on `ky_sources` (visible on `/admin/sync-status`)
 *   - Same hash-gating + upsert logic (shared via `ky-legiscan-dataset-import`)
 *
 * Secrets required in CI:
 *   LEGISCAN_API_KEY, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).
 * Optional Slack (same webhooks as sync-ky-bills-status.yml + SLACK_SYNC_NOTIFY_CLI=true).
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { getKyLegiScanClient } from '../src/lib/ky-data-sources';
import { withLegiscanCaller } from '../src/lib/legiscan-caller';
import {
  isTransientLegiscanNetworkError,
  type LegiScanDatasetListEntry,
} from '../src/lib/ky-legiscan-client';
import {
  buildBillRow,
  buildLegislatorRow,
  buildVoteRow,
  dedupeLegislatorRows,
  dedupeVoteRows,
  fetchStoredDatasetHashes,
  parseDatasetZip,
  recordDatasetImport,
  upsertBillRows,
  upsertLegislatorRows,
  upsertVoteRows,
} from '../src/lib/ky-legiscan-dataset-import';
import {
  checkLegiscanQuotaForSync,
  isLegiscanQuotaHoldError,
} from '../src/lib/legiscan-quota';
import {
  markSlackErrorNotified,
  notifySyncExceptionSlack,
  notifySyncSlack,
} from '../src/lib/slack-webhook';
import type { SyncResult } from '../src/lib/ky-sync-pipeline';

const SOURCE = 'dataset';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || args.includes('--dryRun');
const stateFlag = args.find((a) => a.startsWith('--state='))?.split('=')[1];
const STATE = (stateFlag || 'KY').toUpperCase();
const limitFlag = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const SESSION_LIMIT = limitFlag ? parseInt(limitFlag, 10) : undefined;
// Re-import sessions whose dataset_hash is unchanged. Normally pointless — an
// unchanged hash means LegiScan has no new data — but required after a mapper
// fix, when the upstream payload is identical yet we now read a field from it
// that we previously dropped on the floor (see buildVoteRow / nv_count).
// Costs one getDataset per session, so a full forced pass is ~1 call per session
// rather than the thousands a per-bill API backfill would spend.
const FORCE = args.includes('--force');

const ALLOWED_STATES = new Set(['KY']);
if (!ALLOWED_STATES.has(STATE)) {
  console.error(`[sync:dataset] Unknown state "${STATE}". Allowed: ${[...ALLOWED_STATES].join(', ')}`);
  process.exit(1);
}

function getDb() {
  if (!supabaseAdmin) {
    throw new Error('Supabase service-role client not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return supabaseAdmin;
}

/**
 * Mirrors `updateSourceStatus` in ky-sync-pipeline (which isn't exported).
 *
 * `touchLastSync` exists because `last_sync_at` is read by `source-health` as
 * "when this source last actually synced", and advancing it on a run that
 * synced nothing resets the staleness clock — hiding a source that is failing
 * every week behind a timestamp that keeps ticking. Only a run that reached a
 * verdict about upstream data advances it; a run that never got that far
 * (LegiScan unreachable, fatal crash) records its status and leaves the clock
 * where it was, so the freshness budget still trips on schedule.
 */
async function recordSourceStatus(
  status: SyncResult['status'],
  itemsSynced: number,
  errorMessage?: string,
  { touchLastSync = true }: { touchLastSync?: boolean } = {},
): Promise<void> {
  if (DRY_RUN) return;
  try {
    const db = getDb();
    // `ky_sources.status` is CHECK-constrained to 'success' | 'error' |
    // 'running' (migration 001) — a literal 'skipped' would be rejected by the
    // database, so every non-error outcome has to persist as 'success'. That
    // also matches how the rest of the pipeline reports a quota-hold skip,
    // keeping `/admin/sync-status` green for an outcome that isn't a fault.
    // The distinction survives in `error_message`.
    const persistedStatus = status === 'error' ? 'error' : 'success';
    // Omitting `last_sync_at` leaves the stored value untouched on update (and
    // null on a first-ever insert, which reads correctly as "never completed").
    await db.from('ky_sources').upsert(
      {
        source_name: SOURCE,
        status: persistedStatus,
        items_synced: itemsSynced,
        ...(touchLastSync ? { last_sync_at: new Date().toISOString() } : {}),
        error_message: errorMessage || null,
      },
      { onConflict: 'source_name' },
    );
  } catch (err: any) {
    console.error(`[sync:dataset] Failed to update ky_sources: ${err?.message || err}`);
  }
}

interface SessionSyncOutcome {
  session_id: number;
  session_name: string;
  bills: number;
  people: number;
  votes: number;
}

async function processDatasetEntry(entry: LegiScanDatasetListEntry): Promise<SessionSyncOutcome> {
  const client = getKyLegiScanClient();
  const dataset = await client.fetchDataset(entry.session_id, entry.access_key);
  if (!dataset?.zip) throw new Error(`Empty dataset payload for session ${entry.session_id}`);
  const { bills, people, rollCalls } = parseDatasetZip(dataset.zip);
  const sessionName = dataset.session_name || entry.session_name || entry.session_title || String(entry.session_id);
  console.log(`[sync:dataset] Parsed dataset ${entry.session_id} (${sessionName}): ${bills.length} bills, ${people.length} people, ${rollCalls.length} roll calls`);

  if (DRY_RUN) {
    return { session_id: entry.session_id, session_name: sessionName, bills: bills.length, people: people.length, votes: rollCalls.length };
  }

  const db = getDb();
  const billRows = bills
    .map((b) => buildBillRow(b, sessionName, entry.session_id))
    .filter((r) => r.legiscan_id != null && r.bill_number);
  const billUuidByLegiscanId = await upsertBillRows(db, billRows);
  console.log(`[sync:dataset]   ✓ upserted ${billRows.length} bills`);

  const legislatorRows = dedupeLegislatorRows(
    people.map((p) => buildLegislatorRow(p)).filter((r): r is Record<string, unknown> => r !== null),
  );
  const legSynced = await upsertLegislatorRows(db, legislatorRows);
  console.log(`[sync:dataset]   ✓ upserted ${legSynced} legislators`);

  const voteRows = dedupeVoteRows(
    rollCalls.map((rc) => buildVoteRow(rc, billUuidByLegiscanId)).filter((r): r is Record<string, unknown> => r !== null),
  );
  const voteSynced = await upsertVoteRows(db, voteRows);
  console.log(`[sync:dataset]   ✓ upserted ${voteSynced} votes`);

  await recordDatasetImport(db, entry);
  return { session_id: entry.session_id, session_name: sessionName, bills: billRows.length, people: legSynced, votes: voteSynced };
}

async function main() {
  const start = Date.now();
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  KY LegiScan Dataset — weekly reconcile      ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  state: ${STATE}${DRY_RUN ? '  [DRY RUN]' : ''}`);
  console.log('');

  if (!process.env.LEGISCAN_API_KEY) {
    console.warn('[sync:dataset] LEGISCAN_API_KEY not set — getDatasetList will fail.');
  }

  // Start-of-run quota guard — mirrors syncKyBills. If we're at/above the
  // hold threshold, skip the run cleanly. `getDataset` counts against quota
  // and this cron runs when the monthly bucket often sits near the ceiling.
  const guard = await checkLegiscanQuotaForSync();
  if (guard.blocked) {
    const reason = guard.reason || 'LegiScan quota hold engaged';
    console.log(`[sync:dataset] Skipped — ${reason}`);
    const result: SyncResult = { source: SOURCE, status: 'skipped', itemsSynced: 0, error: reason, duration: Date.now() - start };
    await recordSourceStatus('skipped', 0, reason, { touchLastSync: false });
    await notifySyncSlack({ results: [result], source: SOURCE, dryRun: DRY_RUN, isVercelCron: false, fromCli: true })
      .catch((e) => console.error('[Slack] sync notify failed:', e));
    process.exit(0);
  }

  let list: LegiScanDatasetListEntry[];
  try {
    const client = getKyLegiScanClient();
    list = await client.fetchDatasetList(STATE);
  } catch (err) {
    if (isLegiscanQuotaHoldError(err)) {
      const reason = err.message;
      console.log(`[sync:dataset] Skipped — ${reason}`);
      const result: SyncResult = { source: SOURCE, status: 'skipped', itemsSynced: 0, error: reason, duration: Date.now() - start };
      await recordSourceStatus('skipped', 0, reason, { touchLastSync: false });
      await notifySyncSlack({ results: [result], source: SOURCE, dryRun: DRY_RUN, isVercelCron: false, fromCli: true })
        .catch((e) => console.error('[Slack] sync notify failed:', e));
      process.exit(0);
    }
    throw err;
  }
  console.log(`[sync:dataset] getDatasetList(${STATE}) returned ${list.length} sessions`);

  // Read stored hashes even in dry-run so the operator sees the true diff.
  // Soft-fails to an empty map only if Supabase isn't configured at all.
  let stored: Map<number, string>;
  try {
    stored = await fetchStoredDatasetHashes(getDb());
  } catch (err) {
    if (DRY_RUN) {
      console.warn(`[sync:dataset] Could not read ky_legiscan_datasets (${err instanceof Error ? err.message : String(err)}); dry-run will list all sessions as changed.`);
      stored = new Map<number, string>();
    } else {
      throw err;
    }
  }
  const changed: LegiScanDatasetListEntry[] = [];
  const unchanged: LegiScanDatasetListEntry[] = [];
  for (const entry of list) {
    if (!FORCE && stored.get(entry.session_id) === entry.dataset_hash) unchanged.push(entry);
    else changed.push(entry);
  }
  if (FORCE) {
    console.log(`[sync:dataset] --force: hash gating bypassed, re-importing all ${changed.length} session(s)`);
  }
  const toProcess = SESSION_LIMIT ? changed.slice(0, SESSION_LIMIT) : changed;
  const deferred = SESSION_LIMIT ? changed.slice(SESSION_LIMIT) : [];
  console.log(`[sync:dataset] ${unchanged.length} unchanged (skipped), ${toProcess.length} changed${deferred.length ? `, ${deferred.length} deferred` : ''}`);

  if (toProcess.length === 0) {
    console.log('[sync:dataset] Nothing to do — all sessions up to date.');
    const result: SyncResult = { source: SOURCE, status: 'success', itemsSynced: 0, duration: Date.now() - start };
    await recordSourceStatus('success', 0);
    await notifySyncSlack({ results: [result], source: SOURCE, dryRun: DRY_RUN, isVercelCron: false, fromCli: true })
      .catch((e) => console.error('[Slack] sync notify failed:', e));
    process.exit(0);
  }

  let totalBills = 0;
  let totalPeople = 0;
  let totalVotes = 0;
  let quotaHitMidRun = false;
  const failures: { session_id: number; error: string }[] = [];
  const succeeded: SessionSyncOutcome[] = [];

  for (const entry of toProcess) {
    console.log('');
    console.log(`[sync:dataset] → session ${entry.session_id} ${entry.session_name} (${entry.year_start}-${entry.year_end}) hash=${entry.dataset_hash.slice(0, 8)}…`);
    if (DRY_RUN) {
      console.log(`[sync:dataset] [DRY RUN] would fetchDataset + decode zip + upsert bills/people/votes`);
      continue;
    }
    try {
      const res = await processDatasetEntry(entry);
      succeeded.push(res);
      totalBills += res.bills;
      totalPeople += res.people;
      totalVotes += res.votes;
    } catch (err) {
      if (isLegiscanQuotaHoldError(err)) {
        console.log(`[sync:dataset] Quota hold engaged mid-run — deferring remaining sessions to next week.`);
        quotaHitMidRun = true;
        break;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[sync:dataset] Session ${entry.session_id} FAILED: ${msg}`);
      failures.push({ session_id: entry.session_id, error: msg });
    }
  }

  console.log('');
  console.log('═══════════════ Dataset Sync Results ═══════════════');
  console.log(`  sessions unchanged (skipped): ${unchanged.length}`);
  console.log(`  sessions changed:             ${changed.length}`);
  console.log(`  sessions processed:           ${succeeded.length}`);
  console.log(`  sessions failed:              ${failures.length}`);
  console.log(`  quota-hold mid-run:           ${quotaHitMidRun ? 'yes' : 'no'}`);
  if (!DRY_RUN) {
    console.log(`  bills upserted:               ${totalBills}`);
    console.log(`  legislators upserted:         ${totalPeople}`);
    console.log(`  votes upserted:               ${totalVotes}`);
  }
  for (const f of failures) console.log(`  ❌ session ${f.session_id}: ${f.error}`);
  console.log('');

  // Aggregate into a single SyncResult so the Slack digest lists `dataset` once.
  const status: SyncResult['status'] = failures.length > 0 ? 'error' : 'success';
  const errorSummary = failures.length > 0
    ? failures.map((f) => `session ${f.session_id}: ${f.error}`).join('; ')
    : quotaHitMidRun
      ? 'quota-hold engaged mid-run; remaining sessions deferred to next week'
      : undefined;
  const itemsSynced = totalBills + totalPeople + totalVotes;
  const result: SyncResult = {
    source: SOURCE,
    status,
    itemsSynced,
    error: errorSummary,
    duration: Date.now() - start,
  };

  // Don't advance the freshness clock on a run that ended in failure, even a
  // partial one: some sessions imported, but the source did not finish
  // reconciling and should not read as freshly synced.
  await recordSourceStatus(status, itemsSynced, errorSummary, {
    touchLastSync: status !== 'error',
  });
  await notifySyncSlack({ results: [result], source: SOURCE, dryRun: DRY_RUN, isVercelCron: false, fromCli: true })
    .catch((e) => console.error('[Slack] sync notify failed:', e));

  if (failures.length > 0) {
    // `notifySyncSlack` already posted the failure to #errors when both
    // webhooks resolve — tell the workflow's follow-up step to stand down.
    markSlackErrorNotified();
  }

  process.exit(failures.length > 0 ? 1 : 0);
}

withLegiscanCaller('dataset-sync', main).catch(async (err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(`[sync:dataset] Fatal: ${msg}`);

  // Record the failure on `ky_sources` before exiting. Without this the row
  // keeps last week's `success` and the health check has no idea the run died —
  // which is exactly what happened on 2026-08-30, when five 60s getDatasetList
  // timeouts killed the run and the only signal anyone got was a stale-sync
  // breach ten days later, misreported as "the workflow never fired".
  //
  // A transient LegiScan outage is recorded as `success` (with the reason) so it
  // does not red /admin/sync-status or page for something that self-heals on the
  // next run — matching `legiscanUnreachableSkipResult` in ky-sync-pipeline.
  // Either way `last_sync_at` is left alone, so a source that keeps failing
  // still breaches its freshness budget on time instead of looking fresh.
  const transient = isTransientLegiscanNetworkError(err);
  await recordSourceStatus(
    transient ? 'skipped' : 'error',
    0,
    transient ? `LegiScan unreachable (transient): ${msg}` : msg,
    { touchLastSync: false },
  );

  await notifySyncExceptionSlack({ error: err, source: SOURCE, dryRun: DRY_RUN, isVercelCron: false, fromCli: true })
    .catch((e) => console.error('[Slack] exception notify failed:', e));
  markSlackErrorNotified();
  process.exit(1);
});
