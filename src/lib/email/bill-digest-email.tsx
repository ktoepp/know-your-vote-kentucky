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

export type BillDigestLine = {
  eventLabel: string;
  detail: string;
  observedAt: string;
};

export type BillDigestGroup = {
  billNumber: string;
  billTitle: string;
  billHref: string;
  lines: BillDigestLine[];
};

export function BillDigestEmail(props: {
  previewText: string;
  groups: BillDigestGroup[];
  moreCount: number;
  followedBillsHref: string;
  preferencesHref: string;
  unsubscribeHref: string;
  privacyHref: string;
  termsHref: string;
}) {
  const {
    previewText,
    groups,
    moreCount,
    followedBillsHref,
    preferencesHref,
    unsubscribeHref,
    privacyHref,
    termsHref,
  } = props;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Your Kentucky bill digest</Heading>
          <Text style={muted}>
            Status changes on bills and topics you follow — factual updates pulled from LegiScan.
          </Text>
          <Section style={{ marginTop: 24 }}>
            {groups.map((g) => (
              <Section key={g.billHref} style={billBlock}>
                <Link href={g.billHref} style={billLink}>
                  <strong>{g.billNumber}</strong>
                </Link>
                <Text style={title}>{g.billTitle}</Text>
                {g.lines.map((line, i) => (
                  <Text key={i} style={lineText}>
                    <strong>{line.eventLabel}</strong> — {line.detail}{' '}
                    <span style={mutedSm}>({line.observedAt})</span>
                  </Text>
                ))}
              </Section>
            ))}
          </Section>
          {moreCount > 0 && (
            <Text style={{ marginTop: 16 }}>
              and {moreCount} more update{moreCount === 1 ? '' : 's'} —{' '}
              <Link href={followedBillsHref}>view followed bills on the site</Link>.
            </Text>
          )}
          <Section style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <Text style={footerText}>
              You&rsquo;re getting this because you follow bills or topics on Know Your Vote Kentucky.
            </Text>
            <Text style={footerLinks}>
              <Link href={preferencesHref} style={footerLink}>Change frequency or topics</Link>
              {' · '}
              <Link href={unsubscribeHref} style={footerLink}>Unsubscribe</Link>
              {' · '}
              <Link href={privacyHref} style={footerLink}>Privacy</Link>
              {' · '}
              <Link href={termsHref} style={footerLink}>Terms</Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

const main = { backgroundColor: '#f8fafc', fontFamily: 'sans-serif' };
const container = { margin: '0 auto', padding: '24px 16px', maxWidth: 560 };
const h1 = { fontSize: 22, margin: '0 0 8px' };
const muted = { color: '#64748b', fontSize: 14, margin: '0 0 8px' };
const mutedSm = { color: '#64748b', fontSize: 12 };
const billBlock = {
  borderBottom: '1px solid #e2e8f0',
  paddingBottom: 16,
  marginBottom: 16,
};
const billLink = { fontSize: 16, color: '#1e40af' };
const title = { fontSize: 14, margin: '4px 0 8px', color: '#0f172a' };
const lineText = { fontSize: 13, margin: '4px 0', color: '#334155' };
const footerText = { fontSize: 12, color: '#64748b', margin: '0 0 6px', lineHeight: '1.5' };
const footerLinks = { fontSize: 12, color: '#64748b', margin: 0 };
const footerLink = { color: '#1e40af', textDecoration: 'underline' };
