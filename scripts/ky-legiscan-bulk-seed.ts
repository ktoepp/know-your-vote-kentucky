#!/usr/bin/env npx tsx
/**
 * Kentucky LegiScan Bulk Seed — operator-gated dataset importer (LegiScan plan §4.2, §5).
 *
 * Usage:
 *   npm run bulk-seed:ky -- --state=KY
 *   npm run bulk-seed:ky -- --state=KY --dryRun
 *   npm run bulk-seed:ky -- --state=KY --limit=5   # process 5 sessions, re-run to continue
 *
 * Compares dataset_hash against ky_legiscan_datasets and only downloads sessions
 * whose hash changed. Shared parse/upsert logic lives in
 * `src/lib/ky-legiscan-dataset-import.ts` (also used by `sync:ky:dataset`).
 * Idempotent: re-running against unchanged data is a no-op (0 downloads).
 * Not wired to cron; manual backfill only.
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { getKyLegiScanClient } from '../src/lib/ky-data-sources';
import type { LegiScanDatasetListEntry } from '../src/lib/ky-legiscan-client';
import {
  parseDatasetZip,
  buildBillRow,
  buildLegislatorRow,
  buildVoteRow,
  dedupeLegislatorRows,
  dedupeVoteRows,
  fetchStoredDatasetHashes,
  upsertBillRows,
  upsertLegislatorRows,
  upsertVoteRows,
  recordDatasetImport,
} from '../src/lib/ky-legiscan-dataset-import';

const args = process.argv.slice(2);
const stateFlag = args.find((a) => a.startsWith('--state='))?.split('=')[1];
const state = (stateFlag || 'KY').toUpperCase();
const dryRun = args.includes('--dryRun') || args.includes('--dry-run');
const limitFlag = args.find((a) => a.startsWith('--limit='))?.split('=')[1];
const sessionLimit = limitFlag ? parseInt(limitFlag, 10) : undefined;

const ALLOWED_STATES = new Set(['KY']);
if (!ALLOWED_STATES.has(state)) {
  console.error(
    `[bulk-seed] Unknown state "${state}". Allowed: ${[...ALLOWED_STATES].join(', ')}. ` +
    `Pass --state=KY to import Kentucky data.`
  );
  process.exit(1);
}

function getDb() {
  if (!supabaseAdmin) {
    throw new Error('Supabase service-role client not configured. Set SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY in .env.local.');
  }
  return supabaseAdmin;
}

async function processDatasetEntry(entry: LegiScanDatasetListEntry): Promise<{ bills: number; people: number; votes: number }> {
  const client = getKyLegiScanClient();
  const db = getDb();
  const dataset = await client.fetchDataset(entry.session_id, entry.access_key);
  if (!dataset?.zip) throw new Error(`Empty dataset payload for session ${entry.session_id}`);
  const { bills, people, rollCalls } = parseDatasetZip(dataset.zip);
  const sessionName = dataset.session_name || entry.session_name || entry.session_title || String(entry.session_id);
  console.log(`[bulk-seed] Parsed dataset ${entry.session_id} (${sessionName}): ${bills.length} bills, ${people.length} people, ${rollCalls.length} roll calls`);

  if (dryRun) {
    return { bills: bills.length, people: people.length, votes: rollCalls.length };
  }

  const billRows = bills
    .map((b) => buildBillRow(b, sessionName, entry.session_id))
    .filter((r) => r.legiscan_id != null && r.bill_number);
  const billUuidByLegiscanId = await upsertBillRows(db, billRows);
  console.log(`[bulk-seed] Upserted ${billRows.length} bills (session ${entry.session_id})`);

  const legislatorRows = dedupeLegislatorRows(
    people.map((p) => buildLegislatorRow(p)).filter((r): r is Record<string, unknown> => r !== null),
  );
  const legSynced = await upsertLegislatorRows(db, legislatorRows);
  console.log(`[bulk-seed] Upserted ${legSynced} legislators (session ${entry.session_id})`);

  const voteRows = dedupeVoteRows(
    rollCalls.map((rc) => buildVoteRow(rc, billUuidByLegiscanId)).filter((r): r is Record<string, unknown> => r !== null),
  );
  const voteSynced = await upsertVoteRows(db, voteRows);
  console.log(`[bulk-seed] Upserted ${voteSynced} votes (session ${entry.session_id})`);

  await recordDatasetImport(db, entry);
  return { bills: billRows.length, people: legSynced, votes: voteSynced };
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║  KY LegiScan Bulk Seed — Dataset Importer    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log(`  state: ${state}${dryRun ? '  [DRY RUN]' : ''}`);
  console.log('');

  if (!process.env.LEGISCAN_API_KEY) {
    console.warn('[bulk-seed] LEGISCAN_API_KEY not set — getDatasetList will fail.');
  }
  if (!dryRun) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    if (!supabaseUrl) console.warn('[bulk-seed] Supabase URL not set — DB writes will fail.');
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) console.warn('[bulk-seed] SUPABASE_SERVICE_ROLE_KEY not set — DB writes will fail.');
  }

  const client = getKyLegiScanClient();
  const list = await client.fetchDatasetList(state);
  console.log(`[bulk-seed] getDatasetList(${state}) returned ${list.length} sessions`);
  if (!list.length) {
    console.log('[bulk-seed] Nothing to do.');
    process.exit(0);
  }

  const stored = dryRun ? new Map<number, string>() : await fetchStoredDatasetHashes(getDb());
  const changed: LegiScanDatasetListEntry[] = [];
  const unchanged: LegiScanDatasetListEntry[] = [];
  for (const entry of list) {
    if (stored.get(entry.session_id) === entry.dataset_hash) unchanged.push(entry);
    else changed.push(entry);
  }
  const toProcess = sessionLimit ? changed.slice(0, sessionLimit) : changed;
  const deferred = sessionLimit ? changed.slice(sessionLimit) : [];
  console.log(`[bulk-seed] ${unchanged.length} unchanged (skipped), ${toProcess.length} to download${deferred.length ? `, ${deferred.length} deferred (re-run to continue)` : ''}`);
  for (const s of unchanged) console.log(`  ⏭️  ${s.session_id} ${s.session_name} (hash unchanged)`);
  for (const s of deferred) console.log(`  ⏸️  ${s.session_id} ${s.session_name} (deferred)`);

  let totalBills = 0;
  let totalPeople = 0;
  let totalVotes = 0;
  const failures: { session_id: number; error: string }[] = [];
  for (const entry of toProcess) {
    console.log('');
    console.log(`[bulk-seed] → session ${entry.session_id} ${entry.session_name} (${entry.year_start}-${entry.year_end}) hash=${entry.dataset_hash.slice(0, 8)}…`);
    if (dryRun) {
      console.log(`[bulk-seed] [DRY RUN] Would fetchDataset + decode zip + upsert bills/people/votes, then record hash in ky_legiscan_datasets.`);
      continue;
    }
    try {
      const res = await processDatasetEntry(entry);
      totalBills += res.bills;
      totalPeople += res.people;
      totalVotes += res.votes;
    } catch (err: any) {
      const msg = err?.message || String(err);
      console.error(`[bulk-seed] Session ${entry.session_id} FAILED: ${msg}`);
      failures.push({ session_id: entry.session_id, error: msg });
    }
  }

  console.log('');
  console.log('═══════════════ Bulk Seed Results ═══════════════');
  console.log(`  sessions skipped (unchanged): ${unchanged.length}`);
  console.log(`  sessions deferred:            ${deferred.length}`);
  console.log(`  sessions processed:           ${toProcess.length - failures.length}`);
  console.log(`  sessions failed:              ${failures.length}`);
  if (!dryRun) {
    console.log(`  bills upserted:               ${totalBills}`);
    console.log(`  legislators upserted:         ${totalPeople}`);
    console.log(`  votes upserted:               ${totalVotes}`);
  }
  for (const f of failures) console.log(`  ❌ session ${f.session_id}: ${f.error}`);
  console.log('');

  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(`[bulk-seed] Fatal: ${err?.message || err}`);
  process.exit(1);
});
