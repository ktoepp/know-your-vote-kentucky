import type { Metadata } from 'next';
import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildGuideArticleJsonLd } from '@/lib/structured-data';
import { getCivicDataSessionName, getKySessionActsEffectiveDate } from '@/lib/ky-sessions';
import { formatCivicDate } from '@/lib/civic-date';
import { buildPageMetadata } from '@/lib/seo';

const PATH = '/guides/how-a-kentucky-bill-becomes-a-law';
const TITLE = 'How a bill becomes a law in Kentucky';
const DESCRIPTION =
  "The steps a bill takes through the Kentucky General Assembly: introduction, committee, three readings, floor votes, the second chamber, and the governor's signature or veto.";
const DATE_MODIFIED = '2026-07-18';

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  ogType: 'article',
});

// The acts-effective-date line tracks the current session's published date.
export const revalidate = 3600;

const STEPS: { title: string; body: string }[] = [
  {
    title: '1. Introduction',
    body: 'A House or Senate member files the bill in their own chamber. Bills that raise revenue must start in the House of Representatives. Each bill receives a number: HB for House bills, SB for Senate bills.',
  },
  {
    title: '2. Committee',
    body: 'The bill is referred to a committee, which can hold hearings, amend the bill, report it favorably to the floor, or take no action. Most bills that fail simply never leave committee.',
  },
  {
    title: '3. Readings and floor vote',
    body: 'The Kentucky Constitution requires three readings in each chamber on separate days before final passage. After the readings the full chamber debates, may amend, and votes. Most bills need at least two-fifths of the members elected and a majority of those voting. Appropriation and revenue bills need a majority of all members elected.',
  },
  {
    title: '4. The second chamber',
    body: 'A bill that passes one chamber repeats the process in the other: committee, readings, and a floor vote. If the second chamber changes the bill, the first chamber must concur, or the two chambers negotiate a shared version in a conference committee.',
  },
  {
    title: '5. The governor',
    body: 'The governor has ten days, not counting Sundays, to sign the bill, veto it, or let it become law without a signature. On appropriation bills the governor can veto individual line items.',
  },
  {
    title: '6. Veto override',
    body: 'The General Assembly can override a veto with a majority of the members elected in each chamber, meaning 51 votes in the House and 20 in the Senate. This is a simple majority, unlike the two-thirds required in the U.S. Congress.',
  },
];

export default function BillBecomesLawGuidePage() {
  const session = getCivicDataSessionName();
  const effectiveIso = getKySessionActsEffectiveDate(session);
  const effectiveDate = effectiveIso ? formatCivicDate(effectiveIso) : null;

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
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        The Kentucky General Assembly, made up of the 100-member House of Representatives and the
        38-member Senate, writes state law. The rules and procedures differ from the U.S. Congress. The{' '}
        <MuiLink component={NextLink} href="/glossary" underline="hover">
          glossary
        </MuiLink>{' '}
        defines the terms used below.
      </Typography>

      {STEPS.map((step) => (
        <Box component="section" key={step.title} sx={{ mb: 3 }}>
          <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
            {step.title}
          </Typography>
          <Typography variant="body1" color="text.secondary">
            {step.body}
          </Typography>
        </Box>
      ))}

      <Box component="section" sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          7. When laws take effect
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Under Section 55 of the Kentucky Constitution, most new laws take effect 90 days after
          the General Assembly adjourns. A bill with an emergency clause takes effect as soon as it
          becomes law, and a bill can also name its own effective date.
          {effectiveDate && (
            <> Acts of the {session} take effect on {effectiveDate}, as published by the Attorney
            General.</>
          )}
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
        <MuiLink component={NextLink} href="/bills" underline="hover" variant="body2">
          Bills →
        </MuiLink>
        <MuiLink component={NextLink} href="/guides/track-a-kentucky-bill" underline="hover" variant="body2">
          How to track a Kentucky bill →
        </MuiLink>
      </Box>
    </Container>
  );
}
