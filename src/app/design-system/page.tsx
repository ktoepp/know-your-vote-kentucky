'use client';

/**
 * Know Your Vote Kentucky — Design system reference.
 *
 * A faithful React port of the v1.1 Design System companion mocked up in Claude
 * Design (handoff exported 2026-07-22). The prototype was HTML/CSS/JS; this
 * rebuilds it in the app's own stack so it inherits the real Typekit / Instrument
 * Sans / JetBrains Mono faces (via the --font-* CSS vars) and works under our CSP.
 *
 * Layout: a sticky left rail of grouped sections + a scrolling content column.
 * Interactivity (click-to-copy swatches, tabs, pagination, modal, toggle) is real
 * React state rather than the prototype's inline handlers. Token hex values are
 * the v1.1 spec — the source of truth stays in design-system/guidelines.md and is
 * mirrored in globals.css / theme.ts / tailwind.config.js.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { KY_MAP } from './ky-map-data';

/* ------------------------------------------------------------------ tokens */

const C = {
  primary: '#1E40AF',
  primaryDark: '#1E3A8A',
  primaryLight: '#2563EB',
  primary50: '#EFF6FF',
  blueBorder: '#BFDBFE',
  bgSurface: '#FFFFFF',
  bgPage: '#F8FAFC',
  bgTertiary: '#F1F5F9',
  borderLight: '#E2E8F0',
  border: '#CBD5E1',
  textMuted: '#94A3B8',
  textTertiary: '#64748B',
  textSecondary: '#334155',
  textPrimary: '#0F172A',
  success: '#15803D',
  successTint: '#F0FDF4',
  successBorder: '#BBF7D0',
  warning: '#B45309',
  warningTint: '#FFFBEB',
  warningBorder: '#FDE68A',
  error: '#DC2626',
  errorTint: '#FEF2F2',
  errorBorder: '#FECACA',
  chamberHouse: '#0E7490',
  chamberSenate: '#6B21A8',
  partyD: '#4338CA',
  partyR: '#BE123C',
  partyI: '#C2410C',
} as const;

// Inherit the real faces the app already loads (globals.css / layout.tsx).
const FD = 'var(--font-display, Georgia, serif)'; // aesthet-nova display serif
const FS = 'var(--font-sans)'; // Instrument Sans — UI / body
const FM = 'var(--font-mono)'; // JetBrains Mono — code / token references

const NAV: { group: string; items: [string, string][] }[] = [
  { group: 'Get started', items: [['overview', 'Overview']] },
  {
    group: 'Foundations',
    items: [
      ['color', 'Color'],
      ['type', 'Typography'],
      ['space', 'Spacing & layout'],
      ['radius', 'Radius & elevation'],
    ],
  },
  {
    group: 'Components',
    items: [
      ['buttons', 'Buttons'],
      ['forms', 'Inputs & forms'],
      ['chips', 'Chips & badges'],
      ['feedback', 'Feedback & loading'],
      ['tabs', 'Tabs'],
      ['pagination', 'Pagination'],
      ['table', 'Data table'],
      ['modal', 'Modal & sheet'],
      ['tooltip', 'Tooltip'],
    ],
  },
  {
    group: 'Domain',
    items: [
      ['billcard', 'Bill card & meter'],
      ['member', 'Member card'],
      ['committee', 'Committee card'],
      ['map', 'District map'],
    ],
  },
  {
    group: 'Patterns',
    items: [
      ['nav', 'Navigation'],
      ['email', 'Email templates'],
    ],
  },
  {
    group: 'Standards',
    items: [
      ['a11y', 'Accessibility'],
      ['voice', 'Voice & tone'],
    ],
  },
];

/* --------------------------------------------------------- scoped styles */

const SCOPED_CSS = `
.ds-root{font-family:${FS};color:${C.textPrimary};background:${C.bgPage};font-size:14px;line-height:1.5;-webkit-font-smoothing:antialiased}
.ds-root ::selection{background:#DBEAFE}
.ds-root a{color:${C.primary};text-decoration:none}
.ds-root a:hover{color:${C.primaryDark}}
.ds-scroll::-webkit-scrollbar{width:10px}
.ds-scroll::-webkit-scrollbar-thumb{background:${C.border};border-radius:9999px;border:3px solid ${C.bgPage}}
@keyframes dspulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes dsspin{to{transform:rotate(360deg)}}
@keyframes dsfade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.ds-fade{animation:dsfade .25s ease}
.ds-row:first-child{border-top:0 !important}
.ds-navbtn:hover{background:${C.bgTertiary} !important}
.ds-navbtn.is-active:hover{background:${C.primary}1A !important}
.ds-cardhover{transition:box-shadow 150ms ease}
.ds-cardhover:hover{box-shadow:0 4px 12px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04)}
.ds-btn{transition:background 150ms ease}
.ds-btn:focus-visible{outline:2px solid ${C.primary};outline-offset:2px}
.ds-btn-primary:hover{background:${C.primaryDark} !important}
.ds-btn-outline:hover{background:${C.primary50} !important}
.ds-btn-text:hover{background:${C.primary50} !important}
.ds-input:focus{border-color:${C.primary} !important;box-shadow:0 0 0 3px ${C.primary50} !important}
.ds-copy{cursor:pointer}
@media (prefers-reduced-motion:reduce){.ds-root *{animation-duration:.01ms !important}}
@media (max-width:900px){
  .ds-shell{flex-direction:column !important}
  .ds-aside{position:static !important;width:auto !important;height:auto !important;border-right:0 !important;border-bottom:1px solid ${C.borderLight} !important}
  .ds-main{padding:0 !important}
  .ds-page{padding:28px 20px 72px !important}
}
`;

/* -------------------------------------------------- presentational helpers */

type Kids = React.ReactNode;

function Mono({ children }: { children: Kids }) {
  return <span style={{ fontFamily: FM, fontSize: '.9em' }}>{children}</span>;
}

function NewTag() {
  return (
    <span style={{ color: C.success, fontSize: 12, fontWeight: 700 }}> ★ new</span>
  );
}

function Page({
  kicker,
  title,
  lede,
  children,
}: {
  kicker: string;
  title: string;
  lede?: Kids;
  children: Kids;
}) {
  return (
    <div className="ds-page ds-fade" style={{ padding: '44px 52px 96px' }}>
      <div style={{ maxWidth: 920 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '.11em',
            textTransform: 'uppercase',
            color: C.primary,
            marginBottom: 10,
          }}
        >
          {kicker}
        </div>
        <h1
          style={{
            fontFamily: FD,
            fontWeight: 500,
            fontSize: 40,
            lineHeight: 1.15,
            letterSpacing: 0,
            margin: '0 0 12px',
            color: C.textPrimary,
          }}
        >
          {title}
        </h1>
        {lede ? (
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: C.textSecondary,
              maxWidth: '66ch',
              margin: '0 0 34px',
            }}
          >
            {lede}
          </p>
        ) : (
          <div style={{ height: 14 }} />
        )}
        {children}
      </div>
    </div>
  );
}

function H2({ children, sub }: { children: Kids; sub?: Kids }) {
  return (
    <>
      <h2
        style={{
          fontFamily: FD,
          fontWeight: 500,
          fontSize: 24,
          letterSpacing: 0,
          margin: '44px 0 4px',
          color: C.textPrimary,
        }}
      >
        {children}
      </h2>
      {sub ? (
        <p style={{ fontSize: 13, color: C.textTertiary, margin: '0 0 18px', maxWidth: '64ch' }}>
          {sub}
        </p>
      ) : (
        <div style={{ height: 14 }} />
      )}
    </>
  );
}

function Card({ children, style }: { children: Kids; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: C.bgSurface,
        border: `1px solid ${C.borderLight}`,
        borderRadius: 12,
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

function Cap({ children }: { children: Kids }) {
  return (
    <div
      style={{
        fontFamily: FM,
        fontSize: 10,
        fontWeight: 600,
        letterSpacing: '.05em',
        textTransform: 'uppercase',
        color: C.textMuted,
        marginBottom: 12,
      }}
    >
      {children}
    </div>
  );
}

function Example({
  caption,
  children,
  style,
}: {
  caption: Kids;
  children: Kids;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.bgSurface,
        border: `1px solid ${C.borderLight}`,
        borderRadius: 12,
        padding: 20,
        ...style,
      }}
    >
      <Cap>{caption}</Cap>
      {children}
    </div>
  );
}

function Callout({ children, style }: { children: Kids; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        background: C.primary50,
        border: `1px solid ${C.blueBorder}`,
        borderRadius: 10,
        padding: '14px 16px',
        fontSize: 13,
        color: C.textSecondary,
        lineHeight: 1.6,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

type BtnKind = 'primary' | 'dark' | 'outline' | 'text' | 'disabled' | 'focus';

function Btn({
  kind = 'primary',
  children,
  style,
  ...rest
}: {
  kind?: BtnKind;
  children: Kids;
  style?: React.CSSProperties;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const base: React.CSSProperties = {
    fontFamily: FS,
    fontSize: 13.5,
    fontWeight: 600,
    borderRadius: 8,
    padding: '0 20px',
    minHeight: 44,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    cursor: 'pointer',
    border: '1px solid transparent',
  };
  const map: Record<BtnKind, React.CSSProperties> = {
    primary: { background: C.primary, color: '#fff' },
    dark: { background: C.primaryDark, color: '#fff' },
    outline: { background: '#fff', color: C.primary, borderColor: C.primary },
    text: { background: 'transparent', color: C.primary },
    disabled: { background: C.bgTertiary, color: C.textMuted, cursor: 'not-allowed' },
    focus: {
      background: C.primary,
      color: '#fff',
      outline: `2px solid ${C.primary}`,
      outlineOffset: 2,
    },
  };
  const cls =
    kind === 'outline'
      ? 'ds-btn ds-btn-outline'
      : kind === 'text'
        ? 'ds-btn ds-btn-text'
        : kind === 'primary'
          ? 'ds-btn ds-btn-primary'
          : 'ds-btn';
  return (
    <button
      className={cls}
      disabled={kind === 'disabled'}
      style={{ ...base, ...map[kind], ...style }}
      {...rest}
    >
      {children}
    </button>
  );
}

function Chip({
  children,
  bg,
  fg,
  bd,
  style,
}: {
  children: Kids;
  bg: string;
  fg: string;
  bd?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        borderRadius: 9999,
        padding: '4px 12px',
        fontSize: 12,
        fontWeight: 600,
        background: bg,
        color: fg,
        border: `1px solid ${bd || 'transparent'}`,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

/* progress meter shared by the bill card + meter section */
type Seg = { label: string; state: 'complete' | 'done' | 'up' | 'blocked' };
function Meter({ segs }: { segs: Seg[] }) {
  const segbg = { complete: C.primary, done: C.success, up: C.bgTertiary, blocked: C.error };
  const labcol = { complete: C.textPrimary, done: C.textPrimary, up: C.textMuted, blocked: C.error };
  return (
    <>
      <div
        style={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: '1fr',
          gap: 6,
          marginBottom: 7,
        }}
      >
        {segs.map((s, i) => (
          <div
            key={i}
            style={{
              height: 8,
              borderRadius: 9999,
              background: segbg[s.state],
              backgroundImage:
                s.state === 'blocked'
                  ? 'repeating-linear-gradient(45deg,rgba(255,255,255,.4) 0,rgba(255,255,255,.4) 2px,transparent 2px,transparent 5px)'
                  : undefined,
            }}
          />
        ))}
      </div>
      <div
        style={{
          display: 'grid',
          gridAutoFlow: 'column',
          gridAutoColumns: '1fr',
          gap: 6,
          fontSize: 11,
        }}
      >
        {segs.map((s, i) => (
          <span
            key={i}
            style={{
              color: labcol[s.state],
              fontWeight: s.state === 'up' ? 400 : 600,
              lineHeight: 1.15,
            }}
          >
            {s.label}
          </span>
        ))}
      </div>
    </>
  );
}

/* click-to-copy color swatch */
function relLum(hex: string): number {
  const m = hex.slice(1).match(/../g);
  if (!m) return 1;
  const c = m.map((h) => parseInt(h, 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function Swatch({
  name,
  val,
  note,
  copied,
  onCopy,
}: {
  name: string;
  val: string;
  note?: string;
  copied: string | null;
  onCopy: (v: string) => void;
}) {
  const isHex = /^#([0-9a-f]{2}){3}$/i.test(val);
  const fg = isHex && relLum(val) < 0.4 ? '#FFFFFF' : C.textPrimary;
  const on = copied === val;
  return (
    <div
      className="ds-copy"
      role="button"
      tabIndex={0}
      onClick={() => onCopy(val)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onCopy(val);
        }
      }}
      style={{
        border: `1px solid ${C.borderLight}`,
        borderRadius: 10,
        overflow: 'hidden',
        background: '#fff',
      }}
    >
      <div
        style={{
          height: 60,
          background: val,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'flex-end',
          padding: '6px 8px',
        }}
      >
        <span style={{ fontSize: 10, color: fg, opacity: 0.75, fontFamily: FM }}>{val}</span>
      </div>
      <div style={{ padding: '8px 10px 9px' }}>
        <div style={{ fontSize: 11.5, fontWeight: 600, fontFamily: FM }}>{name}</div>
        <div style={{ fontSize: 10.5, color: C.textTertiary, marginTop: 2 }}>
          {note}{' '}
          <span style={{ fontFamily: FS, fontSize: 10, color: on ? C.success : C.textMuted }}>
            {on ? 'copied ✓' : 'copy'}
          </span>
        </div>
      </div>
    </div>
  );
}

function SwatchGrid({
  items,
  copied,
  onCopy,
}: {
  items: [string, string, string?][];
  copied: string | null;
  onCopy: (v: string) => void;
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))',
        gap: 12,
        marginBottom: 8,
      }}
    >
      {items.map((a) => (
        <Swatch key={a[0] + a[1]} name={a[0]} val={a[1]} note={a[2]} copied={copied} onCopy={onCopy} />
      ))}
    </div>
  );
}

const INPUT_BASE: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  background: '#fff',
  borderRadius: 8,
  padding: '0 12px',
  fontSize: 13,
  fontFamily: FS,
  color: C.textPrimary,
  outline: 'none',
  boxSizing: 'border-box',
  border: `1px solid ${C.border}`,
};

/* ------------------------------------------------------------- sections */

function SecOverview() {
  const kpi = (n: string, l: string) => (
    <div style={{ flex: 1, minWidth: 140 }}>
      <div style={{ fontFamily: FD, fontWeight: 500, fontSize: 34, color: C.primary, lineHeight: 1 }}>
        {n}
      </div>
      <div style={{ fontSize: 12.5, color: C.textTertiary, marginTop: 6 }}>{l}</div>
    </div>
  );
  const principle = (n: string, t: string, d: string) => (
    <div
      className="ds-row"
      style={{ display: 'flex', gap: 14, padding: '18px 0', borderTop: `1px solid ${C.borderLight}` }}
    >
      <div
        style={{
          flex: 'none',
          width: 28,
          height: 28,
          borderRadius: 8,
          background: C.primary50,
          color: C.primary,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
        }}
      >
        {n}
      </div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 3 }}>{t}</div>
        <div style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.55, maxWidth: '60ch' }}>
          {d}
        </div>
      </div>
    </div>
  );
  const inside: [string, string][] = [
    ['Foundations', 'Color, type scale, spacing, radius & elevation: the tokens of record.'],
    ['Components', 'Buttons, forms, chips, feedback, and the new tabs / pagination / modal / tooltip specs.'],
    ['Domain', 'Bill card + progress meter, member and committee cards.'],
    ['Patterns', 'Navigation, marketing hero, and the welcome / digest emails.'],
    ['Standards', 'The AA accessibility floor and the non-partisan voice guide.'],
    ['Refinements', 'Proposed token, spacing, and hierarchy improvements, flagged but not yet shipped.'],
  ];
  return (
    <Page
      kicker="Know Your Vote Kentucky"
      title="Design system"
      lede={
        <>
          A living reference for the tokens and patterns behind KYvKY. This companion renders the
          v1.1 spec. The source of truth stays in <Mono>guidelines.md</Mono>, mirrored in{' '}
          <Mono>globals.css</Mono>, <Mono>theme.ts</Mono>, and <Mono>tailwind.config.js</Mono>.
        </>
      }
    >
      <Card style={{ marginBottom: 8 }}>
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
          {kpi('8px', 'base spacing unit')}
          {kpi('AA', 'contrast floor, never a stretch goal')}
          {kpi('3', 'radius steps · 8 / 24 / full')}
        </div>
      </Card>
      <H2 sub="The product reads as one trustworthy, neutral, accessible civic reference, closer to a reliable government tracking service than to a startup.">
        Principles
      </H2>
      <div
        style={{
          background: '#fff',
          border: `1px solid ${C.borderLight}`,
          borderRadius: 12,
          padding: '6px 24px 18px',
        }}
      >
        {principle(
          '1',
          'Legible over decorative',
          'Dense legislative data, 1,400+ bills a session, has to scan. Whitespace, hierarchy, and restraint beat ornament.',
        )}
        {principle(
          '2',
          'Neutral, never editorial',
          'Color must not imply a political position. A brand-critical constraint, not a preference.',
        )}
        {principle(
          '3',
          'Accessible by default',
          'WCAG 2.1 AA is the floor. Every text pairing ≥4.5:1; every control has a visible focus ring and a 44px target.',
        )}
        {principle(
          '4',
          'One token, one meaning',
          'A single semantic set. No duplicate keys that let two components drift apart.',
        )}
      </div>
      <H2>What&apos;s inside</H2>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill,minmax(210px,1fr))',
          gap: 12,
        }}
      >
        {inside.map((c) => (
          <div
            key={c[0]}
            style={{
              background: '#fff',
              border: `1px solid ${C.borderLight}`,
              borderRadius: 12,
              padding: '16px 16px 15px',
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>{c[0]}</div>
            <div style={{ fontSize: 12.5, color: C.textTertiary, lineHeight: 1.5 }}>{c[1]}</div>
          </div>
        ))}
      </div>
    </Page>
  );
}

function SecColor({ copied, onCopy }: { copied: string | null; onCopy: (v: string) => void }) {
  return (
    <Page
      kicker="Foundations"
      title="Color"
      lede="One brand blue, a slate neutral ramp, three semantic states, and distinct chamber & party hues that never imply a position."
    >
      <H2
        sub={
          <>
            One blue carries brand, links, active nav, and the focus ring. There is no separate{' '}
            <Mono>--info</Mono> hue. It aliases <Mono>--primary</Mono> on purpose.
          </>
        }
      >
        Brand
      </H2>
      <SwatchGrid
        copied={copied}
        onCopy={onCopy}
        items={[
          ['--primary', '#1E40AF', 'primary actions, links'],
          ['--primary-dark', '#1E3A8A', 'hover / pressed'],
          ['--primary-light', '#2563EB', 'gradient partner'],
          ['--primary-50', '#EFF6FF', 'tint fills, selected rows'],
        ]}
      />
      <H2
        sub={
          <>
            Backgrounds, borders, and the four text roles. Note the split: <Mono>--text-muted</Mono>{' '}
            is non-text only.
          </>
        }
      >
        Neutrals: slate ramp
      </H2>
      <SwatchGrid
        copied={copied}
        onCopy={onCopy}
        items={[
          ['--bg-surface', '#FFFFFF', 'cards, app bar'],
          ['--bg-page', '#F8FAFC', 'page background'],
          ['--bg-tertiary', '#F1F5F9', 'hover fills, wells'],
          ['--border-light', '#E2E8F0', 'hairline dividers'],
          ['--border', '#CBD5E1', 'input borders'],
          ['--text-muted', '#94A3B8', 'non-text · fails AA as body'],
          ['--text-tertiary', '#64748B', 'metadata · 4.8:1 ✓'],
          ['--text-secondary', '#334155', 'supporting copy'],
          ['--text-primary', '#0F172A', 'body & headings'],
        ]}
      />
      <H2
        sub={
          <>
            v1.1 promoted success and warning to their AA-passing values. The brighter originals
            survive only as <Mono>*-light</Mono> for non-text fills (≥3:1).
          </>
        }
      >
        Semantic
      </H2>
      <SwatchGrid
        copied={copied}
        onCopy={onCopy}
        items={[
          ['--success', '#15803D', 'became law · 5.0:1 ✓'],
          ['--success-tint', '#F0FDF4', 'badge bg'],
          ['--warning', '#B45309', 'caution · 4.5:1 ✓'],
          ['--warning-tint', '#FFFBEB', 'badge bg'],
          ['--error', '#DC2626', 'vetoed / failed · 4.5:1 ✓'],
          ['--error-tint', '#FEF2F2', 'badge bg'],
        ]}
      />
      <H2
        sub="Approved refinement. The badge border tints were three loose hexes. They're now first-class tokens so the tint family stays one system."
      >
        Semantic borders
        <NewTag />
      </H2>
      <SwatchGrid
        copied={copied}
        onCopy={onCopy}
        items={[
          ['--success-border', '#BBF7D0', 'success badge outline'],
          ['--warning-border', '#FDE68A', 'warning badge outline'],
          ['--error-border', '#FECACA', 'error badge outline'],
        ]}
      />
      <H2 sub="Party hues are deliberately distinct from brand blue and error red so a badge never reads as editorial alignment. The D / R / I letter carries the meaning, and color is secondary.">
        Chamber &amp; party
      </H2>
      <SwatchGrid
        copied={copied}
        onCopy={onCopy}
        items={[
          ['--chamber-house', '#0E7490', 'House (cyan-700)'],
          ['--chamber-senate', '#6B21A8', 'Senate (purple-700)'],
          ['--party-d', '#4338CA', 'Democratic · indigo'],
          ['--party-r', '#BE123C', 'Republican · rose'],
          ['--party-i', '#C2410C', 'Independent · orange'],
        ]}
      />
      <Callout style={{ marginTop: 10 }}>
        <strong>Select any swatch to copy its hex.</strong> Contrast ratios shown are measured
        against <Mono>--bg-surface</Mono> (#FFFFFF) with the WCAG relative-luminance formula.
      </Callout>
    </Page>
  );
}

function SecType() {
  const label: React.CSSProperties = {
    flex: 'none',
    width: 150,
    fontFamily: FM,
    fontSize: 10.5,
    color: C.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: '.04em',
  };
  const disp = (px: number, l: React.ReactNode, txt: string) => (
    <div
      className="ds-row"
      style={{ display: 'flex', alignItems: 'baseline', gap: 20, padding: '16px 0', borderTop: `1px solid ${C.borderLight}` }}
    >
      <div style={label}>{l}</div>
      <div style={{ fontFamily: FD, fontWeight: 500, fontSize: px, lineHeight: 1.2, color: C.textPrimary }}>
        {txt}
      </div>
    </div>
  );
  const sans = (
    px: number,
    wt: number,
    l: string,
    col: string,
    txt: string,
    extra?: React.CSSProperties,
  ) => (
    <div
      className="ds-row"
      style={{ display: 'flex', alignItems: 'baseline', gap: 20, padding: '14px 0', borderTop: `1px solid ${C.borderLight}` }}
    >
      <div style={label}>{l}</div>
      <div style={{ fontSize: px, fontWeight: wt, color: col, ...extra }}>{txt}</div>
    </div>
  );
  return (
    <Page
      kicker="Foundations"
      title="Typography"
      lede="A serif display face for headings, Instrument Sans for everything else. Sentence case throughout."
    >
      <Card>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div style={{ fontFamily: FD, fontWeight: 500, fontSize: 44, lineHeight: 1, marginBottom: 8 }}>
              Aa
            </div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              Aesthet Nova <span style={{ fontWeight: 400, color: C.textTertiary }}>· display / headings</span>
            </div>
            <div style={{ fontSize: 12.5, color: C.textTertiary, marginTop: 4, lineHeight: 1.5 }}>
              Serif, weight 500. Served via Typekit; a size-adjusted Georgia fallback prevents layout
              shift. Licensing is still open (decision #1). Georgia is the shipping fallback and is
              what you see rendered here.
            </div>
          </div>
          <div>
            <div style={{ fontSize: 44, fontWeight: 600, lineHeight: 1, marginBottom: 8 }}>Aa</div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              Instrument Sans <span style={{ fontWeight: 400, color: C.textTertiary }}>· UI / body</span>
            </div>
            <div style={{ fontSize: 12.5, color: C.textTertiary, marginTop: 4, lineHeight: 1.5 }}>
              Weights 400 / 500 / 600. Default for all interface and body text. JetBrains Mono is
              reserved for code and token references.
            </div>
          </div>
        </div>
      </Card>
      <H2 sub="Serif · weight 500 · line-height 1.4 · letter-spacing 0.">Display scale</H2>
      <div style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: '8px 24px 20px' }}>
        {disp(40, 'h1 · 2.5rem', 'Know Your Vote Kentucky')}
        {disp(30, 'h2 · 1.875rem', 'Bills, members & committees')}
        {disp(26, 'h3 · 1.625rem', 'Passed the House')}
        {disp(22, 'h4 · 1.375rem', 'Sponsored by')}
        {disp(18, 'h5 · 1.125rem', 'Committee assignment')}
        {disp(16, 'h6 · 1rem', 'Last recorded action')}
      </div>
      <H2
        sub={
          <>
            Sans. Metadata sits on <Mono>--text-tertiary</Mono>, never <Mono>--text-muted</Mono>.
          </>
        }
      >
        Text &amp; UI scale
      </H2>
      <div style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: '8px 24px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 20, padding: '14px 0' }}>
          <div style={label}>
            lead · 16 <NewTag />
          </div>
          <div style={{ fontSize: 16, fontWeight: 400, color: C.textSecondary, lineHeight: 1.6 }}>
            Track a Kentucky bill from introduction to law, and get a plain-language update when it
            moves.
          </div>
        </div>
        {sans(15, 600, 'subtitle1 · 15', C.textPrimary, 'The quick brown fox watches the General Assembly.')}
        {sans(14, 400, 'body1 · 14', C.textPrimary, 'The quick brown fox watches the General Assembly.')}
        {sans(13, 400, 'body2 · 13', C.textSecondary, 'The quick brown fox watches the General Assembly.')}
        {sans(12, 400, 'caption · 12', C.textTertiary, 'Last action · today')}
        {sans(12, 500, 'overline · 12', C.textTertiary, 'Primary sponsor', {
          textTransform: 'uppercase',
          letterSpacing: '.08em',
        })}
      </div>
    </Page>
  );
}

function SecSpace() {
  const step = (n: number) => {
    const px = n * 8;
    return (
      <div key={n} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 'none', width: 64, fontFamily: FM, fontSize: 11, color: C.textTertiary }}>
          {px}px
        </div>
        <div style={{ height: 16, width: px, background: C.primary, borderRadius: 3, opacity: 0.85 }} />
        <div style={{ fontSize: 12, color: C.textMuted }}>spacing({n})</div>
      </div>
    );
  };
  return (
    <Page
      kicker="Foundations"
      title="Spacing & layout"
      lede="An 8px rhythm and a 1200px content column keep dense pages calm and scannable."
    >
      <H2 sub="All spacing is a multiple of 8. Use the scale, not arbitrary values.">8px base unit</H2>
      <Card>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[1, 2, 3, 4, 6, 8].map(step)}
        </div>
      </Card>
      <H2>Layout</H2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Card>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Content width</div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.55 }}>
            Max <Mono>1200px</Mono>, via MUI <Mono>Container maxWidth=&quot;lg&quot;</Mono>.
          </div>
        </Card>
        <Card>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6 }}>Card grid</div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.55 }}>
            1 col mobile → 2 tablet → 3 desktop, gap <Mono>spacing(3)</Mono> (24px).
          </div>
        </Card>
      </div>
      <div style={{ marginTop: 14 }}>
        <Card>
          <div
            style={{
              fontWeight: 600,
              color: C.textTertiary,
              textTransform: 'uppercase',
              letterSpacing: '.06em',
              fontSize: 11,
              marginBottom: 12,
            }}
          >
            Responsive card grid
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{ height: 70, background: C.bgTertiary, border: `1px solid ${C.borderLight}`, borderRadius: 12 }}
              />
            ))}
          </div>
        </Card>
      </div>
    </Page>
  );
}

function SecRadius() {
  const r = (label: string, val: string, demo: React.ReactNode) => (
    <div style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 20, textAlign: 'center' }}>
      <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
        {demo}
      </div>
      <div style={{ fontFamily: FM, fontSize: 12, fontWeight: 600 }}>{val}</div>
      <div style={{ fontSize: 11.5, color: C.textTertiary, marginTop: 3 }}>{label}</div>
    </div>
  );
  const elev = (shadow: string | undefined, name: string, note: string) => (
    <div style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 22, textAlign: 'center' }}>
      <div
        style={{
          height: 60,
          background: '#fff',
          border: shadow ? undefined : `1px solid ${C.borderLight}`,
          borderRadius: 10,
          marginBottom: 12,
          boxShadow: shadow,
        }}
      />
      <div style={{ fontFamily: FM, fontSize: 11.5, fontWeight: 600 }}>{name}</div>
      <div style={{ fontSize: 11, color: C.textTertiary, marginTop: 3 }}>{note}</div>
    </div>
  );
  return (
    <Page
      kicker="Foundations"
      title="Radius & elevation"
      lede="Eight-pixel controls, 24px cards, full pills. Elevation stays flat, and a hairline border separates."
    >
      <H2 sub="Three deliberate steps, no accidental drift.">Radius</H2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {r(
          'buttons, inputs, chips-as-rect, alerts',
          '--radius · 8px',
          <div style={{ width: 110, height: 44, background: C.primary50, border: `1.5px solid ${C.primary}`, borderRadius: 8 }} />,
        )}
        {r(
          'CivicCard bill / member / committee tiles',
          '--radius-lg · 24px',
          <div style={{ width: 110, height: 56, background: C.bgTertiary, border: `1px solid ${C.borderLight}`, borderRadius: 24 }} />,
        )}
        {r(
          'pills, chips, avatars, meter segments',
          '--radius-full · 9999px',
          <div style={{ width: 110, height: 30, background: C.bgTertiary, border: `1px solid ${C.borderLight}`, borderRadius: 9999 }} />,
        )}
      </div>
      <H2 sub="Flat by default. Borders separate; shadow signals interactivity only. Cards default to elevation 0 + a 1px border.">
        Elevation
      </H2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {elev(undefined, 'flat + 1px border', 'default surface')}
        {elev('0 1px 2px rgba(15,23,42,.04)', '--shadow-sm', 'rare, subtle raise')}
        {elev('0 4px 12px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04)', '--shadow-md', 'tooltips, popovers, hover')}
      </div>
    </Page>
  );
}

function SecButtons() {
  return (
    <Page
      kicker="Components"
      title="Buttons"
      lede="Three weights, sentence-case labels, a 44px floor, and no shadow. The label names where the action goes."
    >
      <H2 sub="Contained for the primary action, outlined for secondary, text for tertiary. One primary action per view.">
        Variants
      </H2>
      <Example caption="variant">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <Btn kind="primary">Browse bills →</Btn>
          <Btn kind="outline">Secondary</Btn>
          <Btn kind="text">Text action</Btn>
        </div>
      </Example>
      <H2>States</H2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        <Example caption="default">
          <Btn kind="primary">Follow bill</Btn>
        </Example>
        <Example caption="hover">
          <Btn kind="dark">Follow bill</Btn>
        </Example>
        <Example caption="focus-visible · 2px ring">
          <div style={{ padding: 2 }}>
            <Btn kind="focus">Follow bill</Btn>
          </div>
        </Example>
        <Example caption="disabled">
          <Btn kind="disabled">Follow bill</Btn>
        </Example>
      </div>
      <H2>Rules</H2>
      <Callout style={{ padding: '16px 18px', fontSize: 13.5, lineHeight: 1.7 }}>
        · Sentence case labels: <em>Browse bills</em>, never <em>BROWSE BILLS</em> or <em>Explore Bills</em>.
        <br />· 8px radius · 44px minimum height (touch target) · no drop shadow.
        <br />· CTAs name the destination: <em>Browse bills →</em>, not <em>Start following today →</em>.
        <br />· Exactly one contained (primary) button per view.
      </Callout>
    </Page>
  );
}

function ToggleSwitch() {
  const [on, setOn] = useState(true);
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
      <button
        role="switch"
        aria-checked={on}
        aria-label="Email me these updates"
        onClick={() => setOn((v) => !v)}
        style={{
          width: 40,
          height: 24,
          border: 0,
          borderRadius: 9999,
          background: on ? C.primary : C.border,
          position: 'relative',
          cursor: 'pointer',
          padding: 0,
          transition: 'background 150ms ease',
          flex: 'none',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: 3,
            width: 18,
            height: 18,
            borderRadius: 9999,
            background: '#fff',
            transition: 'transform 150ms ease',
            transform: on ? 'translateX(16px)' : 'translateX(0)',
          }}
        />
      </button>{' '}
      Email me these updates
    </label>
  );
}

function SecForms() {
  const fieldLabel: React.CSSProperties = {
    display: 'block',
    fontSize: 12.5,
    fontWeight: 600,
    color: C.textSecondary,
    marginBottom: 6,
  };
  const help = (col: string, txt: React.ReactNode) => (
    <div style={{ fontSize: 11.5, color: col, marginTop: 6 }}>{txt}</div>
  );
  return (
    <Page
      kicker="Components"
      title="Inputs & forms"
      lede={
        <>
          Labelled fields, a 2px focus ring, and validation that always pairs color with words and an
          icon. Device-neutral copy: <em>select</em>, never <em>tap</em>.
        </>
      }
    >
      <H2 sub="Every input has a visible label. Select a field to see the focus ring. Error and success pair color with text and an icon, never color alone.">
        Text inputs
      </H2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Example caption="editable, try typing">
          <div style={{ marginBottom: 18 }}>
            <label style={fieldLabel}>Email address</label>
            <input className="ds-input" type="email" placeholder="you@example.com" style={INPUT_BASE} />
          </div>
          <div>
            <label style={fieldLabel}>Search bills</label>
            <input className="ds-input" placeholder="HB 199 school funding" style={INPUT_BASE} />
          </div>
        </Example>
        <Example caption="validation">
          <div style={{ marginBottom: 18 }}>
            <label style={fieldLabel}>Email address</label>
            <input defaultValue="not-an-email" style={{ ...INPUT_BASE, border: `1px solid ${C.error}` }} />
            {help(C.error, '⃠ Enter a valid email address.')}
          </div>
          <div>
            <label style={fieldLabel}>Address</label>
            <input
              defaultValue="100 Capitol Ave, Frankfort"
              style={{ ...INPUT_BASE, border: `1px solid ${C.success}` }}
            />
            {help(C.success, '✓ Address recognized.')}
          </div>
        </Example>
      </div>
      <H2>Textarea, select &amp; search</H2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Example caption="select + textarea">
          <div style={{ marginBottom: 18 }}>
            <label style={fieldLabel}>Digest frequency</label>
            <select
              className="ds-input"
              style={{
                ...INPUT_BASE,
                appearance: 'none',
                WebkitAppearance: 'none',
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath d='M2 4l4 4 4-4' stroke='%2364748B' stroke-width='1.5' fill='none'/%3E%3C/svg%3E\")",
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 14px center',
                paddingRight: 36,
                cursor: 'pointer',
              }}
            >
              <option>Weekly</option>
              <option>Daily</option>
              <option>Off</option>
            </select>
          </div>
          <div>
            <label style={fieldLabel}>Editor note</label>
            <textarea
              className="ds-input"
              placeholder="Add context for readers…"
              style={{
                ...INPUT_BASE,
                minHeight: 80,
                padding: '10px 12px',
                resize: 'vertical',
                lineHeight: 1.5,
              }}
            />
          </div>
        </Example>
        <Example caption="search field">
          <div style={{ position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: C.textTertiary,
                pointerEvents: 'none',
                fontSize: 26,
                lineHeight: 1,
              }}
            >
              ⌕
            </span>
            <input className="ds-input" placeholder="Search 1,400+ bills…" style={{ ...INPUT_BASE, paddingLeft: 48 }} />
          </div>
        </Example>
      </div>
      <H2 sub="Real, working controls: toggle the checkboxes, pick a delivery cadence, flip the switch.">
        Choice controls
      </H2>
      <Example caption="checkbox · radio · toggle">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontSize: 13.5 }}>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
              <input type="checkbox" defaultChecked style={{ width: 18, height: 18, accentColor: C.primary, cursor: 'pointer' }} />{' '}
              Committee action
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 18, height: 18, accentColor: C.primary, cursor: 'pointer' }} /> Floor votes
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
              <input type="checkbox" style={{ width: 18, height: 18, accentColor: C.primary, cursor: 'pointer' }} /> Signed / vetoed
            </label>
          </div>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
              <input type="radio" name="cadence" defaultChecked style={{ width: 18, height: 18, accentColor: C.primary, cursor: 'pointer' }} />{' '}
              Daily
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 9, cursor: 'pointer' }}>
              <input type="radio" name="cadence" style={{ width: 18, height: 18, accentColor: C.primary, cursor: 'pointer' }} /> Weekly
            </label>
          </div>
          <ToggleSwitch />
        </div>
      </Example>
    </Page>
  );
}

function SecChips() {
  const dot = (txt: string, bg: string) => (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 26,
        height: 26,
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 700,
        background: bg,
        color: '#fff',
      }}
    >
      {txt}
    </span>
  );
  return (
    <Page
      kicker="Components"
      title="Chips & badges"
      lede="Pill tags for topics, chamber, party, and status. Status hue is load-bearing. Party leans on the letter, not the color."
    >
      <H2 sub="Neutral pills for subject tags and metadata. Automated tagging, so they never over-claim.">
        Topic &amp; meta
      </H2>
      <Example caption="topic">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {['Education', 'Health', 'Taxation', 'Elections', 'Agriculture', 'Public safety'].map((t) => (
            <Chip key={t} bg={C.bgTertiary} fg={C.textSecondary} bd={C.borderLight}>
              {t}
            </Chip>
          ))}
        </div>
      </Example>
      <H2 sub="Solid fills with white text. Party carries the D / R / I letter so meaning survives without color.">
        Chamber &amp; party
      </H2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <Example caption="chamber">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Chip bg={C.chamberHouse} fg="#fff">
              House
            </Chip>
            <Chip bg={C.chamberSenate} fg="#fff">
              Senate
            </Chip>
          </div>
        </Example>
        <Example caption="party">
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            {dot('D', C.partyD)}
            {dot('R', C.partyR)}
            {dot('I', C.partyI)}
            <Chip bg={C.partyD} fg="#fff">
              Rep. Adkins · D
            </Chip>
          </div>
        </Example>
      </div>
      <H2 sub="Status keeps its semantic hue, never wiped to gray. Tint + dark text for inline badges, solid + white for standalone markers.">
        Status
      </H2>
      <Example caption="status badges">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Chip bg={C.successTint} fg={C.success} bd={C.successBorder}>
            ✓ Became law
          </Chip>
          <Chip bg={C.errorTint} fg={C.error} bd={C.errorBorder}>
            Vetoed
          </Chip>
          <Chip bg={C.bgTertiary} fg={C.textSecondary} bd={C.borderLight}>
            In committee
          </Chip>
          <Chip bg={C.warningTint} fg={C.warning} bd={C.warningBorder}>
            Caution
          </Chip>
          <Chip bg={C.warning} fg="#fff">
            Solid warning
          </Chip>
        </div>
      </Example>
      <H2>Removable &amp; sizes</H2>
      <Example caption="removable filter · small">
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip bg={C.primary50} fg={C.primary} bd={C.blueBorder}>
            Education ✕
          </Chip>
          <Chip bg={C.primary50} fg={C.primary} bd={C.blueBorder}>
            Passed House ✕
          </Chip>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 9999,
              padding: '2px 9px',
              fontSize: 11,
              fontWeight: 600,
              background: C.bgTertiary,
              color: C.textTertiary,
            }}
          >
            +3 more
          </span>
        </div>
      </Example>
    </Page>
  );
}

function SecFeedback() {
  const skel = (w: string) => (
    <div
      style={{
        height: 12,
        width: w,
        background: C.bgTertiary,
        borderRadius: 6,
        animation: 'dspulse 1.5s ease-in-out infinite',
        marginBottom: 9,
      }}
    />
  );
  const toast = (accent: string, icon: string, msg: string) => (
    <div
      style={{
        display: 'flex',
        gap: 11,
        alignItems: 'center',
        background: '#fff',
        border: `1px solid ${C.borderLight}`,
        boxShadow: '0 4px 12px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04)',
        borderRadius: 8,
        padding: '12px 16px',
        fontSize: 13,
      }}
    >
      <span style={{ color: accent, fontWeight: 700 }}>{icon}</span>
      {msg}
    </div>
  );
  return (
    <Page
      kicker="Components"
      title="Feedback & loading"
      lede="Skeletons, spinner, progress, toasts, and empty states: quiet, reduced-motion aware, never the only signal for an error."
    >
      <H2 sub="Skeletons match the real element's box. A spinner covers indeterminate waits over ~400ms. Both freeze under reduced motion.">
        Loading
      </H2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <Example caption="skeleton">
          <div>
            {skel('60%')}
            {skel('92%')}
            {skel('74%')}
          </div>
        </Example>
        <Example caption="spinner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 12.5, color: C.textTertiary }}>
            <span
              style={{
                width: 26,
                height: 26,
                borderRadius: 9999,
                border: `3px solid ${C.borderLight}`,
                borderTopColor: C.primary,
                display: 'inline-block',
                animation: 'dsspin .8s linear infinite',
              }}
            />{' '}
            Loading bills…
          </div>
        </Example>
        <Example caption="determinate progress">
          <div style={{ background: C.bgTertiary, borderRadius: 9999, height: 8, overflow: 'hidden' }}>
            <div style={{ width: '64%', height: '100%', background: C.primary, borderRadius: 9999 }} />
          </div>
          <div style={{ fontSize: 11.5, color: C.textTertiary, marginTop: 8 }}>Syncing dataset · 64%</div>
        </Example>
      </div>
      <H2 sub="Bottom of screen, colored icon, sentence-case message, auto-dismiss ~5s. Never the only signal for an error.">
        Toasts
      </H2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 420 }}>
        {toast(C.success, '✓', 'Your changes were saved.')}
        {toast(C.error, '⃠', 'That update could not be saved. Try again.')}
        {toast(C.primary, 'i', "You're now following HB 199.")}
      </div>
      <H2 sub="Neutral message, optional single next action. No blame, no exclamation.">Empty state</H2>
      <Example caption="empty">
        <div style={{ textAlign: 'center', padding: '22px 12px' }}>
          <div style={{ width: 44, height: 44, borderRadius: 9999, background: C.bgTertiary, margin: '0 auto 14px' }} />
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5 }}>No items match your filters.</div>
          <div style={{ fontSize: 12.5, color: C.textTertiary, marginBottom: 16 }}>
            Try removing a topic or chamber filter.
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Btn kind="outline">Clear filters</Btn>
          </div>
        </div>
      </Example>
    </Page>
  );
}

function SecTabs() {
  const [tab, setTab] = useState('overview');
  const tabs: [string, string][] = [
    ['overview', 'Overview'],
    ['sponsors', 'Sponsors'],
    ['history', 'Action history'],
    ['votes', 'Votes'],
  ];
  const panels: Record<string, string> = {
    overview: 'A plain-language summary of what the bill does and where it currently sits in the process.',
    sponsors: 'Primary and co-sponsors, each with party and chamber, linked to their member page.',
    history: 'The recorded legislative actions in order, each stamped with the date our sync observed it.',
    votes: 'Roll-call results by chamber, with yea / nay / not-voting counts.',
  };
  return (
    <Page
      kicker="Components · proposed"
      title="Tabs"
      lede="A single row of underline tabs for switching views within a page. The bill detail is the canonical home. Not yet in the spec, so the contract below is a proposal."
    >
      <H2
        sub={
          <>
            Same active treatment as top navigation: weight 600 + a 2px inset underline in{' '}
            <Mono>--primary</Mono>. Try selecting them.
          </>
        }
      >
        Underline tabs
      </H2>
      <Example caption="tabs, interactive">
        <div role="tablist" style={{ display: 'flex', gap: 24, borderBottom: `1px solid ${C.borderLight}` }}>
          {tabs.map(([k, txt]) => {
            const active = tab === k;
            return (
              <button
                key={k}
                role="tab"
                aria-selected={active}
                onClick={() => setTab(k)}
                style={{
                  fontFamily: FS,
                  fontSize: 13.5,
                  fontWeight: active ? 600 : 500,
                  color: active ? C.primary : C.textTertiary,
                  background: 'none',
                  border: 0,
                  cursor: 'pointer',
                  padding: '12px 4px',
                  boxShadow: active ? `inset 0 -2px 0 ${C.primary}` : 'none',
                }}
              >
                {txt}
              </button>
            );
          })}
        </div>
        <div style={{ padding: '18px 2px', fontSize: 13.5, color: C.textSecondary, lineHeight: 1.6 }}>
          {panels[tab]}
        </div>
      </Example>
      <Callout style={{ marginTop: 16 }}>
        <strong>New in this reference.</strong> Tabs weren&apos;t in the v1.1 spec. Proposed contract:{' '}
        <Mono>role=&quot;tablist&quot;</Mono>, arrow-key navigation between tabs, <Mono>aria-selected</Mono>, and
        each panel labelled by its tab. Sentence-case labels, one <Mono>tablist</Mono> per region.
      </Callout>
    </Page>
  );
}

function SecPagination() {
  const [page, setPage] = useState(1);
  const pbtn = (label: string, n: number | null, disabled?: boolean) => {
    const active = n !== null && page === n;
    return (
      <button
        key={label}
        disabled={disabled}
        aria-current={active ? 'page' : undefined}
        onClick={() => n !== null && setPage(n)}
        style={{
          fontFamily: FS,
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          minWidth: 40,
          minHeight: 40,
          padding: '0 12px',
          borderRadius: 8,
          cursor: disabled ? 'not-allowed' : 'pointer',
          background: active ? C.primary : '#fff',
          color: disabled ? C.border : active ? '#fff' : C.textSecondary,
          border: `1px solid ${active ? C.primary : C.border}`,
        }}
      >
        {label}
      </button>
    );
  };
  return (
    <Page
      kicker="Components · proposed"
      title="Pagination"
      lede={
        <>
          Numbered pagination for high-volume browse, plus the existing <em>Load more</em> pattern.
          The power-user surfaces need both.
        </>
      }
    >
      <H2 sub="For the dense browse surfaces. Current page is the one contained button. Neighbors are outlined. Select a number to move it.">
        Numbered pagination
      </H2>
      <Example caption="pagination, interactive">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {pbtn('‹ Prev', null, true)}
          {pbtn('1', 1)}
          {pbtn('2', 2)}
          {pbtn('3', 3)}
          <span style={{ color: C.textMuted, padding: '0 4px' }}>…</span>
          {pbtn('28', 28)}
          {pbtn('Next ›', page + 1)}
        </div>
        <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 12 }}>Showing 1–24 of 1,412 bills</div>
      </Example>
      <H2
        sub={
          <>
            The lighter-weight alternative already used across card grids. Copy is just{' '}
            <em>Load more</em>, because context says what.
          </>
        }
      >
        Load more
      </H2>
      <Example caption="load more">
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <Btn kind="outline">Load more</Btn>
        </div>
      </Example>
      <Callout style={{ marginTop: 16 }}>
        <strong>New in this reference.</strong> Proposed contract: <Mono>nav aria-label=&quot;Pagination&quot;</Mono>,{' '}
        <Mono>aria-current=&quot;page&quot;</Mono> on the active number, 40px minimum targets, disabled Prev/Next
        at the ends. Pairs with the future dense-table archetype (open decision #4).
      </Callout>
    </Page>
  );
}

function SecTable() {
  // The v1.1 handoff lists a "Data table" archetype but leaves it unbuilt
  // (open decision #4). Preserve the prototype's graceful placeholder.
  return (
    <Page
      kicker="Components · proposed"
      title="Data table"
      lede="A dense, sortable table archetype for the power-user browse surfaces, paired with numbered pagination."
    >
      <Callout>
        <strong>Not yet in the spec.</strong> The dense-table archetype is an open decision (#4) and
        wasn&apos;t built in the v1.1 reference. It will land here alongside the numbered-pagination
        contract once the column model and sort semantics are settled.
      </Callout>
    </Page>
  );
}

function SecModal() {
  const [open, setOpen] = useState(false);
  return (
    <Page
      kicker="Components · proposed"
      title="Modal & sheet"
      lede="Reserved for confirmation and focused tasks: unsubscribe confirm, digest settings. Everything else stays on the page."
    >
      <H2
        sub={
          <>
            Centered, elevation via <Mono>--shadow-md</Mono>, a scrim behind. One primary action;
            sentence-case title. Select the button to open it.
          </>
        }
      >
        Dialog
      </H2>
      <Example caption="modal, interactive" style={{ position: 'relative' }}>
        <button
          onClick={() => setOpen(true)}
          style={{
            fontFamily: FS,
            fontSize: 13,
            fontWeight: 500,
            borderRadius: 8,
            padding: '0 18px',
            minHeight: 44,
            background: C.primary,
            color: '#fff',
            border: 0,
            cursor: 'pointer',
          }}
        >
          Open confirmation
        </button>
        {open && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Stop digest emails?"
            onClick={() => setOpen(false)}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(15,23,42,.45)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 12,
              zIndex: 5,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#fff',
                borderRadius: 12,
                boxShadow: '0 12px 32px rgba(15,23,42,.12)',
                maxWidth: 420,
                width: 'calc(100% - 40px)',
                padding: 24,
              }}
            >
              <div style={{ fontFamily: FD, fontWeight: 500, fontSize: 20, marginBottom: 8 }}>
                Stop digest emails?
              </div>
              <div style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.6, marginBottom: 20 }}>
                You will not receive further bill digest emails. You can re-enable digests at any time
                from your profile.
              </div>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    fontFamily: FS,
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 8,
                    padding: '0 16px',
                    minHeight: 44,
                    background: '#fff',
                    color: C.primary,
                    border: `1px solid ${C.primary}`,
                    cursor: 'pointer',
                  }}
                >
                  Keep emails
                </button>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    fontFamily: FS,
                    fontSize: 13,
                    fontWeight: 500,
                    borderRadius: 8,
                    padding: '0 16px',
                    minHeight: 44,
                    background: C.error,
                    color: '#fff',
                    border: 0,
                    cursor: 'pointer',
                  }}
                >
                  Stop emails
                </button>
              </div>
            </div>
          </div>
        )}
      </Example>
      <Callout style={{ marginTop: 16 }}>
        <strong>New in this reference.</strong> Proposed contract: focus trap while open,{' '}
        <Mono>Esc</Mono> and scrim-click both close, focus returns to the trigger,{' '}
        <Mono>role=&quot;dialog&quot; aria-modal=&quot;true&quot;</Mono> labelled by the title. Modals portal into{' '}
        <Mono>#main-content</Mono> so header, footer, and skip link stay reachable. Destructive confirm
        uses <Mono>--error</Mono>.
      </Callout>
    </Page>
  );
}

function SecTooltip() {
  const surf: React.CSSProperties = {
    fontFamily: FS,
    fontSize: 13,
    lineHeight: 1.5,
    padding: '10px 14px',
    borderRadius: 8,
    background: C.bgTertiary,
    color: C.textPrimary,
    border: `1px solid ${C.borderLight}`,
    boxShadow: '0 4px 12px rgba(15,23,42,.06),0 1px 2px rgba(15,23,42,.04)',
    maxWidth: 280,
  };
  return (
    <Page
      kicker="Components"
      title="Tooltip"
      lede="Soft light surface, 8px radius. Carries the plain-language definitions that make legislative jargon legible to a first-timer."
    >
      <H2 sub="The primary warmth mechanism for newcomers. Status chips and the progress meter share one tooltip surface that explains a term in plain language.">
        Educational tooltip
      </H2>
      <Example caption="tooltip surface + trigger">
        <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ position: 'relative', ...surf }}>
            A bill is enacted whether signed, left unsigned for 10 days, or passed over the
            governor&apos;s veto.
            <span
              style={{
                position: 'absolute',
                bottom: -5,
                left: 24,
                width: 10,
                height: 10,
                background: C.bgTertiary,
                borderRight: `1px solid ${C.borderLight}`,
                borderBottom: `1px solid ${C.borderLight}`,
                transform: 'rotate(45deg)',
              }}
            />
          </div>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              borderRadius: 9999,
              padding: '4px 12px',
              fontSize: 12,
              fontWeight: 600,
              background: C.successTint,
              color: C.success,
              border: `1px solid ${C.successBorder}`,
              borderBottom: `1px dashed ${C.success}`,
            }}
          >
            ✓ Became law
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: C.textTertiary, marginTop: 16 }}>
          In the live app this appears on hover or keyboard focus.
        </div>
      </Example>
      <Callout style={{ marginTop: 16 }}>
        Opens on hover <em>and</em> keyboard focus, dismissible with Esc,{' '}
        <span style={{ fontFamily: FS, fontWeight: 600 }}>aria-describedby</span> links trigger to tip.
        Content defines a term. It never advises.
      </Callout>
    </Page>
  );
}

function BillCard({
  num,
  chamber,
  chColor,
  status,
  statusKind,
  title,
  party,
  partyColor,
  sponsor,
  role,
  district,
  date,
  action,
  segs,
}: {
  num: string;
  chamber: string;
  chColor: string;
  status: string;
  statusKind: 'ok' | 'err' | 'brand' | 'neutral';
  title: string;
  party: string;
  partyColor: string;
  sponsor: string;
  role: string;
  district: string;
  date: string;
  action: string;
  segs: Seg[];
}) {
  const stMap = {
    ok: [C.successTint, C.success, C.successBorder],
    err: [C.errorTint, C.error, C.errorBorder],
    brand: [C.primary50, C.primary, C.blueBorder],
    neutral: [C.bgTertiary, C.textSecondary, C.borderLight],
  } as const;
  const s = stMap[statusKind];
  const over: React.CSSProperties = {
    fontSize: 10.5,
    fontWeight: 700,
    letterSpacing: '.07em',
    textTransform: 'uppercase',
    color: C.textMuted,
  };
  return (
    <div
      className="ds-cardhover"
      style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: 24, cursor: 'pointer' }}
    >
      <div style={{ marginBottom: 18 }}>
        <Meter segs={segs} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ borderRadius: 9999, padding: '4px 12px', fontSize: 12, fontWeight: 600, background: chColor, color: '#fff' }}>
          {chamber}
        </span>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            borderRadius: 9999,
            padding: '4px 12px',
            fontSize: 12,
            fontWeight: 600,
            background: s[0],
            color: s[1],
            border: `1px solid ${s[2]}`,
          }}
        >
          {status}
        </span>
      </div>
      <div style={{ fontFamily: FD, fontWeight: 500, fontSize: 27, lineHeight: 1.1, color: C.textPrimary, marginBottom: 8 }}>
        {num}
      </div>
      <div style={{ fontSize: 15, lineHeight: 1.5, color: C.textPrimary, marginBottom: 22 }}>{title}</div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18 }}>
        <span style={{ position: 'relative', flex: 'none', width: 46, height: 46 }}>
          <span
            style={{
              display: 'flex',
              width: 46,
              height: 46,
              borderRadius: 9999,
              background: 'repeating-linear-gradient(45deg,#F1F5F9 0,#F1F5F9 6px,#E2E8F0 6px,#E2E8F0 12px)',
              boxShadow: `0 0 0 2px #fff,0 0 0 3.5px ${partyColor}`,
              alignItems: 'flex-end',
              justifyContent: 'center',
            }}
          >
            <span style={{ fontSize: 7, color: C.textMuted, paddingBottom: 5 }}>photo</span>
          </span>
          <span
            style={{
              position: 'absolute',
              bottom: -2,
              right: -2,
              width: 18,
              height: 18,
              borderRadius: 9999,
              background: partyColor,
              color: '#fff',
              border: '2px solid #fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 9,
              fontWeight: 700,
            }}
          >
            {party}
          </span>
        </span>
        <div>
          <div style={{ ...over, marginBottom: 3 }}>Primary sponsor</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, lineHeight: 1.2 }}>{sponsor}</div>
          <div style={{ fontSize: 13, color: C.textSecondary, marginTop: 2 }}>
            {role} · {district}
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${C.bgTertiary}`, paddingTop: 14 }}>
        <div style={{ ...over, marginBottom: 4 }}>Latest action · {date}</div>
        <div style={{ fontSize: 14, color: C.textSecondary, lineHeight: 1.5 }}>{action}</div>
      </div>
    </div>
  );
}

function SecBillcard() {
  return (
    <Page
      kicker="Domain"
      title="Bill card & progress meter"
      lede="The most-repeated tile in the product and the meter that lives inside it. One link, one honest status, one consistent stage model."
    >
      <H2 sub="The whole card is a single link to the bill page. Timeline on top, bill number as a serif heading, primary sponsor, and the latest recorded action.">
        Bill card
      </H2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <BillCard
          num="HB 199"
          chamber="House"
          chColor={C.chamberHouse}
          status="In committee"
          statusKind="brand"
          title="AN ACT relating to public school funding and declaring an emergency."
          party="D"
          partyColor={C.partyD}
          sponsor="Rebecca Adkins"
          role="Representative"
          district="House District 042"
          date="May 13, 2026"
          action="Reported favorably from House Education"
          segs={[
            { label: 'Introduced', state: 'complete' },
            { label: 'Passed House', state: 'complete' },
            { label: 'Passed Senate', state: 'up' },
            { label: 'Became law', state: 'up' },
          ]}
        />
        <BillCard
          num="HB 869"
          chamber="House"
          chColor={C.chamberHouse}
          status="Signed by Governor"
          statusKind="ok"
          title="AN ACT relating to fiscal matters and declaring an emergency."
          party="R"
          partyColor={C.partyR}
          sponsor="Adam Bowling"
          role="Representative"
          district="House District 087"
          date="Apr 27, 2026"
          action="Signed by Governor (Acts Ch. 198)"
          segs={[
            { label: 'Introduced', state: 'done' },
            { label: 'Passed House', state: 'done' },
            { label: 'Passed Senate', state: 'done' },
            { label: 'Became law', state: 'done' },
          ]}
        />
      </div>
      <H2 sub="Fills to the furthest stage reached. In-progress reads blue, enacted reads green, and a vetoed bill shows the final segment blocked: red + 45° hatch + icon + the word, never color alone.">
        Progress meter states
      </H2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Example caption="in progress · passed one chamber">
          <Meter
            segs={[
              { label: 'Introduced', state: 'complete' },
              { label: 'Passed House', state: 'complete' },
              { label: 'Passed Senate', state: 'up' },
              { label: 'Became law', state: 'up' },
            ]}
          />
        </Example>
        <Example caption="became law · fully enacted">
          <Meter
            segs={[
              { label: 'Introduced', state: 'done' },
              { label: 'Passed Senate', state: 'done' },
              { label: 'Passed House', state: 'done' },
              { label: 'Became law', state: 'done' },
            ]}
          />
        </Example>
        <Example caption="vetoed · passed both chambers, then stopped">
          <Meter
            segs={[
              { label: 'Introduced', state: 'complete' },
              { label: 'Passed House', state: 'complete' },
              { label: 'Passed Senate', state: 'complete' },
              { label: 'Vetoed', state: 'blocked' },
            ]}
          />
        </Example>
      </div>
      <H2
        sub={
          <>
            Wording follows <Mono>ky-bill-progress.ts</Mono>. Do not &quot;correct&quot; without checking
            it.
          </>
        }
      >
        Stage counts by bill type
      </H2>
      <div style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden', fontSize: 13 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1.4fr .5fr 2fr',
            background: C.bgPage,
            borderBottom: `1px solid ${C.borderLight}`,
            fontWeight: 600,
            color: C.textTertiary,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '.05em',
          }}
        >
          <div style={{ padding: '11px 16px' }}>Bill type</div>
          <div style={{ padding: '11px 16px' }}>Stages</div>
          <div style={{ padding: '11px 16px' }}>Labels</div>
        </div>
        {[
          ['Bill / joint resolution: HB, SB, HJR, SJR', '4', 'Introduced → Passed {origin} → Passed {second} → Became law'],
          ['Concurrent resolution: HCR, SCR', '3', 'Introduced → Passed {origin} → Adopted by both chambers'],
          ['Simple resolution: HR, SR', '2', 'Introduced → Adopted by {chamber}'],
        ].map((row, i) => (
          <div key={row[0]} style={{ display: 'grid', gridTemplateColumns: '1.4fr .5fr 2fr', borderBottom: i < 2 ? `1px solid ${C.borderLight}` : undefined }}>
            <div style={{ padding: '12px 16px', fontWeight: 500 }}>{row[0]}</div>
            <div style={{ padding: '12px 16px', fontFamily: FM }}>{row[1]}</div>
            <div style={{ padding: '12px 16px', color: C.textSecondary }}>{row[2]}</div>
          </div>
        ))}
      </div>
      <Callout style={{ marginTop: 14 }}>
        <strong>&quot;Became law&quot;, not &quot;Signed&quot;</strong>. A bill is enacted whether signed, unsigned
        after 10 days, or overridden after veto. Concurrent resolutions are <em>adopted</em>, never
        signed.
      </Callout>
    </Page>
  );
}

function MemberPhoto({ color }: { color: string }) {
  return (
    <span
      style={{
        flex: 'none',
        width: 52,
        height: 52,
        borderRadius: 9999,
        background: 'repeating-linear-gradient(45deg,#F1F5F9 0,#F1F5F9 6px,#E2E8F0 6px,#E2E8F0 12px)',
        boxShadow: `0 0 0 2.5px #fff,0 0 0 4.5px ${color}`,
        display: 'inline-flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
      }}
    >
      <span style={{ fontSize: 8, fontFamily: FM, color: C.textMuted, paddingBottom: 6 }}>photo</span>
    </span>
  );
}

function SecMember() {
  const chip = (txt: string, bg: string, fg: string) => (
    <span style={{ borderRadius: 9999, padding: '3px 10px', fontSize: 11, fontWeight: 600, background: bg, color: fg }}>
      {txt}
    </span>
  );
  const initials = (init: string, color: string) => (
    <span
      style={{
        flex: 'none',
        width: 52,
        height: 52,
        borderRadius: 9999,
        background: color,
        color: '#fff',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 600,
        fontSize: 17,
        fontFamily: FD,
      }}
    >
      {init}
    </span>
  );
  const mcard = (
    color: string,
    name: string,
    party: string,
    pc: string,
    chamber: string,
    chColor: string,
    dist: string,
    meta: string,
  ) => (
    <div
      className="ds-cardhover"
      style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: 22, cursor: 'pointer' }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 14 }}>
        <MemberPhoto color={color} />
        <div>
          <div style={{ fontFamily: FD, fontWeight: 500, fontSize: 18, lineHeight: 1.2 }}>{name}</div>
          <div style={{ fontSize: 12.5, color: C.textTertiary, marginTop: 3 }}>District {dist}</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        {chip(party, pc, '#fff')}
        {chip(chamber, chColor, '#fff')}
      </div>
      <div style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 1.5, borderTop: `1px solid ${C.bgTertiary}`, paddingTop: 12 }}>
        {meta}
      </div>
    </div>
  );
  return (
    <Page
      kicker="Domain"
      title="Member card"
      lede="141 members, one tile. Party is signalled by chip and label first, color second, so the roster never reads as an endorsement."
    >
      <div
        style={{
          background: C.successTint,
          border: `1px solid ${C.successBorder}`,
          borderRadius: 10,
          padding: '12px 16px',
          fontSize: 12.5,
          color: '#166534',
          marginBottom: 22,
        }}
      >
        <strong>Updated · approved refinement.</strong> Photo-first avatar: the photo carries
        identity and party moves to a thin ring + the chip below, so party color is present but no
        longer the loudest element on the card.
      </div>
      <H2 sub="The roster and &quot;Find my legislators&quot; tile. A thin party-colored ring frames the photo. The D / R / I chip and party label carry the meaning.">
        Member card
      </H2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {mcard(C.partyD, 'Rep. Rebecca Adkins', 'Democratic', C.partyD, 'House', C.chamberHouse, '42', '3 committees · primary sponsor of 7 bills this session')}
        {mcard(C.partyR, 'Sen. James Coleman', 'Republican', C.partyR, 'Senate', C.chamberSenate, '18', 'Chairs Appropriations & Revenue · 4 committees')}
      </div>
      <H2 sub="Photo present → neutral image inside a party ring (left). No photo → initials on the party fill (right). The party chip is always shown either way.">
        Avatar: photo-first, initials fallback
      </H2>
      <div style={{ display: 'flex', gap: 26, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <MemberPhoto color={C.partyD} />
          <MemberPhoto color={C.partyR} />
          <MemberPhoto color={C.partyI} />
          <span style={{ fontSize: 11.5, color: C.textTertiary }}>photo · party ring</span>
        </div>
        <div style={{ width: 1, height: 40, background: C.borderLight }} />
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {initials('RA', C.partyD)}
          {initials('JC', C.partyR)}
          <span style={{ fontSize: 11.5, color: C.textTertiary }}>no photo · initials fallback</span>
        </div>
      </div>
      <Callout style={{ marginTop: 16 }}>
        Feature name is <strong>Find my legislators</strong> everywhere in UI; in prose,{' '}
        <em>your House and Senate representatives</em>. &quot;District map&quot; only names the tool, never the
        button. Profile data <em>may lag updates</em>, stated plainly, per honest sourcing.
      </Callout>
    </Page>
  );
}

function SecCommittee() {
  const chip = (txt: string, bg: string, fg: string, bd?: string) => (
    <span
      style={{ borderRadius: 9999, padding: '3px 10px', fontSize: 11, fontWeight: 600, background: bg, color: fg, border: `1px solid ${bd || 'transparent'}` }}
    >
      {txt}
    </span>
  );
  const ccard = (name: string, chamber: string, chColor: string, members: string, meeting: string, loc: string) => (
    <div style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 24, padding: 22 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        {chip(chamber, chColor, '#fff')}
        {chip(`${members} members`, C.bgTertiary, C.textSecondary, C.borderLight)}
      </div>
      <div style={{ fontFamily: FD, fontWeight: 500, fontSize: 18, lineHeight: 1.3, marginBottom: 16 }}>{name}</div>
      <div style={{ background: C.bgPage, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 5 }}>
          Next meeting
        </div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: C.textPrimary }}>{meeting}</div>
        <div style={{ fontSize: 12, color: C.textTertiary, marginTop: 2 }}>{loc}</div>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Btn kind="outline" style={{ minHeight: 40, fontSize: 12.5 }}>
          Follow committee
        </Btn>
      </div>
    </div>
  );
  return (
    <Page
      kicker="Domain"
      title="Committee card"
      lede="Committees, their next meeting, and the change lines that drive the digest. Calendar data shown as fact, never as a claim beyond what synced."
    >
      <H2 sub="Chamber, membership, and the next scheduled meeting from the calendar sync, surfaced as a fact, with its own follow control.">
        Committee card
      </H2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {ccard('House Education', 'House', C.chamberHouse, '19', 'Tuesday, February 4 · 10:00 AM ET', 'Capitol Annex, Room 129')}
        {ccard('Senate Appropriations & Revenue', 'Senate', C.chamberSenate, '13', 'Thursday, February 6 · 1:00 PM ET', 'Capitol Annex, Room 154')}
      </div>
      <H2 sub="How committee updates read in the digest: a parallel colon pattern, one line per change.">
        Calendar change lines
      </H2>
      <Example caption="meeting update lines">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, fontSize: 13.5 }}>
          <div>
            <strong style={{ color: C.success }}>New meeting:</strong>{' '}
            <span style={{ color: C.textSecondary }}>Tuesday, February 4, 10:00 AM ET, Capitol Annex Room 129</span>
          </div>
          <div>
            <strong style={{ color: C.warning }}>Agenda updated:</strong>{' '}
            <span style={{ color: C.textSecondary }}>HB 199 added to the order of business</span>
          </div>
          <div>
            <strong style={{ color: C.error }}>Meeting cancelled:</strong>{' '}
            <span style={{ color: C.textSecondary }}>Thursday, February 6</span>
          </div>
        </div>
      </Example>
      <Callout style={{ marginTop: 16 }}>
        Repeated updates to one meeting are de-duplicated, and <em>Agenda updated</em> is suppressed when
        the same meeting&apos;s <em>New meeting</em> line is already present. Expand acronyms on first use, for example
        Legislative Research Commission (LRC).
      </Callout>
    </Page>
  );
}

function SecNav() {
  const navitem = (txt: string, active: boolean) => (
    <span
      key={txt}
      style={{
        fontSize: 13.5,
        fontWeight: active ? 600 : 500,
        color: active ? C.textPrimary : C.textSecondary,
        padding: '24px 2px',
        boxShadow: active ? `inset 0 -2px 0 ${C.primary}` : 'none',
      }}
    >
      {txt}
    </span>
  );
  return (
    <Page
      kicker="Patterns"
      title="Navigation"
      lede="A calm, flat bar that stays out of the way of dense data. Sentence-case nouns, one consistent set of auth verbs."
    >
      <H2
        sub={
          <>
            Flat white bar, a single hairline bottom border, 72px toolbar. The active item is weight
            600 with a 2px inset underline in <Mono>--primary</Mono>.
          </>
        }
      >
        Top navigation
      </H2>
      <div style={{ border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
        <div
          style={{
            background: '#fff',
            borderBottom: `1px solid ${C.borderLight}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            minHeight: 72,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/branding/Logo-03.png" alt="Know Your Vote Kentucky" style={{ height: 30, width: 'auto' }} />
            <div style={{ display: 'flex', gap: 26 }}>
              {navitem('Bills', true)}
              {navitem('Members', false)}
              {navitem('Committees', false)}
              {navitem('Find my legislators', false)}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn kind="text" style={{ minHeight: 40 }}>
              Log in
            </Btn>
            <Btn kind="primary" style={{ minHeight: 40 }}>
              Sign up
            </Btn>
          </div>
        </div>
      </div>
      <Callout style={{ marginTop: 16 }}>
        Nouns as labels: <em>Bills</em>, not <em>Explore Bills</em>. Auth verbs are fixed:{' '}
        <strong>Log in</strong> (never &quot;Sign in&quot;) and <strong>Sign up</strong>. The color logo sits on
        light surfaces only.
      </Callout>
    </Page>
  );
}

function SecEmail() {
  const emcard = (title: string, body: string, cta: string) => (
    <div style={{ border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 5 }}>{title}</div>
      <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.55, marginBottom: 10 }}>{body}</div>
      <a style={{ fontSize: 13, fontWeight: 600, color: C.primary }}>{cta}</a>
    </div>
  );
  const shell = (inner: React.ReactNode) => (
    <div style={{ background: C.bgPage, border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 24 }}>
      <div style={{ maxWidth: 520, margin: '0 auto', background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '22px 24px', borderBottom: `1px solid ${C.bgTertiary}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/branding/Logo-03.png" alt="Know Your Vote Kentucky" style={{ height: 26, width: 'auto' }} />
        </div>
        <div style={{ padding: 24 }}>{inner}</div>
        <div style={{ padding: '16px 24px', borderTop: `1px solid ${C.bgTertiary}`, background: C.bgPage, fontSize: 11, color: C.textTertiary, lineHeight: 1.6 }}>
          You&apos;re getting this because you follow bills, topics, or committees on Know Your Vote
          Kentucky.
          <br />
          <a style={{ color: C.primary }}>Change digest settings</a> ·{' '}
          <a style={{ color: C.primary }}>Unsubscribe</a> · <a style={{ color: C.primary }}>Privacy</a>
          <br />
          Know Your Vote Kentucky · PO Box 133, Bardstown, Kentucky 40004
        </div>
      </div>
    </div>
  );
  const digestLine = (num: string, title: string, action: string) => (
    <div style={{ padding: '14px 0', borderTop: `1px solid ${C.bgTertiary}` }}>
      <div style={{ marginBottom: 5 }}>
        <a style={{ fontFamily: FM, fontWeight: 600, fontSize: 12, color: C.primary }}>{num}</a>{' '}
        <span style={{ color: C.textPrimary, fontWeight: 500, fontSize: 13.5 }}>{title}</span>
      </div>
      <div style={{ fontSize: 12.5, color: C.textSecondary }}>
        {action} <span style={{ color: C.textMuted }}>(recorded May 13)</span>
      </div>
    </div>
  );
  return (
    <Page
      kicker="Patterns"
      title="Email templates"
      lede={
        <>
          Two touchpoints, one voice. Factual updates only, honest date labels (<em>recorded</em>, not{' '}
          <em>acted</em>), and a subject line that never names content the email doesn&apos;t contain.
        </>
      }
    >
      <H2 sub="Sent once, after first verification. Neutral, factual, three cards that name their destination.">
        Welcome email
      </H2>
      {shell(
        <>
          <h2 style={{ fontFamily: FD, fontWeight: 500, fontSize: 22, margin: '0 0 10px' }}>
            Your account is set up.
          </h2>
          <p style={{ fontSize: 13.5, color: C.textSecondary, lineHeight: 1.6, margin: '0 0 18px' }}>
            Know Your Vote Kentucky sends a digest when bills you follow change status. You will only
            receive email when there is an update to report.
          </p>
          {emcard(
            'Follow bills',
            "Select Follow on any bill page to track it. You will receive digest updates when it moves: committee action, floor votes, sent to governor, signed, or vetoed.",
            'Browse bills →',
          )}
          {emcard(
            'Find your legislators',
            'Enter your address to see your House and Senate representatives in the current session.',
            'Find my legislators →',
          )}
          {emcard(
            'Set digest preferences',
            'Choose daily or weekly delivery and which event types to include.',
            'Notification preferences →',
          )}
          <div style={{ borderTop: `1px solid ${C.borderLight}`, marginTop: 20, paddingTop: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 6 }}>
              A note from the founder
            </div>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, margin: '0 0 12px' }}>
              Thank you for signing up!
            </p>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, margin: '0 0 8px' }}>
              I&apos;m Katie Toepp, a designer and self-taught developer in Kentucky, and I believe
              more than anything that knowledge is power. I built KYvKY because our legislative record
              is public, but hard to use.
            </p>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, margin: '0 0 8px' }}>
              I wanted to better understand the bills I was hearing about in the media. But I kept
              hitting a wall: either a paywall, or an outdated interface that assumed I already
              understood the legislative process. I wanted following my state&apos;s legislation to be
              as easy as following friends on a feed.
            </p>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, margin: '0 0 8px' }}>
              KYvKY will always be free and non-partisan, and will never sell data. Right now
              it&apos;s a passion project, and I&apos;m working to fund and grow it.
            </p>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, margin: '0 0 8px' }}>
              Replies to this email reach me. If something on the site looks wrong, I&apos;d like to know.
            </p>
            <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.6, margin: '0 0 8px' }}>
              Thanks again for using KYvKY and getting involved in the civic process.
            </p>
            <div style={{ fontSize: 13, color: C.primary }}>More about the project →</div>
          </div>
        </>,
      )}
      <H2
        sub={
          <>
            Sent only when there are events to report, grouped by <em>why</em> each item is included.
            Each bill block is one link; action lines quote the legislature&apos;s recorded text.
          </>
        }
      >
        Bill digest email
      </H2>
      {shell(
        <>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em', textTransform: 'uppercase', color: C.textMuted, marginBottom: 4 }}>
            Kentucky bill digest · May 13
          </div>
          <h2 style={{ fontFamily: FD, fontWeight: 500, fontSize: 20, margin: '0 0 4px' }}>Kentucky bill digest</h2>
          <p style={{ fontSize: 13, color: C.textSecondary, margin: '0 0 18px' }}>
            Status updates for bills and committees you follow.
          </p>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: C.textTertiary }}>
            Bills you follow
          </div>
          {digestLine('HB 199', 'Public school funding formula revision', 'Reported favorably from House Education')}
          {digestLine('SB 12', 'Emergency services funding for rural counties', 'Signed by Governor')}
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: C.textTertiary, marginTop: 18 }}>
            Committees you follow
          </div>
          <div style={{ padding: '14px 0', borderTop: `1px solid ${C.bgTertiary}`, fontSize: 12.5, color: C.textSecondary }}>
            <a style={{ color: C.primary, fontWeight: 600 }}>House Education</a>
            <br />
            <span>
              <strong>New meeting:</strong> Tuesday, February 4, 10:00 AM ET, Capitol Annex Room 129
            </span>
          </div>
        </>,
      )}
    </Page>
  );
}

function SecA11y() {
  const check = (t: string, rule: string, where: string) => (
    <div
      className="ds-row"
      style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '13px 0', borderTop: `1px solid ${C.borderLight}` }}
    >
      <span
        style={{
          flex: 'none',
          width: 20,
          height: 20,
          borderRadius: 9999,
          background: C.successTint,
          color: C.success,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        ✓
      </span>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13.5 }}>
          {t}{' '}
          <span style={{ fontWeight: 400, color: C.textMuted, fontFamily: FM, fontSize: 11 }}>{rule}</span>
        </div>
        <div style={{ fontSize: 12.5, color: C.textTertiary, marginTop: 2 }}>{where}</div>
      </div>
    </div>
  );
  return (
    <Page
      kicker="Standards"
      title="Accessibility"
      lede="WCAG 2.1 AA is the floor. Every text pairing clears 4.5:1, every control has a visible ring and a 44px target, and no status is ever carried by color alone."
    >
      <H2 sub="AA is where the system starts, not where it stretches to.">The floor</H2>
      <div style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: '4px 20px 12px' }}>
        {check('Text contrast ≥ 4.5:1', 'WCAG 1.4.3', 'Every §2 semantic pairing. --text-muted is non-text only.')}
        {check('Focus ring: 2px --primary, 2px offset', '2.4.7', ':focus-visible in globals.css. Widens to 3px under prefers-contrast: high.')}
        {check('Touch targets ≥ 44px', '2.5.5', 'Button / IconButton / Select / TextField floors in theme.ts.')}
        {check('Status never by color alone', '1.4.1', 'Meter vetoed = red + hatch + block icon + word. Party = D/R/I letter.')}
        {check('Skip link + one h1 + no skipped levels', '2.4.1 / 1.3.1', 'Skip link to #main-content. Modals portal in so it stays reachable.')}
        {check('Reduced motion & forced colors honored', '2.3.3 / 1.4.12', 'Global media queries neutralize animation. Gradient text falls back to CanvasText.')}
      </div>
    </Page>
  );
}

function SecVoice() {
  const principle = (t: string, d: string) => (
    <div className="ds-row" style={{ padding: '15px 0', borderTop: `1px solid ${C.borderLight}` }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{t}</div>
      <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.55, maxWidth: '64ch' }}>{d}</div>
    </div>
  );
  const conv = (t: string, d: string) => (
    <div style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: '15px 16px' }}>
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{t}</div>
      <div style={{ fontSize: 12.5, color: C.textSecondary, lineHeight: 1.55 }}>{d}</div>
    </div>
  );
  const avoid = (bad: string, reason: string) => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', borderTop: `1px solid ${C.borderLight}`, fontSize: 13 }}>
      <div style={{ padding: '11px 14px', color: C.error }}>“{bad}”</div>
      <div style={{ padding: '11px 14px', color: C.textTertiary }}>{reason}</div>
    </div>
  );
  return (
    <Page
      kicker="Standards"
      title="Voice & tone"
      lede="One voice across site and email. Neutral by default, a little warmer only on the marketing surface, never partisan anywhere."
    >
      <H2 sub="Trustworthy, neutral, accessible, closer to a reliable government tracking service than to a startup.">
        Principles
      </H2>
      <div style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: '4px 20px 14px' }}>
        {principle('Neutral and informational', 'State what happened or what a person can do. No enthusiasm, no adjectives that talk up the product.')}
        {principle('Non-partisan, always', 'Never characterize legislation as good or bad. Describe what a bill does and where it is, never what someone should think.')}
        {principle('Honest sourcing', 'Show where data comes from and where it lags, plainly and on purpose. A deliberate trust signal, not a disclaimer to minimize.')}
        {principle('Warmth through anticipation', "Answer a newcomer's confusion before they hit it. Never warmth through exclamation points or hype.")}
        {principle('Device-neutral', '“Select,” never “tap,” “click,” or “press.”')}
      </div>
      <H2>Conventions</H2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
        {conv('Headings', 'Sentence-case nouns: “Bills,” not “Explore Bills.”')}
        {conv('The district map', '“Find my legislators” as the label; “your representatives” in prose.')}
        {conv('Auth verbs', '“Log in” (never “Sign in”) and “Sign up,” consistently.')}
        {conv('Counts & acronyms', '“141 members,” not “141 people.” Expand acronyms on first use, for example LRC.')}
      </div>
      <H2>What to avoid</H2>
      <div style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', background: C.bgPage, fontWeight: 600, color: C.textTertiary, fontSize: 11, textTransform: 'uppercase', letterSpacing: '.05em' }}>
          <div style={{ padding: '11px 14px' }}>Avoid</div>
          <div style={{ padding: '11px 14px' }}>Reason</div>
        </div>
        {avoid('Stay informed / Never miss a vote', 'Characterizes value, implies urgency')}
        {avoid('Any take on whether a bill is good or bad', 'Editorializing, breaks non-partisanship')}
        {avoid('Tap / click / press', 'Device-specific')}
        {avoid('Explore Bills', "Marketing register. A reference tool browses, it doesn't hype")}
        {avoid('KY as a stand-in for Kentucky', 'Abbreviation inconsistent with the full name')}
      </div>
    </Page>
  );
}

function SecMap() {
  const legend = (fill: string, outline: string, txt: string) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: C.textSecondary }}>
      <span style={{ width: 16, height: 16, borderRadius: 4, background: fill, border: `1.5px solid ${outline}` }} />
      {txt}
    </span>
  );
  return (
    <Page
      kicker="Domain"
      title="District map"
      lede="A Kentucky map with a member's district highlighted, using the same geometry and palette as the live explorer, rendered without a Mapbox request."
    >
      <H2 sub="Built from the same committed district GeoJSON the live explorer uses, with no Mapbox request. The member's district is highlighted at a darker value than its neighbors.">
        Statewide district map
      </H2>
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 20, alignItems: 'start' }}>
        <div style={{ border: `1px solid ${C.borderLight}`, borderRadius: 12, overflow: 'hidden', background: '#F5F5F5', padding: 12 }}>
          <svg
            viewBox={KY_MAP.viewBox}
            role="img"
            aria-label="Map of Kentucky highlighting Senate District 37"
            style={{ display: 'block', width: '100%', height: 'auto' }}
          >
            <path d={KY_MAP.allPath} fill="#CEDFC3" fillOpacity={0.5} stroke="#4A5C3E" strokeWidth={1.2} strokeOpacity={0.5} strokeLinejoin="round" />
            <path d={KY_MAP.district37} fill="rgba(74,92,62,0.62)" stroke="#4A5C3E" strokeWidth={2} strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ background: '#fff', border: `1px solid ${C.borderLight}`, borderRadius: 12, padding: 20 }}>
          <div style={{ fontFamily: FD, fontWeight: 500, fontSize: 20, marginBottom: 4 }}>Find my legislators</div>
          <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.55, marginBottom: 16 }}>
            Enter an address to see your House and Senate representatives.
          </div>
          <div style={{ position: 'relative', marginBottom: 10 }}>
            <span
              style={{
                position: 'absolute',
                left: 14,
                top: '50%',
                transform: 'translateY(-50%)',
                color: C.textTertiary,
                pointerEvents: 'none',
                fontSize: 26,
                lineHeight: 1,
              }}
            >
              ⌕
            </span>
            <input className="ds-input" placeholder="Enter address or ZIP" style={{ ...INPUT_BASE, paddingLeft: 48 }} />
          </div>
          <Btn kind="primary" style={{ width: '100%' }}>
            Search
          </Btn>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18, borderTop: `1px solid ${C.bgTertiary}`, paddingTop: 16 }}>
            {legend('#D6C5E3', '#7637A6', 'House districts')}
            {legend('#CEDFC3', '#4A5C3E', 'Senate districts')}
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: C.textSecondary }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, background: 'rgba(74,92,62,0.62)' }} />
              Selected district
            </span>
          </div>
        </div>
      </div>
      <Callout style={{ marginTop: 16 }}>
        Interactive tiles use Mapbox <strong>light-v11</strong> with these tokens: House fill{' '}
        <strong>#D6C5E3</strong> / outline <strong>#7637A6</strong>, Senate fill <strong>#CEDFC3</strong> /
        outline <strong>#4A5C3E</strong>, marker pin <strong>#1E40AF</strong>. Outside Kentucky is masked
        with <strong>rgba(245,245,245,.96)</strong>. This static locator is the no-Mapbox fallback shown
        on member cards.
      </Callout>
    </Page>
  );
}

/* --------------------------------------------------------------- shell */

const SECTIONS: Record<string, React.ReactNode> = {
  overview: <SecOverview />,
  type: <SecType />,
  space: <SecSpace />,
  radius: <SecRadius />,
  buttons: <SecButtons />,
  forms: <SecForms />,
  chips: <SecChips />,
  feedback: <SecFeedback />,
  tabs: <SecTabs />,
  pagination: <SecPagination />,
  table: <SecTable />,
  modal: <SecModal />,
  tooltip: <SecTooltip />,
  billcard: <SecBillcard />,
  member: <SecMember />,
  committee: <SecCommittee />,
  nav: <SecNav />,
  email: <SecEmail />,
  a11y: <SecA11y />,
  voice: <SecVoice />,
  map: <SecMap />,
};

export default function DesignSystemPage() {
  const [section, setSection] = useState('overview');
  const [copied, setCopied] = useState<string | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);

  const onCopy = useCallback((v: string) => {
    try {
      navigator.clipboard?.writeText(v);
    } catch {
      /* clipboard unavailable — the visual "copied ✓" still fires */
    }
    setCopied(v);
    if (copyTimer.current) clearTimeout(copyTimer.current);
    copyTimer.current = setTimeout(() => setCopied(null), 1100);
  }, []);

  useEffect(() => () => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
  }, []);

  const go = (s: string) => {
    setSection(s);
    // Scroll the content column back to the top of the reference on change.
    requestAnimationFrame(() => {
      mainRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' });
    });
  };

  // Color is the only section that needs the copy state threaded in.
  const content = section === 'color' ? <SecColor copied={copied} onCopy={onCopy} /> : SECTIONS[section];

  return (
    <div className="ds-root" ref={mainRef}>
      <style dangerouslySetInnerHTML={{ __html: SCOPED_CSS }} />
      <div className="ds-shell" style={{ display: 'flex', minHeight: '100vh' }}>
        <aside
          className="ds-aside ds-scroll"
          aria-label="Design system sections"
          style={{
            width: 264,
            flex: 'none',
            position: 'sticky',
            top: 64,
            alignSelf: 'flex-start',
            height: 'calc(100vh - 64px)',
            overflowY: 'auto',
            background: '#fff',
            borderRight: `1px solid ${C.borderLight}`,
            padding: '22px 0',
          }}
        >
          <div style={{ padding: '0 22px 18px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/branding/Logo-03.png"
              alt="Know Your Vote Kentucky"
              style={{ width: '100%', height: 'auto', display: 'block', marginBottom: 14 }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  display: 'inline-block',
                  background: C.primary50,
                  color: C.primaryDark,
                  border: `1px solid ${C.blueBorder}`,
                  borderRadius: 9999,
                  padding: '2px 10px',
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: '.02em',
                }}
              >
                Design System · v1.1
              </span>
            </div>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: C.textTertiary, lineHeight: 1.45 }}>
              Tokens, components, and patterns for a neutral, accessible civic reference.
            </p>
          </div>
          <nav style={{ padding: '6px 12px 24px' }}>
            {NAV.map((grp) => (
              <div key={grp.group}>
                <div
                  style={{
                    fontSize: 10.5,
                    fontWeight: 700,
                    letterSpacing: '.09em',
                    textTransform: 'uppercase',
                    color: C.textMuted,
                    padding: '14px 10px 5px',
                  }}
                >
                  {grp.group}
                </div>
                {grp.items.map(([id, txt]) => {
                  const active = section === id;
                  return (
                    <button
                      key={id}
                      className={`ds-navbtn${active ? ' is-active' : ''}`}
                      onClick={() => go(id)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        border: 0,
                        cursor: 'pointer',
                        font: 'inherit',
                        fontSize: 13,
                        padding: '7px 10px',
                        borderRadius: 8,
                        margin: '1px 0',
                        background: active ? `${C.primary}1A` : 'transparent',
                        color: active ? C.primary : C.textSecondary,
                        fontWeight: active ? 600 : 500,
                      }}
                    >
                      {txt}
                    </button>
                  );
                })}
              </div>
            ))}
          </nav>
        </aside>

        <div className="ds-main ds-scroll" style={{ flex: 1, minWidth: 0, maxWidth: 1080, margin: '0 auto' }}>
          {content}
        </div>
      </div>
    </div>
  );
}
