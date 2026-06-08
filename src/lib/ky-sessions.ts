/**
 * Session labels aligned with LRC / Open States naming and used in `ky_bills.session`.
 * Update when a new regular session is added.
 *
 * `milestones` is optional per-session: when present, the banner + phase helpers can
 * name the veto-recess window and final override days. Fill in from LRC's published
 * session calendar (legislature.ky.gov posts annually); leave undefined when the
 * exact dates aren't confirmed and copy will gracefully fall back to start/end only.
 */
import { formatCivicDate } from '@/lib/civic-date';

export type KYSessionType = 'regular' | 'special';

export interface KYSessionMilestones {
  /** First day chambers are recessed for the governor's 10-day veto window. */
  vetoRecessStart?: string;
  /** Day chambers reconvene for veto-override consideration (= start of final days). */
  vetoRecessEnd?: string;
  /** Final sine die adjournment. Often equals session.end. */
  sineDie?: string;
}

export interface KYSessionRecord {
  name: string;
  start: string;
  end: string;
  type: KYSessionType;
  milestones?: KYSessionMilestones;
}

export const KY_SESSIONS: KYSessionRecord[] = [
  // 2026 RS `milestones` left undefined pending LRC publication of the session-calendar joint resolution; see decisions.md § 2026-06-07.
  { name: '2026 Regular Session', start: '2026-01-06', end: '2026-04-15', type: 'regular' },
  { name: '2025 Regular Session', start: '2025-01-07', end: '2025-04-15', type: 'regular' },
];

export type KYSession = KYSessionRecord;

function atNoon(iso: string): Date {
  const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!ymd) return new Date(iso);
  return new Date(Date.UTC(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]), 12));
}

function atEndOfDay(iso: string): Date {
  const d = atNoon(iso);
  d.setUTCHours(23, 59, 59, 999);
  return d;
}

function calendarYear(iso: string): number {
  return Number(iso.slice(0, 4));
}

function addDaysIso(iso: string, days: number): string {
  const d = atNoon(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

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
export function getActiveSession(asOf: Date = new Date()): KYSessionRecord | null {
  const today = atNoon(asOf.toISOString().slice(0, 10));
  return KY_SESSIONS.find((s) => today >= atNoon(s.start) && today <= atEndOfDay(s.end)) ?? null;
}

/**
 * High-level "where are we in the legislative cycle?" derived from KY_SESSIONS + milestones.
 *
 * - `in_session`   — within an active session's start/end window.
 * - `veto_recess`  — within `milestones.vetoRecessStart`..`vetoRecessEnd` (requires milestone data).
 * - `final_days`   — after `vetoRecessEnd` and on/before `session.end` (override consideration + sine die).
 * - `interim`      — outside every session window.
 */
export type KYSessionPhase = 'in_session' | 'veto_recess' | 'final_days' | 'interim';

export function getSessionPhase(asOf: Date = new Date()): KYSessionPhase {
  const active = getActiveSession(asOf);
  if (!active) return 'interim';
  const milestones = active.milestones;
  if (!milestones?.vetoRecessStart || !milestones.vetoRecessEnd) return 'in_session';
  const today = atNoon(asOf.toISOString().slice(0, 10));
  const recessStart = atNoon(milestones.vetoRecessStart);
  const recessEnd = atNoon(milestones.vetoRecessEnd);
  if (today >= recessStart && today < recessEnd) return 'veto_recess';
  if (today >= recessEnd) return 'final_days';
  return 'in_session';
}

export interface KYInterimPeriod {
  /** Human label, e.g. "2026 Interim". */
  name: string;
  /** First day of the interim (day after the previous regular session ended). */
  start: string;
  /** Last day of the interim, or null when the next regular session isn't yet scheduled. */
  end: string | null;
  /** The session that just ended, when one is known. */
  previousSession?: KYSessionRecord;
  /** The session whose start day closes this interim, when one is known. */
  nextSession?: KYSessionRecord;
}

/**
 * Returns the named interim window today falls into, or null when a session is active.
 * In Kentucky, "interim" runs from the day after a regular session adjourns until the
 * next regular session convenes; interim joint committees meet during this time.
 */
export function getInterimPeriod(asOf: Date = new Date()): KYInterimPeriod | null {
  if (getActiveSession(asOf)) return null;
  const today = atNoon(asOf.toISOString().slice(0, 10));

  let previous: KYSessionRecord | undefined;
  let next: KYSessionRecord | undefined;
  for (const session of KY_SESSIONS) {
    const end = atEndOfDay(session.end);
    const start = atNoon(session.start);
    if (today > end && (!previous || end > atEndOfDay(previous.end))) previous = session;
    if (today < start && (!next || start < atNoon(next.start))) next = session;
  }

  const start = previous ? addDaysIso(previous.end, 1) : `${calendarYear(asOf.toISOString())}-01-01`;
  const end = next ? addDaysIso(next.start, -1) : null;
  const name = `${calendarYear(start)} Interim`;
  return { name, start, end, previousSession: previous, nextSession: next };
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
