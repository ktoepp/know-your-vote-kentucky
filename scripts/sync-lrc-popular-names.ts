#!/usr/bin/env npx tsx
/**
 * Sync LRC "Short Titles and Popular Names" → ky_bills.official_short_titles.
 *
 *   npm run sync:ky:lrc-popular-names
 *   npm run sync:ky:lrc-popular-names -- --dry-run
 *   npm run sync:ky:lrc-popular-names -- --session="2025 Regular Session"
 *
 * Spike against the committed fixture (no DB, no network):
 *   npm run spike:lrc:popular-names
 *
 * See docs/specs/bill-popular-names.md.
 */
import './load-env';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  parsePopularNamesHtml,
  popularNamesByBillNumber,
} from '../src/lib/lrc-popular-names-parser';
import { syncKyLrcPopularNames } from '../src/lib/ky-lrc-popular-names-sync';

const REPO_ROOT = resolve(__dirname, '..');
const DEFAULT_FIXTURE = resolve(REPO_ROOT, 'fixtures/lrc/lrc-popular-names-25rs-live.html');

function argValue(prefix: string): string | undefined {
  const a = process.argv.find((x) => x.startsWith(`${prefix}=`));
  return a?.slice(prefix.length + 1);
}

const isSpike = process.argv.includes('--spike') || /spike-lrc-popular-names/.test(__filename);

async function runSpike() {
  const fixture = argValue('--fixture') ?? DEFAULT_FIXTURE;
  const html = readFileSync(fixture, 'utf8');
  const slug = argValue('--slug') ?? '25rs';
  const parsed = parsePopularNamesHtml(html, slug);
  const byBill = popularNamesByBillNumber(parsed);

  console.log(`[spike] fixture=${fixture}`);
  console.log(
    `[spike] ${parsed.stats.nameCount} names, ${parsed.stats.billRefCount} bill refs, ` +
      `${parsed.stats.uniqueBillCount} unique bills`,
  );

  const sample = parsed.entries.slice(0, 8);
  for (const entry of sample) {
    console.log(`  "${entry.popularName}" → ${entry.bills.map((b) => b.billNumber).join(', ')}`);
  }
  if (parsed.entries.length > sample.length) {
    console.log(`  …and ${parsed.entries.length - sample.length} more names`);
  }

  // Bills carrying more than one short title exercise the inversion/dedup path.
  const multi = [...byBill.entries()].filter(([, titles]) => titles.length > 1);
  if (multi.length) {
    console.log(`[spike] bills with multiple short titles:`);
    for (const [bill, titles] of multi) {
      console.log(`  ${bill}: ${titles.map((t) => `"${t}"`).join(', ')}`);
    }
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
  const stats = await syncKyLrcPopularNames(db, { dryRun, sessions });

  console.log(
    `\nDone: sessions=${stats.sessionsProcessed} names=${stats.namesParsed} ` +
      `billRefs=${stats.billRefsParsed} matched=${stats.billsMatched} ` +
      `updated=${stats.billsUpdated} unchanged=${stats.billsUnchanged} ` +
      `unresolved=${stats.unresolvedBills} errors=${stats.errors}` +
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
