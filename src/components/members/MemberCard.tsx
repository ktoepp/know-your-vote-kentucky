'use client';

import React from 'react';
import Link from 'next/link';
import { Box, Divider, Stack, Tooltip, Typography } from '@mui/material';
import { Email, Phone, Public } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import type { KYLegislator } from '@/types/kentucky';
import { useTooltips } from '@/lib/TooltipContext';
import { CivicCard } from '@/components/ui/CivicCard';
import { CopyableEmail } from '@/components/civic/CopyableEmail';
import { KENTUCKY_GOVERNOR_OFFICE_URL } from '@/components/civic/GovernorBeshearChip';
import { LegislatorExternalLinkButton } from '@/components/civic/LegislatorExternalLinkButton';
import { LegislatorIdentityBlock } from '@/components/civic/LegislatorIdentityBlock';
import { MemberName } from '@/components/civic/MemberName';
import { MetaChip } from '@/components/ui/Chip';
import { KentuckyDistrictLocatorMap } from '@/components/members/KentuckyDistrictLocatorMap';
import { legislatorDistrictLine, legislatorRoleTitle } from '@/lib/legislator-display';
import { CARD, FOCUS_RING, ICON_REM } from '@/lib/ui-tokens';
import {
  isKentuckyGovernor,
  kyLegislatorCampaignWebsite,
  kyLegislatureProfileUrl,
  kyLegislaturePublicUrl,
  legislatorAvatarDescriptor,
  legislatorDisplayPhone,
  memberCanonicalSlug,
  normalizeBallotpediaHref,
} from '@/lib/ky-member-utils';

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
  /** Show district minimap for House/Senate seats. @default true */
  showDistrictMinimap?: boolean;
  /**
   * Render the footer row of external-link buttons (KY Legislature, Ballotpedia, campaign site, governor office).
   * Set false on the full profile page, where a dedicated "Profiles & links" section consolidates these instead.
   * @default true
   */
  showFooterLinks?: boolean;
  /**
   * Custom footer slot rendered inside the card below the divider (e.g. the profile page's
   * consolidated "Profiles & links" list). Takes precedence over the default link buttons.
   */
  footerContent?: React.ReactNode;
}

/**
 * Memoized: `/members` renders dozens of these per section, and every search
 * keystroke re-renders the parent — with stable `leg` / `legislatorRoster`
 * identities the unchanged cards bail out of re-rendering entirely.
 */
export const MemberCard = React.memo(function MemberCard({
  leg,
  featured = false,
  showDistrictInSubtitle = true,
  profileHref,
  legislatorRoster,
  profileNameHeading = 'h3',
  showDistrictMinimap = true,
  showFooterLinks = true,
  footerContent,
}: MemberCardProps) {
  const theme = useTheme();
  const { tooltipsEnabled } = useTooltips();
  const anchorId = memberCanonicalSlug(leg);
  const governor = isKentuckyGovernor(leg);
  /** Open States marks former members inactive after sync; links to LRC/LegiScan often describe the seat or current session, not this row. */
  const isFormerMember = leg.active === false;
  const avatarDensity = featured || governor ? 'hero' : 'card';
  const displayPhone = legislatorDisplayPhone(leg.phone);
  const telHref = displayPhone ? `tel:${displayPhone.replace(/[^\d+]/g, '')}` : undefined;
  const lrcProfileOnly = kyLegislatureProfileUrl(leg, legislatorRoster);
  const lrcPublicUrl = kyLegislaturePublicUrl(leg, legislatorRoster);
  const showKyLegislatureButton =
    !isFormerMember &&
    (leg.chamber === 'house' || leg.chamber === 'senate' || Boolean(lrcProfileOnly)) &&
    Boolean(lrcPublicUrl);
  const campaignUrl = isFormerMember ? null : kyLegislatorCampaignWebsite(leg);
  const ballotpediaHref = normalizeBallotpediaHref(leg.ballotpedia);
  const pointerPassthrough = Boolean(profileHref);
  const hasFooterActions =
    governor ||
    Boolean((showKyLegislatureButton && lrcPublicUrl) || campaignUrl || ballotpediaHref);

  const showDistrictMap =
    showDistrictMinimap &&
    showDistrictInSubtitle &&
    (leg.chamber === 'house' || leg.chamber === 'senate');

  const identityBlock = (
    <LegislatorIdentityBlock
      name={<MemberName member={leg} variant="primary" />}
      nameComponent={profileNameHeading}
      roleTitle={legislatorRoleTitle(leg)}
      districtLine={showDistrictInSubtitle ? legislatorDistrictLine(leg) : null}
      density={avatarDensity}
      avatar={legislatorAvatarDescriptor(leg)}
      avatarSx={governor ? { border: `2px solid ${theme.palette.success.main}` } : undefined}
      chips={
        isFormerMember || governor ? (
          <>
            {isFormerMember && (
              <MetaChip label="Not a current member" size="small" tone="warning" variant="outlined" />
            )}
            {governor && <MetaChip label="Governor" size="small" tone="success" variant="outlined" />}
          </>
        ) : undefined
      }
    />
  );

  // District map (statewide KY locator, mirroring the profile page) sits beside the
  // portrait + name + title rather than stacked below it. It is decorative here — the whole
  // card already links to the profile — so it renders non-interactively (no nested link).
  const header = showDistrictMap ? (
    <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>{identityBlock}</Box>
      <Box sx={{ width: { xs: 124, sm: 100 }, flexShrink: 0, mt: 0.5, pointerEvents: 'none' }}>
        <KentuckyDistrictLocatorMap leg={leg} interactive={false} showCaption={false} bordered={false} />
      </Box>
    </Box>
  ) : (
    identityBlock
  );

  const body = (
    <>
      <Divider sx={{ mt: -0.5, mb: 1.75 }} />
      <Stack spacing={1.75}>
          {leg.email && (
            <Box
              sx={{
                minWidth: 0,
                pointerEvents: pointerPassthrough ? 'auto' : undefined,
              }}
              aria-label="Email"
            >
              <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'center', minWidth: 0 }}>
                <Email sx={{ fontSize: ICON_REM.nav, color: 'text.secondary', flexShrink: 0 }} aria-hidden />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <CopyableEmail email={leg.email} display="block" variant="body2" />
                </Box>
              </Box>
              {isFormerMember && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  sx={{ mt: 0.5, pl: `calc(${ICON_REM.nav} + 10px)` }}
                >
                  From our last update — may be outdated if this person no longer holds this office.
                </Typography>
              )}
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
          {displayPhone && (
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
                  {displayPhone}
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
      {footerContent == null && showFooterLinks && hasFooterActions && (
        <Box
          sx={{
            display: 'flex',
            gap: 0.25,
            flexWrap: 'wrap',
            alignItems: 'center',
            mt: 1.25,
            pointerEvents: pointerPassthrough ? 'auto' : undefined,
          }}
        >
          {showKyLegislatureButton && lrcPublicUrl && (
            <LegislatorExternalLinkButton href={lrcPublicUrl}>KY Legislature</LegislatorExternalLinkButton>
          )}
          {campaignUrl && (
            <LegislatorExternalLinkButton href={campaignUrl}>Website</LegislatorExternalLinkButton>
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
              <LegislatorExternalLinkButton href={ballotpediaHref}>Ballotpedia</LegislatorExternalLinkButton>
            </Tooltip>
          )}
          {governor && (
            <LegislatorExternalLinkButton
              href={KENTUCKY_GOVERNOR_OFFICE_URL}
              startIcon={<Public sx={{ fontSize: '0.95rem', opacity: 0.75 }} aria-hidden />}
              sx={{ color: 'success.main' }}
            >
              Governor office
            </LegislatorExternalLinkButton>
          )}
        </Box>
      )}
    </>
  );

  // Footer slot is used only for the profile page's consolidated "Profiles & links" block
  // (passed via footerContent). The default per-card link row now lives in the body, tight
  // under the email — so a member card has a single divider (header → contact), not two.
  const footer =
    footerContent != null ? (
      <Box
        sx={{
          borderTop: 1,
          borderColor: 'divider',
          pt: 2,
          mt: -0.5,
          pointerEvents: pointerPassthrough ? 'auto' : undefined,
        }}
      >
        {footerContent}
      </Box>
    ) : undefined;

  return (
    // Hover/focus styles live HERE, not on the Card: the Card has `pointer-events: none`
    // (clicks fall through to the stretch link), so its own `:hover` only fired over the
    // re-enabled email/phone/link children instead of the whole card surface.
    <Box
      sx={{
        position: 'relative',
        height: '100%',
        ...(profileHref && {
          cursor: 'pointer',
          '&:hover .member-card-surface': {
            boxShadow:
              theme.palette.mode === 'dark' ? CARD.hoverBoxShadowDark : CARD.hoverBoxShadow,
            transform: CARD.hoverTransform,
            borderColor: governor ? theme.palette.success.dark : theme.palette.primary.main,
          },
          '&:has(.member-card-stretch-link:focus-visible) .member-card-surface': FOCUS_RING,
        }),
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
      <CivicCard
        variant="member"
        featured={governor}
        id={anchorId}
        className="member-card-surface"
        sx={{
          position: 'relative',
          zIndex: 2,
          ...(governor && {
            border: `2px solid ${theme.palette.success.main}`,
            bgcolor:
              theme.palette.mode === 'dark' ? 'rgba(46, 125, 50, 0.08)' : 'rgba(46, 125, 50, 0.04)',
          }),
          ...(pointerPassthrough && { pointerEvents: 'none' as const }),
        }}
        header={header}
        body={body}
        footer={footer}
      />
    </Box>
  );
});
