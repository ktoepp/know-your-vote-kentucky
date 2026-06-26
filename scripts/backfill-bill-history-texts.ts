#!/usr/bin/env npx tsx
/**
 * Backfill ky_bills.legiscan_history + legiscan_texts for bills that don't have them
 * yet (rows synced before migration 036). The bill-detail page renders these from the
 * DB now (no live LegiScan on the read path), but existing rows are NULL until their
 * next detail sync — and during interim the sync only re-fetches CHANGED bills, so it
 * won't fill them on its own. This pulls getBill once per missing bill and persists the
 * history + text arrays (mirrors how syncKyBills stores them).
 *
 *   npx tsx scripts/backfill-bill-history-texts.ts --dry-run --limit=10  # fetch + report, no writes
 *   npx tsx scripts/backfill-bill-history-texts.ts --limit=200           # cap getBill calls (quota)
 *   npx tsx scripts/backfill-bill-history-texts.ts                       # whole active session
 *   npx tsx scripts/backfill-bill-history-texts.ts --all-sessions
 *
 * Cost: 1 getBill (= 1 LegiScan quota point) per bill — no getRollCall. --limit caps it.
 * Quota-aware: if the client-level quota hold engages mid-run, it stops cleanly and
 * reports how far it got, so it's safe to run unattended after the monthly reset.
 *
 * Requires LEGISCAN_API_KEY, SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { getKyLegiScanClient } from '../src/lib/ky-legiscan-client';
import { isLegiscanQuotaHoldError } from '../src/lib/legiscan-quota';
import { getCivicDataSessionName } from '../src/lib/ky-sessions';

const DRY_RUN = process.argv.includes('--dry-run');
const ALL_SESSIONS = process.argv.includes('--all-sessions');
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] ?? '', 10) : Infinity;
const sessionArg = process.argv.find((a) => a.startsWith('--session='));
const SESSION = sessionArg ? sessionArg.split('=')[1] ?? '' : null;

async function main() {
  const db = supabaseAdmin;
  if (!db) {
    throw new Error('supabaseAdmin not configured (SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL)');
  }
  if (!process.env.LEGISCAN_API_KEY) {
    throw new Error('LEGISCAN_API_KEY not set — cannot fetch bill detail.');
  }

  const sessionName = ALL_SESSIONS ? null : SESSION ?? getCivicDataSessionName();
  const scope = sessionName ? `session="${sessionName}"` : 'all sessions';

  // Bills missing history, with a LegiScan id to fetch.
  let q = db
    .from('ky_bills')
    .select('id, bill_number, legiscan_id')
    .is('legiscan_history', null)
    .not('legiscan_id', 'is', null)
    .order('last_action_date', { ascending: false, nullsFirst: false });
  if (sessionName) q = q.eq('session', sessionName);
  if (Number.isFinite(LIMIT)) q = q.limit(LIMIT);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const bills = data ?? [];
  console.log(`Scope: ${scope} — ${bills.length} bill(s) missing legiscan_history to ${DRY_RUN ? 'preview' : 'backfill'}.`);
  if (bills.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const client = getKyLegiScanClient();
  let fetched = 0;
  let withHistory = 0;
  let withTexts = 0;
  let writeErrors = 0;
  let quotaStopped = false;

  for (const bill of bills) {
    let detail;
    try {
      detail = await client.fetchBillDetail(Number(bill.legiscan_id));
    } catch (err) {
      if (isLegiscanQuotaHoldError(err)) {
        quotaStopped = true;
        console.warn(`\n⚠️  LegiScan quota hold engaged — stopping after ${fetched} fetched.`);
        break;
      }
      console.error(`  ${bill.bill_number}: fetch failed — ${err instanceof Error ? err.message : err}`);
      continue;
    }
    fetched += 1;
    if (!detail) continue;

    const update: Record<string, unknown> = {};
    if (detail.history?.length) {
      update.legiscan_history = detail.history;
      withHistory += 1;
    }
    if (detail.texts?.length) {
      update.legiscan_texts = detail.texts;
      withTexts += 1;
    }
    if (Object.keys(update).length === 0) continue;

    if (!DRY_RUN) {
      const { error: uErr } = await db.from('ky_bills').update(update).eq('id', bill.id);
      if (uErr) {
        writeErrors += 1;
        console.error(`  update ${bill.bill_number}: ${uErr.message}`);
      }
    }
  }

  console.log(
    `\nfetched=${fetched} withHistory=${withHistory} withTexts=${withTexts} writeErrors=${writeErrors} ` +
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
