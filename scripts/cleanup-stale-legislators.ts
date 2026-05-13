#!/usr/bin/env npx tsx
/**
 * One-time cleanup for stale `ky_legislators` rows.
 *
 *   npm run cleanup:stale-legislators              # dry-run by default
 *   npm run cleanup:stale-legislators -- --apply   # actually deactivate
 *
 * Mirrors the second-pass logic now baked into syncKyLegislators: at every
 * seat where an active Open States row exists, mark every active LegiScan-only
 * row at that same (chamber, district) as inactive. Those legacy rows are
 * predecessors or alias dupes (e.g. "Matthew Lehman" alongside the canonical
 * "Matt Lehman" with openstates_id). Conservative — never touches a seat
 * Open States doesn't cover, so a current legislator that's only in our
 * LegiScan-seeded data won't be hidden.
 *
 * Use this once after migrating to clear the existing backlog without
 * waiting for the next sync run.
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';

type Args = { apply: boolean };
function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const apply = argv.includes('--apply');
  return { apply };
}

async function main() {
  const { apply } = parseArgs();
  if (!supabaseAdmin) {
    console.error('supabaseAdmin not configured');
    process.exit(1);
  }

  const { data: rows, error } = await supabaseAdmin
    .from('ky_legislators')
    .select('id, name, chamber, district, openstates_id, active')
    .eq('active', true);
  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const seatsCoveredByOpenStates = new Set<string>();
  for (const r of rows ?? []) {
    if (!r.openstates_id || !r.chamber || !r.district) continue;
    seatsCoveredByOpenStates.add(`${r.chamber}|${r.district}`);
  }

  const stale = (rows ?? []).filter((r) => {
    if (r.openstates_id) return false;
    if (!r.chamber || !r.district) return false;
    return seatsCoveredByOpenStates.has(`${r.chamber}|${r.district}`);
  });

  console.log(`Active legislators: ${rows?.length ?? 0}`);
  console.log(`Seats with current Open States coverage: ${seatsCoveredByOpenStates.size}`);
  console.log(`Active LegiScan-only rows at OS-covered seats (will be deactivated): ${stale.length}`);
  console.log('');
  for (const r of stale.slice(0, 25)) {
    console.log(`  ${r.chamber}|${r.district}  ${r.name}  id=${r.id}`);
  }
  if (stale.length > 25) console.log(`  …and ${stale.length - 25} more`);

  if (!apply) {
    console.log('\nDRY RUN — pass --apply to deactivate.');
    return;
  }
  if (stale.length === 0) {
    console.log('\nNothing to do.');
    return;
  }

  const nowIso = new Date().toISOString();
  let updated = 0;
  const CHUNK = 100;
  for (let i = 0; i < stale.length; i += CHUNK) {
    const ids = stale.slice(i, i + CHUNK).map((r) => r.id as string);
    const { error: upErr, count } = await supabaseAdmin
      .from('ky_legislators')
      .update({ active: false, updated_at: nowIso }, { count: 'exact' })
      .in('id', ids);
    if (upErr) {
      console.error('Update chunk failed:', upErr.message);
      process.exit(1);
    }
    updated += count ?? ids.length;
  }
  console.log(`\nDeactivated ${updated} row(s).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
