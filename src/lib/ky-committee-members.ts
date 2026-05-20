import type { KYCommittee, KYCommitteeMeeting, KYLegislator } from '@/types/kentucky';
import { committeeMembershipSlugMatchesFilter } from '@/lib/ky-committee-utils';
import { matchLegislatorBySponsorName } from '@/lib/ky-member-utils';
import { normalizeKyGaDisplayName } from '@/lib/ky-committee-display';

export type CommitteeMemberDisplay = {
  key: string;
  displayName: string;
  roleLabel: string | null;
  legislator: KYLegislator | null;
  lrcProfileUrl: string | null;
};

/** Split LRC calendar link text like `Sen. Jane Doe (Co-Chair)` into name + role. */
export function parseCalendarMemberRole(displayName: string): { name: string; roleLabel: string | null } {
  const trimmed = displayName.replace(/\s+/g, ' ').trim();
  const m = trimmed.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (m) {
    return { name: m[1]!.trim(), roleLabel: m[2]!.trim() };
  }
  return { name: trimmed, roleLabel: null };
}

/** LRC `DistrictNumber` on legislator profile URLs (house 1–100, senate 101–138). */
export function chamberFromLrcDistrictNumber(districtNumber: number): 'house' | 'senate' | null {
  if (districtNumber >= 1 && districtNumber <= 100) return 'house';
  if (districtNumber >= 101 && districtNumber <= 138) return 'senate';
  return null;
}

export function kyDistrictFromLrcDistrictNumber(districtNumber: number): string | null {
  if (districtNumber >= 1 && districtNumber <= 100) {
    return `HD-${String(districtNumber).padStart(3, '0')}`;
  }
  if (districtNumber >= 101 && districtNumber <= 138) {
    return `SD-${String(districtNumber - 100).padStart(2, '0')}`;
  }
  return null;
}

export function findLegislatorByLrcDistrictNumber(
  roster: KYLegislator[],
  districtNumber: number,
  displayNameForFallback?: string,
): KYLegislator | null {
  const chamber = chamberFromLrcDistrictNumber(districtNumber);
  const district = kyDistrictFromLrcDistrictNumber(districtNumber);
  if (chamber && district) {
    const active = roster.find((l) => l.chamber === chamber && l.district === district && l.active !== false);
    if (active) return active;
    const any = roster.find((l) => l.chamber === chamber && l.district === district);
    if (any) return any;
  }
  if (displayNameForFallback) {
    const hit = matchLegislatorBySponsorName(roster, displayNameForFallback);
    if (hit) return roster.find((l) => l.id === hit.id) ?? null;
  }
  return null;
}

function roleSortKey(roleLabel: string | null): number {
  if (!roleLabel) return 50;
  const r = roleLabel.toLowerCase();
  if (r.includes('co-chair') || r.includes('co chair')) return 0;
  if (r.includes('chair') && !r.includes('vice')) return 1;
  if (r.includes('vice chair') || r.includes('vice-chair')) return 2;
  return 40;
}

function memberRowKey(legislator: KYLegislator | null, districtNumber: number | null, displayName: string): string {
  if (legislator?.id) return legislator.id;
  if (districtNumber != null) return `dn:${districtNumber}`;
  return `name:${displayName.toLowerCase()}`;
}

function resolveLegislatorForCalendarRef(
  roster: KYLegislator[],
  displayName: string,
  districtNumber: number | null,
): KYLegislator | null {
  if (districtNumber != null) {
    return findLegislatorByLrcDistrictNumber(roster, districtNumber, displayName);
  }
  const hit = matchLegislatorBySponsorName(roster, displayName);
  return hit ? (roster.find((l) => l.id === hit.id) ?? null) : null;
}

/** Dedupe member links from all synced meetings (newest meeting wins for role labels). */
export function aggregateCalendarMembersFromMeetings(meetings: KYCommitteeMeeting[]): Array<{
  displayName: string;
  roleLabel: string | null;
  profileUrl: string | null;
  districtNumber: number | null;
}> {
  const byKey = new Map<
    string,
    { displayName: string; roleLabel: string | null; profileUrl: string | null; districtNumber: number | null }
  >();

  const sorted = [...meetings].sort((a, b) => b.meeting_date.localeCompare(a.meeting_date));

  for (const meeting of sorted) {
    for (const ref of meeting.member_refs ?? []) {
      const raw = (ref.displayName ?? '').trim();
      if (!raw) continue;
      const { name, roleLabel } = parseCalendarMemberRole(raw);
      const dn = ref.districtNumber ?? null;
      const key = dn != null ? `dn:${dn}` : `name:${name.toLowerCase()}`;
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, {
          displayName: name,
          roleLabel,
          profileUrl: ref.profileUrl ?? null,
          districtNumber: dn,
        });
        continue;
      }
      if (roleLabel && !existing.roleLabel) existing.roleLabel = roleLabel;
      if (!existing.profileUrl && ref.profileUrl) existing.profileUrl = ref.profileUrl;
    }
  }

  return [...byKey.values()];
}

/**
 * Build the member list for a committee detail page.
 * Primary source: LRC legislative calendar `member_refs` on synced meetings.
 * Fallback: Open States `committee_memberships` on legislator rows.
 */
export function buildCommitteeMemberDisplay(
  committee: Pick<KYCommittee, 'slug'>,
  meetings: KYCommitteeMeeting[],
  roster: KYLegislator[],
): CommitteeMemberDisplay[] {
  const rows = new Map<string, CommitteeMemberDisplay>();

  for (const cal of aggregateCalendarMembersFromMeetings(meetings)) {
    const legislator = resolveLegislatorForCalendarRef(roster, cal.displayName, cal.districtNumber);
    const displayName = legislator?.name
      ? normalizeKyGaDisplayName(legislator.name)
      : normalizeKyGaDisplayName(cal.displayName);
    const key = memberRowKey(legislator, cal.districtNumber, displayName);
    rows.set(key, {
      key,
      displayName,
      roleLabel: cal.roleLabel,
      legislator,
      lrcProfileUrl: cal.profileUrl,
    });
  }

  for (const leg of roster) {
    if (leg.active === false) continue;
    if (leg.chamber !== 'house' && leg.chamber !== 'senate') continue;
    const memberships = leg.committee_memberships ?? [];
    if (!memberships.some((m) => committeeMembershipSlugMatchesFilter(m, committee.slug))) continue;
    const key = memberRowKey(leg, null, leg.name);
    if (rows.has(key)) continue;
    rows.set(key, {
      key,
      displayName: normalizeKyGaDisplayName(leg.name),
      roleLabel: null,
      legislator: leg,
      lrcProfileUrl: null,
    });
  }

  return [...rows.values()].sort((a, b) => {
    const ra = roleSortKey(a.roleLabel);
    const rb = roleSortKey(b.roleLabel);
    if (ra !== rb) return ra - rb;
    return a.displayName.localeCompare(b.displayName, 'en', { sensitivity: 'base' });
  });
}
