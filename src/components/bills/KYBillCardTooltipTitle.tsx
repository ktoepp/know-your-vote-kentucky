'use client';

import React from 'react';
import Link from 'next/link';
import { Box, Chip, Typography } from '@mui/material';
import type { KYBill } from '@/types/kentucky';
import {
  billPrefixToTooltipKey,
  billStatusToTooltipKey,
  formatBillLabelText,
  getKyBillNextAction,
} from '@/lib/bill-display';
import { governmentTooltips } from '@/lib/tooltipContent';
import type { SponsorGroups } from '@/lib/ky-bill-sponsors';
import { SponsorAvatarChip } from '@/components/civic/SponsorAvatarChip';

export function KYBillCardTooltipTitle({
  bill,
  sponsorGroups,
  followedTopics,
}: {
  bill: KYBill;
  sponsorGroups: SponsorGroups;
  followedTopics?: ReadonlySet<string> | null;
}) {
  const statusTooltipKey = billStatusToTooltipKey(bill.status);
  const statusTooltipContent = statusTooltipKey ? governmentTooltips[statusTooltipKey] : null;
  const billTypeTooltipKey = billPrefixToTooltipKey(bill.bill_number);
  const billTypeTooltipContent = billTypeTooltipKey ? governmentTooltips[billTypeTooltipKey] : null;
  const nextAction = getKyBillNextAction(bill);

  return (
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
          sx={{
            display: 'block',
            mb: nextAction || sponsorGroups.cosponsor.length > 0 || (bill.topics?.length ?? 0) > 0 ? 1.5 : 0,
            p: 1,
            borderRadius: 1,
            bgcolor: 'action.hover',
          }}
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
          sx={{
            display: 'block',
            mb: sponsorGroups.cosponsor.length > 0 || (bill.topics?.length ?? 0) > 0 ? 1.5 : 0,
            p: 1,
            borderRadius: 1,
            bgcolor: 'action.hover',
          }}
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
                onClick={(e) => e.stopPropagation()}
                sx={{ fontSize: '0.875rem', fontWeight: 600, '& .MuiChip-label': { px: 1.1 } }}
              />
            );
          })}
        </Box>
      )}
    </Box>
  );
}

export function kyBillCardHasTooltipContent(
  bill: KYBill,
  sponsorGroups: Pick<SponsorGroups, 'cosponsor'>,
): boolean {
  const statusTooltipKey = billStatusToTooltipKey(bill.status);
  const billTypeTooltipKey = billPrefixToTooltipKey(bill.bill_number);
  return (
    Boolean(statusTooltipKey && governmentTooltips[statusTooltipKey]) ||
    Boolean(billTypeTooltipKey && governmentTooltips[billTypeTooltipKey]) ||
    Boolean(getKyBillNextAction(bill)) ||
    sponsorGroups.cosponsor.length > 0 ||
    Boolean(bill.topics && bill.topics.length > 0)
  );
}
