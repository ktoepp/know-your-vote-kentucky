'use client';

import NextLink from 'next/link';
import { Box, Button, Card, Divider, Link as MuiLink, Stack, Typography } from '@mui/material';
import { LegislatorIdentityBlock } from '@/components/civic/LegislatorIdentityBlock';
import type { KYLegislator } from '@/types/kentucky';
import { legislatorRoleDistrictLine } from '@/lib/legislator-display';
import {
  kyLegislaturePublicUrl,
  legislatorAvatarDescriptor,
  legislatorDisplayPhone,
  memberProfilePath,
} from '@/lib/ky-member-utils';
import { CopyableEmail } from '@/components/civic/CopyableEmail';
import { MemberName } from '@/components/civic/MemberName';
import { Phone, Email as EmailIcon } from '@mui/icons-material';

export type DistrictMapTooltipSection = {
  chamberLabel: 'House' | 'Senate';
  districtSummary: string;
  leg: KYLegislator | null;
};

export type DistrictMapTooltipModel = {
  sections: DistrictMapTooltipSection[];
};

export function DistrictMapMemberTooltip({
  model,
  legislatorRoster,
}: {
  model: DistrictMapTooltipModel;
  legislatorRoster?: KYLegislator[];
}) {
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
          <DistrictMapTooltipSectionView key={sec.chamberLabel} section={sec} legislatorRoster={legislatorRoster} />
        ))}
      </Stack>
    </Card>
  );
}

function DistrictMapTooltipSectionView({
  section,
  legislatorRoster,
}: {
  section: DistrictMapTooltipSection;
  legislatorRoster?: KYLegislator[];
}) {
  const { chamberLabel, districtSummary, leg } = section;
  const href = leg ? memberProfilePath(leg) : undefined;

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
        <Box sx={{ mb: 1.25 }}>
          <LegislatorIdentityBlock
            name={<MemberName member={leg} variant="primary" />}
            roleLine={legislatorRoleDistrictLine(leg, { includeDistrict: false })}
            density="compact"
            gap={1.25}
            avatar={legislatorAvatarDescriptor(leg)}
          />
            {(leg.email ||
              legislatorDisplayPhone(leg.phone) ||
              (leg.chamber && kyLegislaturePublicUrl(leg, legislatorRoster))) && (
              <Box
                component="div"
                sx={{ mt: 1, pointerEvents: 'auto' }}
                onClick={(e) => e.stopPropagation()}
              >
                {leg.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, minWidth: 0, mb: 0.5 }}>
                    <EmailIcon sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                    <CopyableEmail email={leg.email} variant="body2" display="block" />
                  </Box>
                )}
                {(() => {
                  const mapPhone = legislatorDisplayPhone(leg.phone);
                  if (!mapPhone) return null;
                  return (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                      <Phone sx={{ fontSize: 16, color: 'text.secondary', flexShrink: 0 }} />
                      <Typography
                        component="a"
                        href={`tel:${mapPhone.replace(/[^\d+]/g, '')}`}
                        variant="body2"
                        color="primary"
                        fontWeight={600}
                        sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                      >
                        {mapPhone}
                      </Typography>
                    </Box>
                  );
                })()}
                {!leg.email && leg.chamber && (
                  <MuiLink
                    href={kyLegislaturePublicUrl(leg, legislatorRoster) || 'https://legislature.ky.gov/Legislators'}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="caption"
                    sx={{
                      display: 'inline-block',
                      mt: legislatorDisplayPhone(leg.phone) ? 0.5 : 0,
                      fontWeight: 600,
                    }}
                  >
                    Capitol: Kentucky LRC
                  </MuiLink>
                )}
              </Box>
            )}
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
