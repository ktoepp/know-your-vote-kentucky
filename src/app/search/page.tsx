'use client';

import React, { useState, Suspense, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
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
} from '@mui/material';
import { Search, Gavel, ArrowForward } from '@mui/icons-material';
import { supabase } from '../lib/supabaseClient';
import type { KYBill, KYLegislatorRoster } from '../../types/kentucky';
import Link from 'next/link';
import { KYBillCard } from '@/components/bills/KYBillCard';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { withTimeout } from '@/lib/async-utils';
import { fetchKyBillsMatchingSearch } from '@/lib/ky-search-bills';
import { PaginatedSection } from '@/components/ui/PaginatedSection';

const SEARCH_SECTION_PAGE_SIZE = 6;

function SearchPageContent() {
  const searchParams = useSearchParams();
  const qFromUrl = searchParams.get('q') || searchParams.get('query') || '';
  const [query, setQuery] = useState(qFromUrl);
  const [bills, setBills] = useState<KYBill[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [legislators, setLegislators] = useState<KYLegislatorRoster[]>([]);

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

  const performSearch = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      if (!supabase) {
        setBills([]);
        setLoading(false);
        return;
      }
      const q = searchQuery.trim();
      const nextBills = await withTimeout(
        fetchKyBillsMatchingSearch(supabase, q, 20),
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
      return;
    }
    setQuery(q);
    void performSearch(q);
  }, [qFromUrl, performSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    window.history.pushState({}, '', url.toString());
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
          {!searched && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
              <Chip label='Try: "education"' onClick={() => { setQuery('education'); performSearch('education'); }} sx={{ cursor: 'pointer' }} />
              <Chip label='Try: "budget"' onClick={() => { setQuery('budget'); performSearch('budget'); }} sx={{ cursor: 'pointer' }} />
              <Chip label='Try: "HB 1"' onClick={() => { setQuery('HB 1'); performSearch('HB 1'); }} sx={{ cursor: 'pointer' }} />
            </Box>
          )}
        </Paper>

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
