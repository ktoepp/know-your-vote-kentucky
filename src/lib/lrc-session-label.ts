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

/**
 * When an agenda line names a bill with no session ("SB 58: …"), the LRC
 * convention is that it refers to the most recent regular session — which
 * for KY is always the current calendar year's `RS`. Interim committees
 * reviewing enacted bills use this shorthand constantly.
 */
export function inferSessionLabelFromMeetingDate(
  meetingDate: string | null | undefined,
): string | null {
  const m = /^(\d{4})-\d{2}-\d{2}/.exec(meetingDate ?? '');
  if (!m) return null;
  return `${m[1]} Regular Session`;
}
