# Design System v1.1 — Audit

Accessibility, functionality, and ICP evaluation of the KYVKY design system,
plus the v1.1 status of each finding. Companion to
[`guidelines.md`](./guidelines.md) and [`cleanup.md`](./cleanup.md).

**Legend:** ✅ resolved in spec & code · 📄 resolved in **spec**, code migration
pending (see `cleanup.md`) · 🔲 open decision (needs a human call) · ⏭ deferred.

---

## 1. Accessibility

### 1.1 Contrast (WCAG 1.4.3 / 1.4.11)

Five failures found against `--bg-surface` (`#FFFFFF`); all now specified at AA.

| # | Pairing | Was | Ratio | Now | Ratio | Status |
|---|---|---|---|---|---|---|
| 1 | Success text / "Became law" | `#16A34A` | ≈3.0:1 ✗ | `#15803D` | ≈4.9:1 ✓ | 📄 |
| 2 | House chamber (when it was green) | `#16A34A` | ≈3.0:1 ✗ | `#0891B2` cyan-700 | ≈3.3:1 (non-text)✓ | ✅ |
| 3 | Warning text / caution | `#D97706` | ≈3.1:1 ✗ | `#B45309` | ≈4.5:1 ✓ | 📄 |
| 4 | Party-I badge text | `#94A3B8` | ≈2.6:1 ✗ | `#64748B` | ≈4.6:1 ✓ | 📄 |
| 5 | Read / secondary metadata | `#94A3B8` | ≈2.6:1 ✗ | `--text-tertiary #64748B` | ≈4.6:1 ✓ | 📄 |

> The AA values `#15803D` and `#B45309` already exist in `theme.ts` as
> `success.dark` / `warning.dark`. v1.1 promotes them to the base token so the
> **default** rendering passes; the brighter originals remain as MUI `.light`
> steps for non-text fills only (≥3:1). `--text-muted #94A3B8` is retained but
> reclassified **non-text** (decorative/disabled). Migration: `cleanup.md` §1.

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
| **Token duplication** | Target is one semantic set (`--primary`, `--text-*`). Back-compat aliases (`--blue-primary`, `--green-primary`, `--info`, …) still resolve in `globals.css`; retire as call sites migrate. | 📄 |
| **Card radius drift** | Three values in play: `CARD.borderRadius` 24px (CivicCard), `MuiCard` 8px, `/design-system` page copy says 12px. Canonicalize (guidelines §2.6). | 📄 |
| **Bill card link** | Whole card is one link (stretched-link), not a div + inner button. | ✅ |
| **Progress meter parity** | Meter, status chip, and browse filters all derive from `ky-bill-progress.ts` / `classifyKyBillBrowseBucket` — they agree by construction. | ✅ |
| **Chip status hue** | `outlined` override yields to `outlinedSuccess`/`Error` so "Signed"/"Vetoed" keep color (regression previously rendered them gray). | ✅ |
| **globals.css source pointer** | Header pointed to `kyvky/project/guidelines.md` (nonexistent). Now `design-system/guidelines.md`. | 📄 (update in `cleanup.md` §3) |

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

| # | Decision | Recommendation | Blocks |
|---|---|---|---|
| 1 | **Aesthet Nova licensing** — paid Pangram Pangram face. | Confirm a web license + self-host files, or pick a licensed serif. Until then Typekit + Georgia fallback ships. | 🔲 Production font tokens |
| 2 | **Party colors overlap brand/semantic** — D=`#2563EB` (brand), R=`#DC2626` (error). | On a non-partisan tool, assign distinct party hues to avoid editorial/semantic collision. | 🔲 Party token values |
| 3 | **White knockout logo + favicon** — never produced. | Provide/approve source; land in follow-up. Don't CSS-invert the color logo. | 🔲 Dark-bg brand asset |
| 4 | **Dense table archetype** — power-user ICP unserved. | Defer to v1.2 with a dedicated spec. | ⏭ v1.2 |
| 5 | **Where docs live** — `design-system/`, `/docs`, or separate repo. | `design-system/` in-app (this PR's path) so `globals.css`/`theme.ts` can point at it. | 🔲 Doc location |
| 6 | **Token migration scope** — rename in this PR or follow-up. | **Ship spec now, migrate code in a follow-up** per `cleanup.md` phases. This PR is docs-only and reversible. | 🔲 Scope of this PR |
| 7 | **Warning canonical form** — tint+dark-text vs solid+white. | Both, by context: tint for badges, solid for markers (guidelines §2.3). | ✅ resolved in spec |
| 8 | **Progress-meter stage mapping** — 4 bill / 3 CR / 2 SR, "Became law". | Confirm against product/legal intent; matches `ky-bill-progress.ts` today. | 🔲 Wording sign-off |

---

## 5. v1.1 summary

- **Spec** (this folder) is complete and internally consistent.
- **Code**: accessibility structure, focus, touch targets, meter, bill-card
  link, chip hue are already live (✅). The **color-token promotions** and
  **radius/alias reconciliation** are specified but **not yet applied to
  `globals.css` / `theme.ts`** (📄) — that is a deliberate, reversible split so
  this change can merge as docs while the code migration follows `cleanup.md`
  under product sign-off on the open decisions.
