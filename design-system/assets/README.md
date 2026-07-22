# Design system — assets

Catalog of brand assets referenced by the design system. Shipping binary files
live in the app under [`public/branding/`](../../public/branding); this folder
is the design-system-side index and gap list.

## Shipping (in `public/branding/`)

| File | Use |
|---|---|
| `Logo-03.png` | Primary wordmark/logo (color, on light backgrounds). |
| `favicon.png` | Favicon source. |
| `apple-touch-icon.png` | iOS home-screen icon. |
| `icon-192.png`, `icon-512.png` | PWA manifest icons (`public/manifest.json`). |
| `../favicon.ico` | Root favicon. |

## Gaps — open decision #3 (not in this change)

The following were requested but **never produced**, so they are intentionally
absent rather than faked:

- **Solid-white knockout logo** — for dark / gradient (hero) backgrounds. Needs
  a real single-color knockout export, not a CSS inversion of the color logo.
- **White-on-blue default favicon** — requested as the default mark.

**Action:** provide/approve the source files (SVG preferred for the logo) and
they land in a follow-up. Until then, use `Logo-03.png` on light surfaces only;
do not place the color logo on the hero gradient.

## Conventions

- Prefer **SVG** for logo/wordmark (crisp at any size, themeable).
- Export raster icons at the sizes the manifest declares (192, 512).
- Any new brand color must trace back to a token in
  [`../guidelines.md`](../guidelines.md) §2 — no one-off hexes.
