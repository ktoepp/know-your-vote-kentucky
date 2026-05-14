# Know Your Vote Kentucky — Task Tracker

> This file is the source of truth for roadmap tasks.
> Update it as work is completed or priorities shift.
> It lives in the repo so any AI with file access can read and act on it.

---

## In Progress

- (none — feature set "auth + profile + follow + email" is shipped and launch-blockers cleared, see Recently completed 2026-05-13)

## Maintained on autopilot

- **Legislator outbound links** — `.github/workflows/legislator-links-weekly.yml` runs Mondays 12:00 UTC: `sync:ky:legislators` → `verify:legislator-links --json` → `audit:legiscan-subjects --json`, uploading `reports/` as artifacts. Manual fallback: `npm run verify:legislator-links`. Required GH secrets: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENSTATES_API_KEY`, `LEGISCAN_API_KEY` (last optional).
- **Email digest** — `/api/cron/notify` runs daily 11:00 UTC via Vercel Cron (weekly users batched on Mondays). Suppressed users skipped. Failures + per-user-error spikes captured in Sentry (tags `route:cron/notify` and `route:webhooks/resend`).
- **Outbound mail policy** — `From: alerts@kyvky.com` (transactional only, do not reply); `Reply-To: hello@kyvky.com` (real inbox). All inbound contact / vulnerability reports go to `hello@kyvky.com`. Webhook deliveries from Resend → `https://www.kyvky.com/api/webhooks/resend` (apex 307s break POST). Plain-text fallback included on every transactional send.

## Operator follow-ups (not blocking, but recommended before public launch)

- **Resend → Domains → kyvky.com** — confirm SPF / DKIM / DMARC are all green. Cold-start sends to Gmail otherwise land in Junk.
- **Sentry → Alerts** — add two rules: (1) any event tagged `route:cron/notify` → notify; (2) ≥5 events tagged `route:webhooks/resend` in 5 min → notify.
- **Inbox routing** — confirm `hello@kyvky.com` lands somewhere a human reads (privacy/terms pages and email Reply-To all point there).
- **Legal review** — `/privacy` and `/terms` are honest practical drafts (`src/app/privacy/page.tsx` + `src/app/terms/page.tsx`); a lawyer should review before scaling beyond a small audience.

---

## Handoff — next agent (digest hardening + optional welcome email)

Use this when continuing **digest reliability**, **welcome mail**, or **follow-bills M8**.

### Context (already in repo)

- **Auth:** Supabase with **`@supabase/ssr`** — cookie-backed browser client ([`src/app/lib/supabaseClient.ts`](./src/app/lib/supabaseClient.ts)), middleware session refresh ([`src/lib/supabase/middleware.ts`](./src/lib/supabase/middleware.ts), [`src/middleware.ts`](./src/middleware.ts)), [`UserContext`](./src/app/lib/UserContext.tsx), auth routes under [`src/app/auth/`](./src/app/auth/), centered layout [`src/app/auth/layout.tsx`](./src/app/auth/layout.tsx) + [`AuthPaperLayout`](./src/components/auth/AuthPaperLayout.tsx).
- **Follow data:** Migration [**`019_ky_follow_bills_schema.sql`**](./supabase/migrations/019_ky_follow_bills_schema.sql) — `ky_bill_follows`, `ky_notification_preferences`, `ky_bill_status_history`, `ky_notifications_log` + RLS.
- **Follow API:** [`GET/POST/DELETE /api/bills/[id]/follow`](./src/app/api/bills/[id]/follow/route.ts) — uses **Bearer `session.access_token`** via [`getAuthedUser`](./src/lib/supabase/route-auth.ts) (not cookies on the route). Client: [`FollowBillButton`](./src/components/bills/FollowBillButton.tsx) on [`/bills/[id]`](./src/app/bills/[id]/page.tsx). List follows: [`GET /api/me/follows`](./src/app/api/me/follows/route.ts).
- **Two different “Resend” uses:** (1) **Supabase Auth** transactional mail (verify, reset) — configure in **Supabase Dashboard → SMTP** (host `smtp.resend.com`, user `resend`, password = API key). (2) **App digests** — **`RESEND_API_KEY`** / **`RESEND_FROM_EMAIL`** + **`APP_PUBLIC_URL`**; **`/api/cron/notify`** runs **`runBillDigestCron`** (`src/lib/digest/run-bill-digest-cron.tsx`).

### Ops / env

- Apply **019**, **020**, **021**, **022**, **023** on any environment that does not have them yet (`npm run db:apply-sql` or SQL editor). **020** adds `INSERT` RLS on `ky_notification_preferences`. **021** adds bounce / complaint / suppression columns powering Resend webhook handling. **022** adds `welcome_email_sent_at` for one-time welcome email idempotency. **023** adds `external_links` JSONB on `ky_legislators` (full Open States links + grouped Social/Other UI). **Operator checklist** order: **016 → 017 → 018 → 019 → 020 → 021 → 022 → 023** (match your branch's migrations). Also set Vercel env vars `RESEND_WEBHOOK_SECRET` (Production + Preview), and ensure `APP_PUBLIC_URL` / `NEXT_PUBLIC_APP_URL` use the canonical `www.kyvky.com` host (apex 307-redirects to www, which breaks webhook POST and one-click unsubscribe POST).
- After applying **023** for the first time on a database with legacy data: run `npm run normalize:legislator-districts -- --apply` then `npm run cleanup:stale-legislators -- --apply`, then `npm run diagnose:legislators` to confirm active count is ~141 (100 House + 38 Senate + 3 statewide). Future syncs handle this automatically.
- **`env-template.txt`** — SMTP notes, rate limits, CAPTCHA troubleshooting (“For security purposes…”).
- **`npm run test:supabase-auth`** — smoke reachability for Auth API (no mail send).

### Digest E2E validation harness

- **`npm run preview:digest -- --email <addr>`** renders the digest for one user (no send) and writes `digest-preview.html`. Add **`--inject HB1`** to insert a synthetic `ky_bill_status_history` row (cleaned up on exit) so you can drive the full path even when no real bill movement is in the window. Add **`--send`** to actually send via Resend, and **`--ignore-last-sent`** to bypass the prior-window cutoff.
- Bounce / complaint events update `ky_notifications_log.delivery_status` and flip `ky_notification_preferences.bounce_state` / `suppressed_at` via **`POST /api/webhooks/resend`** (requires **`RESEND_WEBHOOK_SECRET`** + Resend webhook configured for `email.delivered`, `email.bounced`, `email.complained`, `email.delivery_delayed`).
- One-click unsubscribe: digest emails now set **`List-Unsubscribe`** + **`List-Unsubscribe-Post: List-Unsubscribe=One-Click`**; the unsubscribe route accepts both **`GET`** (HTML page) and **`POST`** (RFC 8058).

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

- **Digest history on `/profile` (2026-05-13)** — New `ProfileDigestHistorySection` shows the user's last 10 sent digests with the bills + event labels included, so anyone who lost the email can still see what was sent. Backed by `GET /api/me/digest-history`: queries `ky_notifications_log` under the user's JWT (RLS-scoped), then uses `supabaseAdmin` to expand `event_ids` against the service-role-only `ky_bill_status_history` and join to `ky_bills` for labels. Dedupes bills per digest and caps to 10 with "…and N more" overflow.
- **Launch blockers — Sentry alerts + privacy + terms + email polish (2026-05-13)** — `/api/cron/notify` and `/api/webhooks/resend` now `Sentry.captureException` on thrown errors and `Sentry.captureMessage` on silent partial-failure 200s, tagged `route:*` for alert-rule scoping. New `/privacy` and `/terms` pages cover what we collect, who we share with, retention, user controls, and acceptable use; both linked from `SiteFooter`, the register page (acknowledgment line), and email footers. Outbound mail policy: `From: alerts@kyvky.com` (transactional only); `Reply-To: hello@kyvky.com` (real inbox, also used in privacy/terms contact). Plain-text fallback (`render(el, { plainText: true })`) included on every transactional send for deliverability + a11y. Per-user rate limits on `/api/bills/[id]/follow` (60/min) and `/api/me/preferences` (30/min) keyed by user id with 429 + Retry-After. `/profile` followed-bills now shows a CTA empty-state card (browse bills / find your legislators) when no follows.
- **Legislator stale row cleanup + Senate district format (2026-05-13)** — Members page was showing 381 active legislators when the General Assembly has 138 seats. Two fixes: `syncKyLegislators` now runs a second deactivation pass for active LegiScan-only rows at seats covered by a current Open States row (predecessors and alias dupes); `scripts/normalize-legislator-districts.ts` rewrites legacy Senate `SD-0XX` to canonical `SD-XX` so the seat-key compare actually matches. New `npm run cleanup:stale-legislators`, `npm run normalize:legislator-districts`, `npm run diagnose:legislators`, and `npm run debug:openstates-roster`. After running cleanup + normalize the live count drops to ~141 active (100 House + 38 Senate + 3 statewide).
- **Email copy / structure pass (2026-05-13)** — `BillDigest` subject line is count-led ("Your KY bill digest — N updates"); preview text names bills + updates; new footer adds "Change frequency or topics" alongside unsubscribe and a one-line "why am I getting this" attribution. `WelcomeEmail` lead clarifies cadence ("we'll only email when followed bills change — no marketing"); marked one-time so users don't expect repeats; topic-follow card mentions automatic matching.
- **Topic taxonomy — hybrid digest matching (2026-05-13)** — Added `src/lib/ky-topic-legiscan-mapping.ts` translating LegiScan subject patterns to KY_TOPIC tags so the digest cron matches a user's `topic_filters` against EITHER `ky_bills.topics` (heuristic) OR `legiscan_subjects` (official) — closes the silent-miss path where a bill's correct LegiScan subject didn't earn a heuristic topic tag. `BillTopicMatchHint` reflects the same union so UI agrees with the digest. New `npm run audit:legiscan-subjects` and a workflow step on the weekly job report unmapped subjects sorted by frequency so the mapping stays current.
- **Legislator links — full fidelity + weekly verifier (2026-05-13)** — Migration **023** adds `external_links` JSONB on `ky_legislators`. Sync persists the full Open States `links[]` (URL + note + category + host); `MemberProfileView` renders a "Connect & follow" section grouped Social / Other (hidden when empty). Verifier now probes `external_links` (skips social by default, `--probe-social` to opt in) and emits JSON with `--output`. New `.github/workflows/legislator-links-weekly.yml` runs Mondays 12:00 UTC: `sync:ky:legislators` → `verify:legislator-links` → `audit:legiscan-subjects`, uploading reports as artifacts.
- **Follow Bills — M3 polish (2026-05-13)** — `BillTopicMatchHint` on bill detail: when a signed-in user has digest enabled and the bill's topics intersect their `topic_filters` but they aren't individually following, an inline alert names the matching topic so users understand updates are already in their digest.
- **Follow Bills — M8 bounce + welcome (2026-05-13)** — Resend webhook (`/api/webhooks/resend`) verifies Svix signatures and updates `ky_notifications_log.delivery_status` + `ky_notification_preferences.{bounce_state,bounce_count,suppressed_at}` (migration **021**). Digest cron filters `suppressed_at` users; emails set `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click`; `/api/unsubscribe/[token]` accepts both GET (HTML) and POST (RFC 8058). One-time welcome email after first verification: `WelcomeEmail` template + `/api/me/welcome-email` (idempotent stamp-then-send) fired from `/auth/verify` (migration **022**). New harness scripts: `npm run preview:digest`, `npm run verify:digest-state`, `npm run preview:welcome`. `scripts/load-env.ts` now falls back to the main repo when running inside a `.claude/worktrees/*` worktree and stubs `WebSocket` so supabase-js works on Node < 22.
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

The auth + profile + follow + email feature set is shipped and launch-blockers are cleared. Pick from these "should-haves" when picking the work back up:

- **GDPR-style data export** (~2 hr) — `GET /api/me/export` returns JSON of profile + follows + prefs + log. Pairs with the existing `DELETE /api/me/account`.
- **Resend "Send welcome again" button on `/profile`** (~1 hr) — manual recovery if a user lost the original.
- **Email rendering QA across Gmail / Outlook / Apple Mail** (~2 hr, manual) — best done after the plain-text fallback shipped.
- **Per-user time-zone preference for digest send** (~4–6 hr) — revisit after first DST transition (Nov 2026) or when open-rate data exists.
- **In-app notification badge** (~4–8 hr) — needs a viewed_at cursor on `ky_notifications_log` or a separate read receipt.
- **Snooze / mute individual bills** (~2–3 hr) — boolean column on `ky_bill_follows`; digest skips snoozed.
- **Address autocomplete on the district map** (~3 hr).
- **"How to contact your rep" content expansion** (~2 hr).
- **Regression cadence** — After large syncs or schema changes, re-run **`npm run verify:legislator-links`** (optional **`--limit`**) and **`npm run spot-check:bill-links`**.

---

## Backlog

- ~~**Legislator links — full fidelity**~~ — **Shipped 2026-05-13** (migration 023, sync, profile UI).
- ~~**Legislator links — verifier in CI**~~ — **Shipped 2026-05-13** (`.github/workflows/legislator-links-weekly.yml`).
- **LRC vs structured APIs (legislator data strategy)** — Kentucky LRC / `legislature.ky.gov` is the **canonical public-facing** source, but it does **not** provide a stable, documented **bulk API** for the full chamber roster the way Open States does. The app **syncs** from Open States into `ky_legislators` and **points users to the LRC** with stored profile URLs and official House/Senate directory fallbacks (`kyLegislaturePublicUrl` in `src/lib/ky-member-utils.ts`). **Revisit** if the state publishes **machine-readable bulk data** (CSV, API) with clear reuse terms.
- **"Follow this bill" — email alerts** — Full spec: [docs/specs/follow-bills.md](./docs/specs/follow-bills.md). Login-only follows, daily digest default, factual content (no AI summaries in v1), Resend + canonical site **`kyvky.com`**. Phased milestones:
  - **M1 — Auth polish & profile foundation:** **Complete.** `ky_user_profiles` migration `016`, Supabase sync triggers, auth/forgot/reset/verify flows, `/profile` Account + Security, account deletion API, login → `/profile`, Profile-first nav. Cookie-session middleware + auth layout/register polish. See Recently completed and `decisions.md` § 2026-05-11.
  - **M2 — Data model for follows:** **In repo** — migration [`019_ky_follow_bills_schema.sql`](./supabase/migrations/019_ky_follow_bills_schema.sql) (`ky_bill_follows`, `ky_notification_preferences`, `ky_bill_status_history`, `ky_notifications_log` + RLS). **Apply 019** on all deployed DBs.
  - **M3 — Follow UX (inline, no dashboard):** **Complete.** Follow button; `?follows=me` + Following filter on browse; `KYBillCard` bookmark + topic chips; profile lists. `BillTopicMatchHint` shown on bill detail when topics match user filters but bill isn't individually followed. KY_TOPICS ↔ LegiScan subject hybrid mapping (`src/lib/ky-topic-legiscan-mapping.ts`) used by both digest filter and the hint so they agree.
  - **M4 — Preferences UI:** **Partial —** notification panel on `/profile` (frequency, event presets/checkboxes, topic grid + list, followed bills list). **`GET/PATCH /api/me/preferences`** wired.
  - **M5 — Diff capture in sync:** **`recordBillStatusHistoryForBuiltBatch`** after bill upserts with **pre-upsert** `fetchBillHistorySnapshots` (hash-gated + legacy **`syncKyBills`**). Dedupe via **`legiscan_change_hash`** + unique index.
  - **M6 — Email plumbing:** **`RESEND_*`** + **`BillDigest`** template + **`/api/unsubscribe/[token]`**. Domain verification / **`WelcomeEmail`** optional follow-ups.
  - **M7 — Digest cron:** **`/api/cron/notify`** (Bearer cron secret); Vercel **`0 11 * * *`**; **`ky_notifications_log`** idempotency.
  - **M8 — Launch hardening:** **Complete.** Bounce / complaint webhook + suppression (migration 021); digest cap (10 events + "and N more"); copy review (subject line, footer); `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers; one-time welcome email after verification (migration 022). End-to-end harness: `npm run preview:digest`, `npm run verify:digest-state`, `npm run preview:welcome`.
  - **Follow-up — verify digest send time:** After first DST transition (Nov 2026) or once open-rate data exists, evaluate whether `0 11 * * *` UTC is still the right hour. Consider open rates by hour, user feedback, and whether to add a per-user time-zone preference.
  - ~~**Investigation — official vs. inferred topic taxonomy:**~~ **Resolved 2026-05-13.** Outcome: Option A (hybrid digest match) shipped via `src/lib/ky-topic-legiscan-mapping.ts`. Preferences UI keeps the 20 KY_TOPICS (no LegiScan-subject picker — rejected as power-user feature). AI-fallback tagging deferred unless `npm run audit:legiscan-subjects` shows bills missing from BOTH taxonomies. Coverage maintained via the audit step on the weekly workflow.
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
