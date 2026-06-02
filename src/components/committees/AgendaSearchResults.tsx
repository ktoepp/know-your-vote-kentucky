'use client';

import React from 'react';
import Link from 'next/link';
import {
  Box,
  Card,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemText,
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
import { BillNumber } from '@/components/bills/BillNumber';

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
      <List disablePadding>
        {items.map((item, i) => {
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
            <React.Fragment key={item.id}>
              {i > 0 && <Divider component="li" />}
              <ListItem
                alignItems="flex-start"
                sx={{ py: 1.5, px: 2, display: 'flex', gap: 0.5 }}
              >
                <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <ListItemText
                  primary={
                    <Typography variant="body1" fontWeight={500}>
                      {item.ky_bill_id ? (
                        <Link
                          href={`/bills/${item.ky_bill_id}`}
                          style={{ textDecoration: 'underline', textUnderlineOffset: 2 }}
                        >
                          {normalizeKyGaAgendaLine(item.raw_text)}
                        </Link>
                      ) : (
                        normalizeKyGaAgendaLine(item.raw_text)
                      )}
                    </Typography>
                  }
                  secondary={
                    <Typography component="div" variant="body2" color="text.secondary" sx={{ pt: 0.5 }}>
                      {meeting?.meeting_date && (
                        <span>{formatKyMeetingDate(meeting.meeting_date)}</span>
                      )}
                      {committee && (
                        <>
                          {' · '}
                          <Link href={`/committees/${encodeURIComponent(committee.slug)}`}>
                            {normalizeKyGaDisplayName(committee.name)}
                          </Link>
                        </>
                      )}
                      {item.ky_bill_id && item.bill_number && (
                        <>
                          {' · '}
                          <BillNumber billNumber={item.bill_number} size="compact" href={`/bills/${item.ky_bill_id}`} />
                        </>
                      )}
                    </Typography>
                  }
                  secondaryTypographyProps={{ component: 'div' }}
                />
                </Box>
                {followControl}
              </ListItem>
            </React.Fragment>
          );
        })}
      </List>
    </Card>
  );
}
