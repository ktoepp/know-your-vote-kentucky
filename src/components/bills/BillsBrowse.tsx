'use client';

import React, { useState, useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
} from '@mui/material';
import { Search, Refresh, Gavel } from '@mui/icons-material';
import { supabase } from '@/app/lib/supabaseClient';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
import { KYBillCard } from '@/components/bills/KYBillCard';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { effectiveBillChamber } from '@/lib/bill-display';
import { withTimeout } from '@/lib/async-utils';
import { PaginatedSection } from '@/components/ui/PaginatedSection';

const BROWSE_PAGE_SIZE = 12;

export type BillsBrowseChamberMode = 'all' | 'house' | 'senate';

/** Shared Supabase query for browse + refresh (house/senate include prefix fallback when `chamber` is null). */
function applyKyBillsFilters(
  chamberMode: BillsBrowseChamberMode,
  chamberFilter: 'all' | 'house' | 'senate',
  statusFilter: string,
) {
  if (!supabase) return null;
  let query = supabase.from('ky_bills').select('*').order('last_action_date', { ascending: false });
  const effectiveChamber = chamberMode === 'all' ? chamberFilter : chamberMode;
  if (effectiveChamber === 'house') {
    query = query.or('chamber.eq.house,bill_number.ilike.H%');
  } else if (effectiveChamber === 'senate') {
    query = query.or('chamber.eq.senate,bill_number.ilike.S%');
  }
  if (statusFilter !== 'all') {
    query = query.eq('status', statusFilter);
  }
  return query.limit(100);
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const query = applyKyBillsFilters(chamberMode, chamberFilter, statusFilter);
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
  }, [chamberMode, chamberFilter, statusFilter]);

  const filteredBills = bills.filter((bill) => {
    if (chamberMode === 'all' && chamberFilter !== 'all') {
      if (effectiveBillChamber(bill) !== chamberFilter) return false;
    }
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      bill.bill_number?.toLowerCase().includes(q) ||
      bill.title?.toLowerCase().includes(q) ||
      bill.description?.toLowerCase().includes(q) ||
      bill.ai_summary?.toLowerCase().includes(q)
    );
  });

  const browsePagerResetKey = `${searchQuery}|${chamberFilter}|${statusFilter}|${filteredBills.length}|${filteredBills[0]?.id ?? ''}`;

  const showChamberSelect = chamberMode === 'all';

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

        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Search bills by number, title, or summary..."
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
            />
            {showChamberSelect && (
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Chamber</InputLabel>
                <Select
                  value={chamberFilter}
                  onChange={(e) => setChamberFilter(e.target.value as 'all' | 'house' | 'senate')}
                  label="Chamber"
                >
                  <MenuItem value="all">All Chambers</MenuItem>
                  <MenuItem value="house">House</MenuItem>
                  <MenuItem value="senate">Senate</MenuItem>
                </Select>
              </FormControl>
            )}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="introduced">Introduced</MenuItem>
                <MenuItem value="in_committee">In Committee</MenuItem>
                <MenuItem value="passed_one_chamber">Passed One Chamber</MenuItem>
                <MenuItem value="passed">Passed</MenuItem>
                <MenuItem value="signed">Signed</MenuItem>
                <MenuItem value="vetoed">Vetoed</MenuItem>
              </Select>
            </FormControl>
            <IconButton
              onClick={() => {
                void (async () => {
                  setLoading(true);
                  setError(null);
                  try {
                    const query = applyKyBillsFilters(chamberMode, chamberFilter, statusFilter);
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
        </Paper>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Gavel sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
          <Typography variant="body2" fontWeight={600}>
            {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''} found
          </Typography>
          {loading && <CircularProgress size={18} />}
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!loading && filteredBills.length === 0 ? (
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
            items={filteredBills}
            pageSize={BROWSE_PAGE_SIZE}
            resetKey={browsePagerResetKey}
            variant="pagination"
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
        )}
      </Container>
    </Box>
  );
}
