/**
 * Committees accuracy checker — live LRC legislative calendar vs stored
 * `ky_committee_meetings` / `ky_committee_agenda_items`.
 *
 * Re-fetches the live calendar HTML, then for each scheduled meeting verifies a
 * matching stored meeting exists and that its agenda content hash matches
 * (drift => the live agenda changed but our row is stale). Also flags meetings
 * still marked `scheduled` in the DB within the live window but absent from the
 * live calendar (likely cancelled and not yet re-synced).
 */
import { createHash } from 'crypto';
import axios from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  LRC_LEGISLATIVE_CALENDAR_URL,
  scheduledMeetingsFromParsed,
} from '../../ky-lrc-calendar-sync';
import {
  parseLegislativeCalendarHtml,
  type LrcCalendarMeeting,
} from '../../lrc-legislative-calendar-parser';
import { summarizeResult, type AuditConfig, type CheckerResult, type Finding } from '../types';
import { normalizeCommitteeNameForDupes } from '../../ky-committee-utils';

const FETCH_HEADERS = {
  'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; accuracy-audit)',
  Accept: 'text/html',
};

/** Mirror of the (unexported) hash used by the calendar sync. */
function agendaContentHash(meeting: LrcCalendarMeeting): string {
  const payload = meeting.agendaItems.map((i) => i.rawText).join('\n');
  return createHash('sha256').update(payload).digest('hex');
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
    return summarizeResult('committees', 0, findings, started, {
      error: `LRC calendar fetch failed: ${e instanceof Error ? e.message : String(e)}`,
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

  const seenMeetingDates: string[] = [];
  let checked = 0;

  for (const meeting of scheduled) {
    const label = `${meeting.committee.name} ${meeting.meetingDate}`;
    seenMeetingDates.push(meeting.meetingDate);

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

    const timeAndLocation = meeting.timeAndLocation ?? '';
    const { data: stored } = await db
      .from('ky_committee_meetings')
      .select('id, agenda_content_hash, status')
      .eq('committee_id', committeeId)
      .eq('meeting_date', meeting.meetingDate)
      .eq('time_and_location', timeAndLocation)
      .maybeSingle();

    checked += 1;

    if (!stored) {
      findings.push({
        severity: 'fail',
        domain: 'committees',
        entity: label,
        message: `meeting on live calendar (${timeAndLocation || 'no time/loc'}) has no stored ky_committee_meetings row`,
      });
      continue;
    }

    const liveHash = agendaContentHash(meeting);
    if (stored.agenda_content_hash && stored.agenda_content_hash !== liveHash) {
      findings.push({
        severity: 'warn',
        domain: 'committees',
        entity: label,
        field: 'agenda_content_hash',
        message: 'stored agenda differs from the live calendar agenda (stale agenda)',
      });
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
