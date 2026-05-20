'use client';

import React from 'react';
import Link from 'next/link';
import {
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
import { ArrowBack, Description, HowToVote, OpenInNew } from '@mui/icons-material';
import type { KYBill, KYLegislator } from '@/types/kentucky';
import { MemberCard } from '@/components/members/MemberCard';
import { legiscanMemberPersonUrl } from '@/lib/external-legislative-links';
import { groupLegislatorExternalLinks, labelForLinkHost } from '@/lib/legislator-link-normalize';
import { ICON_REM, TYPE, SECTION_TITLE_DISPLAY_SX } from '@/lib/ui-tokens';
import { BillNumber } from '@/components/bills/BillNumber';
import { LegislatorDistrictMinimapLazy } from '@/components/members/LegislatorDistrictMinimapLazy';
import { billStatusChipLabel, formatKyIsoDateShort } from '@/lib/bill-display';
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
  legislatorRoster,
  sessionName,
  sponsoredBills = [],
  voteRecord,
}: {
  leg: KYLegislator;
  legislatorRoster: KYLegislator[];
  sessionName: string;
  sponsoredBills?: KYBill[];
  voteRecord?: MemberVoteRecord;
}) {
  const hasLegiscan = legiscanMemberPersonUrl(leg.legiscan_id) != null;
  const showLegislativeSections = leg.chamber === 'house' || leg.chamber === 'senate' || hasLegiscan;
  const tally = voteRecord?.tally;
  const { social: socialLinks, other: otherLinks } = groupLegislatorExternalLinks(leg.external_links);
  const hasConnectLinks = socialLinks.length > 0 || otherLinks.length > 0;

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Button
          component={Link}
          href="/members"
          startIcon={<ArrowBack sx={{ fontSize: ICON_REM.nav }} aria-hidden />}
          sx={{ mb: 2, textTransform: 'none', fontWeight: 600 }}
        >
          All members
        </Button>

        <MemberCard
          leg={leg}
          featured={false}
          profileNameHeading="h1"
          legislatorRoster={legislatorRoster}
          showDistrictMinimap={false}
        />

        {(leg.chamber === 'house' || leg.chamber === 'senate') && (
          <Box sx={{ mt: 2, maxWidth: 420 }}>
            <LegislatorDistrictMinimapLazy leg={leg} size="profile" />
          </Box>
        )}

        {hasConnectLinks && (
          <Box sx={{ mt: 3 }}>
            <Typography
              component="h2"
              variant="subtitle2"
              fontWeight={700}
              color="text.secondary"
              sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.75rem', mb: 1 }}
            >
              Connect &amp; follow
            </Typography>
            {socialLinks.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 0.75, mb: otherLinks.length > 0 ? 1 : 0 }}>
                {socialLinks.map((link) => {
                  const platform = labelForLinkHost(link.host);
                  return (
                    <Button
                      key={link.url}
                      component="a"
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="outlined"
                      endIcon={<OpenInNew sx={{ fontSize: '0.85rem' }} aria-hidden />}
                      aria-label={`${platform} profile for ${leg.name} (opens in a new tab)`}
                      sx={{ textTransform: 'none' }}
                    >
                      {platform}
                    </Button>
                  );
                })}
              </Stack>
            )}
            {otherLinks.length > 0 && (
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
                {otherLinks.map((link) => {
                  const label = link.note?.trim() || link.host.replace(/^www\./i, '');
                  return (
                    <Button
                      key={link.url}
                      component="a"
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      size="small"
                      variant="outlined"
                      endIcon={<OpenInNew sx={{ fontSize: '0.85rem' }} aria-hidden />}
                      aria-label={`${label} (opens in a new tab)`}
                      sx={{ textTransform: 'none' }}
                    >
                      {label}
                    </Button>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}

        {showLegislativeSections && (
          <>
            <Box sx={{ mt: 4, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Description sx={{ color: 'primary.main', fontSize: ICON_REM.section }} aria-hidden />
              <Typography
                component="h2"
                variant={TYPE.sectionTitle.variant}
                fontWeight={TYPE.sectionTitle.fontWeight}
                color="text.primary"
                sx={SECTION_TITLE_DISPLAY_SX}
              >
                Sponsored bills
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Bills sponsored by this member in <strong>{sessionName}</strong>.
            </Typography>

            {sponsoredBills.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {hasLegiscan
                  ? 'No sponsored bills found for this session yet.'
                  : 'No sponsored bills matched for this session. Voting history requires a LegiScan profile link on this member.'}
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
                                <Box component="span" sx={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 0.5 }}>
                                  <BillNumber billNumber={b.bill_number} size="compact" href={`/bills/${b.id}`} />
                                  {b.title ? (
                                    <Typography component="span" color="text.secondary" variant="body2">
                                      — {b.title}
                                    </Typography>
                                  ) : null}
                                </Box>
                              </Box>
                            }
                            secondary={
                              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ pt: 0.5, gap: 0.5 }}>
                                {statusLabel ? <Chip size="small" label={statusLabel} variant="outlined" /> : null}
                                {b.last_action_date && (
                                  <Typography component="span" variant="caption" color="text.secondary">
                                    Last action {formatKyIsoDateShort(b.last_action_date)}
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

            {hasLegiscan ? (
              <>
            <Box sx={{ mt: 4, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <HowToVote sx={{ color: 'primary.main', fontSize: ICON_REM.section }} aria-hidden />
              <Typography
                component="h2"
                variant={TYPE.sectionTitle.variant}
                fontWeight={TYPE.sectionTitle.fontWeight}
                color="text.primary"
                sx={SECTION_TITLE_DISPLAY_SX}
              >
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
                          <Typography component="h3" variant="subtitle2" color="text.primary" sx={{ mb: 0.5 }}>
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
                                        <Box component="span" sx={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 0.5 }}>
                                          <BillNumber
                                            billNumber={r.bill.bill_number}
                                            size="compact"
                                            href={`/bills/${r.bill.id}`}
                                          />
                                          {r.bill.title ? (
                                            <Typography component="span" color="text.secondary" variant="body2">
                                              — {r.bill.title}
                                            </Typography>
                                          ) : null}
                                        </Box>
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
                                            {formatKyIsoDateShort(r.date)}
                                          </Typography>
                                        )}
                                        <Chip
                                          size="small"
                                          label={rollVoteLabel(r.myBucket, r.myVote)}
                                          color={rollVoteChipColor(r.myBucket)}
                                          variant="outlined"
                                        />
                                        {r.description && (
                                          <Typography component="span" variant="caption" color="text.secondary">
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
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
                Voting history will appear here once this member is linked to LegiScan roll-call data.
              </Typography>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
