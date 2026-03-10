'use client';

import React, { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  TextField,
  InputAdornment,
  Button,
  Grid,
} from '@mui/material';
import { Search, Gavel, AccountBalance, Description, School, ArrowForward } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { supabase } from '../lib/supabaseClient';
import type { KYBill, KYOrdinance, KYExecutiveOrder, KYSchoolBoardItem } from '../../types/kentucky';
import Link from 'next/link';

interface SearchResults {
  bills: KYBill[];
  ordinances: KYOrdinance[];
  executiveOrders: KYExecutiveOrder[];
  schoolBoardItems: KYSchoolBoardItem[];
}

function SearchPageContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams?.get('q') || '';
  const theme = useTheme();
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      if (!supabase) {
        setResults({ bills: [], ordinances: [], executiveOrders: [], schoolBoardItems: [] });
        setLoading(false);
        return;
      }
      const q = searchQuery.trim();
      const [billsRes, ordRes, eoRes, sbRes] = await Promise.all([
        supabase.from('ky_bills').select('*').or(`title.ilike.%${q}%,bill_number.ilike.%${q}%,description.ilike.%${q}%`).limit(20),
        supabase.from('ky_ordinances').select('*').or(`title.ilike.%${q}%,ordinance_number.ilike.%${q}%,description.ilike.%${q}%`).limit(20),
        supabase.from('ky_executive_orders').select('*').or(`title.ilike.%${q}%,eo_number.ilike.%${q}%,description.ilike.%${q}%`).limit(20),
        supabase.from('ky_school_board_items').select('*').or(`title.ilike.%${q}%,description.ilike.%${q}%`).limit(20),
      ]);
      setResults({
        bills: billsRes.data || [],
        ordinances: ordRes.data || [],
        executiveOrders: eoRes.data || [],
        schoolBoardItems: sbRes.data || [],
      });
    } catch (err: any) {
      setError(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(query);
    const url = new URL(window.location.href);
    url.searchParams.set('q', query);
    window.history.pushState({}, '', url.toString());
  };

  const totalResults = results ? results.bills.length + results.ordinances.length + results.executiveOrders.length + results.schoolBoardItems.length : 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Search Kentucky Government
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Search across bills, ordinances, executive orders, and school board items.
        </Typography>

        {/* Search Bar */}
        <Paper elevation={1} sx={{ p: 2, mb: 4, borderRadius: 2 }} component="form" onSubmit={handleSubmit}>
          <TextField
            fullWidth
            placeholder="Search for bills, ordinances, executive orders..."
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

        {searched && !loading && results && (
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

            {/* Bills results */}
            {results.bills.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Gavel color="primary" />
                  <Typography variant="h6" fontWeight={600}>Bills ({results.bills.length})</Typography>
                </Box>
                <Grid container spacing={2}>
                  {results.bills.slice(0, 6).map((bill) => (
                    <Grid item xs={12} sm={6} key={bill.id}>
                      <Card sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                        <CardContent>
                          <Typography variant="subtitle2" fontWeight={600}>{bill.bill_number}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {bill.title}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                {results.bills.length > 6 && <Button component={Link} href="/bills" endIcon={<ArrowForward />} sx={{ mt: 1 }}>View all bills</Button>}
              </Box>
            )}

            {/* Ordinances results */}
            {results.ordinances.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <AccountBalance color="primary" />
                  <Typography variant="h6" fontWeight={600}>Ordinances ({results.ordinances.length})</Typography>
                </Box>
                <Grid container spacing={2}>
                  {results.ordinances.slice(0, 6).map((ord) => (
                    <Grid item xs={12} sm={6} key={ord.id}>
                      <Card sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                        <CardContent>
                          <Chip label={ord.jurisdiction === 'louisville' ? 'Louisville' : 'Lexington'} size="small" color="info" sx={{ mb: 1 }} />
                          <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {ord.title}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
                {results.ordinances.length > 6 && <Button component={Link} href="/ordinances" endIcon={<ArrowForward />} sx={{ mt: 1 }}>View all ordinances</Button>}
              </Box>
            )}

            {/* Executive Orders results */}
            {results.executiveOrders.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Description color="primary" />
                  <Typography variant="h6" fontWeight={600}>Executive Orders ({results.executiveOrders.length})</Typography>
                </Box>
                <Grid container spacing={2}>
                  {results.executiveOrders.slice(0, 6).map((eo) => (
                    <Grid item xs={12} sm={6} key={eo.id}>
                      <Card sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                        <CardContent>
                          <Typography variant="subtitle2" fontWeight={600}>{eo.eo_number}</Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {eo.title}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            {/* School Board results */}
            {results.schoolBoardItems.length > 0 && (
              <Box sx={{ mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <School color="primary" />
                  <Typography variant="h6" fontWeight={600}>School Board Items ({results.schoolBoardItems.length})</Typography>
                </Box>
                <Grid container spacing={2}>
                  {results.schoolBoardItems.slice(0, 6).map((item) => (
                    <Grid item xs={12} sm={6} key={item.id}>
                      <Card sx={{ borderRadius: 2, border: `1px solid ${theme.palette.divider}` }}>
                        <CardContent>
                          <Chip label={item.district === 'jcps' ? 'JCPS' : 'FCPS'} size="small" color="warning" sx={{ mb: 1 }} />
                          <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {item.title}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
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
