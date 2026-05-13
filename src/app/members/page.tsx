'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Paper,
  IconButton,
  TextField,
  InputAdornment,
  Link as MuiLink,
  ToggleButton,
  ToggleButtonGroup,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import ListSubheader from '@mui/material/ListSubheader';
import { AccountBalance, Cancel, Groups, House, Refresh, Search } from '@mui/icons-material';
import { supabase } from '../lib/supabaseClient';
import type { KYLegislator } from '../../types/kentucky';
import { withTimeout } from '@/lib/async-utils';
import { dedupeKyLegislators, isKentuckyGovernor, memberProfilePath } from '@/lib/ky-member-utils';
import { formatPartyLabel } from '@/lib/bill-display';
import { MemberCard } from '@/components/members/MemberCard';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { committeeMembershipSlugMatchesFilter } from '@/lib/ky-committee-utils';
import { useKyBillCommittees } from '@/lib/use-ky-bill-committees';

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
      <Grid container spacing={3}>
        {legislators.map((leg) => (
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
    </Box>
  );
}

function MembersPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const urlSearchParams = useSearchParams();
  const { committees: committeeOptions } = useKyBillCommittees();

  const committeeSelect = urlSearchParams.get('committee') || '';

  const setCommitteeParam = (slug: string) => {
    const params = new URLSearchParams(urlSearchParams.toString());
    if (!slug) params.delete('committee');
    else params.set('committee', slug);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  };
  const [roster, setRoster] = useState<KYLegislator[]>([]);
  /** Includes inactive rows so LRC district URLs can be suppressed when a predecessor still shares the seat in DB. */
  const legislatorRoster = useMemo(() => dedupeKyLegislators(roster), [roster]);
  const legislators = useMemo(() => legislatorRoster.filter((l) => l.active), [legislatorRoster]);
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
  }, [chamberFilter, partyFilter]);

  const committeeChipLabel = useMemo(() => {
    if (!committeeSelect) return '';
    const found = committeeOptions.find((c) => c.slug === committeeSelect);
    return found?.label ?? committeeSelect.replace(/-/g, ' ');
  }, [committeeSelect, committeeOptions]);

  const rosterHasCommitteeMemberships = useMemo(
    () => roster.some((l) => l.active && (l.committee_memberships?.length ?? 0) > 0),
    [roster],
  );

  const legislatorsByParty = useMemo(() => {
    if (partyFilter === 'all') return legislators;
    return legislators.filter((leg) => formatPartyLabel(leg.party) === partyFilter);
  }, [legislators, partyFilter]);

  const legislatorsScoped = useMemo(() => {
    if (chamberFilter !== 'governor') return legislatorsByParty;
    return legislatorsByParty.filter(isKentuckyGovernor);
  }, [legislatorsByParty, chamberFilter]);

  const legislatorsWithCommittee = useMemo(() => {
    if (!committeeSelect) return legislatorsScoped;
    return legislatorsScoped.filter((leg) => {
      const mem = leg.committee_memberships;
      if (!mem?.length) return false;
      return mem.some((m) => committeeMembershipSlugMatchesFilter(m, committeeSelect));
    });
  }, [legislatorsScoped, committeeSelect]);

  const filtered = legislatorsWithCommittee
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
          Browse all current members of the Kentucky General Assembly.{' '}
          <MuiLink component={Link} href="/members/map" fontWeight={600}>
            Use the district map
          </MuiLink>{' '}
          to find your representatives by ZIP code.
        </Typography>
        <DataFreshnessNote variant="page" source="legislators" />

        <Paper elevation={1} sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'center' } }}>
            <TextField
              fullWidth
              placeholder="Search by name or district..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
              size="small"
            />
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexShrink: 0 }}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Chamber
                </Typography>
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
                  <ToggleButton value="governor">Gov.</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Party
                </Typography>
                <ToggleButtonGroup
                  value={partyFilter}
                  exclusive
                  size="small"
                  onChange={(_, v) => { if (v !== null) setPartyFilter(v); }}
                  aria-label="Filter by party"
                >
                  <ToggleButton value="all">All</ToggleButton>
                  <ToggleButton value="Republican">R</ToggleButton>
                  <ToggleButton value="Democrat">D</ToggleButton>
                  <ToggleButton value="Independent">I</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <FormControl size="small" sx={{ minWidth: 220 }}>
                <InputLabel id="members-committee-label">Committee</InputLabel>
                <Select
                  labelId="members-committee-label"
                  label="Committee"
                  value={committeeSelect}
                  onChange={(e) => setCommitteeParam(e.target.value as string)}
                  MenuProps={{ PaperProps: { sx: { maxHeight: 420 } } }}
                >
                  <MenuItem value="">Any committee</MenuItem>
                  {(() => {
                    const items: React.ReactNode[] = [];
                    let lastChamber: string | undefined;
                    const chamberLabel: Record<string, string> = { house: 'House', senate: 'Senate', joint: 'Joint / Interim' };
                    for (const c of committeeOptions) {
                      const ch = c.chamber ?? 'joint';
                      if (ch !== lastChamber) {
                        items.push(<ListSubheader key={`m-hdr-${ch}`} disableSticky>{chamberLabel[ch] ?? ch}</ListSubheader>);
                        lastChamber = ch;
                      }
                      items.push(<MenuItem key={`m-${c.slug}`} value={c.slug} sx={{ pl: 3 }}>{c.label}</MenuItem>);
                    }
                    return items;
                  })()}
                </Select>
              </FormControl>
            </Box>
            <IconButton
              type="button"
              aria-label="Refresh legislator list"
              onClick={fetchLegislators}
              disabled={loading}
              sx={{ alignSelf: { xs: 'flex-start', md: 'center' }, mt: { xs: 0, md: 2 } }}
            >
              <Refresh />
            </IconButton>
          </Box>
        </Paper>

        {/* Active filter chips */}
        {(chamberFilter !== 'all' || partyFilter !== 'all' || searchQuery || committeeSelect) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>
              Active filters:
            </Typography>
            {chamberFilter !== 'all' && (
              <Chip
                label={chamberFilter === 'governor' ? 'Governor' : chamberFilter === 'house' ? 'House' : 'Senate'}
                size="small"
                onDelete={() => setChamberFilter('all')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {partyFilter !== 'all' && (
              <Chip
                label={partyFilter}
                size="small"
                onDelete={() => setPartyFilter('all')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {committeeSelect && (
              <Chip
                label={committeeChipLabel}
                size="small"
                onDelete={() => setCommitteeParam('')}
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
            {(chamberFilter !== 'all' || partyFilter !== 'all' || searchQuery || committeeSelect) && (
              <Chip
                label="Clear all"
                size="small"
                onClick={() => { setChamberFilter('all'); setPartyFilter('all'); setSearchQuery(''); setCommitteeParam(''); }}
                variant="outlined"
                sx={{ ml: 0.5 }}
              />
            )}
          </Box>
        )}

        {committeeSelect && !loading && roster.length > 0 && !rosterHasCommitteeMemberships && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Committee assignments will appear after you apply migration <strong>017_search_members_discovery</strong> and
            run a legislators sync so Open States roles can populate <strong>committee_memberships</strong>.
          </Alert>
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
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
            <Groups sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No legislators found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {!supabase
                ? 'Member data is currently unavailable. Try again shortly.'
                : chamberFilter === 'governor'
                  ? 'Governor data is temporarily unavailable.'
                  : 'Try adjusting your filters.'}
            </Typography>
          </Paper>
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
          <Grid container spacing={3}>
            {filtered.map((leg) => (
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
