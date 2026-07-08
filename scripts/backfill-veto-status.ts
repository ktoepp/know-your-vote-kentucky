#!/usr/bin/env npx tsx
/**
 * One-shot correction for bills that were vetoed (and never overridden) but are stored as an
 * enacted status ("Chaptered"/"Signed"). Root cause + forward fix: see
 * src/lib/map-legiscan-bill-status.ts § "Delivered to Secretary of State" is ambiguous.
 *
 * Kentucky files a bill with the Secretary of State after a signing, a veto override, AND a
 * plain veto — so rows synced before the mapper fix have "delivered to Secretary of State" as
 * their last_action and were mislabeled "Chaptered". This re-runs the (fixed) mapper against
 * each candidate row using its already-stored `legiscan_history`, so it needs NO LegiScan
 * quota by default. Rows whose history is NULL are reported (and, with --fetch, pulled via
 * getBill — 1 quota point each).
 *
 * Safety: only rows whose recomputed status is "Vetoed" or "Veto Override" are changed. The
 * script never downgrades a bill to an earlier stage — it only corrects an enacted-looking
 * status to the veto outcome the history proves.
 *
 *   npx tsx scripts/backfill-veto-status.ts --dry-run            # preview, no writes
 *   npx tsx scripts/backfill-veto-status.ts                      # apply to active session
 *   npx tsx scripts/backfill-veto-status.ts --all-sessions       # every session
 *   npx tsx scripts/backfill-veto-status.ts --fetch --dry-run    # also pull history for NULL rows
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL (and LEGISCAN_API_KEY only for --fetch).
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { getKyLegiScanClient } from '../src/lib/ky-legiscan-client';
import { isLegiscanQuotaHoldError } from '../src/lib/legiscan-quota';
import { getCivicDataSessionName } from '../src/lib/ky-sessions';
import { mapLegiScanBillStatus } from '../src/lib/map-legiscan-bill-status';

const DRY_RUN = process.argv.includes('--dry-run');
const ALL_SESSIONS = process.argv.includes('--all-sessions');
const FETCH_MISSING = process.argv.includes('--fetch');
const sessionArg = process.argv.find((a) => a.startsWith('--session='));
const SESSION = sessionArg ? sessionArg.split('=')[1] ?? '' : null;

// Statuses that imply the bill became law — the only ones a hidden veto can be masquerading as.
const ENACTED_LOOKING = ['Chaptered', 'Signed'];
// The only recomputed outcomes we will write. Guards against passing an unknown numeric status
// code (not stored on ky_bills) accidentally downgrading a row to "Introduced".
const CORRECTABLE_TO = new Set(['Vetoed', 'Veto Override']);

type HistoryEntry = { action?: string | null };

async function main() {
  const db = supabaseAdmin;
  if (!db) {
    throw new Error('supabaseAdmin not configured (SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL)');
  }

  const sessionName = ALL_SESSIONS ? null : SESSION ?? getCivicDataSessionName();
  const scope = sessionName ? `session="${sessionName}"` : 'all sessions';

  let q = db
    .from('ky_bills')
    .select('id, bill_number, legiscan_id, status, last_action, legiscan_history')
    .in('status', ENACTED_LOOKING)
    .order('last_action_date', { ascending: false, nullsFirst: false });
  if (sessionName) q = q.eq('session', sessionName);

  const { data, error } = await q;
  if (error) throw new Error(error.message);
  const bills = data ?? [];
  console.log(`Scope: ${scope} — ${bills.length} enacted-looking bill(s) to re-check.\n`);

  const client = FETCH_MISSING ? getKyLegiScanClient() : null;
  let corrected = 0;
  let missingHistory = 0;
  let fetched = 0;
  let writeErrors = 0;
  let quotaStopped = false;
  const changes: Array<{ bill: string; from: string; to: string }> = [];

  for (const bill of bills) {
    let history = (Array.isArray(bill.legiscan_history) ? bill.legiscan_history : null) as
      | HistoryEntry[]
      | null;

    if (!history?.length) {
      if (FETCH_MISSING && client && bill.legiscan_id != null) {
        try {
          const detail = await client.fetchBillDetail(Number(bill.legiscan_id));
          fetched += 1;
          history = Array.isArray(detail?.history) ? (detail!.history as HistoryEntry[]) : null;
        } catch (err) {
          if (isLegiscanQuotaHoldError(err)) {
            quotaStopped = true;
            console.warn(`\n⚠️  LegiScan quota hold engaged — stopping after ${fetched} fetched.`);
            break;
          }
          console.error(`  ${bill.bill_number}: fetch failed — ${err instanceof Error ? err.message : err}`);
          continue;
        }
      }
      if (!history?.length) {
        missingHistory += 1;
        continue;
      }
    }

    // statusCode is not stored on ky_bills; the veto/override milestones live in `history`, which
    // the mapper reads directly. The CORRECTABLE_TO gate below makes the code value irrelevant.
    const recomputed = mapLegiScanBillStatus(0, bill.last_action || '', history);
    if (recomputed === bill.status || !CORRECTABLE_TO.has(recomputed)) continue;

    changes.push({ bill: bill.bill_number, from: bill.status, to: recomputed });
    if (!DRY_RUN) {
      const { error: uErr } = await db.from('ky_bills').update({ status: recomputed }).eq('id', bill.id);
      if (uErr) {
        writeErrors += 1;
        console.error(`  update ${bill.bill_number}: ${uErr.message}`);
        continue;
      }
    }
    corrected += 1;
  }

  if (changes.length) {
    console.log('Corrections:');
    for (const c of changes) console.log(`  ${c.bill.padEnd(10)} ${c.from} → ${c.to}`);
    console.log('');
  }
  console.log(
    `corrected=${corrected} missingHistory=${missingHistory} fetched=${fetched} writeErrors=${writeErrors} ` +
      `${quotaStopped ? '[STOPPED ON QUOTA HOLD] ' : ''}${DRY_RUN ? '[DRY RUN - no writes]' : '[APPLIED]'}`,
  );
  if (missingHistory > 0 && !FETCH_MISSING) {
    console.log(`\n${missingHistory} row(s) had no stored legiscan_history — re-run with --fetch to resolve them.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
