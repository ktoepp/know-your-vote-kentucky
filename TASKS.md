# Know Your Vote Kentucky — Task Tracker

> This file is the source of truth for roadmap tasks.
> Update it as work is completed or priorities shift.
> It lives in the repo so any AI with file access can read and act on it.

---

## In Progress

*(none)*

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

---

## Backlog

- **LRC vs structured APIs (legislator data strategy)** — Kentucky LRC / `legislature.ky.gov` is the **canonical public-facing** source, but it does **not** provide a stable, documented **bulk API** for the full chamber roster the way Open States does. The app **syncs** from Open States into `ky_legislators` and **points users to the LRC** with stored profile URLs and official House/Senate directory fallbacks (`kyLegislaturePublicUrl` in `src/lib/ky-member-utils.ts`). **Revisit** if the state publishes **machine-readable bulk data** (CSV, API) with clear reuse terms.
- **"Follow this bill" — email alerts** — Subscribe by email on status / vote / signed / veto. Needs accounts or email opt-in, Supabase subscription table, sync diff notifications, transactional email (e.g. Resend).
- **Address search UX on map** — Street address lookup exists (`mapbox-geocode.ts`). Optional improvements: autocomplete/typeahead, clearer empty states.
- **"How to contact your rep"** — District map accordion covers basics; expand with capitol workflows, hearings, testimony links to LRC as product needs evolve.

---

## Deferred / Decided Against

- **Executive orders sync** — Deferred. `governor.ky.gov` listings are unreliable for automated sync (404s, client-only rendering). Scraper exists in `src/lib/ky-executive-orders.ts` but is excluded from product surface and cron. Revisit when a stable feed/API exists.
- **Filibuster / cloture / budget reconciliation tooltips** — Removed. Federal Congress concepts only; do not re-add.
