'use client';

import React from 'react';
import Link from 'next/link';
import {
  Box,
  Card,
  Divider,
  IconButton,
  Stack,
  Typography,
} from '@mui/material';
import { Bookmark as BookmarkFilled } from '@mui/icons-material';
import { Bookmark } from 'lucide-react';
import type { KYCommitteeAgendaItemWithMeeting } from '@/types/kentucky';
import {
  formatKyMeetingDate,
  normalizeKyGaAgendaLine,
  normalizeKyGaDisplayName,
} from '@/lib/ky-committee-display';
import { AgendaLine } from '@/components/committees/AgendaLine';

export interface AgendaSearchResultsProps {
  items: KYCommitteeAgendaItemWithMeeting[];
  /** When set with onToggleFollow, render an inline follow toggle per result. */
  followedCommitteeIds?: ReadonlySet<string>;
  onToggleFollow?: (committeeId: string) => void;
}

export function AgendaSearchResults({
  items,
  followedCommitteeIds,
  onToggleFollow,
}: AgendaSearchResultsProps) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <Stack divider={<Divider />}>
        {items.map((item) => {
          const meeting = item.ky_committee_meetings;
          const committee = meeting?.ky_committees;
          const committeeId = committee?.id ? String(committee.id) : '';
          const following = committeeId
            ? followedCommitteeIds?.has(committeeId) ?? false
            : false;
          const followControl = onToggleFollow && committeeId ? (
            <IconButton
              size="small"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFollow(committeeId);
              }}
              aria-pressed={following}
              aria-label={following ? 'Unfollow this committee' : 'Follow this committee'}
              sx={{
                color: following ? 'primary.main' : 'text.secondary',
                p: 0.5,
                flexShrink: 0,
                ml: 1,
              }}
            >
              {following ? (
                <BookmarkFilled sx={{ fontSize: '1.2rem' }} />
              ) : (
                <Bookmark size={20} strokeWidth={1.7} />
              )}
            </IconButton>
          ) : null;
          return (
            <Box
              key={item.id}
              sx={{ py: 1.5, px: 2, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}
            >
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="body1" sx={{ lineHeight: 1.55 }}>
                  <AgendaLine
                    rawText={normalizeKyGaAgendaLine(item.raw_text)}
                    billNumber={item.bill_number}
                    billId={item.ky_bill_id}
                  />
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ pt: 0.5 }}>
                  {meeting?.meeting_date && (
                    <span>{formatKyMeetingDate(meeting.meeting_date)}</span>
                  )}
                  {committee && (
                    <>
                      {meeting?.meeting_date ? ' · ' : ''}
                      <Link href={`/committees/${encodeURIComponent(committee.slug)}`}>
                        {normalizeKyGaDisplayName(committee.name)}
                      </Link>
                    </>
                  )}
                </Typography>
              </Box>
              {followControl}
            </Box>
          );
        })}
      </Stack>
    </Card>
  );
}
