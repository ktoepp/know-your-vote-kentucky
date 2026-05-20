import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { KYBill, KYLegislator, KYVote } from '@/types/kentucky';
import { getCivicDataSessionName } from '@/lib/ky-sessions';
import { bucketLegiscanVoteText, type VoteBucket } from '@/lib/legiscan-vote-tally';
import { matchLegislatorBySponsorName, normalizeSponsorNameForMatch } from '@/lib/ky-member-utils';

function createAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const BILL_SUMMARY =
  'id, bill_number, title, status, last_action_date, last_action, session, chamber, legiscan_id';

const BILL_SUMMARY_WITH_SPONSORS = `${BILL_SUMMARY}, sponsors`;

function billListsLegislatorAsSponsor(sponsors: unknown, leg: KYLegislator): boolean {
  if (!Array.isArray(sponsors)) return false;
  const target = normalizeSponsorNameForMatch(leg.name || '');
  if (!target) return false;
  for (const row of sponsors) {
    if (!row || typeof row !== 'object') continue;
    const name = (row as { name?: string }).name;
    if (!name) continue;
    const hit = matchLegislatorBySponsorName([leg], name);
    if (hit?.id === leg.id) return true;
  }
  return false;
}

function memberRollVote(
  roll: Array<{ legislator_id: string; vote: string }> | null,
  peopleId: string,
): string | null {
  if (!roll?.length) return null;
  const row = roll.find((r) => r.legislator_id === peopleId);
  return row?.vote ?? null;
}

function tallyFromMap(tallies: Map<VoteBucket, number>) {
  return {
    yea: tallies.get('yea') ?? 0,
    nay: tallies.get('nay') ?? 0,
    notVoting: tallies.get('nv') ?? 0,
    absent: tallies.get('absent') ?? 0,
    unknown: tallies.get('unknown') ?? 0,
  };
}

export interface MemberRecentRollVote {
  voteId: string;
  date: string | null;
  description: string | null;
  chamber: 'house' | 'senate' | null;
  myVote: string | null;
  myBucket: VoteBucket;
  bill: Pick<KYBill, 'id' | 'bill_number' | 'title' | 'status'> | null;
}

export interface MemberVoteRecord {
  sessionName: string;
  totalRollCalls: number;
  tally: ReturnType<typeof tallyFromMap>;
  recent: MemberRecentRollVote[];
}

function emptyMemberVoteRecord(sessionName: string): MemberVoteRecord {
  return {
    sessionName,
    totalRollCalls: 0,
    tally: { yea: 0, nay: 0, notVoting: 0, absent: 0, unknown: 0 },
    recent: [],
  };
}

/**
 * Sponsored bill rows for a LegiScan-matched lawmaker, current/most-recent regular session.
 */
export async function fetchSponsoredBillsForLegislator(
  leg: KYLegislator,
  options?: { limit?: number; sessionName?: string },
): Promise<KYBill[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];

  const sessionName = options?.sessionName ?? getCivicDataSessionName();
  const limit = options?.limit ?? 25;

  if (leg.legiscan_id != null) {
    const pid = Number(leg.legiscan_id);
    const { data, error } = await supabase
      .from('ky_bills')
      .select(BILL_SUMMARY)
      .eq('session', sessionName)
      .contains('sponsors', [{ people_id: pid }])
      .order('last_action_date', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error || !data) return [];
    return data as KYBill[];
  }

  if (!leg.name?.trim()) return [];

  const { data, error } = await supabase
    .from('ky_bills')
    .select(BILL_SUMMARY_WITH_SPONSORS)
    .eq('session', sessionName)
    .order('last_action_date', { ascending: false, nullsFirst: false })
    .limit(350);

  if (error || !data) return [];

  const matched: KYBill[] = [];
  for (const row of data) {
    if (!billListsLegislatorAsSponsor((row as { sponsors?: unknown }).sponsors, leg)) continue;
    const { sponsors: _s, ...bill } = row as KYBill & { sponsors?: unknown };
    matched.push(bill as KYBill);
    if (matched.length >= limit) break;
  }
  return matched;
}

/**
 * Yea / nay (and other) counts from roll calls in a session, plus a short recent list.
 * Requires a LegiScan `legiscan_id` and a deployed `get_votes_for_legislator` RPC.
 */
export async function fetchMemberVoteRecord(
  leg: KYLegislator,
  options?: { maxRows?: number; recentLimit?: number; sessionName?: string },
): Promise<MemberVoteRecord> {
  const supabase = createAnonClient();
  const sessionNameEarly = options?.sessionName ?? getCivicDataSessionName();
  if (!supabase) return emptyMemberVoteRecord(sessionNameEarly);
  if (leg.legiscan_id == null) {
    return emptyMemberVoteRecord(sessionNameEarly);
  }

  const sessionName = options?.sessionName ?? getCivicDataSessionName();
  const peopleKey = String(leg.legiscan_id);
  const maxRows = options?.maxRows ?? 200;
  const recentLimit = options?.recentLimit ?? 8;

  const { data: rows, error } = await supabase.rpc('get_votes_for_legislator', {
    legislator_people_id: peopleKey,
    p_session: sessionName,
    max_rows: maxRows,
  });

  if (error) {
    console.warn('get_votes_for_legislator failed', error.message);
    return emptyMemberVoteRecord(sessionName);
  }

  const votes = (rows ?? []) as KYVote[];
  const tallies = new Map<VoteBucket, number>();
  for (const b of ['yea', 'nay', 'nv', 'absent', 'unknown'] as const) tallies.set(b, 0);

  const myVotes: { vote: KYVote; myVote: string | null; bucket: VoteBucket }[] = [];
  for (const v of votes) {
    const text = memberRollVote(v.roll_call, peopleKey);
    const bucket = bucketLegiscanVoteText(text);
    tallies.set(bucket, (tallies.get(bucket) ?? 0) + 1);
    myVotes.push({ vote: v, myVote: text, bucket });
  }

  const billIds = [...new Set(myVotes.slice(0, recentLimit).map((m) => m.vote.bill_id))];
  const billById = new Map<string, Pick<KYBill, 'id' | 'bill_number' | 'title' | 'status'>>();

  if (billIds.length) {
    const { data: bills } = await supabase
      .from('ky_bills')
      .select('id, bill_number, title, status')
      .in('id', billIds);
    for (const b of bills ?? []) {
      billById.set(
        b.id,
        b as Pick<KYBill, 'id' | 'bill_number' | 'title' | 'status'>,
      );
    }
  }

  const recent: MemberRecentRollVote[] = myVotes.slice(0, recentLimit).map(({ vote, myVote, bucket }) => ({
    voteId: vote.id,
    date: vote.date,
    description: vote.description,
    chamber: vote.chamber,
    myVote,
    myBucket: bucket,
    bill: billById.get(vote.bill_id) ?? null,
  }));

  return {
    sessionName,
    totalRollCalls: votes.length,
    tally: tallyFromMap(tallies),
    recent,
  };
}
