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

  // Newest session first so the most-viewed bills fill first if we stop early.
  const sessionIds = [...bySession.keys()].sort((a, b) => b - a);
  const toProcess = sessionIds.slice(0, Number.isFinite(SESSION_LIMIT) ? SESSION_LIMIT : sessionIds.length);
  console.log(
    `${sessionIds.length} session(s) have gaps; processing ${toProcess.length}` +
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
    for (let i = 0; i < updates.length; i += CONCURRENCY) {
      const chunk = updates.slice(i, i + CONCURRENCY);
      const results = await Promise.all(
        chunk.map(({ id, ...cols }) => db.from('ky_bills').update(cols).eq('id', id)),
      );
      for (let j = 0; j < results.length; j++) {
        if (results[j].error) {
          writeErrors += 1;
          console.error(`  session ${sessionId} bill ${chunk[j].id}: ${results[j].error!.message}`);
        } else {
          sessionUpdated += 1;
        }
      }
    }
    updated += sessionUpdated;
    console.log(
      `  session ${sessionId} (${entry.session_name}): dataset has ${datasetBills.length} bills → updated ${sessionUpdated}/${sessionBills.length} missing`,
    );
  }

  console.log(
    `\nupdated=${updated} notInDataset=${notInDataset} noHistoryInDataset=${noHistoryInDataset} writeErrors=${writeErrors} ` +
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
