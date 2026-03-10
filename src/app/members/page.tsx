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
  Avatar,
  TextField,
  InputAdornment,
  Button,
} from '@mui/material';
import { Groups, Refresh, Search, Email, Phone, OpenInNew } from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { supabase } from '../lib/supabaseClient';
import type { KYLegislator } from '../../types/kentucky';

export default function MembersPage() {
  const theme = useTheme();
  const [legislators, setLegislators] = useState<KYLegislator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [chamberFilter, setChamberFilter] = useState<'all' | 'house' | 'senate'>('all');
  const [partyFilter, setPartyFilter] = useState<string>('all');

  const fetchLegislators = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) { setLoading(false); return; }
      let query = supabase.from('ky_legislators').select('*').eq('active', true).order('last_name', { ascending: true });
      if (chamberFilter !== 'all') query = query.eq('chamber', chamberFilter);
      if (partyFilter !== 'all') query = query.eq('party', partyFilter);
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setLegislators(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load legislators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLegislators(); }, [chamberFilter, partyFilter]);

  const filtered = legislators.filter((leg) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return leg.name?.toLowerCase().includes(q) || leg.district?.toLowerCase().includes(q);
  });

  const getPartyColor = (party: string | null) => {
    if (!party) return 'default';
    const p = party.toLowerCase();
    if (p === 'democrat' || p === 'd') return 'info';
    if (p === 'republican' || p === 'r') return 'error';
    return 'default';
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Kentucky Legislators
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Browse Kentucky state legislators. Filter by chamber, party, or search by name or district.
        </Typography>

        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
            <TextField fullWidth placeholder="Search by name or district..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} size="small" />
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Chamber</InputLabel>
              <Select value={chamberFilter} onChange={(e) => setChamberFilter(e.target.value as any)} label="Chamber">
                <MenuItem value="all">All Chambers</MenuItem>
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
            <IconButton onClick={fetchLegislators} disabled={loading}><Refresh /></IconButton>
          </Box>
        </Paper>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Groups sx={{ fontSize: '1.2rem', color: 'primary.main' }} />
          <Typography variant="body2" fontWeight={600}>{filtered.length} legislator{filtered.length !== 1 ? 's' : ''}</Typography>
          {loading && <CircularProgress size={18} />}
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {!loading && filtered.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
            <Groups sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>No legislators found</Typography>
            <Typography variant="body2" color="text.secondary">
              {!supabase ? 'Supabase is not configured. Legislators will appear once connected.' : 'Try adjusting your filters.'}
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filtered.map((leg) => (
              <Grid item xs={12} sm={6} md={4} key={leg.id}>
                <Card sx={{
                  height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3,
                  border: `1px solid ${theme.palette.divider}`, transition: 'all 0.2s',
                  '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' },
                }}>
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                      <Avatar src={leg.photo_url || undefined} sx={{ width: 56, height: 56 }}>
                        {leg.first_name?.[0]}{leg.last_name?.[0]}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" fontWeight={600}>{leg.name}</Typography>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {leg.party && <Chip label={leg.party} size="small" color={getPartyColor(leg.party) as any} />}
                          {leg.chamber && <Chip label={leg.chamber === 'house' ? 'House' : 'Senate'} size="small" variant="outlined" />}
                        </Box>
                      </Box>
                    </Box>
                    {leg.district && <Typography variant="body2" color="text.secondary" gutterBottom>District: {leg.district}</Typography>}
                    {leg.email && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <Email sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">{leg.email}</Typography>
                      </Box>
                    )}
                    {leg.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <Phone sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption" color="text.secondary">{leg.phone}</Typography>
                      </Box>
                    )}
                  </CardContent>
                  {leg.website && (
                    <Box sx={{ p: 1.5, pt: 0 }}>
                      <Button size="small" variant="outlined" endIcon={<OpenInNew />} href={leg.website} target="_blank" rel="noopener">
                        Website
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
