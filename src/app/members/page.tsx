'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
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
import { supabase } from '../lib/supabaseClient';
import type { KYLegislator } from '../../types/kentucky';
import { withTimeout } from '@/lib/async-utils';
import { dedupeKyLegislators, isKentuckyGovernor, memberProfilePath } from '@/lib/ky-member-utils';
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
  /** Full deduped roster for seat-level URL validation on member cards. */
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
      <PaginatedSection
        items={legislators}
        pageSize={MEMBERS_PAGE_SIZE}
        variant="loadmore"
      >
        {(visible) => (
          <Grid container spacing={3}>
            {visible.map((leg) => (
              <Grid item xs={12} sm={cardFeatured ? 12 : 6} md={cardFeatured ? 8 : 4} lg={cardFeatured ? 6 : 4} key={leg.id}>
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

function MembersPageContent() {
  const [roster, setRoster] = useState<KYLegislator[]>([]);
  /** Includes inactive rows so LRC district URLs can be suppressed when a predecessor still shares the seat in DB. */
  const legislatorRoster = useMemo(() => dedupeKyLegislators(roster), [roster]);
  const legislators = useMemo(() => legislatorRoster.filter((l) => l.active), [legislatorRoster]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<'all' | 'governor' | 'house' | 'senate'>('all');

  const fetchLegislators = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        setLoading(false);
        return;
      }
      let query = supabase.from('ky_legislators').select('*').order('last_name', { ascending: true });
      if (chamberFilter === 'house' || chamberFilter === 'senate') {
        query = query.eq('chamber', chamberFilter);
      }
      // Party is not filtered in SQL: DB values are often D/R/I (LegiScan) while the UI uses full names.
      const { data, error: fetchError } = await withTimeout(
        query,
        30_000,
        'Loading legislators timed out. Check Supabase or your network.',
      );
      if (fetchError) throw fetchError;
      setRoster(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load legislators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegislators();
  }, [chamberFilter]);

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

  const governorLegislators = filtered.filter(isKentuckyGovernor);
  const houseLegislators = filtered.filter((l) => l.chamber === 'house');
  const senateLegislators = filtered.filter((l) => l.chamber === 'senate');
  const otherStatewideLegislators = filtered.filter((l) => l.chamber == null && !isKentuckyGovernor(l));

  useEffect(() => {
    if (loading || filtered.length === 0) return;
    const hash = typeof window !== 'undefined' ? window.location.hash.replace(/^#/, '') : '';
    if (!hash) return;
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }, [loading, filtered, searchQuery, chamberFilter]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Heading */}
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
          <DataFreshnessNote variant="page" source="legislators" />
        </Box>

        {/* Filter bar */}
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
            onChange={(_, v) => { if (v !== null) setChamberFilter(v); }}
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
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ fontSize: 18 }} /></InputAdornment> }}
            size="small"
            sx={{ width: { xs: '100%', sm: 260 } }}
          />
        </Box>

        {/* Active filter chips */}
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
              onClick={() => { setChamberFilter('all'); setSearchQuery(''); }}
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
          {loading && <CircularProgress size={18} />}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading && roster.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : !loading && filtered.length === 0 ? (
          <Box sx={{ p: 6, textAlign: 'center', borderRadius: 2, border: '1px solid', borderColor: 'divider', bgcolor: 'background.paper' }}>
            <Groups sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No legislators found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {!supabase
                ? 'Member data is currently unavailable. Try again shortly.'
                : 'Try adjusting your filters.'}
            </Typography>
          </Box>
        ) : chamberFilter === 'all' ? (
          <Box>
            <ChamberSection
              title="Governor"
              icon={<AccountBalance sx={{ fontSize: 28 }} />}
              legislators={governorLegislators}
              legislatorRoster={legislatorRoster}
              cardFeatured
            />
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
            <ChamberSection
              title="Other statewide officials"
              icon={<AccountBalance sx={{ fontSize: 28 }} />}
              legislators={otherStatewideLegislators}
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
                  <Grid item xs={12} sm={6} md={chamberFilter === 'governor' ? 8 : 4} lg={chamberFilter === 'governor' ? 6 : 4} key={leg.id}>
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
      </Container>
    </Box>
  );
}

export default function MembersPage() {
  return (
    <Suspense
      fallback={
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
          <CircularProgress aria-label="Loading members page" />
        </Box>
      }
    >
      <MembersPageContent />
    </Suspense>
  );
}
