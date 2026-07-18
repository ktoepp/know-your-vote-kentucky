import type { KYLegislator } from '@/types/kentucky';
import { parseKyDistrictNumber } from '@/lib/ky-district-geo';

/**
 * URL + lookup helpers for the district landing pages (/districts/house-19).
 * Districts are a fixed, statically enumerable set — 100 House + 38 Senate seats —
 * so every page pre-renders at build with no database dependency for the route list.
 */

export type KyDistrictChamber = 'house' | 'senate';

export interface KyDistrictRef {
  chamber: KyDistrictChamber;
  districtNumber: number;
}

export const KY_HOUSE_DISTRICT_COUNT = 100;
export const KY_SENATE_DISTRICT_COUNT = 38;

const DISTRICT_SLUG_RE = /^(house|senate)-(\d{1,3})$/;

export function kyDistrictCount(chamber: KyDistrictChamber): number {
  return chamber === 'house' ? KY_HOUSE_DISTRICT_COUNT : KY_SENATE_DISTRICT_COUNT;
}

export function kyDistrictSlug(ref: KyDistrictRef): string {
  return `${ref.chamber}-${ref.districtNumber}`;
}

/** "house-19" → {chamber, districtNumber}; null for unknown chambers or out-of-range numbers. */
export function parseKyDistrictSlug(raw: string): KyDistrictRef | null {
  const m = DISTRICT_SLUG_RE.exec((raw || '').trim().toLowerCase());
  if (!m) return null;
  const chamber = m[1] as KyDistrictChamber;
  const districtNumber = parseInt(m[2]!, 10);
  if (!Number.isFinite(districtNumber) || districtNumber < 1 || districtNumber > kyDistrictCount(chamber)) {
    return null;
  }
  return { chamber, districtNumber };
}

export function kyDistrictPath(ref: KyDistrictRef): string {
  return `/districts/${kyDistrictSlug(ref)}`;
}

/** "Kentucky House District 19" — page H1s and breadcrumbs. */
export function kyDistrictDisplayName(ref: KyDistrictRef): string {
  return `Kentucky ${ref.chamber === 'house' ? 'House' : 'Senate'} District ${ref.districtNumber}`;
}

/** "House District 19" — compact label for links from other pages. */
export function kyDistrictShortName(ref: KyDistrictRef): string {
  return `${ref.chamber === 'house' ? 'House' : 'Senate'} District ${ref.districtNumber}`;
}

/** All 138 district refs, House 1–100 then Senate 1–38. */
export function allKyDistrictRefs(): KyDistrictRef[] {
  const refs: KyDistrictRef[] = [];
  for (let n = 1; n <= KY_HOUSE_DISTRICT_COUNT; n += 1) refs.push({ chamber: 'house', districtNumber: n });
  for (let n = 1; n <= KY_SENATE_DISTRICT_COUNT; n += 1) refs.push({ chamber: 'senate', districtNumber: n });
  return refs;
}

/** District ref for a roster row, when its chamber + district parse cleanly. */
export function kyDistrictRefForLegislator(
  leg: Pick<KYLegislator, 'chamber' | 'district'>,
): KyDistrictRef | null {
  if (leg.chamber !== 'house' && leg.chamber !== 'senate') return null;
  const numStr = parseKyDistrictNumber(leg.district);
  if (!numStr) return null;
  const districtNumber = parseInt(numStr, 10);
  if (!Number.isFinite(districtNumber) || districtNumber < 1 || districtNumber > kyDistrictCount(leg.chamber)) {
    return null;
  }
  return { chamber: leg.chamber, districtNumber };
}

/** Current officeholder for a district from an active roster; null for vacant/unmatched seats. */
export function findLegislatorForKyDistrict<T extends Pick<KYLegislator, 'chamber' | 'district'>>(
  roster: T[],
  ref: KyDistrictRef,
): T | null {
  for (const leg of roster) {
    if (leg.chamber !== ref.chamber) continue;
    const numStr = parseKyDistrictNumber(leg.district);
    if (numStr && parseInt(numStr, 10) === ref.districtNumber) return leg;
  }
  return null;
}

/** Committed district map thumbnail (public/geo/district-thumbs) — also the page's OG image. */
export function kyDistrictThumbPath(ref: KyDistrictRef, size: 'card' | 'profile'): string {
  return `/geo/district-thumbs/${ref.chamber}/${ref.districtNumber}-${size}.webp`;
}
