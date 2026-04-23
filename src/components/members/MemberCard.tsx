'use client';

import React from 'react';
import {
  Avatar,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { Email, OpenInNew, Phone, Public } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import type { KYLegislator } from '@/types/kentucky';
import { CopyableEmail } from '@/components/civic/CopyableEmail';
import { KENTUCKY_GOVERNOR_OFFICE_URL } from '@/components/civic/GovernorBeshearChip';
import { MemberName } from '@/components/civic/MemberName';
import {
  formatKyLegislatorDistrict,
  formatRepresentativePartyChipLabel,
  partyFilledChipSx,
  STATUS_OUTLINED_CHIP_SX,
} from '@/lib/bill-display';
import {
  ballotpediaMemberSearchUrl,
  isKentuckyGovernor,
  kyLegislatorAvatarInitials,
  kyLegislatorCampaignWebsite,
  kyLegislatureProfileUrl,
  kyMemberTitleShort,
  memberSlug,
} from '@/lib/ky-member-utils';
import { ICON_REM } from '@/lib/ui-tokens';

function titleAndDistrictLine(leg: KYLegislator): string {
  const title = kyMemberTitleShort(leg);
  const district = formatKyLegislatorDistrict(leg);
  if (district) return `${title} · ${district}`;
  if (isKentuckyGovernor(leg)) return `${title} · Statewide`;
  return title;
}

/** Role only (no district) — use when district is already shown elsewhere (e.g. map sidebar). */
function roleOnlySubtitleLine(leg: KYLegislator): string {
  const title = kyMemberTitleShort(leg);
  const district = formatKyLegislatorDistrict(leg);
  if (isKentuckyGovernor(leg) && !district) return `${title} · Statewide`;
  return title;
}

export interface MemberCardProps {
  leg: KYLegislator;
  /** Wider layout and emphasis for the governor card */
  featured?: boolean;
  /**
   * When false, subtitle is role only (e.g. "Representative") — omit district text because the parent UI already names the district.
   * @default true
   */
  showDistrictInSubtitle?: boolean;
}

export function MemberCard({ leg, featured = false, showDistrictInSubtitle = true }: MemberCardProps) {
  const theme = useTheme();
  const anchorId = memberSlug(leg.name || leg.id);
  const governor = isKentuckyGovernor(leg);
  const avatarSize = featured || governor ? 88 : 72;
  const telHref = leg.phone ? `tel:${leg.phone.replace(/[^\d+]/g, '')}` : undefined;
  const lrcUrl = kyLegislatureProfileUrl(leg);
  const campaignUrl = kyLegislatorCampaignWebsite(leg);

  return (
    <Card
      id={anchorId}
      elevation={governor ? 3 : 1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        border: governor ? `2px solid ${theme.palette.success.main}` : `1px solid ${theme.palette.divider}`,
        bgcolor: governor ? (theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.08)' : 'rgba(46, 125, 50, 0.04)') : undefined,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: governor ? 8 : 4,
          transform: 'translateY(-2px)',
          borderColor: governor ? theme.palette.success.dark : theme.palette.primary.main,
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, p: { xs: 2, sm: 2.5 } }}>
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'flex-start',
            flexDirection: featured || governor ? { xs: 'column', sm: 'row' } : 'row',
          }}
        >
          <Avatar
            src={leg.photo_url || undefined}
            alt=""
            sx={{
              width: avatarSize,
              height: avatarSize,
              flexShrink: 0,
              fontSize: featured || governor ? '1.5rem' : '1.25rem',
              fontWeight: 700,
              border: governor ? `2px solid ${theme.palette.success.main}` : undefined,
            }}
          >
            {kyLegislatorAvatarInitials(leg)}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              component="h3"
              variant={governor ? 'h5' : 'h6'}
              fontWeight={800}
              color="text.primary"
              gutterBottom
              sx={{ lineHeight: 1.25 }}
            >
              <MemberName member={leg} variant="primary" />
            </Typography>
            <Typography
              variant="subtitle1"
              component="p"
              sx={{
                mb: 1.25,
                fontWeight: 700,
                color: 'primary.main',
                lineHeight: 1.35,
              }}
            >
              {showDistrictInSubtitle ? titleAndDistrictLine(leg) : roleOnlySubtitleLine(leg)}
            </Typography>
            <Stack direction="row" gap={0.75} flexWrap="wrap" useFlexGap>
              {leg.party && (
                <Chip
                  label={formatRepresentativePartyChipLabel(leg.party)}
                  size="small"
                  sx={partyFilledChipSx(leg.party)}
                />
              )}
              {governor && (
                <Chip
                  label="Governor"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={STATUS_OUTLINED_CHIP_SX}
                />
              )}
            </Stack>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.75}>
          {leg.email && (
            <Box
              sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', minWidth: 0 }}
              aria-label="Email"
            >
              <Email sx={{ fontSize: ICON_REM.nav, color: 'text.secondary', flexShrink: 0, mt: 0.2 }} aria-hidden />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <CopyableEmail email={leg.email} display="block" variant="body2" />
              </Box>
            </Box>
          )}
          {leg.phone && (
            <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start' }} aria-label="Phone">
              <Phone sx={{ fontSize: ICON_REM.nav, color: 'text.secondary', flexShrink: 0, mt: 0.2 }} aria-hidden />
              <Typography
                component="a"
                variant="body2"
                href={telHref}
                fontWeight={600}
                sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
              >
                {leg.phone}
              </Typography>
            </Box>
          )}
        </Stack>
      </CardContent>

      <CardActions
        sx={{
          px: { xs: 2, sm: 2.5 },
          pb: 2,
          pt: 0,
          gap: 0.25,
          flexWrap: 'wrap',
          alignItems: 'center',
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        {lrcUrl && (
          <Button
            component="a"
            size="small"
            variant="text"
            color="inherit"
            href={lrcUrl}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNew sx={{ fontSize: '0.9rem', opacity: 0.65 }} />}
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              textTransform: 'none',
              fontSize: '0.8125rem',
              minHeight: 32,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            KY Legislature
          </Button>
        )}
        {campaignUrl && (
          <Button
            component="a"
            size="small"
            variant="text"
            color="inherit"
            href={campaignUrl}
            target="_blank"
            rel="noopener noreferrer"
            endIcon={<OpenInNew sx={{ fontSize: '0.9rem', opacity: 0.65 }} />}
            sx={{
              color: 'text.secondary',
              fontWeight: 500,
              textTransform: 'none',
              fontSize: '0.8125rem',
              minHeight: 32,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            Website
          </Button>
        )}
        <Button
          component="a"
          size="small"
          variant="text"
          color="inherit"
          href={ballotpediaMemberSearchUrl(leg.name)}
          target="_blank"
          rel="noopener noreferrer"
          endIcon={<OpenInNew sx={{ fontSize: '0.9rem', opacity: 0.65 }} />}
          sx={{
            color: 'text.secondary',
            fontWeight: 500,
            textTransform: 'none',
            fontSize: '0.8125rem',
            minHeight: 32,
            '&:hover': { bgcolor: 'action.hover' },
          }}
        >
          Ballotpedia
        </Button>
        {governor && (
          <Button
            component="a"
            size="small"
            variant="text"
            color="inherit"
            href={KENTUCKY_GOVERNOR_OFFICE_URL}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<Public sx={{ fontSize: '0.95rem', opacity: 0.75 }} />}
            endIcon={<OpenInNew sx={{ fontSize: '0.9rem', opacity: 0.65 }} />}
            sx={{
              color: 'success.main',
              fontWeight: 500,
              textTransform: 'none',
              fontSize: '0.8125rem',
              minHeight: 32,
              '&:hover': { bgcolor: 'action.hover' },
            }}
          >
            Governor office
          </Button>
        )}
      </CardActions>
    </Card>
  );
}
