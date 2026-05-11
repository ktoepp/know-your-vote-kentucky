'use client';

import React from 'react';
import Link from 'next/link';
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
  Tooltip,
  Typography,
} from '@mui/material';
import { Email, OpenInNew, Phone, Public } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import type { KYLegislator } from '@/types/kentucky';
import { useTooltips } from '@/lib/TooltipContext';
import { CopyableEmail } from '@/components/civic/CopyableEmail';
import { KENTUCKY_GOVERNOR_OFFICE_URL } from '@/components/civic/GovernorBeshearChip';
import { MemberName } from '@/components/civic/MemberName';
import {
  formatKyLegislatorDistrict,
  formatRepresentativePartyChipLabel,
  partyBadgeBackgroundColor,
} from '@/lib/bill-display';
import { CHIP } from '@/lib/ui-tokens';
import {
  isKentuckyGovernor,
  kyLegislatorAvatarInitials,
  kyLegislatorCampaignWebsite,
  kyLegislatureProfileUrl,
  kyLegislaturePublicUrl,
  kyMemberTitleShort,
  legiscanMemberPersonUrl,
  memberSlug,
  normalizeBallotpediaHref,
  normalizeLegislatorPhotoUrl,
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
  /**
   * When set, the card surface navigates to the profile (keyboard-accessible stretch link). Nested actions stay clickable.
   */
  profileHref?: string;
  /**
   * Deduped roster (same scope as `/members`). When set, district-inferred legislature.ky.gov profile URLs are skipped if
   * another active legislator claims the same chamber + district — avoids pointing two cards at one seat’s profile.
   */
  legislatorRoster?: KYLegislator[];
  /** Member name heading level for document outline. Use `h1` only on dedicated profile pages. @default 'h3' */
  profileNameHeading?: 'h1' | 'h2' | 'h3';
}

export function MemberCard({
  leg,
  featured = false,
  showDistrictInSubtitle = true,
  profileHref,
  legislatorRoster,
  profileNameHeading = 'h3',
}: MemberCardProps) {
  const theme = useTheme();
  const { tooltipsEnabled } = useTooltips();
  const anchorId = memberSlug(leg.name || leg.id);
  const governor = isKentuckyGovernor(leg);
  /** Open States marks former members inactive after sync; links to LRC/LegiScan often describe the seat or current session, not this row. */
  const isFormerMember = leg.active === false;
  const avatarSize = featured || governor ? 88 : 72;
  const telHref = leg.phone ? `tel:${leg.phone.replace(/[^\d+]/g, '')}` : undefined;
  const lrcProfileOnly = kyLegislatureProfileUrl(leg, legislatorRoster);
  const lrcPublicUrl = kyLegislaturePublicUrl(leg, legislatorRoster);
  const showKyLegislatureButton =
    !isFormerMember &&
    (leg.chamber === 'house' || leg.chamber === 'senate' || Boolean(lrcProfileOnly)) &&
    Boolean(lrcPublicUrl);
  const campaignUrl = isFormerMember ? null : kyLegislatorCampaignWebsite(leg);
  const ballotpediaHref = normalizeBallotpediaHref(leg.ballotpedia);
  const legiscanHref = isFormerMember ? null : legiscanMemberPersonUrl(leg.legiscan_id);
  const pointerPassthrough = Boolean(profileHref);
  const avatarAlt = leg.name?.trim() ? `Portrait of ${leg.name.trim()}` : '';

  const hasFooterActions =
    governor ||
    Boolean(
      (showKyLegislatureButton && lrcPublicUrl) ||
        campaignUrl ||
        ballotpediaHref ||
        legiscanHref,
    );

  return (
    <Card
      id={anchorId}
      elevation={governor ? 3 : 1}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        borderRadius: 3,
        border: governor ? `2px solid ${theme.palette.success.main}` : `1px solid ${theme.palette.divider}`,
        bgcolor: governor ? (theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.08)' : 'rgba(46, 125, 50, 0.04)') : undefined,
        transition: 'all 0.2s ease',
        ...(profileHref && {
          cursor: 'pointer',
          '&:has(.member-card-stretch-link:focus-visible)': {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
        }),
        '&:hover': {
          boxShadow: governor ? 8 : 4,
          transform: 'translateY(-2px)',
          borderColor: governor ? theme.palette.success.dark : theme.palette.primary.main,
        },
      }}
    >
      {profileHref && (
        <Link
          href={profileHref}
          className="member-card-stretch-link"
          aria-label={`View profile for ${leg.name?.trim() || 'legislator'}`}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            borderRadius: theme.spacing(3),
            textDecoration: 'none',
          }}
        >
          <span className="sr-only">View profile</span>
        </Link>
      )}
      <CardContent
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 2.5 },
          position: 'relative',
          zIndex: 2,
          ...(pointerPassthrough ? { pointerEvents: 'none' as const } : {}),
        }}
      >
        <Box
          sx={{
            display: 'flex',
            gap: 2,
            alignItems: 'flex-start',
            flexDirection: featured || governor ? { xs: 'column', sm: 'row' } : 'row',
          }}
        >
          <Avatar
            src={normalizeLegislatorPhotoUrl(leg.photo_url) || normalizeLegislatorPhotoUrl(leg.legiscan_image_url) || undefined}
            alt={avatarAlt}
            imgProps={{ referrerPolicy: 'no-referrer' }}
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
              component={profileNameHeading}
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
                  sx={{ ...CHIP.compact, bgcolor: partyBadgeBackgroundColor(leg.party), color: '#fff' }}
                />
              )}
              {isFormerMember && (
                <Chip label="Not a current member" size="small" variant="outlined" color="warning" sx={CHIP.compact} />
              )}
              {governor && (
                <Chip
                  label="Governor"
                  size="small"
                  color="success"
                  variant="outlined"
                  sx={CHIP.compact}
                />
              )}
            </Stack>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        <Stack spacing={1.75}>
          {leg.email && (
            <Box
              sx={{
                display: 'flex',
                gap: 1.25,
                alignItems: 'flex-start',
                minWidth: 0,
                pointerEvents: pointerPassthrough ? 'auto' : undefined,
              }}
              aria-label="Email"
            >
              <Email sx={{ fontSize: ICON_REM.nav, color: 'text.secondary', flexShrink: 0, mt: 0.2 }} aria-hidden />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <CopyableEmail email={leg.email} display="block" variant="body2" />
                {isFormerMember && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    From our last update — may be outdated if this person no longer holds this office.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
          {!leg.email && isFormerMember && (
            <Box
              sx={{
                display: 'flex',
                gap: 1.25,
                alignItems: 'flex-start',
                minWidth: 0,
                pointerEvents: pointerPassthrough ? 'auto' : undefined,
              }}
            >
              <Email sx={{ fontSize: ICON_REM.nav, color: 'text.disabled', flexShrink: 0, mt: 0.2 }} aria-hidden />
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                Capitol contact is not shown for former members — the official LRC directory lists whoever currently holds
                this seat.
              </Typography>
            </Box>
          )}
          {!leg.email && !isFormerMember && lrcPublicUrl && (
            <Box
              sx={{
                display: 'flex',
                gap: 1.25,
                alignItems: 'flex-start',
                minWidth: 0,
                pointerEvents: pointerPassthrough ? 'auto' : undefined,
              }}
              aria-label="Capitol contact"
            >
              <Email sx={{ fontSize: ICON_REM.nav, color: 'text.disabled', flexShrink: 0, mt: 0.2 }} aria-hidden />
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
                {lrcProfileOnly ? (
                  <>
                    Capitol email and phone:{' '}
                    <Typography
                      component="a"
                      href={lrcProfileOnly}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="primary"
                      fontWeight={600}
                      sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      official legislature profile
                    </Typography>
                    .
                  </>
                ) : (
                  <>
                    Capitol email and phone: use the{' '}
                    <Typography
                      component="a"
                      href={lrcPublicUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      color="primary"
                      fontWeight={600}
                      sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                    >
                      {leg.chamber === 'senate'
                        ? 'LRC Senate directory'
                        : leg.chamber === 'house'
                          ? 'LRC House directory'
                          : 'Kentucky LRC directory'}
                    </Typography>
                    .
                  </>
                )}
              </Typography>
            </Box>
          )}
          {leg.phone && (
            <Box
              sx={{
                display: 'flex',
                gap: 1.25,
                alignItems: 'flex-start',
                pointerEvents: pointerPassthrough ? 'auto' : undefined,
              }}
              aria-label="Phone"
            >
              <Phone sx={{ fontSize: ICON_REM.nav, color: 'text.secondary', flexShrink: 0, mt: 0.2 }} aria-hidden />
              <Box>
                <Typography
                  component="a"
                  variant="body2"
                  href={telHref}
                  fontWeight={600}
                  sx={{ color: 'primary.main', textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
                >
                  {leg.phone}
                </Typography>
                {isFormerMember && (
                  <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                    From our last update — may no longer be current.
                  </Typography>
                )}
              </Box>
            </Box>
          )}
        </Stack>
      </CardContent>

      {hasFooterActions && (
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
          position: 'relative',
          zIndex: 3,
          pointerEvents: pointerPassthrough ? 'auto' : undefined,
        }}
      >
        {showKyLegislatureButton && lrcPublicUrl && (
          <Button
            component="a"
            size="small"
            variant="text"
            color="inherit"
            href={lrcPublicUrl}
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
        {ballotpediaHref && (
          <Tooltip
            title={
              tooltipsEnabled
                ? isFormerMember
                  ? 'Ballotpedia often covers former officeholders; verify dates and current roles on official sources when needed.'
                  : 'Ballotpedia is a nonpartisan encyclopedia of American politics. Profiles include background, campaign history, and voting record.'
                : ''
            }
            placement="top"
            arrow
            enterDelay={400}
          >
            <Button
              component="a"
              size="small"
              variant="text"
              color="inherit"
              href={ballotpediaHref}
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
          </Tooltip>
        )}
        {legiscanHref && (
          <Button
            component="a"
            size="small"
            variant="text"
            color="inherit"
            href={legiscanHref}
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
            LegiScan
          </Button>
        )}
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
      )}
    </Card>
  );
}
