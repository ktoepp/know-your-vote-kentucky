import type { Metadata } from 'next';
import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildCollectionPageJsonLd } from '@/lib/structured-data';
import { buildPageMetadata } from '@/lib/seo';

const DESCRIPTION =
  'Short factual guides to the Kentucky General Assembly — finding your state legislators, tracking a bill, how a bill becomes a law, and when the legislature meets.';

export const metadata: Metadata = buildPageMetadata({
  title: 'Guides to the Kentucky legislature',
  description: DESCRIPTION,
  path: '/guides',
});

const GUIDES = [
  {
    href: '/guides/find-your-kentucky-legislator',
    title: 'How to find your Kentucky state legislator',
    blurb:
      'Look up your state representative and senator by address, or browse all 138 districts.',
  },
  {
    href: '/guides/track-a-kentucky-bill',
    title: 'How to track a Kentucky bill',
    blurb:
      'Follow a bill and receive email updates when its status changes. Free account required.',
  },
  {
    href: '/guides/how-a-kentucky-bill-becomes-a-law',
    title: 'How a bill becomes a law in Kentucky',
    blurb:
      "Introduction, committee, three readings, floor votes, the second chamber, and the governor's desk.",
  },
  {
    href: '/guides/kentucky-general-assembly-sessions',
    title: 'Kentucky General Assembly session dates and schedule',
    blurb:
      '60-day even-year sessions, 30-day odd-year sessions, the veto recess, and the interim.',
  },
] as const;

export default function GuidesIndexPage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <JsonLd
        data={[
          buildCollectionPageJsonLd({
            name: 'Guides to the Kentucky legislature',
            description: DESCRIPTION,
            path: '/guides',
          }),
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Guides', path: '/guides' },
          ]),
        ]}
      />
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        Guides
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Short factual guides to how the Kentucky General Assembly works and how to use this site.
      </Typography>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', rowGap: 2.5 }}>
        {GUIDES.map((g) => (
          <Box component="li" key={g.href}>
            <Typography variant="body1" fontWeight={600}>
              <MuiLink component={NextLink} href={g.href} underline="hover">
                {g.title}
              </MuiLink>
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {g.blurb}
            </Typography>
          </Box>
        ))}
      </Box>
    </Container>
  );
}
