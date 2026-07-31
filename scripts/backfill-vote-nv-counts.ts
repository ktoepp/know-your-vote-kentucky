#!/usr/bin/env npx tsx
/**
 * Backfill `ky_votes.nv_count`, which is NULL on every stored roll call.
 *
 * The votes sync writes `nv_count` correctly today, so this is a one-time
 * repair of rows written before that field was populated. It will NOT heal on
 * its own: the votes cron runs `?source=votes&limit=5`, which re-fetches only
 * the 5 most-recently-actioned bills per day, so bills from closed sessions are
 * never revisited.
 *
 * Cost: one LegiScan `getRollCall`-bearing bill fetch per affected bill. Scope
 * with --session to keep the spend small; the script prints its estimate and
 * exits before spending anything unless --live is passed.
 *
 *   npm run backfill:vote-nv-counts                              # estimate only
 *   npm run backfill:vote-nv-counts -- --session="2026 Regular Session" --live
 *   npm run backfill:vote-nv-counts -- --live                    # all sessions
 */
import './load-env';
import { createClient } from '@supabase/supabase-js';
import { getKyLegiScanClient } from '../src/lib/ky-legiscan-client';

const LIVE = process.argv.includes('--live');
const sessionArg = process.argv.find((a) => a.startsWith('--session='));
const SESSION = sessionArg?.split('=')[1] ?? null;
const limitArg = process.argv.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1] ?? '', 10) : Infinity;

type Target = { billId: string; legiscanId: number; billNumber: string; rollCallIds: number[] };

async function collectTargets(db: ReturnType<typeof createClient>): Promise<Target[]> {
  const byBill = new Map<string, Target>();
  const PAGE = 1000;
  let from = 0;

  for (;;) {
    let q = db
      .from('ky_votes')
      .select('bill_id, roll_call_id, ky_bills!inner(id, legiscan_id, bill_number, session)')
      .is('nv_count', null)
      .not('ky_bills.legiscan_id', 'is', null)
      .range(from, from + PAGE - 1);
    if (SESSION) q = q.eq('ky_bills.session', SESSION);

    const { data, error } = await q;
    if (error) throw new Error(`ky_votes read failed: ${error.message}`);
    if (!data?.length) break;

    for (const row of data as any[]) {
      const bill = row.ky_bills;
      if (!bill?.legiscan_id || row.roll_call_id == null) continue;
      const existing = byBill.get(row.bill_id);
      if (existing) {
        existing.rollCallIds.push(row.roll_call_id);
      } else {
        byBill.set(row.bill_id, {
          billId: row.bill_id,
          legiscanId: bill.legiscan_id,
          billNumber: bill.bill_number,
          rollCallIds: [row.roll_call_id],
        });
      }
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  return [...byBill.values()];
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE env vars');
    process.exit(1);
  }

  const db = createClient(url, key);
  const targets = (await collectTargets(db)).slice(0, LIMIT === Infinity ? undefined : LIMIT);
  const voteRows = targets.reduce((n, t) => n + t.rollCallIds.length, 0);

  console.log(`Scope: ${SESSION ?? 'all sessions'}`);
  console.log(`Bills to fetch: ${targets.length}  (roll calls awaiting nv_count: ${voteRows})`);
  console.log(`Estimated LegiScan calls: ${targets.length} — ${((targets.length / 30000) * 100).toFixed(1)}% of the 30k monthly quota`);

  if (!LIVE) {
    console.log('\nEstimate only. Re-run with --live to spend quota and write.');
    return;
  }

  const client = getKyLegiScanClient();
  let fetched = 0;
  let updated = 0;
  let missing = 0;

  for (const target of targets) {
    let votes;
    try {
      votes = await client.fetchVotes(target.legiscanId);
      fetched += 1;
    } catch (err: any) {
      console.error(`${target.billNumber}: fetch failed — ${err.message}`);
      if (/quota/i.test(err.message ?? '')) {
        console.error('Stopping early on quota error.');
        break;
      }
      continue;
    }

    const nvByRollCall = new Map<number, number>();
    for (const vote of votes) {
      if (vote.roll_call_id == null) continue;
      nvByRollCall.set(vote.roll_call_id, vote.nv ?? 0);
    }

    for (const rollCallId of target.rollCallIds) {
      const nv = nvByRollCall.get(rollCallId);
      if (nv == null) {
        missing += 1;
        continue;
      }
      const { error } = await db
        .from('ky_votes')
        .update({ nv_count: nv })
        .eq('bill_id', target.billId)
        .eq('roll_call_id', rollCallId)
        .is('nv_count', null);
      if (error) {
        console.error(`${target.billNumber} roll call ${rollCallId}: update failed — ${error.message}`);
        continue;
      }
      updated += 1;
    }
  }

  console.log(`\nfetched=${fetched} updated=${updated} unmatched=${missing} [APPLIED]`);
  if (missing > 0) {
    console.log('Unmatched roll calls are stored locally but no longer returned by LegiScan for that bill.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
