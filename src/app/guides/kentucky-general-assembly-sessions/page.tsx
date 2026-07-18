import type { Metadata } from 'next';
import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { JsonLd } from '@/components/seo/JsonLd';
import { buildBreadcrumbJsonLd, buildGuideArticleJsonLd } from '@/lib/structured-data';
import {
  KY_SESSIONS,
  SESSION_TYPE_DESCRIPTIONS,
  getInterimPeriod,
  getSessionPhase,
} from '@/lib/ky-sessions';
import { formatCivicDate } from '@/lib/civic-date';
import { buildPageMetadata } from '@/lib/seo';

const PATH = '/guides/kentucky-general-assembly-sessions';
const TITLE = 'Kentucky General Assembly session dates and schedule';
const DATE_MODIFIED = '2026-07-18';

// Session dates, phase, and the interim window render live from KY_SESSIONS so
// this page never goes stale when a new session is added.
export const revalidate = 3600;

function guideDescription(): string {
  const latest = KY_SESSIONS[0];
  return `When the Kentucky General Assembly meets — 60-day even-year sessions, 30-day odd-year sessions, the ${latest ? latest.name : 'current session'} calendar, veto recess, and the interim.`;
}

export function generateMetadata(): Metadata {
  return buildPageMetadata({
    title: TITLE,
    description: guideDescription(),
    path: PATH,
    ogType: 'article',
  });
}

function fmt(iso: string | null | undefined): string {
  return (iso && formatCivicDate(iso)) || '';
}

export default function SessionsGuidePage() {
  const phase = getSessionPhase();
  const interim = getInterimPeriod();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <JsonLd
        data={[
          buildGuideArticleJsonLd({
            headline: TITLE,
            description: guideDescription(),
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
        {SESSION_TYPE_DESCRIPTIONS.regular}
      </Typography>

      <Box component="section" sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Recent and scheduled sessions
        </Typography>
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', rowGap: 2 }}>
          {KY_SESSIONS.map((s) => (
            <Box component="li" key={s.name}>
              <Typography variant="body1" fontWeight={600}>
                {s.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {fmt(s.start)} – {fmt(s.end)}
                {s.milestones?.vetoRecessStart && s.milestones?.vetoRecessEnd && (
                  <>
                    {' '}
                    · Veto recess {fmt(s.milestones.vetoRecessStart)} –{' '}
                    {fmt(s.milestones.vetoRecessEnd)}
                  </>
                )}
                {s.milestones?.sineDie && <> · Sine die {fmt(s.milestones.sineDie)}</>}
                {s.milestones?.actsEffectiveDate && (
                  <> · Acts effective {fmt(s.milestones.actsEffectiveDate)}</>
                )}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      <Box component="section" sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          The veto recess
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Near the end of a session, the chambers recess for about ten days while the governor
          considers passed bills. The General Assembly then reconvenes for its final days, when it
          can vote to override vetoes before adjourning sine die — the formal end of the session.
        </Typography>
      </Box>

      <Box component="section" sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          The interim
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Between sessions, the General Assembly is in the interim. Interim joint committees meet
          to study issues and hear testimony, but no bills can be passed.
          {phase === 'interim' && interim && (
            <>
              {' '}
              The General Assembly is currently in the {interim.name}
              {interim.end
                ? `, which runs until the next regular session convenes on ${fmt(
                    interim.nextSession?.start,
                  )}.`
                : '.'}
            </>
          )}{' '}
          Committee meetings during the interim are listed on the{' '}
          <MuiLink component={NextLink} href="/meetings" underline="hover">
            Committee meetings
          </MuiLink>{' '}
          page.
        </Typography>
      </Box>

      <Box component="section" sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Special sessions
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {SESSION_TYPE_DESCRIPTIONS.special}
        </Typography>
      </Box>

      <Box component="nav" aria-label="Related pages">
        <Typography variant="body2">
          <MuiLink component={NextLink} href="/guides" underline="hover">
            All guides →
          </MuiLink>
          {' · '}
          <MuiLink component={NextLink} href="/bills" underline="hover">
            Bills →
          </MuiLink>
          {' · '}
          <MuiLink component={NextLink} href="/meetings" underline="hover">
            Committee meetings →
          </MuiLink>
        </Typography>
      </Box>
    </Container>
  );
}
