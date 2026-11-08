import NextLink from 'next/link';
import { Box, Link as MuiLink, Typography } from '@mui/material';
import { formatPartyLetterAbbrev } from '@/lib/bill-display';
import { kyDistrictPath, kyDistrictShortName } from '@/lib/ky-district-pages';
import { winningMargin, type KySeatChange } from '@/lib/ky-2026-election-seat-changes';
import { PARTY_FILL } from './election-chart-colors';

function Swatch({ color }: { color: string }) {
  return <Box component="span" aria-hidden="true" sx={{ display: 'inline-block', width: 10, height: 10, borderRadius: '2px', bgcolor: color, flexShrink: 0 }} />;
}

/**
 * The table view of the charts: every seat that changed party with its result and the
 * winner's margin as a thin bar, closest race first.
 */
export function SeatChangeRows({ changes }: { changes: readonly KySeatChange[] }) {
  const rows = changes
    .map((c) => ({ c, margin: winningMargin(c.results) }))
    .sort((a, b) => a.margin.points - b.margin.points);
  const max = Math.max(...rows.map((r) => r.margin.points));

  return (
    <Box component="ol" sx={{ listStyle: 'none', m: 0, p: 0 }}>
      {rows.map(({ c, margin }) => {
        const ref = { chamber: c.chamber, districtNumber: c.district };
        const [winner, runnerUp] = c.results;
        const { incumbent } = c;
        const abbr = formatPartyLetterAbbrev;
        return (
          <Box
            component="li"
            key={`${c.chamber}-${c.district}`}
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '132px 1fr 240px' },
              columnGap: 2,
              rowGap: 0.75,
              alignItems: 'center',
              py: 1.5,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <Box>
              <Typography variant="body2" fontWeight={600}>
                <MuiLink component={NextLink} href={kyDistrictPath(ref)} underline="hover">
                  {kyDistrictShortName(ref)}
                </MuiLink>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
                <Swatch color={PARTY_FILL[incumbent.party].changed} />
                <Typography component="span" variant="caption" color="text.secondary">
                  {abbr(incumbent.party)} to {abbr(winner.party)}
                </Typography>
                <Swatch color={PARTY_FILL[winner.party].changed} />
              </Box>
            </Box>
            <Typography variant="body2" color="text.primary">
              <Box component="span" sx={{ fontWeight: 600 }}>
                {winner.name} ({abbr(winner.party)})
              </Box>{' '}
              {incumbent.onBallot ? (
                <>
                  defeated{' '}
                  <MuiLink component={NextLink} href={`/members/${incumbent.profileSlug}`} underline="hover">
                    {incumbent.name}
                  </MuiLink>{' '}
                  ({abbr(incumbent.party)})
                </>
              ) : (
                <>
                  won the open seat over {runnerUp.name} ({abbr(runnerUp.party)}). Incumbent{' '}
                  <MuiLink component={NextLink} href={`/members/${incumbent.profileSlug}`} underline="hover">
                    {incumbent.name}
                  </MuiLink>{' '}
                  ({abbr(incumbent.party)}) was not on the ballot.
                </>
              )}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Box sx={{ flex: '0 0 72px', height: 8 }} aria-hidden="true">
                <Box
                  sx={{
                    width: `${Math.max(3, (margin.points / max) * 100)}%`,
                    height: '100%',
                    borderRadius: '0 4px 4px 0',
                    bgcolor: PARTY_FILL[winner.party].changed,
                  }}
                />
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                <Box component="span" sx={{ color: 'text.primary', fontWeight: 600 }}>
                  {margin.points.toFixed(1)} pts
                </Box>{' '}
                · {margin.votes.toLocaleString('en-US')} votes
              </Typography>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
}
