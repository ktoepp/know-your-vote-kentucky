import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import {
  LEGISCAN_QUERY_COUNTER_KEY,
  legiscanPublicMonthlyLimit,
  summarizeLegiscanMonthUsage,
} from '../src/lib/legiscan-quota';
import { DATA_BUDGET } from '../src/lib/data-budget';

/**
 * Usage: npm run check:legiscan-quota -- [YYYY-MM] [--planned=N]
 *   YYYY-MM      month to read (the first argument not starting with `--`); default: current month
 *   --planned=N  your estimated run cost; prints the remaining quota after the run and
 *                compares it with both the cap and the planning target (docs/data-budget.md)
 * Reads ky_sync_state only. Makes no LegiScan call.
 */
function parseArgs(argv: string[]): { month: string; planned: number | null } {
  const month = argv.find((a) => !a.startsWith('--')) ?? new Date().toISOString().slice(0, 7);
  const plannedArg = argv.find((a) => a.startsWith('--planned='));
  if (plannedArg === undefined) return { month, planned: null };
  const planned = Number(plannedArg.slice('--planned='.length));
  if (!Number.isInteger(planned) || planned < 0) {
    console.error(`Invalid ${plannedArg}: expected a whole number of queries, e.g. --planned=500`);
    process.exit(1);
  }
  return { month, planned };
}

function pct(n: number, of: number): string {
  return of > 0 ? `${(Math.round((n / of) * 1000) / 10).toFixed(1)}%` : '—';
}

async function main() {
  const { month, planned } = parseArgs(process.argv.slice(2));
  const { data } = await supabaseAdmin!
    .from('ky_sync_state')
    .select('payload')
    .eq('key', LEGISCAN_QUERY_COUNTER_KEY)
    .maybeSingle();

  const usage = summarizeLegiscanMonthUsage(data?.payload as Record<string, unknown> | null, month);
  const limit = legiscanPublicMonthlyLimit();

  console.log(`Month:     ${usage.month}`);
  console.log(`Used:      ${usage.total.toLocaleString()} / ${limit.toLocaleString()} (${pct(usage.total, limit)})`);

  if (planned !== null) {
    const target = DATA_BUDGET.legiscan.planningTargetPerMonth;
    const after = usage.total + planned;
    console.log(`Planned:   ${planned.toLocaleString()} queries`);
    console.log(`After run: ${(limit - after).toLocaleString()} remaining of the cap (${pct(after, limit)} used)`);
    console.log(`Target:    ${after.toLocaleString()} / ${target.toLocaleString()} planning target (${pct(after, target)})`);
    if (after > limit) {
      console.log('❌ Insufficient quota: the run would pass the monthly cap');
    } else if (after > target) {
      console.log('⚠️  Within the cap but over the planning target (see docs/data-budget.md)');
    } else {
      console.log('✅ Safe to proceed: within the cap and the planning target');
    }
  }

  // Breakdown exists only for months recorded after migration 054 (2026-08-24).
  if (usage.byOp.length === 0) {
    console.log('');
    console.log('Breakdown: none recorded for this month (pre-instrumentation).');
    return;
  }

  console.log('');
  console.log('By operation:');
  for (const op of usage.byOp) {
    console.log(`  ${op.op.padEnd(20)} ${String(op.count).padStart(7)}  ${pct(op.count, usage.total).padStart(6)}`);
    for (const c of op.byCaller) {
      console.log(`    └ ${c.caller.padEnd(24)} ${String(c.count).padStart(5)}`);
    }
  }
  if (usage.unattributed > 0) {
    console.log(`  ${'(unattributed)'.padEnd(20)} ${String(usage.unattributed).padStart(7)}  ${pct(usage.unattributed, usage.total).padStart(6)}`);
    console.log('    calls counted in the month total with no per-operation bucket —');
    console.log('    expected for the part of a month that predates instrumentation.');
  }
}

main();
