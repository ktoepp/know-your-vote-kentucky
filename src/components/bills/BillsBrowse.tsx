'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  InputAdornment,
  CircularProgress,
  Alert,
  Paper,
  Grid,
  IconButton,
  ToggleButtonGroup,
  ToggleButton,
  Tooltip,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Cancel, Search, Refresh, Gavel } from '@mui/icons-material';
import { LayoutGrid, List } from 'lucide-react';
import { supabase } from '@/app/lib/supabaseClient';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
import { KYBillCard } from '@/components/bills/KYBillCard';
import { BillsListTable } from '@/components/bills/BillsListTable';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { billMatchesBrowseStatusFilter, compareKyBills, effectiveBillChamber, type KyBillSortKey } from '@/lib/bill-display';
import { billMatchesCommitteeFilter } from '@/lib/ky-committee-utils';
import { withTimeout } from '@/lib/async-utils';
import { PaginatedSection } from '@/components/ui/PaginatedSection';
import { PAGE_SIZE_CHOICES, toPageSizeChoice, usePersistedPageSize } from '@/lib/use-persisted-page-size';
import { useKyBillCommittees } from '@/lib/use-ky-bill-committees';

/**
 * One query loads up to this many rows; client filters/sorts, then `PaginatedSection` paginates 25/50/100.
 * A full KY session is on the order of ~500–600 bills — well under Supabase’s 1000 per-request cap.
 */
const BROWSE_QUERY_ROW_LIMIT = 1000;

function defaultSortDirForKey(key: KyBillSortKey): 'asc' | 'desc' {
  return key === 'last_action_date' || key === 'introduced_date' ? 'desc' : 'asc';
}

export type BillsBrowseChamberMode = 'all' | 'house' | 'senate';

/** Shared Supabase query for browse + refresh (house/senate include prefix fallback when `chamber` is null). Status is never filtered in SQL; use `billMatchesBrowseStatusFilter` in the client. */
function applyKyBillsQuery(
  chamberMode: BillsBrowseChamberMode,
  chamberFilter: 'all' | 'house' | 'senate',
) {
  if (!supabase) return null;
  let query = supabase.from('ky_bills').select('*').order('session', { ascending: false }).order('last_action_date', { ascending: false });
  const effectiveChamber = chamberMode === 'all' ? chamberFilter : chamberMode;
  if (effectiveChamber === 'house') {
    query = query.or('chamber.eq.house,bill_number.ilike.H%');
  } else if (effectiveChamber === 'senate') {
    query = query.or('chamber.eq.senate,bill_number.ilike.S%');
  }
  return query.limit(BROWSE_QUERY_ROW_LIMIT);
}

export interface BillsBrowseProps {
  title: string;
  subtitle: string;
  chamberMode: BillsBrowseChamberMode;
}

export function BillsBrowse({ title, subtitle, chamberMode }: BillsBrowseProps) {
  const [bills, setBills] = useState<KYBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<'all' | 'house' | 'senate'>(
    chamberMode === 'all' ? 'all' : chamberMode,
  );
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [committeeFilter, setCommitteeFilter] = useState('');
  const [legislators, setLegislators] = useState<KYLegislatorRoster[]>([]);
  const { committees: committeeOptions } = useKyBillCommittees();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [sortBy, setSortBy] = useState<KyBillSortKey>('last_action_date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const { pageSize, setPageSize } = usePersistedPageSize('bills', 25);

  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase
      .from('ky_legislators')
      .select('id,legiscan_id,name,first_name,last_name,party,chamber,district,photo_url')
      .eq('active', true)
      .then(({ data }) => {
        if (!cancelled) setLegislators(data || []);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const query = applyKyBillsQuery(chamberMode, chamberFilter);
        if (!query) {
          if (!cancelled) setLoading(false);
          return;
        }
        const { data, error: fetchError } = await withTimeout(
          query,
          30_000,
          'Loading bills timed out. Check Supabase or your network.',
        );
        if (fetchError) throw fetchError;
        if (!cancelled) setBills(data || []);
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Failed to load bills');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [chamberMode, chamberFilter]);

  const filteredBills = bills.filter((bill) => {
    if (chamberMode === 'all' && chamberFilter !== 'all') {
      if (effectiveBillChamber(bill) !== chamberFilter) return false;
    }
    if (!billMatchesBrowseStatusFilter(bill, statusFilter)) {
      return false;
    }
    if (!billMatchesCommitteeFilter(bill, committeeFilter)) {
      return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      bill.bill_number?.toLowerCase().includes(q) ||
      bill.title?.toLowerCase().includes(q) ||
      bill.description?.toLowerCase().includes(q) ||
      bill.ai_summary?.toLowerCase().includes(q) ||
      bill.session?.toLowerCase().includes(q) ||
      bill.last_action?.toLowerCase().includes(q) ||
      bill.status?.toLowerCase().includes(q) ||
      (bill.committee_name || '').toLowerCase().includes(q)
    );
  });

  const sortedBills = useMemo(() => {
    const next = [...filteredBills];
    next.sort((a, b) => {
      const c = compareKyBills(a, b, sortBy);
      return sortDir === 'asc' ? c : -c;
    });
    return next;
  }, [filteredBills, sortBy, sortDir]);

  const handleRequestSort = useCallback(
    (key: KyBillSortKey) => {
      if (sortBy === key) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortBy(key);
        setSortDir(defaultSortDirForKey(key));
      }
    },
    [sortBy],
  );

  const browsePagerResetKey = `${searchQuery}|${chamberFilter}|${statusFilter}|${committeeFilter}|${viewMode}|${sortBy}|${sortDir}|${pageSize}|${sortedBills.length}|${sortedBills[0]?.id ?? ''}`;

  const showChamberSelect = chamberMode === 'all';

  const committeeFilterLabel = useMemo(() => {
    if (!committeeFilter) return '';
    return committeeOptions.find((c) => c.slug === committeeFilter)?.label ?? committeeFilter.replace(/-/g, ' ');
  }, [committeeFilter, committeeOptions]);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          {title}
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          {subtitle}
        </Typography>
        <DataFreshnessNote variant="page" source="bills" />

        {!supabase && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Set <strong>NEXT_PUBLIC_SUPABASE_URL</strong> and <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> in{' '}
            <code>.env.local</code> and restart the dev server to load bills.
          </Alert>
        )}

        <Paper elevation={1} sx={{ p: 2, mb: 1.5, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: { md: 'flex-start' } }}>
            <TextField
              fullWidth
              placeholder="Search by bill number, title, session, status, or summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
              size="small"
              sx={{ mt: { md: 2.75 } }}
            />
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2, flexShrink: 0 }}>
              {showChamberSelect && (
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
                  </ToggleButtonGroup>
                </Box>
              )}
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Status
                </Typography>
                <ToggleButtonGroup
                  value={statusFilter}
                  exclusive
                  size="small"
                  onChange={(_, v) => { if (v !== null) setStatusFilter(v); }}
                  aria-label="Filter by status"
                  sx={{ flexWrap: 'wrap' }}
                >
                  <ToggleButton value="all">All</ToggleButton>
                  <ToggleButton value="introduced">Intro</ToggleButton>
                  <ToggleButton value="in_committee">Cmte</ToggleButton>
                  <ToggleButton value="passed_one_chamber">1 Chamber</ToggleButton>
                  <ToggleButton value="passed">Passed</ToggleButton>
                  <ToggleButton value="signed">Signed</ToggleButton>
                  <ToggleButton value="vetoed">Vetoed</ToggleButton>
                </ToggleButtonGroup>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Committee
                </Typography>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                  <InputLabel id="browse-committee-label">Committee</InputLabel>
                  <Select
                    labelId="browse-committee-label"
                    label="Committee"
                    value={committeeFilter}
                    onChange={(e) => setCommitteeFilter(e.target.value)}
                  >
                    <MenuItem value="">All committees</MenuItem>
                    {committeeOptions.map((c) => (
                      <MenuItem key={c.slug} value={c.slug}>
                        {c.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', pb: 0.25 }}>
                <Tooltip title="Grid or list">
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={viewMode}
                    onChange={(_, v) => v && setViewMode(v)}
                    aria-label="View mode"
                    sx={{ flexShrink: 0 }}
                  >
                    <ToggleButton value="grid" aria-label="Grid view">
                      <LayoutGrid size={18} strokeWidth={2} />
                    </ToggleButton>
                    <ToggleButton value="list" aria-label="List view">
                      <List size={18} strokeWidth={2} />
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Tooltip>
                <IconButton
                  onClick={() => {
                    void (async () => {
                      setLoading(true);
                      setError(null);
                      try {
                        const query = applyKyBillsQuery(chamberMode, chamberFilter);
                        if (!query) {
                          setLoading(false);
                          return;
                        }
                        const { data, error: fetchError } = await withTimeout(
                          query,
                          30_000,
                          'Loading bills timed out. Check Supabase or your network.',
                        );
                        if (fetchError) throw fetchError;
                        setBills(data || []);
                      } catch (err: any) {
                        setError(err.message || 'Failed to load bills');
                      } finally {
                        setLoading(false);
                      }
                    })();
                  }}
                  disabled={loading}
                  aria-label="Refresh bills"
                >
                  <Refresh />
                </IconButton>
              </Box>
            </Box>
          </Box>
        </Paper>

        {/* Active filter chips */}
        {(chamberFilter !== 'all' || statusFilter !== 'all' || committeeFilter || searchQuery) && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75, mb: 2, alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mr: 0.5 }}>
              Active filters:
            </Typography>
            {showChamberSelect && chamberFilter !== 'all' && (
              <Chip
                label={chamberFilter === 'house' ? 'House' : 'Senate'}
                size="small"
                onDelete={() => setChamberFilter('all')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {statusFilter !== 'all' && (
              <Chip
                label={{ introduced: 'Introduced', in_committee: 'In committee', passed_one_chamber: 'Passed one chamber', passed: 'Passed', signed: 'Signed', vetoed: 'Vetoed' }[statusFilter] ?? statusFilter}
                size="small"
                onDelete={() => setStatusFilter('all')}
                deleteIcon={<Cancel />}
                color="primary"
                variant="outlined"
              />
            )}
            {committeeFilter && (
              <Chip
                label={committeeFilterLabel}
                size="small"
                onDelete={() => setCommitteeFilter('')}
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
              onClick={() => { setChamberFilter('all'); setStatusFilter('all'); setCommitteeFilter(''); setSearchQuery(''); }}
              variant="outlined"
              sx={{ ml: 0.5 }}
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Gavel sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
          <Typography variant="body2" fontWeight={600}>
            {sortedBills.length} bill{sortedBills.length !== 1 ? 's' : ''} found
          </Typography>
          {loading && <CircularProgress size={18} />}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && sortedBills.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
            <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No bills found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {!supabase
                ? 'Supabase is not configured. Bills will appear once connected.'
                : 'Try adjusting your search terms or filters.'}
            </Typography>
          </Paper>
        ) : (
          <PaginatedSection
            items={sortedBills}
            pageSize={pageSize}
            pageSizeOptions={[...PAGE_SIZE_CHOICES]}
            onPageSizeChange={(n) => setPageSize(toPageSizeChoice(n))}
            resetKey={browsePagerResetKey}
            variant="pagination"
          >
            {(pageBills) =>
              viewMode === 'list' ? (
                <BillsListTable
                  bills={pageBills}
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onRequestSort={handleRequestSort}
                />
              ) : (
                <Grid container spacing={3}>
                  {pageBills.map((bill) => (
                    <Grid item xs={12} sm={6} md={4} key={bill.id}>
                      <KYBillCard bill={bill} legislators={legislators} />
                    </Grid>
                  ))}
                </Grid>
              )
            }
          </PaginatedSection>
        )}
      </Container>
    </Box>
  );
}
