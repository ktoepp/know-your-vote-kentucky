import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type {
  KYCommittee,
  KYCommitteeAgendaItem,
  KYCommitteeAgendaItemWithMeeting,
  KYCommitteeMeeting,
  KYCommitteeMeetingWithCommittee,
} from '@/types/kentucky';
import { fetchKyLegislatorRosterForCommittees } from '@/lib/ky-legislator-roster-server';
import { kyTodayIso } from '@/lib/ky-committee-display';
import {
  KY_COMMITTEE_AGENDA_ITEM_SELECT,
  KY_COMMITTEE_BROWSE_SELECT,
  KY_COMMITTEE_MEETING_DETAIL_SELECT,
  KY_MEETING_BROWSE_SELECT,
} from '@/lib/ky-ga-browse-select';

export { fetchKyLegislatorRosterForCommittees as fetchKyLegislatorRoster };

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const AGENDA_WITH_MEETING_SELECT = `
  ${KY_COMMITTEE_AGENDA_ITEM_SELECT},
  ky_committee_meetings (
    id,
    committee_id,
    meeting_date,
    time_and_location,
    status,
    source_url,
    ky_committees ( id, name, slug, chamber, profile_url )
  )
`;

const COMMITTEE_DETAIL_REVALIDATE_SECONDS = 300;

async function fetchKyCommitteesUncached(): Promise<KYCommittee[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('ky_committees')
    .select(KY_COMMITTEE_BROWSE_SELECT)
    .order('name', { ascending: true });
  if (error || !data) return [];
  return data as KYCommittee[];
}

/** Full committee list (~56 rows), cached — member profiles and browse surfaces share it. */
export const fetchKyCommittees = unstable_cache(
  fetchKyCommitteesUncached,
  ['ky-committees-all'],
  { revalidate: COMMITTEE_DETAIL_REVALIDATE_SECONDS },
);

async function fetchKyCommitteeBySlugUncached(slug: string): Promise<KYCommittee | null> {
  const supabase = createAnonClient();
  if (!supabase) return null;
  const decoded = decodeURIComponent(slug).trim();
  const { data, error } = await supabase
    .from('ky_committees')
    .select(KY_COMMITTEE_BROWSE_SELECT)
    .eq('slug', decoded)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as KYCommittee;
}

export async function getKyCommitteeBySlug(slug: string): Promise<KYCommittee | null> {
  return unstable_cache(
    () => fetchKyCommitteeBySlugUncached(slug),
    ['ky-committee-slug', slug],
    { revalidate: COMMITTEE_DETAIL_REVALIDATE_SECONDS },
  )();
}

async function fetchKyCommitteeSlugByAliasUncached(slug: string): Promise<string | null> {
  const supabase = createAnonClient();
  if (!supabase) return null;
  const decoded = decodeURIComponent(slug).trim();
  const { data, error } = await supabase
    .from('ky_committees')
    .select('slug')
    .contains('aliases', [decoded])
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return (data as { slug: string }).slug;
}

/**
 * Resolve a merged-away committee slug to its canonical slug via
 * ky_committees.aliases (migration 030). Returns null when the slug is not an
 * alias of any committee.
 */
export async function getKyCommitteeSlugByAlias(slug: string): Promise<string | null> {
  return unstable_cache(
    () => fetchKyCommitteeSlugByAliasUncached(slug),
    ['ky-committee-slug-alias', slug],
    { revalidate: COMMITTEE_DETAIL_REVALIDATE_SECONDS },
  )();
}

async function fetchKyCommitteeMeetingsForCommitteeUncached(
  committeeId: string,
  limit: number,
): Promise<KYCommitteeMeeting[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('ky_committee_meetings')
    .select(KY_COMMITTEE_MEETING_DETAIL_SELECT)
    .eq('committee_id', committeeId)
    .order('meeting_date', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as KYCommitteeMeeting[];
}

export async function fetchKyCommitteeMeetingsForCommittee(
  committeeId: string,
  { limit = 40 }: { limit?: number } = {},
): Promise<KYCommitteeMeeting[]> {
  return unstable_cache(
    () => fetchKyCommitteeMeetingsForCommitteeUncached(committeeId, limit),
    ['ky-committee-meetings', committeeId, String(limit)],
    { revalidate: COMMITTEE_DETAIL_REVALIDATE_SECONDS },
  )();
}

export interface KYCommitteeMaterial {
  id: string;
  committee_id: string;
  meeting_id: string | null;
  meeting_date: string | null;
  date_label: string | null;
  title: string;
  url: string;
  file_type: string | null;
  sort_order: number;
  /** Last probed reachability (migration 031); 'dead' = known 404, null = unchecked. */
  link_status: 'ok' | 'dead' | null;
}

async function fetchKyCommitteeMaterialsUncached(
  committeeId: string,
  limit: number,
): Promise<KYCommitteeMaterial[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('ky_committee_materials')
    .select('id, committee_id, meeting_id, meeting_date, date_label, title, url, file_type, sort_order, link_status')
    .eq('committee_id', committeeId)
    .order('meeting_date', { ascending: false, nullsFirst: false })
    .order('sort_order', { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data as KYCommitteeMaterial[];
}

export async function fetchKyCommitteeMaterials(
  committeeId: string,
  { limit = 200 }: { limit?: number } = {},
): Promise<KYCommitteeMaterial[]> {
  return unstable_cache(
    () => fetchKyCommitteeMaterialsUncached(committeeId, limit),
    ['ky-committee-materials', committeeId, String(limit)],
    { revalidate: COMMITTEE_DETAIL_REVALIDATE_SECONDS },
  )();
}

export async function fetchKyCommitteeAgendaForMeeting(meetingId: string): Promise<KYCommitteeAgendaItem[]> {
  const map = await fetchKyCommitteeAgendaForMeetings([meetingId]);
  return map[meetingId] ?? [];
}

async function fetchKyCommitteeAgendaForMeetingsUncached(
  meetingIds: string[],
): Promise<Record<string, KYCommitteeAgendaItem[]>> {
  const ids = [...new Set(meetingIds.filter(Boolean))];
  if (!ids.length) return {};
  const supabase = createAnonClient();
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('ky_committee_agenda_items')
    .select(KY_COMMITTEE_AGENDA_ITEM_SELECT)
    .in('meeting_id', ids)
    .order('sort_order', { ascending: true });
  if (error || !data) return {};
  const byMeeting: Record<string, KYCommitteeAgendaItem[]> = {};
  for (const id of ids) byMeeting[id] = [];
  for (const row of data as KYCommitteeAgendaItem[]) {
    const list = byMeeting[row.meeting_id];
    if (list) list.push(row);
  }
  return byMeeting;
}

/** Single query for all agendas on a committee detail page (replaces per-meeting N+1). */
export async function fetchKyCommitteeAgendaForMeetings(
  meetingIds: string[],
): Promise<Record<string, KYCommitteeAgendaItem[]>> {
  const ids = [...new Set(meetingIds.filter(Boolean))].sort();
  if (!ids.length) return {};
  return unstable_cache(
    () => fetchKyCommitteeAgendaForMeetingsUncached(ids),
    ['ky-committee-agenda', ids.join(',')],
    { revalidate: COMMITTEE_DETAIL_REVALIDATE_SECONDS },
  )();
}

export async function fetchKyCommitteeMeetingsBrowse({
  daysBack = 14,
  daysAhead = 90,
  limit = 80,
}: {
  daysBack?: number;
  daysAhead?: number;
  limit?: number;
} = {}): Promise<KYCommitteeMeetingWithCommittee[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];

  const today = new Date(`${kyTodayIso()}T12:00:00`);
  const from = new Date(today);
  from.setDate(from.getDate() - daysBack);
  const to = new Date(today);
  to.setDate(to.getDate() + daysAhead);

  const fromIso = from.toISOString().slice(0, 10);
  const toIso = to.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('ky_committee_meetings')
    .select(KY_MEETING_BROWSE_SELECT)
    .gte('meeting_date', fromIso)
    .lte('meeting_date', toIso)
    .order('meeting_date', { ascending: true })
    .order('time_and_location', { ascending: true })
    .limit(limit);

  if (error || !data) return [];
  return data as unknown as KYCommitteeMeetingWithCommittee[];
}

export async function fetchKyBillHearings(billId: string): Promise<KYCommitteeAgendaItemWithMeeting[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('ky_committee_agenda_items')
    .select(AGENDA_WITH_MEETING_SELECT)
    .eq('ky_bill_id', billId)
    .order('sort_order', { ascending: true });
  if (error || !data) return [];
  const rows = data as unknown as KYCommitteeAgendaItemWithMeeting[];
  return rows.sort((a, b) => {
    const da = a.ky_committee_meetings?.meeting_date ?? '';
    const db = b.ky_committee_meetings?.meeting_date ?? '';
    if (da !== db) return db.localeCompare(da);
    return a.sort_order - b.sort_order;
  });
}

export async function countKyMeetingsForCommittee(committeeId: string): Promise<number> {
  const supabase = createAnonClient();
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from('ky_committee_meetings')
    .select('*', { count: 'exact', head: true })
    .eq('committee_id', committeeId);
  if (error) return 0;
  return count ?? 0;
}
