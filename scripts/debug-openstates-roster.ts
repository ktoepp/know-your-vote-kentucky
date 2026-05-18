#!/usr/bin/env npx tsx
/**
 * Probe Open States directly for the KY roster and compare to what our
 * sync would persist. Helps diagnose why some seats end up with no
 * `openstates_id` row in our DB.
 *
 *   npm run debug:openstates-roster
 *   npm run debug:openstates-roster -- --district SD-023   # focus one seat
 */
import './load-env';
import { getKyOpenStatesClient } from '../src/lib/ky-openstates-client';
import { normalizeKyLegislatorDistrictForDb } from '../src/lib/ky-district-geo';

type Args = { district: string | null };
function parseArgs(): Args {
  const argv = process.argv.slice(2);
  const i = argv.indexOf('--district');
  return { district: i >= 0 ? (argv[i + 1] ?? null) : null };
}

function pickChamber(orgClass: unknown): 'house' | 'senate' | null {
  return orgClass === 'upper' ? 'senate' : orgClass === 'lower' ? 'house' : null;
}

async function main() {
  const args = parseArgs();
  const client = getKyOpenStatesClient();
  console.log('Calling Open States /people for KY (this hits the network) …');
  const all = await client.fetchLegislators();
  console.log(`Total legislators returned: ${all.length}`);

  let house = 0;
  let senate = 0;
  let unknown = 0;
  const byChamberDistrict = new Map<string, Array<{ name: string; id: string }>>();
  for (const leg of all) {
    const cr =
      (leg as { current_role?: { org_classification?: unknown; district?: unknown } }).current_role ?? {};
    const ch = pickChamber(cr.org_classification);
    if (ch === 'house') house++;
    else if (ch === 'senate') senate++;
    else unknown++;
    const districtRaw =
      cr.district != null && cr.district !== '' ? String(cr.district) : null;
    const district = normalizeKyLegislatorDistrictForDb(ch, districtRaw);
    const key = `${ch ?? 'none'}|${district ?? '?'}`;
    const arr = byChamberDistrict.get(key);
    if (arr) arr.push({ name: leg.name, id: leg.id });
    else byChamberDistrict.set(key, [{ name: leg.name, id: leg.id }]);
  }
  console.log(`Chamber breakdown: House=${house}, Senate=${senate}, Other/none=${unknown}`);
  console.log(`Distinct (chamber,district) keys: ${byChamberDistrict.size}`);

  if (args.district) {
    const target = args.district.toUpperCase();
    console.log(`\nFocusing on district ${target}:`);
    const matches: Array<{ key: string; name: string; id: string }> = [];
    for (const [key, arr] of byChamberDistrict) {
      if (key.toUpperCase().includes(target)) {
        for (const e of arr) matches.push({ key, ...e });
      }
    }
    if (matches.length === 0) {
      console.log('  (no Open States record for this district)');
    } else {
      for (const m of matches) console.log(`  ${m.key} — ${m.name} (${m.id})`);
    }
    return;
  }

  // Otherwise: show seats with multiple OS rows (rare) and count missing
  // expected House (100) + Senate (38).
  let multi = 0;
  for (const [, arr] of byChamberDistrict) if (arr.length > 1) multi++;
  console.log(`Seats with >1 OS row: ${multi}`);

  // Senate seat coverage check
  const senateKeys = [...byChamberDistrict.keys()].filter((k) => k.startsWith('senate|'));
  console.log(`Distinct Senate seats represented in OS: ${senateKeys.length} (expected 38)`);
  const houseKeys = [...byChamberDistrict.keys()].filter((k) => k.startsWith('house|'));
  console.log(`Distinct House seats represented in OS: ${houseKeys.length} (expected 100)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
