/**
 * Session labels aligned with LRC / Open States naming and used in `ky_bills.session`.
 * Update when a new regular session is added.
 */
export const KY_SESSIONS = [
  { name: '2026 Regular Session', start: '2026-01-06', end: '2026-04-15', type: 'regular' as const },
  { name: '2025 Regular Session', start: '2025-01-07', end: '2025-04-15', type: 'regular' as const },
];

export type KYSession = typeof KY_SESSIONS[number];

/** Returns the currently active session, or null if today is outside all session windows. */
export function getActiveSession(asOf: Date = new Date()): KYSession | null {
  const today = new Date(asOf);
  today.setHours(12, 0, 0, 0);
  return KY_SESSIONS.find((s) => {
    const start = new Date(s.start);
    const end = new Date(s.end);
    end.setHours(23, 59, 59, 999);
    return today >= start && today <= end;
  }) ?? null;
}

/** Ongoing window → that session; otherwise the most recent session (for bill/vote display). */
export function getCivicDataSessionName(asOf: Date = new Date()): string {
  return (getActiveSession(asOf) ?? KY_SESSIONS[0]!).name;
}
