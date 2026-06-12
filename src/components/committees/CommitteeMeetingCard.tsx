'use client';

import React from 'react';
import { Box, IconButton, Typography } from '@mui/material';
import { Bookmark as BookmarkFilled, CalendarToday, Schedule } from '@mui/icons-material';
import { Bookmark } from 'lucide-react';
import { CommitteeTagRow } from '@/components/committees/CommitteeTagRow';
import { OfficialSourceLinks } from '@/components/civic/OfficialSourceLinks';
import { CivicCard } from '@/components/ui/CivicCard';
import { MetaChip } from '@/components/ui/Chip';
import type { KYCommitteeMeetingBrowse, KYCommitteeMeetingWithCommittee } from '@/types/kentucky';
import { iconRemSx } from '@/lib/ui-tokens';
import {
  formatKyMeetingDate,
  LRC_LEGISLATIVE_CALENDAR_URL,
  normalizeKyGaAgendaLine,
  normalizeKyGaDisplayName,
} from '@/lib/ky-committee-display';

export interface CommitteeMeetingCardProps {
  meeting: KYCommitteeMeetingWithCommittee | KYCommitteeMeetingBrowse;
  /** When set, committee name is omitted (committee detail page). */
  hideCommitteeName?: boolean;
  agendaPreview?: string[];
  /** Follow state for the parent committee (drives bookmark icon). */
  following?: boolean;
  /** When set, render an inline follow toggle for the parent committee. */
  onToggleFollow?: (committeeId: string) => void;
}

export function CommitteeMeetingCard({
  meeting,
  hideCommitteeName = false,
  agendaPreview,
  following = false,
  onToggleFollow,
}: CommitteeMeetingCardProps) {
  const committee = meeting.ky_committees;
  const committeeName = committee ? normalizeKyGaDisplayName(committee.name) : '';
  const committeeHref = committee?.slug ? `/committees/${encodeURIComponent(committee.slug)}` : undefined;
  const followControl = onToggleFollow && committee?.id ? (
    <IconButton
      size="small"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleFollow(committee.id);
      }}
      aria-pressed={following}
      aria-label={following ? 'Unfollow this committee' : 'Follow this committee'}
      sx={{
        color: following ? 'primary.main' : 'text.secondary',
        p: 0.25,
        flexShrink: 0,
        ml: 'auto',
        minWidth: { xs: 44, sm: 32 },
        minHeight: { xs: 44, sm: 32 },
      }}
    >
      {following ? (
        <BookmarkFilled sx={{ fontSize: '1.25rem' }} />
      ) : (
        <Bookmark size={20} strokeWidth={1.7} />
      )}
    </IconButton>
  ) : null;

  return (
    <CivicCard
      variant="meeting"
      href={committeeHref}
      ariaLabel={
        committee
          ? `${committeeName} meeting on ${formatKyMeetingDate(meeting.meeting_date)}`
          : `Committee meeting on ${formatKyMeetingDate(meeting.meeting_date)}`
      }
      header={
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
          {committee ? <CommitteeTagRow committee={committee} /> : null}
          {meeting.status === 'cancelled' && (
            <MetaChip label="Cancelled" tone="error" size="small" variant="filled" />
          )}
          {followControl}
        </Box>
      }
      body={
        <>
          {!hideCommitteeName && committee && (
            <Typography variant="h6" component="p" fontWeight={700} gutterBottom sx={{ fontSize: '1.05rem' }}>
              {committeeName}
            </Typography>
          )}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75, mb: 0.75 }}>
            <CalendarToday sx={{ ...iconRemSx('inline'), color: 'text.secondary', mt: 0.15 }} aria-hidden />
            <Typography variant="body2" color="text.secondary">
              {formatKyMeetingDate(meeting.meeting_date)}
            </Typography>
          </Box>
          {meeting.time_and_location && (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.75 }}>
              <Schedule sx={{ ...iconRemSx('inline'), color: 'text.secondary', mt: 0.15 }} aria-hidden />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {meeting.time_and_location}
              </Typography>
            </Box>
          )}
          {agendaPreview && agendaPreview.length > 0 && (
            <Box sx={{ mt: 1.5 }}>
              <Typography
                variant="caption"
                display="block"
                color="text.secondary"
                sx={{
                  mb: 0.5,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                }}
              >
                Agenda preview
              </Typography>
              {agendaPreview.slice(0, 2).map((line) => {
                const text = normalizeKyGaAgendaLine(line);
                return (
                  <Typography key={line} variant="body2" color="text.secondary" sx={{ mb: 0.35 }}>
                    {text.length > 100 ? `${text.slice(0, 97)}…` : text}
                  </Typography>
                );
              })}
              {agendaPreview.length > 2 && (
                <Typography variant="caption" color="text.secondary">
                  +{agendaPreview.length - 2} more
                </Typography>
              )}
            </Box>
          )}
        </>
      }
      footer={
        committeeHref ? (
          <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ fontSize: '0.95rem' }}>
            View committee
          </Typography>
        ) : (
          <OfficialSourceLinks
            links={[
              {
                href: meeting.source_url || LRC_LEGISLATIVE_CALENDAR_URL,
                label: 'LRC calendar',
              },
            ]}
          />
        )
      }
    />
  );
}
