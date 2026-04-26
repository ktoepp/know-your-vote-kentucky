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
 * Legacy search slugs from before `committee_name` was synced — keyword match on action/title/name.
 * Prefer {@link committeeSlugFromName} equality when `committee_name` is populated.
 */
const LEGACY_COMMITTEE_SLUG_HINTS: Record<string, string> = {
  appropriations: 'appropriation',
  budget: 'budget',
  finance: 'finance',
  'foreign-relations': 'foreign',
  judiciary: 'judiciary',
};

/**
 * `committeeSlug` is from the filter UI (slug of LegiScan committee name or a legacy key).
 */
export function billMatchesCommitteeFilter(
  bill: Pick<KYBill, 'committee_name' | 'last_action' | 'title'>,
  committeeSlug: string | null | undefined,
): boolean {
  if (committeeSlug == null || String(committeeSlug).trim() === '') return true;
  const want = String(committeeSlug).trim().toLowerCase();
  const billSlug = committeeSlugFromName(bill.committee_name);
  if (billSlug === want) return true;

  const nameLower = (bill.committee_name || '').toLowerCase();
  const phrase = want.replace(/-/g, ' ');
  if (nameLower && phrase.length >= 2 && nameLower.includes(phrase)) return true;

  const hint = LEGACY_COMMITTEE_SLUG_HINTS[want];
  if (hint) {
    const h = hint.toLowerCase();
    return (
      nameLower.includes(h) ||
      (bill.last_action || '').toLowerCase().includes(h) ||
      (bill.title || '').toLowerCase().includes(h)
    );
  }
  return false;
}
