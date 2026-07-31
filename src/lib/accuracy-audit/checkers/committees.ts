/**
 * Committees accuracy checker — live LRC legislative calendar vs stored
 * `ky_committee_meetings` / `ky_committee_agenda_items`.
 *
 * Verifies, per scheduled meeting on the live calendar:
 *   1. the committee exists in `ky_committees`;
 *   2. a stored meeting row exists for that committee + date, and its
 *      `time_and_location` still matches;
 *   3. every stored agenda row matches what the sync would derive from the live
 *      page — count, order, text, depth, kind, bill number/session, and whether
 *      a named bill actually resolved to a `ky_bill_id`;
 *   4. the stored `ky_bill_id` really points at the bill the line names.
 *
 * Point 3 is the reason this checker exists in its current form. It previously
 * compared only `agenda_content_hash`, which the sync computes from *upstream*
 * text before normalization — so it verified "LRC hasn't edited this agenda
 * since we synced" and could not see a single stored field. A meeting could hold
 * a perfectly matching hash and zero agenda rows (the sync deletes rows before
 * re-inserting, and a failed insert was logged and dropped) and this checker
 * would pass it.
 *
 * Also flags meetings still marked `scheduled` in the DB within the live window
 * but absent from the live calendar (likely cancelled and not yet re-synced).
 */
import axios from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  agendaContentHash,
  deriveAgendaItems,
  EMPTY_AGENDA_HASH,
  LRC_LEGISLATIVE_CALENDAR_URL,
  scheduledMeetingsFromParsed,
  type DerivedAgendaItem,
} from '../../ky-lrc-calendar-sync';
import { parseLegislativeCalendarHtml } from '../../lrc-legislative-calendar-parser';
import {
  diffFinding,
  isTransientUpstreamError,
  norm,
  summarizeResult,
  type AuditConfig,
  type CheckerResult,
  type Finding,
} from '../types';
import { normalizeCommitteeNameForDupes } from '../../ky-committee-utils';

const FETCH_HEADERS = {
  'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; accuracy-audit)',
  Accept: 'text/html',
};

/** Stored agenda row, as selected for verification. */
export interface StoredAgendaItem {
  meeting_id: string;
  sort_order: number;
  raw_text: string | null;
  item_kind: string | null;
  bill_number: string | null;
  bill_session_label: string | null;
  ky_bill_id: string | null;
  depth: number | null;
}

/** How many per-item agenda mismatches to report before collapsing the rest. */
const MAX_ITEM_FINDINGS_PER_MEETING = 3;

/**
 * Compare one meeting's stored agenda rows against the derivation the sync would
 * produce from the live page. Returns findings; caps per-item noise so a single
 * re-ordered agenda doesn't bury the rest of the report.
 */
export function diffAgendaItems(
  label: string,
  derived: DerivedAgendaItem[],
  stored: StoredAgendaItem[],
  billNumberById: Map<string, string>,
): Finding[] {
  const findings: Finding[] = [];
  const byOrder = new Map(stored.map((s) => [s.sort_order, s]));

  if (stored.length !== derived.length) {
    findings.push({
      severity: 'fail',
      domain: 'committees',
      entity: label,
      field: 'agenda_items',
      message: `stored agenda has ${stored.length} item(s), live calendar has ${derived.length}`,
      expected: String(derived.length),
      actual: String(stored.length),
    });
  }

  let itemFindings = 0;
  let suppressed = 0;

  for (const d of derived) {
    const s = byOrder.get(d.sort_order);
    if (!s) {
      // Already implied by the count mismatch above when the agenda is simply
      // short; still worth naming the specific missing line once.
      if (itemFindings < MAX_ITEM_FINDINGS_PER_MEETING) {
        itemFindings++;
        findings.push({
          severity: 'fail',
          domain: 'committees',
          entity: label,
          field: `agenda[${d.sort_order}]`,
          message: `agenda line missing from storage: "${d.raw_text.slice(0, 80)}"`,
        });
      } else suppressed++;
      continue;
    }

    const mismatches: Array<{ field: string; expected: string; actual: string; severity: 'fail' | 'warn' }> = [];

    if (norm(s.raw_text) !== norm(d.raw_text)) {
      mismatches.push({ field: 'raw_text', expected: d.raw_text, actual: s.raw_text ?? '', severity: 'warn' });
    }
    if ((s.depth ?? 0) !== d.depth) {
      // depth drives the rendered agenda hierarchy.
      mismatches.push({ field: 'depth', expected: String(d.depth), actual: String(s.depth ?? 0), severity: 'warn' });
    }
    if ((s.item_kind ?? '') !== d.item_kind) {
      mismatches.push({ field: 'item_kind', expected: d.item_kind, actual: s.item_kind ?? '', severity: 'warn' });
    }
    if ((s.bill_number ?? null) !== d.bill_number) {
      // A bill reference that changed or vanished is user-visible on the bill's
      // "Hearings & agendas" section, so this is a hard failure.
      mismatches.push({
        field: 'bill_number',
        expected: d.bill_number ?? '∅',
        actual: s.bill_number ?? '∅',
        severity: 'fail',
      });
    }
    if ((s.bill_session_label ?? null) !== d.bill_session_label) {
      mismatches.push({
        field: 'bill_session_label',
        expected: d.bill_session_label ?? '∅',
        actual: s.bill_session_label ?? '∅',
        severity: 'warn',
      });
    }

    // A line that names a bill but stored no ky_bill_id renders as plain text
    // instead of a link — the single most common silent agenda defect.
    if (d.bill_number && !s.ky_bill_id) {
      mismatches.push({
        field: 'ky_bill_id',
        expected: `resolved id for ${d.bill_number}`,
        actual: '∅',
        severity: 'warn',
      });
    }

    // Independent cross-check: the stored id must point at the bill the line
    // names. This one does not just re-run the sync's logic, so it can catch a
    // genuine mis-resolution rather than only drift.
    if (s.ky_bill_id && d.bill_number) {
      const actualNumber = billNumberById.get(s.ky_bill_id);
      if (actualNumber && norm(actualNumber) !== norm(d.bill_number)) {
        mismatches.push({
          field: 'ky_bill_id',
          expected: d.bill_number,
          actual: `${actualNumber} (id ${s.ky_bill_id})`,
          severity: 'fail',
        });
      }
    }

    for (const m of mismatches) {
      if (itemFindings >= MAX_ITEM_FINDINGS_PER_MEETING) {
        suppressed++;
        continue;
      }
      itemFindings++;
      findings.push(
        diffFinding(m.severity, 'committees', label, `agenda[${d.sort_order}].${m.field}`, m.expected, m.actual),
      );
    }
  }

  if (suppressed > 0) {
    findings.push({
      severity: 'warn',
      domain: 'committees',
      entity: label,
      field: 'agenda_items',
      message: `…and ${suppressed} further agenda-item mismatch(es) on this meeting`,
    });
  }

  return findings;
}

export async function checkCommittees(db: SupabaseClient, cfg: AuditConfig): Promise<CheckerResult> {
  const started = Date.now();
  const findings: Finding[] = [];

  // Near-duplicate committee records: ky_committees upserts on (lrc_rsn,
  // committee_type), so an LRC change to the CommitteeType URL param (e.g. the
  // 2026-06 'IJ' → 'Interim Joint Committee' switch) silently mints a second row
  // for the same committee with data split across the two. Warn whenever two rows
  // share an lrc_rsn or a normalized name. Merge with
  // `npm run merge:duplicate-committees` (see decisions.md § 2026-06-12).
  {
    const { data: allCommittees } = await db
      .from('ky_committees')
      .select('lrc_rsn, committee_type, name, slug');
    const rows = allCommittees ?? [];
    const byRsn = new Map<number, typeof rows>();
    const byName = new Map<string, typeof rows>();
    for (const c of rows) {
      if (c.lrc_rsn != null) {
        byRsn.set(c.lrc_rsn, [...(byRsn.get(c.lrc_rsn) ?? []), c]);
      }
      const n = normalizeCommitteeNameForDupes(c.name as string);
      byName.set(n, [...(byName.get(n) ?? []), c]);
    }
    const flagged = new Set<string>();
    for (const [rsn, group] of byRsn) {
      if (group.length < 2) continue;
      const slugs = group.map((c) => `${c.slug} (type=${c.committee_type})`).sort();
      flagged.add(group.map((c) => c.slug).sort().join('|'));
      findings.push({
        severity: 'warn',
        domain: 'committees',
        entity: `lrc_rsn=${rsn}`,
        message: `near-duplicate committee rows share lrc_rsn: ${slugs.join(' vs ')} — run merge:duplicate-committees`,
      });
    }
    for (const [, group] of byName) {
      if (group.length < 2) continue;
      const key = group.map((c) => c.slug).sort().join('|');
      if (flagged.has(key)) continue;
      findings.push({
        severity: 'warn',
        domain: 'committees',
        entity: group[0].name as string,
        message: `near-duplicate committee rows share a normalized name: ${group.map((c) => `${c.slug} (rsn=${c.lrc_rsn})`).sort().join(' vs ')} — run merge:duplicate-committees`,
      });
    }
  }


  let html: string;
  try {
    const res = await axios.get<string>(LRC_LEGISLATIVE_CALENDAR_URL, {
      timeout: 30_000,
      responseType: 'text',
      headers: FETCH_HEADERS,
    });
    html = res.data;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // A transient LRC outage (5xx / gateway timeout / network blip) skips the
    // live-calendar diff rather than red-paging #errors; the near-duplicate
    // findings gathered above still report. A genuine failure (e.g. a 404 meaning
    // the calendar URL moved) stays an operational error. Mirrors the per-committee
    // LRC-fetch handling in the materials checker.
    if (isTransientUpstreamError(e)) {
      return summarizeResult('committees', 0, findings, started, {
        skipped: true,
        skipReason: `LRC calendar unavailable (transient): ${msg}`,
      });
    }
    return summarizeResult('committees', 0, findings, started, {
      error: `LRC calendar fetch failed: ${msg}`,
    });
  }

  const parsed = parseLegislativeCalendarHtml(html);
  const scheduled = scheduledMeetingsFromParsed(parsed);

  if (scheduled.length === 0) {
    return summarizeResult('committees', 0, findings, started, {
      skipped: true,
      skipReason: 'live calendar has no scheduled meetings right now',
    });
  }

  // Resolve committees by lrc_rsn + committee_type.
  const rsns = [...new Set(scheduled.map((m) => m.committee.lrcRsn).filter((r): r is number => r != null))];
  const committeeByKey = new Map<string, string>();
  if (rsns.length > 0) {
    const { data: committees, error } = await db
      .from('ky_committees')
      .select('id, lrc_rsn, committee_type')
      .in('lrc_rsn', rsns);
    if (error) {
      return summarizeResult('committees', 0, findings, started, { error: error.message });
    }
    for (const c of committees ?? []) {
      committeeByKey.set(`${c.lrc_rsn}|${c.committee_type}`, c.id as string);
    }
  }

  const seenMeetingDates: string[] = scheduled.map((m) => m.meetingDate);

  // Batch every stored meeting in the live window up front. This used to be one
  // `.maybeSingle()` per meeting inside the loop — dozens of serial round-trips
  // during session.
  const storedMeetings: Array<{
    id: string;
    committee_id: string;
    meeting_date: string;
    time_and_location: string | null;
    agenda_content_hash: string | null;
    status: string | null;
  }> = [];
  if (seenMeetingDates.length > 0) {
    const sortedDates = [...seenMeetingDates].sort();
    const { data, error } = await db
      .from('ky_committee_meetings')
      .select('id, committee_id, meeting_date, time_and_location, agenda_content_hash, status')
      .gte('meeting_date', sortedDates[0]!)
      .lte('meeting_date', sortedDates[sortedDates.length - 1]!);
    if (error) {
      return summarizeResult('committees', 0, findings, started, { error: error.message });
    }
    storedMeetings.push(...(data ?? []));
  }

  const storedByCommitteeDate = new Map<string, typeof storedMeetings>();
  for (const m of storedMeetings) {
    const key = `${m.committee_id}|${m.meeting_date}`;
    storedByCommitteeDate.set(key, [...(storedByCommitteeDate.get(key) ?? []), m]);
  }

  // Resolve each live meeting to a stored row, then batch-load the agendas for
  // everything that matched.
  const matched: Array<{
    label: string;
    meetingId: string;
    derived: DerivedAgendaItem[];
    liveHash: string;
    storedHash: string | null;
  }> = [];
  let checked = 0;

  for (const meeting of scheduled) {
    const label = `${meeting.committee.name} ${meeting.meetingDate}`;

    const committeeId = committeeByKey.get(`${meeting.committee.lrcRsn}|${meeting.committee.committeeType}`);
    if (!committeeId) {
      findings.push({
        severity: 'fail',
        domain: 'committees',
        entity: label,
        message: `committee on live calendar (rsn=${meeting.committee.lrcRsn}) is missing from ky_committees`,
      });
      continue;
    }

    checked += 1;

    const timeAndLocation = meeting.timeAndLocation ?? '';
    const candidates = storedByCommitteeDate.get(`${committeeId}|${meeting.meetingDate}`) ?? [];

    // Match on (committee, date) and treat time/location as a *field*, not part
    // of the key. Keying on it meant an upstream room or time edit read as
    // "meeting missing" — a fail that pointed at the wrong problem while the
    // stale row stayed on the site, still marked scheduled.
    let stored = candidates.find((c) => (c.time_and_location ?? '') === timeAndLocation);
    if (!stored && candidates.length === 1) {
      stored = candidates[0];
      findings.push(
        diffFinding(
          'warn',
          'committees',
          label,
          'time_and_location',
          timeAndLocation,
          stored.time_and_location ?? '',
        ),
      );
    }

    if (!stored) {
      findings.push({
        severity: 'fail',
        domain: 'committees',
        entity: label,
        message:
          candidates.length === 0
            ? `meeting on live calendar (${timeAndLocation || 'no time/loc'}) has no stored ky_committee_meetings row`
            : `meeting on live calendar (${timeAndLocation || 'no time/loc'}) matches no stored row among ${candidates.length} on that date`,
      });
      continue;
    }

    if (stored.status !== 'scheduled') {
      findings.push({
        severity: 'warn',
        domain: 'committees',
        entity: label,
        field: 'status',
        message: `live calendar lists this meeting as scheduled, but stored status is "${stored.status}"`,
      });
    }

    matched.push({
      label,
      meetingId: stored.id,
      derived: deriveAgendaItems(meeting),
      liveHash: agendaContentHash(meeting),
      storedHash: stored.agenda_content_hash,
    });
  }

  // Agenda verification — the stored rows themselves, not just their fingerprint.
  if (matched.length > 0) {
    const { data: agendaRows, error: aErr } = await db
      .from('ky_committee_agenda_items')
      .select('meeting_id, sort_order, raw_text, item_kind, bill_number, bill_session_label, ky_bill_id, depth')
      .in('meeting_id', matched.map((m) => m.meetingId));
    if (aErr) {
      return summarizeResult('committees', checked, findings, started, { error: aErr.message });
    }

    const agendaByMeeting = new Map<string, StoredAgendaItem[]>();
    for (const r of (agendaRows ?? []) as StoredAgendaItem[]) {
      agendaByMeeting.set(r.meeting_id, [...(agendaByMeeting.get(r.meeting_id) ?? []), r]);
    }

    // Resolve the bill numbers behind every stored ky_bill_id so a mis-resolved
    // link can be caught independently of the sync's own lookup logic.
    const billIds = [
      ...new Set(
        (agendaRows ?? [])
          .map((r) => (r as StoredAgendaItem).ky_bill_id)
          .filter((id): id is string => !!id),
      ),
    ];
    const billNumberById = new Map<string, string>();
    if (billIds.length > 0) {
      const { data: bills } = await db.from('ky_bills').select('id, bill_number').in('id', billIds);
      for (const b of bills ?? []) billNumberById.set(b.id as string, b.bill_number as string);
    }

    for (const m of matched) {
      const stored = agendaByMeeting.get(m.meetingId) ?? [];

      // The silent-loss invariant: the hash says this meeting had agenda text,
      // but nothing is stored. The sync deletes agenda rows before re-inserting
      // and a failed insert leaves exactly this state — a valid hash over an
      // empty agenda, rendering as a blank agenda on the committee page.
      if (stored.length === 0 && m.storedHash && m.storedHash !== EMPTY_AGENDA_HASH) {
        findings.push({
          severity: 'fail',
          domain: 'committees',
          entity: m.label,
          field: 'agenda_items',
          message:
            'agenda_content_hash records agenda text but no ky_committee_agenda_items rows are stored (agenda lost on write)',
        });
        continue;
      }

      findings.push(...diffAgendaItems(m.label, m.derived, stored, billNumberById));

      // Retained as a distinct signal: the hash only tells us whether LRC edited
      // the page since our last sync, which is a staleness question rather than
      // a correctness one.
      if (m.storedHash && m.storedHash !== m.liveHash) {
        findings.push({
          severity: 'warn',
          domain: 'committees',
          entity: m.label,
          field: 'agenda_content_hash',
          message: 'live calendar agenda has changed since the last sync (stale agenda)',
        });
      }
    }
  }

  // Reverse check: DB meetings still "scheduled" inside the live window but absent live.
  if (seenMeetingDates.length > 0) {
    const sorted = [...seenMeetingDates].sort();
    const windowStart = sorted[0]!;
    const windowEnd = sorted[sorted.length - 1]!;

    const liveKeys = new Set(
      scheduled.map((m) => {
        const id = committeeByKey.get(`${m.committee.lrcRsn}|${m.committee.committeeType}`);
        return `${id}|${m.meetingDate}|${m.timeAndLocation ?? ''}`;
      }),
    );

    const { data: dbMeetings } = await db
      .from('ky_committee_meetings')
      .select('committee_id, meeting_date, time_and_location, ky_committees ( name )')
      .gte('meeting_date', windowStart)
      .lte('meeting_date', windowEnd)
      .eq('status', 'scheduled');

    for (const m of dbMeetings ?? []) {
      const key = `${m.committee_id}|${m.meeting_date}|${m.time_and_location ?? ''}`;
      if (liveKeys.has(key)) continue;
      const c = m.ky_committees as { name?: string } | { name?: string }[] | null;
      const name = (Array.isArray(c) ? c[0]?.name : c?.name) ?? 'committee';
      findings.push({
        severity: 'warn',
        domain: 'committees',
        entity: `${name} ${m.meeting_date}`,
        message: 'meeting still marked scheduled in DB but absent from the live calendar (possible cancellation not yet synced)',
      });
    }
  }

  return summarizeResult('committees', checked, findings, started);
}
