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
  unsubscribeHref: string;
}) {
  const { previewText, groups, moreCount, followedBillsHref, unsubscribeHref } = props;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Kentucky bill digest</Heading>
          <Text style={muted}>Status updates for bills and topics you follow.</Text>
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
              {moreCount} additional update{moreCount === 1 ? '' : 's'} not shown —{' '}
              <Link href={followedBillsHref}>view all followed bills</Link>.
            </Text>
          )}
          <Text style={{ marginTop: 32, fontSize: 12, color: '#64748b' }}>
            <Link href={unsubscribeHref}>Stop receiving these digests</Link>
          </Text>
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
