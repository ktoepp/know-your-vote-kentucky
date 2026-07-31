#!/usr/bin/env npx tsx
/**
 * Sync LRC enrollment/executive actions → ky_bill_status_history.
 *
 *   npm run sync:ky:lrc-enrollment-actions
 *   npm run sync:ky:lrc-enrollment-actions -- --dry-run
 *   npm run sync:ky:lrc-enrollment-actions -- --session="2026 Regular Session"
 *
 * Spike against the committed fixture (no DB):
 *   npm run spike:lrc:enrollment-actions
 */
import './load-env';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  parseEnrollmentActionsHtml,
} from '../src/lib/lrc-enrollment-actions-parser';
import { syncKyLrcEnrollmentActions } from '../src/lib/ky-lrc-enrollment-actions-sync';

const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_FIXTURE = resolve(REPO_ROOT, 'fixtures/lrc/legislative-record-enrollment-actions-26rs-live.html');

function argValue(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`${prefix}=`));
  return a?.slice(prefix.length + 1);
}

const isSpike = process.argv.includes('--spike') || /spike-lrc-enrollment-actions/.test(__filename);

async function runSpike() {
  const fixture = argValue('--fixture') ?? DEFAULT_FIXTURE;
  const html = readFileSync(fixture, 'utf8');
  const slug = argValue('--slug') ?? '26rs';
  const parsed = parseEnrollmentActionsHtml(html, slug);

  console.log(`[spike] fixture=${fixture}`);
  console.log(
    `[spike] ${parsed.stats.dateCount} dates, ${parsed.stats.actionGroupCount} action groups, ` +
      `${parsed.stats.billRefCount} bill refs`,
  );

  const sample = parsed.entries.slice(0, 8);
  for (const entry of sample) {
    console.log(
      `  ${entry.actionDate} · ${entry.actionLabel} · ${entry.bills.map((b) => b.billNumber).join(', ')}`,
    );
  }
  if (parsed.entries.length > sample.length) {
    console.log(`  …and ${parsed.entries.length - sample.length} more action groups`);
  }
}

async function runSync() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE env vars');
    process.exit(1);
  }

  const dryRun = process.argv.includes('--dry-run');
  const sessionArg = argValue('--session');
  const sessions = sessionArg ? [sessionArg] : undefined;

  const db = createClient(url, key);
  const stats = await syncKyLrcEnrollmentActions(db, { dryRun, sessions });

  console.log(
    `\nDone: sessions=${stats.sessionsProcessed} absent=${stats.sessionsAbsent} ` +
      `entries=${stats.entriesParsed} ` +
      `billRefs=${stats.billRefsParsed} inserted=${stats.historyInserted} ` +
      `skipped=${stats.historySkipped} unresolved=${stats.unresolvedBills} errors=${stats.errors}` +
      (dryRun ? ' [DRY RUN]' : ''),
  );
}

async function main() {
  if (isSpike) {
    await runSpike();
    return;
  }
  await runSync();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
