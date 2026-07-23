import type { KYLegislatorRoster } from '@/types/kentucky';
import { formatPartyLabel, formatPartyLetterAbbrev } from '@/lib/bill-display';

export type KyMemberSearchResult = KYLegislatorRoster;

/**
 * Client-side member match over the active roster the `/search` page already holds
 * (no extra fetch). Mirrors the /members browse matching (name + district) but adds
 * party (abbreviation or full label) and chamber word so the unified search finds a
 * legislator however the user names them ("Smith", "District 42", "Republican", "senate").
 * Ranked so exact/name-prefix hits lead; ties break by last name.
 */
export function searchKyMembersInRoster(
  roster: readonly KYLegislatorRoster[],
  query: string,
  limit = 24,
): KyMemberSearchResult[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored: { member: KYLegislatorRoster; score: number }[] = [];
  for (const member of roster) {
    const name = (member.name || '').toLowerCase();
    const last = (member.last_name || '').toLowerCase();
    const first = (member.first_name || '').toLowerCase();
    const district = (member.district || '').toLowerCase();
    const partyAbbrev = formatPartyLetterAbbrev(member.party).toLowerCase();
    const partyLabel = formatPartyLabel(member.party).toLowerCase();
    const chamber = (member.chamber || '').toLowerCase();

    let score = 0;
    if (name === q || last === q) score = 1000;
    else if (name.startsWith(q) || last.startsWith(q) || first.startsWith(q)) score = 820;
    else if (name.includes(q)) score = 620;
    else if (district === q) score = 520;
    else if (district.includes(q)) score = 320;
    else if (q.length >= 2 && (partyAbbrev === q || partyLabel === q || partyLabel.includes(q))) score = 160;
    else if (q.length >= 4 && chamber.includes(q)) score = 120;

    if (score > 0) scored.push({ member, score });
  }

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const al = (a.member.last_name || a.member.name || '').toLowerCase();
    const bl = (b.member.last_name || b.member.name || '').toLowerCase();
    return al.localeCompare(bl);
  });

  return scored.slice(0, limit).map((s) => s.member);
}
