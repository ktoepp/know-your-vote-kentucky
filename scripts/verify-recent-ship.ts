/**
 * Smoke verification for committee calendar + performance ship (2026-05-19).
 * Usage: npx tsx scripts/verify-recent-ship.ts
 */
import '../scripts/load-env';
import { createClient } from '@supabase/supabase-js';
import { fetchKyBillsBrowsePage } from '../src/lib/ky-bills-browse-server';
import { buildCommitteeMemberDisplay } from '../src/lib/ky-committee-members';
import { recordCalendarHearingScheduledEvents } from '../src/lib/ky-calendar-hearing-history';
const COMMITTEE_ROSTER_COLUMNS =
  'id,legiscan_id,name,first_name,last_name,party,chamber,district,photo_url,ballotpedia,legiscan_image_url,openstates_id,role_title,email,phone,website,lrc_profile_url,committee_memberships,active';

function envClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing Supabase env');
  return createClient(url, key);
}

async function main() {
  const db = envClient();
  const issues: string[] = [];
  const ok: string[] = [];

  const { count: committeeCount } = await db.from('ky_committees').select('*', { count: 'exact', head: true });
  const { count: meetingCount } = await db.from('ky_committee_meetings').select('*', { count: 'exact', head: true });
  const { count: agendaCount } = await db.from('ky_committee_agenda_items').select('*', { count: 'exact', head: true });
  ok.push(`DB rows: ${committeeCount ?? 0} committees, ${meetingCount ?? 0} meetings, ${agendaCount ?? 0} agenda lines`);

  const { data: hearingEvents, error: hErr } = await db
    .from('ky_bill_status_history')
    .select('id, bill_id, event_type, event_payload, observed_at')
    .eq('event_type', 'hearing_scheduled')
    .order('observed_at', { ascending: false })
    .limit(5);
  if (hErr) issues.push(`hearing_scheduled query: ${hErr.message}`);
  else {
    const calendarSourced = (hearingEvents ?? []).filter(
      (r) => (r.event_payload as { source?: string })?.source === 'lrc-calendar',
    );
    ok.push(
      `hearing_scheduled events: ${hearingEvents?.length ?? 0} recent sample; ${calendarSourced.length} from lrc-calendar`,
    );
    if (calendarSourced[0]) {
      const p = calendarSourced[0].event_payload as { last_action?: string };
      ok.push(`  sample: ${p.last_action?.slice(0, 80) ?? '(no last_action)'}`);
    }
  }

  const browse = await fetchKyBillsBrowsePage({
    chamberMode: 'all',
    chamberFilter: 'all',
    statusFilter: 'all',
    topicFilter: '',
    followIds: [],
    sortBy: 'last_action_date',
    sortDir: 'desc',
    page: 1,
    pageSize: 5,
  });
  ok.push(`Browse page 1: ${browse.bills.length} bills, total ${browse.total} (capped=${browse.capped})`);
  if (browse.bills[0] && 'description' in browse.bills[0]) {
    issues.push('Browse rows should omit description (slim select)');
  }

  const { data: slimRoster } = await db
    .from('ky_legislators')
    .select('id')
    .eq('active', true);
  ok.push(`Active legislators (DB): ${slimRoster?.length ?? 0}`);

  const { data: sampleCommittee } = await db.from('ky_committees').select('*').limit(1).maybeSingle();
  if (sampleCommittee?.slug) {
    const { data: meetings } = await db
      .from('ky_committee_meetings')
      .select('*')
      .eq('committee_id', sampleCommittee.id)
      .order('meeting_date', { ascending: false })
      .limit(5);
    const meetingList = meetings ?? [];
    const meetingIds = meetingList.map((m) => m.id);
    const { data: agendaRows } = meetingIds.length
      ? await db.from('ky_committee_agenda_items').select('id').in('meeting_id', meetingIds)
      : { data: [] };
    const { data: rosterRows } = await db
      .from('ky_legislators')
      .select(COMMITTEE_ROSTER_COLUMNS)
      .eq('active', true);
    const members = buildCommitteeMemberDisplay(sampleCommittee, meetingList, rosterRows ?? []);
    const memberRefs = meetingList.flatMap((m) => (m.member_refs as unknown[]) ?? []).length;
    ok.push(
      `Committee /${sampleCommittee.slug}: ${meetingList.length} meetings, ${agendaRows?.length ?? 0} agenda items, ${members.length} members (${memberRefs} calendar member_refs across meetings)`,
    );
  }

  const { data: billWithAgenda } = await db
    .from('ky_committee_agenda_items')
    .select('ky_bill_id, meeting_id, raw_text, ky_committee_meetings ( meeting_date, time_and_location, ky_committees ( name, slug ) )')
    .not('ky_bill_id', 'is', null)
    .limit(1)
    .maybeSingle();

  if (billWithAgenda?.ky_bill_id && billWithAgenda.meeting_id) {
    const meeting = billWithAgenda.ky_committee_meetings as {
      meeting_date?: string;
      time_and_location?: string | null;
      ky_committees?: { name?: string; slug?: string } | null;
    } | null;
    const committee = meeting?.ky_committees;
    const testHash = `verify-${Date.now()}`;
    const recorded = await recordCalendarHearingScheduledEvents(db, {
      meetingId: billWithAgenda.meeting_id as string,
      committeeName: committee?.name ?? 'Test Committee',
      committeeSlug: committee?.slug ?? 'test',
      meetingDate: meeting?.meeting_date ?? '2026-05-20',
      timeAndLocation: meeting?.time_and_location ?? null,
      agendaContentHash: testHash,
      bills: [{ billId: billWithAgenda.ky_bill_id as string, agendaLine: billWithAgenda.raw_text as string }],
    });
    const { data: inserted } = await db
      .from('ky_bill_status_history')
      .select('id')
      .eq('bill_id', billWithAgenda.ky_bill_id)
      .eq('event_type', 'hearing_scheduled')
      .limit(1);
    ok.push(`Hearing event write test: attempted ${recorded}, row exists=${Boolean(inserted?.length)}`);
    if (!inserted?.length) issues.push('recordCalendarHearingScheduledEvents did not persist (or dedupe blocked unexpectedly)');
  } else {
    ok.push('Hearing event write test: skipped (no agenda row with ky_bill_id)');
  }

  console.log('\n=== Verification ===\n');
  for (const line of ok) console.log(`  OK  ${line}`);
  if (issues.length) {
    console.log('');
    for (const line of issues) console.log(`  FAIL  ${line}`);
    process.exit(1);
  }
  console.log('\nAll checks passed.\n');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
