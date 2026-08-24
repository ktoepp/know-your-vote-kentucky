/**
 * Daily time-based floor on planner statistics.
 *
 * Autoanalyze is volume-triggered: a table that sits below its churn threshold
 * is never re-analyzed, however old its stats get. `ky_bills` went three weeks
 * between autoanalyzes during the 2026 interim for exactly that reason. This
 * calls `ky_analyze_read_path_tables()` (migration 055) so the read path's
 * tables are analyzed at least once a day regardless of churn.
 *
 * Cheap by design — the largest table is ~22k rows. Run from the source-health
 * workflow; safe to run by hand any time.
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';

type AnalyzedRow = { table_name: string; analyzed_at: string };

async function main() {
  if (!supabaseAdmin) {
    console.error('[analyze] Missing Supabase admin client (SUPABASE_SERVICE_ROLE_KEY).');
    process.exit(1);
  }

  const started = Date.now();
  const { data, error } = await supabaseAdmin.rpc('ky_analyze_read_path_tables');

  if (error) {
    console.error(`[analyze] Failed: ${error.message}`);
    process.exit(1);
  }

  const rows = (data ?? []) as AnalyzedRow[];
  if (rows.length === 0) {
    console.error('[analyze] RPC returned no rows — expected one per table. Treating as a failure.');
    process.exit(1);
  }

  for (const r of rows) console.log(`[analyze] ${r.table_name}`);
  console.log(`[analyze] ${rows.length} tables in ${Date.now() - started}ms`);
}

main().catch((err) => {
  console.error(`[analyze] Fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
