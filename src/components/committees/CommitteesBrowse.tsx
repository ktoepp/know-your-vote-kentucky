'use client';

import React, { useMemo } from 'react';
import { useGaChamberUrlState } from '@/lib/ky-ga-browse-url';
import { gaChamberFilterLabel } from '@/lib/ky-committee-display';
import Link from 'next/link';
import {
  Alert,
  Box,
  Chip,
  Container,
  Grid,
  Link as MuiLink,
  Typography,
} from '@mui/material';
import { Cancel, Gavel } from '@mui/icons-material';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { GaChamberFilterBar } from '@/components/civic/GaChamberFilterBar';
import type { GaChamberFilter } from '@/lib/ky-committee-display';
import { EmptyState } from '@/components/civic/EmptyState';
import { KYCommitteeCard } from '@/components/committees/KYCommitteeCard';
import { PaginatedSection } from '@/components/ui/PaginatedSection';
import type { KYCommitteeBrowseCard } from '@/lib/ky-committees-browse-enriched';
import { LRC_COMMITTEES_INDEX_URL } from '@/lib/ky-committee-display';

const COMMITTEES_PAGE_SIZE = 24;

export interface CommitteesBrowseProps {
  initialCommittees: KYCommitteeBrowseCard[];
}

export function CommitteesBrowse({ initialCommittees }: CommitteesBrowseProps) {
  const committees = initialCommittees;
  const [chamberFilter, setChamberFilter] = useGaChamberUrlState();

  const filtered = useMemo(() => {
    if (!chamberFilter) return committees;
    return committees.filter((c) => c.chamber === chamberFilter);
  }, [committees, chamberFilter]);

  const summary =
    filtered.length === 1 ? '1 committee' : `${filtered.length.toLocaleString()} committees`;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            Committees
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Kentucky General Assembly committees with scheduled meetings on the LRC legislative calendar.{' '}
            <MuiLink component={Link} href="/meetings" fontWeight={600}>
              Browse meetings
            </MuiLink>{' '}
            or{' '}
            <MuiLink component={Link} href="/legislature/resources" fontWeight={600}>
              Frankfort resources
            </MuiLink>
            .
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', sm: 'row' },
            alignItems: { xs: 'flex-start', sm: 'center' },
            gap: 2,
            mb: 2,
            flexWrap: 'wrap',
          }}
        >
          <GaChamberFilterBar value={chamberFilter} onChange={setChamberFilter} />
        </Box>

        {chamberFilter && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>
              Active filters:
            </Typography>
            <Chip
              label={gaChamberFilterLabel(chamberFilter)}
              size="small"
              onDelete={() => setChamberFilter('')}
              deleteIcon={<Cancel />}
              color="primary"
              variant="outlined"
            />
            <Chip label="Clear all" size="small" onClick={() => setChamberFilter('')} variant="outlined" sx={{ ml: 0.5 }} />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Gavel sx={{ fontSize: '1.2rem', color: 'primary.main' }} aria-hidden />
          <Typography variant="body2" fontWeight={600}>
            {summary}
          </Typography>
        </Box>

        {committees.length === 0 ? (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Committee data is unavailable. Run the LRC calendar sync after migration 024.
          </Alert>
        ) : filtered.length === 0 ? (
          <EmptyState message="No committees match your filters. Run the LRC calendar sync after migration 024." />
        ) : (
          <PaginatedSection items={filtered} pageSize={COMMITTEES_PAGE_SIZE} variant="loadmore">
            {(visible) => (
              <Grid container spacing={3}>
                {visible.map((committee) => (
                  <Grid item xs={12} sm={6} md={4} key={committee.id}>
                    <KYCommitteeCard committee={committee} />
                  </Grid>
                ))}
              </Grid>
            )}
          </PaginatedSection>
        )}

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 4, textAlign: 'center' }}>
          Full directory:{' '}
          <a href={LRC_COMMITTEES_INDEX_URL} target="_blank" rel="noopener noreferrer">
            legislature.ky.gov Committees
          </a>
        </Typography>

        <DataFreshnessNote variant="page" source="lrc-calendar" />
      </Container>
    </Box>
  );
}
