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
import {
  billSessionLookupKey,
  inferSessionLabelFromMeetingDate,
  normalizeBillNumberForLookup,
  normalizeKySessionLabel,
} from './lrc-session-label';
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
  meetingsCancelled: number;
  /**
   * Row-level write failures (committee/meeting upsert, agenda insert, cancel
   * update). Previously these were logged and dropped, so a run that lost every
   * agenda row still reported `success` to `ky_sources`.
   */
  errors: number;
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

/**
 * Fingerprint of the **upstream** agenda text, used to detect that LRC edited an
 * agenda since our last sync (drives `agenda_updated` events).
 *
 * Note what this deliberately is not: it is computed from `rawText`, before
 * {@link normalizeKyGaAgendaLine}, so it does not describe what we stored. It
 * cannot detect a normalization bug, a failed agenda insert, or a bill that
 * failed to resolve — the stored rows could be empty and the hash would still
 * match. Verifying stored agenda content is the accuracy checker's job
 * (`accuracy-audit/checkers/committees.ts`), which compares against
 * {@link deriveAgendaItems} field by field.
 */
export function agendaContentHash(meeting: LrcCalendarMeeting): string {
  const payload = meeting.agendaItems.map((i) => i.rawText).join('\n');
  return createHash('sha256').update(payload).digest('hex');
}

/** sha256 of the empty payload — a meeting whose agenda legitimately has no lines. */
export const EMPTY_AGENDA_HASH = createHash('sha256').update('').digest('hex');

/** A `ky_committee_agenda_items` row derived from a parsed agenda line, minus `ky_bill_id`. */
export interface DerivedAgendaItem {
  sort_order: number;
  raw_text: string;
  item_kind: string;
  bill_number: string | null;
  bill_session_label: string | null;
  depth: number;
  /** Key into the bill-id map; null when the line names no bill. */
  billLookupKey: string | null;
}

/** The bill fields of an agenda row, derived from one line of agenda prose. */
export interface DerivedAgendaBillRef {
  bill_number: string | null;
  bill_session_label: string | null;
  billLookupKey: string | null;
}

/**
 * Derive a line's bill number + session from its text alone.
 *
 * Split out of {@link deriveAgendaItems} so a repair pass over *stored* rows
 * (`scripts/repair-agenda-bill-links.ts`) resolves them exactly the way the
 * sync would, without needing the parsed-HTML shape the sync works from.
 *
 * @param preparsedRefs references already extracted upstream; re-parsed from
 *   `rawText` when absent, which is the only option for a stored row.
 */
export function deriveAgendaBillRef(
  rawText: string,
  meetingDate: string | null,
  preparsedRefs?: LrcBillReference[],
): DerivedAgendaBillRef {
  const refs = preparsedRefs?.length ? preparsedRefs : extractLrcBillReferences(rawText);
  const primary = primaryBillFromLine(refs);
  // Fall back to the session that was current on the meeting's date when the
  // agenda line names a bill without a session marker ("SB 58: …"). Interim
  // committees review enacted bills this way constantly. Only a fallback: a
  // line naming an older session ("2024 RS HB 833") must keep that session, or
  // the lookup silently lands on the same bill number in the current session.
  const resolvedSession = primary.billNumber
    ? primary.sessionLabel ?? inferSessionLabelFromMeetingDate(meetingDate)
    : null;
  return {
    bill_number: primary.billNumber,
    bill_session_label: resolvedSession,
    billLookupKey: primary.billNumber
      ? billSessionLookupKey(primary.billNumber, resolvedSession)
      : null,
  };
}

/**
 * Derive the stored shape of a meeting's agenda rows from its parsed lines.
 *
 * Single source of truth shared by the sync (which writes these rows) and the
 * accuracy checker (which verifies them). Keeping one implementation is the
 * point: the checker used to carry its own copy of the content hash, and a
 * checker that re-implements the sync's derivations can only ever agree with
 * itself.
 */
export function deriveAgendaItems(meeting: LrcCalendarMeeting): DerivedAgendaItem[] {
  return meeting.agendaItems.map((item, idx) => {
    const refs = item.billReferences.length
      ? item.billReferences
      : extractLrcBillReferences(item.rawText);
    const billRef = deriveAgendaBillRef(item.rawText, meeting.meetingDate, refs);
    return {
      sort_order: idx,
      raw_text: normalizeKyGaAgendaLine(item.rawText),
      item_kind: classifyAgendaKind(item.rawText, refs),
      bill_number: billRef.bill_number,
      bill_session_label: billRef.bill_session_label,
      depth: item.depth,
      billLookupKey: billRef.billLookupKey,
    };
  });
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
        billPairs.push({
          billNumber: primary.billNumber,
          sessionLabel: primary.sessionLabel ?? inferSessionLabelFromMeetingDate(m.meetingDate),
        });
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
  let meetingsCancelled = 0;
  let errors = 0;
  const syncedMeetingIds = new Set<string>();
  const seenMeetingDates: string[] = [];

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
      errors++;
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
      errors++;
      logError(`Meeting upsert failed: ${mErr?.message}`);
      continue;
    }

    meetingsSynced++;
    syncedMeetingIds.add(meetingRecord.id);
    seenMeetingDates.push(meeting.meetingDate);

    // Emit committee events on the change boundary. The unique index
    // (committee_id, event_type, meeting_id, agenda_content_hash) prevents
    // duplicate rows on re-sync:
    //   - meeting_scheduled: at most one per (committee, meeting)
    //   - agenda_updated:    one per distinct agenda hash
    //   - meeting_cancelled: handled in the post-loop diff pass
    if (!options.skipHearingEvents) {
      if (!priorMeeting) {
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
      } else if (
        priorMeeting.agenda_content_hash &&
        priorMeeting.agenda_content_hash !== contentHash
      ) {
        // Hash changed and there was prior agenda content — emit agenda_updated.
        // First-sync rows with NULL/empty prior hash never fire this branch.
        await db.from('ky_committee_events').insert({
          committee_id: committee.id,
          meeting_id: meetingRecord.id,
          event_type: 'agenda_updated',
          event_payload: {
            agenda_content_hash: contentHash,
            previous_agenda_content_hash: priorMeeting.agenda_content_hash,
            meeting_date: meeting.meetingDate,
            time_and_location: timeAndLocation || null,
            committee_name: committeeRow.name,
            committee_slug: committeeRow.slug,
          },
        });
      }
    }

    const agendaRows = deriveAgendaItems(meeting).map((d) => ({
      sort_order: d.sort_order,
      raw_text: d.raw_text,
      item_kind: d.item_kind,
      bill_number: d.bill_number,
      bill_session_label: d.bill_session_label,
      ky_bill_id: d.billLookupKey ? billIdByKey.get(d.billLookupKey) ?? null : null,
      depth: d.depth,
    }));

    // Delete + insert in one Postgres transaction (migration 050). A failed
    // insert used to leave a valid `agenda_content_hash` over zero agenda rows
    // — silently empty on the committee page. The RPC rolls the delete back
    // when the insert throws, preserving the previous agenda.
    const { data: insertedCount, error: aErr } = await db.rpc(
      'ky_replace_committee_agenda_items',
      { p_meeting_id: meetingRecord.id, p_rows: agendaRows },
    );
    if (aErr) {
      errors++;
      logError(`Agenda replace failed (meeting ${meetingRecord.id}): ${aErr.message}`);
    } else {
      agendaSynced += (insertedCount as number | null) ?? 0;
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

  // Cancellation diff pass: any DB meeting whose date falls in the parse window
  // but isn't in this run's `syncedMeetingIds` was previously scheduled and is
  // no longer on the LRC calendar — mark it cancelled and emit a digest event.
  // Skipped when no meetings were parsed (avoids the obvious foot-gun of
  // mass-cancelling on a transient empty/error fetch) and during Wayback backfill
  // (`skipHearingEvents`), where partial historical windows would false-positive.
  if (!options.skipHearingEvents && seenMeetingDates.length > 0) {
    const sortedDates = [...seenMeetingDates].sort();
    const windowStart = sortedDates[0]!;
    const windowEnd = sortedDates[sortedDates.length - 1]!;

    const { data: dbMeetingsInWindow, error: diffErr } = await db
      .from('ky_committee_meetings')
      .select(
        'id, committee_id, meeting_date, time_and_location, ky_committees ( name, slug )',
      )
      .gte('meeting_date', windowStart)
      .lte('meeting_date', windowEnd)
      .eq('status', 'scheduled');

    if (diffErr) {
      errors++;
      logError(`Cancellation diff query failed: ${diffErr.message}`);
    } else {
      const nowIso = new Date().toISOString();
      for (const dbMeeting of dbMeetingsInWindow ?? []) {
        const id = dbMeeting.id as string;
        if (syncedMeetingIds.has(id)) continue;

        const { error: updErr } = await db
          .from('ky_committee_meetings')
          .update({ status: 'cancelled', scraped_at: nowIso })
          .eq('id', id);
        if (updErr) {
          errors++;
          logError(`Cancel update failed (${id}): ${updErr.message}`);
          continue;
        }

        const ky_c = dbMeeting.ky_committees as { name?: string; slug?: string } | null;
        await db.from('ky_committee_events').insert({
          committee_id: dbMeeting.committee_id,
          meeting_id: id,
          event_type: 'meeting_cancelled',
          event_payload: {
            meeting_date: dbMeeting.meeting_date,
            time_and_location: dbMeeting.time_and_location || null,
            committee_name: ky_c?.name ?? null,
            committee_slug: ky_c?.slug ?? null,
          },
        });
        meetingsCancelled++;
      }
    }
  }

  return { meetingsSynced, agendaSynced, hearingEventsRecorded, meetingsCancelled, errors };
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

    // Distinguish the two very different zero-meeting outcomes, which the sync
    // previously collapsed into an identical `success` with itemsSynced=0:
    //
    //   - LRC published day headings that say "No meetings scheduled" — a real,
    //     healthy empty week, routine during interim.
    //   - We parsed no day headings at all — we can no longer read the page.
    //     The fetch still returned HTTP 200, so nothing else notices.
    //
    // Only the second is a failure, and the parser already knows the difference.
    if (parsed.stats.dayCount === 0) {
      const message =
        `calendar HTML parsed to 0 day headings (${html.length} bytes) — ` +
        'the page structure likely changed; the parser needs updating';
      logError(message);
      return {
        source: SOURCE,
        status: 'error',
        itemsSynced: 0,
        error: message,
        duration: Date.now() - start,
      };
    }

    const { meetingsSynced, agendaSynced, hearingEventsRecorded, meetingsCancelled, errors } =
      await upsertLrcCalendarMeetings(db, scheduled, {
        ...options,
        sourceUrl: LRC_LEGISLATIVE_CALENDAR_URL,
      });

    log(
      `Synced ${meetingsSynced} meetings, ${agendaSynced} agenda lines, ${hearingEventsRecorded} hearing_scheduled events, ${meetingsCancelled} cancellations${errors > 0 ? `, ${errors} write error(s)` : ''}`,
    );
    // Row-level write failures make this a partial run, not a clean one. Without
    // this the sync reported `success` after losing agenda rows, and the
    // health check had nothing to notice.
    return {
      source: SOURCE,
      status: errors > 0 ? 'error' : 'success',
      itemsSynced: meetingsSynced,
      error: errors > 0 ? `${errors} row-level write error(s) during calendar upsert` : undefined,
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
