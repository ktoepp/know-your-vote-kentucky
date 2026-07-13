import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import type { KYCommittee, KYCommitteeMeeting } from '@/types/kentucky';
import { KY_COMMITTEE_MEETING_DETAIL_SELECT } from '@/lib/ky-ga-browse-select';
import { fetchKyCommitteesBrowseList } from '@/lib/ky-ga-browse-server';
import { fetchKyLegislatorRosterForCommittees } from '@/lib/ky-legislator-roster-server';
import { buildCommitteeMemberDisplay, type CommitteeMemberDisplay } from '@/lib/ky-committee-members';
import { classifyTopics } from '@/lib/ky-topic-classifier';
import { kyTodayIso } from '@/lib/ky-committee-display';
import { legislatorAvatarDescriptor, type LegislatorAvatarDescriptor } from '@/lib/ky-member-utils';

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

export type KYCommitteeLeaderCardEntry = {
  name: string;
  roleLabel: string;
  portrait: LegislatorAvatarDescriptor;
};

export type KYCommitteeBrowseCard = KYCommittee & {
  leadership: KYCommitteeLeaderCardEntry[];
  topicTags: string[];
  /** Soonest non-cancelled meeting on/after today, ISO date; null when none scheduled. */
  nextMeetingDate: string | null;
};

function leadershipFromMembers(members: CommitteeMemberDisplay[]): KYCommitteeLeaderCardEntry[] {
  const seen = new Set<string>();
  const entries: KYCommitteeLeaderCardEntry[] = [];
  for (const m of members) {
    if (!isLeadershipRole(m.roleLabel)) continue;
    const roleLabel = m.roleLabel!;
    const key = `${m.displayName}::${roleLabel}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      name: m.displayName,
      roleLabel,
      portrait: legislatorAvatarDescriptor(m.legislator, m.displayName),
    });
    if (entries.length >= 4) break;
  }
  return entries;
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

  const today = kyTodayIso();
  const cards = committees.map((committee) => {
    const committeeMeetings = meetingsByCommittee.get(committee.id) ?? [];
    const members = buildCommitteeMemberDisplay(committee, committeeMeetings, roster);
    const leadership = leadershipFromMembers(members);
    const topicTags = classifyTopics(committee.name, '').slice(0, 3);
    const nextMeetingDate = committeeMeetings
      .filter((m) => m.status !== 'cancelled' && m.meeting_date >= today)
      .reduce<string | null>((min, m) => (min === null || m.meeting_date < min ? m.meeting_date : min), null);

    return {
      ...committee,
      leadership,
      topicTags,
      nextMeetingDate,
      _memberCount: members.length,
    };
  });

  // Suppress zero-member entries when an identically-named committee with members exists.
  // This deduplicates pairs that arise when migration seeds and calendar sync create separate
  // rows for the same real-world committee (same name, different lrc_rsn or committee_type).
  const nameToMaxMembers = new Map<string, number>();
  for (const c of cards) {
    const key = c.name.trim().toLowerCase();
    nameToMaxMembers.set(key, Math.max(nameToMaxMembers.get(key) ?? 0, c._memberCount));
  }

  return cards
    .filter((c) => {
      const key = c.name.trim().toLowerCase();
      const max = nameToMaxMembers.get(key) ?? 0;
      return max === 0 || c._memberCount > 0;
    })
    .map(({ _memberCount: _mc, ...c }) => c)
    .sort((a, b) => {
      // Full committees before subcommittees, so the alphabetical wall of
      // Budget Review subcommittees stops burying the major committees.
      const aSub = a.name.toLowerCase().includes('subcommittee') ? 1 : 0;
      const bSub = b.name.toLowerCase().includes('subcommittee') ? 1 : 0;
      if (aSub !== bSub) return aSub - bSub;
      return a.name.localeCompare(b.name);
    });
}
