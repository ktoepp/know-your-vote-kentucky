/**
 * Session labels aligned with LRC / Open States naming and used in `ky_bills.session`.
 * Update when a new regular session is added.
 */
export const KY_SESSIONS = [
  { name: '2026 Regular Session', start: '2026-01-06', end: '2026-04-15', type: 'regular' as const },
  { name: '2025 Regular Session', start: '2025-01-07', end: '2025-04-15', type: 'regular' as const },
];

export type KYSessionType = 'regular' | 'special';
export type KYSession = (typeof KY_SESSIONS[number]) | { name: string; start: string; end: string; type: KYSessionType };

/** Returns the currently active session, or null if today is outside all session windows. */
export function getActiveSession(asOf: Date = new Date()): typeof KY_SESSIONS[number] | null {
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

const SESSION_TYPE_DESCRIPTIONS: Record<KYSessionType, string> = {
  regular:
    'A regular session convenes each January under the Kentucky Constitution. ' +
    'The General Assembly meets for up to 60 legislative days: 30 days in even-numbered years (budget years) ' +
    'and up to 60 days in odd-numbered years. Most bills can only be introduced and passed during this window.',
  special:
    'A special session is called by the Governor — or by petition of 3/5 of the members of each chamber — ' +
    'outside the regular annual schedule. Business is limited to topics specified in the call. ' +
    'Special sessions are typically brief and focused on urgent or time-sensitive matters.',
};

function fmtSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

export interface SessionTooltipContent {
  title: string;
  content: string;
}

/**
 * Returns tooltip content for a session name string (e.g. "2026 Regular Session").
 * Matches against KY_SESSIONS by name (case-insensitive trim).
 * Falls back to a generic description when the name isn't in KY_SESSIONS.
 */
export function getSessionTooltip(sessionName: string | null | undefined): SessionTooltipContent | null {
  if (!sessionName) return null;
  const normalized = sessionName.trim();
  const known = KY_SESSIONS.find((s) => s.name.toLowerCase() === normalized.toLowerCase());

  if (known) {
    const typeDesc = SESSION_TYPE_DESCRIPTIONS[known.type];
    return {
      title: known.name,
      content:
        `${fmtSessionDate(known.start)} – ${fmtSessionDate(known.end)}\n\n${typeDesc}`,
    };
  }

  // Unknown session name: infer type from the label text
  const lower = normalized.toLowerCase();
  const isSpecial = lower.includes('special') || lower.includes('extraordinary');
  const typeDesc = isSpecial
    ? SESSION_TYPE_DESCRIPTIONS.special
    : SESSION_TYPE_DESCRIPTIONS.regular;
  return {
    title: normalized,
    content: typeDesc,
  };
}
