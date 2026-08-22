import { Img, Link, Section } from 'react-email';
import * as React from 'react';

/**
 * Shared branding for outbound email.
 *
 * Every transactional send opens with the KYvKY wordmark linked to the site
 * home. Email clients cannot load SVG reliably (Gmail strips it), so the
 * hosted PNG at /branding/Logo-03.png is the only logo asset usable here —
 * `logo-white.svg` and friends are web-only.
 */

/** Absolute logo URL for a given site origin. */
export function emailLogoSrc(origin: string): string {
  return `${origin}/branding/Logo-03.png`;
}

/**
 * Wordmark header, linked to the site home.
 *
 * The logo is blue artwork on transparency, so on a dark background it loses
 * most of its contrast. It therefore sits on an explicit white plate rather
 * than directly on the body: the plate keeps the mark legible when a client
 * flips the surrounding email to dark, and reads as a quiet card in light
 * mode. `border: 0` suppresses the blue link border Outlook draws on a
 * wrapped image.
 */
export function EmailBrandHeader({ logoSrc, homeHref }: { logoSrc: string; homeHref: string }) {
  return (
    <Section style={brandHeader}>
      <Link href={homeHref} style={{ display: 'inline-block', textDecoration: 'none' }}>
        <Img
          src={logoSrc}
          alt="Know Your Vote Kentucky"
          width={220}
          height={53}
          style={{ display: 'block', border: 0, maxWidth: '100%' }}
        />
      </Link>
    </Section>
  );
}

const brandHeader = {
  backgroundColor: '#ffffff',
  borderRadius: 8,
  padding: '14px 16px',
  marginBottom: 20,
};

/**
 * Dark-mode overrides shared by transactional emails, keyed on `kv-` classes.
 *
 * Two selectors per token on purpose: the media query covers clients that
 * honour `prefers-color-scheme`, and the `[data-ogsb]` / `[data-ogsc]`
 * attributes cover Outlook.com, which rewrites backgrounds and text colours
 * itself. The brand header is deliberately not themed — see EmailBrandHeader.
 *
 * The `.kv-bg > table > tbody > tr > td` limb is load-bearing, not defensive
 * padding. `<Body style={...} className="...">` does not put both on the same
 * element: react-email renders the class onto <body> but pushes the inline
 * background onto an inner <td>. Theming only `.kv-bg` therefore recolours a
 * layer nobody sees while the visible surface stays light, which turns the
 * dark-mode text overrides into light-on-light. The extra selectors repaint
 * the surface that actually shows. They sit outside the container, so the
 * white logo plate is untouched. If react-email changes its markup these
 * simply stop matching and the result degrades to the old behaviour rather
 * than breaking.
 *
 * Both templates share this one set. The digest layers five progress-meter
 * tokens on top (`kv-seg`, `kv-track`, and friends, defined in its own file
 * since nothing else renders a meter) and concatenates the two strings.
 */
export const EMAIL_DARK_MODE_CSS = `
  @media (prefers-color-scheme: dark) {
    .kv-bg,
    .kv-bg > table,
    .kv-bg > table > tbody > tr > td { background-color: #0f172a !important; }
    .kv-ink { color: #e2e8f0 !important; }
    .kv-body { color: #cbd5e1 !important; }
    .kv-muted { color: #94a3b8 !important; }
    .kv-link { color: #93c5fd !important; }
    .kv-border { border-color: #334155 !important; }
  }
  [data-ogsb] .kv-bg,
  [data-ogsb] .kv-bg > table,
  [data-ogsb] .kv-bg > table > tbody > tr > td { background-color: #0f172a !important; }
  [data-ogsc] .kv-ink { color: #e2e8f0 !important; }
  [data-ogsc] .kv-body { color: #cbd5e1 !important; }
  [data-ogsc] .kv-muted { color: #94a3b8 !important; }
  [data-ogsc] .kv-link { color: #93c5fd !important; }
  [data-ogsc] .kv-border { border-color: #334155 !important; }
`;
