'use client';

import React, { useMemo } from 'react';
import { Box } from '@mui/material';
import { ChamberChip, CommitteeKindChip } from '@/components/ui/Chip';
import {
  resolveKyCommitteeKind,
  type KyCommitteeKind,
} from '@/lib/ky-committee-display';
import type { KYCommittee } from '@/types/kentucky';

export interface CommitteeTagRowProps {
  committee: Pick<KYCommittee, 'name' | 'chamber' | 'committee_type'>;
  /** Hide chamber chip when unknown. @default true */
  showChamber?: boolean;
  /** Extra chips after kind tag (e.g. topic tags). */
  children?: React.ReactNode;
}

export function CommitteeTagRow({
  committee,
  showChamber = true,
  children,
}: CommitteeTagRowProps) {
  const kindInfo = useMemo(
    () => resolveKyCommitteeKind(committee.name, committee.committee_type),
    [committee.name, committee.committee_type],
  );

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
      {showChamber && committee.chamber !== 'unknown' && (
        <ChamberChip chamber={committee.chamber} size="small" />
      )}
      {kindInfo.kind !== 'unknown' && <CommitteeKindChip kind={kindInfo.kind as KyCommitteeKind} />}
      {children}
    </Box>
  );
}

export function useCommitteeKindInfo(committee: Pick<KYCommittee, 'name' | 'committee_type'>) {
  return useMemo(
    () => resolveKyCommitteeKind(committee.name, committee.committee_type),
    [committee.name, committee.committee_type],
  );
}
