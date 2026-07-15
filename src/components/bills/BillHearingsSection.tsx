'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Box,
  Card,
  CardContent,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { supabase } from '@/app/lib/supabaseClient';
import type { KYCommitteeAgendaItemWithMeeting } from '@/types/kentucky';
import { TYPE } from '@/lib/ui-tokens';
import {
  formatKyMeetingDate,
  LRC_LEGISLATIVE_CALENDAR_URL,
  normalizeKyGaAgendaLine,
  normalizeKyGaDisplayName,
} from '@/lib/ky-committee-display';
import { AgendaLine } from '@/components/committees/AgendaLine';

const AGENDA_SELECT = `
  *,
  ky_committee_meetings (
    id,
    meeting_date,
    time_and_location,
    status,
    source_url,
    ky_committees ( id, name, slug, chamber, profile_url )
  )
`;

export interface BillHearingsSectionProps {
  billId: string;
}

export function BillHearingsSection({ billId }: BillHearingsSectionProps) {
  const theme = useTheme();
  const [items, setItems] = useState<KYCommitteeAgendaItemWithMeeting[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!billId || !supabase) {
      setLoaded(true);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('ky_committee_agenda_items')
        .select(AGENDA_SELECT)
        .eq('ky_bill_id', billId)
        .order('sort_order', { ascending: true });
      if (cancelled) return;
      if (!error && data) {
        const rows = data as KYCommitteeAgendaItemWithMeeting[];
        rows.sort((a, b) => {
          const da = a.ky_committee_meetings?.meeting_date ?? '';
          const db = b.ky_committee_meetings?.meeting_date ?? '';
          return db.localeCompare(da);
        });
        setItems(rows);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [billId]);

  // Hide the whole section until data has loaded, and when there are no
  // hearings to show — matching the empty-when-hidden pattern the sibling
  // bill-detail modules (history, sponsors, roll calls) already follow.
  if (!loaded || items.length === 0) return null;

  return (
    <Card
      sx={{
        mt: 3,
        borderRadius: 3,
        border: `1px solid ${theme.palette.divider}`,
      }}
    >
      <CardContent sx={{ p: { xs: 2, md: 3 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <Typography variant={TYPE.cardTitle.variant} component="h2" fontWeight={TYPE.cardTitle.fontWeight}>
            Hearings &amp; agendas
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Committee calendar lines from the{' '}
          <a href={LRC_LEGISLATIVE_CALENDAR_URL} target="_blank" rel="noopener noreferrer">
            LRC legislative calendar
          </a>{' '}
          that reference this bill.
        </Typography>

        <Stack divider={<Divider flexItem />} spacing={1.5}>
          {items.map((item) => {
            const meeting = item.ky_committee_meetings;
            const committee = meeting?.ky_committees;
            return (
              <Box key={item.id}>
                <Typography variant="body1" sx={{ lineHeight: 1.55 }}>
                  <AgendaLine
                    rawText={normalizeKyGaAgendaLine(item.raw_text)}
                    billNumber={item.bill_number}
                    billId={item.ky_bill_id}
                    isSelfBill
                  />
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ pt: 0.5 }}>
                  {meeting?.meeting_date && (
                    <>
                      {formatKyMeetingDate(meeting.meeting_date)}
                      {meeting.time_and_location ? ` · ${meeting.time_and_location}` : ''}
                    </>
                  )}
                  {committee && (
                    <>
                      {meeting?.meeting_date ? ' · ' : ''}
                      <Link
                        href={`/committees/${encodeURIComponent(committee.slug)}`}
                        style={{ fontWeight: 600 }}
                      >
                        {normalizeKyGaDisplayName(committee.name)}
                      </Link>
                    </>
                  )}
                </Typography>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}
