#!/usr/bin/env npx tsx
/**
 * Backfill ky_bills.legiscan_history + legiscan_texts from LegiScan session DATASETS
 * instead of per-bill getBill calls. Dataset bill JSON carries the same history[] and
 * texts[] arrays as getBill, so one dataset download (1 quota point) fills an entire
 * session — ~26 points for the whole backlog vs ~20,800 via backfill-bill-history-texts.ts.
 * Use that script only for small change-driven gaps in the active session; use this one
 * for bulk gaps in closed sessions.
 *
 *   npx tsx scripts/backfill-bill-history-from-datasets.ts --dry-run   # plan only, no LegiScan calls
 *   npx tsx scripts/backfill-bill-history-from-datasets.ts --limit=3   # cap dataset downloads, re-run to continue
 *   npx tsx scripts/backfill-bill-history-from-datasets.ts             # all sessions with missing bills
 *
 * Only downloads datasets for sessions that actually have bills missing legiscan_history,
 * newest session first. Writes only legiscan_history/legiscan_texts (upsert on legiscan_id,
 * rows already exist so it's always the update path). Quota-hold aware: stops cleanly if
 * the client-level hold engages mid-run; re-running continues where it left off.
 *
 * Hash-gated (LegiScan dataset best practices): compares each session's dataset_hash from
 * getDatasetList against ky_legiscan_datasets and SKIPS sessions whose hash is unchanged
 * since last import — re-pulling an unchanged dataset returns identical bills and cannot
 * fill a gap (bills still missing history simply aren't in that dataset version). After a
 * clean import it records the hash so the next run skips that session entirely.
 *
 * Requires LEGISCAN_API_KEY, SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 */
import './load-env';
import AdmZip from 'adm-zip';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { getKyLegiScanClient } from '../src/lib/ky-legiscan-client';
import { isLegiscanQuotaHoldError } from '../src/lib/legiscan-quota';

const DRY_RUN = process.argv.includes('--dry-run') || process.argv.includes('--dryRun');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const SESSION_LIMIT = limitArg ? parseInt(limitArg.split('=')[1] ?? '', 10) : Infinity;

interface MissingBill {
  id: string;
  legiscan_id: number;
  legiscan_session_id: number;
}

async function fetchAllMissingBills(): Promise<MissingBill[]> {
  const db = supabaseAdmin!;
  const out: MissingBill[] = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await db
      .from('ky_bills')
      .select('id, legiscan_id, legiscan_session_id')
      .is('legiscan_history', null)
      .not('legiscan_id', 'is', null)
      .not('legiscan_session_id', 'is', null)
      .order('id')
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    if (!data?.length) break;
    out.push(...(data as MissingBill[]));
    if (data.length < PAGE) break;
  }
  return out;
}

/** Session hashes we've already imported, keyed by session_id. */
async function fetchStoredDatasetHashes(): Promise<Map<number, string>> {
  const db = supabaseAdmin!;
  const { data, error } = await db.from('ky_legiscan_datasets').select('session_id, dataset_hash');
  if (error) throw new Error(`Read ky_legiscan_datasets failed: ${error.message}`);
  const map = new Map<number, string>();
  for (const row of data || []) {
    if (row.session_id != null && row.dataset_hash) map.set(Number(row.session_id), String(row.dataset_hash));
  }
  return map;
}

/** Record the imported dataset_hash so future runs skip this session while unchanged. */
async function recordDatasetImport(entry: { session_id: number; dataset_hash: string; access_key: string }): Promise<void> {
  const db = supabaseAdmin!;
  const { error } = await db.from('ky_legiscan_datasets').upsert(
    {
      session_id: entry.session_id,
      dataset_hash: entry.dataset_hash,
      access_key: entry.access_key,
      last_imported_at: new Date().toISOString(),
    },
    { onConflict: 'session_id' },
  );
  if (error) throw new Error(`ky_legiscan_datasets upsert: ${error.message}`);
}

/** Dataset zip → bill payloads (same JSON shape as getBill's `bill`). */
function billsFromDatasetZip(b64: string): any[] {
  const zip = new AdmZip(Buffer.from(b64, 'base64'));
  const bills: any[] = [];
  for (const entry of zip.getEntries()) {
    if (entry.isDirectory || !entry.entryName.endsWith('.json')) continue;
    let parsed: any;
    try {
      parsed = JSON.parse(entry.getData().toString('utf8'));
    } catch {
      continue;
    }
    if (parsed?.bill) bills.push(parsed.bill);
  }
  return bills;
}

async function main() {
  const db = supabaseAdmin;
  if (!db) {
    throw new Error('supabaseAdmin not configured (SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL)');
  }
  if (!process.env.LEGISCAN_API_KEY) {
    throw new Error('LEGISCAN_API_KEY not set — cannot fetch datasets.');
  }

  const missing = await fetchAllMissingBills();
  console.log(`${missing.length} bill(s) missing legiscan_history (with legiscan_id + legiscan_session_id).`);
  if (missing.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const bySession = new Map<number, MissingBill[]>();
  for (const b of missing) {
    const list = bySession.get(b.legiscan_session_id) ?? [];
    list.push(b);
    bySession.set(b.legiscan_session_id, list);
  }

  const client = getKyLegiScanClient();
  const datasetList = DRY_RUN ? [] : await client.fetchDatasetList('KY');
  const entryBySession = new Map(datasetList.map((e) => [e.session_id, e]));
  const storedHashes = DRY_RUN ? new Map<number, string>() : await fetchStoredDatasetHashes();

  // Newest session first so the most-viewed bills fill first if we stop early.
  const sessionIds = [...bySession.keys()].sort((a, b) => b - a);

  // Hash-gate BEFORE applying the download limit: a session whose dataset_hash
  // matches what we last imported can't yield new history (the missing bills
  // aren't in that dataset version), so re-downloading it is exactly the wasted
  // activity LegiScan flags. The --limit then caps only real downloads.
  let skippedUnchanged = 0;
  let skippedNotInList = 0;
  const downloadable: number[] = [];
  for (const sessionId of sessionIds) {
    if (DRY_RUN) {
      downloadable.push(sessionId);
      continue;
    }
    const entry = entryBySession.get(sessionId);
    if (!entry) {
      skippedNotInList += 1;
      console.warn(`  session ${sessionId}: not in getDatasetList — skipping ${bySession.get(sessionId)!.length} bill(s)`);
      continue;
    }
    if (storedHashes.get(sessionId) === entry.dataset_hash) {
      skippedUnchanged += 1;
      console.log(
        `  session ${sessionId}: dataset hash unchanged since last import — skipping ${bySession.get(sessionId)!.length} still-missing bill(s) (history not in this dataset version)`,
      );
      continue;
    }
    downloadable.push(sessionId);
  }

  const toProcess = downloadable.slice(0, Number.isFinite(SESSION_LIMIT) ? SESSION_LIMIT : downloadable.length);
  console.log(
    `${sessionIds.length} session(s) have gaps; ${skippedUnchanged} unchanged, ${skippedNotInList} not in list, ` +
      `${downloadable.length} downloadable → processing ${toProcess.length}` +
      `${DRY_RUN ? ' [DRY RUN — no LegiScan calls, no writes]' : ''}.`,
  );

  let updated = 0;
  let notInDataset = 0;
  let noHistoryInDataset = 0;
  let writeErrors = 0;
  let quotaStopped = false;

  for (const sessionId of toProcess) {
    const sessionBills = bySession.get(sessionId)!;
    if (DRY_RUN) {
      console.log(`  session ${sessionId}: would download dataset to fill ${sessionBills.length} bill(s)`);
      continue;
    }
    const entry = entryBySession.get(sessionId);
    if (!entry) {
      console.warn(`  session ${sessionId}: not in getDatasetList — skipping ${sessionBills.length} bill(s)`);
      continue;
    }

    let dataset;
    try {
      dataset = await client.fetchDataset(entry.session_id, entry.access_key);
    } catch (err) {
      if (isLegiscanQuotaHoldError(err)) {
        quotaStopped = true;
        console.warn(`\n⚠️  LegiScan quota hold engaged — stopping.`);
        break;
      }
      console.error(`  session ${sessionId}: fetchDataset failed — ${err instanceof Error ? err.message : err}`);
      continue;
    }
    if (!dataset?.zip) {
      console.error(`  session ${sessionId}: empty dataset payload`);
      continue;
    }

    const datasetBills = billsFromDatasetZip(dataset.zip);
    const byLegiscanId = new Map<number, any>(datasetBills.map((b) => [Number(b?.bill_id), b]));

    // Per-row UPDATEs, not upsert: a partial-column upsert trips NOT NULL checks on
    // the proposed insert row even when the conflict path would win.
    const updates: { id: string; legiscan_history: unknown[]; legiscan_texts: unknown[] | null }[] = [];
    for (const bill of sessionBills) {
      const payload = byLegiscanId.get(Number(bill.legiscan_id));
      if (!payload) {
        notInDataset += 1;
        continue;
      }
      const history = Array.isArray(payload.history) ? payload.history : [];
      const texts = Array.isArray(payload.texts) ? payload.texts : [];
      if (!history.length) {
        noHistoryInDataset += 1;
        continue;
      }
      updates.push({
        id: bill.id,
        legiscan_history: history,
        legiscan_texts: texts.length ? texts : null,
      });
    }

    const CONCURRENCY = 10;
    let sessionUpdated = 0;
    let sessionWriteErrors = 0;
    for (let i = 0; i < updates.length; i += CONCURRENCY) {
      const chunk = updates.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(({ id, ...cols }) => db.from('ky_bills').update(cols).eq('id', id)),
      );
      for (let j = 0; j < results.length; j++) {
        if (results[j].error) {
          sessionWriteErrors += 1;
          console.error(`  session ${sessionId} bill ${chunk[j].id}: ${results[j].error!.message}`);
        } else {
          sessionUpdated += 1;
        }
      }
    }
    writeErrors += sessionWriteErrors;
    updated += sessionUpdated;

    // Record the hash only after a clean import so we don't skip a session whose
    // writes partially failed — an errored run should retry next time. A session
    // that filled 0 bills but had no errors is still fully imported, so record it
    // (that's the closed-session-with-permanent-gaps case we must stop re-pulling).
    if (sessionWriteErrors === 0) {
      await recordDatasetImport(entry);
    }
    console.log(
      `  session ${sessionId} (${entry.session_name}): dataset has ${datasetBills.length} bills → updated ${sessionUpdated}/${sessionBills.length} missing` +
        `${sessionWriteErrors ? ` (${sessionWriteErrors} write errors — hash not recorded, will retry)` : ''}`,
    );
  }

  console.log(
    `\nupdated=${updated} notInDataset=${notInDataset} noHistoryInDataset=${noHistoryInDataset} ` +
      `skippedUnchanged=${skippedUnchanged} skippedNotInList=${skippedNotInList} writeErrors=${writeErrors} ` +
      `${quotaStopped ? '[STOPPED ON QUOTA HOLD] ' : ''}${DRY_RUN ? '[DRY RUN - no writes]' : '[APPLIED]'}`,
  );
  if (quotaStopped) {
    console.log('Re-run after quota frees up to continue (it only targets bills still missing history).');
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
