import type { Metadata } from 'next';
import { Container, Typography, Link as MuiLink, Stack } from '@mui/material';
import Link from 'next/link';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Terms of service',
  description: 'The basic rules for using Know Your Vote Kentucky.',
  path: '/terms',
});

const LAST_UPDATED = '2026-05-13';

export default function TermsPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        Terms of service
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated {LAST_UPDATED}. By using the site you agree to these terms. Questions:{' '}
        <MuiLink href="mailto:katie@kyvky.com">katie@kyvky.com</MuiLink>.
      </Typography>

      <Stack spacing={3} component="section">
        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            What we provide
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Know Your Vote Kentucky aggregates Kentucky General Assembly bills and member data from
            the Kentucky Legislative Research Commission (LRC), LegiScan, Open States, and
            Ballotpedia. We add discovery features (search, follows, digest emails). We are not
            affiliated with the Kentucky General Assembly or any government agency.
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            Accuracy
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We sync data from upstream sources at intervals. Bill status, votes, and contact
            information may be a few minutes to a few hours behind the official LRC site. For
            time-sensitive decisions (testifying, voting, contacting your representative), verify
            against the official source linked from each bill page.
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            Your account
          </Typography>
          <Typography component="ul" variant="body2" color="text.secondary" sx={{ pl: 3 }}>
            <li>You&rsquo;re responsible for keeping your password safe.</li>
            <li>One account per real person. Don&rsquo;t share credentials.</li>
            <li>Use a real email so you can recover access and receive digests.</li>
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            Acceptable use
          </Typography>
          <Typography component="ul" variant="body2" color="text.secondary" sx={{ pl: 3 }}>
            <li>Don&rsquo;t scrape the site or hammer the API. Use the official LRC and LegiScan APIs for bulk data.</li>
            <li>Don&rsquo;t attempt to impersonate other users, legislators, or staff.</li>
            <li>Don&rsquo;t use the site to harass legislators or other users.</li>
            <li>Don&rsquo;t reverse-engineer, probe for vulnerabilities, or attempt to disrupt the service. Responsible vulnerability reports to <MuiLink href="mailto:katie@kyvky.com">katie@kyvky.com</MuiLink> are welcome.</li>
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            Email
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We send digest emails when bills you follow change status. Digests turn on automatically
            when you follow your first bill (weekly by default). We do not send marketing or
            promotional mail. You can unsubscribe from digests anytime via the link in any email or
            from{' '}
            <MuiLink component={Link} href="/profile">your profile</MuiLink>.
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            Termination
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You can delete your account from your profile at any time. We may suspend or terminate
            accounts that violate these terms or pose a risk to the service or other users.
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            No warranty
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The site is provided &ldquo;as is.&rdquo; We make no guarantees about uptime,
            completeness, or fitness for a particular purpose. Don&rsquo;t rely on the site as a
            sole source of truth for legal or political decisions.
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            Changes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            We may update these terms. Material changes will be announced at the top of this page
            and reflected in the &ldquo;Last updated&rdquo; date. Continued use after changes means
            you accept the new terms.
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            Privacy
          </Typography>
          <Typography variant="body2" color="text.secondary">
            See the <MuiLink component={Link} href="/privacy">privacy policy</MuiLink> for what we
            collect and how to manage or delete it.
          </Typography>
        </section>
      </Stack>
    </Container>
  );
}
