'use client';

import React from 'react';
import { Box, Card, CardContent, Chip, Tooltip, Typography } from '@mui/material';
import { Check } from '@mui/icons-material';
import Link from 'next/link';
import { useTheme } from '@mui/material/styles';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
import { SponsorAvatarChip } from '@/components/civic/SponsorAvatarChip';
import {
  billStatusChipLabel,
  effectiveBillChamber,
  formatBillLabelText,
  getKyBillNextAction,
  isSignedByGovernorBillStatus,
} from '@/lib/bill-display';
import { getSponsorGroupsFromBill } from '@/lib/ky-bill-sponsors';

export interface KYBillCardProps {
  bill: KYBill;
  legislators: KYLegislatorRoster[];
}

/** Bill grid card — matches home page layout (face + hover tooltip). */
export function KYBillCard({ bill, legislators }: KYBillCardProps) {
  const theme = useTheme();
  const chamber = effectiveBillChamber(bill);
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
          {bill.topics.slice(0, 4).map((t) => (
            <Chip
              key={t}
              component={Link}
              href={`/search?q=${encodeURIComponent(t)}`}
              clickable
              label={t}
              size="medium"
              variant="outlined"
              sx={{ fontSize: '0.875rem', fontWeight: 600, '& .MuiChip-label': { px: 1.1 } }}
            />
          ))}
        </Box>
      )}
    </Box>
  );

  const hasTooltipContent =
    Boolean(nextAction) || sponsorGroups.cosponsor.length > 0 || Boolean(bill.topics && bill.topics.length > 0);

  const slug = bill.bill_number?.replace(/\s+/g, '') || bill.id;

  const primarySponsorLine =
    sponsorGroups.primary.length > 0
      ? sponsorGroups.primary
          .map((s) => s.name.trim())
          .filter(Boolean)
          .join(', ')
      : '';

  const card = (
    <Card
      component={Link}
      href={`/bills/${slug}`}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.2s',
        textDecoration: 'none',
        color: 'inherit',
        '&:hover': {
          boxShadow: 4,
          transform: 'translateY(-2px)',
          borderColor: theme.palette.primary.main,
        },
      }}
    >
      <CardContent
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          {chamber && (
            <Chip
              label={chamber === 'house' ? 'House' : 'Senate'}
              size="medium"
              color={chamber === 'senate' ? 'secondary' : 'primary'}
              sx={{ fontSize: '0.875rem', fontWeight: 600, '& .MuiChip-label': { px: 1.1 } }}
            />
          )}
          {bill.status &&
            (isSignedByGovernorBillStatus(bill.status) ? (
              <Chip
                icon={<Check sx={{ fontSize: '1.125rem !important' }} />}
                label={billStatusChipLabel(bill.status)}
                size="medium"
                color="success"
                variant="outlined"
                sx={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'success.main',
                  borderColor: 'success.main',
                  '& .MuiChip-label': { px: 1.1 },
                  '& .MuiChip-icon': { color: 'success.main' },
                }}
              />
            ) : (
              <Chip
                label={formatBillLabelText(bill.status)}
                size="medium"
                variant="outlined"
                sx={{ fontSize: '0.875rem', fontWeight: 600, '& .MuiChip-label': { px: 1.1 } }}
              />
            ))}
        </Box>
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
        {(primarySponsorLine || bill.last_action_date || bill.last_action) && (
          <Box sx={{ mt: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {primarySponsorLine && (
              <Box>
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
        )}
      </CardContent>
    </Card>
  );

  const cardWrap = <Box component="span" sx={{ display: 'block', height: '100%' }}>{card}</Box>;

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
