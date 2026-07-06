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
import { ArrowBack, Description, Groups, HowToVote } from '@mui/icons-material';
import { OfficialSourceLinks } from '@/components/civic/OfficialSourceLinks';
import type { KYLegislator } from '@/types/kentucky';
import { MemberCard } from '@/components/members/MemberCard';
import { MemberSponsoredBills } from '@/components/members/MemberSponsoredBills';
import { LegislatorDistrictThumbnail } from '@/components/members/LegislatorDistrictThumbnail';
import { kyLegislaturePublicUrl } from '@/lib/ky-member-utils';
import { legiscanMemberPersonUrl } from '@/lib/external-legislative-links';
import { groupLegislatorExternalLinks, labelForLinkHost } from '@/lib/legislator-link-normalize';
import { ICON_REM, INTERACTION, TYPE, SECTION_TITLE_DISPLAY_SX } from '@/lib/ui-tokens';
import { BillNumber } from '@/components/bills/BillNumber';
import { formatKyIsoDateShort } from '@/lib/bill-display';
import { shortKyCommitteeLabel } from '@/lib/ky-committee-display';
import { ChamberChip, CommitteeKindChip } from '@/components/ui/Chip';
import type { MemberRecentRollVote, MemberSponsoredBill, MemberVoteRecord } from '@/lib/member-profile-data';
import type { MemberCommitteeAssignment } from '@/lib/ky-member-committees';
import type { VoteBucket } from '@/lib/legiscan-vote-tally';
import { memberVoteLabel, voteBucketChipColor } from '@/lib/vote-display';

type VoteFilter = 'all' | VoteBucket;

const FILTERED_VOTE_DISPLAY_CAP = 50;

function matchesVoteFilter(bucket: VoteBucket, filter: VoteFilter): boolean {
  return filter === 'all' || bucket === filter;
}

function CommitteeAssignmentTile({ assignment }: { assignment: MemberCommitteeAssignment }) {
  const { shortLabel, fullLabel, committeeKind } = shortKyCommitteeLabel(assignment.name);
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
        ...INTERACTION.tileHover,
      }}
    >
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.75 }}>
        <ChamberChip chamber={assignment.chamber} size="small" />
        {committeeKind && committeeKind !== 'unknown' ? (
          <CommitteeKindChip kind={committeeKind} />
        ) : null}
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
                    label={memberVoteLabel(r.myBucket, r.myVote)}
                    color={voteBucketChipColor(r.myBucket)}
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
  sponsoredBills?: MemberSponsoredBill[];
  voteRecord?: MemberVoteRecord;
  committeeAssignments?: MemberCommitteeAssignment[];
}) {
  const [voteFilter, setVoteFilter] = useState<VoteFilter>('all');

  const hasLegiscan = legiscanMemberPersonUrl(leg.legiscan_id) != null;
  const isChamberMember = leg.chamber === 'house' || leg.chamber === 'senate';
  const showLegislativeSections = isChamberMember || hasLegiscan;
  const tally = voteRecord?.tally;
  const { social: socialLinks, other: otherLinks } = groupLegislatorExternalLinks(leg.external_links);
  const showDistrictMap = leg.chamber === 'house' || leg.chamber === 'senate';
  const officialProfileUrl = kyLegislaturePublicUrl(leg, legislatorRoster);
  const profileSourceLinks = [
    ...(officialProfileUrl
      ? [
          {
            href: officialProfileUrl,
            label: 'Official profile (KY Legislature)',
            ariaLabel: `Official Kentucky Legislature profile for ${leg.name} (opens in a new tab)`,
          },
        ]
      : []),
    ...socialLinks.map((link) => ({
      href: link.url,
      label: labelForLinkHost(link.host),
      ariaLabel: `${labelForLinkHost(link.host)} profile for ${leg.name} (opens in a new tab)`,
    })),
    ...otherLinks.map((link) => ({
      href: link.url,
      label: link.note?.trim() || link.host.replace(/^www\./i, ''),
    })),
  ].filter((link, i, arr) => arr.findIndex((l) => l.href === link.href) === i);

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
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          component={Link}
          href="/members"
          startIcon={<ArrowBack sx={{ fontSize: ICON_REM.nav }} aria-hidden />}
          sx={{ mb: 2, textTransform: 'none', fontWeight: 600 }}
        >
          All members
        </Button>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: showDistrictMap ? 'minmax(0, 1.5fr) minmax(0, 1fr)' : '1fr' },
            gap: 3,
            alignItems: 'start',
          }}
        >
          <Box sx={{ minWidth: 0 }}>
            <MemberCard
              leg={leg}
              featured={false}
              profileNameHeading="h1"
              legislatorRoster={legislatorRoster}
              showDistrictMinimap={false}
            />

            {profileSourceLinks.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Typography
                  component="h2"
                  variant="subtitle2"
                  fontWeight={700}
                  color="text.secondary"
                  sx={{ textTransform: 'uppercase', letterSpacing: 0.4, fontSize: '0.75rem', mb: 1 }}
                >
                  Profiles &amp; links
                </Typography>
                <OfficialSourceLinks layout="stack" links={profileSourceLinks} />
              </Box>
            )}
          </Box>

          {showDistrictMap && (
            <Box sx={{ pointerEvents: 'none' }}>
              <LegislatorDistrictThumbnail leg={leg} size="profile" />
            </Box>
          )}
        </Box>

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
                No sponsored bills found for this session yet. Sponsor data may lag the official record.
              </Typography>
            ) : (
              <MemberSponsoredBills entries={sponsoredBills} legislatorRoster={legislatorRoster} />
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
                            {tally.notVoting > 0 && (
                              <Chip
                                size="small"
                                color="warning"
                                variant={voteFilter === 'nv' ? 'filled' : 'outlined'}
                                label={`Not voting: ${tally.notVoting}`}
                                clickable
                                aria-pressed={voteFilter === 'nv'}
                                onClick={() => toggleVoteFilter('nv')}
                              />
                            )}
                            {tally.absent > 0 && (
                              <Chip
                                size="small"
                                variant={voteFilter === 'absent' ? 'filled' : 'outlined'}
                                label={`Absent: ${tally.absent}`}
                                clickable
                                aria-pressed={voteFilter === 'absent'}
                                onClick={() => toggleVoteFilter('absent')}
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
                  Standing and interim committees from the Legislative Research Commission (LRC) legislative calendar and roster data.
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
