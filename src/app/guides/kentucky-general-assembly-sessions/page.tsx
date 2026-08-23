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
  return `When the Kentucky General Assembly meets: 60-day even-year sessions, 30-day odd-year sessions, the ${latest ? latest.name : 'current session'} calendar, veto recess, and the interim.`;
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
        <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', rowGap: 2.5 }}>
          {KY_SESSIONS.map((s) => (
            <Box component="li" key={s.name}>
              <Typography variant="body1" fontWeight={600} gutterBottom>
                {s.name}
              </Typography>
              {/* One milestone per line — the inline "·"-joined form wrapped mid-date and
                  was hard to scan. Rendered as a compact label/value grid. */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'minmax(120px, max-content) 1fr' },
                  columnGap: 2,
                  rowGap: 0.5,
                }}
              >
                <Typography variant="body2" color="text.secondary" component="span">
                  Session dates
                </Typography>
                <Typography variant="body2" color="text.primary" component="span">
                  {fmt(s.start)} – {fmt(s.end)}
                </Typography>

                {s.milestones?.vetoRecessStart && s.milestones?.vetoRecessEnd && (
                  <>
                    <Typography variant="body2" color="text.secondary" component="span">
                      Veto recess
                    </Typography>
                    <Typography variant="body2" color="text.primary" component="span">
                      {fmt(s.milestones.vetoRecessStart)} – {fmt(s.milestones.vetoRecessEnd)}
                    </Typography>
                  </>
                )}

                {s.milestones?.sineDie && (
                  <>
                    <Typography variant="body2" color="text.secondary" component="span">
                      Sine die
                    </Typography>
                    <Typography variant="body2" color="text.primary" component="span">
                      {fmt(s.milestones.sineDie)}
                    </Typography>
                  </>
                )}

                {s.milestones?.actsEffectiveDate && (
                  <>
                    <Typography variant="body2" color="text.secondary" component="span">
                      Acts effective
                    </Typography>
                    <Typography variant="body2" color="text.primary" component="span">
                      {fmt(s.milestones.actsEffectiveDate)}
                    </Typography>
                  </>
                )}
              </Box>
              {s.subject && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                  <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                    Called for:
                  </Box>{' '}
                  {s.subject}
                </Typography>
              )}
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
          can vote to override vetoes before adjourning sine die, the formal end of the session.
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
        <MuiLink component={NextLink} href="/meetings" underline="hover" variant="body2">
          Committee meetings →
        </MuiLink>
      </Box>
    </Container>
  );
}
