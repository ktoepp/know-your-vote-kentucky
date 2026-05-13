#!/usr/bin/env npx tsx
/**
 * One-shot diagnostic: external_links coverage + duplicate-row detection.
 *
 *   npm run diagnose:legislators
 */
import './load-env';
import { supabaseAdmin } from '../src/app/lib/supabaseAdminCore';

async function main() {
  if (!supabaseAdmin) {
    console.error('supabaseAdmin not configured');
    process.exit(1);
  }

  const { data, error } = await supabaseAdmin
    .from('ky_legislators')
    .select('id, name, first_name, last_name, district, chamber, openstates_id, legiscan_id, active, external_links')
    .eq('active', true);

  if (error) {
    console.error('ERROR:', error.message);
    process.exit(1);
  }

  const rows = data ?? [];
  console.log(`Active legislators: ${rows.length}`);

  // ---- external_links coverage ----
  let withLinks = 0;
  let totalLinks = 0;
  for (const r of rows) {
    const arr = Array.isArray(r.external_links) ? r.external_links : [];
    if (arr.length > 0) withLinks++;
    totalLinks += arr.length;
  }
  console.log(
    `external_links: ${withLinks}/${rows.length} legislators have ≥1 link (${totalLinks} total entries)`,
  );
  console.log('Sample (first 5):');
  for (const r of rows.slice(0, 5)) {
    const arr = Array.isArray(r.external_links) ? r.external_links : [];
    console.log(`  ${r.name} — ${arr.length} entries`);
  }

  // ---- duplicate detection ----
  console.log('\n--- Duplicate detection ---');
  const byKey = new Map<string, typeof rows>();
  for (const r of rows) {
    const last = (r.last_name || '').toLowerCase().trim();
    const first = (r.first_name || '').toLowerCase().trim();
    const k = `${r.chamber ?? 'none'}|${(r.district || '').trim()}|${last} ${first}`.trim();
    const arr = byKey.get(k);
    if (arr) arr.push(r);
    else byKey.set(k, [r]);
  }
  let dupGroups = 0;
  let totalExtraRows = 0;
  for (const [k, arr] of byKey) {
    if (arr.length > 1) {
      dupGroups++;
      totalExtraRows += arr.length - 1;
      console.log(`Key: ${k}`);
      for (const r of arr) {
        console.log(
          `  ${r.name} | id=${r.id} | os=${r.openstates_id ?? 'none'} | ls=${r.legiscan_id ?? 'none'} | dist=${r.district}`,
        );
      }
    }
  }
  console.log('---');
  console.log(`Duplicate groups (same chamber+district+name): ${dupGroups}`);
  console.log(`Extra rows beyond first: ${totalExtraRows}`);

  // ---- name-mismatch hint ----
  // Look for same chamber+district with DIFFERENT names — common cause of
  // "looks like a duplicate" because dedupeKyLegislators keys on name too.
  console.log('\n--- Same chamber+district, different names (potential dedupe miss) ---');
  const seatKey = new Map<string, typeof rows>();
  for (const r of rows) {
    const k = `${r.chamber ?? 'none'}|${(r.district || '').trim()}`;
    const arr = seatKey.get(k);
    if (arr) arr.push(r);
    else seatKey.set(k, [r]);
  }
  let seatGroups = 0;
  for (const [k, arr] of seatKey) {
    if (arr.length > 1) {
      const distinctNames = new Set(arr.map((r) => (r.last_name || '').toLowerCase().trim()));
      if (distinctNames.size > 1) {
        seatGroups++;
        console.log(`Seat ${k}:`);
        for (const r of arr) {
          console.log(
            `  ${r.name} | id=${r.id} | os=${r.openstates_id ?? 'none'} | ls=${r.legiscan_id ?? 'none'}`,
          );
        }
      }
    }
  }
  console.log(`Seats with multiple distinct surnames: ${seatGroups}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
