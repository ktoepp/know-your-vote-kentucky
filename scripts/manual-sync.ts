#!/usr/bin/env npx tsx
/**
 * Manual Sync CLI — Know Your Vote Kentucky
 *
 * Usage:
 *   npx tsx scripts/manual-sync.ts              # sync GA default sources (bills, legislators, votes)
 *   npx tsx scripts/manual-sync.ts bills        # sync specific source
 *   npx tsx scripts/manual-sync.ts --dry-run    # dry run (no DB writes)
 *   npx tsx scripts/manual-sync.ts bills --dry-run
 *
 * Or via npm script:
 *   npm run sync:ky
 *   npm run sync:ky:legislators
 *   npm run sync:ky -- --dry-run
 *   npm run sync:ky -- --source=bills
 *
 * Bills / LegiScan historic backfill:
 *   npm run sync:ky:sessions              # print KY session ids (for --legiscan-session-id)
 *   npm run sync:ky -- bills --historic-sessions=3
 *   npm run sync:ky -- bills --historic-sessions=2 --limit=400
 *   npm run sync:ky -- bills --legiscan-session-id=1234
 *
 * Quota-friendly backfill (full master list + sponsor cap + cursor; see 005_ky_sync_state migration):
 *   npm run sync:ky -- bills --quota-backfill
 *   npm run sync:ky -- bills --quota-backfill --quota-backfill-sessions-per-run=1 --sponsor-budget=20
 *   npm run sync:ky -- bills --quota-backfill --dry-run
 *
 * Slack (optional): set SLACK_WEBHOOK_STATUS_REPORTS (+ SLACK_WEBHOOK_ERRORS) and SLACK_SYNC_NOTIFY_CLI=true
 * for CLI/GitHub Actions digests (includes LegiScan quota + ky_sources snapshot).
 */

import './load-env';
import { notifySyncExceptionSlack, notifySyncSlack } from '../src/lib/slack-webhook';
import {
  syncAll,
  SYNC_SOURCES,
  SYNC_SOURCES_DEFAULT,
  SYNC_SOURCES_PAUSED_FROM_CRON,
  type SyncResult,
} from '../src/lib/ky-sync-pipeline';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sourceFlag = args.find(a => a.startsWith('--source='));
const sourceArg = sourceFlag ? sourceFlag.split('=')[1] : args.find(a => !a.startsWith('--') && !a.includes('='));

function intFlag(longOpt: string): number | undefined {
  const a = args.find((x) => x.startsWith(`${longOpt}=`));
  if (!a) return undefined;
  const n = parseInt(a.split('=')[1], 10);
  return Number.isNaN(n) ? undefined : n;
}

const historicSessions = intFlag('--historic-sessions');
const legiscanSessionId = intFlag('--legiscan-session-id');
const limit = intFlag('--limit');
const skipBillSponsorDetails =
  args.includes('--skipBillSponsorDetails') || args.includes('--skip-bill-sponsor-details');
const quotaBackfill = args.includes('--quota-backfill');
const quotaBackfillSessionsPerRun = intFlag('--quota-backfill-sessions-per-run');
const sponsorDetailBudgetPerSession = intFlag('--sponsor-budget');
const quotaBackfillAdvanceCursor = !args.includes('--no-advance-cursor');
const useChangeHash =
  args.includes('--useChangeHash=true') ||
  args.includes('--use-change-hash=true') ||
  args.includes('--useChangeHash') ||
  args.includes('--use-change-hash');

function printHeader() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Know Your Vote Kentucky — Data Sync CLI    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  if (dryRun) console.log('🔍 DRY RUN MODE — No data will be written to the database\n');
  if (sourceArg) console.log(`📌 Syncing source: ${sourceArg}\n`);
  else {
    console.log(`📌 Syncing GA default: ${SYNC_SOURCES_DEFAULT.join(', ')}\n`);
    console.log(
      `   (Paused from autopilot: ${SYNC_SOURCES_PAUSED_FROM_CRON.join(', ')} — pass source name to run manually)\n`,
    );
  }
}

function printResults(results: SyncResult[]) {
  console.log('\n═══════════════ Sync Results ═══════════════\n');
  for (const r of results) {
    const icon = r.status === 'success' ? '✅' : r.status === 'skipped' ? '⏭️' : '❌';
    const dur = (r.duration / 1000).toFixed(1);
    console.log(`  ${icon} ${r.source.padEnd(20)} ${String(r.itemsSynced).padStart(5)} items  (${dur}s)`);
    if (r.error) console.log(`     └─ Error: ${r.error}`);
  }
  const total = results.reduce((sum, r) => sum + r.itemsSynced, 0);
  const succeeded = results.filter(r => r.status === 'success').length;
  const failed = results.filter(r => r.status === 'error').length;
  console.log(`\n  Total: ${total} items synced, ${succeeded} succeeded, ${failed} failed`);
  console.log('');
}

async function main() {
  printHeader();

  // Validate source if specified
  if (sourceArg && !SYNC_SOURCES[sourceArg]) {
    console.error(`❌ Unknown source: "${sourceArg}"`);
    console.error(`   Available sources: ${Object.keys(SYNC_SOURCES).join(', ')}`);
    process.exit(1);
  }

  const sourcesToRun = sourceArg ? [sourceArg] : [...SYNC_SOURCES_DEFAULT];
  const needsOpenStatesKey = sourcesToRun.includes('legislators');
  const openStatesKey = (process.env.OPENSTATES_API_KEY || '').trim();
  if (needsOpenStatesKey && !openStatesKey) {
    console.error('');
    console.error('❌ OPENSTATES_API_KEY is missing or empty.');
    console.error('   The sync CLI loads `.env.local` first (see scripts/load-env.ts).');
    console.error('   Add OPENSTATES_API_KEY there or export it in your shell.');
    console.error('   Get a key: https://openstates.org/account/profile/');
    console.error('');
    process.exit(1);
  }

  // Align with src/app/lib/supabaseClient.ts (URL from NEXT_PUBLIC_* or SUPABASE_URL)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  if (!dryRun) {
    if (!supabaseUrl) {
      console.warn(
        '[manual-sync] No Supabase URL: set NEXT_PUBLIC_SUPABASE_URL or SUPABASE_URL. DB sync will fail.',
      );
    }
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.warn('[manual-sync] SUPABASE_SERVICE_ROLE_KEY not set. DB sync will fail.');
    }
  }

  try {
    const results = await syncAll({
      source: sourceArg,
      dryRun,
      limit,
      skipBillSponsorDetails,
      historicSessions,
      legiscanSessionId,
      quotaBackfill: quotaBackfill || undefined,
      quotaBackfillSessionsPerRun,
      sponsorDetailBudgetPerSession,
      quotaBackfillAdvanceCursor,
      useChangeHash: useChangeHash || undefined,
    });
    printResults(results);
    await notifySyncSlack({
      results,
      source: sourceArg,
      dryRun,
      isVercelCron: false,
      fromCli: true,
    }).catch((e) => console.error('[Slack] sync notify failed:', e));
    const failed = results.filter(r => r.status === 'error');
    process.exit(failed.length > 0 ? 1 : 0);
  } catch (err: any) {
    console.error(`\n❌ Fatal error: ${err.message}`);
    await notifySyncExceptionSlack({
      error: err,
      source: sourceArg,
      dryRun,
      isVercelCron: false,
      fromCli: true,
    }).catch((e) => console.error('[Slack] sync exception notify failed:', e));
    process.exit(1);
  }
}

main();

