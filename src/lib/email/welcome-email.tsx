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
  const greeting = displayName?.trim() ? `Your account is set up, ${displayName.trim()}.` : 'Your account is set up.';

  return (
    <Html>
      <Head />
      <Preview>You can now follow Kentucky bills and receive status updates by email.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{greeting}</Heading>
          <Text style={lead}>
            Know Your Vote Kentucky sends a digest when bills you follow change status.
            You will only receive email when there is an update to report.
          </Text>
          <Section style={card}>
            <Text style={cardHeading}>Follow bills</Text>
            <Text style={body}>
              Select <strong>Follow</strong> on any bill page to track it. You will receive
              digest updates when it moves — committee action, floor votes, sent to governor,
              signed, or vetoed.
            </Text>
            <Text style={cta}>
              <Link href={browseBillsHref} style={link}>Browse bills →</Link>
            </Text>
          </Section>
          <Section style={card}>
            <Text style={cardHeading}>Find your legislators</Text>
            <Text style={body}>
              Enter your address on the district map to see your House and Senate
              representatives in the current session.
            </Text>
            <Text style={cta}>
              <Link href={districtMapHref} style={link}>Find my legislators →</Link>
            </Text>
          </Section>
          <Section style={card}>
            <Text style={cardHeading}>Set digest preferences</Text>
            <Text style={body}>
              Choose daily or weekly delivery and select which event types to include. You can also
              follow topics by subject area — automated tagging, so following a specific bill stays
              the most reliable way to track it.
            </Text>
            <Text style={cta}>
              <Link href={preferencesHref} style={link}>Notification preferences →</Link>
            </Text>
          </Section>
          <Text style={muted}>
            This is a one-time setup email. Manage your account at{' '}
            <Link href={profileHref} style={link}>{profileHref}</Link>.
          </Text>
          <Text style={muted}>
            <Link href={privacyHref} style={link}>Privacy</Link>
            {' · '}
            <Link href={termsHref} style={link}>Terms</Link>
          </Text>
          <Text style={{ ...muted, marginTop: 6 }}>
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
const link = { color: '#1e40af', textDecoration: 'underline' };
const muted = { color: '#64748b', fontSize: 12, marginTop: 24, lineHeight: '1.5' };
