# Design system — assets

Catalog of brand assets. Shipping files live under
[`public/branding/`](../../public/branding) (served at `/branding/…`); this
folder is the design-system-side index.

## Logos

| File | Form | Use |
|---|---|---|
| `Logo-03.png` | Color badge | Nav + footer wordmark on **light** surfaces (`Navigation.tsx`, `SiteFooter.tsx`). |
| `logo-wordmark-white.svg` | White horizontal lockup (mark + "knowyourvote kentucky.com") | **Dark / gradient** surfaces. Used on the marketing hero (`LandingHero.tsx`). |
| `logo-white.svg` | White compact badge | Dark surfaces where a square/stacked mark fits better than the wordmark. |

Rule: **color logo on light, white knockout on dark.** Never place the color
logo on the hero gradient/photo, or the white logo on a light surface.

## Favicon / app icons (white-on-blue `#1E40AF`)

Generated from `favicon-mark-white.svg` (the square white mark) composited on
brand blue — regenerate with `scripts`-style `sharp` if the source changes.

| File | Size | Wired in |
|---|---|---|
| `../favicon.ico` | 16 / 32 / 48 (multi) | `layout.tsx` icons + `manifest.json` |
| `favicon.png` | 48 | fallback |
| `apple-touch-icon.png` | 180 | `layout.tsx` `icons.apple` + manifest |
| `icon-192.png` | 192 | `manifest.json` (PWA) |
| `icon-512.png` | 512 | `manifest.json` (PWA) |

Sources: `favicon-mark-white.svg` (250×250, square — the one used).
`favicon-mark-white-nonsquare.svg` (165×127) is an earlier non-square export
kept for reference; it is **not** used and is a candidate for removal.

## Conventions

- Logos are **SVG** (crisp at any size, themeable). Raster app icons are PNG at
  the sizes the manifest declares.
- App-icon background is `--primary` (`#1E40AF`); the mark is white.
- Any new brand color must trace to a token in
  [`../guidelines.md`](../guidelines.md) §2 — no one-off hexes.
- Web-safe filenames only (no spaces) so `/branding/…` URLs don't need encoding.
