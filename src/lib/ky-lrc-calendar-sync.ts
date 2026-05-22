/**
 * Sync LRC Weekly Legislative Calendar → ky_committees / meetings / agenda_items.
 */
import { createHash } from 'crypto';
import axios from 'axios';
import type { SupabaseClient } from '@supabase/supabase-js';
import { committeeSlugFromName } from './ky-committee-utils';
import {
  parseLegislativeCalendarHtml,
  type LrcCalendarMeeting,
  type LrcLegislativeCalendarParseResult,
} from './lrc-legislative-calendar-parser';
import {
  extractLrcBillReferences,
  lrcBillReferenceToBillNumber,
  type LrcBillReference,
} from './lrc-bill-reference-parser';
import { normalizeKyGaAgendaLine, normalizeKyGaDisplayName } from './ky-committee-display';
import { recordCalendarHearingScheduledEvents } from './ky-calendar-hearing-history';
import { billSessionLookupKey, normalizeBillNumberForLookup, normalizeKySessionLabel } from './lrc-session-label';
import type { SyncOptions, SyncResult } from './ky-sync-pipeline';

export const LRC_LEGISLATIVE_CALENDAR_URL = 'https://apps.legislature.ky.gov/legislativecalendar';
const SOURCE = 'lrc-calendar';

const FETCH_HEADERS = {
  'User-Agent': 'KnowYourVoteKentucky/1.0 (+https://kyvky.com; lrc-calendar-sync)',
  Accept: 'text/html',
};

export type LrcCalendarUpsertOptions = SyncOptions & {
  /** Skip `hearing_scheduled` digest rows (recommended for Wayback backfill). */
  skipHearingEvents?: boolean;
  /** Persisted on `ky_committee_meetings.source_url` (defaults to live calendar URL). */
  sourceUrl?: string;
};

export type LrcCalendarUpsertStats = {
  meetingsSynced: number;
  agendaSynced: number;
  hearingEventsRecorded: number;
};

function log(msg: string) {
  console.log(`[Sync:${SOURCE}] ${msg}`);
}

function logError(msg: string) {
  console.error(`[Sync:${SOURCE}] ERROR: ${msg}`);
}

function inferChamber(name: string, committeeType: string | null): 'house' | 'senate' | 'joint' | 'unknown' {
  const n = name.toUpperCase();
  const t = (committeeType ?? '').toLowerCase();
  if (n.includes('INTERIM JOINT') || t.includes('interim joint')) return 'joint';
  if (n.includes('STATUTORY') || t.includes('statutory')) return 'joint';
  if (/\(H\)|\bHOUSE\b/.test(n)) return 'house';
  if (/\(S\)|\bSENATE\b/.test(n)) return 'senate';
  return 'unknown';
}

function classifyAgendaKind(rawText: string, refs: LrcBillReference[]): string {
  if (refs.length > 0) {
    const k = refs[0]!.kind;
    if (k === 'HJR' || k === 'SJR' || k === 'HCR' || k === 'SCR' || k === 'HR' || k === 'SR') {
      return 'resolution';
    }
    return 'bill';
  }
  if (/^approval of minutes/i.test(rawText)) return 'minutes';
  if (/^action item\b/i.test(rawText)) return 'action_item';
  if (/^report from\b/i.test(rawText)) return 'report';
  return 'other';
}

function agendaContentHash(meeting: LrcCalendarMeeting): string {
  const payload = meeting.agendaItems.map((i) => i.rawText).join('\n');
  return createHash('sha256').update(payload).digest('hex');
}

async function fetchCalendarHtml(): Promise<string> {
  const res = await axios.get<string>(LRC_LEGISLATIVE_CALENDAR_URL, {
    timeout: 30_000,
    responseType: 'text',
    headers: FETCH_HEADERS,
  });
  return res.data;
}

async function resolveBillIdMap(
  db: SupabaseClient,
  pairs: Array<{ billNumber: string; sessionLabel: string | null }>,
): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  if (!pairs.length) return out;

  const bySession = new Map<string, Set<string>>();
  for (const p of pairs) {
    const num = p.billNumber.trim();
    const sess = normalizeKySessionLabel(p.sessionLabel);
    if (!num) continue;
    if (!bySession.has(sess)) bySession.set(sess, new Set());
    bySession.get(sess)!.add(num);
  }

  for (const [sessionLabel, numbers] of bySession) {
    const nums = [...new Set([...numbers].map((n) => normalizeBillNumberForLookup(n)))];
    let query = db.from('ky_bills').select('id, bill_number, session').in('bill_number', nums);
    if (sessionLabel) {
      query = query.ilike('session', sessionLabel);
    }
    const { data, error } = await query.limit(500);
    if (error) {
      logError(`Bill resolve query failed: ${error.message}`);
      continue;
    }
    for (const row of data ?? []) {
      const key = billSessionLookupKey(row.bill_number, row.session);
      out.set(key, row.id);
      if (sessionLabel) {
        out.set(billSessionLookupKey(row.bill_number, sessionLabel), row.id);
      }
    }
  }

  return out;
}

function primaryBillFromLine(refs: LrcBillReference[]): {
  billNumber: string | null;
  sessionLabel: string | null;
} {
  if (!refs.length) return { billNumber: null, sessionLabel: null };
  const r = refs[0]!;
  return {
    billNumber: lrcBillReferenceToBillNumber(r),
    sessionLabel: r.sessionLabel,
  };
}

/** Scheduled committee meetings with LRC ids (excludes “No meetings scheduled”). */
export function scheduledMeetingsFromParsed(parsed: LrcLegislativeCalendarParseResult): LrcCalendarMeeting[] {
  return parsed.days.flatMap((d) =>
    d.meetings.filter(
      (m) => m.status === 'scheduled' && m.committee.lrcRsn != null && m.committee.committeeType,
    ),
  );
}

function billPairsFromMeetings(meetings: LrcCalendarMeeting[]) {
  const billPairs: Array<{ billNumber: string; sessionLabel: string | null }> = [];
  for (const m of meetings) {
    for (const item of m.agendaItems) {
      const refs = item.billReferences.length ? item.billReferences : extractLrcBillReferences(item.rawText);
      const primary = primaryBillFromLine(refs);
      if (primary.billNumber) {
        billPairs.push({ billNumber: primary.billNumber, sessionLabel: primary.sessionLabel });
      }
    }
  }
  return billPairs;
}

/** Upsert committees, meetings, and agenda rows from parsed calendar meetings. */
export async function upsertLrcCalendarMeetings(
  db: SupabaseClient,
  scheduled: LrcCalendarMeeting[],
  options: LrcCalendarUpsertOptions = {},
): Promise<LrcCalendarUpsertStats> {
  const sourceUrl = options.sourceUrl ?? LRC_LEGISLATIVE_CALENDAR_URL;
  const billIdByKey = await resolveBillIdMap(db, billPairsFromMeetings(scheduled));

  let meetingsSynced = 0;
  let agendaSynced = 0;
  let hearingEventsRecorded = 0;

  for (const meeting of scheduled) {
    const rsn = meeting.committee.lrcRsn!;
    const committeeType = meeting.committee.committeeType!;

    const committeeRow = {
      lrc_rsn: rsn,
      committee_type: committeeType,
      name: normalizeKyGaDisplayName(meeting.committee.name),
      chamber: inferChamber(meeting.committee.name, committeeType),
      slug: committeeSlugFromName(meeting.committee.name),
      profile_url: meeting.committee.profileUrl,
    };

    const { data: committee, error: cErr } = await db
      .from('ky_committees')
      .upsert(committeeRow, { onConflict: 'lrc_rsn,committee_type' })
      .select('id')
      .single();

    if (cErr || !committee) {
      logError(`Committee upsert failed (${committeeRow.name}): ${cErr?.message}`);
      continue;
    }

    const timeAndLocation = meeting.timeAndLocation ?? '';
    const contentHash = agendaContentHash(meeting);

    const { data: priorMeeting } = await db
      .from('ky_committee_meetings')
      .select('id, agenda_content_hash')
      .eq('committee_id', committee.id)
      .eq('meeting_date', meeting.meetingDate)
      .eq('time_and_location', timeAndLocation)
      .maybeSingle();

    const priorBillIds = new Set<string>();
    if (priorMeeting?.id) {
      const { data: priorAgenda } = await db
        .from('ky_committee_agenda_items')
        .select('ky_bill_id')
        .eq('meeting_id', priorMeeting.id);
      for (const row of priorAgenda ?? []) {
        const id = row.ky_bill_id as string | null;
        if (id) priorBillIds.add(id);
      }
    }

    const meetingRow = {
      committee_id: committee.id,
      meeting_date: meeting.meetingDate,
      time_and_location: timeAndLocation,
      status: 'scheduled' as const,
      member_refs: meeting.members,
      agenda_content_hash: contentHash,
      source_url: sourceUrl,
      scraped_at: new Date().toISOString(),
    };

    const { data: meetingRecord, error: mErr } = await db
      .from('ky_committee_meetings')
      .upsert(meetingRow, { onConflict: 'committee_id,meeting_date,time_and_location' })
      .select('id')
      .single();

    if (mErr || !meetingRecord) {
      logError(`Meeting upsert failed: ${mErr?.message}`);
      continue;
    }

    meetingsSynced++;

    // Emit a committee event when this is a newly-created meeting (no prior record).
    // The unique index on (committee_id, event_type, meeting_id) prevents duplicates on re-sync.
    if (!priorMeeting && !options.skipHearingEvents) {
      await db.from('ky_committee_events').insert({
        committee_id: committee.id,
        meeting_id: meetingRecord.id,
        event_type: 'meeting_scheduled',
        event_payload: {
          meeting_date: meeting.meetingDate,
          time_and_location: timeAndLocation || null,
          committee_name: committeeRow.name,
          committee_slug: committeeRow.slug,
        },
      });
    }

    await db.from('ky_committee_agenda_items').delete().eq('meeting_id', meetingRecord.id);

    const agendaRows = meeting.agendaItems.map((item, idx) => {
      const refs = item.billReferences.length ? item.billReferences : extractLrcBillReferences(item.rawText);
      const primary = primaryBillFromLine(refs);
      const lookupKey = primary.billNumber
        ? billSessionLookupKey(primary.billNumber, primary.sessionLabel)
        : '';
      return {
        meeting_id: meetingRecord.id,
        sort_order: idx,
        raw_text: normalizeKyGaAgendaLine(item.rawText),
        item_kind: classifyAgendaKind(item.rawText, refs),
        bill_number: primary.billNumber,
        bill_session_label: primary.sessionLabel,
        ky_bill_id: lookupKey ? billIdByKey.get(lookupKey) ?? null : null,
      };
    });

    if (agendaRows.length > 0) {
      const { error: aErr } = await db.from('ky_committee_agenda_items').insert(agendaRows);
      if (aErr) {
        logError(`Agenda insert failed: ${aErr.message}`);
      } else {
        agendaSynced += agendaRows.length;
      }
    }

    const agendaUnchanged = priorMeeting?.agenda_content_hash === contentHash;
    if (!options.skipHearingEvents && !agendaUnchanged) {
      const newlyListed = agendaRows
        .filter((row) => row.ky_bill_id && !priorBillIds.has(row.ky_bill_id))
        .map((row) => ({
          billId: row.ky_bill_id as string,
          agendaLine: row.raw_text,
        }));
      if (newlyListed.length > 0) {
        const recorded = await recordCalendarHearingScheduledEvents(db, {
          meetingId: meetingRecord.id,
          committeeName: committeeRow.name,
          committeeSlug: committeeRow.slug,
          meetingDate: meeting.meetingDate,
          timeAndLocation: timeAndLocation || null,
          agendaContentHash: contentHash,
          bills: newlyListed,
        });
        hearingEventsRecorded += recorded;
      }
    }
  }

  return { meetingsSynced, agendaSynced, hearingEventsRecorded };
}

export async function syncKyLrcCalendar(
  db: SupabaseClient,
  options: SyncOptions = {},
): Promise<SyncResult> {
  const start = Date.now();
  try {
    log('Fetching legislative calendar HTML');
    const html = options.dryRun ? '' : await fetchCalendarHtml();
    if (options.dryRun) {
      const { readFileSync } = await import('fs');
      const { resolve } = await import('path');
      const fixture = readFileSync(
        resolve(__dirname, '../../fixtures/lrc/legislative-calendar-live.html'),
        'utf8',
      );
      const parsed = parseLegislativeCalendarHtml(fixture);
      log(`[DRY RUN] Would upsert ${parsed.stats.meetingCount} meetings, ${parsed.stats.agendaItemCount} agenda lines`);
      return {
        source: SOURCE,
        status: 'success',
        itemsSynced: parsed.stats.meetingCount,
        duration: Date.now() - start,
      };
    }

    const parsed = parseLegislativeCalendarHtml(html);
    const scheduled = scheduledMeetingsFromParsed(parsed);

    log(`Parsed ${parsed.stats.dayCount} days, ${scheduled.length} scheduled meetings`);

    const { meetingsSynced, agendaSynced, hearingEventsRecorded } = await upsertLrcCalendarMeetings(
      db,
      scheduled,
      { ...options, sourceUrl: LRC_LEGISLATIVE_CALENDAR_URL },
    );

    log(
      `Synced ${meetingsSynced} meetings, ${agendaSynced} agenda lines, ${hearingEventsRecorded} hearing_scheduled digest events`,
    );
    return {
      source: SOURCE,
      status: 'success',
      itemsSynced: meetingsSynced,
      duration: Date.now() - start,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logError(message);
    return {
      source: SOURCE,
      status: 'error',
      itemsSynced: 0,
      error: message,
      duration: Date.now() - start,
    };
  }
}
