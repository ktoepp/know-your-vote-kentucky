import { notFound } from 'next/navigation';
import { Box, Container, Paper, Typography } from '@mui/material';
import {
  ProfileDigestHistorySection,
  type DigestHistoryEntry,
} from '@/components/profile/ProfileDigestHistorySection';

export const dynamic = 'force-dynamic';

const NOW = Date.now();
const DAY = 24 * 60 * 60 * 1000;

const FIXTURES: Record<string, DigestHistoryEntry[]> = {
  full: [
    {
      id: 1001,
      sent_at: new Date(NOW - 1 * DAY).toISOString(),
      digest_window_start: new Date(NOW - 2 * DAY).toISOString(),
      digest_window_end: new Date(NOW - 1 * DAY).toISOString(),
      delivery_status: 'sent',
      bills: [
        {
          id: '11111111-1111-1111-1111-111111111111',
          bill_number: 'HB 1',
          title: 'AN ACT relating to public education funding and SEEK formula adjustments.',
          event_type: 'passed_chamber',
          event_label: 'Passed chamber',
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          bill_number: 'SB 42',
          title: 'AN ACT relating to elections.',
          event_type: 'committee_action',
          event_label: 'Committee action (referred / reported / amended)',
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          bill_number: 'HB 7',
          title:
            'AN ACT relating to criminal justice reforms with a particularly long descriptive title for layout testing purposes.',
          event_type: 'signed_or_vetoed',
          event_label: 'Signed into law / Vetoed',
        },
      ],
    },
    {
      id: 1002,
      sent_at: new Date(NOW - 3 * DAY).toISOString(),
      digest_window_start: new Date(NOW - 4 * DAY).toISOString(),
      digest_window_end: new Date(NOW - 3 * DAY).toISOString(),
      delivery_status: 'sent',
      bills: [
        {
          id: '44444444-4444-4444-4444-444444444444',
          bill_number: 'HB 12',
          title: 'AN ACT relating to housing.',
          event_type: 'introduced',
          event_label: 'Introduced',
        },
        {
          id: '55555555-5555-5555-5555-555555555555',
          bill_number: 'SB 88',
          title: 'AN ACT relating to transportation infrastructure.',
          event_type: 'floor_vote',
          event_label: 'Floor vote recorded',
        },
      ],
    },
    {
      id: 1003,
      sent_at: new Date(NOW - 7 * DAY).toISOString(),
      digest_window_start: new Date(NOW - 8 * DAY).toISOString(),
      digest_window_end: new Date(NOW - 7 * DAY).toISOString(),
      delivery_status: 'sent',
      bills: Array.from({ length: 14 }, (_, i) => ({
        id: `66666666-6666-6666-6666-${String(i).padStart(12, '6')}`,
        bill_number: `HB ${100 + i}`,
        title: `AN ACT relating to topic ${i + 1}.`,
        event_type: 'committee_action',
        event_label: 'Committee action (referred / reported / amended)',
      })),
    },
  ],
  empty: [],
};

type Props = { searchParams: Promise<{ state?: string }> };

export default async function DevDigestHistoryPreview({ searchParams }: Props) {
  if (process.env.NODE_ENV === 'production') notFound();

  const { state = 'full' } = await searchParams;
  const entries = FIXTURES[state] ?? FIXTURES.full;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper elevation={1} sx={{ p: { xs: 2.5, sm: 3 }, borderRadius: 2 }}>
        <ProfileDigestHistorySection mockEntries={entries} />
      </Paper>

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          Current state: <strong>{state}</strong> · {entries.length} entries
        </Typography>
      </Box>
    </Container>
  );
}
