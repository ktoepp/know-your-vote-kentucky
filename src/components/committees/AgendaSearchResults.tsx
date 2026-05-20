'use client';

import React from 'react';
import Link from 'next/link';
import {
  Card,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import type { KYCommitteeAgendaItemWithMeeting } from '@/types/kentucky';
import {
  formatKyMeetingDate,
  normalizeKyGaAgendaLine,
  normalizeKyGaDisplayName,
} from '@/lib/ky-committee-display';
import { BillNumber } from '@/components/bills/BillNumber';

export function AgendaSearchResults({ items }: { items: KYCommitteeAgendaItemWithMeeting[] }) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 3 }}>
      <List disablePadding>
        {items.map((item, i) => {
          const meeting = item.ky_committee_meetings;
          const committee = meeting?.ky_committees;
          return (
            <React.Fragment key={item.id}>
              {i > 0 && <Divider component="li" />}
              <ListItem alignItems="flex-start" sx={{ py: 1.5, px: 2 }}>
                <ListItemText
                  primary={
                    <Typography variant="body1" fontWeight={500}>
                      {normalizeKyGaAgendaLine(item.raw_text)}
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
              </ListItem>
            </React.Fragment>
          );
        })}
      </List>
    </Card>
  );
}
