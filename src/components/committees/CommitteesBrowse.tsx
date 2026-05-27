'use client';

import React, { useMemo, useState } from 'react';
import { useGaChamberUrlState } from '@/lib/ky-ga-browse-url';
import { useFollowedCommittees } from '@/lib/use-followed-committees';
import { gaChamberFilterLabel } from '@/lib/ky-committee-display';
import { getSessionBannerModel } from '@/lib/ky-session-banner';
import Link from 'next/link';
import {
  Alert,
  Box,
  Chip,
  Container,
  FormControl,
  MenuItem,
  Select,
  Link as MuiLink,
  Typography,
} from '@mui/material';
import type { SelectChangeEvent } from '@mui/material';
import { Cancel } from '@mui/icons-material';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { GaChamberFilterBar } from '@/components/civic/GaChamberFilterBar';
import type { GaChamberFilter } from '@/lib/ky-committee-display';
import { EmptyState } from '@/components/civic/EmptyState';
import { KYCommitteeCard } from '@/components/committees/KYCommitteeCard';
import { CardGrid, CardGridItem } from '@/components/ui/CardGrid';
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
  const [topicFilter, setTopicFilter] = useState('');
  const [pageSize, setPageSize] = useState(COMMITTEES_PAGE_SIZE);
  const { followedCommitteeIds, authed, toggleFollow } = useFollowedCommittees();

  const topics = useMemo(() => {
    const unique = new Set<string>();
    for (const committee of committees) {
      for (const tag of committee.topicTags) unique.add(tag);
    }
    return [...unique].sort((a, b) => a.localeCompare(b));
  }, [committees]);

  const filtered = useMemo(() => {
    return committees.filter((c) => {
      const chamberMatches = !chamberFilter || c.chamber === chamberFilter;
      const topicMatches = !topicFilter || c.topicTags.includes(topicFilter);
      return chamberMatches && topicMatches;
    });
  }, [committees, chamberFilter, topicFilter]);

  const summary =
    filtered.length === 1 ? '1 committee' : `${filtered.length.toLocaleString()} committees`;
  const clearFilters = () => {
    setChamberFilter('');
    setTopicFilter('');
  };

  const sessionBanner = getSessionBannerModel();

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 5, md: 7 } }}>
        <Box sx={{ textAlign: 'center', mb: { xs: 2.75, md: 3.5 } }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.5 }}>
            {sessionBanner.sessionName} · {sessionBanner.dateRange}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            sx={{ fontStyle: 'italic', mb: { xs: 2.25, md: 3.25 } }}
          >
            Chambers or committees can still post limited activity after the last scheduled day.
          </Typography>
          <Typography variant="h3" component="h1" fontWeight={600}>
            Committees
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, mx: 'auto', maxWidth: 640 }}>
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

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
          <GaChamberFilterBar value={chamberFilter} onChange={setChamberFilter} />
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', ml: { sm: 'auto' } }}>
            <FormControl size="small">
              <Select
                value={topicFilter}
                displayEmpty
                onChange={(event: SelectChangeEvent) => setTopicFilter(event.target.value)}
                sx={{ borderRadius: 999, minWidth: 112, bgcolor: 'background.paper' }}
                inputProps={{ 'aria-label': 'Filter by topic' }}
              >
                <MenuItem value="">Topic</MenuItem>
                {topics.map((topic) => (
                  <MenuItem key={topic} value={topic}>
                    {topic}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select
                value={String(pageSize)}
                onChange={(event: SelectChangeEvent) => setPageSize(Number(event.target.value))}
                sx={{ borderRadius: 999, minWidth: 76, bgcolor: 'background.paper' }}
                inputProps={{ 'aria-label': 'Committees per page' }}
              >
                {[12, 24, 36].map((value) => (
                  <MenuItem key={value} value={String(value)}>
                    {value}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Box>

        {(chamberFilter || topicFilter) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>
              Active filters:
            </Typography>
            {chamberFilter && (
              <Chip
                label={gaChamberFilterLabel(chamberFilter)}
                size="small"
                onDelete={() => setChamberFilter('')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {topicFilter && (
              <Chip
                label={topicFilter}
                size="small"
                onDelete={() => setTopicFilter('')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            <Chip label="Clear all" size="small" onClick={clearFilters} variant="outlined" sx={{ ml: 0.5 }} />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
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
          <PaginatedSection
            items={filtered}
            pageSize={pageSize}
            resetKey={`${chamberFilter}:${topicFilter}`}
            variant="loadmore"
          >
            {(visible) => (
              <CardGrid>
                {visible.map((committee) => (
                  <CardGridItem key={committee.id}>
                    <KYCommitteeCard
                      committee={committee}
                      following={followedCommitteeIds.has(committee.id)}
                      onToggleFollow={authed ? toggleFollow : undefined}
                    />
                  </CardGridItem>
                ))}
              </CardGrid>
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
