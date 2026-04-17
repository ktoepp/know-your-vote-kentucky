'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Gavel,
  ArrowForward,
  Description,
  AccountBalance,
  School,
} from '@mui/icons-material';
import Link from 'next/link';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { supabase } from './lib/supabaseClient';
import type { KYBill, KYOrdinance, KYExecutiveOrder, KYSchoolBoardItem } from '../types/kentucky';

/**
 * Session dates sourced from OpenStates (verified against legislature.ky.gov).
 * Update `KY_SESSIONS` when a new session begins.
 */
const KY_SESSIONS = [
  { name: '2026 Regular Session', start: '2026-01-06', end: '2026-04-15', type: 'regular' },
  { name: '2025 Regular Session', start: '2025-01-07', end: '2025-04-15', type: 'regular' },
];

function SessionBanner() {
  const theme = useTheme();
  const today = new Date();

  const active = KY_SESSIONS.find(s => {
    const start = new Date(s.start);
    const end = new Date(s.end);
    return today >= start && today <= end;
  });

  const mostRecent = KY_SESSIONS[0];
  const session = active || mostRecent;
  const isInSession = !!active;

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <Box sx={{
      borderBottom: `1px solid ${theme.palette.divider}`,
      bgcolor: isInSession ? alpha(theme.palette.success.main, 0.08) : alpha(theme.palette.grey[500], 0.08),
      py: 1,
    }}>
      <Container maxWidth="lg">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
          <Box sx={{
            width: 8, height: 8, borderRadius: '50%',
            bgcolor: isInSession ? theme.palette.success.main : theme.palette.grey[500],
            flexShrink: 0,
            ...(isInSession && { animation: 'pulse 2s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } } }),
          }} />
          <Typography variant="body2" fontWeight={600} color={isInSession ? 'success.main' : 'text.secondary'}>
            {isInSession ? 'Legislature In Session' : 'Legislature Adjourned'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {session.name} &bull; {fmtDate(session.start)} – {fmtDate(session.end)}
          </Typography>
          {!isInSession && (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
              Next session typically begins January
            </Typography>
          )}
          <Button
            component={Link}
            href="https://legislature.ky.gov"
            target="_blank"
            rel="noopener noreferrer"
            size="small"
            sx={{ ml: 'auto', fontSize: '0.75rem' }}
          >
            Official Calendar
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

// Helper components
function SectionHeader({ title, icon, href }: { title: string; icon: React.ReactNode; href: string }) {
  const theme = useTheme();
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {React.cloneElement(icon as React.ReactElement<any>, { sx: { color: theme.palette.primary.main, fontSize: 28 } })}
        <Typography variant="h5" fontWeight={700} color="text.primary">{title}</Typography>
      </Box>
      {href !== '#' && (
        <Button component={Link} href={href} endIcon={<ArrowForward />} size="small">View All</Button>
      )}
    </Box>
  );
}

function EmptyState({ message }: { message: string }) {
  const theme = useTheme();
  return (
    <Card sx={{ p: 4, textAlign: 'center', bgcolor: alpha(theme.palette.primary.main, 0.04), border: `1px dashed ${theme.palette.divider}` }}>
      <Typography color="text.secondary">{message}</Typography>
    </Card>
  );
}

function formatSponsors(sponsors: Record<string, unknown> | null): string {
  if (!sponsors) return '';
  if (Array.isArray(sponsors)) {
    return sponsors
      .map((s: unknown) => (typeof s === 'object' && s !== null && 'name' in s ? (s as { name: string }).name : typeof s === 'string' ? s : ''))
      .filter(Boolean)
      .join(', ');
  }
  if (typeof sponsors === 'object') {
    const nested = (sponsors as { sponsors?: { name?: string }[] }).sponsors;
    if (Array.isArray(nested)) {
      return nested.map((s) => s?.name).filter(Boolean).join(', ');
    }
  }
  return '';
}

function getPrimarySponsors(sponsors: Record<string, unknown> | null, max = 2): { name: string; party?: string }[] {
  if (!sponsors) return [];
  if (Array.isArray(sponsors)) {
    return sponsors.slice(0, max).map((s: any) => ({ name: s?.name || '', party: s?.party })).filter(s => s.name);
  }
  return [];
}

function memberSlug(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function partyColor(party?: string): string {
  if (party === 'D') return '#1565c0';
  if (party === 'R') return '#c62828';
  return '#555';
}

function SponsorChip({ name, party }: { name: string; party?: string }) {
  const slug = memberSlug(name);
  return (
    <Chip
      component={Link}
      href={`/members#${slug}`}
      label={name}
      size="small"
      clickable
      sx={{
        fontWeight: 600,
        fontSize: '0.72rem',
        bgcolor: partyColor(party),
        color: '#fff',
        '&:hover': { opacity: 0.85 },
        mr: 0.5,
        mb: 0.5,
      }}
    />
  );
}

function KYBillCard({ bill }: { bill: KYBill }) {
  const theme = useTheme();
  const primarySponsors = getPrimarySponsors(bill.sponsors);

  const tooltipTitle = (
    <Box component="span" sx={{ display: 'block', maxWidth: 380, p: 0.5 }}>
      {/* Latest action — most important */}
      {bill.last_action && (
        <Box component="span" sx={{ display: 'block', mb: 1.5, p: 1, borderRadius: 1, bgcolor: 'action.hover' }}>
          <Typography component="span" variant="caption" display="block" sx={{ opacity: 0.75, mb: 0.25, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Latest Action {bill.last_action_date ? `· ${new Date(bill.last_action_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}
          </Typography>
          <Typography component="span" variant="body2" display="block" sx={{ fontWeight: 500 }}>
            {bill.last_action}
          </Typography>
        </Box>
      )}
      {/* Primary sponsor(s) */}
      {primarySponsors.length > 0 && (
        <Box component="span" sx={{ display: 'block', mb: 1.25 }}>
          <Typography component="span" variant="caption" display="block" sx={{ opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', mb: 0.5 }}>
            {primarySponsors.length > 1 ? 'Sponsors' : 'Sponsor'}
          </Typography>
          <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap' }}>
            {primarySponsors.map((s, i) => (
              <SponsorChip key={i} name={s.name} party={s.party} />
            ))}
          </Box>
        </Box>
      )}
      {/* Topic tags */}
      {bill.topics && bill.topics.length > 0 && (
        <Box component="span" sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {bill.topics.slice(0, 4).map(t => (
            <Box key={t} component="span" sx={{ display: 'inline-block', px: 1, py: 0.25, borderRadius: 1, bgcolor: 'action.selected', color: 'text.primary', fontSize: '0.7rem' }}>
              {t}
            </Box>
          ))}
        </Box>
      )}
    </Box>
  );

  const slug = bill.bill_number?.replace(/\s+/g, '') || bill.id;

  const card = (
    <Card
      component={Link}
      href={`/bills/${slug}`}
      sx={{
        height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`, transition: 'all 0.2s',
        textDecoration: 'none', color: 'inherit',
        '&:hover': { boxShadow: 4, transform: 'translateY(-2px)', borderColor: theme.palette.primary.main },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          {bill.chamber && <Chip label={bill.chamber === 'house' ? 'House' : 'Senate'} size="small" color={bill.chamber === 'senate' ? 'secondary' : 'primary'} />}
          {bill.status && <Chip label={bill.status} size="small" variant="outlined" />}
        </Box>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>{bill.bill_number}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {bill.title}
        </Typography>
        {bill.last_action_date && (
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 'auto' }}>
            {new Date(bill.last_action_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </Typography>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Tooltip
      title={tooltipTitle}
      placement="top"
      arrow
      enterDelay={400}
      componentsProps={{
        tooltip: {
          sx: {
            maxWidth: 420,
            bgcolor: 'background.paper',
            color: 'text.primary',
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: 4,
            '& .MuiTooltip-arrow': { color: 'background.paper' },
          },
        },
      }}
    >
      <Box component="span" sx={{ display: 'block', height: '100%' }}>
        {card}
      </Box>
    </Tooltip>
  );
}

function formatOrdinanceSponsors(sponsors: Record<string, unknown> | null): string {
  if (!sponsors) return '';
  if (Array.isArray(sponsors)) {
    return sponsors
      .map((s: unknown) => (typeof s === 'object' && s !== null && 'name' in s ? (s as { name: string }).name : typeof s === 'string' ? s : ''))
      .filter(Boolean)
      .join(', ');
  }
  return '';
}

function KYOrdinanceCard({ ordinance }: { ordinance: KYOrdinance }) {
  const theme = useTheme();
  const sponsorText = formatOrdinanceSponsors(ordinance.sponsors);
  const tooltipTitle = (
    <Box component="span" sx={{ display: 'block', maxWidth: 360 }}>
      <Typography component="span" variant="subtitle2" display="block" sx={{ fontWeight: 600, mb: 1 }}>
        {ordinance.ordinance_number ? `${ordinance.ordinance_number}: ` : ''}{ordinance.title}
      </Typography>
      {ordinance.ai_summary && (
        <Typography component="span" variant="body2" display="block" sx={{ mb: 1.5 }}>
          {ordinance.ai_summary}
        </Typography>
      )}
      {sponsorText && (
        <Typography component="span" variant="caption" display="block" sx={{ fontWeight: 600 }}>
          Sponsor{sponsorText.includes(',') ? 's' : ''}: {sponsorText}
        </Typography>
      )}
    </Box>
  );
  const card = (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, border: `1px solid ${theme.palette.divider}`, transition: 'all 0.2s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <Chip label={ordinance.jurisdiction === 'louisville' ? 'Louisville' : 'Lexington'} size="small" color="info" />
          {ordinance.status && <Chip label={ordinance.status} size="small" variant="outlined" />}
        </Box>
        {ordinance.ordinance_number && <Typography variant="subtitle1" fontWeight={600} gutterBottom>{ordinance.ordinance_number}</Typography>}
        <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {ordinance.title}
        </Typography>
      </CardContent>
    </Card>
  );
  return (
    <Tooltip title={tooltipTitle} placement="top" arrow enterDelay={300} componentsProps={{ tooltip: { sx: { maxWidth: 400 } } }}>
      <Box component="span" sx={{ display: 'block', height: '100%' }}>
        {card}
      </Box>
    </Tooltip>
  );
}

function KYEOCard({ eo }: { eo: KYExecutiveOrder }) {
  const theme = useTheme();
  const tooltipTitle = (
    <Box component="span" sx={{ display: 'block', maxWidth: 360 }}>
      <Typography component="span" variant="subtitle2" display="block" sx={{ fontWeight: 600, mb: 1 }}>
        {eo.eo_number}: {eo.title}
      </Typography>
      {eo.ai_summary && (
        <Typography component="span" variant="body2" display="block" sx={{ mb: 1.5 }}>
          {eo.ai_summary}
        </Typography>
      )}
      {eo.signed_date && (
        <Typography component="span" variant="caption" display="block">Signed: {new Date(eo.signed_date).toLocaleDateString()}</Typography>
      )}
      {eo.governor && (
        <Typography component="span" variant="caption" display="block">Governor: {eo.governor}</Typography>
      )}
    </Box>
  );
  const card = (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, border: `1px solid ${theme.palette.divider}`, transition: 'all 0.2s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>{eo.eo_number}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {eo.title}
        </Typography>
        {eo.signed_date && (
          <Typography variant="caption" color="text.secondary">Signed: {new Date(eo.signed_date).toLocaleDateString()}</Typography>
        )}
        {eo.governor && (
          <Typography variant="caption" display="block" color="text.secondary">Governor: {eo.governor}</Typography>
        )}
      </CardContent>
    </Card>
  );
  return (
    <Tooltip title={tooltipTitle} placement="top" arrow enterDelay={300} componentsProps={{ tooltip: { sx: { maxWidth: 400 } } }}>
      <Box component="span" sx={{ display: 'block', height: '100%' }}>
        {card}
      </Box>
    </Tooltip>
  );
}

function KYSchoolBoardCard({ item }: { item: KYSchoolBoardItem }) {
  const theme = useTheme();
  const tooltipTitle = (
    <Box component="span" sx={{ display: 'block', maxWidth: 360 }}>
      <Typography component="span" variant="subtitle2" display="block" sx={{ fontWeight: 600, mb: 1 }}>
        {item.title}
      </Typography>
      {item.ai_summary && (
        <Typography component="span" variant="body2" display="block" sx={{ mb: 1.5 }}>
          {item.ai_summary}
        </Typography>
      )}
      {item.vote_result && (
        <Typography component="span" variant="caption" display="block">Result: {item.vote_result}</Typography>
      )}
    </Box>
  );
  const card = (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 3, border: `1px solid ${theme.palette.divider}`, transition: 'all 0.2s', '&:hover': { boxShadow: 4, transform: 'translateY(-2px)' } }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <Chip label={item.district === 'jcps' ? 'JCPS' : 'FCPS'} size="small" color="warning" />
          {item.category && <Chip label={item.category} size="small" variant="outlined" />}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {item.title}
        </Typography>
        {item.vote_result && (
          <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1 }}>Result: {item.vote_result}</Typography>
        )}
      </CardContent>
    </Card>
  );
  return (
    <Tooltip title={tooltipTitle} placement="top" arrow enterDelay={300} componentsProps={{ tooltip: { sx: { maxWidth: 400 } } }}>
      <Box component="span" sx={{ display: 'block', height: '100%' }}>
        {card}
      </Box>
    </Tooltip>
  );
}

export default function HomePage() {
  const theme = useTheme();
  const [bills, setBills] = useState<KYBill[]>([]);
  const [ordinances, setOrdinances] = useState<KYOrdinance[]>([]);
  const [executiveOrders, setExecutiveOrders] = useState<KYExecutiveOrder[]>([]);
  const [schoolBoardItems, setSchoolBoardItems] = useState<KYSchoolBoardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        if (!supabase) {
          setLoading(false);
          return;
        }
        const [billsRes, ordRes, eoRes, sbRes] = await Promise.all([
          supabase.from('ky_bills').select('*').order('last_action_date', { ascending: false }).limit(6),
          supabase.from('ky_ordinances').select('*').order('introduced_date', { ascending: false }).limit(6),
          supabase.from('ky_executive_orders').select('*').order('signed_date', { ascending: false }).limit(6),
          supabase.from('ky_school_board_items').select('*').order('meeting_date', { ascending: false }).limit(6),
        ]);
        if (billsRes.data) setBills(billsRes.data);
        if (ordRes.data) setOrdinances(ordRes.data);
        if (eoRes.data) setExecutiveOrders(eoRes.data);
        if (sbRes.data) setSchoolBoardItems(sbRes.data);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <SessionBanner />
      {/* Hero Section */}
      <Box sx={{
        background: theme.palette.mode === 'dark'
          ? `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.background.default} 100%)`
          : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.light} 100%)`,
        color: theme.palette.primary.contrastText,
        py: { xs: 6, md: 8 },
        mb: 4,
      }}>
        <Container maxWidth="lg">
          <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
            Know Your Vote Kentucky
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 3, maxWidth: 600 }}>
            Track Kentucky legislation, local ordinances, executive orders, and school board decisions.
            Stay informed about the issues that affect your community.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button component={Link} href="/bills" variant="contained" color="secondary" endIcon={<ArrowForward />}>
              Browse Bills
            </Button>
            <Button component={Link} href="/search" variant="outlined" sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)' }}>
              Search Everything
            </Button>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg">
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && (
          <>
            {/* Latest KY Bills */}
            <SectionHeader title="Latest KY Bills" icon={<Gavel />} href="/bills" />
            <Grid container spacing={3} sx={{ mb: 6 }}>
              {bills.length === 0 ? (
                <Grid item xs={12}><EmptyState message="No bills yet. Data will appear once synced." /></Grid>
              ) : bills.map((bill) => (
                <Grid item xs={12} sm={6} md={4} key={bill.id}>
                  <KYBillCard bill={bill} />
                </Grid>
              ))}
            </Grid>

            {/* Local Ordinances */}
            <SectionHeader title="Local Ordinances" icon={<AccountBalance />} href="/ordinances" />
            <Grid container spacing={3} sx={{ mb: 6 }}>
              {ordinances.length === 0 ? (
                <Grid item xs={12}><EmptyState message="No ordinances yet. Louisville and Lexington data will appear once synced." /></Grid>
              ) : ordinances.map((ord) => (
                <Grid item xs={12} sm={6} md={4} key={ord.id}>
                  <KYOrdinanceCard ordinance={ord} />
                </Grid>
              ))}
            </Grid>

            {/* Executive Orders */}
            <SectionHeader title="Executive Orders" icon={<Description />} href="#" />
            <Grid container spacing={3} sx={{ mb: 6 }}>
              {executiveOrders.length === 0 ? (
                <Grid item xs={12}><EmptyState message="No executive orders yet. Data will appear once synced." /></Grid>
              ) : executiveOrders.map((eo) => (
                <Grid item xs={12} sm={6} md={4} key={eo.id}>
                  <KYEOCard eo={eo} />
                </Grid>
              ))}
            </Grid>

            {/* School Board Updates */}
            <SectionHeader title="School Board Updates" icon={<School />} href="#" />
            <Grid container spacing={3} sx={{ mb: 6 }}>
              {schoolBoardItems.length === 0 ? (
                <Grid item xs={12}><EmptyState message="No school board items yet. JCPS and FCPS data will appear once synced." /></Grid>
              ) : schoolBoardItems.map((item) => (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <KYSchoolBoardCard item={item} />
                </Grid>
              ))}
            </Grid>
          </>
        )}
      </Container>
    </Box>
  );
}
