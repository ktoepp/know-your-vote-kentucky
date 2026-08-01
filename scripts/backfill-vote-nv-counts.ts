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
 * Cost: one LegiScan `getRollCall` per affected roll call. Note this
 * deliberately does NOT use `client.fetchVotes(billId)`, which would spend an
 * extra `getBill` per bill to rediscover roll call ids we already have stored —
 * ~50% more quota for nothing.
 *
 * Resumable: targets are selected by `nv_count IS NULL`, so a run that is
 * interrupted or times out can simply be re-run, and already-repaired rows cost
 * nothing. Use --limit to size a run to the time available.
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

const MONTHLY_QUOTA = 30000;

type Target = { billId: string; rollCallId: number; billNumber: string };

async function collectTargets(db: ReturnType<typeof createClient>): Promise<Target[]> {
  const targets: Target[] = [];
  const PAGE = 1000;
  let from = 0;

  for (;;) {
    let q = db
      .from('ky_votes')
      .select('bill_id, roll_call_id, ky_bills!inner(bill_number, session)')
      .is('nv_count', null)
      .not('roll_call_id', 'is', null)
      .order('bill_id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (SESSION) q = q.eq('ky_bills.session', SESSION);

    const { data, error } = await q;
    if (error) throw new Error(`ky_votes read failed: ${error.message}`);
    if (!data?.length) break;

    for (const row of data as any[]) {
      targets.push({
        billId: row.bill_id,
        rollCallId: row.roll_call_id,
        billNumber: row.ky_bills?.bill_number ?? '(unknown)',
      });
    }

    if (data.length < PAGE) break;
    from += PAGE;
  }

  return targets;
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE env vars');
    process.exit(1);
  }

  const db = createClient(url, key);
  const all = await collectTargets(db);
  const targets = LIMIT === Infinity ? all : all.slice(0, LIMIT);
  const bills = new Set(targets.map((t) => t.billId)).size;

  console.log(`Scope: ${SESSION ?? 'all sessions'}`);
  console.log(`Roll calls awaiting nv_count: ${all.length} across ${new Set(all.map((t) => t.billId)).size} bills`);
  if (targets.length !== all.length) {
    console.log(`Limited to ${targets.length} roll calls (${bills} bills) this run.`);
  }
  console.log(
    `Estimated LegiScan calls: ${targets.length} (one getRollCall each) — ` +
      `${((targets.length / MONTHLY_QUOTA) * 100).toFixed(1)}% of the ${MONTHLY_QUOTA / 1000}k monthly quota`,
  );

  if (!LIVE) {
    console.log('\nEstimate only. Re-run with --live to spend quota and write.');
    return;
  }

  const client = getKyLegiScanClient();
  let fetched = 0;
  let updated = 0;
  let missing = 0;

  for (const [i, target] of targets.entries()) {
    let rollCall;
    try {
      rollCall = await client.fetchRollCall(target.rollCallId);
      fetched += 1;
    } catch (err: any) {
      console.error(`${target.billNumber} roll call ${target.rollCallId}: fetch failed — ${err.message}`);
      if (/quota/i.test(err.message ?? '')) {
        console.error('Stopping early on quota error. Re-run later to resume.');
        break;
      }
      continue;
    }

    if (!rollCall || rollCall.nv == null) {
      missing += 1;
      continue;
    }

    const { error } = await db
      .from('ky_votes')
      .update({ nv_count: rollCall.nv })
      .eq('bill_id', target.billId)
      .eq('roll_call_id', target.rollCallId)
      .is('nv_count', null);
    if (error) {
      console.error(`${target.billNumber} roll call ${target.rollCallId}: update failed — ${error.message}`);
      continue;
    }
    updated += 1;

    if ((i + 1) % 250 === 0) {
      console.log(`  … ${i + 1}/${targets.length} processed (${updated} updated)`);
    }
  }

  console.log(`\nfetched=${fetched} updated=${updated} unresolved=${missing} [APPLIED]`);
  if (missing > 0) {
    console.log('Unresolved roll calls are stored locally but LegiScan returned no nv figure for them.');
  }
  if (updated < targets.length) {
    console.log('Run again to resume — remaining rows are still selected by nv_count IS NULL.');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
