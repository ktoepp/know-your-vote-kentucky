/**
 * One-time data correction: bills stored as `Introduced` whose `last_action` ends with a KY
 * chamber suffix "(H)" or "(S)" are actually committee referrals that the old mapper didn't
 * recognise (it required "committee" or "referred to" in the text). The mapper fix (2026-06-07)
 * added a `/\([hs]\)\s*$/` pattern, but existing rows were already written with the old mapper.
 * This script updates those rows to `In Committee`.
 */
import './load-env';
import { createClient } from '@supabase/supabase-js';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Missing SUPABASE env vars'); process.exit(1); }
  const db = createClient(url, key);

  // Fetch Introduced bills whose last_action ends with (H) or (S) — KY committee referral format.
  // Paginate to handle tables that exceed the default Supabase row limit per request.
  async function fetchAll(suffix: 'h' | 's') {
    const rows: Array<{ id: string; bill_number: string; session: string; last_action: string }> = [];
    const PAGE = 1000;
    let from = 0;
    for (;;) {
      const { data, error } = await db
        .from('ky_bills')
        .select('id, bill_number, session, last_action')
        .eq('status', 'Introduced')
        .ilike('last_action', `%(${suffix})`)
        .range(from, from + PAGE - 1);
      if (error) { console.error(`Query (${suffix.toUpperCase()}) failed:`, error.message); process.exit(1); }
      rows.push(...(data ?? []));
      if (!data || data.length < PAGE) break;
      from += PAGE;
    }
    return rows;
  }

  const [hBills, sBills] = await Promise.all([fetchAll('h'), fetchAll('s')]);
  console.log(`Raw fetch: ${hBills.length} (H) + ${sBills.length} (S) bills`);

  const all = [...(hBills ?? []), ...(sBills ?? [])];
  const seenIds = new Set<string>();
  const toFix = all.filter(r => {
    if (seenIds.has(r.id as string)) return false;
    seenIds.add(r.id as string);
    return true;
  });

  console.log(`Found ${toFix.length} Introduced bills with KY committee-referral last_action`);
  console.log('Sample (first 10):');
  toFix.slice(0, 10).forEach(r =>
    console.log(`  ${r.bill_number} (${r.session}) — ${r.last_action}`),
  );

  if (toFix.length === 0) { console.log('Nothing to update.'); return; }

  // Batch updates to avoid PostgREST URL-length limits on large .in() arrays.
  const BATCH = 200;
  const ids = (toFix as Array<{ id: string }>).map(r => r.id);
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
