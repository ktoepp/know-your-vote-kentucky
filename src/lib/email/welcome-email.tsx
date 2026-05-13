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
} from '@react-email/components';
import * as React from 'react';

export function WelcomeEmail(props: {
  displayName?: string | null;
  browseBillsHref: string;
  profileHref: string;
  preferencesHref: string;
  districtMapHref: string;
  privacyHref: string;
  termsHref: string;
}) {
  const {
    displayName,
    browseBillsHref,
    profileHref,
    preferencesHref,
    districtMapHref,
    privacyHref,
    termsHref,
  } = props;
  const greeting = displayName?.trim() ? `Welcome, ${displayName.trim()}` : 'Welcome to Know Your Vote Kentucky';

  return (
    <Html>
      <Head />
      <Preview>Your Know Your Vote Kentucky account is ready.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{greeting}</Heading>
          <Text style={lead}>
            Your email is verified. From here we&rsquo;ll only email you when bills you follow
            change status — no marketing, no noise.
          </Text>
          <Section style={card}>
            <Text style={cardHeading}>Follow bills you care about</Text>
            <Text style={body}>
              Open any bill page and tap <strong>Follow</strong>. We&rsquo;ll add it to your daily
              digest when it moves — committee action, floor votes, sent to governor, signed, vetoed.
            </Text>
            <Text style={cta}>
              <Link href={browseBillsHref} style={link}>Browse bills →</Link>
            </Text>
          </Section>
          <Section style={card}>
            <Text style={cardHeading}>Find your legislators</Text>
            <Text style={body}>
              Look up your two legislators (one House, one Senate) by address on the district map.
            </Text>
            <Text style={cta}>
              <Link href={districtMapHref} style={link}>Open the district map →</Link>
            </Text>
          </Section>
          <Section style={card}>
            <Text style={cardHeading}>Tune your digest</Text>
            <Text style={body}>
              Pick daily or weekly cadence, choose which event types matter to you, and follow whole
              topics (Education, Healthcare, etc.) — we&rsquo;ll match bills automatically.
            </Text>
            <Text style={cta}>
              <Link href={preferencesHref} style={link}>Notification preferences →</Link>
            </Text>
          </Section>
          <Text style={muted}>
            This is a one-time welcome email. Manage your account anytime at{' '}
            <Link href={profileHref} style={link}>{profileHref}</Link>.
          </Text>
          <Text style={muted}>
            <Link href={privacyHref} style={link}>Privacy</Link>
            {' · '}
            <Link href={termsHref} style={link}>Terms</Link>
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
const link = { color: '#1e40af', textDecoration: 'underline' };
const muted = { color: '#64748b', fontSize: 12, marginTop: 24, lineHeight: '1.5' };
