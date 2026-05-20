import { createClient } from '@supabase/supabase-js';
import type { KYCommittee, KYLegislator } from '@/types/kentucky';
import { committeeMembershipSlugMatchesFilter } from '@/lib/ky-committee-utils';
import { parseCalendarMemberRole } from '@/lib/ky-committee-members';
import { matchLegislatorBySponsorName, normalizeSponsorNameForMatch } from '@/lib/ky-member-utils';
import { parseKyDistrictNumber } from '@/lib/ky-district-geo';

export type MemberCommitteeAssignment = {
  slug: string;
  name: string;
  chamber: KYCommittee['chamber'];
  roleLabel: string | null;
};

type MeetingMemberRef = {
  displayName?: string;
  districtNumber?: number | null;
  profileUrl?: string | null;
};

type CachedMeetingRow = {
  member_refs: MeetingMemberRef[] | null;
  ky_committees: Pick<KYCommittee, 'name' | 'slug' | 'chamber'> | null;
};

function roleSortKey(roleLabel: string | null): number {
  if (!roleLabel) return 50;
  const r = roleLabel.toLowerCase();
  if (r.includes('co-chair') || r.includes('co chair')) return 0;
  if (r.includes('chair') && !r.includes('vice')) return 1;
  if (r.includes('vice chair') || r.includes('vice-chair')) return 2;
  return 40;
}

/** LRC calendar `DistrictNumber` on legislator profile URLs (house 1–100, senate 101–138). */
export function lrcDistrictNumberFromLegislator(
  leg: Pick<KYLegislator, 'chamber' | 'district'>,
): number | null {
  if (leg.chamber !== 'house' && leg.chamber !== 'senate') return null;
  const raw = parseKyDistrictNumber(leg.district);
  if (!raw) return null;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  if (leg.chamber === 'house') return n;
  return 100 + n;
}

function legislatorMatchesCalendarRef(leg: KYLegislator, ref: MeetingMemberRef): boolean {
  const dn = ref.districtNumber ?? null;
  const legDn = lrcDistrictNumberFromLegislator(leg);
  if (dn != null && legDn != null && dn === legDn) return true;
  const raw = (ref.displayName ?? '').trim();
  if (!raw) return false;
  const { name } = parseCalendarMemberRole(raw);
  const hit = matchLegislatorBySponsorName([leg], name);
  return hit?.id === leg.id;
}

function assignmentsFromOpenStatesSlugs(
  leg: KYLegislator,
  committees: KYCommittee[],
): MemberCommitteeAssignment[] {
  const slugs = leg.committee_memberships ?? [];
  if (!slugs.length) return [];
  const out: MemberCommitteeAssignment[] = [];
  for (const c of committees) {
    if (!slugs.some((s) => committeeMembershipSlugMatchesFilter(s, c.slug))) continue;
    out.push({ slug: c.slug, name: c.name, chamber: c.chamber, roleLabel: null });
  }
  return out;
}

/** Load LRC calendar meeting rows with committee slugs (uncached; safe in scripts). */
export async function fetchCalendarCommitteeMeetingRows(): Promise<CachedMeetingRow[]> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from('ky_committee_meetings')
    .select('member_refs, ky_committees ( name, slug, chamber )')
    .order('meeting_date', { ascending: false })
    .limit(500);
  if (error || !data) return [];
  return data as unknown as CachedMeetingRow[];
}

function assignmentsFromLrcCalendar(
  leg: KYLegislator,
  meetings: CachedMeetingRow[],
): MemberCommitteeAssignment[] {
  const bySlug = new Map<string, MemberCommitteeAssignment>();

  for (const row of meetings) {
    const committee = row.ky_committees;
    if (!committee?.slug) continue;
    for (const ref of row.member_refs ?? []) {
      if (!legislatorMatchesCalendarRef(leg, ref)) continue;
      const raw = (ref.displayName ?? '').trim();
      const { name, roleLabel } = parseCalendarMemberRole(raw);
      const existing = bySlug.get(committee.slug);
      if (!existing) {
        bySlug.set(committee.slug, {
          slug: committee.slug,
          name: committee.name,
          chamber: committee.chamber,
          roleLabel,
        });
        continue;
      }
      if (roleLabel && !existing.roleLabel) existing.roleLabel = roleLabel;
      if (!existing.name && committee.name) existing.name = committee.name;
    }
  }

  return [...bySlug.values()].sort((a, b) => {
    const ra = roleSortKey(a.roleLabel);
    const rb = roleSortKey(b.roleLabel);
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
  });
}

/**
 * Committee assignments for a member profile: Open States slugs when synced,
 * otherwise LRC legislative calendar `member_refs` on committee meetings.
 */
export async function fetchCommitteeAssignmentsForLegislator(
  leg: KYLegislator,
  committees: KYCommittee[],
): Promise<MemberCommitteeAssignment[]> {
  if (leg.chamber !== 'house' && leg.chamber !== 'senate') return [];

  const fromOs = assignmentsFromOpenStatesSlugs(leg, committees);
  if (fromOs.length > 0) return fromOs;

  const meetings = await fetchCalendarCommitteeMeetingRows();
  return assignmentsFromLrcCalendar(leg, meetings);
}

/** Exported for sync backfill: map LRC district number → committee slugs seen on calendar. */
export function committeeSlugsForLrcDistrictFromMeetings(
  districtNumber: number,
  meetings: CachedMeetingRow[],
): string[] {
  const slugs = new Set<string>();
  for (const row of meetings) {
    const committee = row.ky_committees;
    if (!committee?.slug) continue;
    for (const ref of row.member_refs ?? []) {
      if (ref.districtNumber === districtNumber) slugs.add(committee.slug);
    }
  }
  return [...slugs];
}

export function legislatorNameMatchesLegiscanSessionPerson(
  leg: Pick<KYLegislator, 'name' | 'first_name' | 'last_name'>,
  personName: string,
): boolean {
  const target = normalizeSponsorNameForMatch(personName);
  if (!target) return false;
  const full = normalizeSponsorNameForMatch(leg.name || '');
  if (full && (full === target || target.includes(full) || full.includes(target))) return true;
  const fl = normalizeSponsorNameForMatch(
    [leg.first_name, leg.last_name].filter(Boolean).join(' '),
  );
  if (fl && (fl === target || target.includes(fl) || fl.includes(target))) return true;
  const targetLast = target.split(' ').filter((t) => t.length > 1).pop();
  const legLast = (leg.last_name || '').trim().toLowerCase();
  if (targetLast && legLast && targetLast === legLast) {
    const targetFirst = target.split(' ')[0];
    const legFirst = (leg.first_name || leg.name?.split(/\s+/)[0] || '').trim().toLowerCase();
    if (targetFirst && legFirst && targetFirst[0] === legFirst[0]) return true;
  }
  return false;
}
