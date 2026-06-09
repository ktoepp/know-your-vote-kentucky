/**
 * Diagnostic: committee membership reconciliation
 *
 * Compares stored ky_legislators.committee_memberships against what Open States would produce,
 * cross-referenced against canonical ky_committees.slug values.
 *
 * Read-only — no DB writes. Run after sync:ky:legislators to verify the canonical slug
 * writing is working correctly.
 *
 * Usage:
 *   npm run reconcile:committee-memberships
 *   npm run reconcile:committee-memberships -- --only-mismatches
 *   npm run reconcile:committee-memberships -- --legislator="Jane Doe"
 */
import './load-env';
import { createClient } from '@supabase/supabase-js';
import {
  committeeSlugFromName,
  extractCanonicalCommitteeSlugsFromOpenStatesPerson,
  extractCommitteeMembershipSlugsFromOpenStatesPerson,
} from '../src/lib/ky-committee-utils';
import { getKyOpenStatesClient } from '../src/lib/ky-openstates-client';

const args = process.argv.slice(2);
const onlyMismatches = args.includes('--only-mismatches');
const legislatorFilter = args.find((a) => a.startsWith('--legislator='))?.split('=')[1]?.toLowerCase();

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Missing SUPABASE env vars'); process.exit(1); }
  const db = createClient(url, key);

  console.log('[reconcile] Fetching DB legislators…');
  const { data: legRows, error: legErr } = await db
    .from('ky_legislators')
    .select('id, name, openstates_id, chamber, district, committee_memberships')
    .eq('active', true);
  if (legErr) { console.error('DB fetch failed:', legErr.message); process.exit(1); }
  const legislators = (legRows ?? []) as Array<{
    id: string; name: string; openstates_id: string | null;
    chamber: string | null; district: string | null; committee_memberships: string[] | null;
  }>;

  console.log('[reconcile] Fetching ky_committees for canonical slug map…');
  const { data: committeeRows } = await db.from('ky_committees').select('slug, name');
  const canonicalMap = new Map<string, string>();
  for (const row of committeeRows ?? []) {
    if (row.slug && row.name) canonicalMap.set(committeeSlugFromName(row.name), row.slug);
  }
  console.log(`[reconcile] ${canonicalMap.size} canonical committee slugs loaded`);

  console.log('[reconcile] Fetching Open States roster…');
  let osRoster;
  try {
    osRoster = await getKyOpenStatesClient().fetchLegislators();
  } catch (e) {
    console.error('Open States fetch failed:', e instanceof Error ? e.message : String(e));
    process.exit(1);
  }
  const osById = new Map<string, (typeof osRoster)[number]>();
  for (const p of osRoster) if (p.id) osById.set(p.id, p);

  const counts = { ok: 0, missing_from_db: 0, extra_in_db: 0, format_mismatch: 0, os_roles_empty: 0, no_os_match: 0 };
  const unresolvableOrgs = new Set<string>();
  const mismatches: string[] = [];

  for (const leg of legislators) {
    if (legislatorFilter && !leg.name.toLowerCase().includes(legislatorFilter)) continue;
    const label = `${leg.name} (${leg.chamber ?? '?'} ${leg.district ?? '?'})`;

    if (!leg.openstates_id) { counts.no_os_match++; continue; }
    const os = osById.get(leg.openstates_id);
    if (!os) { counts.no_os_match++; continue; }

    const osRawSlugs = extractCommitteeMembershipSlugsFromOpenStatesPerson(os);
    const osCanonical = canonicalMap.size > 0
      ? extractCanonicalCommitteeSlugsFromOpenStatesPerson(os, canonicalMap)
      : osRawSlugs;

    // Collect unresolvable org names
    for (const rawSlug of osRawSlugs) {
      if (!osCanonical.some((c) => c === rawSlug || canonicalMap.get(rawSlug) === c)) {
        // This raw slug didn't resolve — reconstruct org name approximation for reporting
        unresolvableOrgs.add(rawSlug);
      }
    }

    if (osCanonical.length === 0 && osRawSlugs.length === 0) {
      counts.os_roles_empty++;
      continue;
    }

    const dbSlugs = new Set(leg.committee_memberships ?? []);
    const canonicalSet = new Set(osCanonical);
    const onlyInOs = osCanonical.filter((s) => !dbSlugs.has(s));
    const onlyInDb = [...dbSlugs].filter((s) => !canonicalSet.has(s));
    const rawOnlyInDb = [...dbSlugs].filter((s) => osRawSlugs.includes(s) && !canonicalSet.has(s));

    if (onlyInOs.length > 0) counts.missing_from_db++;
    if (onlyInDb.length > 0 && rawOnlyInDb.length > 0) counts.format_mismatch++;
    else if (onlyInDb.length > 0) counts.extra_in_db++;

    if (onlyInOs.length === 0 && onlyInDb.length === 0) {
      counts.ok++;
      if (!onlyMismatches) mismatches.push(`  ✓ ${label}: ${osCanonical.join(', ') || '(no committees)'}`);
    } else {
      const lines: string[] = [`  ✗ ${label}`];
      if (onlyInOs.length > 0) lines.push(`      +OS (missing from DB): ${onlyInOs.join(', ')}`);
      if (onlyInDb.length > 0) lines.push(`      -DB (not in OS): ${onlyInDb.join(', ')}`);
      mismatches.push(lines.join('\n'));
    }
  }

  console.log('\n=== Committee Membership Reconciliation ===\n');
  console.log(`Checked: ${legislators.length} active legislators`);
  console.log(`  OK:               ${counts.ok}`);
  console.log(`  OS roles empty:   ${counts.os_roles_empty}`);
  console.log(`  Missing from DB:  ${counts.missing_from_db}`);
  console.log(`  Extra in DB:      ${counts.extra_in_db}`);
  console.log(`  Format mismatch:  ${counts.format_mismatch}`);
  console.log(`  No OS match:      ${counts.no_os_match}`);

  if (mismatches.length > 0) {
    console.log('\n--- Per-legislator detail ---');
    mismatches.forEach((m) => console.log(m));
  }

  if (unresolvableOrgs.size > 0) {
    console.log('\n--- Unresolvable OS org name slugs (transient/subcommittee/non-standing) ---');
    [...unresolvableOrgs].sort().forEach((s) => console.log(`  ${s}`));
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
