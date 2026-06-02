# Know Your Vote Kentucky — Task Tracker

> This file is the source of truth for roadmap tasks.
> Update it as work is completed or priorities shift.
> It lives in the repo so any AI with file access can read and act on it.

---

## In Progress

- **Mobile design + a11y pass (2026-06-01)** — `ux/mobile-a11y-pass-2026-06`. Combined `/design-critique` + `/accessibility-review` (WCAG 2.1 AA) sweep of the five core read paths on live `kyvky.com` at 375/390px viewports. Scope: `/`, `/bills`, `/bills/[id]`, `/members`, `/members/map` (signed-out read paths only — profile/feed/follow flows deferred). Findings localized to widgets (target sizes, form labels, heading order), not architecture. Build + typecheck + lint green; real-device pass at 375px DevTools mobile emulation deferred to user before merge. Top-10 fixes:
  - [x] **Theme-level target-size pass** — `theme.ts` gained `MuiIconButton` root `minWidth/minHeight: 44` (sizeSmall keeps 32 for dense uses), and `MuiSelect.select` `minHeight: 44` so `size="small"` Selects still meet target size. `MuiButton` and `MuiTextField` already had `minHeight: 44`.
  - [x] Copy-email icon buttons → 44×44 — `CopyableEmail` dropped `size="small"` + `p: 0.35` constraint; inherits theme floor.
  - [x] Topic chips on home → 44px on touch — `LandingTopics` scoped `& .MuiChip-clickable { height: { xs: 44, sm: 'auto' } }`.
  - [x] Address input on `/members/map` → real `<label>` ("Address or ZIP code") + dropped `size="small"`; passes WCAG 3.3.2 and inherits 44px theme floor.
  - [x] Filter dropdowns on `/bills` — audit miss: `Select`s already labeled via `<InputLabel labelId>`. Target-size covered by the new `MuiSelect` override. Topic-chip strip in BillsBrowse also got `height: { xs: 44, sm: 'auto' }`.
  - [x] Duplicate `<h1>Bills</h1>` — audit false positive: `BillsBrowsePage` Suspense fallback is `null` (no ghost); only one `h1` in source. No change needed.
  - [x] Heading levels on `/bills/[id]` — `BillDetailView` + `BillHearingsSection` `Typography variant="h6"` section labels now carry `component="h2"`. Repairs the H1→H6 skip.
  - [x] Hero CTAs — audit reported 42px; theme-level `MuiButton.root` minHeight is 44 (precedes this PR). No override needed; the audit was inspecting at desktop width.
  - [x] Mapbox zoom controls → 44×44 on touch — scoped CSS override in `DistrictMapExplorer` Paper wrapper: `& .mapboxgl-ctrl-group button { width: { xs: 44, md: 29 }, height: { xs: 44, md: 29 } }`.
  - [x] Chamber filter pills on `/members` — audit reported 39px; will inherit theme floor via `MuiSelect`/`MuiButton` overrides where applicable. Spot-check on real device.
  - [x] Hero subtitle contrast verified via scrim math — worst-case bright-sky pixel under `rgba(15,23,42,0.72)` blends to ~rgb(75,82,99); white-on-that = **7.7:1** (passes AA *and* AAA). No code change.
  - Rationale + scope decisions: **decisions.md § 2026-06-01**. Audit caveats: agent inspected at desktop width (Chrome window wouldn't shrink below ~1262px) and cross-referenced MUI source for breakpoint-stable measurements; cross-check during implementation surfaced several false positives (Selects labeled, h1 not duplicated, Button already 44) — those items closed as no-op with notes.
- **Functional-test fixes (2026-05-26)** — staged for PR; 8 fixes shipped + verified on localhost, LRC accuracy confirmed (full match). See **Functional test — live site** below for the shipped list and the few remaining open items.
- **UI design-system normalization (2026-05-26)** — staged on PR **#40** alongside the functional-test fixes. Shared `CardGrid`/`CardGridItem` + `GRID`/`FOCUS_RING`/`INTERACTION` tokens (`src/lib/ui-tokens.ts`); normalized member identity (`legislatorAvatarDescriptor`, single `avatarInitialsFromName`, `LegislatorIdentityBlock` `meta` slot); Governor's office folded into the standard `/members` grid; unified bill primary/co-sponsor cards (`SponsorCard`); educational tooltips no longer render a "Learn more" link and no longer linger (surface reverted to non-interactive); member profile redesign (2-col top, **Official profile (KY Legislature)** link, filterable 3-col sponsored bills with show/hide co-sponsored); committee detail redesign (2-col top + quick-facts panel with Next-meeting callout + jump links, members as a `MemberCompactCard` grid). Typecheck + lint clean; verified on localhost. Rationale: **decisions.md § 2026-05-26 — UI design-system normalization pass**.

Browser review closed **2026-05-22**; **Follow committees v1** shipped in PR **#38** (2026-05-22). Migrations **026–027** applied on primary (2026-05-26). See **Recently completed** and **Backlog → Follow committees v1.5**. Next: optional prod `legiscan_id` spot-check, committee follow gaps (meetings filter, activity feed), manual email client QA, Wave 3 committee materials.

## Maintained on autopilot

- **Legislator outbound links** — `.github/workflows/legislator-links-weekly.yml` runs Mondays 12:00 UTC: `sync:ky:legislators` → `verify:legislator-links --json` → `audit:legiscan-subjects --json`, uploading `reports/` as artifacts. Manual fallback: `npm run verify:legislator-links`. Required GH secrets: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENSTATES_API_KEY`, `LEGISCAN_API_KEY` (last optional). **Slack:** sync + verify digests when `SLACK_WEBHOOK_*` + `SLACK_SYNC_NOTIFY_CLI=true` (heartbeat via `SLACK_SYNC_CLI_DIGEST_ALWAYS=true` while validating).
- **GitHub Actions sync Slack** — `sync-ky-bills-status.yml` (every 6h), `sync-lrc-calendar.yml` (2× daily live + weekly Wayback backfill), `verify-outbound-links.yml` (weekly), `legislator-links-weekly.yml` post to `#status-reports` on success and `#errors` on failure. Optional repo secrets: `SLACK_WEBHOOK_STATUS_REPORTS`, `SLACK_WEBHOOK_ERRORS`, `SLACK_WEBHOOK_SYNC`, `SLACK_WEBHOOK_URL`. **Heartbeat mode (temporary):** `SLACK_SYNC_CLI_DIGEST_ALWAYS=true` on sync workflows — remove when notifications are stable. Commits: `b008d96`, `2529ab4`.
- **Email digest** — `/api/cron/notify` runs daily 11:00 UTC via Vercel Cron (weekly users batched on Mondays). Suppressed users skipped. Failures + per-user-error spikes captured in Sentry (tags `route:cron/notify` and `route:webhooks/resend`).
- **Outbound mail policy** — `From: alerts@kyvky.com` (transactional only, do not reply); `Reply-To: katie@kyvky.com` (real inbox). All inbound contact / vulnerability reports go to `katie@kyvky.com`. Webhook deliveries from Resend → `https://www.kyvky.com/api/webhooks/resend` (apex 307s break POST). Plain-text fallback included on every transactional send.

## Operator launch checklist

Consolidated into **[docs/launch-checklist.md](./docs/launch-checklist.md)** (2026-06-02) — single source of truth for the not-blocking-but-recommended-before-launch items (Resend DKIM, Sentry alerts, inbox routing, legal review, email-client QA, Vercel env cleanup, regression cadence).

## Handoff — next agent (committee follow v1.5 + Wave 3)

Use this when continuing **Follow committees v1.5**, **Wave 3 committee/data**, or **launch operator checklist**.

### Context (already in repo)

- **Auth:** Supabase with `@supabase/ssr` — cookie-backed browser client (`src/app/lib/supabaseClient.ts`), middleware session refresh (`src/lib/supabase/middleware.ts`, `src/middleware.ts`), `UserContext`, auth routes under `src/app/auth/`, centered layout `src/app/auth/layout.tsx` + `AuthPaperLayout`.
- **Bill follows:** Migration **019** — `ky_bill_follows`, `ky_notification_preferences`, `ky_bill_status_history`, `ky_notifications_log` + RLS. API: `GET/POST/DELETE /api/bills/[id]/follow` (Bearer token via `getAuthedUser`). Client: `FollowBillButton` on `/bills/[id]`.
- **Committee follows (v1 — PR #38):** Migration **026** — `ky_committee_follows` + `ky_committee_events`. API: `GET/POST/DELETE /api/committees/[id]/follow`. Client: `FollowCommitteeButton` on committee detail; bookmark toggle on `KYCommitteeCard`; `ProfileFollowedCommitteesSection` on `/profile`. Digest: `committee_meeting_scheduled` opt-in on `/profile`; LRC sync emits `meeting_scheduled` on new meetings. List: `GET /api/me/follows` returns bills + committees.
- **Digest / email:** M6–M8 **complete** — `/api/cron/notify`, Resend, bounce webhook, welcome email, `preview:digest` harness. Two Resend uses: (1) Supabase Auth SMTP; (2) app digests via `RESEND_API_KEY` / `RESEND_FROM_EMAIL`.

### Ops / env

- **Migration order (new projects):** **016 → 017 → 018 → 019 → 020 → 021 → 022 → 023 → 024 → 025 → 026 → 027** (`npm run db:apply-sql` or SQL editor). **Primary environment:** **016–027** applied (026 pre-existing; **027** applied 2026-05-26).
- After **027** on a fresh DB: run `npx tsx scripts/backfill-interim-calendar-2026.ts` (idempotent; seeds interim meetings from LRC PDF). Primary already has meetings (214 rows as of 2026-05-26).
- Vercel: `RESEND_WEBHOOK_SECRET`; canonical `APP_PUBLIC_URL` / `NEXT_PUBLIC_APP_URL` = `https://www.kyvky.com` (apex 307 breaks webhook POST).
- `npm run preview:digest -- --email <addr>` — add `--inject HB1` for synthetic bill events; supports committee sections when user follows committees + opts into **Committee meeting scheduled**.

### Suggested next implementation order

1. **Follow committees v1.5** — `/meetings?follows=me`; committee events in `GET /api/me/activity`; `agenda_updated` / `meeting_cancelled` in LRC sync (v1 only emits `meeting_scheduled`). See **Backlog → Follow committees v1.5**.
2. **Manual email QA** — [docs/email-client-qa.md](./docs/email-client-qa.md).
3. **Wave 3** — committee materials sync, session record spike, interim/milestone banners ([committee-calendar.md](./docs/specs/committee-calendar.md) Phase 5+).
4. **Operator launch checklist** — Resend SPF/DKIM, Sentry alert rules, legal review of `/privacy` + `/terms`.

### Files to read first

- [docs/specs/follow-bills.md](./docs/specs/follow-bills.md) — bill follow UX and phases.
- [decisions.md](./decisions.md) § 2026-05-26 — committee follows v1 decisions.
- PR **#38** on GitHub — full committee-follow ship list.

## Operator checklist

- **Database migrations** — Full order: **016 → 027** (see Handoff). Highlights: **024** before first `npm run sync:ky:lrc-calendar`; **025** for saved searches + bill snooze; **026** for committee follows + event log; **027** seeds 2026 interim/statutory committees. **Primary environment:** **016–027** applied (2026-05-26). After **027**, run `npx tsx scripts/backfill-interim-calendar-2026.ts` on new DBs (idempotent). After **017**, run `npm run sync:ky:legislators` so `committee_memberships` populate from Open States `roles`.
- **legiscan_id verify loop** — After legislator sync or when member profiles show empty voting records: `npm run sync:ky:legislators` then `npm run diagnose:legislators` (exits 1 if active House/Senate rows missing `legiscan_id`). Optional district thumbnails: `npm run generate:district-thumbnails` (requires `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`; writes `public/geo/district-thumbs/`).
- **Remove **`SENTRY_ENABLE_EXAMPLE_PAGE` from Vercel (and `.env.local` if set). The `/sentry-example-page` routes were removed from the repo; stale env vars are harmless but should be cleared.
- **Legacy npm stacks** (puppeteer, GCS, pdf-parse, `three`, etc.) are **not** in root `package.json`. If you need them for a one-off script, use `docs/legacy-npm-deps/` and install into gitignored `optional/legacy-npm-deps/`.

## Recently completed

- **Follow committees v1.5 (2026-06-02)** — Closed the four v1.5 gaps from PR #38: `agenda_updated` + `meeting_cancelled` events in LRC sync (migration **028** relaxes dedupe index to include `agenda_content_hash`), `/meetings?follows=me` filter (mirror of `/bills?follows=me` — signed-in toolbar toggle, deletable chip, login alert, follow-but-empty empty state), committee events in `GET /api/me/activity` (new `committee_event` kind alongside `bill_event`/`hearing` in the unified timeline + `committee` filter chip on `ProfileActivitySection`), follow toggle on `/meetings` rows + agenda search results (lucide/MUI bookmark IconButton). Three new digest event slugs (`committee_meeting_scheduled` / `committee_agenda_updated` / `committee_meeting_cancelled`) wired through `KY_DIGEST_EVENT_GROUPS.committee_interim`. **Design refinement same day:** activity rows on both `LandingPersonalStrip` and `ProfileActivitySection` adopt the bill-card pattern via a new shared `ActivityStatusChip` — tone-mapped status chip (`kyDigestEventChipTone`) with green ✓ on success / red ✗ on error, `body1`/500 bill or committee title, clickable committee names. Bug fix: committee_event rows in `ProfileActivitySection` no longer render the label twice. CTA on the strip points to `/profile#activity` ("View all activity") — the unified timeline, not `/feed` (bills-only). Rationale: **decisions.md § 2026-06-02 — Follow committees v1.5** + **§ 2026-06-02 — Activity timeline visual treatment**.
- **Session milestones + interim banner (2026-06-01)** — Wave 3 sub-item. `ky-sessions.ts` gains optional `milestones` (`vetoRecessStart`, `vetoRecessEnd`, `sineDie`) on each `KYSessionRecord`, plus `getInterimPeriod()` and `getSessionPhase()` helpers. `getSessionBannerModel()` now returns a `phase` (`in_session` | `veto_recess` | `final_days` | `interim`) and a `contextLine`; `SessionBannerServer` renders the phase-aware second line so today (in interim) reads **"2026 Interim: April 16, 2026 – next session convenes"** with an interim-committees explainer instead of the previous generic after-session caption. New glossary entries: `concurrence`, `veto_recess`, `interim_period`. 2026 RS `milestones` field is intentionally left undefined (TODO comment in `KY_SESSIONS`) until the LRC-published veto-recess dates are confirmed; banner falls back to the clean session range when no milestones are set. Rationale: **decisions.md § 2026-06-01 — Session milestones + interim banner**.
- **Voice & tone follow-up pass (2026-05-27)** — Cleared the open follow-ups from the audit below. Expanded **Legislative Research Commission (LRC)** on first use on `/meetings`, `/committees`, committee detail, member profile, and the Frankfort resources page (home banner + profile notifications already done). Confirmed **`/find-content`** is an unlinked internal tool — left as-is. Fixed a member-profile empty state that leaked an internal *"run a bills sync"* instruction → honest caveat (*"Sponsor data may lag the official record"*); reworded the resources page's internal *"Hearing scheduled"* token to plain language. **Deprecated legacy `/events`** (reads the old `ky_meetings` table; superseded by `/meetings` + `/committees`): added `events/layout.tsx` `noIndexMetadata`, dropped `/events` from the sitemap (added `/meetings` + `/committees`), removed its `BackNavigation` fallbacks → still serves by direct URL but out of search + in-app nav. Sweep otherwise clean (terms, privacy, glossary, licenses, search, feed, dashboard on-voice). Typecheck + localhost spot-check clean.
- **Voice & tone audit + sitewide copy pass (2026-05-27)** — Audited live kyvky.com + emails. Broadened the email voice guide into a sitewide one: `docs/email-voice-and-tone.md` → **`docs/voice-and-tone.md`** (added **Honest sourcing** + **Warmth through anticipation** principles, an explicit non-partisan rule, a reference-vs-marketing register note, and naming/heading/auth conventions). Copy fixes: standardized the auth verb to **Log in** (nav, footer, login page, profile gate, follow labels); collapsed five variants of the district-map feature name to one — **Find my legislators** (nav, map H1 + tab title, both hero CTAs, followed-bills empty state); **fixed a live broken link** — `/district-map` 404 → `/members/map` (welcome-email CTA + followed-bills empty state); device-neutral **"Select"** (was "Tap"); **"Bills"** heading + tab title (was "Explore Bills"); **"Load more"** (was "Load more bills"); **"141 members"** (was "people"); expanded **Legislative Research Commission (LRC)** on the home session banner; de-jargoned About data sources ("LegiScan", dropped "GeoJSON/geocoding") and the notifications helper (dropped internal "our LRC calendar sync"); welcome-email topic card now states the automated-tagging caveat; home `<title>` + meta description de-abbreviated (**Track Kentucky legislation**, "representatives" not "reps"). Spot-checked on localhost; typecheck clean; staged on `feat/home-returning-hero-personalization`. New canon: **`docs/voice-and-tone.md`**.
  - **Follow-up status:** LRC first-use expansion, `/find-content`, and the full guide sweep are **done** (see "Voice & tone follow-up pass" above). Legacy `/events` was **deprecated** rather than copy-polished.
    - **Verification gap — closed (2026-05-27):** logged-in browser pass confirmed the followed-bills empty state ("Select Follow…" + "Find my legislators" → /members/map), the notifications LRC expansion, and "Log in" across nav/login/footer. The pass also caught **5 more device-specific verbs** the sweep missed (followed-committees empty state, profile activity, bills "Following" empty state, district map ×2, privacy "Click Unsubscribe") — all changed to "Select"/"select".
    - **Intentionally kept:** About's "no AI-generated summaries in digest emails" and the welcome-email card heading "Find your legislators" (second person in a heading, vs. the first-person "Find my legislators" button) — both deliberate, not oversights.
- **TASKS + backlog refresh (2026-05-26)** — Reconciled tracker with PR **#38** (committee follows), PR **#37** (meetings browse window), home Lottie ship, migrations **026–027** on primary.
- **Home hero — capitol background + Lottie icons (2026-05-25)** — Optimized `ky-capitol-hero.jpg`; `HoverLottie` on landing feature cards; `LandingHeroCtas` / `landingHeroStyles` refactor (`37c881a`).
- **Follow committees v1 (2026-05-22, PR #38)** — Migration **026** (`ky_committee_follows`, `ky_committee_events`); `GET/POST/DELETE /api/committees/[id]/follow`; `FollowCommitteeButton` + `useFollowedCommittees`; profile **Followed committees** section; digest **Committee meeting scheduled** block; LRC sync emits `meeting_scheduled` on new meetings; migration **027** interim committee seed + `scripts/backfill-interim-calendar-2026.ts`; agenda search bill links; `preview:digest` committee preview support.
- **Meetings browse — session window (2026-05-22, PR #37)** — `/meetings` browse widened to session start so historical in-session meetings surface.
- **Committee + member UI polish (2026-05-22, UI-8–UI-11)** — Committee kind tags (`CommitteeKindChip`, `resolveKyCommitteeKind`) on meetings browse, committee cards/detail, member profile tiles; `OfficialSourceLinks` replaces heavy outbound button stacks; member roster two-line title + district; committee detail merges “At a glance” into overview + subcommittee parent link via `resolveKyCommitteeParent()`.
- **UX quick wins + browser review fixes (2026-05-22)** — Profile hash scroll + sticky section nav; map empty vs no-district states; member profile section reorder (Sponsored → Voting → Committees) with `KYBillCard` gallery, committee assignment tiles (`shortKyCommitteeLabel`), static district thumbnails on profile, clickable vote tally filters; bills browse topic quick-pick chips (`LANDING_TOPICS`); bill detail history expand/collapse (8 items), section header polish, Roll calls label, hearings empty copy; profile activity **Topics** filter (`?topic=` + hybrid LegiScan match); normalized Follow copy (`src/lib/follow-labels.ts`); nav tooltips toggle without secondary text; `diagnose:legislators` reports missing `legiscan_id`; `generate:district-thumbnails` (276 assets under `public/geo/district-thumbs/`); LegiScan reconcile seat-only fallback when Open States preferred names differ from LegiScan legal names (`ky-sync-pipeline.ts` — 0/138 missing after sync).
- **Doc / artifact hygiene (2026-05-22)** — Removed stale Framer handoff doc (`docs/framer-architecture.md`); stopped tracking LRC audit JSON under `reports/` (script output only; gitignored).
- **Verify-and-refine PR train (2026-05-21)** — All 13 recent-ship PRs PASS verification (Waves 1, 2a–d on the `verify-and-refine-app` branch); see `decisions.md` § 2026-05-21 for the linked GH-Actions vs Vercel-cron decision.
  - **#23** Committee calendar + meetings routes + civic UX — `/committees`, `/meetings`, bill-detail hearings block, `/legislature/resources` hub all render and link as specified.
  - **#24** De-duplicate bills sync + quiet hourly Slack — no duplicate `ky_bills` upserts in dry-run; Slack noise reduced to summary lines only.
  - **#25** Digest email refinement — `BillDigest` grouped by reason with raw actions shown and clarified labels (`preview:digest` render matches spec).
  - **#26** Uniform member cards + scalable district minimap — `LegislatorDistrictMinimap` on `MemberCard` + `/members/[slug]`; consistent card shell across surfaces.
  - **#27** Committee assignments + sponsored bills on profiles — `/members/[slug]` shows committees + sponsored bills (info alert removed when data present).
  - **#28** Wave 1 hero contrast + returning-user home — WCAG-AA primary CTAs; signed-in users see the Welcome-back hero on `/` (no auto-redirect).
  - **#29** Restore educational tooltips + nav toggle — `tooltipsEnabled` toggle visible in nav, persists, gates the custom `<Tooltip>` component.
  - **#30** Hover lift on bill cards — consistent in browse / search / feed / home (later refined by Wave 4b — preview wrapper removed).
  - **#31** Remove copy-link button from search — `BillsBrowse` filter bar no longer renders the button.
  - **#32** Lighter card hover shadow — `CivicCard` hover uses the new `CARD.hoverBoxShadow` token.
  - **#33** Normalize legislator card hierarchy — member and bill-sponsor cards share visual hierarchy / spacing.
  - **#34** Bill status chip tooltips — detail-page status-chip tooltip respects `tooltipsEnabled`; preview-style card tooltips removed in Wave 4b.
  - **#35** Schedule LRC committee calendar sync on GitHub Actions — `.github/workflows/sync-lrc-calendar.yml` runs at 12:00 and 18:00 UTC; secrets-free run path; Vercel `lrc-calendar` cron entry retired in Wave 4a (see `decisions.md` § 2026-05-21).
- **Verify-and-refine branch — Wave 4 sweep (2026-05-21)** — Follow-up fixes after PR-train verification on `verify-and-refine-app`:
  - **Wave 1.5** — Moved `pageItems` `useMemo` above the loadmore early return in `src/components/ui/PaginatedSection.tsx` (fixes `react-hooks/rules-of-hooks` lint error introduced 2026-05-17).
  - **Wave 4a — sweep fixes** — Removed `lrc-calendar` cron entry from `vercel.json` (GH Actions is sole scheduler); single retry-with-backoff on Wayback CDX list call in `scripts/backfill-lrc-calendar-wayback.ts`; deleted dead `src/components/home/HomeAuthGate.tsx`; appended `SLACK_WEBHOOK_SYNC` / `SLACK_WEBHOOK_URL` to the secrets doc-block in `.github/workflows/sync-lrc-calendar.yml`.
  - **Wave 4b — tooltip taxonomy enforcement** — Removed the whole-card preview `<Tooltip>` wrapper from `src/components/bills/KYBillCard.tsx`; deleted `KYBillCardTooltipTitle.tsx`, `BillTooltip.tsx`, `TooltipExamples.tsx`; audited `MemberCard` / `KYCommitteeCard` / `CommitteeMeetingCard` / `BillsListTable` (all remaining tooltips are educational); rewrote README `Tooltip system architecture` with the three-category taxonomy.
  - **Wave 4c — MemberCard → CivicCard** — Migrated `src/components/members/MemberCard.tsx` onto the `CivicCard` shell (header / body / footer slots); hover normalized via `CARD.hoverBoxShadow` token (absorbs F3); governor styling, stretch-link, and pointer-events preserved via `sx`.
  - **Wave 4d — Glossary page** — New `/glossary` page rendered from `governmentTooltips`, grouped + alphabetized with stable anchors; cross-references rendered as links; full plain-English editorial pass on all entries; 20 `KY_TOPICS` subjects added under a new `subject_topics` category; `TooltipContent` gains a `category` field; `Tooltip.tsx` gains an optional "Learn more" `InfoOutlined` affordance; footer link added; `billStatusExplanations` reconciled. See `decisions.md` § 2026-05-21.
- **Member profile data + Wave 1 home (2026-05-20)** — Committee assignments from LRC calendar on `/members/[slug]`; sponsored bills via JSON `cs` filter + `people_id` inference; fuzzy `legiscan_id` sync. Home: WCAG-friendly hero CTAs (solid white primary); signed-in **Welcome back** hero (feed/bills/map) without auto-redirect off `/`. PR #27 + wave-1 polish branch.
- **Browser review — remaining P1 (2026-05-19)** — Shared `BillNumber` (`detail` / `card` / `compact` / `inline`) on browse, detail, home lists, profile, committee agenda. `LegislatorDistrictMinimap` + lazy wrapper on `MemberCard` + profile. `LegislatorAvatar` party badge on bill sponsors, members, map tooltip, `SponsorAvatarChip`, design-system. Member profile: name-based sponsored-bill fallback in `member-profile-data.ts`; per-section empty states (votes still need `legiscan_id`). Committee browse: `fetchKyCommitteesBrowseEnriched` — leadership line + `KY_TOPICS` chips on `KYCommitteeCard`. Committee detail: bill-detail-style header card, breadcrumbs, at-a-glance, official-source buttons, compact legislative member list.
- **Browser review — low-lift UX (2026-05-19)** — Bill cards: removed `Tooltip` + hover lift on `KYBillCard` / `CivicCard` `variant="bill"`. Shared `BillStatusMetaChip` with Passed/Signed checkmark styling. Bills browse: dropped gavel on results row. Members: LegiScan footer removed from `MemberCard`; generic capitol phone hidden (`isGenericCapitolPhone`, `legislatorDisplayPhone`); executive sections merged as “Governor's office”; `Lt_governor` → Lieutenant Governor. Committee detail: no “Synced” caption; click meeting header to expand agenda. Frankfort resources: list layout, no intro paragraph, no per-card KYVKY links. Bill number typography: detail `h2`, grid `h4` (list/home/profile audit still open).
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
- **Digest history on **`/profile`** (2026-05-13)** — New `ProfileDigestHistorySection` shows the user's last 10 sent digests with the bills + event labels included, so anyone who lost the email can still see what was sent. Backed by `GET /api/me/digest-history`: queries `ky_notifications_log` under the user's JWT (RLS-scoped), then uses `supabaseAdmin` to expand `event_ids` against the service-role-only `ky_bill_status_history` and join to `ky_bills` for labels. Dedupes bills per digest and caps to 10 with "…and N more" overflow.
- **Launch blockers — Sentry alerts + privacy + terms + email polish (2026-05-13)** — `/api/cron/notify` and `/api/webhooks/resend` now `Sentry.captureException` on thrown errors and `Sentry.captureMessage` on silent partial-failure 200s, tagged `route:*` for alert-rule scoping. New `/privacy` and `/terms` pages cover what we collect, who we share with, retention, user controls, and acceptable use; both linked from `SiteFooter`, the register page (acknowledgment line), and email footers. Outbound mail policy: `From: alerts@kyvky.com` (transactional only); `Reply-To: katie@kyvky.com` (real inbox, also used in privacy/terms contact). Plain-text fallback (`render(el, { plainText: true })`) included on every transactional send for deliverability + a11y. Per-user rate limits on `/api/bills/[id]/follow` (60/min) and `/api/me/preferences` (30/min) keyed by user id with 429 + Retry-After. `/profile` followed-bills now shows a CTA empty-state card (browse bills / find your legislators) when no follows.
- **Legislator stale row cleanup + Senate district format (2026-05-13)** — Members page was showing 381 active legislators when the General Assembly has 138 seats. Two fixes: `syncKyLegislators` now runs a second deactivation pass for active LegiScan-only rows at seats covered by a current Open States row (predecessors and alias dupes); `scripts/normalize-legislator-districts.ts` rewrites legacy Senate `SD-0XX` to canonical `SD-XX` so the seat-key compare actually matches. New `npm run cleanup:stale-legislators`, `npm run normalize:legislator-districts`, `npm run diagnose:legislators`, and `npm run debug:openstates-roster`. After running cleanup + normalize the live count drops to ~141 active (100 House + 38 Senate + 3 statewide).
- **Email copy / structure pass (2026-05-13)** — `BillDigest` subject line is count-led ("Your KY bill digest — N updates"); preview text names bills + updates; new footer adds "Change frequency or topics" alongside unsubscribe and a one-line "why am I getting this" attribution. `WelcomeEmail` lead clarifies cadence ("we'll only email when followed bills change — no marketing"); marked one-time so users don't expect repeats; topic-follow card mentions automatic matching.
- **Topic taxonomy — hybrid digest matching (2026-05-13)** — Added `src/lib/ky-topic-legiscan-mapping.ts` translating LegiScan subject patterns to KY_TOPIC tags so the digest cron matches a user's `topic_filters` against EITHER `ky_bills.topics` (heuristic) OR `legiscan_subjects` (official) — closes the silent-miss path where a bill's correct LegiScan subject didn't earn a heuristic topic tag. `BillTopicMatchHint` reflects the same union so UI agrees with the digest. New `npm run audit:legiscan-subjects` and a workflow step on the weekly job report unmapped subjects sorted by frequency so the mapping stays current.
- **Legislator links — full fidelity + weekly verifier (2026-05-13)** — Migration **023** adds `external_links` JSONB on `ky_legislators`. Sync persists the full Open States `links[]` (URL + note + category + host); `MemberProfileView` renders a "Connect & follow" section grouped Social / Other (hidden when empty). Verifier now probes `external_links` (skips social by default, `--probe-social` to opt in) and emits JSON with `--output`. New `.github/workflows/legislator-links-weekly.yml` runs Mondays 12:00 UTC: `sync:ky:legislators` → `verify:legislator-links` → `audit:legiscan-subjects`, uploading reports as artifacts.
- **Follow Bills — M3 polish (2026-05-13)** — `BillTopicMatchHint` on bill detail: when a signed-in user has digest enabled and the bill's topics intersect their `topic_filters` but they aren't individually following, an inline alert names the matching topic so users understand updates are already in their digest.
- **Follow Bills — M8 bounce + welcome (2026-05-13)** — Resend webhook (`/api/webhooks/resend`) verifies Svix signatures and updates `ky_notifications_log.delivery_status` + `ky_notification_preferences.{bounce_state,bounce_count,suppressed_at}` (migration **021**). Digest cron filters `suppressed_at` users; emails set `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click`; `/api/unsubscribe/[token]` accepts both GET (HTML) and POST (RFC 8058). One-time welcome email after first verification: `WelcomeEmail` template + `/api/me/welcome-email` (idempotent stamp-then-send) fired from `/auth/verify` (migration **022**). New harness scripts: `npm run preview:digest`, `npm run verify:digest-state`, `npm run preview:welcome`. `scripts/load-env.ts` now falls back to the main repo when running inside a `.claude/worktrees/*` worktree and stubs `WebSocket` so supabase-js works on Node < 22.
- **Follow Bills — M5–M7 (2026-05-12)** — `ky_bill_status_history` with **pre-upsert** snapshots + `recordBillStatusHistoryForBuiltBatch` on all `syncKyBills` code paths; digest cron + Resend + unsubscribe route (`decisions.md` § 2026-05-12).
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
- **Verification snapshot (2026-05-11)** — Confirmed in repo: `supabase/migrations/017_search_members_discovery.sql`; app wiring in `src/lib/ky-search-bills.ts`, `src/lib/use-ky-search-suggestion-subjects.ts`, `src/lib/ky-committee-utils.ts`, `src/app/search/page.tsx`, `src/app/members/page.tsx`, `src/lib/ky-sync-pipeline.ts`. Auth recovery typing fix in `src/app/auth/reset/page.tsx` (`establishRecoverySession`). Latest `npm run build` succeeds.
- **Supabase apply** — Migrations **016–017** deployed on the primary project (2026-05-11): auth/profile (`016`); FTS bill search RPC, LegiScan subject RPC, and `committee_memberships` column (`017`). `sync:ky:legislators` run: URLs and committee arrays updated from Open States when `roles` / `links` are returned.
- **Sync CLI env loading** — `scripts/load-env.ts` resolves `.env` / `.env.local` from the repo root (not `cwd`) and applies `.env.local`** with **`override: true` so `OPENSTATES_API_KEY` and friends load reliably for `npm run sync:ky:*`.
- **Spot-check — links & discovery (2026-05-11)** — `npm run verify:legislator-links -- --limit 48`: 0 failures (LRC **200**, Ballotpedia **202**, LegiScan `getPerson`). `npm run spot-check:bill-links`: 12 recent `ky_votes` roll calls OK via LegiScan `getRollCall` (public legiscan.com/HTML returns **403** to automation—normal); 10 sponsor Ballotpedia URLs **202**. Production smoke (**www**): `/search` loads with suggestion chips (**education**, **budget**, **23**, **HB 1**); `/members` roster **381** after client fetch (member cards show KY Legislature / Ballotpedia / LegiScan links). Assistive snapshot before hydration can briefly show **0 people**—confirm count after load.

## Up Next

Roadmap priority (2026-06-02): **launch operator checklist** → **Wave 3 committee/data**. Waves 1–2, committee calendar Phases 0–4, and **Follow committees v1.5** are all shipped.

### Launch operator checklist (manual, not blocking code)

See **[docs/launch-checklist.md](./docs/launch-checklist.md)**.

### Wave 1 — Bill Watch parity (shipped 2026-05-19 — verified PASS 2026-05-21)

Reference: [docs/reference/bill-watch/](./docs/reference/bill-watch/README.md). Mapping: [bill-tracking.md](./docs/reference/bill-watch/bill-tracking.md).

**Blocked (product):** Add PNG captures to `docs/reference/bill-watch/screenshots/` per INDEX before pixel-polish passes.

- **Activity feed filters** — Shipped + verified 2026-05-21 (chips, `?kind=`, empty states).
- **Alert settings UX** — Shipped + verified 2026-05-21 (groups + Bill Watch link on `/legislature/resources`).
- **Saved searches MVP** — Shipped + verified 2026-05-21 (copy/save on `/bills` + `/profile#saved-searches`; migration **025** applied).
- **Bill tracking polish** — Shipped + verified 2026-05-21 (“Follow another bill”, `/dashboard` redirect); follow copy normalized 2026-05-22 (`follow-labels.ts`).
- **Design backlog (open)** — Home hero CTA contrast (Wave 4 ✅); member profile section order (2026-05-22 ✅); returning-user hero (2026-05-20 ✅); **Topics** activity filter (2026-05-22 ✅).
- **Bill card hover UX (browser review)** — **[P1] ✅ Wave 4b (2026-05-21)** — whole-card `<Tooltip>` wrapper removed from `KYBillCard`; preview-style tooltip components deleted; status-chip tooltip on bill detail remains as educational.

**Wave 1 non-goals:** Kentucky.gov auth, rules wizard, mobile quiet hours, per-bill alert overrides, premium “new bill match” email blast.

### Wave 2 — Launch polish (shipped 2026-05-19 — verified PASS 2026-05-21)

- **GDPR-style data export** — `GET /api/me/export` on `/profile` Security.
- **Resend "Send welcome again"** — `POST /api/me/welcome-email?force=1`.
- **Email rendering QA** (~2 hr, manual) — [docs/email-client-qa.md](./docs/email-client-qa.md); run after copy tweaks from review.
- **Snooze on follows** — Profile toggle; digest skips snoozed (needs **025**).
- **Map address autocomplete** — Shipped on `/members/map` (`DistrictMapExplorer` MUI `Autocomplete` + Mapbox suggest).
- **About page** — `/about` + footer link.
- **"How to contact your rep"** — Map accordion + resources links.
- **In-app notification badge** (~4–8 hr, lower priority) — not shipped.
- **Per-user digest timezone** (~4–6 hr) — deferred (Nov 2026 / open-rate data).
- **Regression cadence** — After large syncs or schema changes, re-run `npm run verify:legislator-links` and `npm run spot-check:bill-links`.

### Wave 3 — Committee / data (deferred)

From [docs/specs/committee-calendar.md](./docs/specs/committee-calendar.md) § Phase 5+:

- `ky_committee_materials`** + **`sync:lrc:committee-materials` — **Shipped 2026-06-02** (see Recently completed). Cron wiring + Slack notify on first sync still pending.
- **Session record spike** — `fixtures/lrc/legislative-record-26rs-live.html`; floor vs committee event split.
- **Interim period + session milestones** — **Shipped 2026-06-01** (see Recently completed).
- **LRC bulk API** — revisit if state publishes machine-readable roster (see Backlog below).

**Wave 3 note:** Follow committees **v1 shipped PR #38**; remaining gaps are **v1.5** (see Backlog), not Wave 3.

## Backlog

### Follow committees v1 + v1.5 (archived reference — fully shipped)

**v1 (2026-05-22, PR #38):**
- Migration **026**: `ky_committee_follows` + `ky_committee_events` + RLS
- `GET/POST/DELETE /api/committees/[id]/follow`; committees on `GET /api/me/follows`
- `FollowCommitteeButton` on `/committees/[slug]`; bookmark toggle on browse cards
- `ProfileFollowedCommitteesSection` on `/profile`
- Digest: **Committee meeting scheduled** preference + committee block in `runBillDigestCron`
- LRC sync: `meeting_scheduled` events on new meetings
- Migration **027**: interim/statutory committee seed; `scripts/backfill-interim-calendar-2026.ts`

**v1.5 (2026-06-02):**
- Migration **028**: dedupe index relaxed to include `agenda_content_hash` so multiple `agenda_updated` rows per meeting persist
- LRC sync: `agenda_updated` (hash diff) + `meeting_cancelled` (post-loop diff with empty-fetch + Wayback guards) event types
- `/meetings?follows=me` filter (mirror of `/bills?follows=me`)
- Committee events in `GET /api/me/activity` as `committee_event` kind; `Committees` chip on `ProfileActivitySection`
- Follow toggle on `CommitteeMeetingCard` + agenda search rows (browse-level fetch, not per-card)
- Three event slugs (`committee_meeting_scheduled` / `committee_agenda_updated` / `committee_meeting_cancelled`) under **Committee & interim** in `/profile` notifications
- `EmptyState.message` widened to `ReactNode`
- Activity-row visual refinement: shared `ActivityStatusChip` with tone-mapped icon, `body1` titles, clickable committee names; strip CTA → `/profile#activity` ("View all activity")
- Spec: [docs/specs/follow-bills.md](./docs/specs/follow-bills.md) § "Follow committees (v1 + v1.5)"

### Follow committees (original roadmap — archived reference)

**Goal:** Follow committees and get notified on schedule/agenda changes — analogous to bill follows. **Fully shipped 2026-06-02** (v1 PR #38, v1.5 follow-on).

**Original technical sketch (fully implemented):**
- **Schema:** `ky_committee_follows` + `ky_committee_events` — **Done (026, 028).**
- **Diff capture:** `meeting_scheduled` + `agenda_updated` + `meeting_cancelled` — **Done.**
- **API:** `/api/committees/[id]/follow` + `/api/me/follows` + activity feed — **Done.**
- **Copy/spec:** Extend follow-bills spec — **Done (2026-06-02).**

**Prerequisites:** Committee kind tags + subcommittee parent (UI-8, UI-11) — **Done.**

### Committee calendar (GA) — from [docs/specs/committee-calendar.md](./docs/specs/committee-calendar.md)

- **Phase 0** — **Done 2026-05-18.** Fixtures, parsers, spike + audit scripts, [phase0 report](./docs/specs/committee-calendar-phase0-report.md).
- **Phase 1** — **Done 2026-05-18.** Migration `024`, `src/lib/ky-lrc-calendar-sync.ts`, `npm run sync:ky:lrc-calendar`, cron `lrc-calendar` 12:00/18:00 UTC.
- **Phase 2** — **Done 2026-05-18.** `/committees`, `/meetings`, bill detail “Hearings & agendas”, `/legislature/resources`, nav + footer links.
- **Phase 3** — **Done 2026-05-18.** Profile activity feed (`ProfileActivitySection`, `GET /api/me/activity`); agenda search (`/meetings?q=`); saved filters via URL (`?chamber=`, `?when=`).
- **Phase 4** — **Done 2026-05-19.** `hearing_scheduled` events from LRC calendar sync; resources page Bill Watch note.
- **Phase 5+** — See Wave 3 above (materials, session record, milestones).

### Other

- **Legislator links — full fidelity** — **Shipped 2026-05-13** (migration 023, sync, profile UI).
- **Legislator links — verifier in CI** — **Shipped 2026-05-13** (`.github/workflows/legislator-links-weekly.yml`).
- **LRC vs structured APIs (legislator data strategy)** — Kentucky LRC / `legislature.ky.gov` is the **canonical public-facing** source, but it does **not** provide a stable, documented **bulk API** for the full chamber roster the way Open States does. The app **syncs** from Open States into `ky_legislators` and **points users to the LRC** with stored profile URLs and official House/Senate directory fallbacks (`kyLegislaturePublicUrl` in `src/lib/ky-member-utils.ts`). **Revisit** if the state publishes **machine-readable bulk data** (CSV, API) with clear reuse terms.
- **"Follow this bill" — email alerts** — Full spec: [docs/specs/follow-bills.md](./docs/specs/follow-bills.md). Login-only follows, daily digest default, factual content (no AI summaries in v1), Resend + canonical site `kyvky.com`. Phased milestones:
  - **M1 — Auth polish & profile foundation:** **Complete.** `ky_user_profiles` migration `016`, Supabase sync triggers, auth/forgot/reset/verify flows, `/profile` Account + Security, account deletion API, login → `/profile`, Profile-first nav. Cookie-session middleware + auth layout/register polish. See Recently completed and `decisions.md` § 2026-05-11.
  - **M2 — Data model for follows:** **In repo** — migration `019_ky_follow_bills_schema.sql` (`ky_bill_follows`, `ky_notification_preferences`, `ky_bill_status_history`, `ky_notifications_log` + RLS). **Apply 019** on all deployed DBs.
  - **M3 — Follow UX (inline, no dashboard):** **Complete.** Follow button; `?follows=me` + Following filter on browse; `KYBillCard` bookmark + topic chips; profile lists. `BillTopicMatchHint` shown on bill detail when topics match user filters but bill isn't individually followed. KY_TOPICS ↔ LegiScan subject hybrid mapping (`src/lib/ky-topic-legiscan-mapping.ts`) used by both digest filter and the hint so they agree.
  - **M4 — Preferences UI:** **Complete.** Notification panel on `/profile` (frequency, event presets/checkboxes, topic grid, followed bills); `GET/PATCH /api/me/preferences` wired (2026-05-22).
  - **M5 — Diff capture in sync:** `recordBillStatusHistoryForBuiltBatch` after bill upserts with **pre-upsert** `fetchBillHistorySnapshots` (hash-gated + legacy `syncKyBills`). Dedupe via `legiscan_change_hash` + unique index.
  - **M6 — Email plumbing:** `RESEND_*` + `BillDigest` template + `/api/unsubscribe/[token]`. Domain verification / `WelcomeEmail` optional follow-ups.
  - **M7 — Digest cron:** `/api/cron/notify` (Bearer cron secret); Vercel `0 11 * * *`; `ky_notifications_log` idempotency.
  - **M8 — Launch hardening:** **Complete.** Bounce / complaint webhook + suppression (migration 021); digest cap (10 events + "and N more"); copy review (subject line, footer); `List-Unsubscribe` + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` headers; one-time welcome email after verification (migration 022). End-to-end harness: `npm run preview:digest`, `npm run verify:digest-state`, `npm run preview:welcome`.
  - **Follow-up — verify digest send time:** After first DST transition (Nov 2026) or once open-rate data exists, evaluate whether `0 11 * * *` UTC is still the right hour. Consider open rates by hour, user feedback, and whether to add a per-user time-zone preference.
  - **Investigation — official vs. inferred topic taxonomy:** **Resolved 2026-05-13.** Outcome: Option A (hybrid digest match) shipped via `src/lib/ky-topic-legiscan-mapping.ts`. Preferences UI keeps the 20 KY_TOPICS (no LegiScan-subject picker — rejected as power-user feature). AI-fallback tagging deferred unless `npm run audit:legiscan-subjects` shows bills missing from BOTH taxonomies. Coverage maintained via the audit step on the weekly workflow.
- **Address search UX on map** — Shipped: Mapbox autocomplete on `/members/map` (2026-05-18 committee calendar ship); empty vs no-district states (2026-05-22).
- **"How to contact your rep"** — District map accordion covers basics; expand with capitol workflows, hearings, testimony links to LRC as product needs evolve.
- **PostHog analytics — MCP follow-up (optional)** — SDK + custom events wired on branch `feat/posthog-analytics` (2026-06-01): `instrumentation-client.ts` init, `PostHogPageviewTracker` for App Router pageviews, `src/lib/analytics.ts` rewired (autocapture on, identified-only profiles). Set `NEXT_PUBLIC_POSTHOG_KEY` in Vercel to activate. **Optional later:** run `npx @posthog/wizard mcp add` to attach the PostHog MCP to Claude Code for in-terminal querying of insights, funnels, and feature flags. Worth doing once 1–2 weeks of event data have accumulated — the MCP is data-driven and adds nothing until then.

## UX design tracker (agent)

Active:

- (none)

Done:

- **UI-8 — Committee type tags (2026-05-22)** — `CommitteeKindChip` + `resolveKyCommitteeKind()` (LRC `committee_type` + name patterns: standing, subcommittee, interim joint, statutory, board, oversight). Wired on `CommitteeMeetingCard`, `KYCommitteeCard`, `CommitteeDetailView`, member profile committee tiles.
- **UI-9 — De-emphasize outbound LRC / external links (2026-05-22)** — `OfficialSourceLinks` text-link row replaces button stacks on committee detail, meeting card footer, member profile Connect & follow.
- **UI-10 — Member list: title + district on separate lines (2026-05-22)** — `LegislatorIdentityBlock` split `roleTitle` / `districtLine`; `MemberCard` roster listings use two-line subtitle.
- **UI-11 — Committee detail: merge At a glance + subcommittee context (2026-05-22)** — Stats folded into header overview card; `resolveKyCommitteeParent()` links subcommittees to parent standing committee when roster match exists.
- **Home hero Lottie + capitol background (2026-05-25)** — `HoverLottie` on landing feature icons; optimized capitol hero image; `LandingHeroCtas` extracted (`37c881a`).

- Home IA (2026-05-09): orientation-first hero primary CTA (district map), merged topic module, bill-area-only loading spinner — see `decisions.md`.
- Members (2026-05-09): filtered roster `profileHref` bugfix; member profile `h1`/`h2`/`h3` outline, `Link` back control, bill links identifiable by underline; roster card keyboard profile navigation + portrait alt + refresh `aria-label` — see `decisions.md`.
- Legislator outbound links (2026-05-09): link ranking + normalization in code (`legislator-link-normalize.ts`, sync + read paths); primary DB refreshed via `sync:ky:legislators` — spot-check with `npm run verify:legislator-links` — see `decisions.md`.
- **Link verifier:** `npm run verify:legislator-links` (`scripts/verify-legislator-external-links.ts`) — HEAD/GET checks for LRC, website, Ballotpedia, LegiScan URLs per active legislator.

Blocked:

- **Bill Watch screenshots** — Product to add PNGs under `docs/reference/bill-watch/screenshots/` (INDEX ready). Unblocks visual polish only; Wave 1 features can ship without them.

Notes:

- Designer-assisted UI/UX work follows user-provided Operating Principles (clarity before cleverness; explicit hierarchy; IA before layout; WCAG AA baseline; friction intentional; defaults and states explicit). Modes: Generative vs Critique per request. Conflict resolution: hierarchy accessibility > clarity > safety > consistency > efficiency > aesthetic refinement; state trade-offs and decision questions when ambiguous. Log substantive design decisions to `decisions.md` (append-only). See also `README.md` (Local maintenance scripts) for current `npm run` tooling.

Open design questions moved to **Wave 1 — Design backlog** (Up Next).

## Deferred / Decided Against

- **Local government sync (product surface)** — **Paused 2026-05-18.** Ordinances (Louisville/Lexington Legistar), school boards (JCPS/FCPS), and county/city council calendars (Jefferson/Fayette) are out of scope until GA committee work ships. Code remains; re-enable crons in `vercel.json` (schedules in committee-calendar spec). Manual: `GET /api/sync?source=ordinances` etc.
- `/events`** as mixed local meetings hub** — Hidden from nav; repurpose for GA committee meetings or replace with `/meetings` in Phase 2.
- **Executive orders sync** — Deferred. `governor.ky.gov` listings are unreliable for automated sync (404s, client-only rendering). Scraper exists in `src/lib/ky-executive-orders.ts` but is excluded from product surface and cron. Revisit when a stable feed/API exists.
- **Filibuster / cloture / budget reconciliation tooltips** — Removed. Federal Congress concepts only; do not re-add.