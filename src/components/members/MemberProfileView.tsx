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
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { ArrowLeft, ExternalLink, FileText, Mail, MapPinned, Phone, Users, Vote } from 'lucide-react';
import type { KYBill, KYLegislator } from '@/types/kentucky';
import { legiscanMemberPersonUrl } from '@/lib/external-legislative-links';
import { groupLegislatorExternalLinks, labelForLinkHost } from '@/lib/legislator-link-normalize';
import { BillNumber } from '@/components/bills/BillNumber';
import { LegislatorDistrictMinimapLazy } from '@/components/members/LegislatorDistrictMinimapLazy';
import { LegislatorAvatar } from '@/components/members/LegislatorAvatar';
import { MemberName } from '@/components/civic/MemberName';
import { CopyableEmail } from '@/components/civic/CopyableEmail';
import { ChamberChip, MetaChip } from '@/components/ui/Chip';
import { billStatusChipLabel, formatKyIsoDateShort, formatKyLegislatorDistrict } from '@/lib/bill-display';
import type { MemberVoteRecord } from '@/lib/member-profile-data';
import type { MemberCommitteeAssignment } from '@/lib/ky-member-committees';
import type { VoteBucket } from '@/lib/legiscan-vote-tally';
import { legislatorRoleDistrictLine } from '@/lib/legislator-display';
import {
  isKentuckyGovernor,
  kyLegislatorAvatarInitials,
  kyLegislatorCampaignWebsite,
  kyLegislatorPortraitAlt,
  kyLegislaturePublicUrl,
  legislatorDisplayPhone,
  normalizeBallotpediaHref,
  normalizeLegislatorPhotoUrl,
} from '@/lib/ky-member-utils';

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

function SectionCard({
  title,
  icon,
  children,
  description,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 1.25 }}>
      <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: description ? 0.5 : 2 }}>
          {icon ? <Box sx={{ color: 'primary.main', lineHeight: 0 }}>{icon}</Box> : null}
          <Typography component="h2" variant="h4" fontWeight={600} color="text.primary">
            {title}
          </Typography>
        </Box>
        {description ? (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {description}
          </Typography>
        ) : null}
        {children}
      </CardContent>
    </Card>
  );
}

function ExternalLinkButton({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Button
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      size="small"
      variant="outlined"
      endIcon={<ExternalLink size={14} aria-hidden />}
      sx={{ justifyContent: 'space-between' }}
    >
      {children}
    </Button>
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
  const hasLegiscan = legiscanMemberPersonUrl(leg.legiscan_id) != null;
  const isChamberMember = leg.chamber === 'house' || leg.chamber === 'senate';
  const showLegislativeSections = isChamberMember || hasLegiscan;
  const tally = voteRecord?.tally;
  const { social: socialLinks, other: otherLinks } = groupLegislatorExternalLinks(leg.external_links);
  const governor = isKentuckyGovernor(leg);
  const displayPhone = legislatorDisplayPhone(leg.phone);
  const telHref = displayPhone ? `tel:${displayPhone.replace(/[^\d+]/g, '')}` : undefined;
  const lrcPublicUrl = kyLegislaturePublicUrl(leg, legislatorRoster);
  const campaignUrl = kyLegislatorCampaignWebsite(leg);
  const ballotpediaHref = normalizeBallotpediaHref(leg.ballotpedia);
  const legiscanUrl = legiscanMemberPersonUrl(leg.legiscan_id);
  const district = formatKyLegislatorDistrict(leg);
  const portraitSrc =
    normalizeLegislatorPhotoUrl(leg.photo_url) ||
    normalizeLegislatorPhotoUrl(leg.legiscan_image_url) ||
    undefined;
  const officialLinks = [
    lrcPublicUrl ? { href: lrcPublicUrl, label: 'KY Legislature' } : null,
    campaignUrl ? { href: campaignUrl, label: 'Website' } : null,
    ballotpediaHref ? { href: ballotpediaHref, label: 'Ballotpedia' } : null,
    legiscanUrl ? { href: legiscanUrl, label: 'LegiScan' } : null,
  ].filter(Boolean) as Array<{ href: string; label: string }>;
  const connectLinks = [
    ...socialLinks.map((link) => ({ href: link.url, label: labelForLinkHost(link.host) })),
    ...otherLinks.map((link) => ({
      href: link.url,
      label: link.note?.trim() || link.host.replace(/^www\./i, ''),
    })),
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 5, md: 7 } }}>
        <Button
          component={Link}
          href="/members"
          startIcon={<ArrowLeft size={16} aria-hidden />}
          sx={{ px: 0, mb: 1.5, minHeight: 32, color: 'text.secondary', fontWeight: 600 }}
        >
          Back to members
        </Button>

        <Card variant="outlined" sx={{ borderRadius: 1.25, mb: 2 }}>
          <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2.5} alignItems={{ xs: 'flex-start', sm: 'center' }}>
              <LegislatorAvatar
                src={portraitSrc}
                alt={kyLegislatorPortraitAlt(leg)}
                initials={kyLegislatorAvatarInitials(leg)}
                party={leg.party}
                imgProps={{ referrerPolicy: 'no-referrer' }}
                sx={{ width: { xs: 84, md: 96 }, height: { xs: 84, md: 96 }, fontSize: '1.4rem' }}
              />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                  {leg.chamber && <ChamberChip chamber={leg.chamber} size="small" />}
                  {leg.party && <MetaChip label={leg.party} size="small" variant="outlined" />}
                  {governor && <MetaChip label="Governor" size="small" tone="success" variant="outlined" />}
                  {leg.active === false && <MetaChip label="Not a current member" size="small" tone="warning" variant="outlined" />}
                </Stack>
                <Typography variant="h2" component="h1" fontWeight={600} color="text.primary" sx={{ mb: 0.5 }}>
                  <MemberName member={leg} variant="primary" />
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {legislatorRoleDistrictLine(leg)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {lrcPublicUrl && <ExternalLinkButton href={lrcPublicUrl}>KY Legislature</ExternalLinkButton>}
                {leg.email && (
                  <Button component="a" href={`mailto:${leg.email}`} variant="contained" size="small" startIcon={<Mail size={15} aria-hidden />}>
                    Email
                  </Button>
                )}
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Stack spacing={2}>
              {showLegislativeSections && (
                <>
                  <SectionCard
                    title="Sponsored bills"
                    icon={<FileText size={19} aria-hidden />}
                    description={
                      <>
                        Bills sponsored by this member in <strong>{sessionName}</strong>.
                      </>
                    }
                  >
                    {sponsoredBills.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">
                        No sponsored bills found for this session yet.
                      </Typography>
                    ) : (
                      <List disablePadding>
                        {sponsoredBills.map((b, i) => {
                          const statusLabel = billStatusChipLabel(b.status);
                          return (
                            <React.Fragment key={b.id}>
                              {i > 0 && <Divider component="li" />}
                              <ListItem alignItems="flex-start" disablePadding sx={{ py: 1.25 }}>
                                <ListItemText
                                  primary={
                                    <Box component="span" sx={{ display: 'inline-flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 0.5 }}>
                                      <BillNumber billNumber={b.bill_number} size="compact" href={`/bills/${b.id}`} />
                                      {b.title ? (
                                        <Typography component="span" color="text.secondary" variant="body2">
                                          {b.title}
                                        </Typography>
                                      ) : null}
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
                    )}
                  </SectionCard>

                  {isChamberMember && (
                    <SectionCard
                      title="Voting record"
                      icon={<Vote size={19} aria-hidden />}
                      description={
                        <>
                          How this member voted on floor and committee roll calls in <strong>{sessionName}</strong>.
                        </>
                      }
                    >
                      {tally && voteRecord ? (
                        voteRecord.totalRollCalls === 0 ? (
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
                              {tally.unknown > 0 && <Chip size="small" variant="outlined" label={`Other: ${tally.unknown}`} />}
                            </Stack>
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
                              Based on {voteRecord.totalRollCalls} roll call{voteRecord.totalRollCalls === 1 ? '' : 's'}.
                            </Typography>

                            {voteRecord.recent.length > 0 && (
                              <List disablePadding>
                                {voteRecord.recent.map((r, j) => (
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
                                                  {r.bill.title}
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
                            )}
                          </>
                        )
                      ) : (
                        <Typography variant="body2" color="text.secondary">
                          Vote data is not available for this member yet.
                        </Typography>
                      )}
                    </SectionCard>
                  )}
                </>
              )}
            </Stack>
          </Grid>

          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              <SectionCard title="Contact" icon={<Mail size={19} aria-hidden />}>
                <Stack spacing={1.5}>
                  {leg.email ? (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                        Email
                      </Typography>
                      <CopyableEmail email={leg.email} display="block" variant="body2" />
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Email is not available from the synced roster.
                    </Typography>
                  )}
                  {displayPhone && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" fontWeight={700} display="block">
                        Phone
                      </Typography>
                      <Typography component="a" href={telHref} variant="body2" color="primary" fontWeight={600} sx={{ textDecoration: 'none' }}>
                        {displayPhone}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </SectionCard>

              {isChamberMember && (
                <SectionCard title="District" icon={<MapPinned size={19} aria-hidden />}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                    {district || 'District information is not available.'}
                  </Typography>
                  <LegislatorDistrictMinimapLazy leg={leg} size="profile" />
                </SectionCard>
              )}

              {isChamberMember && (
                <SectionCard title="Committees" icon={<Users size={19} aria-hidden />}>
                  {committeeAssignments.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No committee assignments on file for this member yet.
                    </Typography>
                  ) : (
                    <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 0.75 }}>
                      {committeeAssignments.map((c) => (
                        <Chip
                          key={c.slug}
                          component={Link}
                          href={`/committees/${c.slug}`}
                          clickable
                          label={c.roleLabel ? `${c.name} (${c.roleLabel})` : c.name}
                          variant="outlined"
                          sx={{ textDecoration: 'none' }}
                        />
                      ))}
                    </Stack>
                  )}
                </SectionCard>
              )}

              {(officialLinks.length > 0 || connectLinks.length > 0) && (
                <SectionCard title="Official links" icon={<ExternalLink size={19} aria-hidden />}>
                  <Stack spacing={1}>
                    {officialLinks.map((link) => (
                      <ExternalLinkButton key={link.href} href={link.href}>
                        {link.label}
                      </ExternalLinkButton>
                    ))}
                    {connectLinks.map((link) => (
                      <ExternalLinkButton key={link.href} href={link.href}>
                        {link.label}
                      </ExternalLinkButton>
                    ))}
                  </Stack>
                </SectionCard>
              )}
            </Stack>
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}
