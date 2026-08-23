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
import { EMAIL_DARK_MODE_CSS, EmailBrandHeader } from '@/lib/email/brand';

export type BillDigestLine = {
  detail: string;
  /** Calendar date the event was recorded (e.g. "Jul 15") — rendered as "(recorded Jul 15)". */
  observedAt: string;
};

/**
 * Compact, serializable form of a bill's generalized progress (see
 * `getBillProgress` in `ky-bill-progress.ts`) — carried into the email so the
 * digest can show the same 4-stage meter as the site. Undefined for committee
 * groups and bills without a usable status.
 */
export type DigestBillProgress = {
  /** Ordered stage labels for this bill type (e.g. Introduced / Passed House / …). */
  stageLabels: string[];
  /** Compact stage labels for the per-segment caption row (e.g. Introduced / House / Senate / Law). */
  shortStageLabels?: string[];
  /** 0-based furthest stage reached. */
  reachedIndex: number;
  /** vetoed / failed when the bill has stopped advancing, else null. */
  terminal: 'vetoed' | 'failed' | null;
  /** Specific milestone caption (e.g. the last-action text) — overrides the generic stage-name caption. */
  specificMilestone?: string;
};

export type BillDigestGroup = {
  /** Bill number ("HB 208") or committee name; empty when the bill has no number. */
  billNumber: string;
  /** Bill title; empty for committee groups (their lines carry the full event text). */
  billTitle: string;
  /** Official LRC short title ("Safer Kentucky Act"), shown next to the number when present. */
  shortTitle?: string;
  /** Editorial media / advocacy names, shown as an attributed "Also called" line. */
  alsoCalled?: string[];
  billHref: string;
  /** Topics (from the user's filters) this bill matched — shown in the topic section. */
  matchedTopics?: string[];
  /** Generalized 4-stage progress meter data (bills only). */
  progress?: DigestBillProgress;
  lines: BillDigestLine[];
};

/**
 * Email-safe (table-based) rendering of the generalized progress meter. Mirrors
 * the on-site `BillProgressMeter`: completed stages fill blue, a vetoed bill's
 * final stage shows a red bar, and a caption names the current stage / terminal.
 */
function DigestProgressMeter({ progress }: { progress: DigestBillProgress }) {
  const { stageLabels, shortStageLabels, reachedIndex, terminal, specificMilestone } = progress;
  const n = stageLabels.length;
  const last = n - 1;
  // Fully passed (enacted / adopted) reads green; still in progress reads blue.
  const fullyPassed = terminal === null && reachedIndex === last;
  const completeBg = fullyPassed ? '#16a34a' : '#1e40af';
  const completeCls = fullyPassed ? 'kv-seg-done' : 'kv-seg';
  const genericCaption =
    terminal === 'vetoed'
      ? 'Vetoed'
      : terminal === 'failed'
        ? 'Did not advance'
        : stageLabels[Math.max(0, reachedIndex)] ?? '';
  // Prefer a specific milestone (the concrete event that moved the bill) when
  // one was supplied, so the caption reads e.g. "Passed Senate 33–5" instead of
  // the generic "Passed Senate".
  const caption =
    terminal === null && specificMilestone && specificMilestone.trim() ? specificMilestone.trim() : genericCaption;
  const captionColor = terminal === 'vetoed' ? '#dc2626' : fullyPassed ? '#15803d' : '#475569';
  const captionClass = terminal === 'vetoed' ? undefined : fullyPassed ? 'kv-done-text' : 'kv-muted';
  // Short labels default to the full labels; caller passes shorter ones when
  // the full label would crowd 4 segments across the email column.
  const segLabels = shortStageLabels && shortStageLabels.length === n ? shortStageLabels : stageLabels;
  return (
    <>
      <table
        role="presentation"
        width="100%"
        cellPadding={0}
        cellSpacing={0}
        style={{ borderCollapse: 'separate', margin: '0' }}
      >
        <tbody>
          <tr>
            {stageLabels.map((_label, i) => {
              const blocked = terminal === 'vetoed' && i === last;
              const complete = i <= reachedIndex;
              const bg = blocked ? '#dc2626' : complete ? completeBg : '#e2e8f0';
              const cls = blocked ? 'kv-seg-veto' : complete ? completeCls : 'kv-track';
              return (
                <td
                  key={i}
                  width={`${Math.round(100 / n)}%`}
                  style={{ padding: i === 0 ? '0 3px 0 0' : i === last ? '0 0 0 3px' : '0 3px' }}
                >
                  <div
                    className={cls}
                    style={{ height: 6, backgroundColor: bg, borderRadius: 3, fontSize: 1, lineHeight: '6px' }}
                  >
                    &nbsp;
                  </div>
                </td>
              );
            })}
          </tr>
          {/* Per-stage labels — mirrors the site's detail-variant meter. Bold on the
              current stage so the milestone reads immediately without hunting a caption. */}
          <tr>
            {segLabels.map((label, i) => {
              const blocked = terminal === 'vetoed' && i === last;
              const complete = i <= reachedIndex;
              const isCurrent = !terminal && i === reachedIndex;
              const color = blocked
                ? '#dc2626'
                : complete
                  ? '#0f172a'
                  : '#94a3b8';
              return (
                <td
                  key={i}
                  width={`${Math.round(100 / n)}%`}
                  style={{
                    padding: i === 0 ? '4px 3px 0 0' : i === last ? '4px 0 0 3px' : '4px 3px 0',
                    fontSize: 11,
                    lineHeight: 1.25,
                    fontWeight: isCurrent ? 700 : 500,
                    color,
                    fontFamily:
                      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
                  }}
                  className={complete && !blocked ? 'kv-ink' : blocked ? undefined : 'kv-muted'}
                >
                  {label}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
      <Text
        style={{ fontSize: 12, fontWeight: 600, margin: '4px 0 0', color: captionColor }}
        className={captionClass}
      >
        {caption}
      </Text>
    </>
  );
}

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
/**
 * Progress-meter tokens, layered on top of the shared email dark-mode rules.
 *
 * These five are digest-only (no other template renders a meter), so they stay
 * here rather than in `brand.tsx`. They use the same `kv-` family so a template
 * only ever has one prefix to reason about. Same two-selector pattern as the
 * base set: media query for clients that honour `prefers-color-scheme`,
 * `[data-ogsb]` / `[data-ogsc]` for Outlook.com.
 */
const progressDarkModeStyles = `
  @media (prefers-color-scheme: dark) {
    .kv-seg { background-color: #60a5fa !important; }
    .kv-seg-done { background-color: #4ade80 !important; }
    .kv-done-text { color: #4ade80 !important; }
    .kv-track { background-color: #334155 !important; }
    .kv-seg-veto { background-color: #f87171 !important; }
  }
  [data-ogsb] .kv-seg { background-color: #60a5fa !important; }
  [data-ogsb] .kv-seg-done { background-color: #4ade80 !important; }
  [data-ogsc] .kv-done-text { color: #4ade80 !important; }
  [data-ogsb] .kv-track { background-color: #334155 !important; }
  [data-ogsb] .kv-seg-veto { background-color: #f87171 !important; }
`;

const darkModeStyles = `${EMAIL_DARK_MODE_CSS}${progressDarkModeStyles}`;

export function BillDigestEmail(props: {
  previewText: string;
  /** Absolute URL of the KYvKY logo (email clients need a hosted image). */
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
        <style dangerouslySetInnerHTML={{ __html: darkModeStyles }} />
      </Head>
      <Preview>{previewText}</Preview>
      <Body style={main} className="kv-bg">
        <Container style={container}>
          <EmailBrandHeader logoSrc={logoSrc} homeHref={homeHref} />
          <Heading style={h1} className="kv-ink">{heading}</Heading>
          <Text style={muted} className="kv-muted">{introText}</Text>
          {sections.map((section) => (
            <Section key={section.heading} style={{ marginTop: 24 }}>
              <Text style={sectionHeading} className="kv-muted">{section.heading}</Text>
              {section.groups.map((g) => (
                <Section key={g.billHref} style={billBlock} className="kv-border">
                  {/* Progress meter at the top of the block. */}
                  {g.progress && <DigestProgressMeter progress={g.progress} />}
                  {/* One anchor per group: the blue number signals the link, the
                      title rides along for a full-width target, and the plain-text
                      part prints the URL once instead of twice. */}
                  <Link href={g.billHref} style={groupLink}>
                    {g.billNumber && (
                      <strong style={numberText} className="kv-link">{g.billNumber}</strong>
                    )}
                    {g.billNumber && g.shortTitle && (
                      <span style={shortTitleText} className="kv-ink">: {g.shortTitle}</span>
                    )}
                    {g.billNumber && (g.billTitle || g.shortTitle) && <br />}
                    {g.billTitle && (
                      <span style={titleText} className="kv-ink">{g.billTitle}</span>
                    )}
                  </Link>
                  {g.alsoCalled && g.alsoCalled.length > 0 && (
                    <Text style={topicNote} className="kv-muted">
                      Also called: {g.alsoCalled.join(' · ')}
                    </Text>
                  )}
                  {g.matchedTopics && g.matchedTopics.length > 0 && (
                    <Text style={topicNote} className="kv-muted">
                      Matches your{' '}
                      {g.matchedTopics.map((t, i, arr) => (
                        <React.Fragment key={t}>
                          <Link href={topicBrowseHref(t)} style={topicLink} className="kv-muted">{t}</Link>
                          {i < arr.length - 2 ? ', ' : i === arr.length - 2 ? (arr.length > 2 ? ', and ' : ' and ') : ''}
                        </React.Fragment>
                      ))}{' '}
                      topic{g.matchedTopics.length === 1 ? '' : 's'}
                    </Text>
                  )}
                  {g.lines.map((line, i) => (
                    <Text key={i} style={lineText} className="kv-ink">
                      {line.detail}{' '}
                      <span style={mutedSm} className="kv-muted">(recorded&nbsp;{line.observedAt})</span>
                    </Text>
                  ))}
                </Section>
              ))}
            </Section>
          ))}
          {moreCount > 0 && (
            <Text style={{ marginTop: 16 }} className="kv-ink">
              {moreCount} more update{moreCount === 1 ? '' : 's'} not shown.{' '}
              <Link href={moreHref} style={inlineLink} className="kv-link">Your profile</Link>{' '}
              lists recent activity for bills and committees you follow.
              {overflowTopics && overflowTopics.length > 0 && (
                <>
                  {' '}Bills matching your topics are in the bill browser:{' '}
                  {overflowTopics.map((t, i, arr) => (
                    <React.Fragment key={t}>
                      <Link href={topicBrowseHref(t)} style={inlineLink} className="kv-link">{t}</Link>
                      {i < arr.length - 1 ? ' · ' : ''}
                    </React.Fragment>
                  ))}
                </>
              )}
            </Text>
          )}
          <Section style={{ marginTop: 32, paddingTop: 16, borderTop: '1px solid #e2e8f0' }} className="kv-border">
            <Text style={footerText} className="kv-muted">
              You&rsquo;re getting this because you follow bills, topics, or committees on Know Your Vote Kentucky.
            </Text>
            <Text style={footerText} className="kv-muted">
              Bill status lines quote the legislature&rsquo;s official action text where available. The{' '}
              <Link href={glossaryHref} style={inlineLink} className="kv-link">glossary</Link> explains the terms.
              Dates in parentheses show when Know Your Vote Kentucky recorded each update, which can lag the action itself.
            </Text>
            <Text style={footerLinks} className="kv-muted">
              <Link href={preferencesHref} style={inlineLink} className="kv-link">Change digest settings</Link>
              {' · '}
              <Link href={unsubscribeHref} style={inlineLink} className="kv-link">Unsubscribe</Link>
              {' · '}
              <Link href={privacyHref} style={inlineLink} className="kv-link">Privacy</Link>
              {' · '}
              <Link href={termsHref} style={inlineLink} className="kv-link">Terms</Link>
            </Text>
            <Text style={{ ...footerText, margin: '6px 0 0' }} className="kv-muted">
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
const shortTitleText = { fontSize: 16, color: '#1e293b', fontWeight: 600 };
const lineText = { fontSize: 13, margin: '4px 0', color: '#334155' };
const footerText = { fontSize: 12, color: '#64748b', margin: '0 0 6px', lineHeight: '1.5' };
const footerLinks = { fontSize: 12, color: '#64748b', margin: 0 };
const inlineLink = { color: '#1e40af', textDecoration: 'underline' };
