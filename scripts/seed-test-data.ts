#!/usr/bin/env npx tsx
/**
 * Seed Test Data — Know Your Vote Kentucky
 *
 * Inserts sample Kentucky civic data. If local fails (ENOTFOUND), use the API:
 *   curl -X POST "https://know-your-vote-kentucky.vercel.app/api/seed" \
 *     -H "Authorization: Bearer YOUR_SYNC_API_KEY"
 *
 * Usage: npm run seed:test
 */
import './load-env';
import { createClient } from '@supabase/supabase-js';
import { runSeed } from '../src/lib/seed-test-data';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase config. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  console.log('\nKnow Your Vote Kentucky — Seeding Test Data\n');
  const result = await runSeed(supabase);
  console.log(`  Bills: ${result.bills} | Ordinances: ${result.ordinances} | EOs: ${result.executiveOrders}`);
  console.log(`  School Board: ${result.schoolBoard} | Legislators: ${result.legislators}`);
  if (result.errors.length) {
    result.errors.forEach((e) => console.error('  ', e));
  }
  console.log(`\nTotal: ${result.total} records. Visit http://localhost:3000 to view.\n`);
  if (result.total === 0 && result.errors.some((e) => e.includes('fetch failed') || e.includes('ENOTFOUND'))) {
    console.log('Local network cannot reach Supabase. Trigger seed via API (runs on Vercel):');
    console.log('  curl -X POST "https://know-your-vote-kentucky.vercel.app/api/seed" -H "Authorization: Bearer YOUR_SYNC_API_KEY"\n');
  }
}

main().catch((err) => {
  console.error(err.message);
  if (err.cause?.code === 'ENOTFOUND') {
    console.log('\nUse the API to seed from Vercel: curl -X POST "https://know-your-vote-kentucky.vercel.app/api/seed" -H "Authorization: Bearer $SYNC_API_KEY"\n');
  }
  process.exit(1);
});
