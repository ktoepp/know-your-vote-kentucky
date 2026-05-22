'use client';

import React, { useMemo, useState } from 'react';
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
  Paper,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowBack, Description, Groups, HowToVote, OpenInNew } from '@mui/icons-material';
import type { KYBill, KYLegislator } from '@/types/kentucky';
import { MemberCard } from '@/components/members/MemberCard';
import { KYBillCard } from '@/components/bills/KYBillCard';
import { LegislatorDistrictThumbnail } from '@/components/members/LegislatorDistrictThumbnail';
import { legiscanMemberPersonUrl } from '@/lib/external-legislative-links';
import { groupLegislatorExternalLinks, labelForLinkHost } from '@/lib/legislator-link-normalize';
import { ICON_REM, TYPE, SECTION_TITLE_DISPLAY_SX } from '@/lib/ui-tokens';
import { BillNumber } from '@/components/bills/BillNumber';
import { formatKyIsoDateShort } from '@/lib/bill-display';
import { shortKyCommitteeLabel } from '@/lib/ky-committee-display';
import { ChamberChip } from '@/components/ui/Chip';
import type { MemberRecentRollVote, MemberVoteRecord } from '@/lib/member-profile-data';
import type { MemberCommitteeAssignment } from '@/lib/ky-member-committees';
import type { VoteBucket } from '@/lib/legiscan-vote-tally';

type VoteFilter = 'all' | 'yea' | 'nay' | 'nv_absent' | 'unknown';

const FILTERED_VOTE_DISPLAY_CAP = 50;

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

function matchesVoteFilter(bucket: VoteBucket, filter: VoteFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'yea') return bucket === 'yea';
  if (filter === 'nay') return bucket === 'nay';
  if (filter === 'nv_absent') return bucket === 'nv' || bucket === 'absent';
  return bucket === 'unknown';
}

function CommitteeAssignmentTile({ assignment }: { assignment: MemberCommitteeAssignment }) {
  const { shortLabel, fullLabel } = shortKyCommitteeLabel(assignment.name);
  const aria = assignment.roleLabel
    ? `${fullLabel}, ${assignment.roleLabel}`
    : fullLabel;

  return (
    <Paper
      component={Link}
      href={`/committees/${assignment.slug}`}
      variant="outlined"
      title={fullLabel}
      aria-label={aria}
      sx={{
        p: 1.5,
        borderRadius: 2,
        textDecoration: 'none',
        color: 'inherit',
        minHeight: 72,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 0.5,
        '&:hover': { borderColor: 'primary.main', bgcolor: 'action.hover' },
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
        <ChamberChip chamber={assignment.chamber} size="small" />
        <Typography variant="body2" fontWeight={700} component="span">
          {shortLabel}
        </Typography>
      </Box>
      {assignment.roleLabel ? (
        <Typography variant="caption" color="text.secondary">
          {assignment.roleLabel}
        </Typography>
      ) : null}
    </Paper>
  );
}

function VoteRollCallList({ rows }: { rows: MemberRecentRollVote[] }) {
  if (rows.length === 0) return null;

  return (
    <List disablePadding>
      {rows.map((r, j) => (
        <React.Fragment key={r.voteId}>
          {j > 0 && <Divider component="li" />}
          <ListItem alignItems="flex-start" disablePadding sx={{ py: 1.25 }}>
            <ListItemText
              primary={
                r.bill ? (
                  <Box component="span" sx={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 0.5 }}>
                    <BillNumber billNumber={r.bill.bill_number} size="compact" href={`/bills/${r.bill.id}`} />
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
  );
}

export function MemberProfileView({
  leg,
  legislatorRoster,
  sessionName,
  sponsoredBills = [],
  voteRecord,
  committeeAssignments = [],
}: {
  leg: KYLegislator;
  legislatorRoster: KYLegislator[];
  sessionName: string;
  sponsoredBills?: KYBill[];
  voteRecord?: MemberVoteRecord;
  committeeAssignments?: MemberCommitteeAssignment[];
}) {
  const [voteFilter, setVoteFilter] = useState<VoteFilter>('all');

  const hasLegiscan = legiscanMemberPersonUrl(leg.legiscan_id) != null;
  const isChamberMember = leg.chamber === 'house' || leg.chamber === 'senate';
  const showLegislativeSections = isChamberMember || hasLegiscan;
  const tally = voteRecord?.tally;
  const { social: socialLinks, other: otherLinks } = groupLegislatorExternalLinks(leg.external_links);
  const hasConnectLinks = socialLinks.length > 0 || otherLinks.length > 0;

  const filteredVotes = useMemo(() => {
    if (!voteRecord?.votes.length) return [];
    if (voteFilter === 'all') return voteRecord.recent;
    const matched = voteRecord.votes.filter((v) => matchesVoteFilter(v.myBucket, voteFilter));
    return matched.slice(0, FILTERED_VOTE_DISPLAY_CAP);
  }, [voteFilter, voteRecord]);

  const filteredOverflow = useMemo(() => {
    if (voteFilter === 'all' || !voteRecord?.votes.length) return 0;
    const total = voteRecord.votes.filter((v) => matchesVoteFilter(v.myBucket, voteFilter)).length;
    return Math.max(0, total - FILTERED_VOTE_DISPLAY_CAP);
  }, [voteFilter, voteRecord]);

  const toggleVoteFilter = (next: VoteFilter) => {
    setVoteFilter((prev) => (prev === next ? 'all' : next));
  };

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
          <Box sx={{ mt: 2, maxWidth: 420, pointerEvents: 'none' }}>
            <LegislatorDistrictThumbnail leg={leg} size="profile" />
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
            {/* Sponsored bills */}
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
                No sponsored bills found for this session yet. If this member should have bills listed,
                run a bills sync so sponsor data is populated.
              </Typography>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                  gap: 2,
                  mb: 1,
                }}
              >
                {sponsoredBills.map((b) => (
                  <KYBillCard key={b.id} bill={b} legislators={legislatorRoster} />
                ))}
              </Box>
            )}

            {/* Voting record */}
            {isChamberMember ? (
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
                          <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mb: 1 }} role="group" aria-label="Filter votes by outcome">
                            {voteFilter !== 'all' && (
                              <Chip
                                size="small"
                                label="All"
                                clickable
                                variant="outlined"
                                onClick={() => setVoteFilter('all')}
                              />
                            )}
                            <Chip
                              size="small"
                              color="success"
                              variant={voteFilter === 'yea' ? 'filled' : 'outlined'}
                              label={`Yea: ${tally.yea}`}
                              clickable
                              aria-pressed={voteFilter === 'yea'}
                              onClick={() => toggleVoteFilter('yea')}
                            />
                            <Chip
                              size="small"
                              color="error"
                              variant={voteFilter === 'nay' ? 'filled' : 'outlined'}
                              label={`Nay: ${tally.nay}`}
                              clickable
                              aria-pressed={voteFilter === 'nay'}
                              onClick={() => toggleVoteFilter('nay')}
                            />
                            {(tally.notVoting > 0 || tally.absent > 0) && (
                              <Chip
                                size="small"
                                color="warning"
                                variant={voteFilter === 'nv_absent' ? 'filled' : 'outlined'}
                                label={`Not voting / absent: ${tally.notVoting + tally.absent}`}
                                clickable
                                aria-pressed={voteFilter === 'nv_absent'}
                                onClick={() => toggleVoteFilter('nv_absent')}
                              />
                            )}
                            {tally.unknown > 0 && (
                              <Chip
                                size="small"
                                variant={voteFilter === 'unknown' ? 'filled' : 'outlined'}
                                label={`Other: ${tally.unknown}`}
                                clickable
                                aria-pressed={voteFilter === 'unknown'}
                                onClick={() => toggleVoteFilter('unknown')}
                              />
                            )}
                          </Stack>
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                            Based on {voteRecord.totalRollCalls} roll call
                            {voteRecord.totalRollCalls === 1 ? '' : 's'} with this member&rsquo;s vote recorded.
                          </Typography>

                          {filteredVotes.length > 0 ? (
                            <>
                              <Typography component="h3" variant="subtitle2" color="text.primary" sx={{ mb: 0.5 }}>
                                {voteFilter === 'all' ? 'Recent' : 'Matching votes'}
                              </Typography>
                              <VoteRollCallList rows={filteredVotes} />
                              {filteredOverflow > 0 && (
                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                  …and {filteredOverflow} more
                                </Typography>
                              )}
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              No matching votes in {sessionName}.
                            </Typography>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : null}

            {/* Committee assignments */}
            {isChamberMember && (
              <>
                <Box sx={{ mt: 4, mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Groups sx={{ color: 'primary.main', fontSize: ICON_REM.section }} aria-hidden />
                  <Typography
                    component="h2"
                    variant={TYPE.sectionTitle.variant}
                    fontWeight={TYPE.sectionTitle.fontWeight}
                    color="text.primary"
                    sx={SECTION_TITLE_DISPLAY_SX}
                  >
                    Committee assignments
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Standing and interim committees from the LRC legislative calendar and roster data.
                </Typography>
                {committeeAssignments.length === 0 ? (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    No committee assignments on file for this member yet.
                  </Typography>
                ) : (
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                      gap: 1,
                      mb: 2,
                    }}
                  >
                    {committeeAssignments.map((c) => (
                      <CommitteeAssignmentTile key={c.slug} assignment={c} />
                    ))}
                  </Box>
                )}
              </>
            )}
          </>
        )}
      </Container>
    </Box>
  );
}
