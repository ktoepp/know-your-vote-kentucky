import NextLink from 'next/link';
import { Box, Link as MuiLink } from '@mui/material';
import { formatPartyLetterAbbrev } from '@/lib/bill-display';
import { kyDistrictPath, kyDistrictShortName } from '@/lib/ky-district-pages';
import { KY_2026_SEAT_CHANGES } from '@/lib/ky-2026-election-seat-changes';

const cell = {
  py: 1,
  pr: { xs: 1, sm: 2 },
  textAlign: 'left',
  verticalAlign: 'top',
  borderBottom: 1,
  borderColor: 'divider',
  fontSize: { xs: 13, sm: 14 },
} as const;

/**
 * The charts' table view, collapsed by default so the page stays visual. It gives screen
 * readers, keyboard users and search engines the seat-by-seat facts as plain text.
 */
export function SeatListDisclosure() {
  const rows = [...KY_2026_SEAT_CHANGES].sort(
    (a, b) => (a.chamber === b.chamber ? a.district - b.district : a.chamber === 'house' ? -1 : 1),
  );
  const abbr = formatPartyLetterAbbrev;
  return (
    <Box
      component="details"
      sx={{
        mt: 1,
        '& > summary': {
          cursor: 'pointer',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 1,
          color: 'primary.main',
          fontWeight: 600,
          fontSize: 15,
          listStyle: 'none',
          '&::-webkit-details-marker': { display: 'none' },
          '&::before': { content: '"▸"', transition: 'transform 150ms' },
        },
        '&[open] > summary::before': { transform: 'rotate(90deg)' },
      }}
    >
      <summary>View the {rows.length} seats as a table</summary>
      <Box sx={{ overflowX: 'auto' }}>
        <Box component="table" sx={{ borderCollapse: 'collapse', width: '100%' }}>
          <caption style={{ position: 'absolute', left: -10000 }}>
            Kentucky legislative seats that changed party in the 2026 general election
          </caption>
          <thead>
            <tr>
              {['District', 'Won by', 'Previously held by'].map((h) => (
                <Box component="th" scope="col" key={h} sx={{ ...cell, fontWeight: 600, color: 'text.secondary' }}>
                  {h}
                </Box>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const ref = { chamber: c.chamber, districtNumber: c.district };
              const [winner] = c.results;
              return (
                <tr key={`${c.chamber}-${c.district}`}>
                  <Box component="th" scope="row" sx={{ ...cell, fontWeight: 600 }}>
                    <MuiLink component={NextLink} href={kyDistrictPath(ref)} underline="hover">
                      {kyDistrictShortName(ref)}
                    </MuiLink>
                  </Box>
                  <Box component="td" sx={cell}>
                    {winner.name} ({abbr(winner.party)})
                  </Box>
                  <Box component="td" sx={cell}>
                    <MuiLink component={NextLink} href={`/members/${c.incumbent.profileSlug}`} underline="hover">
                      {c.incumbent.name}
                    </MuiLink>{' '}
                    ({abbr(c.incumbent.party)}){c.incumbent.onBallot ? '' : ', not on the ballot'}
                  </Box>
                </tr>
              );
            })}
          </tbody>
        </Box>
      </Box>
    </Box>
  );
}
