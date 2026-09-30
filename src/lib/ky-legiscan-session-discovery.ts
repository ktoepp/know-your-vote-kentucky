/**
 * Picking Kentucky sessions out of LegiScan's `getSessionList`.
 *
 * No session id is hard-coded anywhere: LegiScan assigns the id when it creates
 * the session (usually a few weeks before it convenes), and every sync resolves
 * it from the list at run time. The window between "LRC has posted the calendar"
 * and "LegiScan lists the session and has bills for it" is an expected state,
 * not a fault — callers log it and carry on with the previous session.
 */
import type { LegiScanSession } from './ky-legiscan-client';

/** Newest first: `year_end` desc, then `session_id` desc so same-year ties are stable. */
export function sortKySessionsNewestFirst<T extends Pick<LegiScanSession, 'year_end' | 'session_id'>>(
  sessions: readonly T[],
): T[] {
  return [...sessions].sort(
    (a, b) => (b.year_end || 0) - (a.year_end || 0) || (b.session_id || 0) - (a.session_id || 0),
  );
}

/** "2027 Regular Session" → `{ year: 2027, special: false }`; null for labels we don't recognise. */
export function parseKySessionName(name: string | null | undefined): { year: number; special: boolean } | null {
  const m = /^(\d{4})\s+(Regular|Special|Extraordinary)\s+Session$/i.exec((name ?? '').trim());
  if (!m) return null;
  return { year: Number(m[1]), special: m[2]!.toLowerCase() !== 'regular' };
}

/**
 * The LegiScan session matching a `ky_bills.session` label. Matches on the name
 * first, then on year + regular/special, because LegiScan has carried a session
 * under a working title before settling on the final one.
 */
export function findLegiscanSessionByName<T extends LegiScanSession>(
  sessions: readonly T[],
  sessionName: string,
): T | null {
  const wanted = sessionName.trim().toLowerCase();
  const exact = sessions.find((s) => (s.session_name || '').trim().toLowerCase() === wanted);
  if (exact) return exact;
  const parsed = parseKySessionName(sessionName);
  if (!parsed) return null;
  const candidates = sortKySessionsNewestFirst(
    sessions.filter(
      (s) => (s.year_end || s.year_start) === parsed.year && Boolean(s.special) === parsed.special,
    ),
  );
  return candidates[0] ?? null;
}

/**
 * Roster of the newest session that has one. A freshly created session has no
 * people until LegiScan loads its roster, so fall back to the session before it
 * rather than treating every legislator as unknown. Checks at most
 * `maxSessions` sessions — one extra `getSessionPeople` per run during the gap.
 */
export async function fetchLatestNonEmptySessionRoster<S extends LegiScanSession, P>(
  sessions: readonly S[],
  getSessionPeople: (sessionId: number) => Promise<P[]>,
  maxSessions: number = 2,
): Promise<{ session: S; people: P[] } | null> {
  for (const session of sortKySessionsNewestFirst(sessions).slice(0, maxSessions)) {
    const people = await getSessionPeople(session.session_id);
    if (people.length) return { session, people };
  }
  return null;
}

export type KySessionAvailability =
  /** LegiScan has not created the session yet. */
  | { state: 'not_listed' }
  /** Listed, but its master list has no bills yet. */
  | { state: 'listed_empty'; session: LegiScanSession }
  | { state: 'ready'; session: LegiScanSession; billCount: number };

export function describeKySessionAvailability(sessionName: string, a: KySessionAvailability): string {
  switch (a.state) {
    case 'not_listed':
      return `${sessionName} is not on LegiScan's session list yet — expected before it convenes; nothing to sync`;
    case 'listed_empty':
      return `${sessionName} is listed (session_id ${a.session.session_id}) but has no bills yet — expected before it convenes; nothing to sync`;
    case 'ready':
      return `${sessionName} is listed (session_id ${a.session.session_id}) with ${a.billCount} bill(s)`;
  }
}
