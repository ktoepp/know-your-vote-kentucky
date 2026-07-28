import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { KYBill, KYLegislator, KYVote } from '@/types/kentucky';
import { getCivicDataSessionName, KY_BILL_SESSION_OPTIONS } from '@/lib/ky-sessions';
import { bucketLegiscanVoteText, type VoteBucket } from '@/lib/legiscan-vote-tally';
import { matchLegislatorBySponsorName } from '@/lib/ky-member-utils';
import {
  classifySponsorRole,
  getSponsorRecordDisplayName,
  parseLegiscanSponsorRecords,
} from '@/lib/ky-bill-sponsors';

export type MemberSponsorRole = 'primary' | 'cosponsor';

/** A bill this member sponsored, tagged with whether they were a primary sponsor or a co-sponsor. */
export interface MemberSponsoredBill {
  bill: KYBill;
  role: MemberSponsorRole;
}

function createAnonClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

const BILL_SUMMARY =
  'id, bill_number, title, status, last_action_date, last_action, session, chamber, legiscan_id';

/** Sponsored-bill rows need `sponsors` (to classify this member's role) and `topics` (client-side topic filter). */
const SPONSORED_BILL_SELECT = `${BILL_SUMMARY}, sponsors, topics`;

type SponsorRow = { name?: string; people_id?: number };

/** Find this member's own sponsor record on a bill, then classify it as primary vs co-sponsor. */
function memberSponsorRole(sponsors: unknown, leg: KYLegislator): MemberSponsorRole {
  const records = parseLegiscanSponsorRecords(sponsors);
  for (const r of records) {
    const pid = r.people_id != null ? Number(r.people_id) : NaN;
    if (leg.legiscan_id != null && Number.isFinite(pid) && pid === Number(leg.legiscan_id)) {
      return classifySponsorRole(r);
    }
    const name = getSponsorRecordDisplayName(r);
    if (name && matchLegislatorBySponsorName([leg], name)?.id === leg.id) {
      return classifySponsorRole(r);
    }
  }
  return 'primary';
}

/** Strip the raw `sponsors` blob and tag each row with this member's sponsor role. */
function toSponsoredBills(rows: Array<KYBill & { sponsors?: unknown }>, leg: KYLegislator): MemberSponsoredBill[] {
  return rows.map((row) => {
    const role = memberSponsorRole(row.sponsors, leg);
    const { sponsors: _sponsors, ...bill } = row;
    return { bill: bill as KYBill, role };
  });
}

function billListsLegislatorAsSponsor(sponsors: unknown, leg: KYLegislator): boolean {
  if (!Array.isArray(sponsors)) return false;
  for (const row of sponsors) {
    if (!row || typeof row !== 'object') continue;
    const s = row as SponsorRow;
    if (leg.legiscan_id != null && s.people_id != null && Number(s.people_id) === Number(leg.legiscan_id)) {
      return true;
    }
    if (s.name && matchLegislatorBySponsorName([leg], s.name)?.id === leg.id) return true;
  }
  return false;
}

/** When `legiscan_id` is missing, infer LegiScan `people_id` from sponsor JSON on recent bills. */
async function resolveLegiscanPeopleIdFromBillSponsors(
  supabase: SupabaseClient,
  leg: KYLegislator,
  sessionName: string,
): Promise<number | null> {
  const { data, error } = await supabase
    .from('ky_bills')
    .select('sponsors')
    .eq('session', sessionName)
    .not('sponsors', 'is', null)
    .order('last_action_date', { ascending: false, nullsFirst: false })
    .limit(500);

  if (error || !data) return null;

  const counts = new Map<number, number>();
  for (const row of data) {
    if (!Array.isArray(row.sponsors)) continue;
    for (const raw of row.sponsors) {
      if (!raw || typeof raw !== 'object') continue;
      const s = raw as SponsorRow;
      const pid = s.people_id != null ? Number(s.people_id) : NaN;
      if (!Number.isFinite(pid)) continue;
      if (billListsLegislatorAsSponsor([s], leg)) {
        counts.set(pid, (counts.get(pid) ?? 0) + 1);
      }
    }
  }

  let best: number | null = null;
  let bestCount = 0;
  for (const [pid, n] of counts) {
    if (n > bestCount) {
      best = pid;
      bestCount = n;
    }
  }
  return best;
}

async function fetchSponsoredBillsByPeopleId(
  supabase: SupabaseClient,
  peopleId: number,
  sessionName: string,
  limit: number,
): Promise<Array<KYBill & { sponsors?: unknown }>> {
  const { data, error } = await supabase
    .from('ky_bills')
    .select(SPONSORED_BILL_SELECT)
    .eq('session', sessionName)
    .filter('sponsors', 'cs', JSON.stringify([{ people_id: peopleId }]))
    .order('last_action_date', { ascending: false, nullsFirst: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Array<KYBill & { sponsors?: unknown }>;
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
  bill: Pick<KYBill, 'id' | 'bill_number' | 'title' | 'status' | 'session'> | null;
}

export interface MemberVoteRecord {
  sessionName: string;
  totalRollCalls: number;
  tally: ReturnType<typeof tallyFromMap>;
  /** First N roll calls for default "Recent" view. */
  recent: MemberRecentRollVote[];
  /** All roll calls in session (up to maxRows) for client-side filtering. */
  votes: MemberRecentRollVote[];
  /**
   * True when the record could not be loaded (Supabase unavailable or the roll-call
   * query errored/timed out) rather than the member genuinely having no recorded votes.
   * Lets the profile distinguish a transient failure from an empty session instead of
   * mislabeling an outage as "no votes."
   */
  unavailable: boolean;
}

function emptyMemberVoteRecord(sessionName: string, unavailable = false): MemberVoteRecord {
  return {
    sessionName,
    totalRollCalls: 0,
    tally: { yea: 0, nay: 0, notVoting: 0, absent: 0, unknown: 0 },
    recent: [],
    votes: [],
    unavailable,
  };
}

function mapRollVotes(
  myVotes: { vote: KYVote; myVote: string | null; bucket: VoteBucket }[],
  billById: Map<string, Pick<KYBill, 'id' | 'bill_number' | 'title' | 'status' | 'session'>>,
): MemberRecentRollVote[] {
  return myVotes.map(({ vote, myVote, bucket }) => ({
    voteId: vote.id,
    date: vote.date,
    description: vote.description,
    chamber: vote.chamber,
    myVote,
    myBucket: bucket,
    bill: billById.get(vote.bill_id) ?? null,
  }));
}

/** Order session labels newest-first, using the canonical list; unknown labels sort last (desc). */
function sortSessionsNewestFirst(sessions: string[]): string[] {
  const rank = (s: string) => {
    const i = KY_BILL_SESSION_OPTIONS.indexOf(s);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...sessions].sort((a, b) => {
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return b.localeCompare(a);
  });
}

/**
 * Sessions this member has legislative activity in — i.e. sessions where a bill lists them as a
 * sponsor/co-sponsor — newest first, always including the current default session so the profile's
 * session selector never renders empty. Falls back to `[currentSession]` when the member has no
 * resolvable LegiScan `people_id`.
 */
export async function fetchMemberSessionsForLegislator(leg: KYLegislator): Promise<string[]> {
  const currentSession = getCivicDataSessionName();
  const supabase = createAnonClient();
  if (!supabase) return [currentSession];

  const peopleId = leg.legiscan_id != null ? Number(leg.legiscan_id) : null;
  if (peopleId == null || !Number.isFinite(peopleId)) return [currentSession];

  const { data, error } = await supabase
    .from('ky_bills')
    .select('session')
    .filter('sponsors', 'cs', JSON.stringify([{ people_id: peopleId }]));

  if (error || !data) return [currentSession];

  const sessions = new Set<string>([currentSession]);
  for (const row of data) {
    const s = (row as { session?: string }).session;
    if (s) sessions.add(s);
  }
  return sortSessionsNewestFirst([...sessions]);
}

/**
 * Sponsored bill rows for a LegiScan-matched lawmaker, current/most-recent regular session.
 */
export async function fetchSponsoredBillsForLegislator(
  leg: KYLegislator,
  options?: { limit?: number; sessionName?: string },
): Promise<MemberSponsoredBill[]> {
  const supabase = createAnonClient();
  if (!supabase) return [];

  const sessionName = options?.sessionName ?? getCivicDataSessionName();
  const limit = options?.limit ?? 25;

  let peopleId = leg.legiscan_id != null ? Number(leg.legiscan_id) : null;
  if (peopleId == null || !Number.isFinite(peopleId)) {
    peopleId = await resolveLegiscanPeopleIdFromBillSponsors(supabase, leg, sessionName);
  }

  if (peopleId != null && Number.isFinite(peopleId)) {
    const byId = await fetchSponsoredBillsByPeopleId(supabase, peopleId, sessionName, limit);
    if (byId.length > 0) return toSponsoredBills(byId, leg);
  }

  if (!leg.name?.trim()) return [];

  const { data, error } = await supabase
    .from('ky_bills')
    .select(SPONSORED_BILL_SELECT)
    .eq('session', sessionName)
    .order('last_action_date', { ascending: false, nullsFirst: false })
    .limit(500);

  if (error || !data) return [];

  const matched: Array<KYBill & { sponsors?: unknown }> = [];
  for (const row of data) {
    if (!billListsLegislatorAsSponsor((row as { sponsors?: unknown }).sponsors, leg)) continue;
    matched.push(row as KYBill & { sponsors?: unknown });
    if (matched.length >= limit) break;
  }
  return toSponsoredBills(matched, leg);
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
  // No client == misconfiguration/outage, not a member with an empty session.
  if (!supabase) return emptyMemberVoteRecord(sessionNameEarly, true);

  const sessionName = options?.sessionName ?? getCivicDataSessionName();
  let peopleId = leg.legiscan_id != null ? Number(leg.legiscan_id) : null;
  if (peopleId == null || !Number.isFinite(peopleId)) {
    peopleId = await resolveLegiscanPeopleIdFromBillSponsors(supabase, leg, sessionName);
  }
  if (peopleId == null || !Number.isFinite(peopleId)) {
    return emptyMemberVoteRecord(sessionNameEarly);
  }

  const peopleKey = String(peopleId);
  const maxRows = options?.maxRows ?? 200;
  const recentLimit = options?.recentLimit ?? 8;

  const { data: rows, error } = await supabase.rpc('get_votes_for_legislator', {
    legislator_people_id: peopleKey,
    p_session: sessionName,
    max_rows: maxRows,
  });

  if (error) {
    // A failed roll-call query (e.g. a statement timeout) must not read as "no votes" —
    // flag it unavailable so the profile shows a distinct, honest message and the failure
    // stays visible in logs rather than silently degrading the record.
    console.warn(
      `get_votes_for_legislator failed (people_id=${peopleKey}, session=${sessionName}): ${error.message}`,
    );
    return emptyMemberVoteRecord(sessionName, true);
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

  const billIds = [...new Set(myVotes.map((m) => m.vote.bill_id))];
  const billById = new Map<string, Pick<KYBill, 'id' | 'bill_number' | 'title' | 'status' | 'session'>>();

  if (billIds.length) {
    const { data: bills } = await supabase
      .from('ky_bills')
      .select('id, bill_number, title, status, session')
      .in('id', billIds);
    for (const b of bills ?? []) {
      billById.set(
        b.id,
        b as Pick<KYBill, 'id' | 'bill_number' | 'title' | 'status' | 'session'>,
      );
    }
  }

  const allVotes = mapRollVotes(myVotes, billById);

  return {
    sessionName,
    totalRollCalls: votes.length,
    tally: tallyFromMap(tallies),
    recent: allVotes.slice(0, recentLimit),
    votes: allVotes,
    unavailable: false,
  };
}
