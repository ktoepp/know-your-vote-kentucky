# Know Your Vote Kentucky — Task Tracker

> This file is the source of truth for roadmap tasks.
> Update it as work is completed or priorities shift.
> It lives in the repo so any AI with file access can read and act on it.

---

## In Progress

- **Legislator outbound links** — Run **`npm run verify:legislator-links`** locally or in CI to catch broken outbound URLs; tune timeouts if LRC is slow. Re-run **`sync:ky:legislators`** on a cadence that fits ops so URLs and **`committee_memberships`** stay current (requires **`OPENSTATES_API_KEY`** in env).
- **Follow bills — launch hardening (M8)** — Bounce handling, copy review, end-to-end test of digest after a real bill change; optional **Welcome** React Email on first verification (spec M6) still not in repo. See [docs/specs/follow-bills.md](./docs/specs/follow-bills.md).

---

## Handoff — next agent (digest hardening + optional welcome email)

Use this when continuing **digest reliability**, **welcome mail**, or **follow-bills M8**.

### Context (already in repo)

- **Auth:** Supabase with **`@supabase/ssr`** — cookie-backed browser client ([`src/app/lib/supabaseClient.ts`](./src/app/lib/supabaseClient.ts)), middleware session refresh ([`src/lib/supabase/middleware.ts`](./src/lib/supabase/middleware.ts), [`src/middleware.ts`](./src/middleware.ts)), [`UserContext`](./src/app/lib/UserContext.tsx), auth routes under [`src/app/auth/`](./src/app/auth/), centered layout [`src/app/auth/layout.tsx`](./src/app/auth/layout.tsx) + [`AuthPaperLayout`](./src/components/auth/AuthPaperLayout.tsx).
- **Follow data:** Migration [**`019_ky_follow_bills_schema.sql`**](./supabase/migrations/019_ky_follow_bills_schema.sql) — `ky_bill_follows`, `ky_notification_preferences`, `ky_bill_status_history`, `ky_notifications_log` + RLS.
- **Follow API:** [`GET/POST/DELETE /api/bills/[id]/follow`](./src/app/api/bills/[id]/follow/route.ts) — uses **Bearer `session.access_token`** via [`getAuthedUser`](./src/lib/supabase/route-auth.ts) (not cookies on the route). Client: [`FollowBillButton`](./src/components/bills/FollowBillButton.tsx) on [`/bills/[id]`](./src/app/bills/[id]/page.tsx). List follows: [`GET /api/me/follows`](./src/app/api/me/follows/route.ts).
- **Two different “Resend” uses:** (1) **Supabase Auth** transactional mail (verify, reset) — configure in **Supabase Dashboard → SMTP** (host `smtp.resend.com`, user `resend`, password = API key). (2) **App digests** — **`RESEND_API_KEY`** / **`RESEND_FROM_EMAIL`** + **`APP_PUBLIC_URL`**; **`/api/cron/notify`** runs **`runBillDigestCron`** (`src/lib/digest/run-bill-digest-cron.tsx`).

### Ops / env

- Apply **019** + **020** on any environment that does not have them yet (`npm run db:apply-sql` or SQL editor). **020** adds `INSERT` RLS on `ky_notification_preferences` for the preferences API / follow helper. **Operator checklist** order: **016 → 017 → 018 → 019 → 020** (match your branch’s migrations).
- **`env-template.txt`** — SMTP notes, rate limits, CAPTCHA troubleshooting (“For security purposes…”).
- **`npm run test:supabase-auth`** — smoke reachability for Auth API (no mail send).

### Suggested next implementation order (align with spec milestones)

1. ~~**`GET/PATCH /api/me/preferences`**~~ — **Done in repo** (`src/app/api/me/preferences/route.ts`, `src/lib/ky-notification-preferences.ts`, migration **020** insert policy). Wire **`/profile`** Notifications panel next.
2. ~~**`/profile`**~~ — **Partial.** Followed bills + Notifications panel wired to **`/api/me/follows`** and **`/api/me/preferences`**. Remaining M4 polish: optional nav anchors / section jump links; Security already on page.
3. ~~**Browse / cards / chips**~~ — **`?follows=me`**, **`KYBillCard`** bookmark + topic chip styling, home topic chips; bill detail topic hint / pre-build checklist polish if needed.
4. ~~**Sync pipeline — `ky_bill_status_history`**~~ — Pre-upsert snapshots + **`recordBillStatusHistoryForBuiltBatch`** after **`upsertKyBillRows`** (hash-gated + legacy paths).
5. ~~**Digest email**~~ — React Email + **`/api/cron/notify`** + Resend + **`/api/unsubscribe/[token]`** (M6–M7). **Remaining:** welcome email (optional), M8 hardening.
6. **M8 + optional welcome** — Production digest validation; bounce handling; **`WelcomeEmail`** after verification if product wants it.

### Files to read first

- [docs/specs/follow-bills.md](./docs/specs/follow-bills.md) — source of truth for UX and phases.
- [decisions.md](./decisions.md) — auth / product decisions (append new ones).

---

## Operator checklist

- **Database migrations** — **Primary environment:** migrations **016–017** applied (2026-05-11); **`sync:ky:legislators`** run successfully after fixing [`scripts/load-env.ts`](./scripts/load-env.ts) (repo-root `.env.local`, `override: true`). **New Supabase projects / restores:** apply in order **`016_ky_user_profiles`** → **`017_search_members_discovery`** → **`018_ky_bills_plain_search_hardening`** → **`019_ky_follow_bills_schema`** → **`020_ky_notification_preferences_insert_policy`** (`npm run db:apply-sql` or SQL editor); after **017**, run **`npm run sync:ky:legislators`** so `committee_memberships` can populate from Open States `roles` when present.
- **Remove `SENTRY_ENABLE_EXAMPLE_PAGE`** from Vercel (and `.env.local` if set). The `/sentry-example-page` routes were removed from the repo; stale env vars are harmless but should be cleared.
- **Legacy npm stacks** (puppeteer, GCS, pdf-parse, `three`, etc.) are **not** in root `package.json`. If you need them for a one-off script, use [`docs/legacy-npm-deps/`](./docs/legacy-npm-deps/README.md) and install into gitignored `optional/legacy-npm-deps/`.

---

## Recently completed

- **Follow Bills — M5–M7 (2026-05-12)** — `ky_bill_status_history` with **pre-upsert** snapshots + **`recordBillStatusHistoryForBuiltBatch`** on all **`syncKyBills`** code paths; digest cron + Resend + unsubscribe route (`decisions.md` § 2026-05-12).
- **Follow Bills — M1 auth & profile foundation** — Migration `016_ky_user_profiles` + Auth sync triggers; MUI auth pages (`login`, `register`, `forgot`, `reset`, `verify`, `logout`); `/profile` **Account** + **Security** (password, email change, resend verification, typed-email delete); `DELETE /api/me/account`; post-login `/profile`; nav user menu Profile-first. Apply migration (`npm run db:apply-sql` or Supabase SQL) and configure redirect URLs for `/auth/verify` and `/auth/reset`. See `decisions.md` § 2026-05-11.
- **Sentry** — Example page and `/api/sentry-example-api` removed; production monitoring remains via `@sentry/nextjs` configs and `/monitoring`.
- **Tooltips** — `MemberCard` Ballotpedia / bill history segments respect global `tooltipsEnabled`; clerical-stage hint on timelines.
- **District map** — Kentucky state-shape nav icon (`KentuckyStateIcon`); exclusive House/Senate layer toggle; right-column **two legislators** explainer (**100 House / 38 Senate**); “How to contact your legislators” accordion; Mapbox-backed address lookup (biased to KY).
- **Votes & external links** — LegiScan roll call links where `roll_call_id` exists; Ballotpedia via `normalizeBallotpediaHref` / search helpers (`external-legislative-links.ts`).
- **Member profiles** — Sponsored bills and vote summaries (`fetchSponsoredBillsForLegislator`, `fetchMemberVoteRecord`).
- **UI polish** — Mobile nav Paper styling; hero CTAs; LRC committee schedule banner link; session status banner semantics; footer © / `APP_VERSION` / `/licenses`; bill detail sponsor avatars + sidebar spacing; curated bill list hides view count when appropriate.
- **Browse & search** — Bills browse `BROWSE_QUERY_ROW_LIMIT = 1000`; search merge cap aligned; **25 / 50 / 100** page sizes (`usePersistedPageSize`).
- **LegiScan subjects** — `legiscan_subjects` + `legiscan_subjects_search` (migration `015`), sync + search hooks.
- **Discovery & bill search (migration 017)** — FTS RPC `ky_bills_plain_search`; parallel search legs (`last_action`, `session`); multi-token relevance ranking (`ky-search-bills.ts`). LegiScan-backed search suggestion chips (`useKySearchSuggestionSubjects`, `ky_top_legiscan_subject_names`). Members roster committee filter (`?committee=`, `committee_memberships` from Open States roles + sync). Clearer non–bill-type search alert.
- **Verification snapshot (2026-05-11)** — Confirmed in repo: [`supabase/migrations/017_search_members_discovery.sql`](./supabase/migrations/017_search_members_discovery.sql); app wiring in [`src/lib/ky-search-bills.ts`](./src/lib/ky-search-bills.ts), [`src/lib/use-ky-search-suggestion-subjects.ts`](./src/lib/use-ky-search-suggestion-subjects.ts), [`src/lib/ky-committee-utils.ts`](./src/lib/ky-committee-utils.ts), [`src/app/search/page.tsx`](./src/app/search/page.tsx), [`src/app/members/page.tsx`](./src/app/members/page.tsx), [`src/lib/ky-sync-pipeline.ts`](./src/lib/ky-sync-pipeline.ts). Auth recovery typing fix in [`src/app/auth/reset/page.tsx`](./src/app/auth/reset/page.tsx) (`establishRecoverySession`). Latest **`npm run build`** succeeds.
- **Supabase apply** — Migrations **016–017** deployed on the primary project (2026-05-11): auth/profile (`016`); FTS bill search RPC, LegiScan subject RPC, and **`committee_memberships`** column (`017`). **`sync:ky:legislators`** run: URLs and committee arrays updated from Open States when **`roles`** / **`links`** are returned.
- **Sync CLI env loading** — [`scripts/load-env.ts`](./scripts/load-env.ts) resolves **`.env`** / **`.env.local`** from the repo root (not `cwd`) and applies **`.env.local` with `override: true`** so **`OPENSTATES_API_KEY`** and friends load reliably for **`npm run sync:ky:*`**.
- **Spot-check — links & discovery (2026-05-11)** — **`npm run verify:legislator-links -- --limit 48`**: 0 failures (LRC **200**, Ballotpedia **202**, LegiScan **`getPerson`**). **`npm run spot-check:bill-links`**: 12 recent **`ky_votes`** roll calls OK via LegiScan **`getRollCall`** (public legiscan.com/HTML returns **403** to automation—normal); 10 sponsor Ballotpedia URLs **202**. Production smoke (**www**): `/search` loads with suggestion chips (**education**, **budget**, **23**, **HB 1**); `/members` roster **381** after client fetch (member cards show KY Legislature / Ballotpedia / LegiScan links). Assistive snapshot before hydration can briefly show **0 people**—confirm count after load.

---

## Up Next

- **Follow bills (M8 + optional welcome email)** — Production validation of digest + unsubscribe; bounce/failure handling; **`WelcomeEmail`** on verify if desired.
- **Regression cadence** — After large syncs or schema changes, re-run **`npm run verify:legislator-links`** (optional **`--limit`**) and **`npm run spot-check:bill-links`**.

---

## Backlog

- **Legislator links — full fidelity** — Add JSON storage (e.g. `ky_legislators.external_links` or `link_manifest` jsonb) for **all** Open States `links` entries including **social** (with `note`), not only LRC + single campaign URL. Backfill via legislator sync + optional one-off migration from current rows. UI: group **Official** vs **Social** (accessibility labels, external icons).
- **Legislator links — verifier in CI** — Add scheduled or release-gated workflow running **`npm run verify:legislator-links`** with Supabase secrets; fail or upload artifact on 4xx; allowlist known flaky endpoints if necessary.
- **LRC vs structured APIs (legislator data strategy)** — Kentucky LRC / `legislature.ky.gov` is the **canonical public-facing** source, but it does **not** provide a stable, documented **bulk API** for the full chamber roster the way Open States does. The app **syncs** from Open States into `ky_legislators` and **points users to the LRC** with stored profile URLs and official House/Senate directory fallbacks (`kyLegislaturePublicUrl` in `src/lib/ky-member-utils.ts`). **Revisit** if the state publishes **machine-readable bulk data** (CSV, API) with clear reuse terms.
- **"Follow this bill" — email alerts** — Full spec: [docs/specs/follow-bills.md](./docs/specs/follow-bills.md). Login-only follows, daily digest default, factual content (no AI summaries in v1), Resend + canonical site **`kyvky.com`**. Phased milestones:
  - **M1 — Auth polish & profile foundation:** **Complete.** `ky_user_profiles` migration `016`, Supabase sync triggers, auth/forgot/reset/verify flows, `/profile` Account + Security, account deletion API, login → `/profile`, Profile-first nav. Cookie-session middleware + auth layout/register polish. See Recently completed and `decisions.md` § 2026-05-11.
  - **M2 — Data model for follows:** **In repo** — migration [`019_ky_follow_bills_schema.sql`](./supabase/migrations/019_ky_follow_bills_schema.sql) (`ky_bill_follows`, `ky_notification_preferences`, `ky_bill_status_history`, `ky_notifications_log` + RLS). **Apply 019** on all deployed DBs.
  - **M3 — Follow UX (inline, no dashboard):** **Largely in repo** — detail **Follow** button; **`?follows=me`** + **Following** filter on browse (all/house/senate); **`KYBillCard`** bookmark + followed topic chips (tooltip + home chips); profile lists. **Remaining:** optional bill-detail line when bill matches a followed topic but isn’t individually followed; any bill-detail **LegiScan subject** vs **KY_TOPICS** mapping from **`decisions.md`** pre-build notes.
  - **M4 — Preferences UI:** **Partial —** notification panel on `/profile` (frequency, event presets/checkboxes, topic grid + list, followed bills list). **`GET/PATCH /api/me/preferences`** wired.
  - **M5 — Diff capture in sync:** **`recordBillStatusHistoryForBuiltBatch`** after bill upserts with **pre-upsert** `fetchBillHistorySnapshots` (hash-gated + legacy **`syncKyBills`**). Dedupe via **`legiscan_change_hash`** + unique index.
  - **M6 — Email plumbing:** **`RESEND_*`** + **`BillDigest`** template + **`/api/unsubscribe/[token]`**. Domain verification / **`WelcomeEmail`** optional follow-ups.
  - **M7 — Digest cron:** **`/api/cron/notify`** (Bearer cron secret); Vercel **`0 11 * * *`**; **`ky_notifications_log`** idempotency.
  - **M8 — Launch hardening:** Bounce / failure handling; digest cap (10 events with "and N more"); copy review; List-Unsubscribe headers verified; end-to-end test of a real bill state change.
  - **Follow-up — verify digest send time:** After first DST transition (Nov 2026) or once open-rate data exists, evaluate whether `0 11 * * *` UTC is still the right hour. Consider open rates by hour, user feedback, and whether to add a per-user time-zone preference.
  - **Investigation — official vs. inferred topic taxonomy:** Audit how `ky_bills.topics` (project keyword/AI classifier) and `legiscan_subjects` (official LegiScan taxonomy from migration `015`) currently surface in the frontend (browse filters, search, suggestion chips, bill detail). Outputs: (a) which taxonomy users actually see and where, (b) user-visible cost of an untagged bill, (c) recommendation on whether the follow-bills preferences UI should expose project topics, LegiScan subjects, or both, (d) revisit decision on AI-fallback tagging for untagged bills.
- **Address search UX on map** — Street address lookup exists (`mapbox-geocode.ts`). Optional improvements: autocomplete/typeahead, clearer empty states.
- **"How to contact your rep"** — District map accordion covers basics; expand with capitol workflows, hearings, testimony links to LRC as product needs evolve.

---

## UX design tracker (agent)

Active:

- (none)

Done:

- Home IA (2026-05-09): orientation-first hero primary CTA (district map), merged topic module, bill-area-only loading spinner — see `decisions.md`.
- Members (2026-05-09): filtered roster `profileHref` bugfix; member profile `h1`/`h2`/`h3` outline, `Link` back control, bill links identifiable by underline; roster card keyboard profile navigation + portrait alt + refresh `aria-label` — see `decisions.md`.
- Legislator outbound links (2026-05-09): link ranking + normalization in code (`legislator-link-normalize.ts`, sync + read paths); primary DB refreshed via **`sync:ky:legislators`** — spot-check with **`npm run verify:legislator-links`** — see `decisions.md`.
- **Link verifier:** `npm run verify:legislator-links` (`scripts/verify-legislator-external-links.ts`) — HEAD/GET checks for LRC, website, Ballotpedia, LegiScan URLs per active legislator.

Blocked:

- (none)

Notes:

- Designer-assisted UI/UX work follows user-provided Operating Principles (clarity before cleverness; explicit hierarchy; IA before layout; WCAG AA baseline; friction intentional; defaults and states explicit). Modes: Generative vs Critique per request. Conflict resolution: hierarchy accessibility > clarity > safety > consistency > efficiency > aesthetic refinement; state trade-offs and decision questions when ambiguous. Log substantive design decisions to `decisions.md` (append-only). See also `README.md` (Local maintenance scripts) for current `npm run` tooling.

Open decisions / questions (not resolved — pick when ready):

- **Home hero vs returning bill trackers** — Orientation-first hero makes map the primary CTA. If analytics show heavy repeat bill traffic: consider nothing (scroll habits), segmented messaging, or test alternate hero emphasis. Trade-off: comprehension for new users vs immediacy for power users.
- **Member profile content order** — Sponsored bills before voting record is the default; validate with research or A/B test later (identity/contact vs legislative activity first).
- **Home hero contrast** — Outlined white CTAs on photo hero should be verified against WCAG non-text / focus visibility requirements for default state (not only hover). Automated check recommended (e.g. axe on deployed build).

---

## Deferred / Decided Against

- **Executive orders sync** — Deferred. `governor.ky.gov` listings are unreliable for automated sync (404s, client-only rendering). Scraper exists in `src/lib/ky-executive-orders.ts` but is excluded from product surface and cron. Revisit when a stable feed/API exists.
- **Filibuster / cloture / budget reconciliation tooltips** — Removed. Federal Congress concepts only; do not re-add.
