'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Chip,
  Collapse,
  Container,
  Divider,
  Link as MuiLink,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import {
  ArrowBack,
  CalendarMonth,
  ExpandLess,
  ExpandMore,
  Groups,
} from '@mui/icons-material';
import { CalendarToday, LocationOn } from '@mui/icons-material';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { EmptyState } from '@/components/civic/EmptyState';
import { OfficialSourceLinks } from '@/components/civic/OfficialSourceLinks';
import { CommitteeTagRow, useCommitteeKindInfo } from '@/components/committees/CommitteeTagRow';
import { MetaChip } from '@/components/ui/Chip';
import type { KYCommittee, KYCommitteeAgendaItem, KYCommitteeMeeting } from '@/types/kentucky';
import { FOCUS_RING, ICON_REM, SECTION_TITLE_DISPLAY_SX, TYPE, iconRemSx } from '@/lib/ui-tokens';
import {
  formatAgendaItemKind,
  formatKyMeetingDate,
  LRC_LEGISLATIVE_CALENDAR_URL,
  normalizeKyGaAgendaLine,
  normalizeKyGaDisplayName,
  resolveKyCommitteeParent,
} from '@/lib/ky-committee-display';
import { CommitteeMembersSection } from '@/components/committees/CommitteeMembersSection';
import { CommitteeMaterialsSection } from '@/components/committees/CommitteeMaterialsSection';
import { FollowCommitteeButton } from '@/components/committees/FollowCommitteeButton';
import type { CommitteeMemberDisplay } from '@/lib/ky-committee-members';
import type { KYCommitteeMaterial } from '@/lib/ky-committee-data';
import { classifyTopics } from '@/lib/ky-topic-classifier';

export interface CommitteeDetailViewProps {
  committee: KYCommittee;
  meetings: KYCommitteeMeeting[];
  agendaByMeetingId: Record<string, KYCommitteeAgendaItem[]>;
  members: CommitteeMemberDisplay[];
  /** Documents posted on LRC for past meetings (agendas, minutes, etc.). */
  materials?: KYCommitteeMaterial[];
  /** Full committee roster for subcommittee → parent links. */
  committeeRoster?: Pick<KYCommittee, 'slug' | 'name'>[];
}

function MeetingAgendaBlock({ items, expanded }: { items: KYCommitteeAgendaItem[]; expanded: boolean }) {
  if (!items.length) return null;
  return (
    <Box sx={{ mt: 1.5 }}>
      <Collapse in={expanded}>
        <Card variant="outlined" sx={{ borderRadius: 2, mt: 0.5 }}>
          <List dense disablePadding>
            {items.map((item, i) => (
              <React.Fragment key={item.id}>
                {i > 0 && <Divider component="li" />}
                <ListItem alignItems="flex-start" sx={{ py: 1.25 }}>
                  <ListItemText
                    primary={
                      item.ky_bill_id ? (
                        <Link
                          href={`/bills/${item.ky_bill_id}`}
                          style={{ textDecoration: 'underline', textUnderlineOffset: 2, fontWeight: 600 }}
                        >
                          {normalizeKyGaAgendaLine(item.raw_text)}
                        </Link>
                      ) : (
                        normalizeKyGaAgendaLine(item.raw_text)
                      )
                    }
                    secondary={
                      [formatAgendaItemKind(item.item_kind), item.bill_session_label]
                        .filter(Boolean)
                        .join(' · ') || undefined
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Card>
      </Collapse>
    </Box>
  );
}

export function CommitteeDetailView({
  committee,
  meetings,
  agendaByMeetingId,
  members,
  materials = [],
  committeeRoster = [],
}: CommitteeDetailViewProps) {
  const theme = useTheme();
  const displayName = normalizeKyGaDisplayName(committee.name);
  const kindInfo = useCommitteeKindInfo(committee);
  const [expandedAgenda, setExpandedAgenda] = React.useState<Record<string, boolean>>({});
  const topicTags = useMemo(() => classifyTopics(committee.name, '').slice(0, 4), [committee.name]);

  const parentRef = useMemo(
    () =>
      resolveKyCommitteeParent(
        committee.name,
        kindInfo.kind,
        kindInfo.shortLabel,
        committeeRoster,
      ),
    [committee.name, committeeRoster, kindInfo.kind, kindInfo.shortLabel],
  );

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return meetings
      .filter((m) => m.status !== 'cancelled' && m.meeting_date >= today)
      .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))[0];
  }, [meetings]);

  const toggleAgenda = (meetingId: string) => {
    setExpandedAgenda((prev) => ({ ...prev, [meetingId]: !prev[meetingId] }));
  };

  const officialLinks = [
    ...(committee.profile_url
      ? [{ href: committee.profile_url, label: 'Legislative Research Commission (LRC) committee profile' }]
      : []),
    { href: LRC_LEGISLATIVE_CALENDAR_URL, label: 'Legislative calendar' },
    ...(committee.profile_url
      ? [{ href: committee.profile_url, label: 'Meeting materials' }]
      : []),
  ];

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          component={Link}
          href="/committees"
          startIcon={<ArrowBack sx={{ fontSize: ICON_REM.nav }} aria-hidden />}
          sx={{ mb: 2, textTransform: 'none', fontWeight: 600 }}
        >
          All committees
        </Button>

        <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 2 }}>
          <Link href="/committees" style={{ textDecoration: 'none', color: 'inherit' }}>
            Committees
          </Link>
          <Typography color="text.primary" fontWeight={600}>
            {displayName}
          </Typography>
        </Breadcrumbs>

        {/* Overview + quick facts */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1.6fr) minmax(0, 1fr)' },
            gap: 3,
            alignItems: 'start',
            mb: 4,
          }}
        >
          <Card sx={{ borderRadius: 3, border: `1px solid ${theme.palette.divider}`, height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, md: 3 } }}>
              <CommitteeTagRow committee={committee}>
                {topicTags.map((tag) => (
                  <MetaChip key={tag} label={tag} size="small" variant="outlined" />
                ))}
              </CommitteeTagRow>

              <Typography variant="h4" component="h1" fontWeight={700} sx={{ mt: 2 }} gutterBottom>
                {displayName}
              </Typography>

              {parentRef && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {parentRef.href ? (
                    <>
                      Part of{' '}
                      <MuiLink component={Link} href={parentRef.href} fontWeight={600} underline="hover">
                        {parentRef.label}
                      </MuiLink>
                    </>
                  ) : (
                    <>Part of {parentRef.label}</>
                  )}
                </Typography>
              )}

              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, mt: 1 }}>
                Jurisdiction and staff rosters are maintained on the{' '}
                {committee.profile_url ? (
                  <MuiLink href={committee.profile_url} target="_blank" rel="noopener noreferrer">
                    official LRC committee profile
                  </MuiLink>
                ) : (
                  'Kentucky Legislature website'
                )}
                . Know Your Vote Kentucky adds parsed meeting agendas from the legislative calendar below.
              </Typography>
            </CardContent>
          </Card>

          {/* Quick facts */}
          <Card variant="outlined" sx={{ borderRadius: 3, height: '100%' }}>
            <CardContent sx={{ p: { xs: 2, md: 2.5 } }}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                <FollowCommitteeButton committeeId={committee.id} size="small" />
              </Box>

              <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.4 }}>
                Next meeting
              </Typography>
              {upcoming ? (
                <Box sx={{ mt: 0.5 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <CalendarMonth sx={{ ...iconRemSx('inline'), color: 'primary.main' }} aria-hidden />
                    <Typography variant="body1" fontWeight={700} component="span">
                      {formatKyMeetingDate(upcoming.meeting_date)}
                    </Typography>
                  </Box>
                  {upcoming.time_and_location && (
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                      {upcoming.time_and_location}
                    </Typography>
                  )}
                  <MuiLink href="#committee-meetings" underline="hover" sx={{ display: 'inline-block', mt: 0.75, fontWeight: 600 }}>
                    View agenda →
                  </MuiLink>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  No upcoming meetings listed on the calendar.
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Stack spacing={1}>
                <MuiLink href="#committee-members" underline="hover" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {members.length} {members.length === 1 ? 'member' : 'members'}
                </MuiLink>
                <MuiLink href="#committee-meetings" underline="hover" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {meetings.length} meeting{meetings.length === 1 ? '' : 's'} on record
                </MuiLink>
                {materials.length > 0 && (
                  <MuiLink href="#committee-materials" underline="hover" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    {materials.length} meeting material{materials.length === 1 ? '' : 's'}
                  </MuiLink>
                )}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <OfficialSourceLinks layout="stack" links={officialLinks} />
            </CardContent>
          </Card>
        </Box>

        {/* Members */}
        <Box
          id="committee-members"
          sx={{ scrollMarginTop: '80px', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}
        >
          <Groups sx={{ color: 'primary.main', fontSize: ICON_REM.section }} aria-hidden />
          <Typography
            component="h2"
            variant={TYPE.sectionTitle.variant}
            fontWeight={TYPE.sectionTitle.fontWeight}
            color="text.primary"
            sx={SECTION_TITLE_DISPLAY_SX}
          >
            Members
          </Typography>
          {members.length > 0 && (
            <Chip label={members.length} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Synced from the LRC committee roster and legislative calendar. Select a member for their full profile.
        </Typography>
        <Box sx={{ mb: 4 }}>
          <CommitteeMembersSection members={members} committeeProfileUrl={committee.profile_url} />
        </Box>

        {/* Meetings & agendas */}
        <Box
          id="committee-meetings"
          sx={{ scrollMarginTop: '80px', mb: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}
        >
          <CalendarMonth sx={{ color: 'primary.main', fontSize: ICON_REM.section }} aria-hidden />
          <Typography
            component="h2"
            variant={TYPE.sectionTitle.variant}
            fontWeight={TYPE.sectionTitle.fontWeight}
            color="text.primary"
            sx={SECTION_TITLE_DISPLAY_SX}
          >
            Meetings &amp; agendas
          </Typography>
          {meetings.length > 0 && (
            <Chip label={meetings.length} size="small" variant="outlined" sx={{ fontWeight: 600 }} />
          )}
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Parsed from the LRC legislative calendar. Select a meeting to expand its agenda. Agendas can change the day before a meeting.
        </Typography>

        {meetings.length === 0 ? (
          <EmptyState message="No meetings synced for this committee yet." />
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4 }}>
            {meetings.map((meeting) => {
              const items = agendaByMeetingId[meeting.id] ?? [];
              const agendaExpanded = Boolean(expandedAgenda[meeting.id]);
              const hasAgenda = items.length > 0;
              return (
                <Card key={meeting.id} variant="outlined" sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <Box sx={{ p: 2.5 }}>
                    <Box
                      component={hasAgenda ? 'button' : 'div'}
                      type={hasAgenda ? 'button' : undefined}
                      onClick={hasAgenda ? () => toggleAgenda(meeting.id) : undefined}
                      aria-expanded={hasAgenda ? agendaExpanded : undefined}
                      sx={{
                        display: 'block',
                        width: '100%',
                        p: 0,
                        m: 0,
                        border: 0,
                        bgcolor: 'transparent',
                        textAlign: 'left',
                        cursor: hasAgenda ? 'pointer' : 'default',
                        color: 'inherit',
                        font: 'inherit',
                        borderRadius: 1,
                        '&:hover': hasAgenda ? { opacity: 0.92 } : undefined,
                        '&:focus-visible': hasAgenda ? FOCUS_RING : undefined,
                      }}
                    >
                      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                        {meeting.status === 'cancelled' && (
                          <MetaChip label="Cancelled" tone="error" size="small" variant="filled" />
                        )}
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 0.75 }}>
                        <CalendarToday sx={{ ...iconRemSx('inline'), color: 'text.secondary', mt: 0.2 }} aria-hidden />
                        <Typography variant="body1" fontWeight={600} component="span">
                          {formatKyMeetingDate(meeting.meeting_date)}
                        </Typography>
                      </Box>
                      {meeting.time_and_location && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 0.5 }}>
                          <LocationOn sx={{ ...iconRemSx('inline'), color: 'text.secondary', mt: 0.2 }} aria-hidden />
                          <Typography variant="body2" color="text.secondary" component="span">
                            {meeting.time_and_location}
                          </Typography>
                        </Box>
                      )}
                      {hasAgenda && (
                        <Typography
                          variant="body2"
                          color="primary.main"
                          fontWeight={600}
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}
                        >
                          {agendaExpanded ? 'Hide agenda' : 'Show agenda'}
                          {agendaExpanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                          <Box component="span" sx={{ color: 'text.secondary', fontWeight: 500 }}>
                            ({items.length} item{items.length === 1 ? '' : 's'})
                          </Box>
                        </Typography>
                      )}
                    </Box>
                    <MeetingAgendaBlock items={items} expanded={agendaExpanded} />
                  </Box>
                </Card>
              );
            })}
          </Box>
        )}

        {/* Meeting Materials — LRC CommitteeDocuments scrape (Wave 3) */}
        <Box
          id="committee-materials"
          sx={{ scrollMarginTop: '80px', mt: 4 }}
        >
          <CommitteeMaterialsSection
            materials={materials}
            committeeProfileUrl={committee.profile_url}
          />
        </Box>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 4 }}>
          <Link href="/meetings">Browse all committee meetings</Link>
          {' · '}
          <Link href="/legislature/resources">Frankfort resources</Link>
        </Typography>

        <DataFreshnessNote variant="page" source="lrc-calendar" />
      </Container>
    </Box>
  );
}
