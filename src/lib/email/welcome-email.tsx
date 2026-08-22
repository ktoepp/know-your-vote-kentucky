import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'react-email';
import * as React from 'react';
import { KYVKY_POSTAL_ADDRESS } from '@/lib/kyvky-contact';
import { EMAIL_DARK_MODE_CSS, EmailBrandHeader } from '@/lib/email/brand';

export function WelcomeEmail(props: {
  displayName?: string | null;
  browseBillsHref: string;
  profileHref: string;
  preferencesHref: string;
  districtMapHref: string;
  aboutHref: string;
  /** Absolute URL of the KYvKY logo (email clients need a hosted image). */
  logoSrc: string;
  /** Where the logo links (site home). */
  homeHref: string;
  privacyHref: string;
  termsHref: string;
}) {
  const {
    displayName,
    browseBillsHref,
    profileHref,
    preferencesHref,
    districtMapHref,
    aboutHref,
    logoSrc,
    homeHref,
    privacyHref,
    termsHref,
  } = props;
  const greeting = displayName?.trim() ? `Your account is set up, ${displayName.trim()}.` : 'Your account is set up.';

  return (
    <Html>
      <Head>
        {/* Verbatim, not a text child: React escapes ">" inside <style>, which
            invalidates any selector list containing a child combinator. */}
        <style dangerouslySetInnerHTML={{ __html: EMAIL_DARK_MODE_CSS }} />
      </Head>
      <Preview>You can now follow Kentucky bills and receive status updates by email.</Preview>
      <Body style={main} className="kv-bg">
        <Container style={container}>
          <EmailBrandHeader logoSrc={logoSrc} homeHref={homeHref} />
          <Heading style={h1} className="kv-ink">{greeting}</Heading>
          <Text style={lead} className="kv-body">
            Know Your Vote Kentucky sends a digest when bills you follow change status.
            You will only receive email when there is an update to report.
          </Text>
          <Section style={card} className="kv-border">
            <Text style={cardHeading} className="kv-ink">Follow bills</Text>
            <Text style={body} className="kv-body">
              Select <strong>Follow</strong> on any bill page to track it. You will receive
              digest updates when it moves: committee action, floor votes, sent to governor,
              signed, or vetoed.
            </Text>
            <Text style={cta}>
              <Link href={browseBillsHref} style={link} className="kv-link">Browse bills →</Link>
            </Text>
          </Section>
          <Section style={card} className="kv-border">
            <Text style={cardHeading} className="kv-ink">Find your legislators</Text>
            <Text style={body} className="kv-body">
              Enter your address on the district map to see your House and Senate
              representatives in the current session.
            </Text>
            <Text style={cta}>
              <Link href={districtMapHref} style={link} className="kv-link">Find my legislators →</Link>
            </Text>
          </Section>
          <Section style={card} className="kv-border">
            <Text style={cardHeading} className="kv-ink">Set digest preferences</Text>
            <Text style={body} className="kv-body">
              Choose daily or weekly delivery and select which event types to include. You can also
              follow topics by subject area. Tagging is automated, so following a specific bill
              stays the most reliable way to track it.
            </Text>
            <Text style={cta}>
              <Link href={preferencesHref} style={link} className="kv-link">Notification preferences →</Link>
            </Text>
          </Section>
          <Section style={note} className="kv-border">
            <Text style={noteHeading} className="kv-ink">A note from the founder</Text>
            <Text style={noteGreeting} className="kv-body">Thank you for signing up!</Text>
            <Text style={body} className="kv-body">
              I&apos;m Katie Toepp, a designer and self-taught developer in Kentucky, and I believe
              more than anything that knowledge is power. I built KYvKY because our legislative record
              is public, but hard to use.
            </Text>
            <Text style={body} className="kv-body">
              I wanted to better understand the bills I was hearing about in the media. But I kept
              hitting a wall: either a paywall, or an outdated interface that assumed I already
              understood the legislative process. I wanted following my state&apos;s legislation to be
              as easy as following friends on a feed.
            </Text>
            <Text style={body} className="kv-body">
              KYvKY will always be free and non-partisan, and will never sell data. Right now
              it&apos;s a passion project, and I&apos;m working to fund and grow it.
            </Text>
            <Text style={body} className="kv-body">
              Replies to this email reach me. If something on the site looks wrong, I&apos;d like to
              know.
            </Text>
            <Text style={body} className="kv-body">
              Thanks again for using KYvKY and getting involved in the civic process.
            </Text>
            <Text style={cta}>
              <Link href={aboutHref} style={link} className="kv-link">More about the project →</Link>
            </Text>
          </Section>
          <Text style={muted} className="kv-muted">
            This is a one-time setup email. Manage your account at{' '}
            <Link href={profileHref} style={link} className="kv-link">{profileHref}</Link>.
          </Text>
          <Text style={muted} className="kv-muted">
            <Link href={privacyHref} style={link} className="kv-link">Privacy</Link>
            {' · '}
            <Link href={termsHref} style={link} className="kv-link">Terms</Link>
          </Text>
          <Text style={{ ...muted, marginTop: 6 }} className="kv-muted">
            Know Your Vote Kentucky · {KYVKY_POSTAL_ADDRESS}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: '#f8fafc', fontFamily: 'sans-serif' };
const container = { margin: '0 auto', padding: '24px 16px', maxWidth: 560 };
const h1 = { fontSize: 22, margin: '0 0 12px', color: '#0f172a' };
const lead = { fontSize: 14, color: '#334155', margin: '0 0 16px', lineHeight: '1.5' };
const card = {
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  padding: '14px 16px',
  marginBottom: 12,
};
const cardHeading = { fontSize: 15, fontWeight: 600, color: '#0f172a', margin: '0 0 6px' };
const body = { fontSize: 13, color: '#334155', margin: '0 0 8px', lineHeight: '1.5' };
const cta = { fontSize: 13, margin: '4px 0 0' };
const note = {
  borderTop: '1px solid #e2e8f0',
  paddingTop: 16,
  marginTop: 20,
};
const noteHeading = { fontSize: 14, fontWeight: 600, color: '#0f172a', margin: '0 0 10px' };
const noteGreeting = { fontSize: 13, color: '#334155', margin: '0 0 12px', lineHeight: '1.5' };
const link = { color: '#1e40af', textDecoration: 'underline' };
const muted = { color: '#64748b', fontSize: 12, marginTop: 24, lineHeight: '1.5' };
