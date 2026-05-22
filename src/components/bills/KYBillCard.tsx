'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { BillNumber } from '@/components/bills/BillNumber';
import { LegislatorAvatar } from '@/components/members/LegislatorAvatar';
import { Bookmark } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
import {
  matchLegislatorBySponsorName,
  memberSlug,
  normalizeLegislatorPhotoUrl,
  kySponsorPortraitAlt,
} from '@/lib/ky-member-utils';
import { legislatorAvatarSx, legislatorRoleDistrictLine } from '@/lib/legislator-display';
import { LEGISLATOR_FIELD_LABEL_SX, LEGISLATOR_NAME_SX, LEGISLATOR_ROLE_LINE_SX } from '@/lib/ui-tokens';
import { BillStatusMetaChip } from '@/components/bills/BillStatusMetaChip';
import { CivicCard } from '@/components/ui/CivicCard';
import { ChamberChip } from '@/components/ui/Chip';
import { effectiveBillChamber, formatBillLabelText } from '@/lib/bill-display';
import { getSponsorGroupsFromBill } from '@/lib/ky-bill-sponsors';

function sponsorInitials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export interface KYBillCardProps {
  bill: KYBill;
  legislators: KYLegislatorRoster[];
  followedBillIds?: ReadonlySet<string> | null;
  followedTopics?: ReadonlySet<string> | null;
}

/** Bill grid card — browse, search, and feed. Educational tooltip on the status chip; no whole-card preview tooltip. */
export function KYBillCard({ bill, legislators, followedBillIds }: KYBillCardProps) {
  const router = useRouter();
  const chamber = effectiveBillChamber(bill);
  const sponsorGroups = getSponsorGroupsFromBill(bill.sponsors, legislators, {
    maxPrimary: 4,
    maxCosponsor: 8,
  });
  const actionDateCard =
    bill.last_action_date != null && bill.last_action_date !== ''
      ? new Date(bill.last_action_date).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : '';

  const detailHref = `/bills/${bill.id}`;

  const primarySponsorLine =
    sponsorGroups.primary.length > 0
      ? sponsorGroups.primary
          .map((s) => s.name.trim())
          .filter(Boolean)
          .join(', ')
      : '';
  const singlePrimaryRoleLine =
    sponsorGroups.primary.length === 1
      ? (() => {
          const s = sponsorGroups.primary[0]!;
          const leg = matchLegislatorBySponsorName(legislators, s.name);
          return leg ? legislatorRoleDistrictLine(leg) : null;
        })()
      : null;

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
        {bill.status && <BillStatusMetaChip bill={bill} variant="card" />}
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
      <BillNumber billNumber={bill.bill_number} size="card" color="text.primary" sx={{ mb: 1 }} />
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
    primarySponsorLine || bill.last_action_date || bill.last_action ? (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {primarySponsorLine && (
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.25 }}>
            <Box sx={{ display: 'flex', flexShrink: 0, flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
              {sponsorGroups.primary.map((s, i) => {
                const compact = sponsorGroups.primary.length > 1;
                return (
                  <LegislatorAvatar
                    key={`${s.name}-${i}`}
                    src={normalizeLegislatorPhotoUrl(s.photoUrl) || undefined}
                    alt={kySponsorPortraitAlt(s.name)}
                    imgProps={{ referrerPolicy: 'no-referrer' }}
                    party={s.party}
                    initials={sponsorInitials(s.name)}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      router.push(`/members/${memberSlug(s.name)}`);
                    }}
                    title={s.name}
                    sx={{
                      ...legislatorAvatarSx(compact ? 'inlineDense' : 'inline'),
                      cursor: 'pointer',
                      border: '1px solid',
                      borderColor: 'divider',
                    }}
                  />
                );
              })}
            </Box>
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography component="span" sx={LEGISLATOR_FIELD_LABEL_SX}>
                {sponsorGroups.primary.length > 1 ? 'Primary sponsors' : 'Primary sponsor'}
              </Typography>
              <Typography component="div" sx={{ ...LEGISLATOR_NAME_SX, fontSize: '0.9375rem' }}>
                {primarySponsorLine}
              </Typography>
              {singlePrimaryRoleLine && (
                <Typography component="p" sx={{ ...LEGISLATOR_ROLE_LINE_SX, fontSize: '0.8125rem', mt: 0.25 }}>
                  {singlePrimaryRoleLine}
                </Typography>
              )}
            </Box>
          </Box>
        )}
        {(bill.last_action_date || bill.last_action) && (
          <Box>
            <Typography
              component="span"
              sx={{ ...LEGISLATOR_FIELD_LABEL_SX, mb: bill.last_action ? 0.5 : 0 }}
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

  return (
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
}
