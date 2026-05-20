'use client';

import React from 'react';
import { Box, Typography } from '@mui/material';
import { CivicCard } from '@/components/ui/CivicCard';
import { ChamberChip, MetaChip } from '@/components/ui/Chip';
import type { KYCommitteeBrowseCard } from '@/lib/ky-committees-browse-enriched';
import { normalizeKyGaDisplayName } from '@/lib/ky-committee-display';

export interface KYCommitteeCardProps {
  committee: KYCommitteeBrowseCard;
}

/** Committee grid card — leadership line + topic chips when enriched browse data is available. */
export function KYCommitteeCard({ committee }: KYCommitteeCardProps) {
  const href = `/committees/${encodeURIComponent(committee.slug)}`;
  const displayName = normalizeKyGaDisplayName(committee.name);

  return (
    <CivicCard
      variant="meeting"
      href={href}
      ariaLabel={displayName}
      header={
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {committee.chamber !== 'unknown' && <ChamberChip chamber={committee.chamber} size="small" />}
          {committee.topicTags.map((tag) => (
            <MetaChip key={tag} label={tag} size="small" variant="outlined" />
          ))}
        </Box>
      }
      body={
        <>
          <Typography variant="h6" component="p" fontWeight={700} gutterBottom sx={{ fontSize: '1.05rem' }}>
            {displayName}
          </Typography>
          {committee.leadershipNames.length > 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.45 }}>
              {committee.leadershipNames.join(' · ')}
            </Typography>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Leadership synced from calendar when available
            </Typography>
          )}
        </>
      }
    />
  );
}
