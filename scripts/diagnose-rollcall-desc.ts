#!/usr/bin/env npx tsx
/**
 * Diagnose roll-call `desc` mislabeling: for a given bill, print the
 * getBill stub `desc` (what the UI renders) vs the getRollCall `desc`
 * (fetched during enrichment but currently discarded), plus the bill's
 * action history for date/count cross-reference.
 *
 * Usage: npx tsx scripts/diagnose-rollcall-desc.ts [BILL_NUMBER]   (default SB98)
 */
import './load-env';
import { createClient } from '@supabase/supabase-js';
import { getKyLegiScanClient } from '../src/lib/ky-legiscan-client';

async function main() {
  const billNumber = (process.argv[2] || 'SB98').trim().toUpperCase();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  if (!process.env.LEGISCAN_API_KEY) throw new Error('Missing LEGISCAN_API_KEY');

  const supabase = createClient(url, key);
  const { data: rows, error } = await supabase
    .from('ky_bills')
    .select('id, bill_number, legiscan_id, session, last_action_date')
    .eq('bill_number', billNumber)
    .order('last_action_date', { ascending: false })
    .limit(5);
  if (error) throw error;
  if (!rows?.length) throw new Error(`No ky_bills row for ${billNumber}`);

  const row = rows.find((r) => r.legiscan_id) ?? rows[0];
  console.log(`DB match: ${row.bill_number} | session=${row.session ?? '?'} | legiscan_id=${row.legiscan_id}`);
  if (!row.legiscan_id) throw new Error('Row has no legiscan_id');

  const client = getKyLegiScanClient();
  const bill = await client.fetchBillDetail(Number(row.legiscan_id));
  if (!bill) throw new Error('getBill returned null');

  console.log(`\n=== getBill stub votes[] (UI renders THIS desc) ===`);
  for (const v of bill.votes ?? []) {
    console.log(`  rc=${v.roll_call_id} | ${v.date} | yea ${v.yea} nay ${v.nay} | desc="${v.desc}"`);
  }

  console.log(`\n=== getRollCall desc per roll call (currently discarded) ===`);
  for (const v of bill.votes ?? []) {
    const rc = await client.fetchRollCall(v.roll_call_id);
    if (!rc) { console.log(`  rc=${v.roll_call_id} | fetch failed`); continue; }
    const same = rc.desc === v.desc ? 'SAME as stub' : 'DIFFERS from stub';
    console.log(`  rc=${v.roll_call_id} | ${rc.date} | yea ${rc.yea} nay ${rc.nay} | desc="${rc.desc}"  [${same}]`);
  }

  console.log(`\n=== action history (date | chamber | action) ===`);
  for (const h of bill.history ?? []) {
    console.log(`  ${h.date} | ${(h as any).chamber ?? ''} | ${h.action}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
