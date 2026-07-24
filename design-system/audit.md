# Design System v1.1 — Audit

Accessibility, functionality, and ICP evaluation of the KYVKY design system,
plus the v1.1 status of each finding. Companion to
[`guidelines.md`](./guidelines.md) and [`cleanup.md`](./cleanup.md).

**Legend:** ✅ resolved in spec & code · 📄 resolved in **spec**, code migration
pending (see `cleanup.md`) · 🔲 open decision (needs a human call) · ⏭ deferred.

> **Update (v1.1 code migration).** Phases 1–2 of [`cleanup.md`](./cleanup.md)
> are now applied: the contrast promotions (`--success #15803D`,
> `--warning #B45309`), the `text.tertiary` metadata role, and the distinct
> party colors are live in `globals.css` / `theme.ts` / `tailwind.config.js` /
> `bill-display.ts`. Rows below are updated accordingly.

---

## 1. Accessibility

### 1.1 Contrast (WCAG 1.4.3 / 1.4.11)

Five failures found against `--bg-surface` (`#FFFFFF`); all now specified at AA.

Ratios below are measured (WCAG relative-luminance formula), not estimated.

| # | Pairing | Was | Ratio | Now | Ratio | Status |
|---|---|---|---|---|---|---|
| 1 | Success text / "Became law" | `#16A34A` | 3.30:1 ✗ | `#15803D` | 5.02:1 ✓ | ✅ |
| 2 | House chamber (when it was green) | `#16A34A` | 3.30:1 ✗ | `#0891B2` cyan-700 | non-text ✓ | ✅ |
| 3 | Warning text / caution | `#D97706` | 3.19:1 ✗ | `#B45309` | 5.02:1 ✓ | ✅ |
| 4 | Party badges (white text on fill) | `#2563EB`/`#DC2626` | 5.17 / 4.83 | `#4338CA`/`#BE123C`/`#475569` | 7.90 / 6.29 / 7.58 ✓ | ✅ |
| 5 | Read / secondary metadata | `#94A3B8` | 2.56:1 ✗ | `text.tertiary #64748B` | 4.76:1 ✓ | ✅ |

> The AA success/warning values were promoted to the base tokens in
> `globals.css` + `theme.ts` (`main`); the brighter originals live on as
> `*-light` for non-text fills only (≥3:1). `--text-muted #94A3B8` is retained
> but reclassified **non-text** (decorative/inactive), and a first-class
> `text.tertiary` (slate-500) role was added for readable metadata. Party colors
> were the exact-token collision from open decision #2 — now distinct hues (§4).
> Genuine readable-text sites moved off `text.disabled`: `DistrictMapExplorer`
> help caption, `BillDetailView` "(clerical)" annotations, `CommitteeMaterials`
> dead-link label. Icons, separator dots, list markers, and upcoming/inactive
> states correctly stay muted.

### 1.2 Focus visibility (2.4.7) — ✅
Global `:focus-visible` 2px `--primary` ring, offset 2px, radius-inheriting
(`globals.css`); 3px under `prefers-contrast: high`. Interactive cards share
`ui-tokens.ts#FOCUS_RING`.

### 1.3 Keyboard & structure (2.1.1 / 1.3.1 / 2.4.1) — ✅
Skip link to `#main-content`; modals portal into `#main-content` so header/
footer/skip link aren't `aria-hidden` while focusable
(`theme.ts#getMainContentModalContainer`). One `<h1>` per page; no skipped
levels.

### 1.4 Touch targets (2.5.5) — ✅
44px floors on Button/IconButton/Select/TextField (`theme.ts`); `.touch-target`
helper. `size="small"` retains a 32px footprint for genuine density (chip
delete, dense rows).

### 1.5 Color independence (1.4.1) — ✅
Meter "vetoed" = red + block icon + 45° hatch + "Vetoed" text. Party badge
carries the D/R/I letter. No status by color alone.

### 1.6 Motion & forced colors (2.3.3 / 1.4.12) — ✅
`prefers-reduced-motion` neutralizes transitions/animations globally;
`forced-colors: active` drops gradient text to `CanvasText`.

### 1.7 Labelled inputs & feedback (3.3.1 / 4.1.3) — 📄
Input error/success states and `role="status"` toasts specified in
`guidelines.md` §6.9. Audit call sites during the §6.9 rollout to confirm every
field pairs color with text and errors are announced.

---

## 2. Functionality / consistency

| Finding | Detail | Status |
|---|---|---|
| **Party color drift** | Two disagreeing sources: CSS vars (`--party-d/r/i`) and `bill-display.ts#partyBadgeBackgroundColor` (`#1565c0`/`#c62828`/`#555`). Unified onto one distinct set. | ✅ |
| **Token duplication** | Back-compat aliases (`--blue-primary`, `--green-primary`, `--info`, `background`/`foreground`, …) removed from `globals.css` + `tailwind.config.js`; the one live consumer (`error.tsx` → `--bg-primary`) migrated to `--bg-surface`. Only the singular semantic set remains. | ✅ |
| **Card radius drift** | Resolved: the intentional 24px CivicCard look is kept and **named** (`--radius-lg` / Tailwind `rounded-card` / `ui-tokens#CARD`); MUI Card/Paper stays 8px; the false "12px" page copy was fixed. Three deliberate steps (8 / 24 / full), no drift — zero visual change. | ✅ |
| **Bill card link** | Whole card is one link (stretched-link), not a div + inner button. | ✅ |
| **Progress meter parity** | Meter, status chip, and browse filters all derive from `ky-bill-progress.ts` / `classifyKyBillBrowseBucket` — they agree by construction. | ✅ |
| **Chip status hue** | `outlined` override yields to `outlinedSuccess`/`Error` so "Signed"/"Vetoed" keep color (regression previously rendered them gray). | ✅ |
| **globals.css source pointer** | Header pointed to `kyvky/project/guidelines.md` (nonexistent). Now `design-system/guidelines.md`. | ✅ |

---

## 3. ICP evaluation

Two audiences (voice guide): the **newcomer** (reference register, warmth via
anticipation) and the **power user** (advocacy staffer, 1,400+ bills).

- **Newcomer** — well served: educational tooltips on status/meter, honest
  freshness notes, glossary, neutral copy. ✅
- **Power user** — gap: no dense, sortable, paginated table archetype. Card grid
  + `PaginatedSection` scans slowly at volume. See open decision #4. ⏭ v1.2

---

## 4. Open decisions

These are **product / legal / licensing calls**, not code cleanups. They are
logged, not silently resolved.

| # | Decision | Call (product) | Status |
|---|---|---|---|
| 1 | **Aesthet Nova licensing** — paid Pangram Pangram face. | **Skip for now** — keep the Typekit kit + Georgia fallback; revisit before self-hosting for production. | ⏭ deferred |
| 2 | **Party colors overlap brand/semantic** — D=`#2563EB` (brand), R=`#DC2626` (error). | **Change** — distinct hues: D indigo `#4338CA`, R rose `#BE123C`, I slate `#475569`. Applied to `globals.css` + `bill-display.ts`. | ✅ done |
| 3 | **White knockout logo + favicon** — never produced. | **Delivered** — white-on-blue favicon/app-icon set generated + wired (`layout.tsx`, `manifest.json`); knockout wordmark available for dark surfaces (not placed on the hero). | ✅ done |
| 4 | **Dense table archetype** — power-user ICP unserved. | **Defer** — noted in `TASKS.md` for v1.2. | ⏭ v1.2 |
| 5 | **Where docs live** — `design-system/`, `/docs`, or separate repo. | **Keep `design-system/`** — confirmed. | ✅ done |
| 6 | **Token migration scope** — rename in this PR or follow-up. | **Migrate now** — Phases 1–2 + party colors applied to code (`tsc`/`lint` clean). Alias retirement (Phase 4) still follow-up. | ✅ done |
| 7 | **Warning canonical form** — tint+dark-text vs solid+white. | Both, by context: tint for badges, solid for markers (guidelines §2.3). | ✅ resolved |
| 8 | **Progress-meter stage mapping** — 4 bill / 3 CR / 2 SR, "Became law". | Matches the live `ky-bill-progress.ts` model exactly; wording awaits an explicit product/legal nod but needs no code change. | ✅ matches code |

---

## 5. v1.1 summary

- **Spec** (this folder) is complete and internally consistent.
- **Code**: accessibility structure, focus, touch targets, meter, bill-card
  link, and chip hue were already live (✅). The **contrast promotions**
  (success/warning), the **`text.tertiary` metadata role**, the **read-metadata
  migration**, and the **distinct party colors** are now applied to
  `globals.css` / `theme.ts` / `tailwind.config.js` / `bill-display.ts` and the
  affected components (`tsc --noEmit` and `next lint` clean).
- **Migration complete:** contrast promotions, `text.tertiary` + read-metadata,
  distinct party colors, back-compat alias retirement (Phase 4), and the radius
  reconciliation (Phase 3, named steps — zero visual change) are all applied.
- **One item remains:** font self-hosting (decision #1, awaits licensing). The
  white knockout logo + favicon (decision #3) is now delivered and wired. The
  v1.2 dense table (decision #4) is logged in `TASKS.md`.
