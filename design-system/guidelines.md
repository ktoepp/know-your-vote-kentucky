# Know Your Vote Kentucky — Design System (v1.1)

> **Status:** Spec of record. This document is the single source of truth for
> design tokens and UI patterns, referenced by `src/app/globals.css` and
> `src/lib/theme.ts`. Where the current code and this spec differ, the
> difference is tracked in [`audit.md`](./audit.md) and the migration is planned
> in [`cleanup.md`](./cleanup.md). Nothing here silently claims to be live that
> isn't — see the voice principle "honest sourcing" (`docs/voice-and-tone.md`).

Companion files:

- [`style-guide.html`](./style-guide.html) — rendered visual companion (open in a browser).
- [`audit.md`](./audit.md) — accessibility / functionality / ICP evaluation and v1.1 status.
- [`cleanup.md`](./cleanup.md) — `globals.css` + `theme.ts` migration plan.
- [`index.html`](./index.html) — docs hub.

---

## 1. Principles

The product reads as **one trustworthy, neutral, accessible civic reference** —
"closer to a reliable government tracking service than to a startup"
(`docs/voice-and-tone.md`). The visual system serves that:

1. **Legible over decorative.** Dense legislative data (1,400+ bills per
   session) has to scan. Whitespace, hierarchy, and restraint beat ornament.
2. **Neutral, never editorial.** Color must not imply a political position.
   This is a brand-critical constraint, not a preference (see §5.4).
3. **Accessible by default.** WCAG 2.1 AA is the floor, not a stretch goal.
   Every semantic text pairing meets ≥4.5:1; every control has a visible focus
   ring and a 44px touch target.
4. **One token, one meaning.** A single semantic set. No duplicate keys that let
   two components drift apart.

---

## 2. Tokens

Canonical CSS custom properties live in `src/app/globals.css` under `:root`.
The MUI theme mirrors them in `src/lib/theme.ts` (`civicPaletteTokens` +
`lightTheme`). Tailwind maps them in `tailwind.config.js`. **These three must
stay in sync** — a change to a token value is a change in all three places.

Light theme is the single source; dark mode is out of scope (see §14).

### 2.1 Color — brand

| Token | Value | Use |
|---|---|---|
| `--primary` | `#1E40AF` | Primary actions, links, active nav, focus ring. The one blue. |
| `--primary-dark` | `#1E3A8A` | Hover / pressed on primary. |
| `--primary-light` | `#2563EB` | Gradient partner (hero band), accents. |
| `--primary-50` | `#EFF6FF` | Tint fills, selected rows. |

`--info` **aliases `--primary`** on purpose: the system has exactly one blue.
Do not introduce a separate info hue.

### 2.2 Color — neutrals (Slate ramp)

Mirrors the MUI `neutral` scale in `theme.ts`.

| Token | Value | Role |
|---|---|---|
| `--bg-surface` | `#FFFFFF` | Cards, sheets, app bar. |
| `--bg-page` | `#F8FAFC` | Page background (slate-50). |
| `--bg-tertiary` | `#F1F5F9` | Hover fills, wells (slate-100). |
| `--border-light` | `#E2E8F0` | Hairline dividers, card borders (slate-200). |
| `--border` | `#CBD5E1` | Stronger separators, input borders (slate-300). |
| `--text-muted` | `#94A3B8` | **Non-text only** — decorative marks, disabled glyphs. Fails AA as body text (≈2.6:1). See §5.1. |
| `--text-tertiary` | `#64748B` | Smallest readable metadata ("Last action · today"), captions (≈4.6:1 on white). |
| `--text-secondary` | `#334155` | Supporting copy, secondary labels. |
| `--text-primary` | `#0F172A` | Body text, headings (slate-900). |

### 2.3 Color — semantic

| Token | Value | Contrast on `--bg-surface` | Use |
|---|---|---|---|
| `--success` | `#15803D` | ≈4.9:1 ✓ AA | "Became law", "Adopted", positive confirmation **text/icons**. |
| `--success-tint` | `#F0FDF4` | — | Success badge / alert background. |
| `--error` | `#DC2626` | ≈4.5:1 ✓ AA | Errors, "Vetoed", "Failed", destructive. |
| `--error-tint` | `#FEF2F2` | — | Error badge / alert background. |
| `--warning` | `#B45309` | ≈4.5:1 ✓ AA | Warnings, caution markers **as text or solid fill**. |
| `--warning-tint` | `#FFFBEB` | — | Warning badge background (dark text on tint). |

> **v1.1 change.** `--success` moves `#16A34A → #15803D` and `--warning` moves
> `#D97706 → #B45309` so both pass AA as text. The AA values already exist in
> `theme.ts` as `success.dark` / `warning.dark`; v1.1 promotes them to the base
> token. The brighter originals survive only as the MUI `.light` steps for
> **non-text fills** (meter segments, large blocks) where 3:1 (WCAG 1.4.11)
> applies. See [`cleanup.md`](./cleanup.md).

**Warning has two canonical forms** (open decision #7, resolved here):

- **Badge / chip:** light tint (`--warning-tint`) background + dark text
  (`--warning`). Text-on-tint carries the AA burden.
- **Solid marker / fill:** solid `--warning` (`#B45309`) + white text/glyph.

Both are intended. Pick tint for inline badges, solid for standalone markers.

### 2.4 Color — chamber & party

| Token | Value | Meaning |
|---|---|---|
| `--chamber-senate` | `#6B21A8` | Senate (purple-700). |
| `--chamber-house` | `#0891B2` | House (cyan-700). Reassigned off green so chamber ≠ "passed". |
| `--party-d` | `#2563EB` | Democratic. |
| `--party-r` | `#DC2626` | Republican. |
| `--party-i` | `#64748B` | Independent / other. |
| `--party-fg` | `#FFFFFF` | Foreground on any party fill. |

> **Open decision #2 (unresolved — needs a product call).** Party D reuses the
> brand blue and party R reuses the error red. On a non-partisan tool this
> risks (a) reading as editorial alignment and (b) colliding semantically
> (a red R badge next to a red "Vetoed" chip). Options: keep, or assign
> distinct party hues (e.g. party-D indigo `#4F46E5`, party-R a warmer red
> outside the error ramp). **Do not resolve in code until product signs off.**
> Tracked in [`audit.md`](./audit.md).

### 2.5 Elevation

Flat by default. Borders do the separating; shadow signals interactivity only.

| Token | Value | Use |
|---|---|---|
| `--shadow-sm` | `0 1px 2px rgba(15,23,42,.04)` | Rare; subtle raise. |
| `--shadow-md` | `0 4px 12px rgba(15,23,42,.06), 0 1px 2px rgba(15,23,42,.04)` | Tooltips, popovers, card hover. |

Cards, Paper, Accordion default to **elevation 0 + 1px border** (`theme.ts`).

### 2.6 Radius

Collapsed to a **two-step scale**:

| Token | Value | Use |
|---|---|---|
| `--radius` (theme `shape.borderRadius`) | `8px` | Buttons, inputs, chips-as-rect, alerts, tooltips, small cards. |
| `--radius-full` | `9999px` | Pills, chips, avatars, meter segments. |

> **Reconciliation note (v1.1).** Card radius is currently inconsistent:
> `ui-tokens.ts#CARD.borderRadius` renders CivicCard at **24px**, the MUI
> `MuiCard` override is **8px**, and the in-app `/design-system` page copy says
> **12px**. v1.1 canonicalizes card radius at **8px** (small surfaces) with an
> optional larger `--radius-lg 16px` for marketing/hero cards — *pick one per
> surface, not three by accident.* Migration in [`cleanup.md`](./cleanup.md).

### 2.7 Spacing & layout

- Base unit: **8px** (MUI `spacing(1)`). Use multiples.
- Content max width: **1200px** (`maxWidth.content`, Tailwind) / MUI `Container maxWidth="lg"`.
- Card grid: 1 col mobile → 2 tablet (`sm`) → 3 desktop (`md`), gap `spacing(3)` (`ui-tokens.ts#GRID`).

---

## 3. Typography

Two families (`theme.ts`):

- **Display / headings — Aesthet Nova** (Adobe Typekit), weight **500**, serif.
  Loaded non-blocking; `aesthet-nova-fallback` (size-adjusted Georgia) prevents
  layout shift during swap (`globals.css`).
  `--font-display: "aesthet-nova", "aesthet-nova-fallback", Georgia, …, serif`.
- **UI / body — Instrument Sans** (`next/font/google`), weights 400/500/600.
  `--font-sans: var(--font-instrument-sans), …, sans-serif`.
- **Mono — JetBrains Mono** stack, for code/token references only.

> **Open decision #1 (blocks production font tokens).** Aesthet Nova is a paid
> Pangram Pangram face served via Typekit. Self-hosting for production needs a
> confirmed web license + font files, **or** a licensed serif substitute. Until
> resolved, the Typekit kit + Georgia fallback is the shipping path. Tracked in
> [`audit.md`](./audit.md).

### 3.1 Type scale

Headings: serif, weight 500, line-height 1.4, letter-spacing 0 (`theme.ts`).

| Role | Size | Weight | Family |
|---|---|---|---|
| h1 | 2.5rem / 40px | 500 | serif |
| h2 | 1.875rem / 30px | 500 | serif |
| h3 | 1.625rem / 26px | 500 | serif |
| h4 | 1.375rem / 22px | 500 | serif |
| h5 | 1.125rem / 18px | 500 | serif |
| h6 | 1rem / 16px | 500 | serif |
| subtitle1 | 0.9375rem / 15px | 500 | sans (lead) |
| body1 | 0.875rem / 14px | 400 | sans (default body) |
| body2 | 0.8125rem / 13px | 400 | sans (supporting) |
| caption | 0.75rem / 12px | 400 | sans (metadata) |
| overline | 0.75rem / 12px | 500 | sans, UPPERCASE, +0.08em |

Semantic role → variant mapping lives in `src/lib/ui-tokens.ts#TYPE`
(`heroTitle`, `pageTitle`, `sectionTitle`, `cardTitle`, `subsection`, `body`,
`supporting`, `meta`). Prefer those over ad-hoc variants so surfaces stay
aligned.

### 3.2 Copy

All user-facing text follows `docs/voice-and-tone.md`: neutral, non-partisan,
sentence-case headings ("Bills," not "Explore Bills"), device-neutral verbs
("select," never "tap/click"), CTAs name the destination ("Browse bills →").

---

## 4. Components

Canonical primitives (do not re-implement):

| Primitive | Path | Notes |
|---|---|---|
| Button | MUI, themed | Sentence case, 8px radius, `minHeight 44`, no shadow. |
| Chip | `components/ui/Chip.tsx` (`MetaChip`, `SeverityChip`, `ChamberChip`, `BillNumberChip`) | Pill, sizing from `ui-tokens.ts#CHIP`. Status color yields to MUI `outlinedSuccess`/`Error` so "Signed"/"Vetoed" keep their hue. |
| Card shell | `components/ui/CivicCard.tsx` | Shared border/radius/elevation/hover for bill, member, ordinance, meeting cards. Tokens: `ui-tokens.ts#CARD`. |
| Card grid | `components/ui/CardGrid.tsx` | Standard responsive breakpoints + gap. |
| Bill card | `components/bills/KYBillCard.tsx` | Canonical grid tile. **The whole card is one link** (§6.4). |
| Progress meter | `components/bills/BillProgressMeter.tsx` | 4-stage meter (§6.5). |
| Section header | `components/civic/SectionHeader.tsx` | Title + optional icon/caption/href. |
| Empty state | `components/civic/EmptyState.tsx` | See §6.9. |
| Stats grid | `components/bills/StatsGrid.tsx` | Metric tiles. |

Icon sizing: `ui-tokens.ts#ICON_REM` (`inline` 16px → `nav` 22px → `section`
24px → `hero` 28px).

---

## 5. Accessibility (AA is the floor)

### 5.1 Contrast

- **Text ≥ 4.5:1** (≥3:1 for ≥18.66px bold / ≥24px). Every pairing in §2.2–2.3
  meets this. `--text-muted` (`#94A3B8`) is **not** a text color — decorative /
  disabled marks only.
- **Non-text ≥ 3:1** (WCAG 1.4.11) for UI boundaries, meter fills, focus rings.
- Read/secondary metadata uses `--text-tertiary`, **never** `--text-muted`
  (v1.1 fix).

### 5.2 Focus

Global `:focus-visible` ring: `2px solid var(--primary)`, `outline-offset 2px`,
inherits border-radius (`globals.css`). Interactive cards reuse
`ui-tokens.ts#FOCUS_RING`. High-contrast media query widens to 3px.

### 5.3 Structure & input

- One `<h1>` per page; heading levels don't skip.
- Skip link (`.skip-link`) to `#main-content`; MUI modals portal into
  `#main-content` so the skip link/header/footer aren't `aria-hidden` while
  focusable (`theme.ts#getMainContentModalContainer`).
- Every input labelled; error state pairs color with text (never color alone).
- Touch targets ≥44px (`.touch-target`, button/icon-button/select floors in
  `theme.ts`).

### 5.4 Color independence

No status is conveyed by color alone. "Vetoed" pairs red with the word *and* a
block icon + hatched fill in the meter; the party badge carries the letter
(D/R/I), not just the hue.

### 5.5 Motion

`@media (prefers-reduced-motion: reduce)` neutralizes animations/transitions
globally (`globals.css`). `@media (forced-colors: active)` drops gradient text
to `CanvasText`.

---

## 6. Patterns

### 6.1 Navigation
Flat white bar, hairline bottom border (`nav.nav-container`). Active item:
weight 600 + 2px inset underline in `--primary`. 72px toolbar min-height.

### 6.2 Buttons
Contained (primary action), outlined (secondary), text (tertiary). Sentence
case, no shadow, 44px min height. One primary action per view.

### 6.3 Chips / badges
Pill shape. Topic/chamber/status via the `ui-tokens.ts#CHIP` scale. Status
chips keep semantic hue; never wipe an `outlinedSuccess`/`Error` color to gray.

### 6.4 Bill card
The entire `KYBillCard` is a single link to the bill detail page (stretched-link
pattern) — not a div with an inner "View" button. One focusable target, whole
card is the hit area, focus ring wraps the card.

### 6.5 Bill progress meter

Generalized legislative-progress model — the visual contract for
`components/bills/BillProgressMeter.tsx` backed by `src/lib/ky-bill-progress.ts`.
Segmented bar, one segment per stage, `gap 0.75`, segment radius `full`.

**Stage counts by bill type** (open decision #8 — confirm wording with
product/legal):

| Bill type (designation) | Stages | Labels |
|---|---|---|
| Bill / joint resolution — HB, SB, HJR, SJR | **4** | Introduced → Passed {origin} → Passed {second} → **Became law** |
| Concurrent resolution — HCR, SCR | **3** | Introduced → Passed {origin} → Adopted by both chambers |
| Simple resolution — HR, SR | **2** | Introduced → Adopted by {chamber} |

**Wording rationale (do not "correct" without checking `ky-bill-progress.ts`):**

- **"Became law"** not "Signed" — a KY bill is enacted whether signed, unsigned
  after 10 days, or overridden after veto; joint resolutions have the force of
  law and go to the governor.
- Concurrent resolutions are **adopted**, never signed (they don't go to the
  governor).
- Simple resolutions: a single chamber acts.

**Fill & state:**

- Fills to the furthest stage reached (`reachedIndex`). Fully enacted/adopted
  reads **green** (`--success`); still moving reads **blue** (`--primary`).
- Terminal **vetoed**: fill through "passed both chambers", final segment shown
  blocked — red + 45° hatch + block icon + label "Vetoed" (color + icon + text,
  never color alone).
- Terminal **failed** / **adjourned sine die**: caption explains it stopped
  ("Adjourned sine die — pending when the session ended, so it did not pass.").
- `role="group"` with an `aria-label` summarizing step N of M / terminal state.
- Hover shows the same educational tooltip the status chip uses.

Variants: `card` (compact bars + one caption), `detail` (per-stage labels +
check/block icons + status line).

### 6.6 Cards, sections, layout
Elevation-0 bordered surfaces; `SectionHeader` for titled regions; `EmptyState`
for zero-result surfaces; `StatsGrid` for metric rows.

### 6.7 Marketing hero
Gradient band `--primary → --primary-light` (135°), white contrast text, one
secondary-colored CTA. `forced-colors` drops the gradient safely.

### 6.8 Data honesty
Freshness/attribution surfaces (`DataFreshnessNote`, `AiSummary*`) state where
data comes from and where it lags — a deliberate trust signal, not a disclaimer
to minimize (voice guide, "honest sourcing").

### 6.9 Feedback & loading (v1.1)

| Pattern | Spec |
|---|---|
| **Skeleton** | Slate-100 block, `@keyframes pulse` (opacity 1↔0.5, 1.5s). Match the real element's box. Disabled under reduced-motion. |
| **Spinner** | MUI `CircularProgress`, `--primary`, for indeterminate waits >~400ms. Pair with an accessible label. |
| **Progress (determinate)** | Linear bar, `--primary` fill on `--bg-tertiary` track, 6–8px, radius `full`. `role="progressbar"` + `aria-valuenow`. |
| **Toast** | Bottom, `--bg-surface` + 1px border + `--shadow-md`, semantic left accent, sentence-case message, auto-dismiss ~5s, `role="status"` (polite). Never the only signal for an error. |
| **Empty state** | `components/civic/EmptyState.tsx`. Neutral message ("No items match your filters."), optional single next action. No blame, no exclamation. |

---

## 7. Assets

Brand assets are catalogued in [`assets/README.md`](./assets/README.md).
Shipping logo/icon files live in `public/branding/` (`Logo-03.png`,
`favicon.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`).

> **Open decision #3 (unresolved).** A solid-white knockout logo (for
> dark/gradient backgrounds) and a white-on-blue default favicon were requested
> but never produced. They are **not** in this change. Provide/approve the
> source and they land in a follow-up. Do not fabricate a knockout by CSS-only
> inversion of the color logo — request the real asset.

---

## 8. Dense table / list archetype

> **Open decision #4 (deferred to v1.2).** The power-user ICP — an advocacy
> staffer scanning 1,400+ bills — still lacks a sortable/paginated dense table
> spec. Current surfaces use the card grid + `PaginatedSection`. A true data
> table (sticky header, sortable columns, row density toggle, keyboard nav) is
> **out of scope for v1.1**; noted so it isn't mistaken for covered.

---

## 14. Out of scope

- **Dark mode.** `lightTheme` is the single source; the prior `darkTheme` /
  `ThemeMode` shims were removed to avoid "dark mode is coming" confusion
  (`theme.ts`). If reintroduced, it needs its own token pass.

---

## Change log

**v1.1**
- Unified onto one semantic token set; documented the `--primary` / `--text-*`
  contract as singular.
- Specified AA-passing `--success` (`#15803D`), `--warning` (`#B45309`), and
  read-metadata on `--text-tertiary` (off `--text-muted`).
- Reconciled fonts (Aesthet Nova 500 + Instrument Sans), type scale (H1 40),
  and a two-step radius.
- Bill card as a real link; input error/success, skip link, reduced-motion.
- Added Feedback & loading patterns (§6.9) and the 4-stage progress meter
  (§6.5) matching the live component.
- Logged 8 open decisions (§3, §5.4/2.4, §7, §8, `audit.md`) rather than
  silently guessing them.
