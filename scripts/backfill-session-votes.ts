#!/usr/bin/env npx tsx
/**
 * Backfill `ky_votes` for sessions the dataset importer left with zero roll calls.
 *
 * Why this exists — the TASKS.md plan ("prefer the Dataset Pull API path") does
 * not work for older sessions, and the 2026-08-01 forced full re-import proved
 * it: `getDataset` ships roll-call JSON files only from the 2018 Regular Session
 * onward. Every earlier KY session decoded to `0 roll calls`, so re-running
 * `sync:ky:dataset --force` can never fill them in, no matter how many times.
 *
 * The seam this script uses: each dataset *bill* JSON still carries a `votes[]`
 * summary (`roll_call_id`, date, desc, tallies) even for sessions whose ZIP has
 * no roll-call files. That gives us the roll-call ids for free, and `getRollCall`
 * turns each id into a full record — including the per-member `votes[]` breakdown
 * that `ky_votes.roll_call` needs for member Voting-record pages to render.
 *
 * Cost: 1 `getDatasetList` + 1 `getDataset` per session to discover ids, then 1
 * `getRollCall` per roll call to fetch it. Discovery is cheap; the fetch is the
 * spend, so the default run is DISCOVERY ONLY and prints the projected cost.
 *
 * Resumable: roll calls already stored are skipped, so a run killed by the job
 * timeout can simply be dispatched again. Use `--limit` to size a run.
 *
 *   npm run backfill:session-votes                          # discover + estimate
 *   npm run backfill:session-votes -- --since-year=2015     # scope the estimate
 *   npm run backfill:session-votes -- --since-year=2015 --live
 *   npm run backfill:session-votes -- --sessions=1103,1161 --live --limit=500
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { getKyLegiScanClient } from '../src/lib/ky-data-sources';
import type { LegiScanDatasetListEntry } from '../src/lib/ky-legiscan-client';
import { buildVoteRow, parseDatasetZip, upsertVoteRows } from '../src/lib/ky-legiscan-dataset-import';
import {
  checkLegiscanQuotaForSync,
  isLegiscanQuotaHoldError,
  legiscanPublicMonthlyLimit,
} from '../src/lib/legiscan-quota';

const args = process.argv.slice(2);
const LIVE = args.includes('--live');
const sessionsArg = args.find((a) => a.startsWith('--sessions='))?.split('=')[1];
const SESSION_IDS = sessionsArg
  ? sessionsArg.split(',').map((s) => parseInt(s.trim(), 10)).filter(Number.isFinite)
  : null;
const sinceArg = args.find((a) => a.startsWith('--since-year='))?.split('=')[1];
const SINCE_YEAR = sinceArg ? parseInt(sinceArg, 10) : null;
const limitArg = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const LIMIT = limitArg ? parseInt(limitArg, 10) : Infinity;

/** Flush upserts in slices so a timeout keeps whatever the run already fetched. */
const FLUSH_EVERY = 200;

function getDb() {
  if (!supabaseAdmin) {
    throw new Error('Supabase service-role client not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return supabaseAdmin;
}

type Db = ReturnType<typeof getDb>;

interface RollCallTarget {
  rollCallId: number;
  billLegiscanId: number;
  billNumber: string;
}

interface SessionPlan {
  entry: LegiScanDatasetListEntry;
  bills: number;
  /** Roll-call JSON files shipped in the ZIP — 0 is the whole reason this script exists. */
  rollCallFiles: number;
  /** Roll-call ids recovered from the bill JSONs' `votes[]` summaries. */
  targets: RollCallTarget[];
  alreadyStored: number;
  /** Bill legiscan_id → ky_bills.id, for the rows we can actually write. */
  billUuidByLegiscanId: Map<number, string>;
}

/** Sessions that have bills but no votes — the gap this script fills. */
async function findSessionsMissingVotes(db: Db): Promise<Set<number>> {
  const withBills = new Set<number>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('ky_bills')
      .select('legiscan_session_id')
      .not('legiscan_session_id', 'is', null)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`ky_bills read failed: ${error.message}`);
    if (!data?.length) break;
    for (const row of data as { legiscan_session_id: number }[]) withBills.add(Number(row.legiscan_session_id));
    if (data.length < PAGE) break;
  }

  const withVotes = new Set<number>();
  for (const sessionId of withBills) {
    const { count, error } = await db
      .from('ky_votes')
      .select('id, ky_bills!inner(legiscan_session_id)', { count: 'exact', head: true })
      .eq('ky_bills.legiscan_session_id', sessionId);
    if (error) throw new Error(`ky_votes count failed for session ${sessionId}: ${error.message}`);
    if ((count ?? 0) > 0) withVotes.add(sessionId);
  }

  return new Set([...withBills].filter((id) => !withVotes.has(id)));
}

async function fetchBillUuids(db: Db, legiscanIds: number[]): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  const CHUNK = 300;
  for (let i = 0; i < legiscanIds.length; i += CHUNK) {
    const { data, error } = await db
      .from('ky_bills')
      .select('id, legiscan_id')
      .in('legiscan_id', legiscanIds.slice(i, i + CHUNK));
    if (error) throw new Error(`ky_bills lookup: ${error.message}`);
    for (const row of data || []) {
      if (row.legiscan_id != null && row.id) map.set(Number(row.legiscan_id), String(row.id));
    }
  }
  return map;
}

/** Roll calls we already hold, so a re-run doesn't re-buy them. */
async function fetchStoredRollCallIds(db: Db, billUuids: string[]): Promise<Set<number>> {
  const stored = new Set<number>();
  const CHUNK = 300;
  for (let i = 0; i < billUuids.length; i += CHUNK) {
    const { data, error } = await db
      .from('ky_votes')
      .select('roll_call_id')
      .in('bill_id', billUuids.slice(i, i + CHUNK))
      .not('roll_call_id', 'is', null);
    if (error) throw new Error(`ky_votes read failed: ${error.message}`);
    for (const row of data || []) stored.add(Number(row.roll_call_id));
  }
  return stored;
}

async function planSession(db: Db, entry: LegiScanDatasetListEntry): Promise<SessionPlan> {
  const client = getKyLegiScanClient();
  const dataset = await client.fetchDataset(entry.session_id, entry.access_key);
  if (!dataset?.zip) throw new Error(`Empty dataset payload for session ${entry.session_id}`);
  const { bills, rollCalls } = parseDatasetZip(dataset.zip);

  // Recover roll-call ids from the bill payloads. Sessions whose ZIP *does* ship
  // roll-call files are handled by sync:ky:dataset and shouldn't reach here.
  const seen = new Set<number>();
  const discovered: RollCallTarget[] = [];
  for (const bill of bills) {
    const billLegiscanId = Number(bill?.bill_id);
    if (!Number.isFinite(billLegiscanId)) continue;
    const votes = Array.isArray(bill?.votes) ? bill.votes : [];
    for (const v of votes) {
      const rollCallId = Number(v?.roll_call_id);
      if (!Number.isFinite(rollCallId) || seen.has(rollCallId)) continue;
      seen.add(rollCallId);
      discovered.push({ rollCallId, billLegiscanId, billNumber: bill?.bill_number || bill?.number || '(unknown)' });
    }
  }

  const billUuidByLegiscanId = await fetchBillUuids(db, [...new Set(discovered.map((t) => t.billLegiscanId))]);
  const storedRollCallIds = await fetchStoredRollCallIds(db, [...billUuidByLegiscanId.values()]);

  // Drop anything already stored, plus anything whose bill isn't in the DB —
  // buildVoteRow would return null for those and the getRollCall spend would be wasted.
  const targets = discovered.filter(
    (t) => !storedRollCallIds.has(t.rollCallId) && billUuidByLegiscanId.has(t.billLegiscanId),
  );

  return {
    entry,
    bills: bills.length,
    rollCallFiles: rollCalls.length,
    targets,
    alreadyStored: discovered.length - targets.length,
    billUuidByLegiscanId,
  };
}

async function main() {
  const start = Date.now();
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  KY session roll-call backfill               ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  mode: ${LIVE ? 'LIVE (spends quota, writes rows)' : 'DISCOVERY ONLY (no getRollCall, no writes)'}`);
  console.log('');

  const guard = await checkLegiscanQuotaForSync();
  if (guard.blocked) {
    console.log(`[backfill:votes] Skipped — ${guard.reason || 'LegiScan quota hold engaged'}`);
    process.exit(0);
  }
  if (guard.summary) {
    console.log(`[backfill:votes] Quota: ${guard.summary.used}/${guard.summary.limit} used this month (${guard.summary.pct}%)`);
  }

  const db = getDb();
  const client = getKyLegiScanClient();
  const list = await client.fetchDatasetList('KY');
  console.log(`[backfill:votes] getDatasetList(KY) returned ${list.length} sessions`);

  let selected: LegiScanDatasetListEntry[];
  if (SESSION_IDS) {
    const wanted = new Set(SESSION_IDS);
    selected = list.filter((e) => wanted.has(e.session_id));
    const missing = SESSION_IDS.filter((id) => !list.some((e) => e.session_id === id));
    if (missing.length) console.warn(`[backfill:votes] Not in LegiScan's KY dataset list, ignoring: ${missing.join(', ')}`);
  } else {
    const gaps = await findSessionsMissingVotes(db);
    selected = list.filter((e) => gaps.has(e.session_id));
    console.log(`[backfill:votes] ${gaps.size} session(s) have bills but zero stored votes`);
  }
  if (SINCE_YEAR != null) {
    selected = selected.filter((e) => (e.year_end || e.year_start || 0) >= SINCE_YEAR);
    console.log(`[backfill:votes] --since-year=${SINCE_YEAR} → ${selected.length} session(s) in scope`);
  }
  selected.sort((a, b) => (b.year_end || 0) - (a.year_end || 0));

  if (selected.length === 0) {
    console.log('[backfill:votes] Nothing to do — no sessions in scope.');
    return;
  }

  const plans: SessionPlan[] = [];
  for (const entry of selected) {
    try {
      const plan = await planSession(db, entry);
      plans.push(plan);
      console.log(
        `[backfill:votes] → ${entry.session_id} ${entry.session_name} (${entry.year_start}-${entry.year_end}): ` +
          `${plan.bills} bills, ${plan.rollCallFiles} roll-call files in ZIP, ` +
          `${plan.targets.length} roll call(s) to fetch` +
          (plan.alreadyStored ? `, ${plan.alreadyStored} already stored or unmatched` : ''),
      );
    } catch (err) {
      if (isLegiscanQuotaHoldError(err)) {
        console.log('[backfill:votes] Quota hold engaged during discovery — stopping.');
        break;
      }
      throw err;
    }
  }

  const allTargets = plans.flatMap((p) => p.targets.map((t) => ({ ...t, plan: p })));
  const targets = LIMIT === Infinity ? allTargets : allTargets.slice(0, LIMIT);
  const monthlyLimit = legiscanPublicMonthlyLimit();

  console.log('');
  console.log(`[backfill:votes] ${allTargets.length} roll call(s) discovered across ${plans.length} session(s)`);
  if (targets.length !== allTargets.length) {
    console.log(`[backfill:votes] --limit=${LIMIT} → fetching ${targets.length} this run`);
  }
  console.log(
    `[backfill:votes] Projected cost: ${targets.length} getRollCall calls — ` +
      `${((targets.length / monthlyLimit) * 100).toFixed(1)}% of the ${monthlyLimit / 1000}k monthly quota`,
  );

  if (allTargets.length === 0) {
    console.log('');
    console.log('[backfill:votes] No roll-call ids found in these sessions\' bill payloads.');
    console.log('[backfill:votes] LegiScan has no roll-call record for them — this is an upstream');
    console.log('[backfill:votes] coverage boundary, not something a re-run can fix.');
    return;
  }

  if (!LIVE) {
    console.log('');
    console.log('[backfill:votes] Discovery only. Re-run with --live to spend quota and write rows.');
    return;
  }

  let fetched = 0;
  let unresolved = 0;
  let written = 0;
  let pending: Record<string, unknown>[] = [];

  const flush = async () => {
    if (pending.length === 0) return;
    written += await upsertVoteRows(db, pending);
    pending = [];
  };

  for (const [i, target] of targets.entries()) {
    let rollCall;
    try {
      rollCall = await client.fetchRollCall(target.rollCallId);
      fetched += 1;
    } catch (err) {
      if (isLegiscanQuotaHoldError(err)) {
        console.log('[backfill:votes] Quota hold engaged mid-run — flushing and stopping. Re-run to resume.');
        break;
      }
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[backfill:votes] ${target.billNumber} roll call ${target.rollCallId}: fetch failed — ${msg}`);
      continue;
    }

    if (!rollCall) {
      unresolved += 1;
      continue;
    }

    // getRollCall echoes bill_id, but fall back to the bill we found the id on
    // so a missing echo doesn't silently drop the row in buildVoteRow.
    const row = buildVoteRow(
      { ...rollCall, bill_id: rollCall.bill_id ?? target.billLegiscanId },
      target.plan.billUuidByLegiscanId,
    );
    if (!row) {
      unresolved += 1;
      continue;
    }
    pending.push(row);

    if (pending.length >= FLUSH_EVERY) await flush();
    if ((i + 1) % 250 === 0) {
      console.log(`[backfill:votes]   … ${i + 1}/${targets.length} fetched (${written} written so far)`);
    }
  }
  await flush();

  console.log('');
  console.log('═══════════════ Session vote backfill ═══════════════');
  console.log(`  sessions in scope:   ${plans.length}`);
  console.log(`  roll calls fetched:  ${fetched}`);
  console.log(`  votes written:       ${written}`);
  console.log(`  unresolved:          ${unresolved}`);
  console.log(`  duration:            ${Math.round((Date.now() - start) / 1000)}s`);
  if (written < allTargets.length) {
    console.log('');
    console.log('  Run again to resume — stored roll calls are skipped on the next pass.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
