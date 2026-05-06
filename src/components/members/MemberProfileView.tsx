'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowBack, Description, HowToVote } from '@mui/icons-material';
import type { KYBill, KYLegislator } from '@/types/kentucky';
import { MemberCard } from '@/components/members/MemberCard';
import { ICON_REM, TYPE } from '@/lib/ui-tokens';
import { billStatusChipLabel, formatBillLabelText } from '@/lib/bill-display';
import type { MemberVoteRecord } from '@/lib/member-profile-data';
import type { VoteBucket } from '@/lib/legiscan-vote-tally';

function rollVoteChipColor(bucket: VoteBucket): 'success' | 'error' | 'warning' | 'default' {
  if (bucket === 'yea') return 'success';
  if (bucket === 'nay') return 'error';
  if (bucket === 'nv' || bucket === 'absent') return 'warning';
  return 'default';
}

function rollVoteLabel(bucket: VoteBucket, raw: string | null): string {
  if (raw?.trim()) return raw.trim();
  if (bucket === 'yea') return 'Yea';
  if (bucket === 'nay') return 'Nay';
  if (bucket === 'nv') return 'Not voting';
  if (bucket === 'absent') return 'Absent';
  return 'Other';
}

export function MemberProfileView({
  leg,
  sessionName,
  sponsoredBills = [],
  voteRecord,
}: {
  leg: KYLegislator;
  sessionName: string;
  sponsoredBills?: KYBill[];
  voteRecord?: MemberVoteRecord;
}) {
  const router = useRouter();
  const hasLegiscan = leg.legiscan_id != null;
  const tally = voteRecord?.tally;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBack sx={{ fontSize: ICON_REM.nav }} />}
          onClick={() => router.push('/members')}
          sx={{ mb: 2, textTransform: 'none', fontWeight: 600 }}
        >
          All members
        </Button>

        {!leg.active && (
          <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
            This member may no longer be serving. Information shown may be from a prior session.
          </Alert>
        )}

        <MemberCard leg={leg} featured={false} />

        {!hasLegiscan && (
          <Alert severity="info" sx={{ mt: 3, borderRadius: 2 }}>
            Sponsored bills and voting history aren't available for this member yet.
          </Alert>
        )}

        {hasLegiscan && (
          <>
            <Box sx={{ mt: 4, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Description sx={{ color: 'primary.main', fontSize: ICON_REM.section }} />
              <Typography variant={TYPE.sectionTitle.variant} fontWeight={TYPE.sectionTitle.fontWeight} color="text.primary">
                Sponsored bills
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bills sponsored by this member in <strong>{sessionName}</strong>.
            </Typography>

            {sponsoredBills.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                No sponsored bills found for this session yet.
              </Typography>
            ) : (
              <Card variant="outlined" sx={{ borderRadius: 2, mb: 1 }}>
                <List disablePadding>
                  {sponsoredBills.map((b, i) => {
                    const statusLabel = billStatusChipLabel(b.status);
                    return (
                      <React.Fragment key={b.id}>
                        {i > 0 && <Divider component="li" />}
                        <ListItem disablePadding>
                          <ListItemText
                            primary={
                              <Box component="span" sx={{ display: 'block' }}>
                                <Link
                                  href={`/bills/${b.id}`}
                                  style={{ textDecoration: 'none', fontWeight: 600 }}
                                >
                                  <Typography component="span" color="primary.main" variant="body1">
                                    {formatBillLabelText(b.bill_number)}
                                    {b.title ? ` — ${b.title}` : ''}
                                  </Typography>
                                </Link>
                              </Box>
                            }
                            secondary={
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 0.5, gap: 0.5 }}>
                                {statusLabel ? <Chip size="small" label={statusLabel} variant="outlined" /> : null}
                                {b.last_action_date && (
                                  <Typography component="span" variant="caption" color="text.secondary">
                                    Last action {b.last_action_date}
                                  </Typography>
                                )}
                              </Stack>
                            }
                            secondaryTypographyProps={{ component: 'div' }}
                          />
                        </ListItem>
                      </React.Fragment>
                    );
                  })}
                </List>
              </Card>
            )}

            <Box sx={{ mt: 4, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <HowToVote sx={{ color: 'primary.main', fontSize: ICON_REM.section }} />
              <Typography variant={TYPE.sectionTitle.variant} fontWeight={TYPE.sectionTitle.fontWeight} color="text.primary">
                Voting record
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              How this member voted on floor and committee roll calls in <strong>{sessionName}</strong>.
            </Typography>

            {tally && voteRecord && (
              <Card variant="outlined" sx={{ borderRadius: 2, mb: 2 }}>
                <CardContent>
                  {voteRecord.totalRollCalls === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No recorded votes found for this session yet.
                    </Typography>
                  ) : (
                    <>
                      <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }}>
                        <Chip size="small" color="success" variant="outlined" label={`Yea: ${tally.yea}`} />
                        <Chip size="small" color="error" variant="outlined" label={`Nay: ${tally.nay}`} />
                        {(tally.notVoting > 0 || tally.absent > 0) && (
                          <Chip
                            size="small"
                            color="warning"
                            variant="outlined"
                            label={`Not voting / absent: ${tally.notVoting + tally.absent}`}
                          />
                        )}
                        {tally.unknown > 0 && (
                          <Chip size="small" variant="outlined" label={`Other: ${tally.unknown}`} />
                        )}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                        Based on {voteRecord.totalRollCalls} roll call
                        {voteRecord.totalRollCalls === 1 ? '' : 's'} with this member&rsquo;s vote recorded.
                      </Typography>

                      {voteRecord.recent.length > 0 && (
                        <>
                          <Typography variant="subtitle2" color="text.primary" sx={{ mb: 0.5 }}>
                            Recent
                          </Typography>
                          <List disablePadding>
                            {voteRecord.recent.map((r, j) => (
                              <React.Fragment key={r.voteId}>
                                {j > 0 && <Divider component="li" />}
                                <ListItem alignItems="flex-start" disablePadding sx={{ py: 1.25 }}>
                                  <ListItemText
                                    primary={
                                      r.bill ? (
                                        <Link
                                          href={`/bills/${r.bill.id}`}
                                          style={{ textDecoration: 'none' }}
                                        >
                                          <Typography component="span" color="primary.main" fontWeight={600} variant="body2">
                                            {formatBillLabelText(r.bill.bill_number)}
                                            {r.bill.title ? ` — ${r.bill.title}` : ''}
                                          </Typography>
                                        </Link>
                                      ) : (
                                        <Typography variant="body2" color="text.secondary">
                                          Bill
                                        </Typography>
                                      )
                                    }
                                    secondary={
                                      <Box sx={{ pt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                                        {r.date && (
                                          <Typography component="span" variant="caption" color="text.secondary">
                                            {r.date}
                                          </Typography>
                                        )}
                                        <Chip
                                          size="small"
                                          label={rollVoteLabel(r.myBucket, r.myVote)}
                                          color={rollVoteChipColor(r.myBucket)}
                                          variant="outlined"
                                        />
                                        {r.description && (
                                          <Typography component="span" variant="body2" color="text.secondary">
                                            {r.description}
                                          </Typography>
                                        )}
                                      </Box>
                                    }
                                    secondaryTypographyProps={{ component: 'div' }}
                                  />
                                </ListItem>
                              </React.Fragment>
                            ))}
                          </List>
                        </>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
