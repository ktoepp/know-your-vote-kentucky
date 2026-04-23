import type { KYLegislator, KYLegislatorRoster } from '@/types/kentucky';
import { formatBillLabelText } from '@/lib/bill-display';

/** Two-letter initials for `Avatar` when photo is missing (uses first/last or parses `name`). */
export function kyLegislatorAvatarInitials(leg: Pick<KYLegislator, 'name' | 'first_name' | 'last_name'>): string {
  const fi = leg.first_name?.trim();
  const la = leg.last_name?.trim();
  if (fi && la) return `${fi[0]!}${la[0]!}`.toUpperCase();
  if (fi) return fi.slice(0, 2).toUpperCase();
  if (la) return la.slice(0, 2).toUpperCase();
  const parts = (leg.name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[parts.length - 1]?.[0];
    if (a && b) return `${a}${b}`.toUpperCase();
  }
  if (parts.length === 1 && parts[0].length) return parts[0].slice(0, 2).toUpperCase();
  return '?';
}

/** URL fragment id for /members — must match `id` on member cards. */
export function memberSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/**
 * Ballotpedia search for this person (we don't store slugs). "Kentucky" narrows results.
 */
export function ballotpediaMemberSearchUrl(displayName: string): string {
  const q = encodeURIComponent(`${displayName.trim()} Kentucky`);
  return `https://ballotpedia.org/Special:Search?search=${q}`;
}

/** Kentucky LRC / legislature.ky.gov profile URL when stored or legacy `website` points there. */
export function kyLegislatureProfileUrl(leg: {
  lrc_profile_url?: string | null;
  website?: string | null;
}): string | null {
  const lrc = (leg.lrc_profile_url || '').trim();
  if (lrc) return lrc;
  const w = (leg.website || '').trim();
  if (w.toLowerCase().includes('legislature.ky.gov')) return w;
  return null;
}

/** Non-legislature website (e.g. campaign) when `website` is not the LRC profile. */
export function kyLegislatorCampaignWebsite(leg: {
  lrc_profile_url?: string | null;
  website?: string | null;
}): string | null {
  const w = (leg.website || '').trim();
  if (!w) return null;
  if (w.toLowerCase().includes('legislature.ky.gov')) return null;
  return w;
}

/**
 * True only for the elected Kentucky governor (used for the Governor tag and section).
 * Update name matching when the officeholder changes.
 */
export function isKentuckyGovernor(leg: {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): boolean {
  const last = (leg.last_name || '').trim().toLowerCase();
  const first = (leg.first_name || '').trim().toLowerCase();
  const full = (leg.name || '').trim().toLowerCase();
  const lastMatches = last === 'beshear' || /\bbeshear\b/.test(full);
  if (!lastMatches) return false;
  const firstMatches =
    (first && (first.startsWith('andy') || first.startsWith('andrew'))) ||
    /\bandy\b/.test(full) ||
    /\bandrew\b/.test(full);
  return firstMatches;
}

/** Short public title for member cards — prefers Open States `role_title` when present. */
export function kyMemberTitleShort(leg: {
  chamber?: 'house' | 'senate' | null;
  role_title?: string | null;
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
}): string {
  if (isKentuckyGovernor(leg)) return 'Governor';
  const rt = (leg.role_title || '').trim();
  if (rt) return formatBillLabelText(rt);
  if (leg.chamber === 'house') return 'Representative';
  if (leg.chamber === 'senate') return 'Senator';
  return 'Statewide official';
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
