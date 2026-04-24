'use client';

import NextLink from 'next/link';
import { Avatar, Box, Button, Card, Chip, Divider, Stack, Typography } from '@mui/material';
import type { KYLegislator } from '@/types/kentucky';
import { formatKyLegislatorDistrict, formatRepresentativePartyChipLabel, partyBadgeBackgroundColor } from '@/lib/bill-display';
import { CHIP } from '@/lib/ui-tokens';
import { isKentuckyGovernor, kyLegislatorAvatarInitials, kyMemberTitleShort, memberSlug } from '@/lib/ky-member-utils';
import { MemberName } from '@/components/civic/MemberName';

/** Role line for map tooltip: district is already shown above, so omit repeating it. */
function mapTooltipRoleLine(leg: KYLegislator): string {
  const title = kyMemberTitleShort(leg);
  const district = formatKyLegislatorDistrict(leg);
  if (isKentuckyGovernor(leg) && !district) return `${title} · Statewide`;
  return title;
}

function memberProfileHash(leg: KYLegislator): string {
  return memberSlug(leg.name || leg.id);
}

export type DistrictMapTooltipSection = {
  chamberLabel: 'House' | 'Senate';
  districtSummary: string;
  leg: KYLegislator | null;
};

export type DistrictMapTooltipModel = {
  sections: DistrictMapTooltipSection[];
};

export function DistrictMapMemberTooltip({ model }: { model: DistrictMapTooltipModel }) {
  return (
    <Card
      elevation={4}
      sx={{
        maxWidth: 300,
        borderRadius: 3,
        border: 1,
        borderColor: 'divider',
        overflow: 'hidden',
        pointerEvents: 'none',
      }}
    >
      <Stack divider={<Divider flexItem />} sx={{ p: 0 }}>
        {model.sections.map((sec) => (
          <DistrictMapTooltipSectionView key={sec.chamberLabel} section={sec} />
        ))}
      </Stack>
    </Card>
  );
}

function DistrictMapTooltipSectionView({ section }: { section: DistrictMapTooltipSection }) {
  const { chamberLabel, districtSummary, leg } = section;
  const href = leg ? `/members#${memberProfileHash(leg)}` : undefined;

  return (
    <Box sx={{ px: 2, py: 1.75 }}>
      {!leg && (
        <>
          <Typography variant="caption" color="text.secondary" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {chamberLabel}
          </Typography>
          <Typography variant="body2" color="primary.main" fontWeight={700}>
            {districtSummary}
          </Typography>
        </>
      )}
      {leg && (
        <Typography variant="body2" color="primary.main" fontWeight={700} sx={{ mb: 1 }}>
          {districtSummary}
        </Typography>
      )}

      {leg && (
        <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', mb: 1.25 }}>
          <Avatar
            src={leg.photo_url || undefined}
            alt=""
            sx={{ width: 48, height: 48, flexShrink: 0, fontWeight: 700, fontSize: '1rem' }}
          >
            {kyLegislatorAvatarInitials(leg)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={800} color="text.primary" sx={{ lineHeight: 1.25 }} gutterBottom>
              <MemberName member={leg} variant="primary" />
            </Typography>
            <Typography variant="body2" fontWeight={700} color="primary.main" sx={{ mb: 0.75, lineHeight: 1.35 }}>
              {mapTooltipRoleLine(leg)}
            </Typography>
            {leg.party && (
              <Chip label={formatRepresentativePartyChipLabel(leg.party)} size="small" sx={{ ...CHIP.compact, bgcolor: partyBadgeBackgroundColor(leg.party), color: '#fff' }} />
            )}
          </Box>
        </Box>
      )}

      {!leg && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          No roster match for this district.
        </Typography>
      )}

      {href && (
        <Button
          component={NextLink}
          href={href}
          variant="contained"
          size="small"
          fullWidth
          sx={{
            pointerEvents: 'auto',
            mt: 0.5,
            textTransform: 'none',
            fontWeight: 700,
          }}
        >
          View on legislators page
        </Button>
      )}
    </Box>
  );
}
