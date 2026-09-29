import { Link as MuiLink, Typography } from '@mui/material';
import { CC_BY_4_NAME, CC_BY_4_URL, LEGISCAN_URL } from '@/lib/legiscan-attribution';

/**
 * Per-page CC BY 4.0 credit for LegiScan-derived content (see
 * `src/lib/legiscan-attribution.ts`). The full changes notice lives in the site
 * footer and on /licenses, which this links to.
 */
export function LegiScanCredit() {
  return (
    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5, lineHeight: 1.5 }}>
      Bill data from{' '}
      <MuiLink href={LEGISCAN_URL} target="_blank" rel="noopener noreferrer" color="inherit">
        LegiScan
      </MuiLink>
      ,{' '}
      <MuiLink href={CC_BY_4_URL} target="_blank" rel="noopener license noreferrer" color="inherit">
        {CC_BY_4_NAME}
      </MuiLink>
      , with our changes.{' '}
      <MuiLink href="/licenses" color="inherit">
        What we change
      </MuiLink>
    </Typography>
  );
}
