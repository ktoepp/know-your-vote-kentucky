import type { KYLegislatorRoster } from '@/types/kentucky';
import { matchLegislatorBySponsorName } from './ky-member-utils';

export interface PrimarySponsorDisplay {
  name: string;
  party?: string;
  photoUrl?: string | null;
}

/** Primary sponsors first (LegiScan sponsor_type_id === 1), then first entries; enrich with roster photos. */
export function getPrimarySponsorsFromBill(
  sponsors: Record<string, unknown> | null,
  legislators: KYLegislatorRoster[],
  max = 2,
): PrimarySponsorDisplay[] {
  if (!sponsors) return [];

  let list: unknown[] = [];
  if (Array.isArray(sponsors)) {
    list = sponsors;
  } else if (typeof sponsors === 'object' && sponsors !== null && 'sponsors' in sponsors) {
    const nested = (sponsors as { sponsors?: unknown }).sponsors;
    if (Array.isArray(nested)) list = nested;
  }

  const typed = list.filter((s): s is Record<string, unknown> => typeof s === 'object' && s !== null);
  const primaries = typed.filter((s) => {
    const st = s.sponsor_type_id;
    return st === undefined || st === null || st === 1 || st === '1';
  });
  const ordered = primaries.length > 0 ? primaries : typed;

  const out: PrimarySponsorDisplay[] = [];
  for (const s of ordered) {
    if (out.length >= max) break;
    const name = typeof s.name === 'string' ? s.name : '';
    if (!name) continue;
    const leg = matchLegislatorBySponsorName(legislators, name);
    const bio = s.bio as { social?: { image?: string } } | undefined;
    const photoUrl = leg?.photo_url ?? bio?.social?.image ?? null;
    const party = typeof s.party === 'string' ? s.party : undefined;
    out.push({ name, party, photoUrl });
  }
  return out;
}
