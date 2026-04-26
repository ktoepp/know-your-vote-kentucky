'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  CircularProgress,
  Alert,
  Grid,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import {
  Gavel,
  ArrowForward,
} from '@mui/icons-material';
import Link from 'next/link';
import Image from 'next/image';
import { useTheme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import { supabase } from './lib/supabaseClient';
import type { KYBill, KYLegislatorRoster } from '../types/kentucky';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { SectionHeader } from '@/components/civic/SectionHeader';
import { EmptyState } from '@/components/civic/EmptyState';
import { KYBillCard } from '@/components/bills/KYBillCard';
import { withTimeout } from '@/lib/async-utils';
import { PaginatedSection } from '@/components/ui/PaginatedSection';
import { PAGE_SIZE_CHOICES, toPageSizeChoice, usePersistedPageSize } from '@/lib/use-persisted-page-size';
import { HomeCuratedBillList } from '@/components/home/HomeCuratedBillList';
import { selectRecentlyPassedBills, selectMostViewedBills } from '@/lib/home-bill-curated';
import { KY_SESSIONS, getActiveSession } from '@/lib/ky-sessions';
import { ICON_REM, TYPE } from '@/lib/ui-tokens';

/** Each home bill query loads enough rows for 25/50/100 per page in every section. */
const HOME_SECTION_FETCH = 100;
const HOME_CURATED_LIMIT = 6;

/** LRC meetings & committee schedule (authoritative for day-to-day floor and committee). */
const KY_LRC_SCHEDULE_URL = 'https://legislature.ky.gov/Committee/Schedule';

function SessionBanner() {
  const theme = useTheme();
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const active = getActiveSession();
  const session = active ?? KY_SESSIONS[0]!;
  const isInSession = Boolean(active);

  const sessionStart = new Date(session.start);
  const sessionEnd = new Date(session.end);
  sessionEnd.setHours(23, 59, 59, 999);
  const beforeSession = today < sessionStart;
  const afterScheduledSession = today > sessionEnd;

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const statusColor = isInSession
    ? theme.palette.success.main
    : beforeSession
      ? theme.palette.info.main
      : theme.palette.grey[500];
  const rowBg = isInSession
    ? alpha(theme.palette.success.main, 0.08)
    : beforeSession
      ? alpha(theme.palette.info.main, 0.06)
      : alpha(theme.palette.grey[500], 0.08);

  const statusTitle = isInSession
    ? 'General Assembly in session'
    : beforeSession
      ? 'Upcoming regular session'
      : 'Regular session (scheduled dates) ended';

  return (
    <Box
      sx={{
        borderBottom: `1px solid ${theme.palette.divider}`,
        bgcolor: rowBg,
        py: 1.25,
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 1.5,
            flexWrap: 'wrap',
            flexDirection: { xs: 'column', sm: 'row' },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              flexWrap: 'wrap',
              flex: 1,
              minWidth: 0,
            }}
          >
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: statusColor,
                flexShrink: 0,
                ...(isInSession && {
                  animation: 'pulse 2s infinite',
                  '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.4 } },
                }),
              }}
            />
            <Box component="div" sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                fontWeight={600}
                color={isInSession ? 'success.main' : 'text.primary'}
                component="span"
                sx={{ display: 'block' }}
              >
                {statusTitle}
              </Typography>
              <Typography variant="body2" color="text.secondary" component="span" sx={{ display: 'block', mt: 0.25 }}>
                {session.name} · {fmtDate(session.start)} – {fmtDate(session.end)}
              </Typography>
              {afterScheduledSession && !isInSession && (
                <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', mt: 0.5 }}>
                  Chambers or committees can still post limited activity after the last scheduled day—check the LRC
                  for meetings and published calendars.
                </Typography>
              )}
              {beforeSession && !isInSession && (
                <Typography variant="caption" color="text.secondary" component="span" sx={{ display: 'block', mt: 0.5 }}>
                  Session convenes {fmtDate(session.start)}. Next in-person work after sine die is usually the next
                  January regular session unless a special session is called.
                </Typography>
              )}
            </Box>
          </Box>
          <Button
            component={Link}
            href={KY_LRC_SCHEDULE_URL}
            target="_blank"
            rel="noopener noreferrer"
            size="medium"
            sx={{ ml: { sm: 'auto' }, fontSize: '0.95rem', py: 0.75, px: 1.5, flexShrink: 0 }}
          >
            LRC schedule
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default function HomePage() {
  const theme = useTheme();
  const [bills, setBills] = useState<KYBill[]>([]);
  const [houseBills, setHouseBills] = useState<KYBill[]>([]);
  const [senateBills, setSenateBills] = useState<KYBill[]>([]);
  const [showChamberSections, setShowChamberSections] = useState(false);
  const [legislators, setLegislators] = useState<KYLegislatorRoster[]>([]);
  const [passedSidebarBills, setPassedSidebarBills] = useState<KYBill[]>([]);
  const [mostViewedBills, setMostViewedBills] = useState<KYBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { pageSize: homePageSize, setPageSize: setHomePageSize } = usePersistedPageSize('home', 25);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        if (!supabase) {
          setLoading(false);
          return;
        }
        const [billsRes, senateCountRes, legRes, passedRes, mostViewedRes] = await withTimeout(
          Promise.all([
            supabase.from('ky_bills').select('*').order('session', { ascending: false }).order('last_action_date', { ascending: false }).limit(HOME_SECTION_FETCH),
            supabase
              .from('ky_bills')
              .select('id', { count: 'exact', head: true })
              .or('chamber.eq.senate,bill_number.ilike.S%'),
            supabase
              .from('ky_legislators')
              .select('id,legiscan_id,name,first_name,last_name,party,chamber,district,photo_url')
              .eq('active', true),
            supabase
              .from('ky_bills')
              .select('*')
              .or('status.ilike.%signed%,status.ilike.%chaptered%,status.ilike.%enrolled%,status.ilike.%veto%override%')
              .order('session', { ascending: false })
              .order('last_action_date', { ascending: false, nullsFirst: false })
              .limit(16),
            supabase
              .from('ky_bills')
              .select('*')
              .order('view_count', { ascending: false, nullsFirst: false })
              .order('session', { ascending: false })
              .order('last_action_date', { ascending: false, nullsFirst: false })
              .limit(24),
          ]),
          30_000,
          'Could not reach database (timed out). Check your connection and Supabase status.',
        );
        if (billsRes.error) console.warn('[Home] ky_bills:', billsRes.error.message);
        if (senateCountRes.error) console.warn('[Home] ky_bills (senate count):', senateCountRes.error.message);
        if (legRes.error) console.warn('[Home] ky_legislators:', legRes.error.message);
        if (passedRes.error) console.warn('[Home] ky_bills (curated passed):', passedRes.error.message);
        if (mostViewedRes.error) console.warn('[Home] ky_bills (most viewed):', mostViewedRes.error.message);
        const billsData = billsRes.data ?? [];
        setBills(billsData);
        const passed = selectRecentlyPassedBills(passedRes.data, billsData, HOME_CURATED_LIMIT);
        setPassedSidebarBills(passed);
        setMostViewedBills(selectMostViewedBills(mostViewedRes.data, billsData, passed, HOME_CURATED_LIMIT));
        if (legRes.data) setLegislators(legRes.data);

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
                .order('session', { ascending: false })
                .order('last_action_date', { ascending: false })
                .limit(HOME_SECTION_FETCH),
              supabase
                .from('ky_bills')
                .select('*')
                .or('chamber.eq.senate,bill_number.ilike.S%')
                .order('session', { ascending: false })
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
      {/* Hero: Kentucky State Capitol, Frankfort (Wikimedia: File:KY_State_Capitol.jpg, public domain) */}
      <Box
        sx={{
          position: 'relative',
          overflow: 'hidden',
          color: 'common.white',
          py: { xs: 6, md: 8 },
          mb: 4,
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
          }}
        >
          <Image
            src="/images/ky-capitol-hero.jpg"
            alt="Kentucky State Capitol in Frankfort"
            fill
            priority
            sizes="100vw"
            style={{ objectFit: 'cover', objectPosition: 'center' }}
          />
        </Box>
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            inset: 0,
            zIndex: 1,
            background:
              theme.palette.mode === 'dark'
                ? 'linear-gradient(135deg, rgba(0,0,0,0.7) 0%, rgba(0,24,48,0.6) 100%)'
                : 'linear-gradient(135deg, rgba(0,40,80,0.78) 0%, rgba(0,60,110,0.5) 45%, rgba(0,0,0,0.4) 100%)',
          }}
        />
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <Typography variant={TYPE.heroTitle.variant} component="h1" fontWeight={TYPE.heroTitle.fontWeight} gutterBottom>
            Know Your Vote Kentucky
          </Typography>
          <Typography variant="subtitle1" component="p" sx={{ opacity: 0.9, mb: 2, maxWidth: 640, fontWeight: 400, lineHeight: 1.5 }}>
            House and Senate bills, your legislators, and district maps in one place—plain-language context and
            up-to-date status from public data sources.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button component={Link} href="/bills" variant="contained" color="secondary" endIcon={<ArrowForward sx={{ fontSize: ICON_REM.nav }} />}>
              Browse all bills
            </Button>
            <Button
              component={Link}
              href="/search"
              variant="outlined"
              color="inherit"
              sx={{
                color: 'common.white',
                borderColor: 'rgba(255, 255, 255, 0.55)',
                '&:hover': {
                  color: 'common.white',
                  borderColor: 'common.white',
                  bgcolor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              Search bills
            </Button>
            <Button component={Link} href="/bills/house" variant="contained" color="inherit" sx={{ color: 'primary.main', bgcolor: 'background.paper' }} endIcon={<ArrowForward sx={{ fontSize: ICON_REM.nav }} />}>
              House bills
            </Button>
            <Button component={Link} href="/bills/senate" variant="contained" color="inherit" sx={{ color: 'primary.main', bgcolor: 'background.paper' }} endIcon={<ArrowForward sx={{ fontSize: ICON_REM.nav }} />}>
              Senate bills
            </Button>
            <Button
              component={Link}
              href="/members/map"
              variant="outlined"
              color="inherit"
              sx={{
                color: 'common.white',
                borderColor: 'rgba(255, 255, 255, 0.55)',
                '&:hover': {
                  color: 'common.white',
                  borderColor: 'common.white',
                  bgcolor: 'rgba(255, 255, 255, 0.12)',
                },
              }}
            >
              District map
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
          <Grid container spacing={3} sx={{ alignItems: 'flex-start' }}>
            <Grid item xs={12} lg={8} sx={{ order: { xs: 0, lg: 0 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 150 }} variant="outlined">
                  <InputLabel id="home-bills-per-page">Bills per page</InputLabel>
                  <Select
                    labelId="home-bills-per-page"
                    label="Bills per page"
                    value={homePageSize}
                    onChange={(e) => setHomePageSize(toPageSizeChoice(parseInt(String(e.target.value), 10)))}
                  >
                    {PAGE_SIZE_CHOICES.map((n) => (
                      <MenuItem key={n} value={n}>
                        {n}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
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
                    pageSize={homePageSize}
                    resetKey={`${bills.length}-${bills[0]?.id ?? ''}-${homePageSize}`}
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
                        pageSize={homePageSize}
                        resetKey={`h-${houseBills.length}-${houseBills[0]?.id ?? ''}-${homePageSize}`}
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
                        pageSize={homePageSize}
                        resetKey={`s-${senateBills.length}-${senateBills[0]?.id ?? ''}-${homePageSize}`}
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
            </Grid>
            <Grid item xs={12} lg={4} sx={{ order: { xs: -1, lg: 0 } }}>
              <Stack
                spacing={2}
                sx={{
                  position: { lg: 'sticky' },
                  top: { lg: 24 },
                  mb: { xs: 1, lg: 0 },
                }}
              >
                <HomeCuratedBillList
                  kind="passed"
                  title="Recently passed"
                  caption="Signed, chaptered, enrolled, or similar final stages."
                  bills={passedSidebarBills}
                  line="status"
                  emptyMessage="No bills match this view yet. Try again after a sync."
                />
                <HomeCuratedBillList
                  kind="views"
                  title="Most viewed"
                  caption="Based on how often people open a bill’s detail page. New bills show 0 until someone views them."
                  bills={mostViewedBills}
                  emptyMessage="No bills to show yet."
                />
              </Stack>
            </Grid>
          </Grid>
        )}
      </Container>
    </Box>
  );
}
