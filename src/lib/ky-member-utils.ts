import type { KYLegislator, KYLegislatorRoster } from '@/types/kentucky';
import { parseKyDistrictNumber } from '@/lib/ky-district-geo';
import { formatBillLabelText, formatPartyLetterAbbrev } from '@/lib/bill-display';
import {
  hostnameOf,
  isKentuckyLegislatureHost,
  isObsoleteKyLrcHostname,
  normalizeHttpsUrl,
  sanitizeLegislatorCampaignWebsiteUrl,
} from '@/lib/legislator-link-normalize';
import { legiscanMemberPersonUrl, normalizeBallotpediaHref, legiscanPersonUrl } from './external-legislative-links';

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

/** Accessible `alt` for legislator headshots when `name` / roster row is available. */
export function kyLegislatorPortraitAlt(
  leg: Pick<KYLegislator, 'name' | 'first_name' | 'last_name'> | null | undefined,
): string {
  const n = leg?.name?.trim();
  if (n) return `Portrait of ${n}`;
  const fi = leg?.first_name?.trim();
  const la = leg?.last_name?.trim();
  const composite = [fi, la].filter(Boolean).join(' ').trim();
  if (composite) return `Portrait of ${composite}`;
  return 'Legislator portrait';
}

/** Accessible `alt` for sponsor / chip headshots when only a display name string is known. */
export function kySponsorPortraitAlt(displayName: string | null | undefined): string {
  const n = (displayName ?? '').trim();
  return n ? `Portrait of ${n}` : 'Sponsor portrait';
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
 * Kentucky LRC headshot URL pattern when LegiScan omits `bio.social.image` (often `bio: []`).
 * Senate filenames use 100 + district number (e.g. SD-009 → senate109.jpg).
 */
export function kyLegislatureHeadshotUrlFromLegiscanDistrict(district: string | null | undefined): string | null {
  const d = (district || '').trim();
  const hm = /^HD-(\d+)$/i.exec(d);
  if (hm) {
    const n = parseInt(hm[1], 10);
    if (!Number.isFinite(n) || n < 1) return null;
    return `https://legislature.ky.gov/Legislator%20Head%20shots/house${n}.jpg`;
  }
  const sm = /^SD-(\d+)$/i.exec(d);
  if (sm) {
    const n = parseInt(sm[1], 10);
    if (!Number.isFinite(n) || n < 1) return null;
    return `https://legislature.ky.gov/Legislator%20Head%20shots/senate${100 + n}.jpg`;
  }
  return null;
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

export { normalizeBallotpediaHref, legiscanPersonUrl, legiscanMemberPersonUrl };

/** Ignore broken legacy `*.lrc.ky.gov` profile URLs and prefer current legislature.ky.gov (stored or inferred). */
function sanitizeStoredKyLegislatureUrl(raw: string | null | undefined): string | null {
  const t = (raw ?? '').trim();
  if (!t) return null;
  const n = normalizeHttpsUrl(t) ?? t;
  const host = hostnameOf(n);
  if (!host || isObsoleteKyLrcHostname(host)) return null;
  if (isKentuckyLegislatureHost(host)) return n;
  if (host === 'apps.legislature.ky.gov') return n;
  return null;
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

/** Seat identity for conflict checks: House/Senate + numeric district from `district` string. */
function kyDistrictSeatKey(leg: Pick<KYLegislator, 'chamber' | 'district'>): string | null {
  if (leg.chamber !== 'house' && leg.chamber !== 'senate') return null;
  const n = parseKyDistrictNumber(leg.district);
  if (!n) return null;
  return `${leg.chamber}:${n}`;
}

/** Stable identity for “same person” when comparing roster rows (dedupe / transition-period seats). */
function kyLegislatorIdentityNorm(leg: Pick<KYLegislator, 'name' | 'first_name' | 'last_name' | 'openstates_id'>): string {
  const os = (leg.openstates_id || '').trim();
  if (os) return `os:${os}`;
  const raw = (leg.name || '').trim() || [leg.first_name, leg.last_name].map((x) => (x || '').trim()).filter(Boolean).join(' ');
  return `n:${normalizeSponsorNameForMatch(raw)}`;
}

/**
 * Another roster member represents a **different person** for the same chamber + district.
 * LRC `Legislator-Profile.aspx?DistrictNumber=` always tracks the **current** listing for the seat, so those URLs are
 * unsafe whenever the seat has turned over and we still retain the prior legislator row (often `active = false`).
 */
function hasKyDistrictSeatDifferentPersonConflict(
  leg: Pick<KYLegislator, 'id' | 'name' | 'first_name' | 'last_name' | 'openstates_id' | 'chamber' | 'district'>,
  roster: KYLegislator[],
): boolean {
  const seat = kyDistrictSeatKey(leg);
  if (!seat) return false;
  const selfId = kyLegislatorIdentityNorm(leg as KYLegislator);
  return roster.some((p) => {
    if (p.id === leg.id) return false;
    if (kyDistrictSeatKey(p) !== seat) return false;
    return kyLegislatorIdentityNorm(p) !== selfId;
  });
}

/** True when URL is the LRC district-based profile (current officeholder for that seat, not a person-stable id). */
export function isKyLrcDistrictNumberProfileUrl(url: string | null | undefined): boolean {
  const raw = (url ?? '').trim();
  if (!raw) return false;
  const n = normalizeHttpsUrl(raw) ?? raw;
  try {
    const u = new URL(n);
    if (!isKentuckyLegislatureHost(u.hostname)) return false;
    if (!u.pathname.toLowerCase().includes('legislator-profile.aspx')) return false;
    const q = u.search.replace(/^\?/, '').split('&');
    for (const pair of q) {
      const [k, v] = pair.split('=').map((s) => decodeURIComponent(s));
      if ((k || '').toLowerCase() === 'districtnumber' && (v || '').trim() !== '') return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Public LRC profile is keyed by **district** (current officeholder), not by person.
 * - House: `DistrictNumber` = 1..100
 * - Senate: `DistrictNumber` = 101..138 (100 + senate district 1..38)
 * @see https://legislature.ky.gov/Legislators/Pages/Legislator-Profile.aspx
 */
export function inferKyLrcProfileUrlFromDistrict(leg: {
  chamber?: 'house' | 'senate' | null;
  district?: string | null;
}): string | null {
  if (leg.chamber !== 'house' && leg.chamber !== 'senate') return null;
  const nStr = parseKyDistrictNumber(leg.district);
  if (!nStr) return null;
  const d = parseInt(nStr, 10);
  if (!Number.isFinite(d) || d < 1) return null;
  const base = 'https://legislature.ky.gov/Legislators/Pages/Legislator-Profile.aspx';
  if (leg.chamber === 'house') {
    if (d > 100) return null;
    return `${base}?DistrictNumber=${d}`;
  }
  if (d > 38) return null;
  return `${base}?DistrictNumber=${100 + d}`;
}

/**
 * Kentucky LRC profile URL: stored legislature.ky.gov / apps links first; otherwise infer from chamber + district.
 * When `roster` is provided, district-based targets (`?DistrictNumber=`) are skipped if any **other** roster row
 * represents a different person for the same seat (e.g. predecessor still in DB) — those pages track the current
 * listing for the district, not a stable per-person id.
 */
export function kyLegislatureProfileUrl(
  leg: {
    id?: string;
    active?: boolean;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    openstates_id?: string | null;
    lrc_profile_url?: string | null;
    website?: string | null;
    chamber?: 'house' | 'senate' | null;
    district?: string | null;
  },
  roster?: KYLegislator[],
): string | null {
  const seatConflict =
    roster?.length &&
    typeof leg.id === 'string' &&
    hasKyDistrictSeatDifferentPersonConflict(leg as KYLegislator, roster);

  const fromLrc = sanitizeStoredKyLegislatureUrl(leg.lrc_profile_url);
  if (fromLrc) {
    if (seatConflict && isKyLrcDistrictNumberProfileUrl(fromLrc)) return null;
    return fromLrc;
  }
  const fromWebsite = sanitizeStoredKyLegislatureUrl(leg.website);
  if (fromWebsite) {
    if (seatConflict && isKyLrcDistrictNumberProfileUrl(fromWebsite)) return null;
    return fromWebsite;
  }

  const inferred = inferKyLrcProfileUrlFromDistrict(leg);
  if (!inferred) return null;

  if (seatConflict) {
    return null;
  }

  return normalizeHttpsUrl(inferred) ?? inferred;
}

/** Non-legislature website (e.g. campaign) when `website` is not the LRC profile. */
export function kyLegislatorCampaignWebsite(leg: {
  lrc_profile_url?: string | null;
  website?: string | null;
  chamber?: 'house' | 'senate' | null;
  district?: string | null;
}): string | null {
  const w = (leg.website || '').trim();
  if (!w) return null;
  const n = sanitizeLegislatorCampaignWebsiteUrl(w, leg.chamber ?? null, leg.district ?? null);
  if (!n) return null;
  const host = hostnameOf(n);
  if (!host || isObsoleteKyLrcHostname(host)) return null;
  if (isKentuckyLegislatureHost(host)) return null;
  if (host === 'apps.legislature.ky.gov') return null;
  return n;
}

/** Official LRC listings when a direct profile URL is unknown (still better than a missing footer link). */
export const KY_LEGISLATURE_HOUSE_ROSTER_URL = 'https://apps.legislature.ky.gov/Legislators/hmembers_alpha.html';
export const KY_LEGISLATURE_SENATE_ROSTER_URL = 'https://apps.legislature.ky.gov/Legislators/smembers_alpha.html';

/**
 * Direct legislature.ky.gov profile when stored, else chamber roster on apps.legislature.ky.gov
 * so every House/Senate card can offer a consistent "KY Legislature" target.
 */
export function kyLegislaturePublicUrl(
  leg: {
    id?: string;
    active?: boolean;
    name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
    openstates_id?: string | null;
    chamber?: 'house' | 'senate' | null;
    lrc_profile_url?: string | null;
    website?: string | null;
    district?: string | null;
  },
  roster?: KYLegislator[],
): string | null {
  const direct = kyLegislatureProfileUrl(leg, roster);
  if (direct) return direct;
  if (leg.chamber === 'house') return KY_LEGISLATURE_HOUSE_ROSTER_URL;
  if (leg.chamber === 'senate') return KY_LEGISLATURE_SENATE_ROSTER_URL;
  return 'https://legislature.ky.gov/Legislators';
}

/**
 * Deduplicate `ky_legislators` rows that refer to the same person (e.g. LegiScan-seeded row
 * plus Open States–synced row: separate unique keys on `legiscan_id` vs `openstates_id`).
 * Prefers the row with Open States id and richer contact / photo / LRC data.
 */
export function dedupeKyLegislators(legislators: KYLegislator[]): KYLegislator[] {
  function keyFor(leg: KYLegislator): string {
    const nameK = normalizeSponsorNameForMatch(
      leg.name || [leg.first_name, leg.last_name].filter(Boolean).join(' '),
    );
    const d = parseKyDistrictNumber(leg.district) || (leg.district || '').trim().toLowerCase();
    const ch = leg.chamber ?? 'none';
    return `${ch}\0${d}\0${nameK}`;
  }
  function score(leg: KYLegislator): number {
    let s = 0;
    if (leg.openstates_id) s += 200;
    if (leg.legiscan_id) s += 100;
    if (leg.lrc_profile_url) s += 40;
    if (leg.email) s += 25;
    if (leg.phone) s += 25;
    if (leg.photo_url) s += 25;
    if (leg.first_name && leg.last_name) s += 5;
    return s;
  }
  const byKey = new Map<string, KYLegislator>();
  for (const leg of legislators) {
    const k = keyFor(leg);
    const prev = byKey.get(k);
    if (!prev) {
      byKey.set(k, leg);
      continue;
    }
    if (score(leg) > score(prev)) {
      byKey.set(k, leg);
    } else if (score(leg) === score(prev) && leg.openstates_id && !prev.openstates_id) {
      byKey.set(k, leg);
    }
  }
  return Array.from(byKey.values());
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

/** Unify "Rep" / "Sen" API strings with full titles used when `role_title` is absent. */
function normalizeChamberTitleForDisplay(
  leg: { chamber?: 'house' | 'senate' | null; role_title?: string | null },
  formatted: string,
): string {
  const t = formatted.trim();
  if (leg.chamber === 'house' && /^(rep|rep\.)$/i.test(t)) return 'Representative';
  if (leg.chamber === 'senate' && /^(sen|sen\.)$/i.test(t)) return 'Senator';
  return formatted;
}

const EXECUTIVE_ROLE_LABELS: Record<string, string> = {
  lt_governor: 'Lieutenant Governor',
  lieutenant_governor: 'Lieutenant Governor',
  attorney_general: 'Attorney General',
};

function normalizeExecutiveRoleTitle(roleTitle: string): string {
  const key = roleTitle.trim().toLowerCase().replace(/\s+/g, '_');
  if (EXECUTIVE_ROLE_LABELS[key]) return EXECUTIVE_ROLE_LABELS[key]!;
  return formatBillLabelText(roleTitle.replace(/_/g, ' '));
}

/** Kentucky capitol switchboard numbers shared across many Open States rows — not a direct line. */
const GENERIC_CAPITOL_PHONE_DIGITS = new Set(['5025648100', '8003727181']);

export function isGenericCapitolPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const digits = phone.replace(/\D/g, '');
  return GENERIC_CAPITOL_PHONE_DIGITS.has(digits);
}

/** Phone safe to show as a legislator direct line; null when missing or generic switchboard. */
export function legislatorDisplayPhone(phone: string | null | undefined): string | null {
  if (!phone || isGenericCapitolPhone(phone)) return null;
  return phone;
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
  if (rt) {
    return normalizeChamberTitleForDisplay(leg, normalizeExecutiveRoleTitle(rt));
  }
  if (leg.chamber === 'house') return 'Representative';
  if (leg.chamber === 'senate') return 'Senator';
  return 'Statewide official';
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
