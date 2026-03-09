#!/usr/bin/env npx tsx
/**
 * Manual Sync CLI — Know Your Vote Kentucky
 *
 * Usage:
 *   npx tsx scripts/manual-sync.ts              # sync all sources
 *   npx tsx scripts/manual-sync.ts bills        # sync specific source
 *   npx tsx scripts/manual-sync.ts --dry-run    # dry run (no DB writes)
 *   npx tsx scripts/manual-sync.ts bills --dry-run
 *
 * Or via npm script:
 *   npm run sync:ky
 *   npm run sync:ky -- --dry-run
 *   npm run sync:ky -- --source=bills
 */

// Load environment variables
import 'dotenv/config';

import { syncAll, SYNC_SOURCES, type SyncResult } from '../src/lib/ky-sync-pipeline';

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const sourceFlag = args.find(a => a.startsWith('--source='));
const sourceArg = sourceFlag ? sourceFlag.split('=')[1] : args.find(a => !a.startsWith('--'));

function printHeader() {
  console.log('');
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Know Your Vote Kentucky — Data Sync CLI    ║');
  console.log('╚══════════════════════════════════════════════╝');
  console.log('');
  if (dryRun) console.log('🔍 DRY RUN MODE — No data will be written to the database\n');
  if (sourceArg) console.log(`📌 Syncing source: ${sourceArg}\n`);
  else console.log('📌 Syncing all sources\n');
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

  // Check required env vars
  if (!process.env.SUPABASE_URL && !dryRun) {
    console.warn('⚠️  SUPABASE_URL not set. Sync will fail for DB operations.');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !dryRun) {
    console.warn('⚠️  SUPABASE_SERVICE_ROLE_KEY not set. Sync will fail for DB operations.');
  }

  try {
    const results = await syncAll({
      source: sourceArg,
      dryRun,
    });
    printResults(results);
    const failed = results.filter(r => r.status === 'error');
    process.exit(failed.length > 0 ? 1 : 0);
  } catch (err: any) {
    console.error(`\n❌ Fatal error: ${err.message}`);
    process.exit(1);
  }
}

main();

