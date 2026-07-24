# Design system — assets

Catalog of brand assets. Shipping files live under
[`public/branding/`](../../public/branding) (served at `/branding/…`); this
folder is the design-system-side index.

## Logos

| File | Form | Use |
|---|---|---|
| `Logo-03.png` | Color badge | Nav + footer wordmark on **light** surfaces (`Navigation.tsx`, `SiteFooter.tsx`). |
| `logo-wordmark-white.svg` | White horizontal lockup (mark + "knowyourvote kentucky.com") | **Dark / gradient** surfaces (available; no dark surface currently displays a logo). |
| `logo-white.svg` | White compact badge | Dark surfaces where a square/stacked mark fits better than the wordmark. |
| `favicon-mark-white.svg` | White square icon mark | Knockout of the icon mark alone (250×250). |
| `mark-color-512.png` | Color icon mark on transparent | **Source of record** for the generated icon set below. Input only — never an output. |

Rule: **color logo on light, white knockout on dark.** Never place the color
logo on the hero gradient/photo, or the white logo on a light surface. The
knockout files are ready for any future dark surface; the marketing hero
currently leads with its headline (no logo).

## Favicon / app icons — generated, not hand-edited

Everything in the icon set is produced by
[`scripts/generate-favicons.py`](../../scripts/generate-favicons.py) from
`mark-color-512.png`. Re-run it and commit the outputs rather than editing a PNG:

```bash
python3 scripts/generate-favicons.py
```

- **Shape:** a circle. Not a rounded square.
- **Blue:** `#184D8F` — the logo blue `#1C5BAA` a few points darker in lightness,
  so the white knockout holds contrast at small sizes (≈8.9:1).
- **Exception:** `apple-touch-icon.png` and `src/app/apple-icon.png` are
  full-bleed squares. iOS applies its own squircle mask and composites
  transparent corners over black, so a pre-cut circle renders badly there.

| File | Size | Wired in |
|---|---|---|
| `../favicon.ico` | 16 / 32 / 48 / 64 (multi) | `layout.tsx` icons + `manifest.json` |
| `favicon.png` | 512 | fallback |
| `apple-touch-icon.png` | 180 | `layout.tsx` `icons.apple` + manifest |
| `icon-192.png` | 192 | `manifest.json` (PWA) |
| `icon-512.png` | 512 | `manifest.json` (PWA) |
| `../../src/app/icon.png`, `apple-icon.png` | 512 / 180 | Next file-convention fallbacks |

**`/favicon.ico` is served from `public/favicon.ico`** — the path `layout.tsx`
and `manifest.json` reference. Next's stock `src/app/favicon.ico` (a file-based
default present since the repo's first commit) collides with it: with both, the
dev server 500s on `/favicon.ico` and the stale default wins in prod, so the
generator deletes `src/app/favicon.ico`.

**Small sizes:** the full mark (two `ky` words, the state outline, and the check)
has too much detail to survive a 16px favicon frame, so the `.ico`'s 16px frame
drops to a **check-only** glyph — the brand's signature "vote" element, still
crisp that small. 32/48/64 keep the full mark. Browsers use the 16px frame for
non-retina tabs and the 32px frame for retina, so the full mark shows wherever
the pixels allow. The `.ico` is assembled by hand (`write_ico`) because Pillow's
own ICO save can't hold per-size artwork.

`favicon-mark-white-nonsquare.svg` (165×127) is an earlier non-square export kept
for reference; it is **not** used and is a candidate for removal.

## Gaps — open decision #3

**Closed.** The solid-white knockout logo and the white-on-blue default favicon
both shipped; the files are listed above. Continue to use `Logo-03.png` on light
surfaces only — put the white knockout on the hero gradient, never a CSS
inversion of the color logo.

## Conventions

- Logos are **SVG** (crisp at any size, themeable). Raster app icons are PNG at
  the sizes the manifest declares.
- App-icon disc is the darker favicon blue `#184D8F`; the mark is white. (The
  brand primary token stays `#1E40AF` — the darker step is favicon-only, for
  small-size contrast.)
- Any new brand color must trace to a token in
  [`../guidelines.md`](../guidelines.md) §2 — no one-off hexes.
- Web-safe filenames only (no spaces) so `/branding/…` URLs don't need encoding.
