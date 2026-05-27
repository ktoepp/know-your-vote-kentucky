'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  Grid,
  Stack,
  Typography,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { Bookmark, Gavel } from '@mui/icons-material';
import { supabase } from '@/app/lib/supabaseClient';
import { useUser } from '@/app/lib/UserContext';
import type { KYBill, KYLegislatorRoster } from '@/types/kentucky';
import { KY_BILL_BROWSE_SELECT } from '@/lib/ky-bills-browse-server';
import { KYBillCard } from '@/components/bills/KYBillCard';
import { CardGrid, CardGridItem } from '@/components/ui/CardGrid';
import { SectionHeader } from '@/components/civic/SectionHeader';
import { EmptyState } from '@/components/civic/EmptyState';
import { PaginatedSection } from '@/components/ui/PaginatedSection';
import { useFollowedBillsAndTopics } from '@/lib/use-followed-bills-topics';
import { FOLLOW_COPY } from '@/lib/follow-labels';

const FEED_PAGE_SIZE = 12;

export interface FeedViewProps {
  initialRecentHouse: KYBill[];
  initialRecentSenate: KYBill[];
  legislatorRoster: KYLegislatorRoster[];
}

export function FeedView({ initialRecentHouse, initialRecentSenate, legislatorRoster }: FeedViewProps) {
  const theme = useTheme();
  const router = useRouter();
  const { user, loading: userLoading } = useUser();
  const { followedBillIds, followedTopics, authed } = useFollowedBillsAndTopics();

  const [followedBills, setFollowedBills] = useState<KYBill[]>([]);
  const recentHouseBills = initialRecentHouse;
  const recentSenateBills = initialRecentSenate;
  const legislators = legislatorRoster;

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace('/');
    }
  }, [user, userLoading, router]);

  useEffect(() => {
    if (!supabase || !authed || followedBillIds.size === 0) {
      setFollowedBills([]);
      return;
    }
    const ids = Array.from(followedBillIds);
    supabase
      .from('ky_bills')
      .select(KY_BILL_BROWSE_SELECT)
      .in('id', ids)
      .order('last_action_date', { ascending: false, nullsFirst: false })
      .then(({ data }) => {
        if (data) setFollowedBills(data as KYBill[]);
      });
  }, [authed, followedBillIds]);

  if (userLoading || (!user && !userLoading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  const firstName = user?.user_metadata?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? null;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
            {firstName ? `Welcome back, ${firstName}` : 'Your feed'}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Bills you follow and recent activity from the Kentucky General Assembly.
          </Typography>
        </Box>

        <Box sx={{ mb: 6 }}>
          <SectionHeader title={FOLLOW_COPY.followedBillsSection} icon={<Bookmark />} href="/bills?follows=me" />
          {!authed ? (
            <Box
              sx={{
                p: 4,
                borderRadius: 2,
                border: `1px dashed ${theme.palette.divider}`,
                textAlign: 'center',
              }}
            >
              <Typography variant="body1" color="text.secondary" gutterBottom>
                Follow bills to see them here.
              </Typography>
              <Button component={Link} href="/bills" variant="contained" sx={{ mt: 1 }}>
                Browse bills
              </Button>
            </Box>
          ) : followedBills.length === 0 ? (
            <Box
              sx={{
                p: 4,
                borderRadius: 2,
                border: `1px dashed ${theme.palette.divider}`,
                textAlign: 'center',
              }}
            >
              <Typography variant="body1" color="text.secondary" gutterBottom>
                You haven&apos;t followed any bills yet.
              </Typography>
              <Button component={Link} href="/bills" variant="contained" sx={{ mt: 1 }}>
                Browse bills
              </Button>
            </Box>
          ) : (
            <PaginatedSection items={followedBills} pageSize={FEED_PAGE_SIZE} variant="loadmore">
              {(pageBills) => (
                <CardGrid>
                  {pageBills.map((bill) => (
                    <CardGridItem key={bill.id}>
                      <KYBillCard
                        bill={bill}
                        legislators={legislators}
                        followedBillIds={followedBillIds}
                        followedTopics={followedTopics}
                      />
                    </CardGridItem>
                  ))}
                </CardGrid>
              )}
            </PaginatedSection>
          )}
        </Box>

        <Divider sx={{ mb: 6 }} />

        <Box>
          <Typography variant="h5" component="h2" fontWeight={700} sx={{ mb: 4 }}>
            Recent legislative activity
          </Typography>

          <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Gavel sx={{ color: 'primary.main', fontSize: '1.25rem' }} />
                <Typography variant="h6" fontWeight={700}>
                  House
                </Typography>
                <Chip label="Recent" size="small" variant="outlined" />
              </Box>
              {recentHouseBills.length === 0 ? (
                <EmptyState message="No recent House activity." />
              ) : (
                <PaginatedSection items={recentHouseBills} pageSize={FEED_PAGE_SIZE} variant="loadmore">
                  {(pageBills) => (
                    <Stack spacing={2}>
                      {pageBills.map((bill) => (
                        <KYBillCard
                          key={bill.id}
                          bill={bill}
                          legislators={legislators}
                          followedBillIds={authed ? followedBillIds : null}
                          followedTopics={authed ? followedTopics : null}
                        />
                      ))}
                    </Stack>
                  )}
                </PaginatedSection>
              )}
            </Grid>

            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <Gavel sx={{ color: 'primary.main', fontSize: '1.25rem' }} />
                <Typography variant="h6" fontWeight={700}>
                  Senate
                </Typography>
                <Chip label="Recent" size="small" variant="outlined" />
              </Box>
              {recentSenateBills.length === 0 ? (
                <EmptyState message="No recent Senate activity." />
              ) : (
                <PaginatedSection items={recentSenateBills} pageSize={FEED_PAGE_SIZE} variant="loadmore">
                  {(pageBills) => (
                    <Stack spacing={2}>
                      {pageBills.map((bill) => (
                        <KYBillCard
                          key={bill.id}
                          bill={bill}
                          legislators={legislators}
                          followedBillIds={authed ? followedBillIds : null}
                          followedTopics={authed ? followedTopics : null}
                        />
                      ))}
                    </Stack>
                  )}
                </PaginatedSection>
              )}
            </Grid>
          </Grid>
        </Box>
      </Container>
    </Box>
  );
}
