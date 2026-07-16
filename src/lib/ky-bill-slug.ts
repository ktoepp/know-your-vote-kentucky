import { normalizeKyBillDesignation } from '@/lib/bill-display';

/**
 * Canonical bill URL slugs (ICP review F4). Bills have no slug column; the slug is
 * derived from `bill_number` + `session`, which uniquely identify a bill and follow
 * stable formats ("HB208", "2026 Regular Session") — so it parses both ways with no
 * schema change: HB208 + "2026 Regular Session" ⇄ "hb208-2026rs".
 *
 * UUID and bare-bill-number URLs keep resolving and 308 to the slug, so old links,
 * sitemap entries, and digest emails never break.
 */

const SESSION_LABEL_RE = /^(\d{4})\s+(Regular|Special)\s+Session$/i;
const SLUG_RE = /^([a-z]{1,4}\d{1,5})-(\d{4})(rs|ss)$/i;

export type KyBillSlugParts = {
  /** Normalized designation, e.g. "HB208". */
  billNumber: string;
  /** Session label as stored in `ky_bills.session`, e.g. "2026 Regular Session". */
  session: string;
};

/**
 * Canonical slug for a bill, or null when it can't be derived (missing/unrecognized
 * session, odd designation) — those bills keep their UUID URLs and never redirect.
 */
export function kyBillSlug(bill: { bill_number: string; session?: string | null }): string | null {
  const bn = normalizeKyBillDesignation(bill.bill_number).toLowerCase();
  if (!/^[a-z]{1,4}\d{1,5}$/.test(bn)) return null;
  const m = SESSION_LABEL_RE.exec((bill.session ?? '').trim());
  if (!m) return null;
  return `${bn}-${m[1]}${m[2]!.toLowerCase() === 'special' ? 'ss' : 'rs'}`;
}

/** Parse a slug back to its bill number + session label; null when `raw` isn't a slug. */
export function parseKyBillSlug(raw: string): KyBillSlugParts | null {
  const m = SLUG_RE.exec(raw.trim());
  if (!m) return null;
  return {
    billNumber: m[1]!.toUpperCase(),
    session: `${m[2]} ${m[3]!.toLowerCase() === 'ss' ? 'Special' : 'Regular'} Session`,
  };
}

/** Preferred bill detail path: slug when derivable, UUID otherwise. */
export function kyBillPath(bill: { id: string; bill_number: string; session?: string | null }): string {
  return `/bills/${kyBillSlug(bill) ?? bill.id}`;
}
