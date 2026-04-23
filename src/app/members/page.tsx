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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
  IconButton,
  TextField,
  InputAdornment,
  Link as MuiLink,
} from '@mui/material';
import { AccountBalance, Groups, House, Refresh, Search } from '@mui/icons-material';
import { supabase } from '../lib/supabaseClient';
import type { KYLegislator } from '../../types/kentucky';
import { withTimeout } from '@/lib/async-utils';
import { isKentuckyGovernor } from '@/lib/ky-member-utils';
import { MemberCard } from '@/components/members/MemberCard';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';

function sortLegislatorsByName(a: KYLegislator, b: KYLegislator) {
  const al = (a.last_name || '').trim().toLowerCase() || a.name.trim().toLowerCase();
  const bl = (b.last_name || '').trim().toLowerCase() || b.name.trim().toLowerCase();
  return al.localeCompare(bl);
}

function ChamberSection({
  title,
  caption,
  icon,
  legislators,
  cardFeatured = false,
}: {
  title: string;
  caption?: string;
  icon: React.ReactNode;
  legislators: KYLegislator[];
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
      <Grid container spacing={3}>
        {legislators.map((leg) => (
          <Grid item xs={12} sm={cardFeatured ? 12 : 6} md={cardFeatured ? 8 : 4} lg={cardFeatured ? 6 : 4} key={leg.id}>
            <MemberCard leg={leg} featured={cardFeatured} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default function MembersPage() {
  const [legislators, setLegislators] = useState<KYLegislator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<'all' | 'governor' | 'house' | 'senate'>('all');
  const [partyFilter, setPartyFilter] = useState<string>('all');

  const fetchLegislators = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        setLoading(false);
        return;
      }
      let query = supabase.from('ky_legislators').select('*').eq('active', true).order('last_name', { ascending: true });
      if (chamberFilter === 'house' || chamberFilter === 'senate') {
        query = query.eq('chamber', chamberFilter);
      }
      if (partyFilter !== 'all') query = query.eq('party', partyFilter);
      const { data, error: fetchError } = await withTimeout(
        query,
        30_000,
        'Loading legislators timed out. Check Supabase or your network.',
      );
      if (fetchError) throw fetchError;
      setLegislators(data || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load legislators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLegislators();
  }, [chamberFilter, partyFilter]);

  const legislatorsScoped = useMemo(() => {
    if (chamberFilter !== 'governor') return legislators;
    return legislators.filter(isKentuckyGovernor);
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
  }, [loading, filtered, searchQuery, chamberFilter, partyFilter]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Kentucky Legislators
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          House and Senate members are grouped by chamber. Only the elected governor is tagged <strong>Governor</strong>{' '}
          and listed under Governor. Other statewide roles (if present in the data) appear under{' '}
          <strong>Other statewide officials</strong>.
        </Typography>
        <Typography variant="body2" sx={{ mb: 1 }}>
          <MuiLink component={Link} href="/members/map" fontWeight={600}>
            District map
          </MuiLink>{' '}
          — explore House and Senate districts and search by ZIP code.
        </Typography>
        <DataFreshnessNote variant="page" source="legislators" />

        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Search by name or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              size="small"
            />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Chamber</InputLabel>
              <Select
                value={chamberFilter}
                onChange={(e) => setChamberFilter(e.target.value as 'all' | 'governor' | 'house' | 'senate')}
                label="Chamber"
              >
                <MenuItem value="all">All (grouped)</MenuItem>
                <MenuItem value="governor">Governor</MenuItem>
                <MenuItem value="house">House</MenuItem>
                <MenuItem value="senate">Senate</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Party</InputLabel>
              <Select value={partyFilter} onChange={(e) => setPartyFilter(e.target.value)} label="Party">
                <MenuItem value="all">All Parties</MenuItem>
                <MenuItem value="Republican">Republican</MenuItem>
                <MenuItem value="Democrat">Democrat</MenuItem>
                <MenuItem value="Independent">Independent</MenuItem>
              </Select>
            </FormControl>
            <IconButton onClick={fetchLegislators} disabled={loading}>
              <Refresh />
            </IconButton>
          </Box>
        </Paper>

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

        {loading && legislators.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        ) : !loading && filtered.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
            <Groups sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No legislators found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {!supabase
                ? 'Supabase is not configured. Legislators will appear once connected.'
                : chamberFilter === 'governor'
                  ? 'No governor record matched. The governor is detected by name in code (update when the officeholder changes).'
                  : 'Try adjusting your filters.'}
            </Typography>
          </Paper>
        ) : chamberFilter === 'all' ? (
          <Box>
            <ChamberSection
              title="Governor"
              icon={<AccountBalance sx={{ fontSize: 28 }} />}
              legislators={governorLegislators}
              cardFeatured
            />
            <ChamberSection
              title="House of Representatives"
              icon={<House sx={{ fontSize: 28 }} />}
              legislators={houseLegislators}
            />
            <ChamberSection
              title="Senate"
              icon={<Groups sx={{ fontSize: 28 }} />}
              legislators={senateLegislators}
            />
            <ChamberSection
              title="Other statewide officials"
              icon={<AccountBalance sx={{ fontSize: 28 }} />}
              legislators={otherStatewideLegislators}
            />
          </Box>
        ) : (
          <Grid container spacing={3}>
            {filtered.map((leg) => (
              <Grid item xs={12} sm={6} md={chamberFilter === 'governor' ? 8 : 4} lg={chamberFilter === 'governor' ? 6 : 4} key={leg.id}>
                <MemberCard leg={leg} featured={chamberFilter === 'governor'} />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
