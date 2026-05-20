'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Container,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  TextField,
  InputAdornment,
  Link as MuiLink,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';
import { AccountBalance, Cancel, Groups, House, Search } from '@mui/icons-material';
import type { KYLegislator } from '@/types/kentucky';
import { isKentuckyGovernor, memberProfilePath } from '@/lib/ky-member-utils';
import { MemberCard } from '@/components/members/MemberCard';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { PaginatedSection } from '@/components/ui/PaginatedSection';

function sortLegislatorsByName(a: KYLegislator, b: KYLegislator) {
  const al = (a.last_name || '').trim().toLowerCase() || a.name.trim().toLowerCase();
  const bl = (b.last_name || '').trim().toLowerCase() || b.name.trim().toLowerCase();
  return al.localeCompare(bl);
}

const MEMBERS_PAGE_SIZE = 24;

function ChamberSection({
  title,
  caption,
  icon,
  legislators,
  legislatorRoster,
  cardFeatured = false,
}: {
  title: string;
  caption?: string;
  icon: React.ReactNode;
  legislators: KYLegislator[];
  legislatorRoster: KYLegislator[];
  cardFeatured?: boolean;
}) {
  if (legislators.length === 0) return null;
  return (
    <Box component="section" sx={{ mb: 4 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Box sx={{ color: 'primary.main', display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Box>
          <Typography variant="h6" component="h2" fontWeight={700}>
            {title}
          </Typography>
          {caption && (
            <Typography variant="body2" color="text.secondary">
              {caption}
            </Typography>
          )}
        </Box>
        <Chip label={legislators.length} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
      </Box>
      <PaginatedSection items={legislators} pageSize={MEMBERS_PAGE_SIZE} variant="loadmore">
        {(visible) => (
          <Grid container spacing={3}>
            {visible.map((leg) => (
              <Grid
                item
                xs={12}
                sm={cardFeatured ? 12 : 6}
                md={cardFeatured ? 8 : 4}
                lg={cardFeatured ? 6 : 4}
                key={leg.id}
              >
                <MemberCard
                  leg={leg}
                  featured={cardFeatured}
                  profileHref={memberProfilePath(leg)}
                  legislatorRoster={legislatorRoster}
                />
              </Grid>
            ))}
          </Grid>
        )}
      </PaginatedSection>
    </Box>
  );
}

export interface MembersBrowseProps {
  initialRoster: KYLegislator[];
}

export function MembersBrowse({ initialRoster }: MembersBrowseProps) {
  const legislatorRoster = initialRoster;
  const legislators = useMemo(() => legislatorRoster.filter((l) => l.active), [legislatorRoster]);
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<'all' | 'governor' | 'house' | 'senate'>('all');

  const legislatorsScoped = useMemo(() => {
    if (chamberFilter === 'governor') return legislators.filter(isKentuckyGovernor);
    return legislators;
  }, [legislators, chamberFilter]);

  const filtered = legislatorsScoped
    .filter((leg) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return leg.name?.toLowerCase().includes(q) || leg.district?.toLowerCase().includes(q);
    })
    .sort(sortLegislatorsByName);

  const executiveLegislators = filtered
    .filter((l) => isKentuckyGovernor(l) || (l.chamber == null && !isKentuckyGovernor(l)))
    .sort(sortLegislatorsByName);
  const houseLegislators = filtered.filter((l) => l.chamber === 'house');
  const senateLegislators = filtered.filter((l) => l.chamber === 'senate');

  useEffect(() => {
    if (filtered.length === 0) return;
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    if (!hash) return;
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [filtered, searchQuery, chamberFilter]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            Members
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Browse all current members of the Kentucky General Assembly.{' '}
            <MuiLink component={Link} href="/members/map" fontWeight={600}>
              Use the district map
            </MuiLink>{' '}
            to find your representatives by address.
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
          <ToggleButtonGroup
            value={chamberFilter}
            exclusive
            size="small"
            onChange={(_, v) => {
              if (v !== null) setChamberFilter(v);
            }}
            aria-label="Filter by chamber"
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="house">House</ToggleButton>
            <ToggleButton value="senate">Senate</ToggleButton>
          </ToggleButtonGroup>
          <TextField
            placeholder="Search by name or district…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            }}
            size="small"
            sx={{ width: { xs: '100%', sm: 260 } }}
          />
        </Box>

        {(chamberFilter !== 'all' || searchQuery) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>
              Active filters:
            </Typography>
            {chamberFilter !== 'all' && (
              <Chip
                label={chamberFilter === 'house' ? 'House' : 'Senate'}
                size="small"
                onDelete={() => setChamberFilter('all')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {searchQuery && (
              <Chip
                label={`"${searchQuery}"`}
                size="small"
                onDelete={() => setSearchQuery('')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            <Chip
              label="Clear all"
              size="small"
              onClick={() => {
                setChamberFilter('all');
                setSearchQuery('');
              }}
              variant="outlined"
              sx={{ ml: 0.5 }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Groups sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
          <Typography variant="body2" fontWeight={600}>
            {filtered.length} {filtered.length === 1 ? 'person' : 'people'}
          </Typography>
        </Box>

        {legislatorRoster.length === 0 ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            Member data is currently unavailable. Try again shortly.
          </Alert>
        ) : filtered.length === 0 ? (
          <Box
            sx={{
              p: 6,
              textAlign: 'center',
              borderRadius: 2,
              border: '1px solid',
              borderColor: 'divider',
              bgcolor: 'background.paper',
            }}
          >
            <Groups sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No legislators found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting your filters.
            </Typography>
          </Box>
        ) : chamberFilter === 'all' ? (
          <Box>
            {executiveLegislators.length > 0 && (
              <ChamberSection
                title="Governor's office"
                caption="Governor, Lieutenant Governor, and other statewide executive officials"
                icon={<AccountBalance sx={{ fontSize: 28 }} />}
                legislators={executiveLegislators}
                legislatorRoster={legislatorRoster}
                cardFeatured
              />
            )}
            <ChamberSection
              title="House of Representatives"
              icon={<House sx={{ fontSize: 28 }} />}
              legislators={houseLegislators}
              legislatorRoster={legislatorRoster}
            />
            <ChamberSection
              title="Senate"
              icon={<Groups sx={{ fontSize: 28 }} />}
              legislators={senateLegislators}
              legislatorRoster={legislatorRoster}
            />
          </Box>
        ) : (
          <PaginatedSection
            items={filtered}
            pageSize={MEMBERS_PAGE_SIZE}
            resetKey={`${chamberFilter}|${searchQuery}`}
            variant="loadmore"
          >
            {(visible) => (
              <Grid container spacing={3}>
                {visible.map((leg) => (
                  <Grid
                    item
                    xs={12}
                    sm={6}
                    md={chamberFilter === 'governor' ? 8 : 4}
                    lg={chamberFilter === 'governor' ? 6 : 4}
                    key={leg.id}
                  >
                    <MemberCard
                      leg={leg}
                      featured={chamberFilter === 'governor'}
                      profileHref={memberProfilePath(leg)}
                      legislatorRoster={legislatorRoster}
                    />
                  </Grid>
                ))}
              </Grid>
            )}
          </PaginatedSection>
        )}

        <DataFreshnessNote variant="page" source="legislators" />
      </Container>
    </Box>
  );
}
