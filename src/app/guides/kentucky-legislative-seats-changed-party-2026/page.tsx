import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { JsonLd } from '@/components/seo/JsonLd';
import { ChartTooltipLayer } from '@/components/elections/ChartTooltipLayer';
import { DistrictChangeMap } from '@/components/elections/DistrictChangeMap';
import { SeatHemicycle } from '@/components/elections/SeatHemicycle';
import { PARTY_COLOR, PARTY_WASH, hatchBackground } from '@/components/elections/election-chart-colors';
import { buildBreadcrumbJsonLd, buildGuideArticleJsonLd } from '@/lib/structured-data';
import { buildPageMetadata } from '@/lib/seo';
import { formatCivicDate } from '@/lib/civic-date';
import { formatPartyLetterAbbrev } from '@/lib/bill-display';
import { KY_SESSIONS } from '@/lib/ky-sessions';
import { kyDistrictPath, kyDistrictShortName } from '@/lib/ky-district-pages';
import {
  KY_2026_CLOSEST_RACE,
  KY_2026_ELECTION,
  KY_2026_SEAT_CHANGES,
  compositionAfter,
  seatChangesBetween,
  seatOutcomes,
  type KyElectionParty,
  type KySeatChange,
  type KySeatOutcome,
} from '@/lib/ky-2026-election-seat-changes';

const PATH = '/guides/kentucky-legislative-seats-changed-party-2026';
const TITLE = 'Kentucky legislative seats that changed party in 2026';
const DATE_MODIFIED = '2026-11-08';

const UNOFFICIAL = KY_2026_ELECTION.resultsStatus === 'unofficial';
const ELECTION_DATE = formatCivicDate(KY_2026_ELECTION.electionDate) ?? '';
const AS_OF = formatCivicDate(KY_2026_ELECTION.resultsAsOf) ?? '';
const SEATS_ON_BALLOT = KY_2026_ELECTION.seatsOnBallot.house + KY_2026_ELECTION.seatsOnBallot.senate;
const NEXT_SESSION = KY_SESSIONS.find((s) => s.name === '2027 Regular Session');
const CHANGED = KY_2026_SEAT_CHANGES.length;

const PARTY_MEMBER_NOUN: Record<KyElectionParty, string> = {
  Republican: 'Republican',
  Democratic: 'Democrat',
};

/** "Democratic candidates won 9 seats held by Republicans" / "a Republican candidate won 1 held by a Democrat". */
function directionClause(from: KyElectionParty, to: KyElectionParty, changes: KySeatChange[]): string | null {
  const n = changes.length;
  if (n === 0) return null;
  return n === 1
    ? `a ${to} candidate won 1 held by a ${PARTY_MEMBER_NOUN[from]}`
    : `${to} candidates won ${n} seats held by ${PARTY_MEMBER_NOUN[from]}s`;
}

const DIRECTION_SENTENCE = (() => {
  const clauses = [
    directionClause('Republican', 'Democratic', seatChangesBetween('Republican', 'Democratic')),
    directionClause('Democratic', 'Republican', seatChangesBetween('Democratic', 'Republican')),
  ].filter((c): c is string => Boolean(c));
  if (!clauses.length) return '';
  const s = clauses.join('; ');
  return `${s.charAt(0).toUpperCase()}${s.slice(1)}.`;
})();

const DESCRIPTION =
  `${CHANGED} of ${SEATS_ON_BALLOT} Kentucky House and Senate seats on the ballot changed party in the ` +
  `${ELECTION_DATE} general election${UNOFFICIAL ? ' (unofficial results)' : ''}: seat charts, district maps, ` +
  'and each race with its margin.';

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  ogType: 'article',
});

const CHAMBERS = {
  house: { name: 'House', seats: 100, rows: 5, innerRatio: 0.4 },
  senate: { name: 'Senate', seats: 38, rows: 3, innerRatio: 0.45 },
} as const;

type SwatchStyle = 'solid' | 'ring' | 'hatch';

/** Legend/stat swatch matching a chart mark: solid (changed), ring (seat chart), hatch (map). */
function Swatch({ party, style = 'solid' }: { party: KyElectionParty; style?: SwatchStyle }) {
  return (
    <Box
      component="span"
      aria-hidden="true"
      sx={{
        display: 'inline-block',
        width: 12,
        height: 12,
        borderRadius: '50%',
        flexShrink: 0,
        boxSizing: 'border-box',
        background: style === 'solid' ? PARTY_COLOR[party] : style === 'ring' ? PARTY_WASH[party] : hatchBackground(party),
        border: style === 'ring' ? `2px solid ${PARTY_COLOR[party]}` : 'none',
      }}
    />
  );
}

function PartyStat({ chamber, party, align }: { chamber: 'house' | 'senate'; party: KyElectionParty; align: 'left' | 'right' }) {
  const after = compositionAfter(chamber)[party];
  const before = KY_2026_ELECTION.compositionBefore[chamber][party];
  const change = after === before ? 'no change' : `${after > before ? 'up' : 'down'} from ${before}`;
  return (
    <Box sx={{ textAlign: align }}>
      <Typography component="p" sx={{ fontSize: { xs: 28, sm: 32 }, fontWeight: 600, lineHeight: 1.1 }}>
        {after}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, justifyContent: align === 'left' ? 'flex-start' : 'flex-end' }}>
        <Swatch party={party} />
        <Typography component="span" variant="body2" fontWeight={600}>
          {party}
        </Typography>
      </Box>
      <Typography component="p" variant="caption" color="text.secondary">
        {change}
      </Typography>
    </Box>
  );
}

function ChamberPanel({ chamber, outcomes }: { chamber: 'house' | 'senate'; outcomes: KySeatOutcome[] }) {
  const cfg = CHAMBERS[chamber];
  const after = compositionAfter(chamber);
  const changed = outcomes.filter((o) => o.change).length;
  return (
    <Box component="figure" sx={{ m: 0 }}>
      <Typography component="figcaption" variant="body1" fontWeight={700} sx={{ mb: 1 }}>
        {cfg.name}{' '}
        <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
          · {cfg.seats} seats · {changed} changed party
        </Box>
      </Typography>
      <SeatHemicycle
        outcomes={outcomes}
        rows={cfg.rows}
        innerRatio={cfg.innerRatio}
        label={`Kentucky ${cfg.name} after the 2026 election: ${after.Democratic} Democratic and ${after.Republican} Republican seats; ${changed} seats changed party.`}
      />
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <PartyStat chamber={chamber} party="Democratic" align="left" />
        <PartyStat chamber={chamber} party="Republican" align="right" />
      </Box>
    </Box>
  );
}

/** `unchanged`: how the chart above draws seats that did not change party. */
function Legend({ unchanged }: { unchanged: 'ring' | 'hatch' }) {
  const item = (style: SwatchStyle, text: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Swatch party="Democratic" style={style} />
        <Swatch party="Republican" style={style} />
      </Box>
      <Typography component="span" variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Box>
  );
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 1 }}>
      {item('solid', 'Changed party in 2026')}
      {item(unchanged, 'No change')}
    </Box>
  );
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <MuiLink href={href} target="_blank" rel="noopener noreferrer" underline="hover">
      {children}
    </MuiLink>
  );
}

const sectionHeading = { variant: 'h6', component: 'h2', fontWeight: 700, gutterBottom: true } as const;

/** Hover lift + focus ring for chart marks (tooltips come from ChartTooltipLayer). */
const chartInteractionSx = {
  '& [data-tip-title]:hover': { stroke: '#0F172A', strokeWidth: 2, vectorEffect: 'non-scaling-stroke' },
  '& a': { outline: 'none' },
  '& a:focus-visible path': { stroke: '#0F172A', strokeWidth: 3, vectorEffect: 'non-scaling-stroke' },
  '& [data-selected="true"]': { stroke: '#0F172A', strokeWidth: 3, vectorEffect: 'non-scaling-stroke' },
  '& [data-tip-title]': { cursor: 'pointer' },
} as const;

export default function SeatsChangedParty2026Page() {
  const house = seatOutcomes('house');
  const senate = seatOutcomes('senate');
  const closest = KY_2026_CLOSEST_RACE;
  const closestRef = { chamber: closest.chamber, districtNumber: closest.district };
  const closestMargin = closest.results[0].votes - closest.results[1].votes;
  const abbr = formatPartyLetterAbbrev;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, sm: 6 } }}>
      <JsonLd
        data={[
          buildGuideArticleJsonLd({ headline: TITLE, description: DESCRIPTION, path: PATH, dateModified: DATE_MODIFIED }),
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
      <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
        {CHANGED} of the {SEATS_ON_BALLOT} seats on the ballot changed party in the {ELECTION_DATE} general election.{' '}
        {DIRECTION_SENTENCE}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        <Box component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
          {UNOFFICIAL ? 'Unofficial results' : 'Certified results'}
        </Box>{' '}
        as of {AS_OF}
        {UNOFFICIAL ? ', subject to certification' : ''}.
      </Typography>

      <Box sx={chartInteractionSx}>
        <ChartTooltipLayer>
          <Box component="section" sx={{ mb: 5 }}>
            <Typography {...sectionHeading}>Seats in each chamber</Typography>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
                columnGap: 5,
                rowGap: 4,
                mt: 2,
                mb: 2,
              }}
            >
              <ChamberPanel chamber="house" outcomes={house} />
              <ChamberPanel chamber="senate" outcomes={senate} />
            </Box>
            <Legend unchanged="ring" />
          </Box>

          <Box component="section" sx={{ mb: 5 }}>
            <Typography {...sectionHeading}>Where seats changed</Typography>
            <Box component="figure" sx={{ m: 0, mb: 3 }}>
              <Typography component="figcaption" variant="body1" fontWeight={700} sx={{ mb: 1 }}>
                House
              </Typography>
              <DistrictChangeMap
                chamber="house"
                outcomes={house}
                label="Map of Kentucky House districts shaded by party after the 2026 election. Districts that changed party are labeled and link to their district pages."
              />
            </Box>
            <Box component="figure" sx={{ m: 0, mb: 2 }}>
              <Typography component="figcaption" variant="body1" fontWeight={700} sx={{ mb: 1 }}>
                Senate{' '}
                <Box component="span" sx={{ fontWeight: 400, color: 'text.secondary' }}>
                  · odd-numbered seats were not on the 2026 ballot
                </Box>
              </Typography>
              <DistrictChangeMap
                chamber="senate"
                outcomes={senate}
                label="Map of Kentucky Senate districts shaded by party after the 2026 election. Districts that changed party are labeled and link to their district pages."
              />
            </Box>
            <Legend unchanged="hatch" />
          </Box>
        </ChartTooltipLayer>
      </Box>

      <Box component="section" sx={{ mb: 4 }}>
        <Typography {...sectionHeading}>Notes</Typography>
        <Box
          component="ul"
          sx={{ m: 0, pl: 2.5, display: 'grid', rowGap: 0.75, color: 'text.secondary', typography: 'body2' }}
        >
          <li>
            Results are from{' '}
            <ExternalLink href={KY_2026_ELECTION.sourceUrl}>election-night reporting</ExternalLink> by the{' '}
            {KY_2026_ELECTION.sourceName} as of {AS_OF}, with all counties reporting.
            {UNOFFICIAL && (
              <>
                {' '}
                They become official when the State Board certifies them, and a recanvass or recount can change them.
                The State Board posts certified results on its{' '}
                <ExternalLink href={KY_2026_ELECTION.certifiedResultsUrl}>2026 election results page</ExternalLink> and
                deadlines on its <ExternalLink href={KY_2026_ELECTION.electionCalendarUrl}>election calendar</ExternalLink>
                . This page will be updated after certification.
              </>
            )}
          </li>
          <li>
            The closest race statewide,{' '}
            <MuiLink component={NextLink} href={kyDistrictPath(closestRef)} underline="hover">
              {kyDistrictShortName(closestRef)}
            </MuiLink>
            , did not change party: {closest.results[0].name} ({abbr(closest.results[0].party)}) led by{' '}
            {closestMargin.toLocaleString('en-US')} votes.
          </li>
          <li>Each seat&apos;s party before the election is from the Know Your Vote Kentucky member roster on {AS_OF}.</li>
          <li>
            Members elected in 2026 take office in January 2027
            {NEXT_SESSION ? `; the ${NEXT_SESSION.name} convenes on ${formatCivicDate(NEXT_SESSION.start)}` : ''}.
          </li>
        </Box>
      </Box>

      <Box component="nav" aria-label="Related pages" sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2.5, rowGap: 1 }}>
        <MuiLink component={NextLink} href="/members/map" underline="hover" variant="body2">
          Find my legislators →
        </MuiLink>
        <MuiLink component={NextLink} href="/members" underline="hover" variant="body2">
          Members →
        </MuiLink>
        <MuiLink component={NextLink} href="/guides/kentucky-general-assembly-sessions" underline="hover" variant="body2">
          Session dates →
        </MuiLink>
        <MuiLink component={NextLink} href="/guides" underline="hover" variant="body2">
          All guides →
        </MuiLink>
      </Box>
    </Container>
  );
}
