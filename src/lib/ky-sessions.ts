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
  /**
   * Default effective date for this session's acts — 90 days after sine die per
   * Ky. Const. §55, as published by the Attorney General. Store the published
   * date, don't derive it: the AG's day-counting convention differs from naive
   * sineDie + 90. Leave undefined until the AG opinion (or LRC notice) is out.
   */
  actsEffectiveDate?: string;
}

export interface KYSessionRecord {
  name: string;
  start: string;
  end: string;
  type: KYSessionType;
  /**
   * Why a special (extraordinary) session was called — the Governor's or
   * petition's stated subject. Regular sessions leave this undefined.
   */
  subject?: string;
  milestones?: KYSessionMilestones;
}

/**
 * Newest first — `KY_SESSIONS[0]` must stay the current/most-recent session
 * (used by `getCivicDataSessionName`, `guideDescription`, etc.).
 *
 * Historical dates (2010–2024) were researched from official Kentucky sources —
 * LRC Informational Bulletins ("General Assembly Action" per session), LRC
 * legislative-record filenames, and the LRC session calendars — cross-checked
 * against secondary references (Ballotpedia, Wikipedia) and Kentucky's
 * constitutional convening rule (regular sessions convene the first Tuesday
 * after the first Monday of January). Only dates confirmable to a day are
 * included. Deliberately omitted because their exact dates could not be
 * confirmed from a reliable source (better absent than wrong): the 2011 Regular
 * Session's sine die, and the 2011 and 2012 Special Sessions — these session
 * labels still exist for bill filtering in `KY_BILL_SESSION_OPTIONS`.
 */
export const KY_SESSIONS: KYSessionRecord[] = [
  {
    name: '2026 Regular Session',
    start: '2026-01-06',
    end: '2026-04-15',
    type: 'regular',
    milestones: {
      // Concurrence days: Mar 31–Apr 1; veto recess Apr 2–13; reconvened Apr 14–15.
      // Source: LRC session calendar (legislature.ky.gov/Documents/RS_Calendar.pdf, updated 04.13.26).
      vetoRecessStart: '2026-04-02',
      vetoRecessEnd: '2026-04-14',
      sineDie: '2026-04-15',
      // AG opinion confirms July 15, 2026 for acts of the 2026 RS.
      actsEffectiveDate: '2026-07-15',
    },
  },
  { name: '2025 Regular Session', start: '2025-01-07', end: '2025-04-15', type: 'regular' },
  { name: '2024 Regular Session', start: '2024-01-02', end: '2024-04-15', type: 'regular' },
  { name: '2023 Regular Session', start: '2023-01-03', end: '2023-03-30', type: 'regular' },
  {
    name: '2022 Special Session',
    start: '2022-08-24',
    end: '2022-08-26',
    type: 'special',
    subject: 'Eastern Kentucky flood relief after the July 2022 floods.',
  },
  { name: '2022 Regular Session', start: '2022-01-04', end: '2022-04-14', type: 'regular' },
  {
    name: '2021 Special Session',
    start: '2021-09-07',
    end: '2021-09-09',
    type: 'special',
    subject: 'COVID-19 response — state of emergency, school flexibility, and federal relief funds.',
  },
  { name: '2021 Regular Session', start: '2021-01-05', end: '2021-03-30', type: 'regular' },
  { name: '2020 Regular Session', start: '2020-01-07', end: '2020-04-15', type: 'regular' },
  {
    name: '2019 Special Session',
    start: '2019-07-19',
    end: '2019-07-24',
    type: 'special',
    subject: 'Pension relief for quasi-governmental agencies (regional universities, health departments).',
  },
  { name: '2019 Regular Session', start: '2019-01-08', end: '2019-03-28', type: 'regular' },
  {
    name: '2018 Special Session',
    start: '2018-12-17',
    end: '2018-12-18',
    type: 'special',
    subject: 'Public-pension reform (adjourned without passing a pension bill).',
  },
  { name: '2018 Regular Session', start: '2018-01-02', end: '2018-04-14', type: 'regular' },
  { name: '2017 Regular Session', start: '2017-01-03', end: '2017-03-30', type: 'regular' },
  { name: '2016 Regular Session', start: '2016-01-05', end: '2016-04-15', type: 'regular' },
  { name: '2015 Regular Session', start: '2015-01-06', end: '2015-03-25', type: 'regular' },
  { name: '2014 Regular Session', start: '2014-01-07', end: '2014-04-15', type: 'regular' },
  {
    name: '2013 Special Session',
    start: '2013-08-19',
    end: '2013-08-23',
    type: 'special',
    subject: 'Legislative redistricting of the House and Senate districts.',
  },
  { name: '2013 Regular Session', start: '2013-01-08', end: '2013-03-26', type: 'regular' },
  { name: '2012 Regular Session', start: '2012-01-03', end: '2012-04-12', type: 'regular' },
  {
    name: '2010 Special Session',
    start: '2010-05-24',
    end: '2010-05-29',
    type: 'special',
    subject: 'State budget — enacted the FY2010–2012 budget after the regular session adjourned without one.',
  },
  { name: '2010 Regular Session', start: '2010-01-05', end: '2010-04-15', type: 'regular' },
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

/**
 * True when the named session's sine die (or end) date has passed.
 * Returns false for unknown session names so we never silently mislabel bills.
 */
export function sessionHasEnded(sessionName: string | null | undefined, asOf: Date = new Date()): boolean {
  if (!sessionName) return false;
  const normalized = sessionName.trim();
  const session = KY_SESSIONS.find((s) => s.name.toLowerCase() === normalized.toLowerCase());
  if (!session) return false;
  const cutoff = session.milestones?.sineDie ?? session.end;
  return atNoon(asOf.toISOString().slice(0, 10)) > atEndOfDay(cutoff);
}

/**
 * Default effective date (ISO) for acts from the named session, when confirmed.
 * Null for unknown sessions or sessions without a published date — callers should
 * show nothing rather than compute their own 90-day math (see `actsEffectiveDate`).
 */
export function getKySessionActsEffectiveDate(sessionName: string | null | undefined): string | null {
  if (!sessionName) return null;
  const normalized = sessionName.trim().toLowerCase();
  const session = KY_SESSIONS.find((s) => s.name.toLowerCase() === normalized);
  return session?.milestones?.actsEffectiveDate ?? null;
}

/** Ongoing window → that session; otherwise the most recent session (for bill/vote display). */
export function getCivicDataSessionName(asOf: Date = new Date()): string {
  return (getActiveSession(asOf) ?? KY_SESSIONS[0]!).name;
}

export const SESSION_TYPE_DESCRIPTIONS: Record<KYSessionType, string> = {
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
