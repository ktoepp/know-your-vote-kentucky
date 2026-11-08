import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { JsonLd } from '@/components/seo/JsonLd';
import { ChartTooltipLayer } from '@/components/elections/ChartTooltipLayer';
import { DistrictChangeMap } from '@/components/elections/DistrictChangeMap';
import { SeatHemicycle } from '@/components/elections/SeatHemicycle';
import { SeatListDisclosure } from '@/components/elections/SeatListDisclosure';
import { PARTY_COLOR, PARTY_WASH, hatchBackground } from '@/components/elections/election-chart-colors';
import { absoluteUrl, buildBreadcrumbJsonLd, buildGuideArticleJsonLd } from '@/lib/structured-data';
import { buildPageMetadata } from '@/lib/seo';
import { formatCivicDate } from '@/lib/civic-date';
import { formatPartyLetterAbbrev } from '@/lib/bill-display';
import { KY_SESSIONS } from '@/lib/ky-sessions';
import { kyDistrictDisplayName, kyDistrictPath, kyDistrictShortName } from '@/lib/ky-district-pages';
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
const DATE_PUBLISHED = '2026-11-08';

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
  `${CHANGED} Kentucky House and Senate seats changed party in the ${ELECTION_DATE} general election` +
  `${UNOFFICIAL ? ' (unofficial results)' : ''}. See which districts, who won, and each chamber's party balance ` +
  'before and after, on interactive seat charts and district maps.';

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  ogType: 'article',
});

const CHAMBERS = {
  house: { name: 'House', seats: 100, rows: 5, innerRatio: 0.4, subtitle: '100 seats, all on the 2026 ballot' },
  senate: { name: 'Senate', seats: 38, rows: 3, innerRatio: 0.45, subtitle: '38 seats, 19 on the 2026 ballot' },
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
      <ChartTitle title={cfg.name} subtitle={cfg.subtitle} />
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
      <Box sx={{ mt: 2, pt: 1.5, borderTop: 1, borderColor: 'divider' }}>
        <Legend unchanged="ring" changedCount={changed} unchangedCount={cfg.seats - changed} />
      </Box>
    </Box>
  );
}

/** Chart heading: the name carries the weight, the context sits quietly beneath it. */
function ChartTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Box component="figcaption" sx={{ mb: 1.5 }}>
      <Typography component="h3" sx={{ fontSize: 18, fontWeight: 700, lineHeight: 1.3 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

/**
 * `unchanged`: how the chart above draws seats that did not change party. With counts,
 * the legend doubles as the chart's summary: the number leads, the label follows.
 */
function Legend({
  unchanged,
  changedCount,
  unchangedCount,
}: {
  unchanged: 'ring' | 'hatch';
  changedCount?: number;
  unchangedCount?: number;
}) {
  const item = (style: SwatchStyle, count: number | undefined, text: string) => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
      <Box sx={{ display: 'flex', gap: 0.5 }}>
        <Swatch party="Democratic" style={style} />
        <Swatch party="Republican" style={style} />
      </Box>
      <Typography component="span" variant="body2" color="text.secondary">
        {count != null && (
          <Box component="span" sx={{ fontWeight: 700, color: 'text.primary', mr: 0.5 }}>
            {count}
          </Box>
        )}
        {text}
      </Typography>
    </Box>
  );
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 3, rowGap: 1 }}>
      {item('solid', changedCount, changedCount != null ? 'changed party' : 'Changed party in 2026')}
      {item(unchanged, unchangedCount, unchangedCount != null ? 'no change' : 'No change')}
    </Box>
  );
}

/** The changed seats as a schema.org ItemList, each linking to its district page. */
function buildSeatChangesItemList() {
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Kentucky legislative seats that changed party in 2026${UNOFFICIAL ? ' (unofficial)' : ''}`,
    numberOfItems: KY_2026_SEAT_CHANGES.length,
    itemListElement: KY_2026_SEAT_CHANGES.map((c, i) => {
      const ref = { chamber: c.chamber, districtNumber: c.district };
      const [winner] = c.results;
      const abbr = formatPartyLetterAbbrev;
      return {
        '@type': 'ListItem',
        position: i + 1,
        url: absoluteUrl(kyDistrictPath(ref)),
        name:
          `${kyDistrictDisplayName(ref)}: ${winner.name} (${abbr(winner.party)}) ` +
          (c.incumbent.onBallot
            ? `defeated ${c.incumbent.name} (${abbr(c.incumbent.party)})`
            : `won the seat held by ${c.incumbent.name} (${abbr(c.incumbent.party)})`),
      };
    }),
  };
}

function ExternalLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <MuiLink href={href} target="_blank" rel="noopener noreferrer" underline="hover">
      {children}
    </MuiLink>
  );
}

/** Section headings sit above the 18px chart titles (h3) in size and weight. */
const sectionHeading = {
  component: 'h2',
  sx: { fontSize: { xs: 21, sm: 23 }, fontWeight: 700, lineHeight: 1.3, mb: 0.5 },
} as const;

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
          {
            ...buildGuideArticleJsonLd({ headline: TITLE, description: DESCRIPTION, path: PATH, dateModified: DATE_MODIFIED }),
            datePublished: DATE_PUBLISHED,
            about: {
              '@type': 'Event',
              name: '2026 Kentucky general election',
              startDate: KY_2026_ELECTION.electionDate,
              location: { '@type': 'State', name: 'Kentucky' },
            },
            isBasedOn: KY_2026_ELECTION.sourceUrl,
          },
          buildSeatChangesItemList(),
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
            <Typography variant="body2" color="text.secondary">
              Select any seat or district to see who holds it.
            </Typography>
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
          </Box>

          <Box component="section" sx={{ mb: 5 }}>
            <Typography {...sectionHeading}>Where seats changed</Typography>
            <Box sx={{ mt: 1, mb: 2.5 }}>
              <Legend unchanged="hatch" />
            </Box>
            <Box component="figure" sx={{ m: 0, mb: 3 }}>
              <ChartTitle title="House" />
              <DistrictChangeMap
                chamber="house"
                outcomes={house}
                label="Map of Kentucky House districts shaded by party after the 2026 election. Districts that changed party are labeled and link to their district pages."
              />
            </Box>
            <Box component="figure" sx={{ m: 0, mb: 2 }}>
              <ChartTitle title="Senate" subtitle="Odd-numbered seats were not on the 2026 ballot." />
              <DistrictChangeMap
                chamber="senate"
                outcomes={senate}
                label="Map of Kentucky Senate districts shaded by party after the 2026 election. Districts that changed party are labeled and link to their district pages."
              />
            </Box>
            <SeatListDisclosure />
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
