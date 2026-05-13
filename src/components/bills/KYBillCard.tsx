'use client';

import React from 'react';
import { Box, Chip, Tooltip, Typography, Avatar } from '@mui/material';
import { Check, Bookmark } from '@mui/icons-material';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
import { memberSlug, normalizeLegislatorPhotoUrl, kySponsorPortraitAlt } from '@/lib/ky-member-utils';
import { SponsorAvatarChip } from '@/components/civic/SponsorAvatarChip';
import { CivicCard } from '@/components/ui/CivicCard';
import { ChamberChip, MetaChip } from '@/components/ui/Chip';
import {
  billStatusChipLabel,
  billStatusToTooltipKey,
  billPrefixToTooltipKey,
  effectiveBillChamber,
  formatBillLabelText,
  getKyBillNextAction,
  isSignedByGovernorBillStatus,
} from '@/lib/bill-display';
import { governmentTooltips } from '@/lib/tooltipContent';
import { getSponsorGroupsFromBill } from '@/lib/ky-bill-sponsors';

function sponsorInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export interface KYBillCardProps {
  bill: KYBill;
  legislators: KYLegislatorRoster[];
  /** When provided, a filled bookmark appears for bills in this set (browse/search/home). */
  followedBillIds?: ReadonlySet<string> | null;
  /** Topic labels the user follows; matching topic chips use filled variant. */
  followedTopics?: ReadonlySet<string> | null;
}

/** Bill grid card — matches home page layout (face + hover tooltip). */
export function KYBillCard({ bill, legislators, followedBillIds, followedTopics }: KYBillCardProps) {
  const router = useRouter();
  const chamber = effectiveBillChamber(bill);
  const statusTooltipKey = billStatusToTooltipKey(bill.status);
  const statusTooltipContent = statusTooltipKey ? governmentTooltips[statusTooltipKey] : null;
  const billTypeTooltipKey = billPrefixToTooltipKey(bill.bill_number);
  const billTypeTooltipContent = billTypeTooltipKey ? governmentTooltips[billTypeTooltipKey] : null;
  const sponsorGroups = getSponsorGroupsFromBill(bill.sponsors, legislators, {
    maxPrimary: 4,
    maxCosponsor: 8,
  });
  const nextAction = getKyBillNextAction(bill);
  const actionDateCard =
    bill.last_action_date != null && bill.last_action_date !== ''
      ? new Date(bill.last_action_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

  const tooltipTitle = (
    <Box component="span" sx={{ display: 'block', maxWidth: 380, p: 0.5 }}>
      {billTypeTooltipContent && (
        <Box
          component="span"
          sx={{ display: 'block', mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'action.hover' }}
        >
          <Typography
            component="span"
            variant="caption"
            display="block"
            sx={{ opacity: 0.75, mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            {billTypeTooltipContent.title}
          </Typography>
          <Typography component="span" variant="body2" display="block" sx={{ fontWeight: 400 }}>
            {billTypeTooltipContent.content}
          </Typography>
        </Box>
      )}
      {statusTooltipContent && (
        <Box
          component="span"
          sx={{ display: 'block', mb: nextAction || sponsorGroups.cosponsor.length > 0 || (bill.topics?.length ?? 0) > 0 ? 1.5 : 0, p: 1, borderRadius: 1, bgcolor: 'action.hover' }}
        >
          <Typography
            component="span"
            variant="caption"
            display="block"
            sx={{ opacity: 0.75, mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            {statusTooltipContent.title}
          </Typography>
          <Typography component="span" variant="body2" display="block" sx={{ fontWeight: 400 }}>
            {statusTooltipContent.content}
          </Typography>
        </Box>
      )}
      {nextAction && (
        <Box
          component="span"
          sx={{ display: 'block', mb: sponsorGroups.cosponsor.length > 0 || (bill.topics?.length ?? 0) > 0 ? 1.5 : 0, p: 1, borderRadius: 1, bgcolor: 'action.hover' }}
        >
          <Typography
            component="span"
            variant="caption"
            display="block"
            sx={{ opacity: 0.75, mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Next step
          </Typography>
          <Typography component="span" variant="body2" display="block" sx={{ fontWeight: 500 }}>
            {formatBillLabelText(nextAction.body)}
          </Typography>
        </Box>
      )}
      {sponsorGroups.cosponsor.length > 0 && (
        <Box component="span" sx={{ display: 'block', mb: bill.topics && bill.topics.length > 0 ? 1.25 : 0 }}>
          <Typography
            component="span"
            variant="caption"
            display="block"
            sx={{ opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}
          >
            Co-sponsors
          </Typography>
          <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            {sponsorGroups.cosponsor.map((s, i) => (
              <SponsorAvatarChip key={`tip-c-${s.name}-${i}`} name={s.name} party={s.party} photoUrl={s.photoUrl} />
            ))}
          </Box>
        </Box>
      )}
      {bill.topics && bill.topics.length > 0 && (
        <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {bill.topics.slice(0, 4).map((t) => {
            const topicFollowed = followedTopics?.has(t) ?? false;
            return (
              <Chip
                key={t}
                component={Link}
                href={`/search?q=${encodeURIComponent(t)}`}
                clickable
                label={t}
                size="medium"
                variant={topicFollowed ? 'filled' : 'outlined'}
                color="primary"
                aria-label={topicFollowed ? `Following: ${t}` : undefined}
                sx={{ fontSize: '0.875rem', fontWeight: 600, '& .MuiChip-label': { px: 1.1 } }}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );

  const hasTooltipContent =
    Boolean(statusTooltipContent) ||
    Boolean(billTypeTooltipContent) ||
    Boolean(nextAction) ||
    sponsorGroups.cosponsor.length > 0 ||
    Boolean(bill.topics && bill.topics.length > 0);

  /** Use row id so list cards match detail when the same bill number exists in multiple sessions. */
  const detailHref = `/bills/${bill.id}`;

  const primarySponsorLine =
    sponsorGroups.primary.length > 0
      ? sponsorGroups.primary
          .map((s) => s.name.trim())
          .filter(Boolean)
          .join(', ')
      : '';

  const cardHeader = (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 1,
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
        {chamber && <ChamberChip chamber={chamber} />}
        {bill.status &&
          (isSignedByGovernorBillStatus(bill.status) ? (
            <MetaChip
              icon={<Check sx={{ fontSize: '1.125rem !important' }} />}
              label={billStatusChipLabel(bill.status)}
              tone="success"
              variant="outlined"
            />
          ) : (
            <MetaChip label={formatBillLabelText(bill.status)} tone="default" variant="outlined" />
          ))}
      </Box>
      {followedBillIds?.has(bill.id) ? (
        <Box
          component="span"
          role="img"
          aria-label="Followed"
          sx={{ display: 'inline-flex', alignItems: 'center', color: 'primary.main', lineHeight: 0 }}
        >
          <Bookmark sx={{ fontSize: '1.25rem' }} aria-hidden />
        </Box>
      ) : null}
    </Box>
  );

  const cardBody = (
    <>
      <Typography variant="h6" component="p" fontWeight={700} gutterBottom sx={{ fontSize: '1.1rem' }}>
        {bill.bill_number}
      </Typography>
      <Typography
        variant="body1"
        color="text.secondary"
        sx={{
          mb: 1.5,
          fontSize: '0.95rem',
          display: '-webkit-box',
          WebkitLineClamp: 3,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
        }}
      >
        {bill.title}
      </Typography>
    </>
  );

  const cardFooter =
    (primarySponsorLine || bill.last_action_date || bill.last_action) ? (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {primarySponsorLine && (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
            <Box sx={{ display: 'flex', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
              {sponsorGroups.primary.map((s, i) => {
                const compact = sponsorGroups.primary.length > 1;
                return (
                  <Avatar
                    key={`${s.name}-${i}`}
                    src={normalizeLegislatorPhotoUrl(s.photoUrl) || undefined}
                    alt={kySponsorPortraitAlt(s.name)}
                    imgProps={{ referrerPolicy: 'no-referrer' }}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/members/${memberSlug(s.name)}`);
                    }}
                    title={s.name}
                    sx={{
                      width: compact ? 32 : 40,
                      height: compact ? 32 : 40,
                      fontSize: compact ? '0.7rem' : '0.8rem',
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    {sponsorInitials(s.name)}
                  </Avatar>
                );
              })}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
                sx={{
                  mb: 0.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              >
                {sponsorGroups.primary.length > 1 ? 'Primary sponsors' : 'Primary sponsor'}
              </Typography>
              <Typography
                variant="body2"
                display="block"
                color="text.primary"
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 500,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.35,
                  opacity: 0.9,
                }}
              >
                {primarySponsorLine}
              </Typography>
            </Box>
          </Box>
        )}
        {(bill.last_action_date || bill.last_action) && (
          <Box>
            <Typography
              variant="caption"
              display="block"
              color="text.secondary"
              sx={{
                mb: bill.last_action ? 0.5 : 0,
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                fontWeight: 600,
                fontSize: '0.7rem',
              }}
            >
              Latest action{actionDateCard ? ` · ${actionDateCard}` : ''}
            </Typography>
            {bill.last_action && (
              <Typography
                variant="body2"
                display="block"
                color="text.secondary"
                sx={{
                  fontSize: '0.875rem',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  lineHeight: 1.35,
                }}
              >
                {formatBillLabelText(bill.last_action)}
              </Typography>
            )}
          </Box>
        )}
      </Box>
    ) : undefined;

  const cardWrap = (
    <Box component="span" sx={{ display: 'block', height: '100%' }}>
      <CivicCard
        variant="bill"
        href={detailHref}
        header={cardHeader}
        body={cardBody}
        footer={cardFooter}
      />
    </Box>
  );

  if (!hasTooltipContent) {
    return cardWrap;
  }

  return (
    <Tooltip
      title={tooltipTitle}
      placement="top"
      arrow
      enterDelay={400}
      componentsProps={{
        tooltip: {
          sx: {
            maxWidth: 420,
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 4,
            '& .MuiTooltip-arrow': { color: 'background.paper' },
          },
        },
      }}
    >
      {cardWrap}
    </Tooltip>
  );
}
