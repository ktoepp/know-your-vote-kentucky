import type { Metadata } from 'next';
import Link from 'next/link';
import { Box, Container, Paper, Typography, List, ListItem, ListItemText } from '@mui/material';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'About',
  description:
    'Know Your Vote Kentucky helps residents follow the General Assembly: bills, legislators, committees, and district lookup. Who builds it, where the data comes from, and how summaries are written.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <Typography variant="h3" component="h1" fontWeight={700} gutterBottom>
        About Know Your Vote Kentucky
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, lineHeight: 1.7 }}>
        KYvKY is a free civic resource for Kentucky residents. We focus on the{' '}
        <strong>Kentucky General Assembly</strong>: browsing and searching session bills, following
        legislation you care about, exploring legislators and committees, and looking up who represents
        you on an interactive district map.
      </Typography>

      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Why this exists
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
          Kentucky publishes its legislative record. The Legislative Research Commission (LRC) posts
          bills, committee calendars, and agendas, and any resident can read them. Using that record is
          a different matter. It helps to already know the bill number, where the bill sits in the
          process, and how the General Assembly moves something from filing to law. Most people end up
          learning what a session did from whatever got covered.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Know Your Vote Kentucky is the layer in between. The aim is a whole session rather than a
          curated selection: plain language alongside the official text, and a way to follow a bill, a
          topic, or a committee and hear about it when something changes.
        </Typography>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Who builds it
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
          Hi. KYvKY is a one-person project, and I&apos;m the person. I&apos;m Katie Toepp, a designer
          and self-taught developer in Kentucky. I designed and built this myself, from the database
          and the sync jobs to the interface, directing AI tools along the way. It&apos;s been running
          since February 2026, and I keep it running.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
          I believe more than anything that knowledge is power. I wanted to better understand the
          bills I was hearing about in the media. But I kept hitting a wall: either a paywall, or an
          outdated interface that assumed I already understood the legislative process. I wanted
          following my state&apos;s legislation to be as easy as following friends on a feed. So I
          built the thing I was looking for.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
          KYvKY will always be free and non-partisan, and will never sell data. It carries no
          advertising, and the code is open source. Infrastructure costs about $1,000 a year to run, and
          the work behind it has been contributed rather than paid. Right now it&apos;s a passion
          project, and I&apos;m working to fund and grow it.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          If something here looks wrong, write to{' '}
          <Link href="mailto:katie@kyvky.com">katie@kyvky.com</Link>. It comes straight to me, and
          I&apos;d like to know. Thanks for being here.
        </Typography>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          How bill summaries are written
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, mb: 2 }}>
          Bill pages carry a plain-language summary written by a language model working under fixed
          rules: it describes what a bill does, using only the bill&apos;s own fields and any notes an
          editor has verified against the official text. It never characterizes a legislator. Votes,
          sponsorships, and positions pass through exactly as the official record has them.
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Summaries cover every bill from the 2024 session forward. Sessions back to 2010 are indexed
          and searchable, without summaries. Digest emails carry no generated text.
        </Typography>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Data sources
        </Typography>
        <List dense disablePadding>
          <ListItem disableGutters>
            <ListItemText
              primary="Bills, votes, and status"
              secondary="LegiScan, synced daily during session and interim when bills move."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Legislator roster"
              secondary="Open States, with outbound links to official LRC profiles where available."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="Committee meetings and agendas"
              secondary="Kentucky Legislative Research Commission (LRC) legislative calendar, scraped on a regular schedule."
            />
          </ListItem>
          <ListItem disableGutters>
            <ListItemText
              primary="District boundaries"
              secondary="Public boundary data maintained in this project. Address lookup via Mapbox."
            />
          </ListItem>
        </List>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          We link to official sources (LRC, KET, Kentucky Bill Watch) on our{' '}
          <Link href="/legislature/resources">Frankfort resources</Link> page. KYvKY is independent and
          not affiliated with the Commonwealth of Kentucky.
        </Typography>
      </Paper>

      <Paper elevation={0} sx={{ p: 3, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Email alerts
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>
          Signed-in users can follow bills and choose digest frequency and event types on{' '}
          <Link href="/profile">Profile</Link>. We send factual updates only. No AI-generated summaries in
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
