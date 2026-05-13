#!/usr/bin/env npx tsx
/**
 * One-shot normalization of `ky_legislators.district` to the canonical
 * format produced by `normalizeKyLegislatorDistrictForDb`:
 *   House  → HD-001…HD-100 (3-digit pad)
 *   Senate → SD-01…SD-38   (2-digit pad)
 *
 * Legacy rows often have `SD-0XX` (3-digit) which makes them look like a
 * different seat than the current Open States row at `SD-XX`. After this
 * runs, the cleanup script's seat-key comparison works correctly.
 *
 *   npm run normalize:legislator-districts              # dry-run
 *   npm run normalize:legislator-districts -- --apply   # commit updates
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';
import { normalizeKyLegislatorDistrictForDb } from '../src/lib/ky-district-geo';

type Args = { apply: boolean };
function parseArgs(): Args {
  return { apply: process.argv.includes('--apply') };
}

async function main() {
  const { apply } = parseArgs();
  if (!supabaseAdmin) {
    console.error('supabaseAdmin not configured');
    process.exit(1);
  }

  const { data, error } = await supabaseAdmin
    .from('ky_legislators')
    .select('id, name, chamber, district');
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  type Row = { id: string; name: string; chamber: 'house' | 'senate' | null; district: string | null };
  const rows = (data ?? []) as Row[];

  const updates: Array<{ id: string; name: string; chamber: string | null; from: string; to: string }> = [];
  for (const r of rows) {
    if (!r.district) continue;
    const canonical = normalizeKyLegislatorDistrictForDb(r.chamber, r.district);
    if (!canonical) continue;
    if (canonical !== r.district) {
      updates.push({ id: r.id, name: r.name, chamber: r.chamber, from: r.district, to: canonical });
    }
  }

  console.log(`Total legislators: ${rows.length}`);
  console.log(`Rows needing district normalization: ${updates.length}`);
  console.log('');
  for (const u of updates.slice(0, 25)) {
    console.log(`  ${u.chamber ?? 'none'}  ${u.name.padEnd(28)} ${u.from} → ${u.to}`);
  }
  if (updates.length > 25) console.log(`  …and ${updates.length - 25} more`);

  if (!apply) {
    console.log('\nDRY RUN — pass --apply to commit updates.');
    return;
  }
  if (updates.length === 0) {
    console.log('\nNothing to do.');
    return;
  }

  const nowIso = new Date().toISOString();
  let count = 0;
  for (const u of updates) {
    const { error: upErr } = await supabaseAdmin
      .from('ky_legislators')
      .update({ district: u.to, updated_at: nowIso })
      .eq('id', u.id);
    if (upErr) {
      console.error(`Update ${u.id} (${u.name}) failed:`, upErr.message);
      continue;
    }
    count++;
  }
  console.log(`\nUpdated ${count}/${updates.length} row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
