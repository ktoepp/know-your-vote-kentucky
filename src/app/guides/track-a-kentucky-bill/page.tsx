import type { Metadata } from 'next';
import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildGuideArticleJsonLd } from '@/lib/structured-data';
import { buildPageMetadata } from '@/lib/seo';

const PATH = '/guides/track-a-kentucky-bill';
const TITLE = 'How to track a Kentucky bill';
const DESCRIPTION =
  'Follow a Kentucky General Assembly bill and receive email updates when its status changes: committee action, floor votes, and action by the governor. Free account required.';
const DATE_MODIFIED = '2026-07-18';

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  ogType: 'article',
});

const sectionSx = { mb: 4 } as const;

export default function TrackABillGuidePage() {
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
        Know Your Vote Kentucky sends a digest when bills you follow change status. You will only
        receive email when there is an update to report.
      </Typography>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Find the bill
        </Typography>
        <Typography variant="body1" color="text.secondary">
          <MuiLink component={NextLink} href="/search" underline="hover">
            Search
          </MuiLink>{' '}
          by bill number or keyword. Bill numbers work with or without spaces (HB 23, HB23). Or
          browse the{' '}
          <MuiLink component={NextLink} href="/bills" underline="hover">
            Bills
          </MuiLink>{' '}
          page by chamber, status, session, or{' '}
          <MuiLink component={NextLink} href="/bills/topics" underline="hover">
            topic
          </MuiLink>
          .
        </Typography>
      </Box>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Read the bill page
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Each bill page shows the official title, sponsors, current status, the full action
          history, recorded votes, and links to the bill text. Status lines quote the
          legislature&apos;s official action text where available. The{' '}
          <MuiLink component={NextLink} href="/glossary" underline="hover">
            glossary
          </MuiLink>{' '}
          explains the terms.
        </Typography>
      </Box>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Follow the bill
        </Typography>
        <Box component="ol" sx={{ pl: 3, m: 0, '& li': { mb: 1 } }}>
          <Typography component="li" variant="body1">
            <MuiLink component={NextLink} href="/auth/login" underline="hover">
              Log in
            </MuiLink>{' '}
            or{' '}
            <MuiLink component={NextLink} href="/auth/register" underline="hover">
              sign up
            </MuiLink>
            . Accounts are free.
          </Typography>
          <Typography component="li" variant="body1">
            Select <strong>Follow</strong> on the bill page.
          </Typography>
          <Typography component="li" variant="body1">
            You will receive digest updates when the bill moves: committee action, floor votes,
            sent to governor, signed, or vetoed. Choose daily or weekly delivery and which event
            types to include in your notification preferences.
          </Typography>
        </Box>
      </Box>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Follow topics and committees
        </Typography>
        <Typography variant="body1" color="text.secondary">
          You can also follow{' '}
          <MuiLink component={NextLink} href="/bills/topics" underline="hover">
            topics
          </MuiLink>{' '}
          by subject area. Topic tags are automated and can miss or mislabel some bills, so
          following a specific bill stays the most reliable way to track it. Following a{' '}
          <MuiLink component={NextLink} href="/committees" underline="hover">
            committee
          </MuiLink>{' '}
          adds its meeting and agenda changes to your digest.
        </Typography>
      </Box>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Official alternative
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The Commonwealth&apos;s official tracking service is{' '}
          <MuiLink
            href="https://www.kentucky.gov/services/pages/billwatch.aspx"
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
          >
            Kentucky Bill Watch
          </MuiLink>
          , which requires a Kentucky.gov account.
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
        <MuiLink
          component={NextLink}
          href="/guides/how-a-kentucky-bill-becomes-a-law"
          underline="hover"
          variant="body2"
        >
          How a bill becomes a law in Kentucky →
        </MuiLink>
      </Box>
    </Container>
  );
}
