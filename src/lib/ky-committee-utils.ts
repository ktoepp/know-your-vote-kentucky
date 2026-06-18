import type { KYBill } from '@/types/kentucky';

/** URL / filter slug from a committee display name (stable across reloads). */
export function committeeSlugFromName(name: string | null | undefined): string {
  return (name || '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalize a committee name for near-duplicate comparison: lowercase, expand
 * `&`, strip punctuation, and depluralize each token (so regulation/regulations
 * collapse). Shared by the duplicate diagnostic (`diagnose-committee-duplicates`)
 * and the committees accuracy checker so both flag the same pairs.
 */
export function normalizeCommitteeNameForDupes(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((tok) => (tok.length > 3 && tok.endsWith('s') ? tok.slice(0, -1) : tok))
    .join(' ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Static KY General Assembly standing committees
// Names follow LegiScan conventions where known; phrase matching handles variants.
// ─────────────────────────────────────────────────────────────────────────────

export interface KyStaticCommittee {
  name: string;
  chamber: 'house' | 'senate' | 'joint';
}

export const KY_STATIC_COMMITTEES: KyStaticCommittee[] = [
  // House standing committees
  { name: 'Appropriations & Revenue (H)', chamber: 'house' },
  { name: 'Banking & Insurance (H)', chamber: 'house' },
  { name: 'Economic Development & Workforce Investment (H)', chamber: 'house' },
  { name: 'Education (H)', chamber: 'house' },
  { name: 'Elections, Constitutional Amendments & Intergovernmental Affairs (H)', chamber: 'house' },
  { name: 'Families & Children (H)', chamber: 'house' },
  { name: 'Health Services (H)', chamber: 'house' },
  { name: 'Judiciary (H)', chamber: 'house' },
  { name: 'Labor & Industry (H)', chamber: 'house' },
  { name: 'Licensing, Occupations & Administrative Regulations (H)', chamber: 'house' },
  { name: 'Local Government (H)', chamber: 'house' },
  { name: 'Natural Resources & Energy (H)', chamber: 'house' },
  { name: 'Small Business & Information Technology (H)', chamber: 'house' },
  { name: 'State Government (H)', chamber: 'house' },
  { name: 'Tourism & Outdoor Recreation (H)', chamber: 'house' },
  { name: 'Transportation (H)', chamber: 'house' },
  { name: 'Veterans, Military Affairs & Public Protection (H)', chamber: 'house' },

  // Senate standing committees
  { name: 'Agriculture (S)', chamber: 'senate' },
  { name: 'Appropriations & Revenue (S)', chamber: 'senate' },
  { name: 'Banking & Insurance (S)', chamber: 'senate' },
  { name: 'Economic Development, Tourism & Labor (S)', chamber: 'senate' },
  { name: 'Education (S)', chamber: 'senate' },
  { name: 'Elections, Constitutional Amendments & Intergovernmental Affairs (S)', chamber: 'senate' },
  { name: 'Families & Children\'s Services (S)', chamber: 'senate' },
  { name: 'Health & Welfare (S)', chamber: 'senate' },
  { name: 'Judiciary (S)', chamber: 'senate' },
  { name: 'Licensing, Occupations & Administrative Regulations (S)', chamber: 'senate' },
  { name: 'Local Government (S)', chamber: 'senate' },
  { name: 'Natural Resources & Energy (S)', chamber: 'senate' },
  { name: 'State & Local Government (S)', chamber: 'senate' },
  { name: 'Transportation (S)', chamber: 'senate' },
  { name: 'Veterans, Military Affairs & Public Protection (S)', chamber: 'senate' },

  // Interim joint committees (meet between sessions)
  { name: 'Interim Joint Committee on Agriculture & Natural Resources', chamber: 'joint' },
  { name: 'Interim Joint Committee on Appropriations & Revenue', chamber: 'joint' },
  { name: 'Interim Joint Committee on Banking & Insurance', chamber: 'joint' },
  { name: 'Interim Joint Committee on Economic Development & Workforce Investment', chamber: 'joint' },
  { name: 'Interim Joint Committee on Education', chamber: 'joint' },
  { name: 'Interim Joint Committee on Health Services', chamber: 'joint' },
  { name: 'Interim Joint Committee on Judiciary', chamber: 'joint' },
  { name: 'Interim Joint Committee on Labor & Industry', chamber: 'joint' },
  { name: 'Interim Joint Committee on Local Government', chamber: 'joint' },
  { name: 'Interim Joint Committee on Natural Resources & Energy', chamber: 'joint' },
  { name: 'Interim Joint Committee on State Government', chamber: 'joint' },
  { name: 'Interim Joint Committee on Transportation', chamber: 'joint' },
  { name: 'Interim Joint Committee on Veterans, Military Affairs & Public Protection', chamber: 'joint' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Matching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Keywords drawn from a committee slug for fuzzy last_action / title matching.
 * Maps the slug's first meaningful word (or pairs) to a short phrase to look for.
 * Keeps false-positive rate low by requiring the phrase to appear verbatim.
 */
function keywordsForSlug(slug: string): string[] {
  const phrase = slug.replace(/-/g, ' ').replace(/\s+\(?[hs]\)?\s*$/, '').trim();
  if (!phrase || phrase.length < 4) return [];
  return [phrase];
}

/**
 * Extract committee-like organization slugs from Open States Popolo `roles[]` when present.
 * Used during legislator sync; keeps tokens aligned with {@link committeeSlugFromName}.
 */
export function extractCommitteeMembershipSlugsFromOpenStatesPerson(leg: unknown): string[] {
  const raw = leg as Record<string, unknown>;
  const roles = raw.roles;
  if (!Array.isArray(roles)) return [];
  const slugs = new Set<string>();
  for (const r of roles) {
    if (!r || typeof r !== 'object') continue;
    const ro = r as Record<string, unknown>;
    const org = ro.organization;
    let orgName = '';
    if (typeof org === 'string') orgName = org;
    else if (org && typeof org === 'object') {
      const n = (org as Record<string, unknown>).name;
      orgName = typeof n === 'string' ? n : '';
    }
    const lower = orgName.toLowerCase();
    if (!lower.includes('committee') && !lower.includes('commission')) continue;
    const slug = committeeSlugFromName(orgName);
    if (slug.length >= 4) slugs.add(slug);
  }
  return [...slugs];
}

/**
 * Like extractCommitteeMembershipSlugsFromOpenStatesPerson but resolves each OS organization name
 * to a canonical ky_committees.slug using the provided map.
 * Map keys: committeeSlugFromName(committee.name) → value: committee.slug.
 * Drops org names that don't resolve to a known committee — the false-positive guard that prevents
 * transient bodies, subcommittees, and commissions from polluting committee_memberships.
 * TODO: once all DB rows carry canonical slugs (post-sync), committeeMembershipSlugMatchesFilter
 * can be simplified to exact equality comparison.
 */
export function extractCanonicalCommitteeSlugsFromOpenStatesPerson(
  leg: unknown,
  canonicalMap: Map<string, string>, // committeeSlugFromName(name) → db slug
): string[] {
  const raw = extractCommitteeMembershipSlugsFromOpenStatesPerson(leg);
  if (!raw.length) return [];
  const resolved = new Set<string>();
  for (const osSlug of raw) {
    const direct = canonicalMap.get(osSlug);
    if (direct) { resolved.add(direct); continue; }
    // Strip "committee-on-" prefix (Open States Popolo convention for KY standing committees)
    const stripped = osSlug.replace(/^committee-on-/, '');
    const strippedMatch = canonicalMap.get(stripped);
    if (strippedMatch) { resolved.add(strippedMatch); continue; }
    // Substring scan: catch minor name variants and "(H)"/"(S)" suffix differences
    const osPhrase = osSlug.replace(/-/g, ' ');
    for (const [canonKey, canonSlug] of canonicalMap) {
      const canonPhrase = canonKey.replace(/-/g, ' ');
      if (canonPhrase.length >= 8 && osPhrase.includes(canonPhrase)) {
        resolved.add(canonSlug);
        break;
      }
    }
    // No match → silently dropped (transient, subcommittee, or non-standing body)
  }
  return [...resolved];
}

/** Loose slug match for comparing synced membership tokens to browse/search committee filter slugs. */
export function committeeMembershipSlugMatchesFilter(memberSlug: string, filterSlug: string): boolean {
  const f = filterSlug.trim().toLowerCase();
  const m = memberSlug.trim().toLowerCase();
  if (!f || !m) return false;
  if (m === f) return true;
  const fPhrase = f.replace(/-/g, ' ');
  const mPhrase = m.replace(/-/g, ' ');
  if (fPhrase.length >= 5 && mPhrase.includes(fPhrase)) return true;
  if (mPhrase.length >= 5 && fPhrase.includes(mPhrase)) return true;
  return false;
}

/**
 * `committeeSlug` is from the filter UI (slug of a LegiScan committee name or a static committee).
 * Tries exact slug match on `committee_name` first, then phrase search in last_action / title.
 */
export function billMatchesCommitteeFilter(
  bill: Pick<KYBill, 'committee_name' | 'last_action' | 'title'>,
  committeeSlug: string | null | undefined,
): boolean {
  if (committeeSlug == null || String(committeeSlug).trim() === '') return true;
  const want = String(committeeSlug).trim().toLowerCase();
  const billSlug = committeeSlugFromName(bill.committee_name);

  // Exact slug match (populated committee_name)
  if (billSlug === want) return true;

  // Substring slug match (handles minor name variants)
  const nameLower = (bill.committee_name || '').toLowerCase();
  const wantPhrase = want.replace(/-/g, ' ');
  if (nameLower && wantPhrase.length >= 4 && nameLower.includes(wantPhrase)) return true;

  // Fallback: search last_action text for the committee's core phrase
  const keywords = keywordsForSlug(want);
  const searchTarget = [
    (bill.last_action || '').toLowerCase(),
    (bill.title || '').toLowerCase(),
  ].join(' ');
  return keywords.some((kw) => kw.length >= 4 && searchTarget.includes(kw));
}
