import NextLink from 'next/link';
import { Box, Link as MuiLink, Typography } from '@mui/material';
import { formatPartyLetterAbbrev } from '@/lib/bill-display';
import { kyDistrictPath } from '@/lib/ky-district-pages';
import type { KyElectionParty, KySeatChange } from '@/lib/ky-2026-election-seat-changes';
import { PARTY_COLOR } from './election-chart-colors';

function PartyChange({ from, to }: { from: KyElectionParty; to: KyElectionParty }) {
  const dot = (party: KyElectionParty) => (
    <Box component="span" aria-hidden="true" sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PARTY_COLOR[party] }} />
  );
  return (
    <Box
      component="span"
      aria-label={`${from} to ${to}`}
      sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, typography: 'caption', color: 'text.secondary' }}
    >
      {dot(from)}
      {formatPartyLetterAbbrev(from)} → {formatPartyLetterAbbrev(to)}
      {dot(to)}
    </Box>
  );
}

function SeatRow({ c }: { c: KySeatChange }) {
  const [winner] = c.results;
  const { incumbent } = c;
  const abbr = formatPartyLetterAbbrev;
  const incumbentLink = (
    <>
      <MuiLink component={NextLink} href={`/members/${incumbent.profileSlug}`} underline="hover">
        {incumbent.name}
      </MuiLink>{' '}
      ({abbr(incumbent.party)})
    </>
  );
  return (
    <Box
      component="li"
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '88px 1fr', sm: '96px 84px 1fr' },
        columnGap: 1.5,
        rowGap: 0.25,
        alignItems: 'baseline',
        py: 1.25,
        borderBottom: 1,
        borderColor: 'divider',
      }}
    >
      <Typography variant="body2" fontWeight={600}>
        <MuiLink component={NextLink} href={kyDistrictPath({ chamber: c.chamber, districtNumber: c.district })} underline="hover">
          District {c.district}
        </MuiLink>
      </Typography>
      <Box sx={{ gridColumn: { xs: 2, sm: 'auto' }, gridRow: { xs: 2, sm: 'auto' } }}>
        <PartyChange from={incumbent.party} to={winner.party} />
      </Box>
      <Typography variant="body2" sx={{ gridColumn: { xs: 2, sm: 'auto' }, gridRow: { xs: 1, sm: 'auto' } }}>
        <Box component="span" sx={{ fontWeight: 600 }}>
          {winner.name}
        </Box>{' '}
        ({abbr(winner.party)}){' '}
        {incumbent.onBallot ? <>defeated {incumbentLink}</> : <>won the seat held by {incumbentLink}, who was not on the ballot</>}
      </Typography>
    </Box>
  );
}

/**
 * The table view of the charts: every seat that changed party, grouped by chamber in
 * district order — who won, who held it, and which way it changed.
 */
export function SeatChangeRows({ changes }: { changes: readonly KySeatChange[] }) {
  return (
    <>
      {(['house', 'senate'] as const).map((chamber) => {
        const rows = changes.filter((c) => c.chamber === chamber).sort((a, b) => a.district - b.district);
        if (!rows.length) return null;
        return (
          <Box key={chamber} sx={{ mb: 2.5 }}>
            <Typography component="h3" variant="body1" fontWeight={700}>
              {chamber === 'house' ? 'House' : 'Senate'}
            </Typography>
            <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
              {rows.map((c) => (
                <SeatRow key={c.district} c={c} />
              ))}
            </Box>
          </Box>
        );
      })}
    </>
  );
}
