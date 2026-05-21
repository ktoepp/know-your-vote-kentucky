import type { SxProps, Theme } from '@mui/material/styles';
import type { KYLegislator, KYLegislatorRoster } from '@/types/kentucky';
import {
  formatKyLegislatorDistrict,
  formatLegislativeRoleLabel,
  formatSponsorDistrictLine,
} from '@/lib/bill-display';
import { LEGISLATOR_AVATAR } from '@/lib/ui-tokens';
import {
  isKentuckyGovernor,
  kyMemberTitleShort,
  matchLegislatorByLegiscanId,
  matchLegislatorBySponsorName,
  type MemberDisplayInput,
} from '@/lib/ky-member-utils';

export type LegislatorAvatarDensity = keyof typeof LEGISLATOR_AVATAR.size;

type LegislatorRoleLineInput = {
  chamber?: KYLegislator['chamber'];
  district?: KYLegislator['district'];
  name?: KYLegislator['name'];
  party?: KYLegislator['party'];
  role_title?: KYLegislator['role_title'];
  first_name?: string | null;
  last_name?: string | null;
};

/** Representative · House District 26 (or role-only when district omitted). */
export function legislatorRoleDistrictLine(
  leg: LegislatorRoleLineInput,
  opts?: { includeDistrict?: boolean },
): string {
  const includeDistrict = opts?.includeDistrict !== false;
  const title = kyMemberTitleShort(leg);
  if (!includeDistrict) return title;
  const district = formatKyLegislatorDistrict(leg as KYLegislator);
  if (district) return `${title} · ${district}`;
  if (isKentuckyGovernor(leg)) return `${title} · Statewide`;
  return title;
}

/** Role line for LegiScan sponsor rows — prefers roster match for consistent Rep/Sen labels. */
export function legislatorRoleDistrictLineFromSponsor(
  sponsor: MemberDisplayInput & { district?: string | null; people_id?: number },
  legislators?: KYLegislatorRoster[],
): string {
  const matched =
    legislators && sponsor.people_id != null
      ? matchLegislatorByLegiscanId(legislators, sponsor.people_id) ??
        matchLegislatorBySponsorName(legislators, sponsor.name ?? '')
      : null;
  if (matched) return legislatorRoleDistrictLine(matched);
  const parts: string[] = [];
  const role = formatLegislativeRoleLabel(sponsor.role);
  if (role) parts.push(role);
  const district = formatSponsorDistrictLine(sponsor.district);
  if (district) parts.push(district);
  return parts.join(' · ');
}

export function legislatorAvatarSx(density: LegislatorAvatarDensity): SxProps<Theme> {
  const px = LEGISLATOR_AVATAR.size[density];
  return {
    width: px,
    height: px,
    flexShrink: 0,
    fontSize: LEGISLATOR_AVATAR.initialsFontSize[density],
    fontWeight: 700,
  };
}
