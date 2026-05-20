'use client';

/**
 * Legacy meetings UI — reads generic `ky_meetings` (mixed jurisdictions).
 * Hidden from nav. GA committee meetings will use dedicated tables/routes per
 * docs/specs/committee-calendar.md (local school/county sync paused 2026-05-18).
 */

import React, { useState, useEffect } from 'react';
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
  Button,
} from '@mui/material';
import { CivicCard } from '@/components/ui/CivicCard';
import { MetaChip } from '@/components/ui/Chip';
import {
  Event,
  Refresh,
  CalendarToday,
  LocationOn,
  Schedule,
  OpenInNew,
} from '@mui/icons-material';
import { supabase } from '../lib/supabaseClient';
import type { KYMeeting } from '../../types/kentucky';
import { EXTERNAL_LINK_ICON_SX } from '@/lib/ui-tokens';

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<KYMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [jurisdictionFilter, setJurisdictionFilter] = useState<string>('all');
  const [bodyFilter, setBodyFilter] = useState<string>('all');

  const fetchMeetings = async () => {
    setLoading(true);
    setError(null);
    try {
      if (!supabase) {
        setLoading(false);
        return;
      }
      let query = supabase.from('ky_meetings').select('*').order('date', { ascending: false }).limit(50);
      if (jurisdictionFilter !== 'all') {
        query = query.eq('jurisdiction', jurisdictionFilter);
      }
      if (bodyFilter !== 'all') {
        query = query.eq('body', bodyFilter);
      }
      const { data, error: fetchError } = await query;
      if (fetchError) throw fetchError;
      setMeetings(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMeetings(); }, [jurisdictionFilter, bodyFilter]);

  // Extract unique jurisdictions and bodies for filters
  const jurisdictions = Array.from(new Set(meetings.map(m => m.jurisdiction).filter(Boolean)));
  const bodies = Array.from(new Set(meetings.map(m => m.body).filter(Boolean)));

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'TBD';
    return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
          Kentucky Meetings
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
          Upcoming and recent meetings across Kentucky government bodies — General Assembly committees, Metro Council, and more.
        </Typography>

        {/* Filters */}
        <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Jurisdiction</InputLabel>
              <Select value={jurisdictionFilter} onChange={(e) => setJurisdictionFilter(e.target.value)} label="Jurisdiction">
                <MenuItem value="all">All Jurisdictions</MenuItem>
                {jurisdictions.map(j => <MenuItem key={j} value={j}>{j}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel>Body</InputLabel>
              <Select value={bodyFilter} onChange={(e) => setBodyFilter(e.target.value)} label="Body">
                <MenuItem value="all">All Bodies</MenuItem>
                {bodies.map(b => <MenuItem key={b} value={b}>{b}</MenuItem>)}
              </Select>
            </FormControl>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
              <Typography variant="body2" color="text.secondary" fontWeight={500}>
                {meetings.length} meeting{meetings.length !== 1 ? 's' : ''}
              </Typography>
              <IconButton size="small" onClick={fetchMeetings} disabled={loading}><Refresh /></IconButton>
            </Box>
          </Box>
        </Paper>

        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && meetings.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
            <Event sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>No meetings found</Typography>
            <Typography variant="body2" color="text.secondary">
              {!supabase ? 'Supabase is not configured. Meetings will appear once connected.' : 'Try adjusting your filters or check back later.'}
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {meetings.map((meeting) => (
              <Grid item xs={12} sm={6} md={4} key={meeting.id}>
                <CivicCard
                  variant="meeting"
                  header={
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {meeting.jurisdiction && <MetaChip label={meeting.jurisdiction} tone="primary" size="small" variant="filled" />}
                      {meeting.body && <MetaChip label={meeting.body} size="small" />}
                      {meeting.status && <MetaChip label={meeting.status} size="small" />}
                    </Box>
                  }
                  body={
                    <>
                      {meeting.title && (
                        <Typography variant="subtitle1" fontWeight={600} gutterBottom>{meeting.title}</Typography>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                        <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary">{formatDate(meeting.date)}</Typography>
                      </Box>
                      {meeting.time && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                          <Schedule sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">{meeting.time}</Typography>
                        </Box>
                      )}
                      {meeting.location && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                          <Typography variant="body2" color="text.secondary">{meeting.location}</Typography>
                        </Box>
                      )}
                    </>
                  }
                  footer={
                    meeting.agenda_url ? (
                      <Button
                        size="medium"
                        variant="outlined"
                        endIcon={<OpenInNew sx={EXTERNAL_LINK_ICON_SX} />}
                        href={meeting.agenda_url}
                        target="_blank"
                        rel="noopener"
                        sx={{ fontSize: '1rem', py: 1, px: 2 }}
                      >
                        View Agenda
                      </Button>
                    ) : undefined
                  }
                />
              </Grid>
            ))}
          </Grid>
        )}
      </Container>
    </Box>
  );
}
