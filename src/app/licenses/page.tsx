import type { Metadata } from 'next';
import { Container, Typography, Link as MuiLink, Stack, Divider } from '@mui/material';
import Link from 'next/link';
import { APP_VERSION } from '@/lib/app-version';
import { buildPageMetadata } from '@/lib/seo';
import { CC_BY_4_NAME, CC_BY_4_URL, LEGISCAN_CHANGES_NOTE, LEGISCAN_URL } from '@/lib/legiscan-attribution';

export const metadata: Metadata = buildPageMetadata({
  title: 'Licenses & attributions',
  description: 'Open-source license and third-party data source attributions.',
  path: '/licenses',
});

export default function LicensesPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        Licenses & attributions
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        App version {APP_VERSION}. This page summarizes how we use open software and public data. It is informational,
        not legal advice.
      </Typography>

      <Stack spacing={2.5} component="section" aria-label="Open source">
        <Typography variant="h6" component="h2" fontWeight={600}>
          Software
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Site source is licensed under the{' '}
          <MuiLink href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer">
            MIT License
          </MuiLink>
          . Third-party libraries (including Next.js, React, MUI, and others) are used under their respective licenses.
        </Typography>
      </Stack>

      <Divider sx={{ my: 3 }} />

      <Stack spacing={2.5} component="section" aria-label="Data sources">
        <Typography variant="h6" component="h2" fontWeight={600}>
          Data & maps
        </Typography>
        <Typography variant="body2" color="text.secondary" component="div">
          <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
            <li>
              <strong>LegiScan.</strong> Bill details, sponsors, status history and roll-call votes come from{' '}
              <MuiLink href={LEGISCAN_URL} target="_blank" rel="noopener noreferrer">
                LegiScan
              </MuiLink>{' '}
              and are licensed under the{' '}
              <MuiLink href={CC_BY_4_URL} target="_blank" rel="noopener license noreferrer">
                Creative Commons Attribution 4.0 International license ({CC_BY_4_NAME})
              </MuiLink>
              . We changed this data: {LEGISCAN_CHANGES_NOTE.charAt(0).toLowerCase() + LEGISCAN_CHANGES_NOTE.slice(1)} Our changes
              are ours, not LegiScan&rsquo;s, and LegiScan does not endorse this site. If you reuse the data, credit LegiScan
              under the same license.
            </li>
            <li>
              <strong>Plural (Open States).</strong> Legislator and metadata sources via{' '}
              <MuiLink href="https://v3.openstates.org/" target="_blank" rel="noopener noreferrer">
                API v3
              </MuiLink>
              , subject to Plural Policy / Open States terms and your API agreement.
            </li>
            <li>
              <strong>Mapbox.</strong> Map tiles and geocoding where enabled. Use subject to the Mapbox Terms of
              Service.
            </li>
            <li>
              <strong>OpenStreetMap.</strong> Underlying open map data. © OpenStreetMap contributors, ODbL where
              applicable.
            </li>
            <li>
              <strong>U.S. Census / LRC.</strong> District boundaries and official Kentucky legislative references
              where cited. Use official sources for legal boundary questions.
            </li>
          </ul>
        </Typography>
        <Typography variant="body2" color="text.secondary">
          <MuiLink component={Link} href="/" fontWeight={600}>
            Home
          </MuiLink>
        </Typography>
      </Stack>
    </Container>
  );
}
