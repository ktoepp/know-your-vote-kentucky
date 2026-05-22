'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Collapse,
  Container,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
  Stack,
  Typography,
} from '@mui/material';
import {
  OpenInNew,
} from '@mui/icons-material';
import { ArrowLeft, Bookmark, CalendarDays, ChevronDown, ChevronUp, FileText, MapPin } from 'lucide-react';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import { EmptyState } from '@/components/civic/EmptyState';
import { ChamberChip, MetaChip } from '@/components/ui/Chip';
import type { KYCommittee, KYCommitteeAgendaItem, KYCommitteeMeeting } from '@/types/kentucky';
import {
  formatAgendaItemKind,
  formatKyMeetingDate,
  LRC_LEGISLATIVE_CALENDAR_URL,
  normalizeKyGaAgendaLine,
  normalizeKyGaDisplayName,
} from '@/lib/ky-committee-display';
import { CommitteeMembersSection } from '@/components/committees/CommitteeMembersSection';
import type { CommitteeMemberDisplay } from '@/lib/ky-committee-members';
import { classifyTopics } from '@/lib/ky-topic-classifier';

export interface CommitteeDetailViewProps {
  committee: KYCommittee;
  meetings: KYCommitteeMeeting[];
  agendaByMeetingId: Record<string, KYCommitteeAgendaItem[]>;
  members: CommitteeMemberDisplay[];
}

function MeetingAgendaBlock({ items, expanded }: { items: KYCommitteeAgendaItem[]; expanded: boolean }) {
  if (!items.length) return null;
  return (
    <Box sx={{ mt: 1.5 }}>
      <Collapse in={expanded}>
        <Card variant="outlined" sx={{ borderRadius: 1.25, mt: 0.5, bgcolor: 'background.default' }}>
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
}: CommitteeDetailViewProps) {
  const displayName = normalizeKyGaDisplayName(committee.name);
  const [expandedAgenda, setExpandedAgenda] = useState<Record<string, boolean>>({});
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const topicTags = useMemo(() => classifyTopics(committee.name, '').slice(0, 4), [committee.name]);

  const upcoming = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return meetings
      .filter((m) => m.status !== 'cancelled' && m.meeting_date >= today)
      .sort((a, b) => a.meeting_date.localeCompare(b.meeting_date))[0];
  }, [meetings]);

  const sortedMeetings = useMemo(() => {
    return [...meetings].sort((a, b) =>
      sortOrder === 'newest'
        ? b.meeting_date.localeCompare(a.meeting_date)
        : a.meeting_date.localeCompare(b.meeting_date),
    );
  }, [meetings, sortOrder]);

  const toggleAgenda = (meetingId: string) => {
    setExpandedAgenda((prev) => ({ ...prev, [meetingId]: !prev[meetingId] }));
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 5, md: 7 } }}>
        <Breadcrumbs aria-label="Breadcrumb" sx={{ mb: 1.5 }}>
          <Link href="/committees" style={{ textDecoration: 'none', color: 'inherit' }}>
            Committees
          </Link>
          <Typography color="text.primary" fontWeight={600}>
            {displayName}
          </Typography>
        </Breadcrumbs>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
          <Button
            component={Link}
            href="/committees"
            startIcon={<ArrowLeft size={16} aria-hidden />}
            sx={{ px: 0, minHeight: 32, color: 'text.secondary', fontWeight: 600 }}
          >
            Back to committees
          </Button>
          {committee.chamber !== 'unknown' && <ChamberChip chamber={committee.chamber} size="small" />}
          {topicTags.slice(0, 1).map((tag) => (
            <MetaChip key={tag} label={tag} size="small" variant="outlined" />
          ))}
          <Button
            variant="outlined"
            size="small"
            startIcon={<Bookmark size={15} aria-hidden />}
            sx={{ ml: { sm: 'auto' }, minHeight: 32, borderRadius: 999, px: 1.5 }}
          >
            Follow
          </Button>
        </Stack>

        <Card variant="outlined" sx={{ borderRadius: 1.25, mb: 2 }}>
          <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
            <Typography variant="h2" component="h1" fontWeight={600} sx={{ mb: 1, color: 'text.primary' }}>
              {displayName}
            </Typography>
            <Typography variant="body1" color="text.primary" sx={{ mb: 2.25, maxWidth: 980 }}>
              Jurisdiction and staff rosters are maintained by the Kentucky Legislative Research Commission.
              Know Your Vote Kentucky adds parsed meeting agendas from the legislative calendar.
            </Typography>

            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 2 }}>
              {topicTags.map((tag) => (
                <MetaChip key={tag} label={tag} size="small" variant="outlined" />
              ))}
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={7}>
                <Stack spacing={0.75}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    Next meeting
                  </Typography>
                  {upcoming ? (
                    <Typography variant="body2" color="text.primary">
                      {formatKyMeetingDate(upcoming.meeting_date)}
                      {upcoming.time_and_location ? ` · ${upcoming.time_and_location}` : ''}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No upcoming meetings listed on the calendar.
                    </Typography>
                  )}
                </Stack>
              </Grid>
              <Grid item xs={12} md={5}>
                <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap" useFlexGap>
                  {committee.profile_url && (
                    <Button
                      href={committee.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      variant="contained"
                      size="small"
                      endIcon={<OpenInNew sx={{ fontSize: '0.85rem' }} aria-hidden />}
                    >
                      LRC profile
                    </Button>
                  )}
                  <Button
                    href={LRC_LEGISLATIVE_CALENDAR_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    size="small"
                    endIcon={<OpenInNew sx={{ fontSize: '0.85rem' }} aria-hidden />}
                  >
                    Calendar
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        <Grid container spacing={2}>
          <Grid item xs={12} md={8}>
            <Card variant="outlined" sx={{ borderRadius: 1.25 }}>
              <CardContent sx={{ p: { xs: 2.25, md: 3 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
                  <Box>
                    <Typography component="h2" variant="h4" fontWeight={600} color="text.primary">
                      Meetings
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {meetings.length} calendar meeting{meetings.length === 1 ? '' : 's'} synced
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, overflow: 'hidden' }}>
                    {(['newest', 'oldest'] as const).map((order) => (
                      <Button
                        key={order}
                        size="small"
                        variant={sortOrder === order ? 'contained' : 'text'}
                        onClick={() => setSortOrder(order)}
                        sx={{ borderRadius: 0, minHeight: 34, px: 1.5 }}
                      >
                        {order === 'newest' ? 'Newest first' : 'Oldest first'}
                      </Button>
                    ))}
                  </Stack>
                </Box>

                {meetings.length === 0 ? (
                  <EmptyState message="No meetings synced for this committee yet." />
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    {sortedMeetings.map((meeting, index) => {
                      const items = agendaByMeetingId[meeting.id] ?? [];
                      const agendaExpanded = Boolean(expandedAgenda[meeting.id]);
                      const hasAgenda = items.length > 0;
                      return (
                        <Box key={meeting.id}>
                          {index > 0 && <Divider />}
                          <Box sx={{ py: 1.6 }}>
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
                                '&:hover': hasAgenda ? { opacity: 0.88 } : undefined,
                              }}
                            >
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, alignItems: 'flex-start' }}>
                                <Box sx={{ minWidth: 0 }}>
                                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                    {formatKyMeetingDate(meeting.meeting_date)}
                                    {meeting.status === 'cancelled' ? ' · Cancelled' : ''}
                                  </Typography>
                                  {meeting.time_and_location && (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ mt: 0.25, display: 'flex', alignItems: 'flex-start', gap: 0.75 }}
                                    >
                                      <MapPin size={14} aria-hidden />
                                      <Box component="span">{meeting.time_and_location}</Box>
                                    </Typography>
                                  )}
                                  {hasAgenda && (
                                    <Typography variant="body2" color="text.primary" fontWeight={600} sx={{ mt: 0.75 }}>
                                      {items.length} agenda item{items.length === 1 ? '' : 's'}
                                    </Typography>
                                  )}
                                </Box>
                                {hasAgenda && (
                                  <Box sx={{ color: 'text.secondary', lineHeight: 0, mt: 0.25 }}>
                                    {agendaExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                                  </Box>
                                )}
                              </Box>
                            </Box>
                            <MeetingAgendaBlock items={items} expanded={agendaExpanded} />
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <CommitteeMembersSection members={members} committeeProfileUrl={committee.profile_url} />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap sx={{ mt: 3 }}>
          <Button component={Link} href="/meetings" variant="outlined" size="small" startIcon={<CalendarDays size={16} aria-hidden />}>
            Browse all meetings
          </Button>
          <Button component={Link} href="/legislature/resources" variant="outlined" size="small" startIcon={<FileText size={16} aria-hidden />}>
            Frankfort resources
          </Button>
        </Stack>

        <DataFreshnessNote variant="page" source="lrc-calendar" />
      </Container>
    </Box>
  );
}
