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
  AccountBalance,
  School,
} from '@mui/icons-material';
import Link from 'next/link';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { supabase } from './lib/supabaseClient';
import type { KYBill, KYLegislatorRoster, KYOrdinance, KYSchoolBoardItem } from '../types/kentucky';
import { AiSummaryTooltip } from '@/components/civic/AiAttribution';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { SectionHeader } from '@/components/civic/SectionHeader';
import { EmptyState } from '@/components/civic/EmptyState';
import { normalizeLegistarOrdinanceText } from '@/lib/legistar-text';
import { KYBillCard } from '@/components/bills/KYBillCard';
import { withTimeout } from '@/lib/async-utils';
import { PaginatedSection } from '@/components/ui/PaginatedSection';
import { GovernorBeshearChip } from '@/components/civic/GovernorBeshearChip';

const HOME_SECTION_PAGE_SIZE = 6;
const HOME_SECTION_FETCH = 24;

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
  const titleDisplay = normalizeLegistarOrdinanceText(ordinance.title);
  const statusDisplay = ordinance.status ? normalizeLegistarOrdinanceText(ordinance.status) : '';
  const sponsorText = formatOrdinanceSponsors(ordinance.sponsors);
  const tooltipTitle = (
    <Box component="span" sx={{ display: 'block', maxWidth: 360 }}>
      <Typography component="span" variant="subtitle2" display="block" sx={{ fontWeight: 600, mb: 1 }}>
        {ordinance.ordinance_number ? `${ordinance.ordinance_number}: ` : ''}{titleDisplay}
      </Typography>
      {ordinance.ai_summary && <AiSummaryTooltip>{ordinance.ai_summary}</AiSummaryTooltip>}
      {sponsorText && (
        <Typography component="span" variant="caption" display="block" sx={{ fontWeight: 600 }}>
          Sponsor{sponsorText.includes(',') ? 's' : ''}: {sponsorText}
        </Typography>
      )}
    </Box>
  );
  const searchHref = `/search?q=${encodeURIComponent(ordinance.ordinance_number || titleDisplay || '')}`;
  const card = (
    <Card
      component={Link}
      href={searchHref}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.2s',
        textDecoration: 'none',
        color: 'inherit',
        '&:hover': { boxShadow: 4, transform: 'translateY(-2px)', borderColor: theme.palette.primary.main },
      }}
    >
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5 }}>
          <Chip label={ordinance.jurisdiction === 'louisville' ? 'Louisville' : 'Lexington'} size="small" color="info" />
          {statusDisplay && <Chip label={statusDisplay} size="small" variant="outlined" />}
        </Box>
        {ordinance.ordinance_number && <Typography variant="subtitle1" fontWeight={600} gutterBottom>{ordinance.ordinance_number}</Typography>}
        <Typography variant="body2" color="text.secondary" sx={{ display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {titleDisplay}
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

function KYSchoolBoardCard({ item }: { item: KYSchoolBoardItem }) {
  const theme = useTheme();
  const tooltipTitle = (
    <Box component="span" sx={{ display: 'block', maxWidth: 360 }}>
      <Typography component="span" variant="subtitle2" display="block" sx={{ fontWeight: 600, mb: 1 }}>
        {item.title}
      </Typography>
      {item.ai_summary && <AiSummaryTooltip>{item.ai_summary}</AiSummaryTooltip>}
      {item.vote_result && (
        <Typography component="span" variant="caption" display="block">Result: {item.vote_result}</Typography>
      )}
    </Box>
  );
  const searchHref = `/search?q=${encodeURIComponent(item.title || '')}`;
  const card = (
    <Card
      component={Link}
      href={searchHref}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
        transition: 'all 0.2s',
        textDecoration: 'none',
        color: 'inherit',
        '&:hover': { boxShadow: 4, transform: 'translateY(-2px)', borderColor: theme.palette.primary.main },
      }}
    >
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
  const [houseBills, setHouseBills] = useState<KYBill[]>([]);
  const [senateBills, setSenateBills] = useState<KYBill[]>([]);
  const [showChamberSections, setShowChamberSections] = useState(false);
  const [legislators, setLegislators] = useState<KYLegislatorRoster[]>([]);
  const [ordinances, setOrdinances] = useState<KYOrdinance[]>([]);
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
        const [billsRes, senateCountRes, legRes, ordRes, sbRes] = await withTimeout(
          Promise.all([
            supabase.from('ky_bills').select('*').order('last_action_date', { ascending: false }).limit(HOME_SECTION_FETCH),
            supabase
              .from('ky_bills')
              .select('id', { count: 'exact', head: true })
              .or('chamber.eq.senate,bill_number.ilike.S%'),
            supabase
              .from('ky_legislators')
              .select('id,name,first_name,last_name,party,chamber,district,photo_url')
              .eq('active', true),
            supabase.from('ky_ordinances').select('*').order('introduced_date', { ascending: false }).limit(HOME_SECTION_FETCH),
            supabase.from('ky_school_board_items').select('*').order('meeting_date', { ascending: false }).limit(HOME_SECTION_FETCH),
          ]),
          30_000,
          'Could not reach database (timed out). Check your connection and Supabase status.',
        );
        if (billsRes.error) console.warn('[Home] ky_bills:', billsRes.error.message);
        if (senateCountRes.error) console.warn('[Home] ky_bills (senate count):', senateCountRes.error.message);
        if (legRes.error) console.warn('[Home] ky_legislators:', legRes.error.message);
        if (ordRes.error) console.warn('[Home] ky_ordinances:', ordRes.error.message);
        if (sbRes.error) console.warn('[Home] ky_school_board_items:', sbRes.error.message);
        if (billsRes.data) setBills(billsRes.data);
        if (legRes.data) setLegislators(legRes.data);
        if (ordRes.data) setOrdinances(ordRes.data);
        if (sbRes.data) setSchoolBoardItems(sbRes.data);

        const senateCount = senateCountRes.count ?? 0;
        const bicameral = senateCount > 0;
        setShowChamberSections(bicameral);
        if (!bicameral) {
          setHouseBills([]);
          setSenateBills([]);
        } else {
          const [houseBillsRes, senateBillsRes] = await withTimeout(
            Promise.all([
              supabase
                .from('ky_bills')
                .select('*')
                .or('chamber.eq.house,bill_number.ilike.H%')
                .order('last_action_date', { ascending: false })
                .limit(HOME_SECTION_FETCH),
              supabase
                .from('ky_bills')
                .select('*')
                .or('chamber.eq.senate,bill_number.ilike.S%')
                .order('last_action_date', { ascending: false })
                .limit(HOME_SECTION_FETCH),
            ]),
            30_000,
            'Could not reach database (timed out). Check your connection and Supabase status.',
          );
          if (houseBillsRes.error) console.warn('[Home] ky_bills (house):', houseBillsRes.error.message);
          if (senateBillsRes.error) console.warn('[Home] ky_bills (senate):', senateBillsRes.error.message);
          if (houseBillsRes.data) setHouseBills(houseBillsRes.data);
          if (senateBillsRes.data) setSenateBills(senateBillsRes.data);
        }
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
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 2, maxWidth: 600 }}>
            Track Kentucky legislation, local ordinances, and school board decisions.
            Stay informed about the issues that affect your community.
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1, mb: 2 }}>
            <GovernorBeshearChip variant="hero" />
          </Box>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button component={Link} href="/bills" variant="contained" color="secondary" endIcon={<ArrowForward />}>
              Browse Bills
            </Button>
            <Button component={Link} href="/bills/house" variant="contained" color="inherit" sx={{ color: 'primary.main', bgcolor: 'background.paper' }} endIcon={<ArrowForward />}>
              House Bills
            </Button>
            <Button component={Link} href="/bills/senate" variant="contained" color="inherit" sx={{ color: 'primary.main', bgcolor: 'background.paper' }} endIcon={<ArrowForward />}>
              Senate Bills
            </Button>
            <Button component={Link} href="/search" variant="outlined" sx={{ color: 'inherit', borderColor: 'rgba(255,255,255,0.5)' }}>
              Search Everything
            </Button>
          </Box>
          <DataFreshnessNote variant="hero" />
        </Container>
      </Box>

      <Container maxWidth="lg">
        {!supabase && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Supabase is not configured in the browser. Set{' '}
            <strong>NEXT_PUBLIC_SUPABASE_URL</strong> and <strong>NEXT_PUBLIC_SUPABASE_ANON_KEY</strong> in{' '}
            <code>.env.local</code>, then restart the dev server, to load bills and legislators.
          </Alert>
        )}
        {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}
        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
            <CircularProgress />
          </Box>
        )}

        {!loading && (
          <>
            {/* Latest KY Bills */}
            <SectionHeader
              title="Latest KY Bills"
              icon={<Gavel />}
              href="/bills"
              caption={showChamberSections ? 'Recent activity across the House and Senate.' : undefined}
            />
            {bills.length === 0 ? (
              <Grid container spacing={3} sx={{ mb: 6 }}>
                <Grid item xs={12}><EmptyState message="No bills yet. Data will appear once synced." /></Grid>
              </Grid>
            ) : (
              <Box sx={{ mb: 6 }}>
                <PaginatedSection
                  items={bills}
                  pageSize={HOME_SECTION_PAGE_SIZE}
                  resetKey={`${bills.length}-${bills[0]?.id ?? ''}`}
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
              </Box>
            )}

            {showChamberSections && (
              <>
                <SectionHeader
                  title="Latest House Bills"
                  icon={<Gavel />}
                  href="/bills/house"
                  caption="House chamber bills and resolutions — see all House activity."
                />
                {houseBills.length === 0 ? (
                  <Grid container spacing={3} sx={{ mb: 6 }}>
                    <Grid item xs={12}><EmptyState message="No House bills yet. Data will appear once synced." /></Grid>
                  </Grid>
                ) : (
                  <Box sx={{ mb: 6 }}>
                    <PaginatedSection
                      items={houseBills}
                      pageSize={HOME_SECTION_PAGE_SIZE}
                      resetKey={`h-${houseBills.length}-${houseBills[0]?.id ?? ''}`}
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
                  </Box>
                )}

                <SectionHeader
                  title="Latest Senate Bills"
                  icon={<Gavel />}
                  href="/bills/senate"
                  caption="Senate chamber bills and resolutions — see all Senate activity."
                />
                {senateBills.length === 0 ? (
                  <Grid container spacing={3} sx={{ mb: 6 }}>
                    <Grid item xs={12}><EmptyState message="No Senate bills yet. Run a bills sync after updating the app." /></Grid>
                  </Grid>
                ) : (
                  <Box sx={{ mb: 6 }}>
                    <PaginatedSection
                      items={senateBills}
                      pageSize={HOME_SECTION_PAGE_SIZE}
                      resetKey={`s-${senateBills.length}-${senateBills[0]?.id ?? ''}`}
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
                  </Box>
                )}
              </>
            )}

            {/* Local Ordinances */}
            <SectionHeader
              title="Local Ordinances"
              icon={<AccountBalance />}
              href="/ordinances"
              caption="Louisville Metro & Lexington-Fayette (core MVP local coverage)."
            />
            {ordinances.length === 0 ? (
              <Grid container spacing={3} sx={{ mb: 6 }}>
                <Grid item xs={12}><EmptyState message="No ordinances yet. Louisville and Lexington data will appear once synced." /></Grid>
              </Grid>
            ) : (
              <Box sx={{ mb: 6 }}>
                <PaginatedSection
                  items={ordinances}
                  pageSize={HOME_SECTION_PAGE_SIZE}
                  resetKey={`o-${ordinances.length}-${ordinances[0]?.id ?? ''}`}
                  variant="responsive"
                >
                  {(pageOrds) => (
                    <Grid container spacing={3}>
                      {pageOrds.map((ord) => (
                        <Grid item xs={12} sm={6} md={4} key={ord.id}>
                          <KYOrdinanceCard ordinance={ord} />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </PaginatedSection>
              </Box>
            )}

            {/* School Board Updates */}
            <SectionHeader
              title="School Board Updates"
              icon={<School />}
              href="/search"
              beta
              caption="Jefferson County (JCPS) and Fayette County (FCPS) — not all Kentucky districts."
            />
            {schoolBoardItems.length === 0 ? (
              <Grid container spacing={3} sx={{ mb: 6 }}>
                <Grid item xs={12}><EmptyState message="No school board items yet. JCPS and FCPS data will appear once synced." /></Grid>
              </Grid>
            ) : (
              <Box sx={{ mb: 6 }}>
                <PaginatedSection
                  items={schoolBoardItems}
                  pageSize={HOME_SECTION_PAGE_SIZE}
                  resetKey={`sb-${schoolBoardItems.length}-${schoolBoardItems[0]?.id ?? ''}`}
                  variant="responsive"
                >
                  {(pageItems) => (
                    <Grid container spacing={3}>
                      {pageItems.map((item) => (
                        <Grid item xs={12} sm={6} md={4} key={item.id}>
                          <KYSchoolBoardCard item={item} />
                        </Grid>
                      ))}
                    </Grid>
                  )}
                </PaginatedSection>
              </Box>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
