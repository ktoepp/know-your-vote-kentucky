import type { Metadata } from 'next';
import { Container, Typography, Link as MuiLink, Stack } from '@mui/material';
import Link from 'next/link';
import { buildPageMetadata } from '@/lib/seo';

export const metadata: Metadata = buildPageMetadata({
  title: 'Privacy policy',
  description: 'What Know Your Vote Kentucky collects, why, and how to manage or delete your data.',
  path: '/privacy',
});

const LAST_UPDATED = '2026-05-13';

export default function PrivacyPage() {
  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" component="h1" fontWeight={700} gutterBottom>
        Privacy policy
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Last updated {LAST_UPDATED}. Plain language, no legal jargon. If something here is unclear,
        email <MuiLink href="mailto:katie@kyvky.com">katie@kyvky.com</MuiLink>.
      </Typography>

      <Stack spacing={3} component="section">
        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            What we collect
          </Typography>
          <Typography variant="body2" color="text.secondary">
            You can browse Know Your Vote Kentucky without an account. If you create one, we collect:
          </Typography>
          <Typography component="ul" variant="body2" color="text.secondary" sx={{ pl: 3, mt: 1 }}>
            <li>Email address (used as your login and to send digest emails you opted in to).</li>
            <li>Display name, if you set one.</li>
            <li>The bills and topics you follow, and your notification preferences.</li>
            <li>
              Email delivery events from our mail provider (Resend). For each digest we receive
              callbacks like &ldquo;delivered,&rdquo; &ldquo;bounced,&rdquo; and &ldquo;complained.&rdquo;
              We use these to suppress mail to addresses that hard-bounce or mark us as spam, which
              protects deliverability for everyone.
            </li>
            <li>
              Standard server logs (request times, IP, user-agent) retained for short periods for
              security and abuse prevention.
            </li>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            We do <strong>not</strong> embed tracking pixels in our emails, run third-party
            advertising trackers, or sell data.
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            Why we collect it
          </Typography>
          <Typography component="ul" variant="body2" color="text.secondary" sx={{ pl: 3 }}>
            <li>To authenticate you (email + password via Supabase Auth).</li>
            <li>To send the digest emails you asked for, only when bills you follow change status.</li>
            <li>To keep our mail reputation healthy so emails reach inboxes (bounce/complaint handling).</li>
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            Who we share it with
          </Typography>
          <Typography component="ul" variant="body2" color="text.secondary" sx={{ pl: 3 }}>
            <li>
              <strong>Supabase.</strong> Managed Postgres and auth provider that stores your account
              and follows.
            </li>
            <li>
              <strong>Resend.</strong> Sends our emails and reports back delivery and bounce events.
              Resend uses Amazon SES under the hood.
            </li>
            <li>
              <strong>Vercel.</strong> Hosts the site and serves the cron job that builds digests.
            </li>
            <li>
              <strong>Sentry.</strong> Error monitoring on server failures (no personal content
              from emails is sent to Sentry).
            </li>
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            We do not sell or share your data with anyone outside this list, and we don&rsquo;t use
            it for advertising. If law enforcement compels disclosure we will comply with a valid
            order and notify you when permitted.
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            How long we keep it
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Account data is kept until you delete your account. The mail-event log
            (<code>ky_notifications_log</code>) is kept for one year for deliverability auditing,
            then trimmed. Server logs roll over within 30 days.
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            Your controls
          </Typography>
          <Typography component="ul" variant="body2" color="text.secondary" sx={{ pl: 3 }}>
            <li>
              Edit your follows and notification preferences anytime at{' '}
              <MuiLink component={Link} href="/profile">your profile</MuiLink>.
            </li>
            <li>
              Select <em>Unsubscribe from digests</em> at the bottom of any digest email. This turns
              digests off immediately, no login needed.
            </li>
            <li>
              Delete your account from{' '}
              <MuiLink component={Link} href="/profile">your profile</MuiLink>. We remove your
              profile, follows, preferences, and mail log.
            </li>
            <li>
              Email <MuiLink href="mailto:katie@kyvky.com">katie@kyvky.com</MuiLink> for a copy of
              your data or any other request.
            </li>
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            Children
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The site is intended for an adult audience following Kentucky public policy. We
            don&rsquo;t knowingly collect data from anyone under 13.
          </Typography>
        </section>

        <section>
          <Typography variant="h6" component="h2" fontWeight={600} gutterBottom>
            Changes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            If we make material changes (e.g., new categories of data, new processors), we&rsquo;ll
            update this page and bump the &ldquo;Last updated&rdquo; date. Trivial wording fixes
            don&rsquo;t bump the date.
          </Typography>
        </section>
      </Stack>
    </Container>
  );
}
