export interface KYSession {
  name: string;
  start: string;
  end: string;
  type: 'regular' | 'special';
}

/** Update when a new session begins. Ordered most-recent first. */
export const KY_SESSIONS: KYSession[] = [
  { name: '2026 Regular Session', start: '2026-01-06', end: '2026-04-15', type: 'regular' },
  { name: '2025 Regular Session', start: '2025-01-07', end: '2025-04-15', type: 'regular' },
];

/**
 * Returns the name of the currently active session, or the most recent session
 * if none is currently active.
 */
export function getCivicDataSessionName(): string {
  return getActiveSessionInfo().session.name;
}

/** Returns the current (or most recent) session and whether it is active today. */
export function getActiveSessionInfo(): { session: KYSession; isActive: boolean } {
  const today = new Date();
  const active = KY_SESSIONS.find(s => {
    const start = new Date(s.start);
    const end = new Date(s.end);
    return today >= start && today <= end;
  });
  return { session: active ?? KY_SESSIONS[0], isActive: !!active };
}
