import type { KYLegislatorRoster } from '@/types/kentucky';

/** URL fragment id for /members — must match `id` on member cards. */
export function memberSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Strip honorifics and punctuation for comparing LegiScan names to Open States roster. */
export function normalizeSponsorNameForMatch(name: string): string {
  return name
    .replace(/\b(rep\.?|representative|sen\.?|senator|del\.?|delegate)\b/gi, ' ')
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** Match a bill sponsor string to a KY legislator (for official portrait). */
export function matchLegislatorBySponsorName(
  legislators: KYLegislatorRoster[],
  sponsorName: string,
): KYLegislatorRoster | null {
  const target = normalizeSponsorNameForMatch(sponsorName);
  if (!target) return null;

  for (const leg of legislators) {
    const full = normalizeSponsorNameForMatch(leg.name || '');
    if (full && full === target) return leg;
    const fl = `${leg.first_name || ''} ${leg.last_name || ''}`;
    const flNorm = normalizeSponsorNameForMatch(fl);
    if (flNorm && flNorm === target) return leg;
  }

  const targetTokens = target.split(' ').filter((t) => t.length > 1);
  const last = targetTokens[targetTokens.length - 1];
  if (last && last.length > 2) {
    const hits = legislators.filter((leg) => {
      const ln = (leg.last_name || '').toLowerCase();
      if (ln && last === ln) return true;
      const nm = normalizeSponsorNameForMatch(leg.name || '');
      return nm.endsWith(last);
    });
    if (hits.length === 1) return hits[0];
  }
  return null;
}
