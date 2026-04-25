import type { KYLegislator, KYLegislatorRoster } from '@/types/kentucky';
import { formatBillLabelText, formatPartyLetterAbbrev } from '@/lib/bill-display';

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

/** App Router path: `/members/{slug}` (same value as `memberSlug(leg.name || leg.id)`). */
export function memberProfilePath(leg: Pick<KYLegislator, 'name' | 'id'>): string {
  return `/members/${memberSlug(leg.name || leg.id)}`;
}

/** Turn a URL slug back into a guess for sponsor-style name matching. */
function humanizeProfileSlug(profileSlug: string): string {
  return profileSlug.replace(/-/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Upgrades `http` to `https` for known image hosts, fixes protocol-relative URLs.
 * (Some CDNs block hotlinking without a referrer; set `imgProps` on MUI `Avatar` too.)
 */
export function normalizeLegislatorPhotoUrl(url: string | null | undefined): string | null {
  const raw = (url || '').trim();
  if (!raw) return null;
  if (raw.startsWith('//')) return `https:${raw}`;
  try {
    if (!/^https?:\/\//i.test(raw)) return raw;
    const u = new URL(raw);
    const host = u.hostname.toLowerCase();
    if (u.protocol === 'http:') {
      if (
        host.includes('openstates.org') ||
        host.includes('civicteam.org') ||
        host.includes('legislature.ky.gov') ||
        host.includes('static.openstates.org')
      ) {
        u.protocol = 'https:';
        return u.toString();
      }
    }
    return raw;
  } catch {
    return raw;
  }
}

/**
 * Match by LegiScan `people_id` (stored on `ky_legislators.legiscan_id`) — reliable for bill sponsor photos.
 */
export function matchLegislatorByLegiscanId(
  legislators: KYLegislatorRoster[],
  peopleId: unknown,
): KYLegislatorRoster | null {
  if (peopleId == null || peopleId === '') return null;
  const n = Number(peopleId);
  if (!Number.isFinite(n)) return null;
  return legislators.find((l) => l.legiscan_id != null && Number(l.legiscan_id) === n) ?? null;
}

/** Slug values we consider equivalent for the same person (roster name vs first/last vs id). */
function memberProfileSlugVariants(leg: Pick<KYLegislator, 'id' | 'name' | 'first_name' | 'last_name'>): string[] {
  const s = new Set<string>();
  const add = (raw: string) => {
    const m = memberSlug(raw);
    if (m) s.add(m);
  };
  add(leg.name || '');
  add(leg.id);
  const fl = [leg.first_name, leg.last_name]
    .map((x) => (x || '').trim())
    .filter(Boolean)
    .join(' ');
  if (fl) add(fl);
  return [...s];
}

/**
 * Find a member by the profile URL segment (unencoded slug).
 * Uses exact slug variants first, then the same name matcher as bill sponsors
 * (LegiScan / Open States strings often differ from `leg.name` formatting).
 */
export function findLegislatorByProfileSlug(
  legislators: KYLegislator[],
  profileSlug: string,
): KYLegislator | null {
  const key = (profileSlug || '').trim().toLowerCase();
  if (!key) return null;

  for (const leg of legislators) {
    for (const v of memberProfileSlugVariants(leg)) {
      if (v === key) return leg;
    }
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) {
    const byId = legislators.find((l) => l.id.toLowerCase() === key);
    if (byId) return byId;
  }

  const human = humanizeProfileSlug(key);
  if (human.length >= 2) {
    const roster: KYLegislatorRoster[] = legislators;
    const m = matchLegislatorBySponsorName(roster, human);
    if (m) return legislators.find((l) => l.id === m.id) ?? null;
  }

  return null;
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

/** Input shape for `formatMemberDisplay` — accepts `KYLegislator` or a LegiScan sponsor row. */
export interface MemberDisplayInput {
  name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  party?: string | null;
  chamber?: 'house' | 'senate' | null;
  district?: string | null;
  role?: string | null;
  role_title?: string | null;
  lrc_profile_url?: string | null;
  website?: string | null;
}

/** Canonical display variants from UX normalization spec §2c. */
export type MemberDisplayVariant = 'primary' | 'compact' | 'long';

function memberDisplayPrimaryName(input: MemberDisplayInput): string {
  const raw = (input.name || '').trim();
  if (raw) return raw;
  const fi = (input.first_name || '').trim();
  const la = (input.last_name || '').trim();
  if (fi && la) return `${fi} ${la}`;
  return fi || la || '';
}

function memberHonorificPrefix(input: MemberDisplayInput): string {
  if (isKentuckyGovernor(input)) return 'Gov.';
  const role = (input.role || '').trim().toUpperCase().replace(/\.$/, '');
  if (role === 'REP' || role === 'REPRESENTATIVE') return 'Rep.';
  if (role === 'SEN' || role === 'SENATOR') return 'Sen.';
  if (role === 'DEL' || role === 'DELEGATE') return 'Del.';
  if (input.chamber === 'house') return 'Rep.';
  if (input.chamber === 'senate') return 'Sen.';
  return '';
}

function memberDistrictNumber(district: string | null | undefined): string {
  const raw = (district || '').trim();
  if (!raw) return '';
  const m = raw.match(/(\d+)\s*$/);
  return m ? m[1] : raw;
}

/**
 * Canonical name renderer from UX normalization spec §2c.
 * - `primary`  → `"Jane Smith"` (card titles, sponsor headers)
 * - `compact`  → `"Jane Smith (D)"` (sponsor chips)
 * - `long`     → `"Rep. Jane Smith (D-KY-26)"` (dense inline attribution)
 */
export function formatMemberDisplay(
  input: MemberDisplayInput,
  variant: MemberDisplayVariant = 'primary',
): string {
  const name = memberDisplayPrimaryName(input);
  if (variant === 'primary') return name;
  const partyAbbrev = formatPartyLetterAbbrev(input.party);
  if (variant === 'compact') return partyAbbrev ? `${name} (${partyAbbrev})` : name;
  const honorific = memberHonorificPrefix(input);
  const districtNum = memberDistrictNumber(input.district);
  const clusterParts: string[] = [];
  if (partyAbbrev) clusterParts.push(partyAbbrev);
  if (districtNum) clusterParts.push('KY', districtNum);
  const cluster = clusterParts.length ? clusterParts.join('-') : '';
  const prefix = honorific ? `${honorific} ` : '';
  return cluster ? `${prefix}${name} (${cluster})` : `${prefix}${name}`;
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
