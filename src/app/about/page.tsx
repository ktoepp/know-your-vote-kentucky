import type { Metadata } from 'next';
import Link from 'next/link';
import { Box, Container, Paper, Typography, List, ListItem, ListItemText } from '@mui/material';

export const metadata: Metadata = {
  title: 'About | Know Your Vote Kentucky',
  description:
    'Know Your Vote Kentucky helps residents follow the General Assembly — bills, legislators, committees, and district lookup.',
};

export default function AboutPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
        About Know Your Vote Kentucky
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
        KYVKY is a free civic resource for Kentucky residents. We focus on the{' '}
        <strong>Kentucky General Assembly</strong> — browsing and searching session bills, following
        legislation you care about, exploring legislators and committees, and looking up who represents
        you on an interactive district map.
      </Typography>

      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Data sources
        </Typography>
        <List dense disablePadding>
          <ListItem disableGutters>
            <ListItemText
              primary="Bills, votes, and status"
              secondary="LegiScan API — synced daily during session and interim when bills move."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Legislator roster"
              secondary="Open States — with outbound links to official LRC profiles where available."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Committee meetings and agendas"
              secondary="Kentucky Legislative Research Commission (LRC) legislative calendar — scraped on a regular schedule."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="District boundaries"
              secondary="Public GeoJSON maintained in this project; address lookup via Mapbox geocoding."
            />
          </ListItem>
        </List>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          We link to official sources (LRC, KET, Kentucky Bill Watch) on our{' '}
          <Link href="/legislature/resources">Frankfort resources</Link> page. KYVKY is independent and
          not affiliated with the Commonwealth of Kentucky.
        </Typography>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Email alerts
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Signed-in users can follow bills and choose digest frequency and event types on{' '}
          <Link href="/profile">Profile</Link>. We send factual updates only — no AI-generated summaries in
          digest emails. For the state&apos;s official alert product, see Kentucky Bill Watch on the resources
          page.
        </Typography>
      </Paper>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
        <Link href="/privacy">Privacy policy</Link>
        <Link href="/terms">Terms of use</Link>
        <Link href="/licenses">Open-source licenses</Link>
      </Box>
    </Container>
  );
}
