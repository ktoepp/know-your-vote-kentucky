#!/usr/bin/env npx tsx
/**
 * One-time historic `ky_votes` backfill from LegiScan session datasets.
 *
 * WHY THIS EXISTS: the 2026-04-24 bulk seed imported bills + people + votes
 * for every KY session, but the pre-2018 dataset ZIPs yielded **0 roll calls**
 * (2018 Regular Session onward landed 749–943 votes in the same run, same
 * code). Because that seed recorded every session's `dataset_hash` in
 * `ky_legiscan_datasets`, the hash-gate makes every later dataset run a no-op
 * for those sessions. This script deliberately **bypasses the hash-gate** and
 * re-pulls the target sessions, importing **votes only** — it never rewrites
 * `ky_bills` or `ky_legislators` rows.
 *
 * QUOTA ETIQUETTE (read before running): forced re-pull of an unchanged
 * dataset is exactly the pattern LegiScan penalises (see the hash-gating memo,
 * 2026-07-07, after LegiScan flagged our key). A one-time forced pull of the
 * ~13 zero-vote historic sessions (~2 quota points each) is acceptable; do NOT
 * schedule this script or re-run it in a loop. It records the pulled hash in
 * `ky_legiscan_datasets`, so the Sunday reconcile stays gated afterwards.
 *
 * DIAGNOSTIC: for each session the script logs the archive's `vote/` file
 * count vs parsed roll calls. If a dataset ships **0 vote files**, LegiScan's
 * archive for that session simply contains no roll-call JSON — re-pulling can
 * never fix it and the fallback is a per-bill getBill+getRollCall API backfill
 * (not built; see TASKS.md § Backfill pre-2018 roll-call votes).
 *
 * Usage:
 *   npm run backfill:ky:votes:dry                         # plan only (1 getDatasetList call, no downloads/writes)
 *   npm run backfill:ky:votes                             # all sessions with bills but 0 votes
 *   npm run backfill:ky:votes -- --sessions=1257,1161     # explicit LegiScan session_ids
 *   npm run backfill:ky:votes -- --limit=3                # cap downloads per run, re-run to continue
 *
 * Idempotent: `ky_votes` upserts on (bill_id, roll_call_id) and
 * `dropDuplicateRollCallRows` (inside `upsertVoteRows`) guards against
 * LegiScan shipping one physical roll call under two roll_call_ids. In the
 * default (auto) mode, a successfully backfilled session drops out of the
 * target list on the next run.
 *
 * Requires LEGISCAN_API_KEY, SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL).
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { getKyLegiScanClient } from '../src/lib/ky-data-sources';
import type { LegiScanDatasetListEntry } from '../src/lib/ky-legiscan-client';
import {
  buildVoteRow,
  dedupeVoteRows,
  fetchBillUuidMapForSession,
  parseDatasetZip,
  recordDatasetImport,
  upsertVoteRows,
} from '../src/lib/ky-legiscan-dataset-import';
import {
  checkLegiscanQuotaForSync,
  isLegiscanQuotaHoldError,
} from '../src/lib/legiscan-quota';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run') || args.includes('--dryRun');
const sessionsFlag = args.find((a) => a.startsWith('--sessions='))?.split('=')[1];
const limitFlag = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const SESSION_LIMIT = limitFlag ? parseInt(limitFlag, 10) : undefined;

function getDb() {
  if (!supabaseAdmin) {
    throw new Error('Supabase service-role client not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return supabaseAdmin;
}

function parseSessionsFlag(raw: string): number[] {
  const ids = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => parseInt(s, 10));
  if (ids.length === 0 || ids.some((n) => !Number.isFinite(n))) {
    throw new Error(`--sessions must be a comma-separated list of LegiScan session_ids, got "${raw}"`);
  }
  return ids;
}

async function countBillsForSession(sessionId: number): Promise<number> {
  const { count, error } = await getDb()
    .from('ky_bills')
    .select('id', { count: 'exact', head: true })
    .eq('legiscan_session_id', sessionId);
  if (error) throw new Error(`ky_bills count for session ${sessionId}: ${error.message}`);
  return count ?? 0;
}

async function countVotesForSession(sessionId: number): Promise<number> {
  const { count, error } = await getDb()
    .from('ky_votes')
    .select('id, ky_bills!inner(legiscan_session_id)', { count: 'exact', head: true })
    .eq('ky_bills.legiscan_session_id', sessionId);
  if (error) throw new Error(`ky_votes count for session ${sessionId}: ${error.message}`);
  return count ?? 0;
}

interface SessionOutcome {
  entry: LegiScanDatasetListEntry;
  voteFiles: number;
  rollCallsParsed: number;
  votesUpserted: number;
  unmatchedBills: number;
}

async function processSession(entry: LegiScanDatasetListEntry): Promise<SessionOutcome> {
  const client = getKyLegiScanClient();
  const db = getDb();
  const dataset = await client.fetchDataset(entry.session_id, entry.access_key);
  if (!dataset?.zip) throw new Error(`Empty dataset payload for session ${entry.session_id}`);
  const { rollCalls, fileCounts } = parseDatasetZip(dataset.zip);
  console.log(
    `[votes-backfill]   archive: ${fileCounts.total} entries (${fileCounts.billFiles} bill, ${fileCounts.peopleFiles} people, ${fileCounts.voteFiles} vote) → ${rollCalls.length} roll calls parsed`,
  );
  if (fileCounts.voteFiles === 0) {
    console.warn(
      `[votes-backfill]   ⚠️  Dataset for session ${entry.session_id} ships NO vote JSON — LegiScan's archive lacks roll calls for this session. ` +
        `Re-pulling cannot fix this; a getBill+getRollCall API backfill is the only remaining source (see TASKS.md).`,
    );
  } else if (rollCalls.length === 0) {
    console.warn(
      `[votes-backfill]   ⚠️  ${fileCounts.voteFiles} vote file(s) present but 0 roll calls parsed — likely a parser gap, do NOT re-pull; investigate parseDatasetZip.`,
    );
  }

  // Votes-only: map roll calls onto bills already in the DB. Never rewrite
  // ky_bills/ky_legislators here — historic people payloads would clobber
  // current party/district/active values.
  const billUuidByLegiscanId = await fetchBillUuidMapForSession(db, entry.session_id);
  const voteRows: Record<string, unknown>[] = [];
  let unmatchedBills = 0;
  for (const rc of rollCalls) {
    const row = buildVoteRow(rc, billUuidByLegiscanId);
    if (row) voteRows.push(row);
    else unmatchedBills += 1;
  }
  const deduped = dedupeVoteRows(voteRows);
  const votesUpserted = await upsertVoteRows(db, deduped);
  if (unmatchedBills > 0) {
    console.warn(`[votes-backfill]   ⚠️  ${unmatchedBills} roll call(s) referenced bills not in ky_bills for this session — skipped.`);
  }
  console.log(`[votes-backfill]   ✓ upserted ${votesUpserted} vote row(s)`);

  // Refresh the hash-gate record so the Sunday reconcile stays a no-op for
  // this session (and picks up the current hash if LegiScan regenerated it).
  await recordDatasetImport(db, entry);
  return { entry, voteFiles: fileCounts.voteFiles, rollCallsParsed: rollCalls.length, votesUpserted, unmatchedBills };
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  KY votes backfill — forced dataset re-import    ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log(`  mode: ${sessionsFlag ? `explicit sessions (${sessionsFlag})` : 'auto (sessions with bills but 0 votes)'}${DRY_RUN ? '  [DRY RUN]' : ''}`);
  console.log('  NOTE: this bypasses the ky_legiscan_datasets hash-gate — one-time use only (quota etiquette).');
  console.log('');

  if (!process.env.LEGISCAN_API_KEY) {
    console.warn('[votes-backfill] LEGISCAN_API_KEY not set — getDatasetList will fail.');
  }

  // Start-of-run quota guard, mirroring sync:ky:dataset. A forced backfill on
  // a near-exhausted monthly bucket is the worst possible etiquette — bail.
  const guard = await checkLegiscanQuotaForSync();
  if (guard.blocked) {
    console.error(`[votes-backfill] ABORTED — ${guard.reason || 'LegiScan quota hold engaged'}. Re-run after the quota window resets.`);
    process.exit(1);
  }

  const client = getKyLegiScanClient();
  const list = await client.fetchDatasetList('KY');
  console.log(`[votes-backfill] getDatasetList(KY) returned ${list.length} sessions`);
  const entryBySessionId = new Map(list.map((e) => [e.session_id, e]));

  let targets: LegiScanDatasetListEntry[];
  if (sessionsFlag) {
    const ids = parseSessionsFlag(sessionsFlag);
    const missing = ids.filter((id) => !entryBySessionId.has(id));
    if (missing.length > 0) {
      throw new Error(`Session id(s) not in getDatasetList(KY): ${missing.join(', ')}. Run npm run sync:ky:sessions to list valid ids.`);
    }
    targets = ids.map((id) => entryBySessionId.get(id)!);
  } else {
    // Auto mode: exactly the sessions that have bills but zero votes.
    targets = [];
    for (const entry of list) {
      const bills = await countBillsForSession(entry.session_id);
      if (bills === 0) continue;
      const votes = await countVotesForSession(entry.session_id);
      if (votes === 0) targets.push(entry);
    }
  }

  if (targets.length === 0) {
    console.log('[votes-backfill] Nothing to do — every seeded session already has votes.');
    process.exit(0);
  }

  const toProcess = SESSION_LIMIT ? targets.slice(0, SESSION_LIMIT) : targets;
  const deferred = SESSION_LIMIT ? targets.slice(SESSION_LIMIT) : [];
  console.log(`[votes-backfill] ${targets.length} target session(s)${deferred.length ? `, processing ${toProcess.length} (re-run to continue)` : ''}:`);
  for (const t of toProcess) console.log(`  → ${t.session_id} ${t.session_name} (${t.year_start}-${t.year_end})`);
  for (const t of deferred) console.log(`  ⏸️  ${t.session_id} ${t.session_name} (deferred by --limit)`);

  if (DRY_RUN) {
    console.log('');
    console.log(`[votes-backfill] [DRY RUN] Would force-download ${toProcess.length} dataset(s) (~${toProcess.length * 2} quota points) and upsert vote rows only.`);
    process.exit(0);
  }

  const outcomes: SessionOutcome[] = [];
  const failures: { session_id: number; error: string }[] = [];
  let quotaHitMidRun = false;
  for (const entry of toProcess) {
    console.log('');
    console.log(`[votes-backfill] → session ${entry.session_id} ${entry.session_name} (${entry.year_start}-${entry.year_end}) hash=${entry.dataset_hash.slice(0, 8)}…`);
    try {
      outcomes.push(await processSession(entry));
    } catch (err) {
      if (isLegiscanQuotaHoldError(err)) {
        console.error('[votes-backfill] Quota hold engaged mid-run — stopping. Re-run after the quota window resets to continue.');
        quotaHitMidRun = true;
        break;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[votes-backfill] Session ${entry.session_id} FAILED: ${msg}`);
      failures.push({ session_id: entry.session_id, error: msg });
    }
  }

  console.log('');
  console.log('═══════════════ Votes Backfill Results ═══════════════');
  for (const o of outcomes) {
    const verdict = o.votesUpserted > 0
      ? `✓ ${o.votesUpserted} votes`
      : o.voteFiles === 0
        ? '∅ dataset has no vote JSON (API fallback required)'
        : '⚠️ 0 upserted';
    console.log(`  ${o.entry.session_id} ${o.entry.session_name}: ${verdict} (${o.rollCallsParsed} parsed, ${o.unmatchedBills} unmatched)`);
  }
  for (const f of failures) console.log(`  ❌ session ${f.session_id}: ${f.error}`);
  if (quotaHitMidRun) console.log('  ⏸️  stopped on quota hold — remaining sessions untouched');
  console.log('');
  console.log('Verify per-session counts with the SQL in TASKS.md § Backfill pre-2018 roll-call votes.');

  process.exit(failures.length > 0 || quotaHitMidRun ? 1 : 0);
}

main().catch((err) => {
  console.error(`[votes-backfill] Fatal: ${err?.message || err}`);
  process.exit(1);
});
