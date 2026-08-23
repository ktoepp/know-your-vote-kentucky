import NextLink from 'next/link';
import { Box, Container, Divider, Link as MuiLink, Stack, Typography } from '@mui/material';
import type { KYLegislator } from '@/types/kentucky';
import type { MemberSponsoredBill } from '@/lib/member-profile-data';
import type { MemberCommitteeAssignment } from '@/lib/ky-member-committees';
import { LegislatorAvatar } from '@/components/members/LegislatorAvatar';
import { LegislatorDistrictThumbnail } from '@/components/members/LegislatorDistrictThumbnail';
import {
  kyDistrictCount,
  kyDistrictDisplayName,
  type KyDistrictRef,
} from '@/lib/ky-district-pages';
import {
  legislatorAvatarDescriptor,
  legislatorDisplayPhone,
  kyMemberTitleShort,
  memberProfilePath,
} from '@/lib/ky-member-utils';
import { formatKyBillNumberDisplay, formatKyIsoDateShort, formatPartyLabel } from '@/lib/bill-display';
import { kyBillPath } from '@/lib/ky-bill-slug';
import { normalizeKyGaDisplayName } from '@/lib/ky-committee-display';

export interface DistrictDetailViewProps {
  districtRef: KyDistrictRef;
  /** Current officeholder, or null when the seat is vacant / roster hasn't caught up. */
  leg: KYLegislator | null;
  sponsoredBills: MemberSponsoredBill[];
  committeeAssignments: MemberCommitteeAssignment[];
  /** Session the sponsored-bills list is scoped to. */
  sessionName: string;
}

/** Server-rendered district landing page body — no interactivity beyond links. */
export function DistrictDetailView({
  districtRef,
  leg,
  sponsoredBills,
  committeeAssignments,
  sessionName,
}: DistrictDetailViewProps) {
  const displayName = kyDistrictDisplayName(districtRef);
  const chamberName =
    districtRef.chamber === 'house' ? 'House of Representatives' : 'Senate';
  const seatCount = kyDistrictCount(districtRef.chamber);
  const termSentence =
    districtRef.chamber === 'house'
      ? 'Representatives serve two-year terms.'
      : 'Senators serve four-year terms.';
  const memberTitle = districtRef.chamber === 'house' ? 'Representative' : 'Senator';
  const avatar = leg ? legislatorAvatarDescriptor(leg) : null;
  const phone = leg ? legislatorDisplayPhone(leg.phone) : null;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        {displayName}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        One of {seatCount} districts in the Kentucky {chamberName}.
      </Typography>

      <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
        Current {memberTitle.toLowerCase()}
      </Typography>
      {leg && avatar ? (
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 4 }}>
          <LegislatorAvatar
            src={avatar.src}
            alt={avatar.alt}
            party={avatar.party}
            initials={avatar.initials}
            showPartyBadge={avatar.showPartyBadge}
            imgProps={avatar.imgProps}
            sx={{ width: 64, height: 64 }}
          />
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="h6" component="p" fontWeight={600}>
              <MuiLink component={NextLink} href={memberProfilePath(leg)} underline="hover">
                {leg.name}
              </MuiLink>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {[kyMemberTitleShort(leg), formatPartyLabel(leg.party)].filter(Boolean).join(' · ')}
            </Typography>
            {(leg.email || phone) && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                {leg.email && (
                  <MuiLink href={`mailto:${leg.email}`} underline="hover">
                    {leg.email}
                  </MuiLink>
                )}
                {leg.email && phone && ' · '}
                {phone && (
                  <MuiLink href={`tel:${phone}`} underline="hover">
                    {phone}
                  </MuiLink>
                )}
              </Typography>
            )}
          </Box>
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
          No current member is listed for this district. Roster data is sourced from Open States
          and official Kentucky sources and may lag updates.
        </Typography>
      )}

      <Box sx={{ mb: 4, maxWidth: 560 }}>
        <LegislatorDistrictThumbnail
          leg={{
            chamber: districtRef.chamber,
            district: String(districtRef.districtNumber),
            name: leg?.name ?? displayName,
          }}
          size="profile"
        />
      </Box>

      {sponsoredBills.length > 0 && leg && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
            Sponsored bills
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            Bills sponsored or co-sponsored by {leg.name} in the {sessionName}.
          </Typography>
          <Stack spacing={1.25} component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
            {sponsoredBills.map(({ bill }) => (
              <Box component="li" key={bill.id}>
                <Typography variant="body2">
                  <MuiLink component={NextLink} href={kyBillPath(bill)} underline="hover">
                    {formatKyBillNumberDisplay(bill.bill_number)}: {bill.title}
                  </MuiLink>
                </Typography>
                {(bill.last_action_date || bill.status) && (
                  <Typography variant="caption" color="text.secondary">
                    {[bill.status, formatKyIsoDateShort(bill.last_action_date)]
                      .filter(Boolean)
                      .join(' · ')}
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        </Box>
      )}

      {committeeAssignments.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
            Committee assignments
          </Typography>
          <Typography variant="body2">
            {committeeAssignments.map((c, i) => (
              <Typography key={c.slug} variant="body2" component="span">
                {i > 0 && ' · '}
                <MuiLink
                  component={NextLink}
                  href={`/committees/${encodeURIComponent(c.slug)}`}
                  underline="hover"
                >
                  {normalizeKyGaDisplayName(c.name)}
                </MuiLink>
              </Typography>
            ))}
          </Typography>
        </Box>
      )}

      <Divider sx={{ mb: 3 }} />
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {displayName} is one of {seatCount} districts in the Kentucky {chamberName}. {termSentence}{' '}
        District boundaries follow public U.S. Census data.
      </Typography>
      <Box component="nav" aria-label="Related pages">
        <Typography variant="body2">
          <MuiLink component={NextLink} href="/members/map" underline="hover">
            Find my legislators →
          </MuiLink>
          {' · '}
          <MuiLink component={NextLink} href="/districts" underline="hover">
            All districts →
          </MuiLink>
          {' · '}
          <MuiLink component={NextLink} href="/members" underline="hover">
            Members →
          </MuiLink>
        </Typography>
      </Box>
    </Container>
  );
}
