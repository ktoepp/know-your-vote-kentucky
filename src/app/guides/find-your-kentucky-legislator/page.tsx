import type { Metadata } from 'next';
import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildGuideArticleJsonLd } from '@/lib/structured-data';
import { buildPageMetadata } from '@/lib/seo';

const PATH = '/guides/find-your-kentucky-legislator';
const TITLE = 'How to find your Kentucky state legislator';
const DESCRIPTION =
  'Look up your Kentucky state representative and senator by address, see your House and Senate districts, and find official contact information.';
const DATE_MODIFIED = '2026-07-18';

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  ogType: 'article',
});

const sectionSx = { mb: 4 } as const;

export default function FindYourLegislatorGuidePage() {
  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <JsonLd
        data={[
          buildGuideArticleJsonLd({
            headline: TITLE,
            description: DESCRIPTION,
            path: PATH,
            dateModified: DATE_MODIFIED,
          }),
          buildBreadcrumbJsonLd([
            { name: 'Home', path: '/' },
            { name: 'Guides', path: '/guides' },
            { name: TITLE, path: PATH },
          ]),
        ]}
      />
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        {TITLE}
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={sectionSx}>
        Every Kentucky address is represented by two state legislators: one representative in the
        100-member Kentucky House of Representatives and one senator in the 38-member Kentucky
        Senate. Together the two chambers form the Kentucky General Assembly.
      </Typography>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Look up your legislators by address
        </Typography>
        <Box component="ol" sx={{ pl: 3, m: 0, '& li': { mb: 1 } }}>
          <Typography component="li" variant="body1">
            Open{' '}
            <MuiLink component={NextLink} href="/members/map" underline="hover">
              Find my legislators
            </MuiLink>
            .
          </Typography>
          <Typography component="li" variant="body1">
            Enter your street address or ZIP code. A street address is more precise — district
            lines can split a ZIP code.
          </Typography>
          <Typography component="li" variant="body1">
            The map shows your House and Senate districts and the members who currently represent
            them. Select a member to see contact information, committee assignments, and sponsored
            bills.
          </Typography>
        </Box>
      </Box>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Browse instead of searching
        </Typography>
        <Typography variant="body1" color="text.secondary">
          All 138 districts are listed on the{' '}
          <MuiLink component={NextLink} href="/districts" underline="hover">
            Districts
          </MuiLink>{' '}
          page, each with its current member, a district map, and recent bills. The full roster —
          House, Senate, and statewide officials — is on the{' '}
          <MuiLink component={NextLink} href="/members" underline="hover">
            Members
          </MuiLink>{' '}
          page.
        </Typography>
      </Box>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          State legislators vs. members of Congress
        </Typography>
        <Typography variant="body1" color="text.secondary">
          This site covers the Kentucky General Assembly, which meets in Frankfort and writes state
          law. If you are looking for your federal representatives — Kentucky&apos;s members of the
          U.S. House and its two U.S. senators — use the official lookup at{' '}
          <MuiLink
            href="https://www.congress.gov/members/find-your-member"
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
          >
            congress.gov
          </MuiLink>
          .
        </Typography>
      </Box>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Official source
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The Kentucky Legislative Research Commission (LRC) operates the state&apos;s official
          lookup at{' '}
          <MuiLink
            href="https://apps.legislature.ky.gov/findyourlegislator/findyourlegislator.html"
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
          >
            legislature.ky.gov
          </MuiLink>
          . Roster data on this site is sourced from Open States and official Kentucky sources and
          may lag updates.
        </Typography>
      </Box>

      <Box
        component="nav"
        aria-label="Related pages"
        sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2.5, rowGap: 1 }}
      >
        <MuiLink component={NextLink} href="/guides" underline="hover" variant="body2">
          All guides →
        </MuiLink>
        <MuiLink component={NextLink} href="/guides/track-a-kentucky-bill" underline="hover" variant="body2">
          How to track a Kentucky bill →
        </MuiLink>
      </Box>
    </Container>
  );
}
