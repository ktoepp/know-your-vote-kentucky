import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import {
  LEGISCAN_QUERY_COUNTER_KEY,
  legiscanPublicMonthlyLimit,
  summarizeLegiscanMonthUsage,
} from '../src/lib/legiscan-quota';

/** Cost of the dataset reconcile this script is normally run ahead of. */
const PLANNED_RUN_COST = 26;

function pct(n: number, of: number): string {
  return of > 0 ? `${(Math.round((n / of) * 1000) / 10).toFixed(1)}%` : '—';
}

async function main() {
  const month = process.argv[2] ?? new Date().toISOString().slice(0, 7);
  const { data } = await supabaseAdmin!
    .from('ky_sync_state')
    .select('payload')
    .eq('key', LEGISCAN_QUERY_COUNTER_KEY)
    .maybeSingle();

  const usage = summarizeLegiscanMonthUsage(data?.payload as Record<string, unknown> | null, month);
  const limit = legiscanPublicMonthlyLimit();

  console.log(`Month:     ${usage.month}`);
  console.log(`Used:      ${usage.total.toLocaleString()} / ${limit.toLocaleString()} (${pct(usage.total, limit)})`);
  console.log(`Run cost:  ~${PLANNED_RUN_COST} queries (1 list + 25 datasets)`);
  console.log(`After run: ${(limit - usage.total - PLANNED_RUN_COST).toLocaleString()} remaining`);
  console.log(usage.total + PLANNED_RUN_COST <= limit ? '✅ Safe to proceed' : '❌ Insufficient quota');

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
