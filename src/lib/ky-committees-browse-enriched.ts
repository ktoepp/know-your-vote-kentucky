import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { KYCommittee, KYCommitteeMeeting } from '@/types/kentucky';
import { KY_COMMITTEE_MEETING_DETAIL_SELECT } from '@/lib/ky-ga-browse-select';
import { fetchKyCommitteesBrowseList } from '@/lib/ky-ga-browse-server';
import { fetchKyLegislatorRosterForCommittees } from '@/lib/ky-legislator-roster-server';
import { buildCommitteeMemberDisplay, type CommitteeMemberDisplay } from '@/lib/ky-committee-members';
import { classifyTopics } from '@/lib/ky-topic-classifier';
import { kyTodayIso } from '@/lib/ky-committee-display';

function createAnonClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function isLeadershipRole(roleLabel: string | null): boolean {
  if (!roleLabel) return false;
  const r = roleLabel.toLowerCase();
  return r.includes('chair') || r.includes('vice');
}

export type KYCommitteeBrowseCard = KYCommittee & {
  leadershipNames: string[];
  topicTags: string[];
};

function leadershipFromMembers(members: CommitteeMemberDisplay[]): string[] {
  const names: string[] = [];
  for (const m of members) {
    if (!isLeadershipRole(m.roleLabel)) continue;
    const label = m.roleLabel ? `${m.displayName} (${m.roleLabel})` : m.displayName;
    if (!names.includes(label)) names.push(label);
    if (names.length >= 4) break;
  }
  return names;
}

const getCachedCommitteeMeetingRefs = unstable_cache(
  async (): Promise<KYCommitteeMeeting[]> => {
    const supabase = createAnonClient();
    if (!supabase) return [];

    const today = kyTodayIso();
    const from = new Date(`${today}T12:00:00`);
    from.setDate(from.getDate() - 365);

    const { data, error } = await supabase
      .from('ky_committee_meetings')
      .select(KY_COMMITTEE_MEETING_DETAIL_SELECT)
      .gte('meeting_date', from.toISOString().slice(0, 10))
      .order('meeting_date', { ascending: false })
      .limit(400);

    if (error || !data) return [];
    return data as KYCommitteeMeeting[];
  },
  ['ky-committee-meetings-member-refs'],
  { revalidate: 300 },
);

export async function fetchKyCommitteesBrowseEnriched(): Promise<KYCommitteeBrowseCard[]> {
  const [committees, meetings, roster] = await Promise.all([
    fetchKyCommitteesBrowseList(),
    getCachedCommitteeMeetingRefs(),
    fetchKyLegislatorRosterForCommittees(),
  ]);

  const meetingsByCommittee = new Map<string, KYCommitteeMeeting[]>();
  for (const m of meetings) {
    const list = meetingsByCommittee.get(m.committee_id) ?? [];
    list.push(m);
    meetingsByCommittee.set(m.committee_id, list);
  }

  return committees.map((committee) => {
    const committeeMeetings = meetingsByCommittee.get(committee.id) ?? [];
    const members = buildCommitteeMemberDisplay(committee, committeeMeetings, roster);
    const leadershipNames = leadershipFromMembers(members);
    const topicTags = classifyTopics(committee.name, '').slice(0, 3);

    return {
      ...committee,
      leadershipNames,
      topicTags,
    };
  });
}
