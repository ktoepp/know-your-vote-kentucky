/**
 * Write `hearing_scheduled` rows to ky_bill_status_history when the LRC calendar
 * sync adds bills to a committee agenda (Phase 4 committee calendar / digest).
 */
import { createHash } from 'crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { formatKyMeetingDate } from '@/lib/ky-committee-display';
import { insertBillStatusHistoryRows } from '@/lib/ky-bill-status-history';

export type CalendarHearingEventInput = {
  billId: string;
  agendaLine?: string | null;
};

export function calendarHearingDedupeHash(meetingId: string, billId: string, agendaContentHash: string): string {
  return createHash('sha256')
    .update(`lrc-calendar|hearing_scheduled|${meetingId}|${billId}|${agendaContentHash}`)
    .digest('hex')
    .slice(0, 40);
}

export function formatCalendarHearingLastAction(args: {
  committeeName: string;
  meetingDate: string;
  timeAndLocation?: string | null;
  agendaLine?: string | null;
}): string {
  const parts = [
    args.committeeName,
    formatKyMeetingDate(args.meetingDate),
    args.timeAndLocation?.trim() || null,
    args.agendaLine?.trim() || null,
  ].filter(Boolean);
  return parts.join(' — ');
}

/**
 * Inserts one `hearing_scheduled` event per bill (deduped by meeting + bill + agenda hash).
 * Returns the number of rows attempted (duplicates are ignored via UNIQUE index).
 */
export async function recordCalendarHearingScheduledEvents(
  db: SupabaseClient,
  args: {
    meetingId: string;
    committeeName: string;
    committeeSlug: string;
    meetingDate: string;
    timeAndLocation?: string | null;
    agendaContentHash: string;
    bills: CalendarHearingEventInput[];
  },
): Promise<number> {
  let count = 0;
  for (const { billId, agendaLine } of args.bills) {
    if (!billId) continue;
    const last_action = formatCalendarHearingLastAction({
      committeeName: args.committeeName,
      meetingDate: args.meetingDate,
      timeAndLocation: args.timeAndLocation,
      agendaLine,
    });
    await insertBillStatusHistoryRows(db, billId, [
      {
        event_type: 'hearing_scheduled',
        payload: {
          source: 'lrc-calendar',
          last_action,
          committee_name: args.committeeName,
          committee_slug: args.committeeSlug,
          meeting_date: args.meetingDate,
          time_and_location: args.timeAndLocation ?? null,
          meeting_id: args.meetingId,
          agenda_line: agendaLine ?? null,
        },
        legiscan_change_hash: calendarHearingDedupeHash(args.meetingId, billId, args.agendaContentHash),
      },
    ]);
    count++;
  }
  return count;
}
