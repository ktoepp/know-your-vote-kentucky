import type { Metadata } from 'next';
import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildGuideArticleJsonLd } from '@/lib/structured-data';
import { buildPageMetadata } from '@/lib/seo';

const PATH = '/guides/what-your-kentucky-legislators-do';
const TITLE = 'What your Kentucky legislators do';
const DESCRIPTION =
  'What Kentucky state representatives and senators do in the General Assembly, what they can help constituents with, and how state office differs from federal office.';
const DATE_MODIFIED = '2026-09-21';

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  ogType: 'article',
});

const sectionSx = { mb: 4 } as const;

export default function WhatLegislatorsDoGuidePage() {
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
        Every Kentucky address has two state legislators representing it: one member of the
        100-seat Kentucky House of Representatives and one member of the 38-seat Kentucky Senate.
        Together those two chambers form the 138-member Kentucky General Assembly. This guide
        covers what state legislators do in state government, what they can help constituents
        with, and how state office differs from federal office.
      </Typography>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Their core role
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
          A Kentucky state legislator has three main jobs.
        </Typography>
        <Box component="ul" sx={{ pl: 3, m: 0, '& li': { mb: 1 } }}>
          <Typography component="li" variant="body1" color="text.secondary">
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Write and pass state law.
            </Box>{' '}
            Legislators introduce bills, debate them in committee and on the floor, and vote in
            their chamber. Most bills are shaped in committee before they reach a full-chamber
            vote. The{' '}
            <MuiLink
              component={NextLink}
              href="/guides/how-a-kentucky-bill-becomes-a-law"
              underline="hover"
            >
              bill process guide
            </MuiLink>{' '}
            covers each step.
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Approve the state budget.
            </Box>{' '}
            The General Assembly passes a two-year budget in even-year sessions. The budget funds
            K-12 and higher education, Medicaid, state prisons, state roads, and most state
            agencies.
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Serve constituents.
            </Box>{' '}
            Legislators answer questions from residents of their district and help them navigate
            state agencies.
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          House members serve two-year terms, and all 100 seats are up every two years. Senators
          serve four-year terms, with half the chamber elected every two years.
        </Typography>
      </Box>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          What state legislators can help with
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
          Kentucky state legislators handle matters governed by state law and state agencies.
          Common examples:
        </Typography>
        <Box component="ul" sx={{ pl: 3, m: 0, '& li': { mb: 0.5 } }}>
          <Typography component="li" variant="body1" color="text.secondary">
            Kentucky Revenue Cabinet questions and state tax issues
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            Kentucky Transportation Cabinet and Kentucky driver&apos;s licenses
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            Medicaid and other state-run health programs
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            K-12 policy and Kentucky public universities
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            State parks, Kentucky Department of Fish and Wildlife Resources, and state-issued
            permits
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            State-level criminal justice questions, including probation and parole
          </Typography>
        </Box>
      </Box>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          What state legislators cannot help with
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
          Federal matters go to Kentucky&apos;s members of Congress, not to state legislators.
        </Typography>
        <Box component="ul" sx={{ pl: 3, m: 0, '& li': { mb: 0.5 } }}>
          <Typography component="li" variant="body1" color="text.secondary">
            Social Security, Medicare, and federal disability programs
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            Federal taxes and IRS matters
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            U.S. immigration, passports, and visas
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            Veterans Affairs benefits
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            Federal criminal cases
          </Typography>
        </Box>
        <Typography variant="body1" color="text.secondary" sx={{ mt: 2 }}>
          For federal representatives, use the official lookup at{' '}
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
          State office vs. federal office
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 1.5 }}>
          Kentuckians elect two sets of legislators. State legislators serve in Frankfort and
          write Kentucky law. Federal legislators serve in Washington, D.C. and write federal law.
        </Typography>
        <Box component="ul" sx={{ pl: 3, m: 0, '& li': { mb: 0.75 } }}>
          <Typography component="li" variant="body1" color="text.secondary">
            Kentucky sends 6 members to the U.S. House and 2 members to the U.S. Senate. The
            state elects 100 members to the Kentucky House and 38 members to the Kentucky Senate.
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            A Kentucky House term is two years. A Kentucky Senate term is four years. A U.S.
            House term is two years. A U.S. Senate term is six years.
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            The Kentucky General Assembly can override a governor&apos;s veto with a majority of
            the members elected in each chamber. The U.S. Congress needs two-thirds of both
            chambers.
          </Typography>
        </Box>
      </Box>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Committees
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Most day-to-day work happens in{' '}
          <MuiLink component={NextLink} href="/committees" underline="hover">
            committees
          </MuiLink>
          . A committee can hold hearings, amend a bill, report it favorably to the floor, or
          take no action. A bill that never leaves committee never becomes law. Interim
          committees meet between sessions to study issues and hear testimony, but cannot pass
          bills. Meeting schedules are on the{' '}
          <MuiLink component={NextLink} href="/meetings" underline="hover">
            committee meetings
          </MuiLink>{' '}
          page.
        </Typography>
      </Box>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Where to see what your legislators are doing
        </Typography>
        <Box component="ul" sx={{ pl: 3, m: 0, '& li': { mb: 0.75 } }}>
          <Typography component="li" variant="body1" color="text.secondary">
            Each member&apos;s profile page lists committee assignments, sponsored bills, and
            recorded votes. Start from{' '}
            <MuiLink component={NextLink} href="/members/map" underline="hover">
              Find my legislators
            </MuiLink>{' '}
            or the full{' '}
            <MuiLink component={NextLink} href="/members" underline="hover">
              members roster
            </MuiLink>
            .
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            Bills each member sponsors or votes on are on the{' '}
            <MuiLink component={NextLink} href="/bills" underline="hover">
              bills
            </MuiLink>{' '}
            page.
          </Typography>
          <Typography component="li" variant="body1" color="text.secondary">
            The{' '}
            <MuiLink component={NextLink} href="/glossary" underline="hover">
              glossary
            </MuiLink>{' '}
            defines the terms used in status lines and profiles.
          </Typography>
        </Box>
      </Box>

      <Box component="section" sx={sectionSx}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Official source
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The Kentucky Legislative Research Commission (LRC) is the nonpartisan agency that
          staffs the General Assembly. LRC publishes the official record at{' '}
          <MuiLink
            href="https://legislature.ky.gov"
            target="_blank"
            rel="noopener noreferrer"
            underline="hover"
          >
            legislature.ky.gov
          </MuiLink>
          . Member profile information on this site is sourced from Open States and official
          Kentucky sources and may lag updates.
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
          href="/guides/find-your-kentucky-legislator"
          underline="hover"
          variant="body2"
        >
          How to find your Kentucky state legislator →
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
