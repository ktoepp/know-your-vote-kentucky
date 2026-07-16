import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Img,
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

/** "A" / "A and B" / "A, B, and C" — for topic notes, preview text, and the intro scope line. */
export function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} and ${items[1]}`;
  return `${items.slice(0, -1).join(', ')}, and ${items[items.length - 1]}`;
}

/**
 * Dark-mode overrides. The media query covers clients that honor
 * prefers-color-scheme (Apple Mail and others); the [data-ogsc]/[data-ogsb]
 * selectors cover Gmail's forced dark transforms, which ignore the media query
 * and stamp those attributes on recolored elements instead. Clients that
 * support neither keep the inline light palette.
 */
const darkModeStyles = `
  @media (prefers-color-scheme: dark) {
    .dg-bg { background-color: #0f172a !important; }
    .dg-ink { color: #e2e8f0 !important; }
    .dg-muted { color: #94a3b8 !important; }
    .dg-link { color: #93c5fd !important; }
    .dg-border { border-color: #334155 !important; }
  }
  [data-ogsb] .dg-bg { background-color: #0f172a !important; }
  [data-ogsc] .dg-ink { color: #e2e8f0 !important; }
  [data-ogsc] .dg-muted { color: #94a3b8 !important; }
  [data-ogsc] .dg-link { color: #93c5fd !important; }
  [data-ogsc] .dg-border { border-color: #334155 !important; }
`;

export function BillDigestEmail(props: {
  previewText: string;
  /** Absolute URL of the KYVKY logo (email clients need a hosted image). */
  logoSrc: string;
  /** Where the logo links (site home). */
  homeHref: string;
  /** "Kentucky bill digest", or "Kentucky committee digest" for committee-only sends. */
  heading: string;
  /** Scope line under the heading, generated from the sections present. */
  introText: string;
  sections: BillDigestSection[];
  /** Base URL of the bills browse page — topic annotations link to `?topic={t}`. */
  billsBrowseHref: string;
  moreCount: number;
  /**
   * Destination for the overflow line. Must be phrased honestly: profile
   * activity covers followed bills and committees, NOT topic-matched bills.
   */
  moreHref: string;
  /**
   * The user's followed topics, shown after the overflow line when topic-matched
   * updates were cut — the topic browse is the closest destination for those.
   */
  overflowTopics?: string[];
  glossaryHref: string;
  preferencesHref: string;
  unsubscribeHref: string;
  privacyHref: string;
  termsHref: string;
  /** Sender postal address (CAN-SPAM), e.g. "PO Box 133, Bardstown, Kentucky 40004". */
  postalAddress: string;
}) {
  const {
    previewText,
    logoSrc,
    homeHref,
    heading,
    introText,
    sections,
    billsBrowseHref,
    moreCount,
    moreHref,
    overflowTopics,
    glossaryHref,
    preferencesHref,
    unsubscribeHref,
    privacyHref,
    termsHref,
    postalAddress,
  } = props;

  const topicBrowseHref = (topic: string) => `${billsBrowseHref}?topic=${encodeURIComponent(topic)}`;

  return (
    <Html>
      <Head>
        <style>{darkModeStyles}</style>
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main} className="dg-bg">
        <Container style={container}>
          <Link href={homeHref} style={{ display: 'block', marginBottom: 16 }}>
            <Img
              src={logoSrc}
              alt="Know Your Vote Kentucky"
              width={220}
              height={53}
              style={{ display: 'block' }}
            />
          </Link>
          <Heading style={h1} className="dg-ink">{heading}</Heading>
          <Text style={muted} className="dg-muted">{introText}</Text>
          {sections.map((section) => (
            <Section key={section.heading} style={{ marginTop: 24 }}>
              <Text style={sectionHeading} className="dg-muted">{section.heading}</Text>
              {section.groups.map((g) => (
                <Section key={g.billHref} style={billBlock} className="dg-border">
                  {/* One anchor per group: the blue number signals the link, the
                      title rides along for a full-width target, and the plain-text
                      part prints the URL once instead of twice. */}
                  <Link href={g.billHref} style={groupLink}>
                    {g.billNumber && (
                      <strong style={numberText} className="dg-link">{g.billNumber}</strong>
                    )}
                    {g.billNumber && g.billTitle && <br />}
                    {g.billTitle && (
                      <span style={titleText} className="dg-ink">{g.billTitle}</span>
                    )}
                  </Link>
                  {g.matchedTopics && g.matchedTopics.length > 0 && (
                    <Text style={topicNote} className="dg-muted">
                      Matches your{' '}
                      {g.matchedTopics.map((t, i, arr) => (
                        <React.Fragment key={t}>
                          <Link href={topicBrowseHref(t)} style={topicLink} className="dg-muted">{t}</Link>
                          {i < arr.length - 2 ? ', ' : i === arr.length - 2 ? (arr.length > 2 ? ', and ' : ' and ') : ''}
                        </React.Fragment>
                      ))}{' '}
                      topic{g.matchedTopics.length === 1 ? '' : 's'}
                    </Text>
                  )}
                  {g.lines.map((line, i) => (
                    <Text key={i} style={lineText} className="dg-ink">
                      {line.detail}{' '}
                      <span style={mutedSm} className="dg-muted">(recorded&nbsp;{line.observedAt})</span>
                    </Text>
                  ))}
                </Section>
              ))}
            </Section>
          ))}
          {moreCount > 0 && (
            <Text style={{ marginTop: 16 }} className="dg-ink">
              {moreCount} more update{moreCount === 1 ? '' : 's'} not shown.{' '}
              <Link href={moreHref} style={inlineLink} className="dg-link">Your profile</Link>{' '}
              lists recent activity for bills and committees you follow.
              {overflowTopics && overflowTopics.length > 0 && (
                <>
                  {' '}Bills matching your topics are in the bill browser:{' '}
                  {overflowTopics.map((t, i, arr) => (
                    <React.Fragment key={t}>
                      <Link href={topicBrowseHref(t)} style={inlineLink} className="dg-link">{t}</Link>
                      {i < arr.length - 1 ? ' · ' : ''}
                    </React.Fragment>
                  ))}
                </>
              )}
            </Text>
          )}
          <Section style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0' }} className="dg-border">
            <Text style={footerText} className="dg-muted">
              You&rsquo;re getting this because you follow bills, topics, or committees on Know Your Vote Kentucky.
            </Text>
            <Text style={footerText} className="dg-muted">
              Bill status lines quote the legislature&rsquo;s official action text where available — the{' '}
              <Link href={glossaryHref} style={inlineLink} className="dg-link">glossary</Link> explains the terms.
              Dates in parentheses show when Know Your Vote Kentucky recorded each update, which can lag the action itself.
            </Text>
            <Text style={footerLinks} className="dg-muted">
              <Link href={preferencesHref} style={inlineLink} className="dg-link">Change digest settings</Link>
              {' · '}
              <Link href={unsubscribeHref} style={inlineLink} className="dg-link">Unsubscribe</Link>
              {' · '}
              <Link href={privacyHref} style={inlineLink} className="dg-link">Privacy</Link>
              {' · '}
              <Link href={termsHref} style={inlineLink} className="dg-link">Terms</Link>
            </Text>
            <Text style={{ ...footerText, margin: '6px 0 0' }} className="dg-muted">
              Know Your Vote Kentucky · {postalAddress}
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
const mutedSm = { color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' as const };
const sectionHeading = {
  fontSize: 13,
  fontWeight: 600,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.04em',
  color: '#475569',
  margin: '0 0 12px',
};
const topicNote = { fontSize: 12, color: '#64748b', margin: '0 0 6px' };
const topicLink = { color: '#64748b', textDecoration: 'underline' };
const billBlock = {
  borderBottom: '1px solid #e2e8f0',
  paddingBottom: 16,
  marginBottom: 16,
};
const groupLink = { display: 'block', textDecoration: 'none', marginBottom: 8 };
const numberText = { fontSize: 16, color: '#1e40af' };
const titleText = { fontSize: 14, lineHeight: '1.45', color: '#1e293b' };
const lineText = { fontSize: 13, margin: '4px 0', color: '#334155' };
const footerText = { fontSize: 12, color: '#64748b', margin: '0 0 6px', lineHeight: '1.5' };
const footerLinks = { fontSize: 12, color: '#64748b', margin: 0 };
const inlineLink = { color: '#1e40af', textDecoration: 'underline' };
