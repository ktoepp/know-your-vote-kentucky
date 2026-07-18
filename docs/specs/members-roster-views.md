# Members roster views — fix, optimize, then search / filtered / historical views

**Status:** Active (2026-07-18). Phases 0 **and 1 shipped** on `claude/members-page-lag-pv5qef`;
next up is Phase 2. Operator prerequisite for 1d's slugs: apply migration **042**, then run
`sync:ky:legislators` (code is fallback-safe either way).
**Owner surfaces:** `/members`, `/members/map`, `/members/[slug]`, `/search` (members leg), roster APIs.

## Context

The 2026-07-18 perf pass (see TASKS.md § Recently completed) removed the worst `/members`
interaction lag: O(cards × roster) seat-conflict rescans per render, un-memoized cards
re-rendering on every keystroke, a scroll-hijacking `#hash` effect, and `committee_memberships`
shipping unused in the browse/map payload. Measured at 4× CPU throttle: typing max input event
1576 → 184 ms; long-task time while typing 6.7 s → 0.46 s.

What remains, and where this is heading, in one sentence each:

- **Fix/optimize (Phase 1):** the residual costs are card *mount* work (~0.8 s to mount 24 cards
  under throttle), the still-shipped inactive rows + client-side conflict logic, a full-table
  `select('*')` scan per profile lookup, and two small UX holes (deep links beyond the first 24;
  slug collisions).
- **Filtered views (Phase 2):** filter state lives in React state only — not shareable, not
  back-button-safe, and limited to chamber + substring.
- **Search (Phase 3):** `/members` search is substring over name/district; fine for 140 rows,
  wrong shape for a historical corpus.
- **Backfill views (Phase 4):** the DB retains former-member rows (`active = false`) and the UI
  already renders former-member profiles with caveats, but there is **no term/service data** on
  `ky_legislators` — only the `active` boolean — so "who held HD-5 in 2024" is unanswerable.
  This is the long pole and the only schema work in the plan.

> **Interpretation note — "backfill views."** This plan reads it as *end-user views of
> backfilled/historical data*: former members, seat history per district, past-session rosters.
> If it instead means *operator views to monitor data backfills* (a dashboard over
> `ky_sync_state` / `ky_sources` runs), that is a different, smaller project — confirm before
> starting Phase 4.

## Principles

1. **The fast path stays small.** `/members` browse ships active members only, from
   `unstable_cache`. Historical corpus is fetched on demand and never rides the browse payload.
2. **Derived facts are computed server-side, once.** Seat-conflict / LRC-link safety, slugs, and
   term ranges are cache-build or DB concerns, not per-card client work. (The WeakMap index from
   Phase 0 remains as the fallback for surfaces that still pass a roster.)
3. **The URL is the view state.** Every filter/search/view permutation is shareable and
   back-button-safe, mirroring `BillsBrowsePage`'s searchParams pattern.
4. **Repo conventions hold:** migrations numbered and applied to primary before deploy (next free:
   042), accuracy-audit coverage for new data, `docs/voice-and-tone.md` for former-member copy,
   measurements with the stub + throttle rig recorded in TASKS.md.

## Phase 1 — Finish the fix (small PRs, each independently shippable)

**1a. Server-computed LRC link safety + active-only payload.**
During roster cache build (`ky-legislator-roster-server.ts`), where the full table is already in
hand, compute the per-member seat-conflict verdict and attach it as a boolean field (e.g.
`lrc_district_link_unsafe`). Then ship **active rows only** to browse/map (drop the 15 historical
rows currently sent for conflict rules alone). `MemberCard` / `MemberName` prefer the flag when
present and fall back to the roster scan (keeps `/members/[slug]` and map tooltips working
unmodified). Payload −10% on top of Phase 0; deletes the last roster-scan dependency from the
browse client.
*Acceptance:* the three engineered-fixture link assertions from the Phase 0 rig stay
byte-identical; browse payload contains zero `active: false` rows.

**1b. Deep-link auto-expand.** `/members#slug` targets beyond the first 24 of a section silently
fail (card not mounted until "Load more"). On mount, if the hash matches a member in data but not
in DOM, expand that section's `visibleCount` to include it, then scroll (still ref-guarded,
still once).

**1c. Mount-cost trim.** The irreducible cost left is mounting ~24 MUI cards per Load
more/toggle. In order of leverage: `content-visibility: auto` + `contain-intrinsic-size` on
`CardGridItem` (skips offscreen layout/paint for long lists); per-card DOM audit — `Tooltip`
mounts with empty titles, `CopyableEmail`'s per-card `Tooltip`+`IconButton`, minimap `Box`
nesting. Re-measure with the rig; target <400 ms max event for Load more at 4× throttle.
Virtualization (windowing) is explicitly **deferred** — revisit only if field INP says the list
is still slow after 1c, since it complicates a11y, find-in-page, and the hash anchors.

**1d. Slug hardening (prereq for Phases 3–4).** `memberSlug(name)` collides for repeated names —
duplicate DOM ids and ambiguous `/members/[slug]` routes; the historical corpus makes collisions
likelier. Migration **042**: `ky_legislators.profile_slug` unique, backfilled (collision policy:
append district, e.g. `jane-smith-hd-5`), written by the legislator sync, indexed. Profile lookup
becomes an indexed `eq` (replacing today's `select('*')` full-roster scan + fuzzy matching, which
stays only as a redirect fallback for legacy URLs).

## Phase 2 — Filtered views (URL-driven)

- **2a.** Move chamber + query to searchParams (`/members?chamber=house&q=smith`) with
  `router.replace` shallow updates; keep `useDeferredValue`. `resetKey` derives from the URL.
- **2b.** New filters, all client-side over the active roster (140 rows — no API changes):
  **party** (chip toggle), **role** (leadership titles from `role_title`), **committee**. For
  committee, don't re-add `committee_memberships` to the browse payload (undoes Phase 0's trim);
  lazy-load a members→committee-slugs index (one cached fetch, ~10 kB) the first time the filter
  is opened.
- **2c.** Sort control: name (default) | district | party; tenure joins after Phase 4.
- **2d.** SEO: filtered permutations canonical to `/members`; optionally promote
  `/members/house` + `/members/senate` to real prerendered routes (mirrors `/bills` house/senate)
  if we want indexable chamber pages — decide when we see demand.

## Phase 3 — Search

- **3a. Now (client, corpus = 140):** extend matching to party, role title, committee names, and
  district aliases ("HD-5", "House District 5", bare "5"); rank startsWith > word-boundary >
  includes; highlight matches. Still `useDeferredValue`, no server round-trip.
- **3b. With the historical corpus (server):** members FTS RPC in the mold of
  `ky_bills_plain_search` (migration 017) — tsvector over name variants + district + role, with
  `active`/term filters and pagination — behind `/api/roster/search`. `/members` uses it only in
  historical view; the active-roster fast path keeps client search.
- **3c.** Global `/search` members leg stays client-side against the active slim roster until 3b
  exists, then optionally includes former members (labeled, ranked below current members).

## Phase 4 — Historical ("backfill") views ← confirm interpretation first

- **4a. Data model (the long pole).** Migration: `ky_legislator_terms`
  (`legislator_id, chamber, district, party, ga_or_session_label, start_date, end_date, source`).
  Backfill script (repo pattern: `scripts/backfill-*.ts` with `--dry-run`) from Open States
  `roles` history + LegiScan sessions/people data; the legislator sync maintains it forward.
  Accuracy-audit checker for term sanity (no overlaps per seat, end_date required for
  `active = false` rows).
- **4b. UI:**
  - `/members?view=former` (or `/members/former`): server-paginated list reusing `MemberCard`'s
    existing former-member rendering (caveats already on-voice); server search via 3b.
  - Profile "Service" section: term ranges per seat ("HD-5, 2019–2023").
  - District seat history: on `/members/[slug]` and the map tooltip — "who held this seat" —
    powered by a `ky_legislator_terms` seat index.
- **4c. Guardrails:** historical data fetched on demand only; former-member pages likely
  `noindex` initially (decide with SEO hat on); LRC district-link suppression already handles
  turnover correctly (Phase 0 verified both stored and inferred URL paths).

## Phase 5 — Observability + regression protection (parallel, cheap)

- Watch field INP for `/members` in Vercel Speed Insights after Phase 0 deploys; PostHog events
  for search/filter usage (named-event precedent from PR #78) to size Phase 2/3 scope honestly.
- Commit the Phase 0 measurement rig under `scripts/perf/` (PostgREST stub + throttled Playwright
  A/B; recipe in TASKS.md § 2026-07-18) as `npm run perf:members:ab` so future roster work
  re-measures instead of guessing. Playwright stays a scratch install, not a repo dependency —
  the script documents its own setup.

## Sequencing & dependencies

```
Phase 1a ─┐
Phase 1b ─┼─ independent, ship in any order (1a first: biggest payoff)
Phase 1c ─┘
Phase 1d ──→ Phase 3b ──→ Phase 4b (server search over historical corpus)
Phase 2a ──→ 2b/2c/2d (URL state before new filters)
Phase 4a ──→ 4b/4c (terms data before any historical UI)
Phase 5 anytime; rig commit ideally alongside 1c (it's the measuring stick)
```

Rough sizing: 1a/1b/1c/1d ≈ one small PR each; 2 ≈ two PRs (URL state; filters+sort); 3a ≈ one
PR; 4a ≈ the big one (migration + backfill + audit checker); 4b ≈ two PRs. No step blocks the
site; each lands behind the existing pages.

## Open questions

1. ~~**"Backfill views" meaning**~~ — **Resolved 2026-07-18:** end-user historical member views,
   as planned. Phase 4 interpretation stands.
2. **Committee filter data path** — lazy index fetch (proposed) vs. re-adding slugs to the browse
   payload? Gates 2b.
3. ~~**County/region filtering**~~ — **Resolved 2026-07-18: out of scope.**
4. **Former-member SEO** — index or noindex `/members?view=former` and former profiles? Gates 4b.
