# Cleanup — `globals.css` + `theme.ts` migration plan

How to bring the code up to the [`guidelines.md`](./guidelines.md) v1.1 spec.
This is a **follow-up** to the docs PR (open decision #6): ship the spec, then
migrate code in small, reviewable phases once product signs off on the open
decisions in [`audit.md`](./audit.md). Nothing here is auto-applied.

**Golden rule:** a token value changes in **all three** places at once —
`src/app/globals.css` (`:root`), `src/lib/theme.ts` (`civicPaletteTokens` +
`lightTheme`), and `tailwind.config.js` (`theme.extend.colors`). They must not
drift.

---

## Status

- ✅ **Phase 1 (contrast promotions)** — applied.
- ✅ **Phase 2 (read-metadata → `text.tertiary`)** — applied.
- ✅ **Party colors (decision #2)** — applied (distinct indigo/rose/slate;
  `bill-display.ts` unified with the tokens).
- ✅ **Doc pointer + page copy** — `globals.css` header and the `/design-system`
  radius copy corrected.
- ✅ **Phase 4 (retire back-compat aliases)** — applied. Only `--bg-primary`
  was still referenced (`error.tsx`, migrated to `--bg-surface`); the entire
  alias block in `globals.css` and the `background`/`foreground` Tailwind
  aliases were removed.
- ✅ **Phase 3 (CivicCard radius)** — resolved by keeping the 24px look and
  naming it (`--radius-lg` / `rounded-card`); zero visual change.
- ✅ **White knockout logo + favicon (decision #3)** — delivered and wired.
- ⬜ **Font self-host (decision #1)** — awaits licensing (only remaining item).

---

## Phase 1 — Contrast promotions (safe, no rename)

Lowest risk, highest a11y payoff. Promote the AA-passing values (already present
in `theme.ts` as `.dark`) to the base tokens; keep the bright originals as the
`.light` step for non-text fills only.

- `globals.css`
  - `--success: #16A34A` → `#15803D`
  - `--warning: #D97706` → `#B45309`
  - add `--success-light: #16A34A`, `--warning-light: #D97706` (non-text fills)
  - add `--warning-tint: #FFFBEB`
  - comment `--text-muted` as **non-text only** (decorative/disabled)
- `theme.ts` — set `success.main: '#15803D'`, `warning.main: '#B45309'`; move
  old mains to `.light`. `error.main` `#DC2626` already AA (≈4.5:1); leave.
- `tailwind.config.js` — update `--success`/`--warning` mapped values; add
  `success-light` / `warning-light` / `warning-tint`.
- **Verify:** re-run the meter (green fill still reads on white), status chips
  ("Signed"/"Vetoed"), and any warning badge. Non-text meter fills may keep the
  brighter `.light` where a 3:1 fill is wanted.

**Acceptance:** every semantic **text** pairing ≥4.5:1; no visual regression in
`BillProgressMeter`, `Chip`, `Alert`.

## Phase 2 — Read-metadata off `--text-muted`

Grep for metadata/caption text still on `--text-muted` / `text.disabled` /
`#94A3B8` and move to `--text-tertiary` (`text.tertiary` / `#64748B`). Keep
`--text-muted` only on genuinely decorative or disabled elements.

```
rg -n "text-muted|#94A3B8|text\.disabled" src
```

Review each hit: is it text a user reads? → `--text-tertiary`. Decorative/
disabled? → leave.

## Phase 3 — Radius reconciliation ✅ (done)

Resolved by **naming** the existing steps rather than flattening (the rounded
24px CivicCard look is intentional — product call, 2026-07-22):

- Added `--radius` (8px), `--radius-lg` (24px), `--radius-full` to `globals.css`;
  Tailwind gained `rounded-card` → `var(--radius-lg)`.
- `ui-tokens.ts#CARD.borderRadius: 3` (=24px) documented as the `--radius-lg`
  step; value unchanged (zero visual change).
- MUI Card/Paper/Accordion stay at 8px (`--radius`) for control-density surfaces.
- Fixed the `/design-system` page copy that falsely claimed "12px".

Net scale: **8px controls · 24px cards · full pills.**

## Phase 4 — Retire back-compat aliases

`globals.css` still defines aliases (`--bg-primary`, `--blue-primary`,
`--green-primary`, `--red-primary`, `--yellow-primary`, `--info`,
`--focus-ring`, `--hover-bg`). Migrate consumers to the semantic names, then
delete the aliases.

```
rg -n "blue-primary|green-primary|red-primary|yellow-primary|bg-primary|--info\b" src
```

Do this **last** and incrementally — each alias removed only after its call
sites move. Leave `--info` aliasing `--primary` conceptually (one blue), but
consumers should reference `--primary` directly.

## Phase 5 — Doc pointer + party colors

- Update the `globals.css` header comment
  `Source of truth: kyvky/project/guidelines.md` →
  `design-system/guidelines.md`.
- **Party colors (open decision #2):** only if product chooses distinct hues,
  change `--party-d` / `--party-r` in all three files and re-verify `party-fg`
  contrast (≥4.5:1 text on fill). Do **not** change unilaterally.

---

## Sequencing & rollback

Land phases as **separate commits/PRs** in order (1 → 5). Phases 1–3 are
mechanical and independently revertable. Phase 4 is the only one that can break
a stale consumer, so gate it on a clean `rg` pass. Party-color and font changes
wait on their open decisions.

## Verification checklist (per phase)

- [ ] Value changed in `globals.css`, `theme.ts`, **and** `tailwind.config.js`.
- [ ] `npm run lint` / typecheck clean.
- [ ] `/design-system` page renders without regression.
- [ ] Contrast spot-check on changed pairings (text ≥4.5:1, non-text ≥3:1).
- [ ] `BillProgressMeter` card + detail variants unchanged in meaning.
