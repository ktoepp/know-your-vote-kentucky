import type { KYLegislatorRoster } from '@/types/kentucky';
import { matchLegislatorByLegiscanId, matchLegislatorBySponsorName, normalizeLegislatorPhotoUrl } from './ky-member-utils';

export interface PrimarySponsorDisplay {
  name: string;
  party?: string;
  photoUrl?: string | null;
}

export interface SponsorGroups {
  primary: PrimarySponsorDisplay[];
  cosponsor: PrimarySponsorDisplay[];
}

/**
 * LegiScan sponsor rows usually include `name`, but some payloads only set `first_name` / `last_name`.
 * Occasionally `sponsors` is a map of objects that omit `name` entirely — callers must still resolve a label.
 */
export function getSponsorRecordDisplayName(s: Record<string, unknown>): string {
  if (typeof s.name === 'string' && s.name.trim()) return s.name.trim();
  const fn = typeof s.first_name === 'string' ? s.first_name.trim() : '';
  const ln = typeof s.last_name === 'string' ? s.last_name.trim() : '';
  if (fn || ln) return `${fn} ${ln}`.trim();
  const person = s.person;
  if (person && typeof person === 'object' && person !== null) {
    const p = person as Record<string, unknown>;
    if (typeof p.name === 'string' && p.name.trim()) return p.name.trim();
    const pfn = typeof p.first_name === 'string' ? p.first_name.trim() : '';
    const pln = typeof p.last_name === 'string' ? p.last_name.trim() : '';
    if (pfn || pln) return `${pfn} ${pln}`.trim();
  }
  return '';
}

function legislatorNameByPeopleId(legislators: KYLegislatorRoster[], peopleId: unknown): string {
  if (typeof peopleId !== 'number' || !Number.isFinite(peopleId)) return '';
  const leg = legislators.find((l) => l.legiscan_id != null && Number(l.legiscan_id) === peopleId);
  return (leg?.name && leg.name.trim()) || '';
}

/** Display name for a sponsor row, including LegiScan `people_id` looked up on the roster. */
function resolvedSponsorName(s: Record<string, unknown>, legislators: KYLegislatorRoster[]): string {
  return getSponsorName(s) || legislatorNameByPeopleId(legislators, s.people_id);
}

function getSponsorName(s: Record<string, unknown>): string {
  return getSponsorRecordDisplayName(s);
}

/** Normalize LegiScan / Open States JSON `sponsors` blob into a list of sponsor objects. */
export function parseLegiscanSponsorRecords(sponsors: unknown): Record<string, unknown>[] {
  if (sponsors == null) return [];

  let list: unknown[] = [];
  if (Array.isArray(sponsors)) {
    list = sponsors;
  } else if (typeof sponsors === 'object' && sponsors !== null && 'sponsors' in sponsors) {
    const nested = (sponsors as { sponsors?: unknown }).sponsors;
    if (Array.isArray(nested)) list = nested;
  }

  if (
    list.length === 0 &&
    typeof sponsors === 'object' &&
    sponsors !== null &&
    !Array.isArray(sponsors) &&
    !('sponsors' in sponsors)
  ) {
    const vals = Object.values(sponsors as Record<string, unknown>).filter(
      (v): v is Record<string, unknown> => typeof v === 'object' && v !== null,
    );
    if (vals.some((v) => getSponsorRecordDisplayName(v) !== '')) {
      list = vals;
    }
  }

  return list.filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null);
}

function recordToDisplay(s: Record<string, unknown>, legislators: KYLegislatorRoster[]): PrimarySponsorDisplay | null {
  let name = getSponsorName(s);
  if (!name) {
    name = legislatorNameByPeopleId(legislators, s.people_id);
  }
  if (!name) return null;
  const byId = matchLegislatorByLegiscanId(legislators, s.people_id);
  const leg = byId ?? matchLegislatorBySponsorName(legislators, name);
  const bio = s.bio as { social?: { image?: string } } | undefined;
  const photoUrl = normalizeLegislatorPhotoUrl(leg?.photo_url ?? bio?.social?.image);
  const party = typeof s.party === 'string' ? s.party : undefined;
  return { name, party, photoUrl };
}

function isExplicitPrimary(s: Record<string, unknown>): boolean {
  const st = s.sponsor_type_id;
  if (st === 1 || st === '1') return true;
  if (s.primary === true) return true;
  const c = s.classification;
  if (typeof c === 'string' && c.toLowerCase() === 'primary') return true;
  return false;
}

function isExplicitCosponsor(s: Record<string, unknown>): boolean {
  const st = s.sponsor_type_id;
  if (st === 2 || st === '2' || st === 3 || st === '3') return true;
  const c = s.classification;
  if (typeof c === 'string') {
    const t = c.toLowerCase();
    if (t === 'cosponsor' || t === 'co-sponsor' || t === 'secondary') return true;
  }
  return false;
}

function isLegacyPrimary(s: Record<string, unknown>): boolean {
  const st = s.sponsor_type_id;
  return st === undefined || st === null || st === 1 || st === '1';
}

/** Primary sponsors first (LegiScan sponsor_type_id === 1), then first entries; enrich with roster photos. */
export function getPrimarySponsorsFromBill(
  sponsors: unknown,
  legislators: KYLegislatorRoster[],
  max = 2,
): PrimarySponsorDisplay[] {
  const typed = parseLegiscanSponsorRecords(sponsors);
  const primaries = typed.filter(isLegacyPrimary);
  const ordered = primaries.length > 0 ? primaries : typed;

  const out: PrimarySponsorDisplay[] = [];
  for (const s of ordered) {
    if (out.length >= max) break;
    const row = recordToDisplay(s, legislators);
    if (row) out.push(row);
  }
  return out;
}

/**
 * Primary vs cosponsor groups for bill cards (LegiScan: 1 = primary, 2+ = cosponsor).
 * When types are missing, first listed sponsor is treated as primary and the rest as cosponsors.
 */
export function getSponsorGroupsFromBill(
  sponsors: unknown,
  legislators: KYLegislatorRoster[],
  opts: { maxPrimary?: number; maxCosponsor?: number } = {},
): SponsorGroups {
  const maxPrimary = opts.maxPrimary ?? 4;
  const maxCosponsor = opts.maxCosponsor ?? 8;

  const typed = parseLegiscanSponsorRecords(sponsors);
  if (!typed.length) return { primary: [], cosponsor: [] };

  let primaryRaw = typed.filter(isExplicitPrimary);
  let coRaw = typed.filter(isExplicitCosponsor);

  if (primaryRaw.length === 0) {
    primaryRaw = [typed[0]];
    const firstKey = resolvedSponsorName(typed[0], legislators).toLowerCase();
    coRaw = typed.slice(1).filter(
      (s) => resolvedSponsorName(s, legislators).toLowerCase() !== firstKey,
    );
  } else {
    const primaryNames = new Set(
      primaryRaw.map((s) => resolvedSponsorName(s, legislators).toLowerCase()).filter(Boolean),
    );
    const remainder = typed.filter((s) => !isExplicitPrimary(s));
    const seenCo = new Set<string>();
    coRaw = [];
    for (const s of remainder) {
      const n = resolvedSponsorName(s, legislators).toLowerCase();
      if (!n || primaryNames.has(n) || seenCo.has(n)) continue;
      seenCo.add(n);
      coRaw.push(s);
    }
  }

  const primary: PrimarySponsorDisplay[] = [];
  for (const s of primaryRaw) {
    if (primary.length >= maxPrimary) break;
    const row = recordToDisplay(s, legislators);
    if (row) primary.push(row);
  }

  if (primary.length === 0 && typed.length > 0) {
    const explicit = typed.filter(isExplicitPrimary);
    const tryOrder = explicit.length > 0 ? [...explicit, ...typed.filter((s) => !isExplicitPrimary(s))] : [...typed];
    const seen = new Set<string>();
    for (const s of tryOrder) {
      if (primary.length >= maxPrimary) break;
      const row = recordToDisplay(s, legislators);
      if (row) {
        const k = row.name.toLowerCase();
        if (seen.has(k)) continue;
        seen.add(k);
        primary.push(row);
      }
    }
  }

  const primaryNames = new Set(primary.map((p) => p.name.toLowerCase()));
  const cosponsor: PrimarySponsorDisplay[] = [];
  for (const s of coRaw) {
    if (cosponsor.length >= maxCosponsor) break;
    const n = resolvedSponsorName(s, legislators).toLowerCase();
    if (!n || primaryNames.has(n)) continue;
    const row = recordToDisplay(s, legislators);
    if (row) cosponsor.push(row);
  }

  return { primary, cosponsor };
}
