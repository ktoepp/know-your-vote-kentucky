/**
 * Session labels aligned with LRC / Open States naming and used in `ky_bills.session`.
 * Update when a new regular session is added.
 */
import { formatCivicDate } from '@/lib/civic-date';

export const KY_SESSIONS = [
  { name: '2026 Regular Session', start: '2026-01-06', end: '2026-04-15', type: 'regular' as const },
  { name: '2025 Regular Session', start: '2025-01-07', end: '2025-04-15', type: 'regular' as const },
];

export type KYSessionType = 'regular' | 'special';
export type KYSession = (typeof KY_SESSIONS[number]) | { name: string; start: string; end: string; type: KYSessionType };

/**
 * All session names present in `ky_bills.session`, newest first. Used to populate
 * filter dropdowns (`/bills`, `/search`). Kept separate from `KY_SESSIONS` because
 * older sessions don't need date windows — just labels to filter by. Append a new
 * entry when a new session is seeded; the dropdown also falls back to whatever
 * the data layer surfaces so a missed update never silently drops a session.
 */
export const KY_BILL_SESSION_OPTIONS: readonly string[] = [
  '2026 Regular Session',
  '2025 Regular Session',
  '2024 Regular Session',
  '2023 Regular Session',
  '2022 Special Session',
  '2022 Regular Session',
  '2021 Special Session',
  '2021 Regular Session',
  '2020 Regular Session',
  '2019 Special Session',
  '2019 Regular Session',
  '2018 Special Session',
  '2018 Regular Session',
  '2017 Regular Session',
  '2016 Regular Session',
  '2015 Regular Session',
  '2014 Regular Session',
  '2013 Special Session',
  '2013 Regular Session',
  '2012 Special Session',
  '2012 Regular Session',
  '2011 Special Session',
  '2011 Regular Session',
  '2010 Special Session',
  '2010 Regular Session',
];

/** True when `value` is a known session label (or empty string = "All sessions"). */
export function isKnownKyBillSession(value: string | null | undefined): value is string {
  if (!value) return false;
  return KY_BILL_SESSION_OPTIONS.includes(value);
}

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
    'In even-numbered years the General Assembly meets for up to 60 legislative days and must adjourn by April 15 — ' +
    'these are the budget sessions. In odd-numbered years it meets for up to 30 legislative days, adjourning by March 30. ' +
    'Most bills can only be introduced and passed during this window.',
  special:
    'A special session is called by the Governor — or by petition of 3/5 of the members of each chamber — ' +
    'outside the regular annual schedule. Business is limited to topics specified in the call. ' +
    'Special sessions are typically brief and focused on urgent or time-sensitive matters.',
};

function fmtSessionDate(iso: string): string {
  return formatCivicDate(iso) ?? iso;
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
