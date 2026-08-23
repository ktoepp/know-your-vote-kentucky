import Link from 'next/link';
import {
  Box,
  Button,
  Container,
  Divider,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { OpenInNew } from '@mui/icons-material';
import DataFreshnessNote from '@/components/civic/DataFreshnessNote';
import {
  LRC_COMMITTEES_INDEX_URL,
  LRC_LEGISLATIVE_CALENDAR_URL,
} from '@/lib/ky-committee-display';
import { buildPageMetadata } from '@/lib/seo';

const EXTERNAL_RESOURCES = [
  {
    title: 'LRC Legislative Calendar',
    description: 'Official weekly schedule: committee times, rooms, and agenda text.',
    href: LRC_LEGISLATIVE_CALENDAR_URL,
  },
  {
    title: 'LRC Committees',
    description: 'Committee profiles, membership, and meeting materials on legislature.ky.gov.',
    href: LRC_COMMITTEES_INDEX_URL,
  },
  {
    title: 'Kentucky Educational Television (KET)',
    description: 'Gavel-to-gavel coverage and legislative programming.',
    href: 'https://www.ket.org/legislature/',
  },
  {
    title: 'Kentucky Bill Watch',
    description:
      'Official state bill tracking and email alerts (Kentucky.gov account). KYvKY adds an open calendar UI plus optional digest alerts when you turn on hearing alerts in your notification preferences.',
    href: 'https://www.kentucky.gov/services/pages/billwatch.aspx',
  },
  {
    title: 'KRC 2026 General Assembly hub',
    description: 'Civic resource index from the Kentucky Resources Council.',
    href: 'https://kyrc.org/2026-kentucky-general-assembly/',
  },
  {
    title: 'LRC Bill Status',
    description: 'Search bills and view official status on the Legislative Research Commission site.',
    href: 'https://apps.legislature.ky.gov/law/activities.aspx',
  },
] as const;

export const metadata = buildPageMetadata({
  title: 'Frankfort resources',
  description:
    'Neutral index of official Kentucky General Assembly sources: LRC calendar, committees, KET, and Bill Watch.',
  path: '/legislature/resources',
});

export default function LegislatureResourcesPage() {
  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Typography variant="h4" component="h1" fontWeight={700} gutterBottom sx={{ textAlign: 'center' }}>
          Frankfort resources
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          Official sources from the Kentucky General Assembly and the Legislative Research Commission (LRC).
        </Typography>

        <List disablePadding sx={{ mt: 3 }}>
          {EXTERNAL_RESOURCES.map((r, index) => (
            <Box key={r.href}>
              {index > 0 && <Divider component="li" />}
              <ListItem
                alignItems="flex-start"
                sx={{
                  py: 2,
                  px: 0,
                  flexDirection: { xs: 'column', sm: 'row' },
                  gap: { xs: 1, sm: 2 },
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" fontWeight={700} component="span">
                      {r.title}
                    </Typography>
                  }
                  secondary={r.description}
                  sx={{ m: 0, flex: 1 }}
                />
                <Button
                  href={r.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  variant="outlined"
                  size="small"
                  endIcon={<OpenInNew sx={{ fontSize: '0.85rem' }} aria-hidden />}
                  sx={{ textTransform: 'none', flexShrink: 0 }}
                >
                  Visit site
                </Button>
              </ListItem>
            </Box>
          ))}
        </List>

        <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
          Browse committees and meetings in KYvKY:{' '}
          <Link href="/committees">Committees</Link>
          {' · '}
          <Link href="/meetings">Meetings</Link>
        </Typography>

        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 4, textAlign: 'center' }}>
          Capitol information line: (502) 564-8100 · LRC toll-free: (800) 372-7181
        </Typography>

        <DataFreshnessNote variant="page" />
      </Container>
    </Box>
  );
}
