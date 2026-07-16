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

export type BillDigestLine = {
  detail: string;
  /** Calendar date the event was recorded (e.g. "Jul 15") — rendered as "(recorded Jul 15)". */
  observedAt: string;
};

export type BillDigestGroup = {
  /** Bill number ("HB 208") or committee name; empty when the bill has no number. */
  billNumber: string;
  /** Bill title; empty for committee groups (their lines carry the full event text). */
  billTitle: string;
  billHref: string;
  /** Topics (from the user's filters) this bill matched — shown in the topic section. */
  matchedTopics?: string[];
  lines: BillDigestLine[];
};

export type BillDigestSection = {
  heading: string;
  groups: BillDigestGroup[];
};

/** "A" / "A and B" / "A, B, and C" — for topic notes and the intro scope line. */
export function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

export function BillDigestEmail(props: {
  previewText: string;
  /** Scope line under the heading, generated from the sections present. */
  introText: string;
  sections: BillDigestSection[];
  moreCount: number;
  /** Destination for the overflow line — must show activity from every followed source. */
  moreHref: string;
  glossaryHref: string;
  preferencesHref: string;
  unsubscribeHref: string;
  privacyHref: string;
  termsHref: string;
}) {
  const {
    previewText,
    introText,
    sections,
    moreCount,
    moreHref,
    glossaryHref,
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
          <Heading style={h1}>Kentucky bill digest</Heading>
          <Text style={muted}>{introText}</Text>
          {sections.map((section) => (
            <Section key={section.heading} style={{ marginTop: 24 }}>
              <Text style={sectionHeading}>{section.heading}</Text>
              {section.groups.map((g) => (
                <Section key={g.billHref} style={billBlock}>
                  {g.billNumber && (
                    <Link href={g.billHref} style={billLink}>
                      <strong>{g.billNumber}</strong>
                    </Link>
                  )}
                  {g.billTitle && (
                    <Text style={title}>
                      <Link href={g.billHref} style={titleLink}>{g.billTitle}</Link>
                    </Text>
                  )}
                  {g.matchedTopics && g.matchedTopics.length > 0 && (
                    <Text style={topicNote}>Matches your {joinWithAnd(g.matchedTopics)} topic{g.matchedTopics.length === 1 ? '' : 's'}</Text>
                  )}
                  {g.lines.map((line, i) => (
                    <Text key={i} style={lineText}>
                      {line.detail}{' '}
                      <span style={mutedSm}>(recorded {line.observedAt})</span>
                    </Text>
                  ))}
                </Section>
              ))}
            </Section>
          ))}
          {moreCount > 0 && (
            <Text style={{ marginTop: 16 }}>
              {moreCount} more update{moreCount === 1 ? '' : 's'} not shown —{' '}
              <Link href={moreHref}>see all recent activity</Link>.
            </Text>
          )}
          <Section style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
            <Text style={footerText}>
              You&rsquo;re getting this because you follow bills, topics, or committees on Know Your Vote Kentucky.
              Status lines quote the legislative record as written — the{' '}
              <Link href={glossaryHref} style={footerLink}>glossary</Link> explains the terms.
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
const sectionHeading = {
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  color: '#475569',
  margin: '0 0 12px',
};
const topicNote = { fontSize: 12, color: '#64748b', margin: '0 0 6px' };
const billBlock = {
  borderBottom: '1px solid #e2e8f0',
  paddingBottom: 16,
  marginBottom: 16,
};
const billLink = { fontSize: 16, color: '#1e40af' };
const title = { fontSize: 14, margin: '4px 0 8px' };
const titleLink = { color: '#0f172a', textDecoration: 'none' };
const lineText = { fontSize: 13, margin: '4px 0', color: '#334155' };
const footerText = { fontSize: 12, color: '#64748b', margin: '0 0 6px', lineHeight: '1.5' };
const footerLinks = { fontSize: 12, color: '#64748b', margin: 0 };
const footerLink = { color: '#1e40af', textDecoration: 'underline' };
