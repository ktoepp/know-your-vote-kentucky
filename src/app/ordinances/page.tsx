'use client';

import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
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
} from '@mui/material';
import { AccountBalance, Refresh, Search } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { supabase } from '../lib/supabaseClient';
import type { KYOrdinance } from '../../types/kentucky';

export default function OrdinancesPage() {
  const theme = useTheme();
  const [ordinances, setOrdinances] = useState<KYOrdinance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [jurisdictionFilter, setJurisdictionFilter] = useState<'all' | 'louisville' | 'lexington'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const fetchOrdinances = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) { setLoading(false); return; }
      let query = supabase.from('ky_ordinances').select('*').order('introduced_date', { ascending: false }).limit(100);
      if (jurisdictionFilter !== 'all') query = query.eq('jurisdiction', jurisdictionFilter);
      if (statusFilter !== 'all') query = query.eq('status', statusFilter);
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setOrdinances(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load ordinances');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrdinances(); }, [jurisdictionFilter, statusFilter]);

  const filtered = ordinances.filter((ord) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return ord.title?.toLowerCase().includes(q) || ord.ordinance_number?.toLowerCase().includes(q) || ord.description?.toLowerCase().includes(q);
  });

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Local Ordinances
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse ordinances from Louisville Metro Council and Lexington-Fayette Urban County Council.
        </Typography>

        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <TextField fullWidth placeholder="Search ordinances..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} size="small" />
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Jurisdiction</InputLabel>
              <Select value={jurisdictionFilter} onChange={(e) => setJurisdictionFilter(e.target.value as any)} label="Jurisdiction">
                <MenuItem value="all">All Jurisdictions</MenuItem>
                <MenuItem value="louisville">Louisville</MenuItem>
                <MenuItem value="lexington">Lexington</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} label="Status">
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="introduced">Introduced</MenuItem>
                <MenuItem value="in_committee">In Committee</MenuItem>
                <MenuItem value="adopted">Adopted</MenuItem>
                <MenuItem value="rejected">Rejected</MenuItem>
              </Select>
            </FormControl>
            <IconButton onClick={fetchOrdinances} disabled={loading}><Refresh /></IconButton>
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AccountBalance sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
          <Typography variant="body2" fontWeight={600}>{filtered.length} ordinance{filtered.length !== 1 ? 's' : ''}</Typography>
          {loading && <CircularProgress size={18} />}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && filtered.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
            <AccountBalance sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>No ordinances found</Typography>
            <Typography variant="body2" color="text.secondary">
              {!supabase ? 'Supabase is not configured. Ordinances will appear once connected.' : 'Try adjusting your filters.'}
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filtered.map((ord) => (
              <Grid item xs={12} sm={6} md={4} key={ord.id}>
                <Card sx={{
                  height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`, transition: 'all 0.2s',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
                      <Chip label={ord.jurisdiction === 'louisville' ? 'Louisville' : 'Lexington'} size="small" color="info" />
                      {ord.status && <Chip label={ord.status} size="small" variant="outlined" />}
                    </Box>
                    {ord.ordinance_number && <Typography variant="subtitle1" fontWeight={600} gutterBottom>{ord.ordinance_number}</Typography>}
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {ord.title}
                    </Typography>
                    {ord.ai_summary && (
                      <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {ord.ai_summary}
                      </Typography>
                    )}
                    {ord.introduced_date && (
                      <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>
                        Introduced: {new Date(ord.introduced_date).toLocaleDateString()}
                      </Typography>
                    )}
                    {ord.adopted_date && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        Adopted: {new Date(ord.adopted_date).toLocaleDateString()}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
