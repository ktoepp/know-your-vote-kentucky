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
  Card,
  CardContent,
  Chip,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  IconButton,
} from '@mui/material';
import { Search, Refresh, Gavel, ArrowForward, OpenInNew } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { supabase } from '../lib/supabaseClient';
import type { KYBill } from '../../types/kentucky';
import Link from 'next/link';

export default function BillsPage() {
  const theme = useTheme();
  const [bills, setBills] = useState<KYBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<'all' | 'house' | 'senate'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchBills = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        setLoading(false);
        return;
      }
      let query = supabase.from('ky_bills').select('*').order('last_action_date', { ascending: false }).limit(100);
      if (chamberFilter !== 'all') {
        query = query.eq('chamber', chamberFilter);
      }
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setBills(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load bills');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBills(); }, [chamberFilter, statusFilter]);

  const filteredBills = bills.filter((bill) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      bill.bill_number?.toLowerCase().includes(q) ||
      bill.title?.toLowerCase().includes(q) ||
      bill.description?.toLowerCase().includes(q) ||
      bill.ai_summary?.toLowerCase().includes(q)
    );
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Kentucky Bills
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse bills from the Kentucky General Assembly. Filter by chamber, status, or search by keyword.
        </Typography>

        {/* Search and Filters */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <TextField
              fullWidth
              placeholder="Search bills by number, title, or summary..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <InputAdornment position="start"><Search /></InputAdornment>,
              }}
              size="small"
            />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Chamber</InputLabel>
              <Select value={chamberFilter} onChange={(e) => setChamberFilter(e.target.value as any)} label="Chamber">
                <MenuItem value="all">All Chambers</MenuItem>
                <MenuItem value="house">House</MenuItem>
                <MenuItem value="senate">Senate</MenuItem>
              </Select>
            </FormControl>
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
            <IconButton onClick={fetchBills} disabled={loading}><Refresh /></IconButton>
          </Box>
        </Paper>

        {/* Results count */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Gavel sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
          <Typography variant="body2" fontWeight={600}>
            {filteredBills.length} bill{filteredBills.length !== 1 ? 's' : ''} found
          </Typography>
          {loading && <CircularProgress size={18} />}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {/* Bills Grid */}
        {!loading && filteredBills.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
            <Search sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>No bills found</Typography>
            <Typography variant="body2" color="text.secondary">
              {!supabase ? 'Supabase is not configured. Bills will appear once connected.' : 'Try adjusting your search terms or filters.'}
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredBills.map((bill) => (
              <Grid item xs={12} sm={6} md={4} key={bill.id}>
                <Card sx={{
                  height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`, transition: 'all 0.2s',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                      {bill.chamber && <Chip label={bill.chamber === 'house' ? 'House' : 'Senate'} size="small" color={bill.chamber === 'senate' ? 'secondary' : 'primary'} />}
                      {bill.status && <Chip label={bill.status} size="small" variant="outlined" />}
                      {bill.session && <Chip label={bill.session} size="small" variant="outlined" />}
                    </Box>
                    <Typography variant="subtitle1" fontWeight={600} gutterBottom>{bill.bill_number}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {bill.title}
                    </Typography>
                    {bill.ai_summary && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {bill.ai_summary}
                      </Typography>
                    )}
                    {bill.last_action && (
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                        Last action: {bill.last_action}
                      </Typography>
                    )}
                    {bill.last_action_date && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {new Date(bill.last_action_date).toLocaleDateString()}
                      </Typography>
                    )}
                  </CardContent>
                  {bill.bill_text_url && (
                    <Box sx={{ p: 1.5, pt: 0 }}>
                      <Button size="small" variant="outlined" endIcon={<OpenInNew />} href={bill.bill_text_url} target="_blank" rel="noopener">
                        Full Text
                      </Button>
                    </Box>
                  )}
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
