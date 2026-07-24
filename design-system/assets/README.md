# Design system — assets

Catalog of brand assets referenced by the design system. Shipping binary files
live in the app under [`public/branding/`](../../public/branding); this folder
is the design-system-side index and gap list.

## Shipping (in `public/branding/`)

| File | Use |
|---|---|
| `Logo-03.png` | Primary wordmark/logo (color, on light backgrounds). |
| `KYvKY Logo-02 white.svg`, `KYvKY Logo-03 white.svg` | Solid-white knockout wordmark, for dark / gradient backgrounds. |
| `Logo_favicon white.svg` | White knockout of the icon mark alone. |
| `mark-color-512.png` | Color icon mark on transparent — **source of record** for the generated icon set. |
| `favicon.png` | Favicon source. |
| `apple-touch-icon.png` | iOS home-screen icon. |
| `icon-192.png`, `icon-512.png` | PWA manifest icons (`public/manifest.json`). |
| `../favicon.ico`, `src/app/favicon.ico` | Root favicon (App Router serves the `src/app/` copy). |

## Icon set — generated, not hand-edited

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

**Small sizes:** the full mark (two `ky` words, the state outline, and the check)
has too much detail to survive a 16px favicon frame, so the `.ico`'s 16px frame
drops to a **check-only** glyph — the brand's signature "vote" element, still
crisp that small. 32/48/64 keep the full mark. Browsers use the 16px frame for
non-retina tabs and the 32px frame for retina, so the full mark shows wherever
the pixels allow. The `.ico` is assembled by hand (`write_ico`) because Pillow's
own ICO save can't hold per-size artwork.

## Gaps — open decision #3

**Closed.** The solid-white knockout logo and the white-on-blue default favicon
both shipped; the files are listed above. Continue to use `Logo-03.png` on light
surfaces only — put the white knockout on the hero gradient, never a CSS
inversion of the color logo.

## Conventions

- Prefer **SVG** for logo/wordmark (crisp at any size, themeable).
- Export raster icons at the sizes the manifest declares (192, 512).
- Any new brand color must trace back to a token in
  [`../guidelines.md`](../guidelines.md) §2 — no one-off hexes.
