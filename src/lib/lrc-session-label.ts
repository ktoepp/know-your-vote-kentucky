/**
 * Normalize LRC agenda session labels to `ky_bills.session` values.
 * e.g. "2024 Regular Session" ↔ case/whitespace variants.
 */

export function normalizeKySessionLabel(label: string | null | undefined): string {
  return (label ?? '').replace(/\s+/g, ' ').trim();
}

/** Compact bill token for joins (HB 6 and HB6 → HB6). */
export function normalizeBillNumberForLookup(billNumber: string): string {
  return billNumber.replace(/\s+/g, '').trim().toUpperCase();
}

/** Match key for bill + session lookups */
export function billSessionLookupKey(billNumber: string, sessionLabel: string | null): string {
  const bn = normalizeBillNumberForLookup(billNumber);
  const sess = normalizeKySessionLabel(sessionLabel).toLowerCase();
  return `${bn}|${sess}`;
}
