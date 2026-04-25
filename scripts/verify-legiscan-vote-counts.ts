#!/usr/bin/env npx tsx
/**
 * Verify LegiScan roll-call totals match per-member vote rows (and optionally compare to getBill vote stubs).
 *
 * Usage:
 *   npx tsx scripts/verify-legiscan-vote-counts.ts <legiscan_bill_id>
 *
 * Exits 0 if every roll call on the bill passes; non-zero if mismatches or errors.
 */
import './load-env';
import { getKyLegiScanClient } from '../src/lib/ky-legiscan-client';
import {
  mismatchesAgainstRollCallSummary,
  tallyRollCallVoteRows,
} from '../src/lib/legiscan-vote-tally';

async function main() {
  const key = process.env.LEGISCAN_API_KEY;
  if (!key) {
    console.error('LEGISCAN_API_KEY is not set (.env.local).');
    process.exit(1);
  }

  const arg = process.argv[2];
  if (!arg || !/^\d+$/.test(arg.trim())) {
    console.error('Usage: npx tsx scripts/verify-legiscan-vote-counts.ts <legiscan_bill_id>');
    process.exit(1);
  }

  const billId = Number(arg.trim());
  const client = getKyLegiScanClient();
  const bill = await client.fetchBillDetail(billId);
  if (!bill) {
    console.error(`No bill returned for LegiScan id ${billId}.`);
    process.exit(1);
  }

  const stubs = bill.votes || [];
  if (!stubs.length) {
    console.log(`Bill ${bill.number ?? billId}: no votes on record.`);
    process.exit(0);
  }

  console.log(`Bill ${bill.number ?? billId} (${stubs.length} roll call(s))\n`);

  let failed = false;
  for (const stub of stubs) {
    const rid = (stub as { roll_call_id?: number }).roll_call_id;
    if (rid == null) {
      console.warn('  Skip: missing roll_call_id on stub', stub);
      failed = true;
      continue;
    }

    const rc = await client.fetchRollCall(rid);
    if (!rc) {
      console.warn(`  Roll call ${rid}: fetch failed`);
      failed = true;
      continue;
    }

    const tally = tallyRollCallVoteRows(rc.votes);
    const issues = mismatchesAgainstRollCallSummary(tally, {
      yea: rc.yea,
      nay: rc.nay,
      nv: rc.nv,
      absent: rc.absent,
    });

    const stubYea = (stub as { yea?: number }).yea;
    const stubNay = (stub as { nay?: number }).nay;
    const stubDiff =
      stubYea !== rc.yea || stubNay !== rc.nay
        ? `getBill stub yea/nay ${stubYea}/${stubNay} vs getRollCall ${rc.yea}/${rc.nay}`
        : null;

    if (issues.length === 0 && !stubDiff) {
      console.log(`  RC ${rid}: OK — yea ${rc.yea}, nay ${rc.nay}, nv ${rc.nv}, absent ${rc.absent} (${rc.votes?.length ?? 0} members)`);
    } else {
      failed = true;
      console.log(`  RC ${rid}: ${rc.desc?.slice(0, 72) ?? ''}`);
      if (stubDiff) console.log(`    ${stubDiff}`);
      for (const line of issues) console.log(`    mismatch: ${line}`);
      const texts = [...new Set((rc.votes || []).map((v) => String(v.vote_text || '').trim()))].slice(
        0,
        12,
      );
      if (texts.length) console.log(`    distinct vote_text samples: ${texts.join(' | ')}`);
    }
  }

  if (failed) {
    console.error('\nVerification finished with mismatches or stub drift.');
    process.exit(1);
  }
  console.log('\nAll roll calls match LegiScan summaries and per-member tallies.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
