#!/usr/bin/env npx tsx
/**
 * Prune accuracy-audit history older than a cutoff.
 *
 * `ky_accuracy_runs` and its child `ky_accuracy_findings` (ON DELETE CASCADE)
 * accumulate one row per weekly run + one row per notable finding. That's small
 * on any human scale, but `fetchRecurrence`'s per-fingerprint scans are already
 * bounded to a lookback window (see history.ts) and there is no reason to keep
 * years of rows the audit no longer reads. The dismissed-findings table is
 * untouched — dismissals are operator-authored and permanent.
 *
 * Usage:
 *   npx tsx scripts/prune-accuracy-history.ts            # dry-run, print counts
 *   npx tsx scripts/prune-accuracy-history.ts --apply    # actually delete
 *   npx tsx scripts/prune-accuracy-history.ts --older-than-days=180 --apply
 *
 * Default cutoff is 365 days, matching `ACCURACY_RECURRENCE_LOOKBACK_DAYS`
 * default — anything the audit's recurrence layer no longer reads is
 * discardable. Override with `--older-than-days=<n>` (n > 0).
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.
 * Exit: 0 on success, 1 on bad args / DB error.
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';

function parseArgs(argv: string[]): { olderThanDays: number; apply: boolean } {
  const flag = (name: string) =>
    argv.find((a) => a.startsWith(`--${name}=`))?.split('=').slice(1).join('=') ?? null;
  const raw = flag('older-than-days');
  const n = raw ? parseInt(raw, 10) : NaN;
  const olderThanDays = Number.isFinite(n) && n > 0 ? n : 365;
  return { olderThanDays, apply: argv.includes('--apply') };
}

async function main(): Promise<void> {
  const db = supabaseAdmin;
  if (!db) {
    console.error('Supabase admin client unavailable. Set SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL.');
    process.exit(1);
  }

  const { olderThanDays, apply } = parseArgs(process.argv.slice(2));
  const cutoffIso = new Date(Date.now() - olderThanDays * 86_400_000).toISOString();

  const { count: runsCount, error: runsErr } = await db
    .from('ky_accuracy_runs')
    .select('id', { count: 'exact', head: true })
    .lt('started_at', cutoffIso);
  if (runsErr) {
    console.error('runs count failed:', runsErr.message);
    process.exit(1);
  }

  const { count: findingsCount, error: findingsErr } = await db
    .from('ky_accuracy_findings')
    .select('id', { count: 'exact', head: true })
    .lt('observed_at', cutoffIso);
  if (findingsErr) {
    console.error('findings count failed:', findingsErr.message);
    process.exit(1);
  }

  console.log(
    `[prune] cutoff ${cutoffIso.slice(0, 10)} (older than ${olderThanDays} days):\n` +
      `  ky_accuracy_runs to delete: ${runsCount ?? 0}\n` +
      `  ky_accuracy_findings older than cutoff: ${findingsCount ?? 0} ` +
      '(cascade delete via run_id will remove the ones tied to old runs)',
  );

  if (!apply) {
    console.log('[prune] dry-run — pass --apply to delete.');
    process.exit(0);
  }

  // ky_accuracy_findings.run_id has ON DELETE CASCADE, so removing runs also
  // removes their findings. That covers the common case (whole old run
  // discarded). Findings orphaned from a run that's already been pruned would
  // never exist because of the FK, so no separate finding-only delete is needed.
  const { error: delErr } = await db
    .from('ky_accuracy_runs')
    .delete()
    .lt('started_at', cutoffIso);
  if (delErr) {
    console.error('delete failed:', delErr.message);
    process.exit(1);
  }

  console.log(`[prune] deleted ${runsCount ?? 0} runs (findings cascaded).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
