/**
 * Canonical external URLs for Kentucky legislation, LegiScan, and Ballotpedia.
 * LegiScan public roll call pages are stable; Ballotpedia rarely has per-vote URLs, so we use search when needed.
 */

import { normalizeHttpsUrl } from './legislator-link-normalize';

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
 * Direct LegiScan person page.
 * @see https://legiscan.com/people/id/123
 */
export function legiscanPersonUrl(legiscanId: number): string {
  return `https://legiscan.com/people/id/${legiscanId}`;
}

/**
 * Ballotpedia may store a full URL, a path, or a wiki title slug. Always return an https URL.
 */
export function normalizeBallotpediaHref(value: string | null | undefined): string | null {
  let s = (value ?? '').trim();
  if (!s) return null;
  s = s.replace(/^Ballotpedia:\s*/i, '').trim();
  if (/^https?:\/\//i.test(s)) {
    const n = normalizeHttpsUrl(s);
    return n ?? s;
  }
  if (s.startsWith('//')) return normalizeHttpsUrl(`https:${s}`);
  const path = s.replace(/^\/+/, '');
  return `https://ballotpedia.org/${path}`;
}

/**
 * Store a compact wiki title path in DB (LegiScan enrichment). Full URLs are stripped to pathname after wiki/.
 */
export function normalizeBallotpediaForStorage(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) {
    const n = normalizeHttpsUrl(raw);
    if (!n) return null;
    try {
      const u = new URL(n);
      const host = u.hostname.replace(/^www\./i, '').toLowerCase();
      if (!host.endsWith('ballotpedia.org')) return n;
      let p = u.pathname.replace(/^\/+|\/+$/g, '');
      if (p.toLowerCase().startsWith('wiki/')) p = p.slice(5);
      return p || null;
    } catch {
      return raw;
    }
  }
  return raw.replace(/^wiki\//i, '').replace(/^\/+/, '');
}
