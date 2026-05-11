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
 * Public LegiScan person URL only when `people_id` is a usable positive integer (omit button/link otherwise).
 */
export function legiscanMemberPersonUrl(legiscanId: number | null | undefined): string | null {
  if (legiscanId == null) return null;
  const n = Number(legiscanId);
  if (!Number.isFinite(n) || n !== Math.trunc(n) || n < 1) return null;
  return legiscanPersonUrl(n);
}

/**
 * Use for optional UI buttons when the source may be prose: only http(s) URLs with a non-empty path.
 */
export function httpUrlForUiLink(value: string | null | undefined): string | null {
  const raw = (value ?? '').trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  const href = normalizeHttpsUrl(raw) ?? raw;
  try {
    const u = new URL(href);
    if (!u.hostname) return null;
    const path = u.pathname.replace(/^\/+|\/+$/g, '');
    if (!path) return null;
    return href;
  } catch {
    return null;
  }
}

/**
 * Ballotpedia may store a full URL, a path, or a wiki title slug. Always return an https URL.
 */
export function normalizeBallotpediaHref(value: string | null | undefined): string | null {
  let s = (value ?? '').trim();
  if (!s) return null;
  s = s.replace(/^Ballotpedia:\s*/i, '').trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) {
    const n = normalizeHttpsUrl(s);
    const href = n ?? s;
    try {
      const u = new URL(href);
      const path = u.pathname.replace(/^\/+|\/+$/g, '').replace(/^wiki\//i, '');
      if (!path) return null;
      return href;
    } catch {
      return null;
    }
  }
  if (s.startsWith('//')) {
    const n = normalizeHttpsUrl(`https:${s}`);
    if (!n) return null;
    try {
      const u = new URL(n);
      const path = u.pathname.replace(/^\/+|\/+$/g, '').replace(/^wiki\//i, '');
      if (!path) return null;
      return n;
    } catch {
      return null;
    }
  }
  const path = s.replace(/^\/+/, '').replace(/^wiki\//i, '');
  if (!path) return null;
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
