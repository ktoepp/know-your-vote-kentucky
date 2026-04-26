/**
 * Canonical external URLs for Kentucky legislation, LegiScan, and Ballotpedia.
 * LegiScan public roll call pages are stable; Ballotpedia rarely has per-vote URLs, so we use search when needed.
 */

const KY_STATE = 'KY';

/** “HB 6”, “hb 6” -> “HB6” (LegiScan /rollcall/ path segment). */
export function legiscanBillPathSlug(billNumber: string | null | undefined): string {
  return String(billNumber ?? '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase();
}

/**
 * Public LegiScan page for a roll call (per-member vote list).
 * @see https://legiscan.com/KY/rollcall/HB6/id/123 (pattern matches other states on legiscan.com)
 */
export function legiscanRollCallPublicUrl(
  billNumber: string | null | undefined,
  rollCallId: number,
): string {
  const slug = legiscanBillPathSlug(billNumber);
  return `https://legiscan.com/${KY_STATE}/rollcall/${encodeURIComponent(slug)}/id/${rollCallId}`;
}

/**
 * Ballotpedia has no reliable per–roll-call deep link. Search narrows to this bill and vote context.
 */
export function ballotpediaKyVoteSearchUrl(
  billNumber: string | null | undefined,
  voteDesc: string,
  voteDate: string,
): string {
  const bill = String(billNumber ?? '').trim();
  const desc = (voteDesc || '').replace(/\s+/g, ' ').trim().slice(0, 100);
  const q = [bill, 'Kentucky', 'roll call', voteDate, desc].filter(Boolean).join(' ');
  return `https://ballotpedia.org/Special:Search?search=${encodeURIComponent(q)}`;
}

/**
 * Broader bill search (member cards, when no direct Ballotpedia slug exists for a person).
 * Keeps the same entry point the app already used; "Kentucky" improves relevance.
 */
export function ballotpediaMemberSearchUrl(displayName: string): string {
  const q = encodeURIComponent(`${displayName.trim()} Kentucky`);
  return `https://ballotpedia.org/Special:Search?search=${q}`;
}

/**
 * Ballotpedia may store a full URL, a path, or a wiki title slug. Always return an https URL.
 */
export function normalizeBallotpediaHref(value: string | null | undefined): string | null {
  const s = (value ?? '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (s.startsWith('//')) return `https:${s}`;
  return `https://ballotpedia.org/${s.replace(/^\/+/, '')}`;
}
