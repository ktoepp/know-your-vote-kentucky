# Know Your Vote Kentucky — Task Tracker

> This file is the source of truth for roadmap tasks.
> Update it as work is completed or priorities shift.
> It lives in the repo so any AI with file access can read and act on it.

---

## In Progress

### Local browser review (2026-05-19)

**Dev server:** `http://localhost:3002` (`npm run dev -- -p 3002`)

**Prereq:** Migration **`025_ky_saved_searches_snooze.sql`** applied locally (saved searches + snooze fail without it).

**Mode:** Signed-out + signed-in test account. Tag findings **P0** (broken) / **P1** (should fix soon) / **P2** (nice-to-have).

| Area | Route(s) | Signed in? | Check | Finding (P0/P1/P2) |
|------|----------|------------|-------|---------------------|
| Home | `/` | optional | Hero CTAs, topic chips; bill rails if `KYBillCard` | **[P1]** No tooltip/hover overlay on grid bill cards; **[P1]** Party badge on primary sponsor avatar |
| Bills browse | `/bills` | optional | Filters, sort, **Copy link** / **Save search** when filters on | **[P1]** Remove tooltip/hover overlay on bill cards; **[P1]** Party badge on sponsor avatar; **[P2]** Checkmark on “Passed” status chip; **[P2]** Remove gavel on count row |
| Search | `/search` | optional | Bill results grid uses `KYBillCard` | **[P1]** Same bill-card items (tooltip + party badge on avatar) |
| Feed | `/feed` | optional | Bill tiles in feed | **[P1]** Same bill-card items (tooltip + party badge on avatar) |
| Bill detail | `/bills/[id]` | yes | Follow, hearings block, topic hint | Tooltips on detail page OK (not grid cards); **[P1]** Party badge on sponsor avatars; **[P1]** Bill number larger (`h5` → `h2`) |
| Members | `/members`, `/members/[slug]` | optional | Roster cards + profile header avatar | **[P1]** Party badge overlay on legislator portrait |
| District map | `/members/map` | optional | Sidebar / map tooltip member card | **[P1]** Party badge on tooltip avatar |
| Profile | `/profile` | **yes** | Section chips, notifications groups, saved searches, activity filters, snooze, export, welcome resend | |
| Activity API | `/profile#activity` | yes | All / Bill updates / Hearings chips + empty states | |
| Meetings | `/meetings` | optional | Search, chamber/when filters | |
| Committees | `/committees`, `/committees/[slug]` | optional | List + member section | **[P1]** Browse cards + detail redesign; **[P2]** Meeting card: drop “Synced”; click to show agenda |
| Members | `/members` | optional | Governor section + House/Senate grids | **[P1]** Merge statewide officials; fix `Lt_governor`; hide generic phone; district minimap on cards; **[P2]** Remove LegiScan footer link |
| Member profile | `/members/[slug]` | optional | Sponsored bills + voting history | **[P1]** Backfill `legiscan_id`; district minimap; hide generic phone |
| District map | `/members/map` | optional | Tooltip contact | **[P1]** Same phone rule in map tooltip |
| District map | `/members/map` | optional | Address autocomplete, contact accordion | |
| Resources | `/legislature/resources` | optional | Bill Watch card + outbound links | **[P2]** Simplify layout (no per-resource cards); remove KYVKY self-links |
| About | `/about` | optional | Copy, footer link | |
| Dashboard redirect | `/dashboard` | optional | Lands on `#activity` | |
| Auth | `/auth/login` → profile | yes | Post-login destination | |

**How to send findings (browser design selector):** Paste each `browser_element` block (screenshot optional). I will log to **Browser review — logged findings** and the checklist table above — **no code until you ask to implement.**

**Capture format** (one line per item is fine):

```text
[P1] /bills — Remove tooltip/hover overlay from all bill cards (KYBillCard + CivicCard)
[P1] /bills/[id] — Bill number larger (h5 → h2 on detail; cards/lists too)
[P2] /bills — “Passed” status chip: add Check icon like Signed by Governor (KYBillCard)
[P2] /bills — Remove gavel icon from results count row (BillsBrowse.tsx)
[P1] /committees — Card: remove “View meetings & agendas”; add chairs + KY_TOPICS chips (KYCommitteeCard)
[P1] /committees/[slug] — Redesign like bill detail; LRC reference: jurisdiction, members (S)/(H)/role, calendar, materials, minutes, staff
[P2] /committees/[slug] — Meeting card: remove “Synced …”; click card/header to expand agenda
[P2] /legislature/resources — Remove intro paragraph; list layout; no per-link cards; drop KYVKY links
[P1] /members — Merge Other statewide officials into Governor’s office; fix Lt_governor → Lieutenant Governor
[P1] /members — Hide generic capitol phone 502-564-8100 on MemberCard (Open States switchboard)
[P2] /members — Remove LegiScan footer link from MemberCard
[P1] /members/[slug] — Sponsored bills + voting history (legiscan_id backfill / fallbacks)
[P1] /members — District minimap on every MemberCard + member profile page
[P1] /profile#notifications — hearing_scheduled help text unclear when …
[P0] /bills — Save search returns 500 (migration 025 not applied)
```

**Already logged (2026-05-19):** P1 bill card tooltip/hover overlay; P1 party badge; P1 larger bill number; P1 committee browse cards + detail redesign; P1 district minimap; P1 members executive + role labels; P1 generic capitol phone; P1 member profile data; P2 committee meeting card agenda UX (no “Synced”); P2 remove LegiScan link; P2 “Passed” checkmark; P2 gavel; P2 Frankfort resources simplification.

**After review:** Move rows into **Up Next** or **Recently completed** when fixed.

**Ready for more** — send the next selector node(s) anytime.

### Browser review — logged findings (2026-05-19)

All browser-review **P1** rows below shipped 2026-05-19 (see **Recently completed**). Remaining backlog is data/sync work (e.g. `legiscan_id` backfill in production) or future LRC scrape (jurisdiction/staff columns).

| Priority | Area | Task |
|----------|------|------|
| — | *(none)* | Browser-review P1 queue cleared. Next: P0 save-search migration, Wave 3 committee materials, or LRC jurisdiction/staff scrape. |

**Acceptance (P1 bill cards):** Hovering any `KYBillCard` in browse/search/feed does not show a tooltip popup or hover overlay/lift; click still opens bill detail. Keyboard `:focus-visible` ring remains on the card link.

**Acceptance (P1 party badge):** Every legislator portrait listed above shows a small circular D/R/I badge on the avatar rim when `party` is known; unknown/missing party omits badge (no empty circle). Badge scales with avatar size (32px vs 40px on bill cards). Existing inline party **chips** beside names may remain unless product wants chips removed after badge ships.

**Acceptance (P1 bill number):** On `/bills/[id]`, designation (e.g. `SR57`) reads clearly larger than today and below the title in visual hierarchy (`h2` under title `h1`). Grid cards and list/table bill numbers are visibly larger than body text without breaking card layout. Document outline: one `h1` per bill detail page (title, not number).

**Acceptance (P1 committee card):** On `/committees` grid, each card shows committee name + chamber chip + leadership names (when known) + up to ~3 topic chips from `KY_TOPICS`; no gavel / “View meetings & agendas” line. Whole card still navigates to committee detail.

**Acceptance (P1 committee detail):** Audit doc maps LRC fields (jurisdiction, members w/ (S)/(H)/role, calendar, materials, minutes, staff) to KYVKY sections and notes data source (synced vs link-out). `/committees/[slug]` shows jurisdiction (or clear LRC link if not scraped), scannable member list with roles, action row for calendar + materials + minutes, staff block or LRC fallback; KYVKY meetings/agendas + related bills below fold; bill-detail-like typography/sections.

**Acceptance (P2 meeting agenda click):** Committee detail meeting cards do not show “Synced …” line. Clicking a meeting with agenda items toggles agenda list; keyboard-accessible control (button or `aria-expanded`). Empty meetings show no false “show agenda” if zero items.

**Acceptance (P1 members executive):** `/members` shows one top section with Governor + Lt. Gov + AG (no separate “Other statewide officials” block). Coleman card shows **Lieutenant Governor**, not `Lt_governor`. House/Senate sections unchanged below.

**Acceptance (P1 district minimap):** House/Senate `MemberCard` rows and `/members/[slug]` show a minimap with the correct district filled/highlighted inside Kentucky; no map for statewide-only roles without a district. Map does not break card stretch-link navigation (pointer-events / z-index). Graceful placeholder if Mapbox token or GeoJSON missing.

**Acceptance (P1 member phone):** Member cards/tooltips do not show clickable `502-564-8100` (or normalized equivalent) as if it were the legislator’s direct line. Cards with a distinct `phone` value still show `tel:` link. Capitol directory fallback copy remains when email is missing.

**Acceptance (P1 member profile data):** Active House/Senate members with bills/votes in LegiScan show **Sponsored bills** and **Voting history** on `/members/[slug]` (no info alert). Spot-check: member with known sponsorship (e.g. Josh Calloway) shows list or session-empty copy, not “not available for this member yet.” `npm run diagnose:legislators` (or equivalent) reports near-zero active rows missing `legiscan_id`.

**Acceptance (P2 LegiScan on cards):** No “LegiScan” text button in `MemberCard` footer on `/members` (or map if it reuses the same component). Other outbound links still render when data exists.

**Acceptance (P2 passed chip):** Bills whose status maps to the **passed** stage (chip label “Passed”, “Enrolled”, etc. per helper) show a green outlined chip with check icon, visually consistent with “Signed by Governor”. Signed/chaptered bills still use the signed chip only (no double icons).

**Acceptance (P2 resources page):** `/legislature/resources` shows `h1` without the long intro paragraph; no stacked resource cards and no “Open in KYVKY” buttons; external links remain (LRC calendar, committees index, KET, Bill Watch, KRC, bill status). Page is scannable in one viewport-ish on desktop.

**Acceptance (P2 gavel):** Results count row shows only typography (no gavel); layout/spacing still aligned with filter bar above.

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

- Apply **019**, **020**, **021**, **022**, **023**, **025** on any environment that does not have them yet (`npm run db:apply-sql` or SQL editor). **020** adds `INSERT` RLS on `ky_notification_preferences`. **021** adds bounce / complaint / suppression columns powering Resend webhook handling. **022** adds `welcome_email_sent_at` for one-time welcome email idempotency. **023** adds `external_links` JSONB on `ky_legislators` (full Open States links + grouped Social/Other UI). **Operator checklist** order: **016 → 017 → 018 → 019 → 020 → 021 → 022 → 023** (match your branch's migrations). Also set Vercel env vars `RESEND_WEBHOOK_SECRET` (Production + Preview), and ensure `APP_PUBLIC_URL` / `NEXT_PUBLIC_APP_URL` use the canonical `www.kyvky.com` host (apex 307-redirects to www, which breaks webhook POST and one-click unsubscribe POST).
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

- **Database migrations** — Apply **`024_ky_committee_calendar.sql`** before first `npm run sync:ky:lrc-calendar` (committee calendar Phase 1). Apply **`025_ky_saved_searches_snooze.sql`** for saved searches + bill snooze (Wave 1–2). **Primary environment:** migrations **016–017** applied (2026-05-11); **`sync:ky:legislators`** run successfully after fixing [`scripts/load-env.ts`](./scripts/load-env.ts) (repo-root `.env.local`, `override: true`). **New Supabase projects / restores:** apply in order **`016_ky_user_profiles`** → **`017_search_members_discovery`** → **`018_ky_bills_plain_search_hardening`** → **`019_ky_follow_bills_schema`** → **`020_ky_notification_preferences_insert_policy`** (`npm run db:apply-sql` or SQL editor); after **017**, run **`npm run sync:ky:legislators`** so `committee_memberships` can populate from Open States `roles` when present.
- **Remove `SENTRY_ENABLE_EXAMPLE_PAGE`** from Vercel (and `.env.local` if set). The `/sentry-example-page` routes were removed from the repo; stale env vars are harmless but should be cleared.
- **Legacy npm stacks** (puppeteer, GCS, pdf-parse, `three`, etc.) are **not** in root `package.json`. If you need them for a one-off script, use [`docs/legacy-npm-deps/`](./docs/legacy-npm-deps/README.md) and install into gitignored `optional/legacy-npm-deps/`.

---

## Recently completed

- **Browser review — remaining P1 (2026-05-19)** — Shared [`BillNumber`](./src/components/bills/BillNumber.tsx) (`detail` / `card` / `compact` / `inline`) on browse, detail, home lists, profile, committee agenda. [`LegislatorDistrictMinimap`](./src/components/members/LegislatorDistrictMinimap.tsx) + lazy wrapper on `MemberCard` + profile. [`LegislatorAvatar`](./src/components/members/LegislatorAvatar.tsx) party badge on bill sponsors, members, map tooltip, `SponsorAvatarChip`, design-system. Member profile: name-based sponsored-bill fallback in [`member-profile-data.ts`](./src/lib/member-profile-data.ts); per-section empty states (votes still need `legiscan_id`). Committee browse: [`fetchKyCommitteesBrowseEnriched`](./src/lib/ky-committees-browse-enriched.ts) — leadership line + `KY_TOPICS` chips on [`KYCommitteeCard`](./src/components/committees/KYCommitteeCard.tsx). Committee detail: bill-detail-style header card, breadcrumbs, at-a-glance, official-source buttons, compact legislative member list.
- **Browser review — low-lift UX (2026-05-19)** — Bill cards: removed `Tooltip` + hover lift on `KYBillCard` / `CivicCard` `variant="bill"`. Shared [`BillStatusMetaChip`](./src/components/bills/BillStatusMetaChip.tsx) with Passed/Signed checkmark styling. Bills browse: dropped gavel on results row. Members: LegiScan footer removed from `MemberCard`; generic capitol phone hidden (`isGenericCapitolPhone`, `legislatorDisplayPhone`); executive sections merged as “Governor's office”; `Lt_governor` → Lieutenant Governor. Committee detail: no “Synced” caption; click meeting header to expand agenda. Frankfort resources: list layout, no intro paragraph, no per-card KYVKY links. Bill number typography: detail `h2`, grid `h4` (list/home/profile audit still open).
- **Roadmap Wave 1–2 (2026-05-19)** — TASKS reorg (Bill Watch / launch polish / committee Wave 3). Activity feed filters; notification groups + Bill Watch copy; saved searches (`025`); snooze, export, welcome resend, `/about`, map autocomplete, contact accordion; `/dashboard` → `/profile#activity`. See `docs/email-client-qa.md`, `docs/spikes/committee-materials-sync.md`.
- **Bill detail — server-rendered shell (2026-05-19)** — `/bills/[id]` loads bill + LegiScan enrichment on the server (`ky-bill-detail-server.ts`, `revalidate=300`, `generateMetadata`). Client `BillDetailView` handles follow, tooltips, roster match, deferred LRC link + hearings; no full-page spinner on first paint.
- **Performance — members roster + LegiScan cache (2026-05-19)** — `GET /api/roster/members` (cached, slim columns); members/map stop `select('*')` and chamber refetch. Bill detail LegiScan cached 5m; search uses slim bill columns; hearings lazy-loaded.
- **Bills browse sort UI (2026-05-19)** — `/bills` filter bar: Sort by dropdown + asc/desc toggle; `?sort=` / `?dir=` URL state (`ky-bills-browse-url.ts`); active chip + clear-all reset. Non-default sort uses the in-memory browse cap path (same as status/follows filters).
- **Committee calendar Phase 4 — hearing digest events (2026-05-19)** — LRC calendar sync writes `hearing_scheduled` to `ky_bill_status_history` when a followed bill is newly listed on a committee agenda (`ky-calendar-hearing-history.ts`, deduped by meeting + bill + agenda hash). Digest + profile activity use `formatDigestEventDetail` for calendar lines; `/legislature/resources` notes Bill Watch comparison. Opt in via **Hearing scheduled** on `/profile` (not in the default “Major milestones” preset).
- **Performance — browse server prefetch (2026-05-19)** — `/members`, `/bills` (+ house/senate), `/committees`, `/meetings` load list data on the server (`unstable_cache`, `revalidate` 60–300s). Bills browse skips client fetch when URL matches server prefetch; meetings omit `member_refs` on browse. `ky-ga-browse-server.ts`, `BillsBrowsePage.tsx`, `MembersBrowse.tsx`.
- **Performance — homepage + profile (2026-05-19)** — `/` is a Server Component shell (`LandingHero`, `LandingFeatures`, `LandingTopics`, `SessionBannerServer`); client islands: `HomeAuthGate`, `LandingMapSection` (dynamic Mapbox). Profile `ky_user_profiles` uses explicit column select (`KY_USER_PROFILE_SELECT`).
- **Performance — feed + search + committee detail (2026-05-19)** — `/feed` server-prefetches recent House/Senate bills (`KY_BILL_BROWSE_SELECT`, 120 rows cached) + slim roster; followed bills use slim select client-side. `/search` passes cached roster from server (no `/api/roster/active` on load). Committee detail: slim meeting/agenda selects, `unstable_cache` on slug/meetings/agenda batch (`ky-committee-data.ts`, `ky-ga-browse-select.ts`).
- **Performance — browse, search, middleware, homepage (2026-05-19)** — `GET /api/bills/browse` with SQL pagination + slim columns (default browse); in-memory cap 2,000 when status/follows/sort filters apply. Bill search: FTS-first via `ky_bills_plain_search`, supplemental legs only when FTS is thin or unavailable (replaces always-on 9-query fan-out). Middleware skips Supabase `getUser()` on anonymous public routes (`session-middleware.ts`). Homepage Mapbox moved to `dynamic()` (`LandingDistrictMapPreview`). See `decisions.md` § 2026-05-19 performance.
- **Performance — roster cache & committee batching (2026-05-19)** — `ky-legislator-roster-server.ts` (`unstable_cache` 1h): active slim roster for browse/search, active committee columns for `/committees/[slug]`, full roster for member profiles (historical rows preserved). `GET /api/roster/active` + `useKyActiveLegislatorRoster` (bills browse, search, feed, bill detail). Committee detail: batched agenda `IN` query (no N+1), `getKyCommitteeBySlug` + `revalidate=300`. Member profile: `React.cache` dedupes metadata + page roster fetch; `revalidate=300`. Bill detail API: roll-call enrichment cap 12; `Cache-Control` 5m.
- **Committee detail — members section (2026-05-19)** — `/committees/[slug]` lists members from LRC calendar `member_refs` + Open States `committee_memberships` fallback (`CommitteeMembersSection`, `ky-committee-members.ts`).
- **Committee calendar Phase 1 (2026-05-18)** — `024_ky_committee_calendar.sql`; `syncKyLrcCalendar` + `?source=lrc-calendar`; Vercel cron 12:00/18:00 UTC; CLI `npm run sync:ky:lrc-calendar`.
- **Committee calendar Phase 0 (2026-05-18)** — LRC calendar fixtures + HTML parser + bill-reference extractor; `spike:lrc:calendar` / `audit:lrc:bill-refs`; [phase0 report](./docs/specs/committee-calendar-phase0-report.md); Bill Watch reference at `docs/reference/bill-watch/`.
- **GA-only product scope + paused local crons (2026-05-18)** — Removed ordinances / school-boards / county-actions from `vercel.json`; `SYNC_SOURCES_DEFAULT` limits autopilot sync; [docs/specs/committee-calendar.md](./docs/specs/committee-calendar.md) + `decisions.md` § 2026-05-18.
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

Roadmap priority (2026-05-19): **Wave 1 Bill Watch parity** → **Wave 2 launch polish** → **Wave 3 committee/data**. See `decisions.md` § 2026-05-19 roadmap.

### Wave 1 — Bill Watch parity (shipped 2026-05-19 — verify in browser)

Reference: [docs/reference/bill-watch/](./docs/reference/bill-watch/README.md). Mapping: [bill-tracking.md](./docs/reference/bill-watch/bill-tracking.md).

**Blocked (product):** Add PNG captures to [`docs/reference/bill-watch/screenshots/`](./docs/reference/bill-watch/screenshots/INDEX.md) per INDEX before pixel-polish passes.

- ~~**Activity feed filters**~~ — Shipped; verify chips + `?kind=` + empty states.
- ~~**Alert settings UX**~~ — Shipped; verify groups + Bill Watch link on `/legislature/resources`.
- ~~**Saved searches MVP**~~ — Shipped; verify copy/save on `/bills` + `/profile#saved-searches` (needs migration **025**).
- ~~**Bill tracking polish**~~ — Shipped; “Track another bill”, `/dashboard` redirect.
- **Design backlog (open)** — Home hero CTA contrast (axe); member profile section order; returning-user hero test; optional **Topics** activity filter (v1.1 in plan).
- **Bill card hover UX (browser review)** — **[P1]** Remove tooltip / hover overlay from all bill cards (`KYBillCard` + `CivicCard` bill variant). See **Browser review — logged findings**.

**Wave 1 non-goals:** Kentucky.gov auth, rules wizard, mobile quiet hours, per-bill alert overrides, premium “new bill match” email blast.

### Wave 2 — Launch polish (shipped 2026-05-19 — verify in browser)

- ~~**GDPR-style data export**~~ — `GET /api/me/export` on `/profile` Security.
- ~~**Resend "Send welcome again"**~~ — `POST /api/me/welcome-email?force=1`.
- **Email rendering QA** (~2 hr, manual) — [docs/email-client-qa.md](./docs/email-client-qa.md); run after copy tweaks from review.
- ~~**Snooze on follows**~~ — Profile toggle; digest skips snoozed (needs **025**).
- ~~**Map address autocomplete**~~ — `/members/map`.
- ~~**About page**~~ — `/about` + footer link.
- ~~**"How to contact your rep"**~~ — Map accordion + resources links.
- **In-app notification badge** (~4–8 hr, lower priority) — not shipped.
- **Per-user digest timezone** (~4–6 hr) — deferred (Nov 2026 / open-rate data).
- **Regression cadence** — After large syncs or schema changes, re-run **`npm run verify:legislator-links`** and **`npm run spot-check:bill-links`**.

### Wave 3 — Committee / data (deferred)

From [docs/specs/committee-calendar.md](./docs/specs/committee-calendar.md) § Phase 5+:

- **`ky_committee_materials` + `sync:lrc:committee-materials`** — Meeting Materials tab (metadata URLs only).
- **Session record spike** — `fixtures/lrc/legislative-record-26rs-live.html`; floor vs committee event split.
- **Interim period + session milestones** — `ky-sessions.ts` concurrence / veto recess banners.
- **LRC bulk API** — revisit if state publishes machine-readable roster (see Backlog below).

---

## Backlog

### Committee calendar (GA) — from [docs/specs/committee-calendar.md](./docs/specs/committee-calendar.md)

- ~~**Phase 0**~~ — **Done 2026-05-18.** Fixtures, parsers, spike + audit scripts, [phase0 report](./docs/specs/committee-calendar-phase0-report.md).
- ~~**Phase 1**~~ — **Done 2026-05-18.** Migration `024`, `src/lib/ky-lrc-calendar-sync.ts`, `npm run sync:ky:lrc-calendar`, cron `lrc-calendar` 12:00/18:00 UTC.
- ~~**Phase 2**~~ — **Done 2026-05-18.** `/committees`, `/meetings`, bill detail “Hearings & agendas”, `/legislature/resources`, nav + footer links.
- ~~**Phase 3**~~ — **Done 2026-05-18.** Profile activity feed (`ProfileActivitySection`, `GET /api/me/activity`); agenda search (`/meetings?q=`); saved filters via URL (`?chamber=`, `?when=`).
- ~~**Phase 4**~~ — **Done 2026-05-19.** `hearing_scheduled` events from LRC calendar sync; resources page Bill Watch note.
- **Phase 5+** — See Wave 3 above (materials, session record, milestones).

### Other

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

- **Bill Watch screenshots** — Product to add PNGs under `docs/reference/bill-watch/screenshots/` (INDEX ready). Unblocks visual polish only; Wave 1 features can ship without them.

Notes:

- Designer-assisted UI/UX work follows user-provided Operating Principles (clarity before cleverness; explicit hierarchy; IA before layout; WCAG AA baseline; friction intentional; defaults and states explicit). Modes: Generative vs Critique per request. Conflict resolution: hierarchy accessibility > clarity > safety > consistency > efficiency > aesthetic refinement; state trade-offs and decision questions when ambiguous. Log substantive design decisions to `decisions.md` (append-only). See also `README.md` (Local maintenance scripts) for current `npm run` tooling.

Open design questions moved to **Wave 1 — Design backlog** (Up Next).

---

## Deferred / Decided Against

- **Local government sync (product surface)** — **Paused 2026-05-18.** Ordinances (Louisville/Lexington Legistar), school boards (JCPS/FCPS), and county/city council calendars (Jefferson/Fayette) are out of scope until GA committee work ships. Code remains; re-enable crons in `vercel.json` (schedules in committee-calendar spec). Manual: `GET /api/sync?source=ordinances` etc.
- **`/events` as mixed local meetings hub** — Hidden from nav; repurpose for GA committee meetings or replace with `/meetings` in Phase 2.
- **Executive orders sync** — Deferred. `governor.ky.gov` listings are unreliable for automated sync (404s, client-only rendering). Scraper exists in `src/lib/ky-executive-orders.ts` but is excluded from product surface and cron. Revisit when a stable feed/API exists.
- **Filibuster / cloture / budget reconciliation tooltips** — Removed. Federal Congress concepts only; do not re-add.
