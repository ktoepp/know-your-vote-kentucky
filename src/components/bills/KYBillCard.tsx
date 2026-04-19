'use client';

import React from 'react';
import { Box, Card, CardContent, Chip, Tooltip, Typography } from '@mui/material';
import Link from 'next/link';
import { useTheme } from '@mui/material/styles';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
import { SponsorAvatarChip } from '@/components/civic/SponsorAvatarChip';
import { effectiveBillChamber, formatBillLabelText, getKyBillNextAction } from '@/lib/bill-display';
import { getPrimarySponsorsFromBill } from '@/lib/ky-bill-sponsors';

export interface KYBillCardProps {
  bill: KYBill;
  legislators: KYLegislatorRoster[];
}

/** Bill grid card — matches home page layout (face + hover tooltip). */
export function KYBillCard({ bill, legislators }: KYBillCardProps) {
  const theme = useTheme();
  const chamber = effectiveBillChamber(bill);
  const primarySponsors = getPrimarySponsorsFromBill(bill.sponsors, legislators, 2);
  const nextAction = getKyBillNextAction(bill);
  const actionDateShort =
    bill.last_action_date != null && bill.last_action_date !== ''
      ? new Date(bill.last_action_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : '';

  const tooltipTitle = (
    <Box component="span" sx={{ display: 'block', maxWidth: 380, p: 0.5 }}>
      {bill.last_action && (
        <Box component="span" sx={{ display: 'block', mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
          <Typography
            component="span"
            variant="caption"
            display="block"
            sx={{ opacity: 0.75, mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Latest Action{actionDateShort ? ` · ${actionDateShort}` : ''}
          </Typography>
          <Typography component="span" variant="body2" display="block" sx={{ fontWeight: 500 }}>
            {formatBillLabelText(bill.last_action)}
          </Typography>
        </Box>
      )}
      {nextAction && (
        <Box component="span" sx={{ display: 'block', mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
          <Typography
            component="span"
            variant="caption"
            display="block"
            sx={{ opacity: 0.75, mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.05em' }}
          >
            Next Action{actionDateShort ? ` · ${actionDateShort}` : ''}
          </Typography>
          <Typography component="span" variant="body2" display="block" sx={{ fontWeight: 500 }}>
            {formatBillLabelText(nextAction.body)}
          </Typography>
        </Box>
      )}
      {primarySponsors.length > 0 && (
        <Box component="span" sx={{ display: 'block', mb: 1.25 }}>
          <Typography
            component="span"
            variant="caption"
            display="block"
            sx={{ opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}
          >
            {primarySponsors.length > 1 ? 'Sponsors' : 'Sponsor'}
          </Typography>
          <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap' }}>
            {primarySponsors.map((s, i) => (
              <Box key={i} component="span" sx={{ display: 'inline-block', mr: 0.5, mb: 0.5 }}>
                <SponsorAvatarChip name={s.name} party={s.party} photoUrl={s.photoUrl} />
              </Box>
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
              size="small"
              variant="outlined"
              sx={{ fontSize: '0.7rem', height: 24 }}
            />
          ))}
        </Box>
      )}
    </Box>
  );

  const slug = bill.bill_number?.replace(/\s+/g, '') || bill.id;

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
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          {chamber && (
            <Chip
              label={chamber === 'house' ? 'House' : 'Senate'}
              size="small"
              color={chamber === 'senate' ? 'secondary' : 'primary'}
            />
          )}
          {bill.status && <Chip label={formatBillLabelText(bill.status)} size="small" variant="outlined" />}
        </Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          {bill.bill_number}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{
            mb: 1.5,
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {bill.title}
        </Typography>
        {bill.last_action_date && (
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 'auto' }}>
            {new Date(bill.last_action_date).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

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
      <Box component="span" sx={{ display: 'block', height: '100%' }}>
        {card}
      </Box>
    </Tooltip>
  );
}
