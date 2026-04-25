'use client';

import React, { useState, Suspense, useEffect, useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Paper,
  TextField,
  InputAdornment,
  Button,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Search, Gavel, ArrowForward } from '@mui/icons-material';
import { supabase } from '../lib/supabaseClient';
import type { KYBill, KYLegislatorRoster } from '../../types/kentucky';
import Link from 'next/link';
import { KYBillCard } from '@/components/bills/KYBillCard';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { withTimeout } from '@/lib/async-utils';
import { fetchKyBillsMatchingSearch, type KyBillSearchFilters } from '@/lib/ky-search-bills';
import { PaginatedSection } from '@/components/ui/PaginatedSection';

const SEARCH_SECTION_PAGE_SIZE = 6;
const SEARCH_FETCH_LIMIT = 40;

function normalizeChamberParam(raw: string | null): KyBillSearchFilters['chamber'] {
  if (raw === 'house' || raw === 'senate') return raw;
  return undefined;
}

function buildSearchFilters(searchParams: URLSearchParams): KyBillSearchFilters {
  const st = searchParams.get('status');
  return {
    chamber: normalizeChamberParam(searchParams.get('chamber')),
    dateRange: searchParams.get('dateRange') || undefined,
    status: st && st !== 'all' ? st : undefined,
    committee: searchParams.get('committee') || undefined,
  };
}

function SearchPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get('q') || searchParams.get('query') || '';
  const contentType = searchParams.get('type') || 'all';
  const [query, setQuery] = useState(qFromUrl);
  const [bills, setBills] = useState<KYBill[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [nonBillType, setNonBillType] = useState<string | null>(null);
  const [legislators, setLegislators] = useState<KYLegislatorRoster[]>([]);
  const filterKey = searchParams.toString();

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

  const performSearch = useCallback(async (searchQuery: string, filters: KyBillSearchFilters) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    setNonBillType(null);
    try {
      if (!supabase) {
        setBills([]);
        setLoading(false);
        return;
      }
      const q = searchQuery.trim();
      const nextBills = await withTimeout(
        fetchKyBillsMatchingSearch(supabase, q, SEARCH_FETCH_LIMIT, filters),
        25_000,
        'Search timed out. Check your connection or try a shorter query.',
      );
      setBills(nextBills);
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const q = qFromUrl.trim();
    if (!q) {
      setLoading(false);
      setSearched(false);
      setBills(null);
      setNonBillType(null);
      return;
    }
    setQuery(q);

    if (contentType !== 'all' && contentType !== 'bill') {
      setSearched(true);
      setNonBillType(contentType);
      setBills([]);
      setLoading(false);
      setError(null);
      return;
    }

    setNonBillType(null);
    const filters = buildSearchFilters(searchParams);
    void performSearch(q, filters);
  }, [qFromUrl, contentType, filterKey, performSearch]);

  const pushSearchUrl = (nextQuery: string, overrides?: Partial<Record<string, string>>) => {
    const params = new URLSearchParams(searchParams.toString());
    const qTrim = nextQuery.trim();
    if (!qTrim) return;
    params.set('q', qTrim);
    const keys = ['chamber', 'dateRange', 'status', 'committee', 'type'] as const;
    for (const k of keys) {
      if (overrides && k in overrides) {
        const v = overrides[k];
        if (v && v !== 'all') params.set(k, v);
        else params.delete(k);
      }
    }
    router.replace(`${pathname}?${params.toString()}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    pushSearchUrl(query);
  };

  const chamberSelect = searchParams.get('chamber') || '';
  const dateRangeSelect = searchParams.get('dateRange') || '';
  const statusSelect = searchParams.get('status') || 'all';
  const committeeSelect = searchParams.get('committee') || '';

  const setFilterParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === 'all') params.delete(key);
    else params.set(key, value);
    const q = (params.get('q') || query).trim();
    if (q) params.set('q', q);
    router.replace(`${pathname}?${params.toString()}`);
  };

  const totalResults = bills?.length ?? 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Search Kentucky Government
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
          Search state bills (House and Senate).
        </Typography>
        <DataFreshnessNote variant="page" />

        {/* Search Bar */}
        <Paper elevation={1} sx={{ p: 2, mb: 4, borderRadius: 2 }} component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            placeholder="Search for bills by number, title, or keyword..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
              endAdornment: <Button type="submit" variant="contained" disabled={loading}>Search</Button>,
            }}
          />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
              mt: 2,
            }}
          >
            <FormControl size="small" fullWidth>
              <InputLabel>Chamber</InputLabel>
              <Select
                label="Chamber"
                value={chamberSelect}
                onChange={(e) => setFilterParam('chamber', e.target.value as string)}
              >
                <MenuItem value="">All chambers</MenuItem>
                <MenuItem value="house">House</MenuItem>
                <MenuItem value="senate">Senate</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={statusSelect}
                onChange={(e) => setFilterParam('status', e.target.value as string)}
              >
                <MenuItem value="all">All statuses</MenuItem>
                <MenuItem value="introduced">Introduced</MenuItem>
                <MenuItem value="in_committee">In committee</MenuItem>
                <MenuItem value="passed_one_chamber">Passed one chamber</MenuItem>
                <MenuItem value="passed">Passed</MenuItem>
                <MenuItem value="signed">Signed</MenuItem>
                <MenuItem value="vetoed">Vetoed</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Activity</InputLabel>
              <Select
                label="Activity"
                value={dateRangeSelect}
                onChange={(e) => setFilterParam('dateRange', e.target.value as string)}
              >
                <MenuItem value="">Any time</MenuItem>
                <MenuItem value="today">Today</MenuItem>
                <MenuItem value="week">This week</MenuItem>
                <MenuItem value="month">This month</MenuItem>
                <MenuItem value="quarter">This quarter</MenuItem>
                <MenuItem value="year">This year</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>Committee hint</InputLabel>
              <Select
                label="Committee hint"
                value={committeeSelect}
                onChange={(e) => setFilterParam('committee', e.target.value as string)}
              >
                <MenuItem value="">Any</MenuItem>
                <MenuItem value="appropriations">Appropriations</MenuItem>
                <MenuItem value="budget">Budget</MenuItem>
                <MenuItem value="finance">Finance</MenuItem>
                <MenuItem value="judiciary">Judiciary</MenuItem>
              </Select>
            </FormControl>
          </Box>
          {!searched && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              <Chip
                label='Try: "education"'
                onClick={() => {
                  setQuery('education');
                  pushSearchUrl('education');
                }}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                label='Try: "budget"'
                onClick={() => {
                  setQuery('budget');
                  pushSearchUrl('budget');
                }}
                sx={{ cursor: 'pointer' }}
              />
              <Chip
                label='Try: "HB 1"'
                onClick={() => {
                  setQuery('HB 1');
                  pushSearchUrl('HB 1');
                }}
                sx={{ cursor: 'pointer' }}
              />
            </Box>
          )}
        </Paper>

        {nonBillType && (
          <Alert
            severity="info"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  const p = new URLSearchParams(searchParams.toString());
                  p.delete('type');
                  router.replace(`${pathname}?${p.toString()}`);
                }}
              >
                Search bills
              </Button>
            }
          >
            The URL is set to type &quot;{nonBillType}&quot;. This page only searches Kentucky bills. Use the button
            to clear that filter, or remove <code>type</code> from the address bar.
          </Alert>
        )}

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>}

        {searched && !loading && bills && (
          <>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {totalResults} result{totalResults !== 1 ? 's' : ''} for &quot;{query}&quot;
            </Typography>

            {totalResults === 0 && (
              <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
                <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No results found</Typography>
                <Typography variant="body2" color="text.secondary">Try different search terms.</Typography>
              </Paper>
            )}

            {bills.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Gavel color="primary" />
                  <Typography variant="h6" fontWeight={600}>Bills ({bills.length})</Typography>
                </Box>
                <PaginatedSection
                  items={bills}
                  pageSize={SEARCH_SECTION_PAGE_SIZE}
                  resetKey={`bill-${query}-${bills.length}-${bills[0]?.id ?? ''}`}
                  variant="responsive"
                >
                  {(pageBills) => (
                    <Grid container spacing={3}>
                      {pageBills.map((bill) => (
                        <Grid item xs={12} sm={6} md={4} key={bill.id}>
                          <KYBillCard bill={bill} legislators={legislators} />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </PaginatedSection>
                <Button component={Link} href="/bills" endIcon={<ArrowForward />} sx={{ mt: 1 }}>Browse all bills</Button>
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Container maxWidth="lg" sx={{ py: 4 }}><Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box></Container>}>
      <SearchPageContent />
    </Suspense>
  );
}
