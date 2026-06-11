/**
 * One-time data correction: bills stored as 'Engrossed', 'Enrolled', or 'Passed' whose
 * `last_action` contains "recommit" are actually back in committee. Before the 2026-06-09
 * mapper fix, the CHAMBER_PASSED_CODES guard incorrectly blocked these from mapping to
 * 'In Committee'. This script corrects those rows by re-applying the fixed mapper.
 *
 * Idempotent: re-running after the rows are corrected is safe (no rows match the query).
 * Expected: mapLegiScanBillStatus(2, 'recommitted to House Appropriations & Revenue (H)') → 'In Committee'
 */
import './load-env';
import { createClient } from '@supabase/supabase-js';
import { mapLegiScanBillStatus, LEGISCAN_STATUS_MAP } from '../src/lib/map-legiscan-bill-status';

/** Reverse lookup: stored status label → LegiScan numeric code (when unambiguous). */
function statusCodeFromLabel(status: string): number | null {
  for (const [code, label] of Object.entries(LEGISCAN_STATUS_MAP)) {
    if (label === status) return Number(code);
  }
  return null;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Missing SUPABASE env vars'); process.exit(1); }
  const db = createClient(url, key);

  // Fetch bills in a passed-milestone status whose last_action contains "recommit".
  async function fetchCandidates(status: string) {
    const rows: Array<{ id: string; bill_number: string; session: string; status: string; last_action: string }> = [];
    const PAGE = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await db
        .from('ky_bills')
        .select('id, bill_number, session, status, last_action')
        .eq('status', status)
        .ilike('last_action', '%recommit%')
        .range(from, from + PAGE - 1);
      if (error) { console.error(`Query (${status}) failed:`, error.message); process.exit(1); }
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    return rows;
  }

  const [engrossed, enrolled, passed] = await Promise.all([
    fetchCandidates('Engrossed'),
    fetchCandidates('Enrolled'),
    fetchCandidates('Passed'),
  ]);
  const all = [...engrossed, ...enrolled, ...passed];
  console.log(`Found ${all.length} candidate bills (${engrossed.length} Engrossed, ${enrolled.length} Enrolled, ${passed.length} Passed)`);

  // Confirm that the fixed mapper maps each to 'In Committee'.
  const toFix = all.filter((r) => {
    const code = statusCodeFromLabel(r.status);
    if (code == null) return false;
    return mapLegiScanBillStatus(code, r.last_action) === 'In Committee';
  });
  const skipped = all.length - toFix.length;
  if (skipped > 0) console.log(`Skipped ${skipped} rows (mapper did not return 'In Committee')`);

  console.log(`Will update ${toFix.length} bills → status = In Committee`);
  if (toFix.length > 0) {
    console.log('Sample (first 10):');
    toFix.slice(0, 10).forEach(r =>
      console.log(`  ${r.bill_number} (${r.session}) — ${r.last_action}`),
    );
  }

  if (toFix.length === 0) { console.log('Nothing to update.'); return; }

  const BATCH = 200;
  const ids = toFix.map(r => r.id);
  let totalUpdated = 0;
  for (let i = 0; i < ids.length; i += BATCH) {
    const chunk = ids.slice(i, i + BATCH);
    const { error: updErr } = await db
      .from('ky_bills')
      .update({ status: 'In Committee' })
      .in('id', chunk);
    if (updErr) { console.error(`Batch ${Math.floor(i / BATCH) + 1} failed:`, updErr.message); process.exit(1); }
    totalUpdated += chunk.length;
    console.log(`  Batch ${Math.floor(i / BATCH) + 1}: updated ${chunk.length} (total ${totalUpdated})`);
  }
  console.log(`Done — updated ${totalUpdated} bills → status = In Committee`);
}

main();
