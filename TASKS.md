# Know Your Vote Kentucky — Task Tracker

> This file is the source of truth for roadmap tasks.
> Update it as work is completed or priorities shift.
> It lives in the repo so any AI with file access can read and act on it.

---

## In Progress

- **Legislator outbound links** — (1) Run production **`sync:ky:legislators`** so ranked/normalized URLs persist in `ky_legislators`. (2) Run **`npm run verify:legislator-links`** locally or in CI to catch broken outbound URLs; tune timeouts if LRC is slow.

---

## Operator checklist

- **Remove `SENTRY_ENABLE_EXAMPLE_PAGE`** from Vercel (and `.env.local` if set). The `/sentry-example-page` routes were removed from the repo; stale env vars are harmless but should be cleared.

---

## Recently completed

- **Sentry** — Example page and `/api/sentry-example-api` removed; production monitoring remains via `@sentry/nextjs` configs and `/monitoring`.
- **Tooltips** — `MemberCard` Ballotpedia / bill history segments respect global `tooltipsEnabled`; clerical-stage hint on timelines.
- **District map** — Kentucky state-shape nav icon (`KentuckyStateIcon`); exclusive House/Senate layer toggle; right-column **two legislators** explainer (**100 House / 38 Senate**); “How to contact your legislators” accordion; Mapbox-backed address lookup (biased to KY).
- **Votes & external links** — LegiScan roll call links where `roll_call_id` exists; Ballotpedia via `normalizeBallotpediaHref` / search helpers (`external-legislative-links.ts`).
- **Member profiles** — Sponsored bills and vote summaries (`fetchSponsoredBillsForLegislator`, `fetchMemberVoteRecord`).
- **UI polish** — Mobile nav Paper styling; hero CTAs; LRC committee schedule banner link; session status banner semantics; footer © / `APP_VERSION` / `/licenses`; bill detail sponsor avatars + sidebar spacing; curated bill list hides view count when appropriate.
- **Browse & search** — Bills browse `BROWSE_QUERY_ROW_LIMIT = 1000`; search merge cap aligned; **25 / 50 / 100** page sizes (`usePersistedPageSize`).
- **LegiScan subjects** — `legiscan_subjects` + `legiscan_subjects_search` (migration `015`), sync + search hooks.

---

## Up Next

- **Spot-check external legislative links** — Sponsors, roll calls, and Ballotpedia search URLs across a sample of bills and member rows (production + edge cases).
- **Members page: filter by committee** — Surface Education (etc.) committee membership from synced roster data (`ky_legislators` / committees) without requiring the district map.
- **Search: make search fully functional** — Current search has functional gaps. Goal is reliable full-text bill search that correctly surfaces results for natural-language queries (e.g. "Medicaid", "education funding", "gun rights") as well as bill designations (HB 23, SB 6). Audit `fetchKyBillsMatchingSearch` for coverage and ranking issues.
- **Search: suggestion chips using LegiScan schema** — Replace the hardcoded `Try: "..."` chips with dynamic suggestions informed by LegiScan subjects/topics. Chips should reflect actual data in the current session and help users discover what's active, not just serve as format examples.
- **Search: fix nonBillType URL error message** — When `?type=` is set to an unrecognized value, the alert shown to users exposes internal language ("The URL is set to type..."). Replace with a plain-English message that doesn't reference URL parameters or query strings.

---

## Backlog

- **Legislator links — full fidelity** — Add JSON storage (e.g. `ky_legislators.external_links` or `link_manifest` jsonb) for **all** Open States `links` entries including **social** (with `note`), not only LRC + single campaign URL. Backfill via legislator sync + optional one-off migration from current rows. UI: group **Official** vs **Social** (accessibility labels, external icons).
- **Legislator links — verifier in CI** — Add scheduled or release-gated workflow running **`npm run verify:legislator-links`** with Supabase secrets; fail or upload artifact on 4xx; allowlist known flaky endpoints if necessary.
- **LRC vs structured APIs (legislator data strategy)** — Kentucky LRC / `legislature.ky.gov` is the **canonical public-facing** source, but it does **not** provide a stable, documented **bulk API** for the full chamber roster the way Open States does. The app **syncs** from Open States into `ky_legislators` and **points users to the LRC** with stored profile URLs and official House/Senate directory fallbacks (`kyLegislaturePublicUrl` in `src/lib/ky-member-utils.ts`). **Revisit** if the state publishes **machine-readable bulk data** (CSV, API) with clear reuse terms.
- **"Follow this bill" — email alerts** — Subscribe by email on status / vote / signed / veto. Needs accounts or email opt-in, Supabase subscription table, sync diff notifications, transactional email (e.g. Resend).
- **Address search UX on map** — Street address lookup exists (`mapbox-geocode.ts`). Optional improvements: autocomplete/typeahead, clearer empty states.
- **"How to contact your rep"** — District map accordion covers basics; expand with capitol workflows, hearings, testimony links to LRC as product needs evolve.

---

## UX design tracker (agent)

Active:

- (none)

Done:

- Home IA (2026-05-09): orientation-first hero primary CTA (district map), merged topic module, bill-area-only loading spinner — see `decisions.md`.
- Members (2026-05-09): filtered roster `profileHref` bugfix; member profile `h1`/`h2`/`h3` outline, `Link` back control, bill links identifiable by underline; roster card keyboard profile navigation + portrait alt + refresh `aria-label` — see `decisions.md`.
- Legislator outbound links (2026-05-09): link ranking + normalization in code (`legislator-link-normalize.ts`, sync + read paths); production DB updates pending legislator sync — see `decisions.md`.
- **Link verifier:** `npm run verify:legislator-links` (`scripts/verify-legislator-external-links.ts`) — HEAD/GET checks for LRC, website, Ballotpedia, LegiScan URLs per active legislator.

Blocked:

- (none)

Notes:

- Designer-assisted UI/UX work follows user-provided Operating Principles (clarity before cleverness; explicit hierarchy; IA before layout; WCAG AA baseline; friction intentional; defaults and states explicit). Modes: Generative vs Critique per request. Conflict resolution: hierarchy accessibility > clarity > safety > consistency > efficiency > aesthetic refinement; state trade-offs and decision questions when ambiguous. Log substantive design decisions to `decisions.md` (append-only).

Open decisions / questions (not resolved — pick when ready):

- **Home hero vs returning bill trackers** — Orientation-first hero makes map the primary CTA. If analytics show heavy repeat bill traffic: consider nothing (scroll habits), segmented messaging, or test alternate hero emphasis. Trade-off: comprehension for new users vs immediacy for power users.
- **Member profile content order** — Sponsored bills before voting record is the default; validate with research or A/B test later (identity/contact vs legislative activity first).
- **Home hero contrast** — Outlined white CTAs on photo hero should be verified against WCAG non-text / focus visibility requirements for default state (not only hover). Automated check recommended (e.g. axe on deployed build).

---

## Deferred / Decided Against

- **Executive orders sync** — Deferred. `governor.ky.gov` listings are unreliable for automated sync (404s, client-only rendering). Scraper exists in `src/lib/ky-executive-orders.ts` but is excluded from product surface and cron. Revisit when a stable feed/API exists.
- **Filibuster / cloture / budget reconciliation tooltips** — Removed. Federal Congress concepts only; do not re-add.
