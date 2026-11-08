import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import NextLink from 'next/link';
import { Box, Container, Link as MuiLink, Typography } from '@mui/material';
import { JsonLd } from '@/components/seo/JsonLd';
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
  type KyChamberComposition,
  type KyElectionCandidateResult,
  type KyElectionParty,
  type KySeatChange,
} from '@/lib/ky-2026-election-seat-changes';

const PATH = '/guides/kentucky-legislative-seats-changed-party-2026';
const TITLE = 'Kentucky legislative seats that changed party in 2026';
const DATE_MODIFIED = '2026-11-08';

const UNOFFICIAL = KY_2026_ELECTION.resultsStatus === 'unofficial';
const ELECTION_DATE = formatCivicDate(KY_2026_ELECTION.electionDate) ?? '';
const AS_OF = formatCivicDate(KY_2026_ELECTION.resultsAsOf) ?? '';
const SEATS_ON_BALLOT = KY_2026_ELECTION.seatsOnBallot.house + KY_2026_ELECTION.seatsOnBallot.senate;
const NEXT_SESSION = KY_SESSIONS.find((s) => s.name === '2027 Regular Session');

const R_TO_D = seatChangesBetween('Republican', 'Democratic');
const D_TO_R = seatChangesBetween('Democratic', 'Republican');

const PARTY_MEMBER_NOUN: Record<KyElectionParty, string> = {
  Republican: 'Republican',
  Democratic: 'Democrat',
};

/**
 * "Democratic candidates won 9 seats (7 House, 2 Senate) held by Republicans" /
 * "a Republican candidate won 1 House seat held by a Democrat". Null when there are none.
 */
function directionClause(
  from: KyElectionParty,
  to: KyElectionParty,
  changes: KySeatChange[],
): string | null {
  const n = changes.length;
  if (n === 0) return null;
  const house = changes.filter((c) => c.chamber === 'house').length;
  const senate = n - house;
  const seats = n === 1 ? 'seat' : 'seats';
  const where =
    house && senate
      ? `${n} ${seats} (${house} House, ${senate} Senate)`
      : `${n} ${house ? 'House' : 'Senate'} ${seats}`;
  return n === 1
    ? `a ${to} candidate won ${where} held by a ${PARTY_MEMBER_NOUN[from]}`
    : `${to} candidates won ${where} held by ${PARTY_MEMBER_NOUN[from]}s`;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const DIRECTION_SENTENCE = (() => {
  const clauses = [
    directionClause('Republican', 'Democratic', R_TO_D),
    directionClause('Democratic', 'Republican', D_TO_R),
  ].filter((c): c is string => Boolean(c));
  return clauses.length ? `${capitalize(clauses.join(', and '))}.` : '';
})();

const DESCRIPTION =
  `${KY_2026_SEAT_CHANGES.length} Kentucky House and Senate seats changed party in the ` +
  `${ELECTION_DATE} general election${UNOFFICIAL ? ', based on unofficial results' : ''}: ` +
  'each district, its incumbent, and the vote totals.';

export const metadata: Metadata = buildPageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  ogType: 'article',
});

function formatVotes(n: number): string {
  return n.toLocaleString('en-US');
}

function compositionText(c: KyChamberComposition): string {
  return `${c.Republican} Republican, ${c.Democratic} Democratic`;
}

function candidateText(r: KyElectionCandidateResult): string {
  return `${r.name} (${formatPartyLetterAbbrev(r.party)}), ${formatVotes(r.votes)} votes`;
}

/** Label/value rows — same compact grid the sessions guide uses for milestones. */
function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <Typography variant="body2" color="text.secondary" component="dt" sx={{ m: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2" color="text.primary" component="dd" sx={{ m: 0 }}>
        {children}
      </Typography>
    </>
  );
}

function SeatChangeItem({ change }: { change: KySeatChange }) {
  const ref = { chamber: change.chamber, districtNumber: change.district };
  const [winner, ...others] = change.results;
  const { incumbent } = change;
  return (
    <Box component="li">
      <Typography variant="body1" component="h3" fontWeight={600}>
        <MuiLink component={NextLink} href={kyDistrictPath(ref)} underline="hover">
          {kyDistrictShortName(ref)}
        </MuiLink>
      </Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        {incumbent.party} to {winner.party}
      </Typography>
      <Box
        component="dl"
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'minmax(140px, max-content) 1fr' },
          columnGap: 2,
          rowGap: 0.5,
          m: 0,
        }}
      >
        <DetailRow label="Incumbent">
          <MuiLink component={NextLink} href={`/members/${incumbent.profileSlug}`} underline="hover">
            {incumbent.name}
          </MuiLink>{' '}
          ({formatPartyLetterAbbrev(incumbent.party)})
          {incumbent.onBallot ? '' : ', not on the 2026 ballot'}
        </DetailRow>
        <DetailRow label="Winner">{candidateText(winner)}</DetailRow>
        {others.length > 0 && (
          <DetailRow label="Also on the ballot">
            {others.map((r) => (
              <Box component="span" key={r.name} sx={{ display: 'block' }}>
                {candidateText(r)}
              </Box>
            ))}
          </DetailRow>
        )}
      </Box>
    </Box>
  );
}

function ChamberSection({ chamber }: { chamber: 'house' | 'senate' }) {
  const changes = KY_2026_SEAT_CHANGES.filter((c) => c.chamber === chamber).sort(
    (a, b) => a.district - b.district,
  );
  if (changes.length === 0) return null;
  return (
    <Box component="section" sx={{ mb: 4 }}>
      <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
        {chamber === 'house' ? 'House' : 'Senate'}
      </Typography>
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0, display: 'grid', rowGap: 3 }}>
        {changes.map((c) => (
          <SeatChangeItem key={`${c.chamber}-${c.district}`} change={c} />
        ))}
      </Box>
    </Box>
  );
}

const cellSx = {
  py: 1,
  pr: 2,
  textAlign: 'left' as const,
  verticalAlign: 'top' as const,
  borderBottom: 1,
  borderColor: 'divider',
};

export default function SeatsChangedParty2026Page() {
  const closest = KY_2026_CLOSEST_RACE;
  const closestRef = { chamber: closest.chamber, districtNumber: closest.district };
  const closestMargin = closest.results[0].votes - closest.results[1].votes;

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
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        In the {ELECTION_DATE} general election, {KY_2026_SEAT_CHANGES.length} of the{' '}
        {SEATS_ON_BALLOT} Kentucky General Assembly seats on the ballot changed party
        {UNOFFICIAL ? ', based on unofficial results' : ''}. {DIRECTION_SENTENCE}
      </Typography>

      <Box
        role="note"
        sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 2, py: 1.5, mb: 4 }}
      >
        <Typography variant="body2" color="text.primary">
          <Box component="span" sx={{ fontWeight: 600 }}>
            {UNOFFICIAL ? 'Unofficial results.' : 'Certified results.'}
          </Box>{' '}
          Vote totals are from the {KY_2026_ELECTION.sourceName} as of {AS_OF}.
          {UNOFFICIAL &&
            ' Results become official when the State Board certifies them, and a recanvass or recount can change them. This page will be updated after certification.'}
        </Typography>
      </Box>

      <Box component="section" sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Seats held by each party
        </Typography>
        <Box sx={{ overflowX: 'auto', mb: 2 }}>
          <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%' }}>
            {UNOFFICIAL && (
              <Typography
                component="caption"
                variant="body2"
                color="text.secondary"
                sx={{ textAlign: 'left', captionSide: 'bottom', pt: 1 }}
              >
                After-election counts are based on unofficial results.
              </Typography>
            )}
            <thead>
              <tr>
                <Typography component="th" scope="col" variant="body2" fontWeight={600} sx={cellSx}>
                  Chamber
                </Typography>
                <Typography component="th" scope="col" variant="body2" fontWeight={600} sx={cellSx}>
                  Before the election
                </Typography>
                <Typography component="th" scope="col" variant="body2" fontWeight={600} sx={cellSx}>
                  After the election
                </Typography>
              </tr>
            </thead>
            <tbody>
              {(['house', 'senate'] as const).map((chamber) => (
                <tr key={chamber}>
                  <Typography component="th" scope="row" variant="body2" fontWeight={600} sx={cellSx}>
                    {chamber === 'house' ? 'House (100 seats)' : 'Senate (38 seats)'}
                  </Typography>
                  <Typography component="td" variant="body2" sx={cellSx}>
                    {compositionText(KY_2026_ELECTION.compositionBefore[chamber])}
                  </Typography>
                  <Typography component="td" variant="body2" sx={cellSx}>
                    {compositionText(compositionAfter(chamber))}
                  </Typography>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary">
          All {KY_2026_ELECTION.seatsOnBallot.house} House seats and the{' '}
          {KY_2026_ELECTION.seatsOnBallot.senate} even-numbered Senate districts were on the 2026
          ballot. Senators serve four-year terms, so the odd-numbered Senate districts are next on
          the ballot in 2028. Members elected in 2026 take office in January 2027
          {NEXT_SESSION
            ? `, and the ${NEXT_SESSION.name} convenes on ${formatCivicDate(NEXT_SESSION.start)}`
            : ''}
          .
        </Typography>
      </Box>

      <ChamberSection chamber="house" />
      <ChamberSection chamber="senate" />

      <Box component="section" sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Closest race
        </Typography>
        <Typography variant="body1" color="text.secondary">
          The narrowest legislative race statewide was in{' '}
          <MuiLink component={NextLink} href={kyDistrictPath(closestRef)} underline="hover">
            {kyDistrictShortName(closestRef)}
          </MuiLink>
          , where {closest.results[0].name} ({formatPartyLetterAbbrev(closest.results[0].party)})
          received {formatVotes(closest.results[0].votes)} votes and {closest.results[1].name} (
          {formatPartyLetterAbbrev(closest.results[1].party)}) received{' '}
          {formatVotes(closest.results[1].votes)}, a margin of {formatVotes(closestMargin)} votes.
          The seat did not change party in the {UNOFFICIAL ? 'unofficial' : 'certified'} count.
        </Typography>
      </Box>

      <Box component="section" sx={{ mb: 4 }}>
        <Typography variant="h6" component="h2" fontWeight={700} gutterBottom>
          Sources
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Candidates, parties and vote totals:{' '}
          <MuiLink href={KY_2026_ELECTION.sourceUrl} target="_blank" rel="noopener noreferrer" underline="hover">
            {KY_2026_ELECTION.sourceName}, 2026 General Election results
          </MuiLink>
          . Incumbents and pre-election seat counts: the Know Your Vote Kentucky member roster as of{' '}
          {AS_OF}.
        </Typography>
      </Box>

      <Box
        component="nav"
        aria-label="Related pages"
        sx={{ display: 'flex', flexWrap: 'wrap', columnGap: 2.5, rowGap: 1 }}
      >
        <MuiLink component={NextLink} href="/members/map" underline="hover" variant="body2">
          Find my legislators →
        </MuiLink>
        <MuiLink component={NextLink} href="/members" underline="hover" variant="body2">
          Members →
        </MuiLink>
        <MuiLink
          component={NextLink}
          href="/guides/kentucky-general-assembly-sessions"
          underline="hover"
          variant="body2"
        >
          Session dates →
        </MuiLink>
        <MuiLink component={NextLink} href="/guides" underline="hover" variant="body2">
          All guides →
        </MuiLink>
      </Box>
    </Container>
  );
}
