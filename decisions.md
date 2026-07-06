# Design decisions (append-only)

Do not rewrite earlier entries. Append new dated sections at the bottom.

---

## 2026-05-09

- Adopted UI/UX Operating Principles for designer-assisted work (modes Generative vs Critique; conflict resolution layers hierarchy / trade-off / decision questions; documentation via `TASKS.md` UX tracker + this file). Existing roadmap sections in `TASKS.md` retained; UX subsection added for Active/Done/Blocked/Notes.
- Home page product choice: **prioritize new-user orientation** over bill-first entry. **Optimization:** comprehension and correct first visit path (map / roster before deep bill exploration). **Cost:** returning users who primarily track bills see map as the hero primary CTA until they scroll.
- Topic exploration: **single module** (`Explore by topic`) combining trending tiles (when data exists) and full chip list under subheadings, replacing two separate section headers.
- Home loading UX: orientation copy and topic module stay visible during fetch; spinner scoped to bill rails only so static guidance does not compete with a full-page wait state.
- Members roster filtered view: restoring missing `profileHref` on `MemberCard` was a **bugfix** (parity with grouped layout).
- Member profile: document outline uses **`h1` via `profileNameHeading` on `MemberCard`**, section **`h2`** for Sponsored bills / Voting record, **`h3`** for Recent votes; back navigation uses **`Link`** (`Button component={Link}`) instead of `router.push`.
- Member roster cards: **stretch `Link` overlay** + `pointer-events` on nested controls for keyboard and SR access to profile navigation (WCAG 2.1.1); portrait **`alt`** text when name known; legislator list refresh control **`aria-label`**.
- **Legislator outbound links:** Open States `links[]` ranked to prefer **Legislator-Profile.aspx** / **DistrictNumber** over generic LRC pages; **social** hosts excluded from stored campaign `website`; **HTTPS** normalization at sync and in `kyLegislatureProfileUrl` / `kyLegislatorCampaignWebsite`; **Ballotpedia** enrichment uses **`normalizeBallotpediaForStorage`**; dual Open States fetch merges preserve **`links`** when the offices-only pass omits them. Existing DB rows refresh only after **re-running legislator sync** (and optional bio enrichment).
- **Future:** Persist **all** outbound links (including social) in structured JSON + **backfill**; surface in UI by category.
- **Verification:** Script **`scripts/verify-legislator-external-links.ts`** (`npm run verify:legislator-links`) performs systematic HTTP checks on stored/computed legislator URLs; intended for manual runs and eventual CI. **Limitation:** confirms reachability and status codes, not that page content still matches the legislator (content drift requires different checks).

---

## 2026-05-10

Follow Bills + Email Digests — spec scope and v1 boundaries. Full spec: [docs/specs/follow-bills.md](./docs/specs/follow-bills.md).

- **Scope boundary — no dashboard in v1.** Profile is the only management surface. Followed state surfaces inline in existing UI (Follow button on bill detail, bookmark on `KYBillCard`, `?follows=me` browse filter, filled chip for followed topics). **Trade-off:** ships faster, validates demand before investing in a dashboard; users with many followed bills get a plain list rather than analytics. **Revisit if:** users ask for digest preview, activity history, or per-bill timeline views.
- **Auth model — login required to follow.** No anonymous email follows. **Trade-off:** simpler data model, one canonical user record, stronger account-recovery story; narrower reach (drops drive-by email signups). **Revisit if:** marketing pushes for friction-free email capture.
- **Email content — factual only, no AI summaries in v1.** Uses verified `ky_bills` fields (number, title, status, sponsors) plus event labels. **Trade-off:** lower differentiation but higher trust; avoids AI mis-summary in a civic context. **Revisit if:** retention or open rates suggest users want context.
- **Defaults for new accounts:** `digest_frequency = daily` (7 AM ET), event preset = "Major milestones only" (★), topic filters = empty (explicit opt-in). **Optimization:** clarity + safety — no surprise mass emails after signup; users who never customize still get useful digests. **Revisit if:** open rates suggest defaults are too aggressive or too quiet.
- **Cron time — single `0 11 * * *` UTC entry.** Accepts 1h DST shift (7 AM EDT / 6 AM EST). **Trade-off:** simplicity over per-season precision and per-user time zones. **Revisit if:** after first DST transition (Nov 2026) or once open-rate data justifies revisiting send time / adding time-zone preferences.
- **Digest cap — 10 events per email**, grouped by bill, with overflow link to `/bills?follows=me`. **Trade-off:** keeps emails scannable; "power followers" trade some immediacy for the linked filtered view.
- **Welcome email — sent on first email verification**, not on signup. **Optimization:** Resend deliverability reputation, list hygiene. **Trade-off:** unverified users don't get the welcome; mitigated by the verification email itself prompting next steps.
- **Topic taxonomy in preferences — defer expansion.** Use existing `ky_bills.topics` (20 KY categories) as the v1 checkbox grid; postpone the decision on whether to AI-tag currently-untagged bills until the official-vs-inferred taxonomy investigation completes. **Optimization:** prioritize official LegiScan subjects (`legiscan_subjects` from migration `015`) where surfaced. **Trade-off:** topic-followers may silently miss bills the keyword classifier didn't recognize; individual bill follows are the recommended workaround for users who care about specific bills. **Revisit if:** investigation finds AI tags are user-visible and material, or if user reports of missed bills emerge.
- **Hierarchy / friction:** Bill detail primary action remains "read the bill"; Follow is secondary. Unfollow is one-click (low consequence); account deletion requires typed-email confirmation (irreversible).

---

## 2026-05-11

**Follow Bills — pre-build verification (before M3).** Code-reviewed surfaces against [docs/specs/follow-bills.md](./docs/specs/follow-bills.md) § Pre-build verification; no feature implementation in this pass.

### KYBillCard bookmark (followed indicator)

- **Placement:** Add the indicator inside the **header slot**, on the **same row** as `ChamberChip` / `MetaChip`, using `display: flex`, `alignItems: center`, `justifyContent: 'space-between'`, `flexWrap: 'wrap'`, `gap: 1` so chips wrap as today and the bookmark sits on the **trailing edge** when space allows. Keeps the body slot (bill number + title) unchanged and avoids competing with sponsor avatars in the footer.
- **Interaction model:** Matches spec — **status only, not a control** (whole card remains the single link). Use **Lucide `Bookmark`** filled when followed; omit when not followed. **No 44×44 requirement** for this glyph.
- **Accessibility:** Expose **`aria-label="Followed"`** on a wrapping `span` with **`role="img"`** (and **`aria-hidden` on the SVG**), so the name is not conveyed by color alone and the indicator does not steal focus from the card link.
- **Tooltip wrapping:** The optional outer `Tooltip` unchanged; ensure the bookmark lives **inside** the same DOM subtree as the rest of the card content so hover/open behavior stays predictable.

### Bills browse — “Following” filter (`?follows=me`)

- **Consistency:** Reuse the existing **active filter chips** strip ([`BillsBrowse.tsx`](./src/components/bills/BillsBrowse.tsx)) — when scoped to followed bills, show a **deletable chip** labeled **Following** (same pattern as chamber/status/committee/topic/search chips). Include **`follows` in `browsePagerResetKey`** alongside other filters when implementing.
- **Discovery:** Add a **signed-in-only** affordance in the **filter toolbar** (e.g. toggle chip or compact toggle) that sets/clears `follows=me` via URL or shared state; mirror how **`topic`** is initialized from [`bills/page.tsx`](./src/app/bills/page.tsx) `useSearchParams` — extend `BillsPageInner` with `follows=me` read/write so the filtered view is **deep-linkable** per spec.
- **Signed-out:** **Hide/disable** the Following filter entirely — spec requires an account.
- **Topic chips on browse:** There is **no on-page KY topic chip strip** today; topics enter browse via **`?topic=`** from home. “Alongside topic chips” for M3 means **alongside the existing topic active-filter chip** (when set) and/or home topic navigation — **no prerequisite** to add a full topic picker on `/bills` before the Following chip.

### Topic chip — followed vs unfollowed styling

- **Mechanism:** Standard MUI **`Chip`**: unfollowed **`variant="outlined"`** + **`color="primary"`** (current home “All topics” pattern); followed **`variant="filled"`** + **`color="primary"`** so shape (outline vs solid) differs, not color alone.
- **Contrast:** Primary main **`#1e40af`** with **`contrastText: #ffffff`** ([`theme.ts`](./src/lib/theme.ts)) satisfies **WCAG AA** for filled chips in light mode; verify **dark mode** tokens once implemented on each surface.
- **Surfaces to thread user topic-follow state:** Home [`page.tsx`](./src/app/page.tsx) `KY_TOPICS` chips; [`KYBillCard`](./src/components/bills/KYBillCard.tsx) topic chips in tooltip (and any future inline topic row); bill detail **LegiScan subject** chips ([`bills/[id]/page.tsx`](./src/app/bills/[id]/page.tsx)) — only treat as “followed topic” when the subject aligns with a followed **`KY_TOPICS`** slug (spec preferences grid is project topics; subjects are a related taxonomy — avoid false “following” unless mapped).

### Bill detail — Follow button placement and hierarchy

- **Primary action unchanged:** **Contained PDF** (latest bill text) in the **Bill Text** card remains the clearest **read the bill** primary CTA.
- **Follow placement:** Add a **single secondary row** **after the subject-tags block** (or after description when there are no subjects) and **before** the introduced/last-action meta row — horizontal flex, **`MuiButton variant="outlined"`**, **`size="medium"`**, aligned with content. Keeps Follow **below** identity (title/subjects) but **above** temporal meta; does not compete with sidebar **Official Sources** links.
- **Signed-out:** **`variant="text"` or `outlined`** button label **Sign in to follow** linking to **`/auth/login`** with return URL, per spec states.

### Profile shell vs spec

- **Current state:** [`profile/page.tsx`](./src/app/profile/page.tsx) is a **stub** (email + **Dashboard** + logout). Spec requires **Account, Notifications, Followed bills/topics, Security** on **`/profile`** only — no management dashboard in v1 (see **§ 2026-05-10** above).
- **M1 scope:** Treat **multi-section profile shell + navigation between sections** as **required** before M4 preferences UI; aligns with TASKS **M1**.
- **Product cleanup:** **`/dashboard`** is **ComingSoonPage** — remove or demote **Dashboard** as the primary post-login destination: **`auth/login`** currently **`router.push('/dashboard')`**; **repoint to `/profile`** (or `/bills`) during M1 so flows match the spec. Nav **`MenuItem` Dashboard** should become **Profile**-first or deferred until a real dashboard exists (see **§ 2026-05-10** scope boundary above).
- *(Superseded by § **M1 implementation** below — `/profile` and redirects were expanded in code.)*

### M1 implementation (landed in repo)

- Migration **`016_ky_user_profiles`** — table, RLS (`SELECT`/`UPDATE` own row), `updated_at` trigger, **`ky_sync_profile_from_auth_user`** on `auth.users` insert/update, backfill for existing users.
- **`DELETE /api/me/account`** — Bearer access token + **`SUPABASE_SERVICE_ROLE_KEY`** (`admin.deleteUser`).
- Auth UX — **`AuthPaperLayout`**; routes **`/auth/forgot`**, **`/auth/reset`**, **`/auth/verify`**; login/register restyled to MUI; **post-login → `/profile`**; desktop user menu **Profile** entry only (Dashboard shortcut removed).
- **`/profile`** — **Account** (display name persist to `ky_user_profiles`, verification banner + resend) and **Security** (password, email change, typed-email delete modal).

---

## 2026-05-12

- **`GET` / `PATCH /api/me/preferences`** — Bearer JWT (same pattern as `/api/me/follows`). Returns or updates `digest_frequency`, `event_types`, `topic_filters`, and `unsubscribed_all_at` (no `unsubscribe_token` in JSON). Validators live in `src/lib/ky-notification-preferences.ts`: event slugs match the follow-bills spec (including `hearing_scheduled`, `veto_override_attempt`, `amendment_filed`, `new_cosponsor`); topic filters must be subsets of `KY_TOPICS`. **`PATCH`** clears `unsubscribed_all_at` when the client sets `digest_frequency` to `daily` or `weekly`** so list-unsubscribe can be reversed from the profile flow later.
- **`ensureKyNotificationPreferencesRow`** — Shared helper: if no row exists, **`INSERT`** default preferences. **`POST /api/bills/[id]/follow`** calls this after a successful follow so first follow does not depend on the auth trigger alone.
- **Migration `020_ky_notification_preferences_insert_policy.sql`** — Adds authenticated **`INSERT`** RLS on `ky_notification_preferences` (`WITH CHECK (auth.uid() = user_id)`). Required for the ensure helper under the user JWT. **Ops:** apply after **019** on any database used by the app.
- **`/profile` — Notifications + followed bills (M4 partial)** — **`ProfileNotificationsSection`** uses **`GET`/`PATCH /api/me/preferences`** (Bearer token): digest frequency radios, Major milestones / Everything presets, per-event checkboxes with `KY_DIGEST_EVENT_LABELS`, topic grid + quick-remove list (topics persist via immediate **`PATCH topic_filters`**; frequency and event types use an explicit save + snackbar, including copy when turning digest **off**). **`ProfileFollowedBillsSection`** lists **`GET /api/me/follows`** with unfollow via **`DELETE /api/bills/[id]/follow`**. Shared labels/order helpers added to `ky-notification-preferences.ts`.
- **Follow UX — browse + cards (M3 partial)** — **`?follows=me`** on **`BillsBrowse`** (all / house / senate) with **Your bills** toggle, active **Following** chip, **Clear all** clearing the param, empty state + **`browseBaseHref`** CTA, signed-out note; **`useFollowedBillsAndTopics`** hook ( **`GET /api/me/follows`** ). **`KYBillCard`** optional **`followedBillIds`** / **`followedTopics`** (header **Bookmark**, tooltip topic chips **filled** when followed). **`BillsListTable`** bookmark in bill-number cell. **Home** topic chips + bill grids use the same hook; **search** bill grid passes follow state. **House/senate** bill pages wrapped in **`Suspense`** for **`useSearchParams`**.
- **`ky_bill_status_history` (M5)** — `classifyBillHistoryEvents` + `recordBillStatusHistoryForBuiltBatch` in `src/lib/ky-bill-status-history.ts`. Sync records **pre-upsert** snapshots via `fetchBillHistorySnapshots`, then upserts `ky_bills`, then writes history (dedupe via `legiscan_change_hash` + unique index). Wired for **hash-gated** (`useChangeHash`) and **legacy** master-list / quota paths in `ky-sync-pipeline.ts`. **Bugfix:** fetching “previous” state after upsert made `prev` match `next` and suppressed events; callers now snapshot before upsert.
- **Digest email + cron (M6–M7)** — React Email `src/lib/email/bill-digest-email.tsx`, `src/lib/digest/run-bill-digest-cron.tsx`, **`GET /api/cron/notify`** (Bearer `SYNC_API_KEY` / `CRON_SECRET`, `dryRun` / `DIGEST_DRY_RUN`), **`GET /api/unsubscribe/[token]`** turns digest off. Vercel cron `0 11 * * *` on `/api/cron/notify`; bills cron uses `useChangeHash=true`. Env: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `APP_PUBLIC_URL` (`env-template.txt`).
- **Sentry — dev noise** — Server/edge init only reports in production unless `SENTRY_REPORT_DEV=true`; client uses `NEXT_PUBLIC_SENTRY_REPORT_DEV` when `NEXT_PUBLIC_SENTRY_DSN` is set. Cuts local ENOENT/chunk issues from polluting the project.
- **Canonical site URL — `kyvky.com`** — Default public origin for metadata, sitemap/robots, digest/unsubscribe links (`src/lib/site-canonical.ts`, **`DEFAULT_SITE_ORIGIN`**). Set **`NEXT_PUBLIC_APP_URL=https://kyvky.com`** (and **`APP_PUBLIC_URL`** if needed) on production. **`next.config.ts`** 308-redirects **`www.kyvky.com`** and legacy **`knowyourvotekentucky.*` / `knowyourvoteky.com`** hosts to **`https://kyvky.com`**. Resend: verify **`kyvky.com`** and send from an address on that domain (e.g. **`alerts@kyvky.com`**). **Supabase Auth** redirect URLs and SMTP sender should include **`https://kyvky.com`** (and preview URLs as needed).

---

## 2026-05-18

**Product scope — Kentucky General Assembly only (active).** Pause local-government automation to focus on Frankfort committee meetings, agendas, and interim activity. **Optimization:** engineering attention + cron budget on LRC calendar ingest and GA UX; avoids maintaining Legistar/school scrapers in production until there is a public product surface. **Cost:** LegiScan/Open States unchanged; zero new API spend for LRC HTML scrape in v1.

- **Vercel Cron:** Removed `ordinances`, `school-boards`, `county-actions` from `vercel.json`. **Scheduled:** `bills`, `legislators`, `votes`, `/api/cron/notify`, health-check.
- **`syncAll()` default:** `SYNC_SOURCES_DEFAULT` = `bills`, `legislators`, `votes` only. Paused sources remain on `SYNC_SOURCES` for manual `?source=` / operator runs.
- **Spec:** [docs/specs/committee-calendar.md](./docs/specs/committee-calendar.md) — data model, phases, Bill Watch UX benchmark, cost table, paused-cron restore snippet.
- **UX benchmark:** Official Kentucky [Bill Watch](https://www.kentucky.gov/services/pages/billwatch.aspx) — learn profiles + tracking alerts + “posted in committee”; KYVKY targets unified modern activity feed + first-class hearings (not legacy three-column dashboard).
- **Revisit local gov when:** GA committee calendar ships in UI, or explicit product decision to expand beyond Frankfort.

**GA display normalization & chamber vocabulary.**

- **Title case for LRC strings:** Committee names and agenda lines from the legislative calendar are normalized with `normalizeKyGaDisplayName` / `normalizeKyGaAgendaLine` when source text is mostly ALL CAPS. Applied at **sync** (`ky-lrc-calendar-sync`) and again at **render** so existing rows look correct without a one-off migration.
- **Joint (capital J):** Bicameral, interim, and statutory committees use the label **Joint** in chips, filters, and copy—not lowercase `joint`, and not **All** or **Both** when the meaning is House + Senate together. `ChamberChip` maps `chamber=joint` → **Joint**.
- **GA chamber filters:** `/committees` and `/meetings` use **House | Senate | Joint** toggles only (`GaChamberFilterBar`). No **All** chamber toggle; **no selection** shows every chamber. Active-filter chips + **Clear all** match bills/members browse.
- **Scope:** Bills browse **All** still means “all bills” (not Joint). Joint labeling applies to GA committee/meeting surfaces and committee search group headers.

**Performance — roster caching & committee detail batching (2026-05-19).**

- **Historical legislators stay in DB.** Profile pages load the full roster via `unstable_cache` (1h) for slug resolution; browse/search use **active-only** slim roster. No global `active=true` filter that would break bookmarked former members.
- **Shared roster:** `src/lib/ky-legislator-roster-server.ts` + `GET /api/roster/active` (CDN-cacheable). Client pages use `useKyActiveLegislatorRoster` with in-memory dedupe across mounts.
- **Committee detail:** Single agenda query (`meeting_id IN (...)`), cached active committee roster (no `external_links`), `revalidate = 300`, `React.cache` on committee slug (metadata + page).
- **Member profile:** `React.cache` on `getMemberProfilePageContext` so metadata + page share one roster fetch per request.
- **Bill detail API:** LegiScan roll-call enrichment capped at **12** votes; `Cache-Control` 5 min on JSON response.
- **Bills browse pagination:** `GET /api/bills/browse` returns one page (slim `KY_BILL_BROWSE_SELECT`) with exact SQL `count` + `range` when filters allow; status/follows/non-default sort use an in-memory cap of 2,000 rows. Client loads additional pages on demand (“Load more”).
- **Bill search:** `ky_bills_plain_search` runs first; ilike supplement legs (title, description, etc.) run only when FTS is unavailable or returns fewer than ~15 hits. Bill-number and LegiScan subject legs stay as targeted supplements.
- **Middleware:** `shouldRefreshSupabaseSession` skips `auth.getUser()` on public pages unless the request has a Supabase auth cookie or hits `/auth`, `/profile`, `/feed`, `/api/me`, or bill follow routes.
- **Homepage:** Mapbox bundle loaded via `next/dynamic` (`LandingDistrictMapPreview`, `ssr: false`).

**Committee calendar Phase 4 — LRC hearing digest events (2026-05-19).**

- **`hearing_scheduled` only (v1):** Spec mentioned `committee_scheduled` / `committee_agenda`; digest prefs already expose `hearing_scheduled`. Calendar sync records that type when a **new** `ky_bill_id` appears on a meeting agenda (agenda hash change + bill not on prior agenda). Dedupe: `UNIQUE (bill_id, event_type, legiscan_change_hash)` with hash `lrc-calendar|hearing_scheduled|{meetingId}|{billId}|{agendaHash}`.
- **Not in default preset:** “Major milestones only” omits `hearing_scheduled`; users opt in on `/profile` notifications.
- **Profile activity:** History rows show committee/time detail; agenda-derived hearing rows are skipped when the same bill+meeting_date already came from history (avoids duplicates).

---

## 2026-05-19

**Roadmap priority — Bill Watch parity, then launch polish.**

- **Wave 1:** Activity feed filters, notification grouping aligned with Kentucky Bill Watch checkboxes, saved searches (URL + profile), small bill-tracking polish. Reference pack: `docs/reference/bill-watch/`. **Non-goals:** Kentucky.gov login, rules wizard, per-bill alert overrides, premium new-bill email blast.
- **Wave 2:** GDPR export, welcome resend, snooze follows, About page, map autocomplete, email client QA.
- **Wave 3 (deferred):** Committee meeting materials sync, session record spike, interim/milestone copy — see committee-calendar spec Phase 5+.
- **Optimization:** Ship a unified activity surface and modern alert prefs before expanding LRC ingest surface area.

---

## 2026-05-21

**Verify-and-refine sweep — closing decisions after Wave 4 lands on `verify-and-refine-app`.** Reconciles the source-of-truth docs (`TASKS.md`, `README.md`, this file) with what actually shipped in PRs #23–#35 and the Wave 1.5 / 4a–4d follow-ups. Source code for each decision below already shipped; this entry only records the rationale.

- **GH Actions over Vercel Cron for LRC calendar.** The LRC legislative calendar sync needs ≥2 runs/day to catch same-day agenda changes, and the Vercel Hobby plan caps cron entries at once-daily granularity. Moved to `.github/workflows/sync-lrc-calendar.yml` (runs at 12:00 and 18:00 UTC). **Trade-off:** one more system to monitor (workflow run history + secrets in two places), but no schedule-drift on the data layer and no surprise quota throttling. The Vercel `lrc-calendar` cron entry was removed from `vercel.json` in Wave 4a to avoid double-fire — the composite uniques + `legiscan_change_hash` dedupe on `ky_committee_calendar_*` would absorb a second run, but redundant work wastes plan quota and Slack noise. **Revisit if:** Pro-tier upgrade lands, or if GH Actions free-minute budget becomes a constraint.
- **Tooltip taxonomy locked at three categories.** (1) **Educational** — plain-English definitions of civic / legislative terms (e.g. "committee", "Reported", "veto"), all sourced from `governmentTooltips` in `src/lib/tooltipContent.ts`, rendered by the custom `src/components/ui/Tooltip.tsx`, and gated by the global `tooltipsEnabled` toggle in `src/lib/TooltipContext.tsx`. (2) **UI affordance** — short icon-button labels (e.g. "Open in new tab"), inline MUI `<Tooltip title="…" />` at the call site, always on. (3) **Preview / detail** — bill-specific row data surfaced in a hover popover — **REMOVED** in Wave 4b (`KYBillCardTooltipTitle.tsx`, `BillTooltip.tsx`, `TooltipExamples.tsx` deleted; whole-card `<Tooltip>` wrapper stripped from `KYBillCard`). Going forward, "tooltip" in this codebase means category 1. Don't re-introduce category 3 — link to the detail page or surface the data on the card body instead.
- **Public glossary (`/glossary`).** Single page rendered from `governmentTooltips`, grouped + alphabetized by the new `category` field on `TooltipContent`, with stable per-term anchors (`/glossary#{key}`) and cross-references rendered as links. **Single source of truth:** the page reads the same record as the tooltip component — never duplicate copy between tooltip and glossary. Categories reuse the existing section comments in `tooltipContent.ts` plus a new `subject_topics` bucket carrying the 20-entry `KY_TOPICS` subject taxonomy (see decisions `2026-05-09` and `2026-05-13` topic-taxonomy entry). The educational `Tooltip` now exposes a small optional "Learn more" affordance (low-contrast `InfoOutlined`) that deep-links to `/glossary#{glossaryKey}`. **Discoverability choice:** footer link only — kept out of the primary nav because the glossary is a reference surface, not a destination page. **Revisit if:** support requests show users can't find civic-term definitions.
- **MemberCard → CivicCard shell (Wave 4c).** All member surfaces (`/members`, `/members/map` sidebar, `/members/[slug]` related cards) now use the same `CivicCard` shell (header / body / footer slots) as bill cards. Card hover shadow normalized via the `CARD.hoverBoxShadow` token introduced for PR #32 — eliminates the inconsistent raw-`Card` overrides that PR-train F3 flagged. Governor styling, stretch-link semantics, and `pointer-events` handling for nested controls were preserved via `sx` (no behavioral regression intended). **Trade-off:** one more layer of indirection between `MemberCard` and the underlying MUI primitives, paid for once when adding new card variants.
- **Wayback CDX retry policy.** `scripts/backfill-lrc-calendar-wayback.ts` now retries the CDX listing call **once** with a 5–10s backoff before propagating. **Why:** Wayback's CDX endpoint produces transient 5xx / timeout on first hit but recovers on retry roughly half the time in practice. Two consecutive failures still propagate — we don't want to silently mask a sustained outage. **Trade-off:** small added latency on the cold path of an already-manual backfill script; not applied to per-snapshot fetches (those are independent and the loop can resume).

---

## 2026-05-26

**TASKS.md backlog refresh + migrations 026–027 on primary.** Reconciles the task tracker with PR **#38** (committee follows), PR **#37** (meetings browse window), and home Lottie ship (`37c881a`). Migration **026** was already present on primary; **027** (interim committee seed) applied 2026-05-26; interim calendar backfill confirmed idempotent (214 meetings already present).

- **Follow committees v1 scope (PR #38).** Ship the minimum Bill Watch–analogous loop: per-user `ky_committee_follows`, append-only `ky_committee_events`, follow API + UI on committee detail and browse cards, profile list, digest block gated on **Committee meeting scheduled** preference. LRC calendar sync emits `meeting_scheduled` only when a meeting row is newly created (deduped by unique index on committee + event type + meeting). **Trade-off:** v1 does not cover agenda diffs, cancellations, activity-feed surfacing, or `/meetings?follows=me` — deferred to v1.5 so the core follow → notify path could ship with interim calendar data (migration **027** + PDF backfill script). **Revisit if:** users report missing agenda-change alerts before v1.5 lands.
- **Interim committee seed (027) + PDF backfill.** Standing committees come from LRC calendar sync; interim joint and statutory boards are seeded via migration **027** (RSN values from legislature.ky.gov) then populated with meeting dates from the LRC interim calendar PDF (`scripts/backfill-interim-calendar-2026.ts`). **Why separate seed:** interim bodies are not reliably discoverable from the same HTML calendar scrape path as in-session standing committees. **Trade-off:** manual maintenance when interim roster changes; script is idempotent and safe to re-run after PDF updates.
- **Notification preference reuse.** Committee meeting alerts reuse the existing `ky_notification_preferences` event-type toggles — new type `committee_meeting_scheduled` alongside bill/hearing presets — rather than a separate committee prefs table. Keeps `/profile` Notifications panel as single surface. **Revisit if:** committee-specific snooze or per-committee overrides are requested (currently follows committees inherit global digest frequency only).

---

## 2026-05-26 — UI design-system normalization pass

**Cross-surface design-pattern consolidation (members, committees, bills), staged on PR #40.** Records rationale; source already on the branch. First batch landed in `76f6e3c`; tooltip / member-profile / committee-detail follow-ups committed separately.

- **Shared layout + interaction tokens.** Added `CardGrid` / `CardGridItem` + `GRID` (one responsive card-grid config — 1/2/3 col, spacing 3), `FOCUS_RING` (single outline-based keyboard focus ring), and `INTERACTION` (row/tile hover with transitions) in `src/lib/ui-tokens.ts`. All browse/search/feed grids (bills, committees, meetings, search, feed, members) route through `CardGrid`; card/row/tile focus + hover route through the tokens. **Why:** audit found ~4 divergent hover treatments and 3 focus-ring spellings. **Trade-off:** one more indirection layer; deliberate exceptions still pass `spacing` / `sx`. `LandingFeatures`' intentional 3-up row was left alone.
- **Member identity normalized.** Single `legislatorAvatarDescriptor` + one `avatarInitialsFromName` replaced 5 duplicate initials helpers; `LegislatorIdentityBlock` gained an optional `meta` slot (contact info under the role line). Co-sponsor cards on bill detail reuse the same `SponsorCard` as primary sponsors.
- **Governor's office → standard grid.** Dropped the `md=8 / lg=6` featured-width override on `/members`; executive cards sit in the uniform grid. Green accent + Governor chip preserved (driven by governor detection, not the grid). **Why:** user asked for uniform columns; the bespoke width read as a layout bug.
- **Primary vs co-sponsor treated identically.** Bill-detail co-sponsors render with the same density, email, Ballotpedia/official-profile links, and chip tone as primary sponsors — only the label differs. **Decision (user choice):** maximize uniformity rather than give co-sponsors a lighter treatment.
- **Educational tooltip "Learn more" removed — reverses part of the 2026-05-21 glossary decision.** The `glossaryKey` "Learn more →" affordance made the custom tooltip surface interactive (`pointer-events: auto` + 150ms grace-period hide), which let multiple tooltips linger on screen at once. Removed the affordance and reverted the surface to non-interactive (`pointer-events: none`, immediate hide); `BillStatusMetaChip`'s MUI tooltip got `disableInteractive` and lost its inline "Learn more" link; dead `.ky-tooltip-learn-more*` CSS removed. **The `/glossary#{key}` page still exists** — it's just no longer linked from inside tooltips (footer link + glossary page remain). **Revisit if:** users can't discover civic-term definitions without the in-tooltip link.
- **Member profile redesign.** Two-col top (identity card left, district map right; stacks on mobile; container widened to `lg`); always-present **Official profile (KY Legislature)** link (`kyLegislaturePublicUrl`) in a "Profiles & links" block; sponsored bills now mirror `/bills` — 3-col `CardGrid` with client-side topic / status / sort filters + a **show/hide co-sponsored** toggle. Each sponsored bill is tagged primary vs co-sponsor in `fetchSponsoredBillsForLegislator` (via exported `classifySponsorRole`), which now selects `sponsors` + `topics` and returns `MemberSponsoredBill[]`.
- **Committee detail redesign.** Two-col top (identity left; quick-facts panel right with a Next-meeting callout + "View agenda", member/meeting counts as in-page jump links to `#committee-members` / `#committee-meetings`, official links, follow). Members rendered as a 3-col `MemberCompactCard` grid grouped Chair(s) / Members. **Trade-off (user choice):** the card-grid members view drops the inline copyable email (one click away on the member profile) in exchange for a more scannable, pattern-consistent layout. Browse-card enrichment (next-meeting / member-count on `/committees` cards) was considered and **declined** for now.

---

## 2026-05-27 — Returning-home hero fixes + personalized updates strip

**Design-critique follow-ups on the signed-in home (`/`).** Three changes from a critique of the logged-in landing page.

- **Returning hero subtitle unreadable — two compounding causes.** (1) **Real bug:** the `body1` typography variant bakes in a dark `color: slate[700]` (`theme.ts`), so the returning hero subtitle (`variant="body1"`) rendered *dark*, not the white it should have inherited from the hero — the bold headline (`h4`, no baked color) was fine, which masked the issue. The marketing hero subtitle uses `subtitle1` (no baked color) and was unaffected. Fix: force `color: 'common.white'` on the returning subtitle's `sx` (overrides the variant), plus `fontWeight: 500` and a moderate dark text-shadow. (2) **Scrim:** the capitol photo background (`37c881a`, 2026-05-25) reintroduced low contrast over the bright sky. `LANDING_HERO_SCRIM` (marketing) mid-band floor raised `0.15` → `0.42`; the *returning* hero is a short band (~py 6–8) cropping the brightest slice, so it got a dedicated darker `LANDING_HERO_SCRIM_RETURNING` (center ~0.72). Also fixed scrambled copy ("…the full legislature browse" → "…browse the full legislature"). **Lesson:** scrim/shadow tuning can't fix dark-on-dark — always check whether a `body*`/`caption` variant's baked color is fighting an inherited light color before adjusting overlays. **Why:** restores PR #28's WCAG-AA hero intent, which predated the photo background.
- **Hero CTAs unified into shared tokens.** The returning hero hardcoded three divergent button `sx` blocks (white contained / slate contained / low-contrast white outline) that bypassed the design system. Extracted `HERO_CTA_PRIMARY_SX` / `HERO_CTA_SECONDARY_SX` / `HERO_CTA_TERTIARY_SX` into `landingHeroStyles.ts`; both the marketing (`LandingHeroCtas`) and returning (`LandingHeroReturning`) heroes now consume them. Returning hierarchy is explicit: **Your feed** (primary) > **Browse bills** (secondary) > **District map** (tertiary). The tertiary uses a translucent slate fill instead of a bare outline so white text clears contrast regardless of the photo behind it. **Why:** the heroes were the one surface left out of the 2026-05-26 normalization pass.
- **Personalized updates strip — nudges, but does not cross, the 2026-05-10 "no dashboard" boundary.** New signed-in-only `LandingPersonalStrip` renders below the returning hero: up to 3 recent items from `GET /api/me/activity` (followed-bill status changes + upcoming hearings) with a "View your feed" link to `/feed`. **Decision:** this is *inline followed-state surfacing* (explicitly allowed by the 2026-05-10 scope boundary), framed as a launcher into `/feed` — **not** a new management/analytics surface, and there is still no forced redirect off `/` (preserves PR #28's choice). The strip renders **nothing** when signed out or when there is no activity, so the existing onboarding cards (`LandingFeatures`) remain the empty/first-run state. **Dedupe by bill:** `/api/me/activity` returns per-event rows, so a bill with several updates would otherwise fill the small teaser with repeats; the strip fetches extra and collapses to up to 3 *distinct* bills (most-recent event each), keeping it a glance at which followed bills moved while `/feed` remains the full event log. **Trade-off:** a returning user with activity now sees both the strip and the generic onboarding cards; conditionally hiding the onboarding cards once a user has follows was considered and **deferred** (larger change to `HomePageContent`, and the cards still aid discovery). **Revisit if:** the strip + cards read as redundant in use, or if product wants `/` to become a true personalized dashboard (which would reopen the 2026-05-10 boundary).

---

## 2026-06-01 — Session milestones + interim banner

**Wave 3 sub-item from [docs/specs/committee-calendar.md](./docs/specs/committee-calendar.md) Phase 5+.** Today is 2026-06-01: the 2026 RS adjourned April 15, so we are actually in interim — the existing banner showed "2026 Regular Session: Jan 6 – Apr 15" with a generic "Chambers can still post limited activity" caption, which read as a stale session label rather than naming the interim period.

- **Data shape: per-session optional `milestones`, not a parallel table.** Added `KYSessionMilestones` (`vetoRecessStart`, `vetoRecessEnd`, `sineDie`) as an optional field on each `KYSessionRecord` in `src/lib/ky-sessions.ts`. **Why a literal on each session entry instead of a separate config or DB table:** session calendars are a once-per-year operator edit (KY publishes the joint resolution dates), they don't change between deploys, and there are only one or two relevant sessions at a time. A separate config / migration would buy maintenance overhead with no upside. **Trade-off:** the values aren't queryable from outside the app process — fine, because no other surface consumes them.
- **2026 RS `milestones` intentionally left undefined.** The published 2026 KY veto-recess dates aren't confirmed in repo or my context, and the user-visible win (interim banner) doesn't depend on them — today's date is past `session.end`, so the interim path renders correctly regardless. The TODO comment in `KY_SESSIONS` points the next operator at the LRC-published session calendar. **Decision:** ship the data shape + helpers + glossary now, fill exact 2026 dates later in a one-line edit. **Trade-off:** if anyone backfills `asOf` to a date inside the actual 2026 veto recess (e.g. for screenshot or QA), the banner shows the in-session phase rather than `veto_recess`. Acceptable until the dates are confirmed.
- **`getInterimPeriod()` returns an open-ended window when no future session is in `KY_SESSIONS` yet.** Today: `{ name: "2026 Interim", start: "2026-04-16", end: null }` because 2027 RS isn't listed. Banner renders "April 16, 2026 – next session convenes" rather than fabricating an end date. **Why not hardcode the first-Tuesday-after-first-Monday-in-January rule:** Kentucky's session start day is set by joint resolution and can vary; better to make adding the next session entry the trigger for closing the interim.
- **`getSessionPhase()` is the source of truth for "which phase copy".** Returns `in_session` | `veto_recess` | `final_days` | `interim`. Falls back to `in_session` when the active session has no milestone data, so a session without populated milestones never lies about being in veto recess. Banner `phase` is exposed on `SessionBannerModel` for future consumers (e.g. home messaging, digest header) — not yet read elsewhere.
- **Banner copy: phase-driven `contextLine`, kept short.** Interim → interim-joint-committee explainer; `veto_recess` → 10-day governor-window explanation + recess dates; `final_days` → "chambers reconvene to consider veto overrides before sine die"; `in_session` (no milestones) → no second line at all. **Why no second line in plain in-session:** the previous version also had no caption mid-session, and adding one risked banner-blindness for the 60-day stretch when nothing has changed. The LRC link only appears with a caption (interim / recess / final days) since it's the destination users care about during those phases.
- **Glossary entries: `concurrence`, `veto_recess`, `interim_period`.** All under `procedures_and_voting` (not `bill_status_and_stages`) because they describe legislative-cycle procedure, not per-bill state. `adjourned_sine_die` already exists and stays in `bill_status_and_stages` because it's a bill-action vocabulary used on timelines.
- **Backwards compatibility:** `showAfterSessionNote` kept on `SessionBannerModel` (now `=== (phase === 'interim')`) and marked `@deprecated` so any external consumer doesn't break. The component already reads only the new fields.

**Revisit if:** users report the banner is confusing during the actual veto recess (which would require 2026 dates to be populated first); a per-page or per-section variant is needed (today's banner is sitewide on `/`).
## 2026-06-01 — Mobile design + a11y pass

**Combined `/design-critique` + `/accessibility-review` sweep of live `kyvky.com` at 375/390px.** Scope chosen with the user: five core read paths (`/`, `/bills`, `/bills/[id]`, `/members`, `/members/map`), live site (not local dev), one prioritized pass per surface (not deep per-component). Authenticated surfaces (profile, feed, follow flows) and committee/meetings surfaces deferred to a follow-up pass. Findings tracked as a 10-item checklist in **TASKS.md § In Progress → Mobile design + a11y pass (2026-06-01)**.

- **Strong baseline confirmed.** Skip-link, landmarks (1 main / 1 header / 1 footer / labeled nav), portrait alt text on `/members` (100/101 images carry descriptive alts), and body/nav contrast 8–18:1 all pass cleanly. The capitol-photo hero work from § 2026-05-27 (`LANDING_HERO_SCRIM_RETURNING`, baked-color override on `body1`) holds up — the one risk remaining is the 14px subtitle weight, flagged for spot-verification at the worst-case (brightest sky) pixel rather than assumed-fail.
- **Issues are localized to widgets, not architecture.** No layout reflow problems, no semantic landmark gaps, no color-only signaling failures detected. Everything found is at the control level (target sizes, form labels, heading order on two pages). **Implication:** a single theme-level mobile-target-size override in the MUI theme clears the majority of findings in one PR — the per-surface fixes are 1–2 lines each. **Trade-off:** the theme override scopes to `xs` breakpoint so desktop density is unchanged; explicit `size="small"` opt-outs remain available for genuine density needs (filter chip strips when a designer accepts the cost).
- **MUI `size="small"` overuse is the root cause** of items 2, 4, 7, 8, 9 on the fix list. The pattern is right at desktop density but wrong at mobile breakpoints. **Decision:** rather than rewrite every call site, override the MUI theme's `MuiIconButton` / `MuiButton` / `MuiChip` / `MuiInputBase` `minHeight` at `xs` to a 44px floor. Components keep their `small` API for desktop density compaction (e.g. inline filter chips), but never below the touch-target floor at mobile width. **Revisit if:** a designer needs deliberate sub-44 controls at mobile (e.g. data-dense table rows) — current call sites don't justify the exception.
- **Heading-order violations are real but small-scope.** `/bills` renders a duplicate `<h1>Bills</h1>` from a Suspense fallback (the fallback shell is parsed even when 0×0); fix is `aria-hidden` or `h2` on the fallback. `/bills/[id]` skips H1→H6 — section labels rendered as `h6` for visual size rather than structural level. Fix: promote to `h2`/`h3` and let typography variants size them via `sx`. **Lesson:** stop using `<Typography variant="h6">` as a size primitive; either use `component="h2" variant="h6"` to decouple level from size, or add a `SectionTitle` component that enforces correct level.
- **Form labels via placeholder are a hard a11y no.** Two inputs caught: address input on `/members/map` and the three filter comboboxes on `/bills`. Placeholders disappear on focus, so a screen-reader user who tabs in hears nothing. Fix: `aria-label` (when visible label would be visually redundant) or `<label htmlFor>` + `sx={{ srOnly: true }}` (when a visible label is appropriate). **Add an ESLint rule** — `jsx-a11y/label-has-associated-control` is already in `next/core-web-vitals` but not catching MUI's wrapped inputs. Custom rule or audit-script for `TextField` / `Select` / `Autocomplete` without `label` or `inputProps.aria-label` may be worth it post-fix.
- **Methodology caveat.** The audit agent's Chrome wouldn't shrink below ~1262px (macOS fullscreen on a 1512px display), so measurements came from `getBoundingClientRect()` at desktop width cross-referenced against MUI source — element heights are breakpoint-stable unless explicitly overridden, so the numbers are reliable mobile signals. **Real-device pass required before merge** to confirm (a) reflow at 320px, (b) Mapbox keyboard navigation, (c) the 14px hero subtitle over the worst-case capitol-photo pixel.

---

## 2026-06-02 — Follow committees v1.5

**Closes the four v1.5 gaps from PR #38 (committee follow v1):** `agenda_updated` + `meeting_cancelled` events in LRC sync, `/meetings?follows=me` filter, committee events in `GET /api/me/activity`, follow toggle on `/meetings` rows. Spec docs updated; see `docs/specs/follow-bills.md` § "Follow committees (v1 + v1.5)".

- **Dedupe index relaxed (migration 028).** v1's unique index on `(committee_id, event_type, meeting_id)` correctly prevents duplicate `meeting_scheduled` rows but blocks subsequent `agenda_updated` rows on the same meeting — and agendas can change several times during session. **Decision:** include `coalesce(event_payload->>'agenda_content_hash', '')` in the unique index. `meeting_scheduled` / `meeting_cancelled` omit the hash and behave the same as v1; `agenda_updated` rows dedupe by hash so each distinct version produces one digest-eligible event. **Rejected alternative:** `INSERT ... ON CONFLICT DO UPDATE` to refresh the same row's timestamp — the digest cron tracks last-sent by `observed_at` window so updates wouldn't reliably re-deliver, and an upsert silently swallows the "what changed" history we may want later.
- **Meeting cancellation is a *post-loop diff*, not a parser status.** The LRC HTML parser only knows `'scheduled'` / `'no_meeting'`; there is no "CANCELLED" badge to detect inline. **Decision:** after upserting all parsed meetings, compare the parse window (min/max `meeting_date` across this run's scheduled meetings) against DB rows with `status='scheduled'` in that window. Anything in DB but not in the current parse set is flipped to `status='cancelled'` and emits a `meeting_cancelled` event. **Two guards** prevent foot-guns: (1) the pass is skipped when `seenMeetingDates.length === 0` so a transient empty/error fetch never mass-cancels; (2) it is skipped during Wayback backfill (`skipHearingEvents=true`) since partial historical windows would false-positive. **Trade-off:** a "rescheduled" meeting (same committee, different date) shows up as `meeting_cancelled` on the old date + `meeting_scheduled` on the new date, two separate digest lines. Acceptable for v1.5; could be merged into a single "rescheduled" line later if user feedback warrants.
- **Three separate preference toggles (not one bucket).** v1 had a single `committee_meeting_scheduled` toggle. v1.5 adds `committee_agenda_updated` and `committee_meeting_cancelled` as *separate* slugs in `KY_DIGEST_EVENT_TYPES`, grouped under **Committee & interim** on `/profile`. **Why not a single "committee changes" toggle:** the three event types are operationally distinct (informational vs cancel-disruptive vs agenda-skim) and a single broader label would silently expand v1 opt-ins. **Trade-off:** three checkboxes is more UI density and means existing v1 users who had `committee_meeting_scheduled` on get the new types *off* by default and must opt in. Acceptable — the new types didn't exist when they configured prefs.
- **Activity feed gets a `committee_event` kind, not a separate endpoint.** `ProfileActivityItem.kind` now includes `'committee_event'` alongside `'bill_event'` / `'hearing'`. The route surfaces all three committee event types for the user's followed committees, sorted into the unified timeline. **Filter UI:** `ProfileActivitySection` chip group gains a fourth "Committees" option; `LandingPersonalStrip` renders the new kind with a primary-colored "Committee" chip and folds the detail into the secondary line ("Agenda updated — Committee on Education · 2026-06-04"). **Why one timeline, not a second list:** the personal strip is intentionally a *glance* surface (per the 2026-05-27 strip decision — launcher, not management); splitting into bill vs committee columns would re-open the "no dashboard" boundary. **Trade-off:** the strip dedupes by bill_id-or-href, so a committee with multiple events in the fetch window shows the most recent only — same per-target collapse pattern bills already use.
- **Follow toggle on /meetings rows reuses the bookmark IconButton pattern, not the full `FollowCommitteeButton`.** `CommitteeMeetingCard` got optional `following` + `onToggleFollow(committeeId)` props, rendered as a small bookmark glyph in the header row (matches `KYCommitteeCard`). **Why not the full button:** the full button is `Bearer`-token-aware and self-fetches state, which would re-load follow state per visible card on `/meetings` (~24 cards). Reusing `useFollowedCommittees` once at the browse level + passing state down is one fetch instead of N. **Trade-off:** the icon is less discoverable than the labeled button — accepted because the labeled button still lives on the committee detail page (one click away via the card link), and the row glyph is for the "I'm browsing meetings and want to quietly follow this committee" path.
- **`/meetings?follows=me` mirrors `/bills?follows=me` exactly.** Signed-in-only toolbar toggle, deletable active chip, signed-out alert with login redirect, follow-but-no-committees empty state. **Decision:** `EmptyState.message` prop widened from `string` to `React.ReactNode` so the empty-followed-committees card can embed a `/committees` link. **Trade-off:** the prop type widening is consumed everywhere the component renders, but the existing string callers are still valid (string is a ReactNode), so no migration required.

**Revisit if:** the per-event preference granularity is too noisy and users ask for a single "committee changes" bucket; cancellations of *rescheduled* meetings read as confusing in the digest (two-line vs one "rescheduled" line). *(Agenda-search follow toggle: shipped 2026-06-02 same day, see next entry.)*

---

## 2026-06-02 — Activity timeline visual treatment + v1.5 critique fixes

**Design-critique pass on the v1.5 ship plus a visual tightening of activity rows on both `LandingPersonalStrip` (home) and `ProfileActivitySection` (`/profile#activity`).** Records the four bug/decision fixes from the critique and the deliberate decision *not* to push activity rows into card form.

### Critique fixes

- **Duplicate label bug in `ProfileActivitySection` for committee_event rows.** The pre-fix render branched on `bill_number`: when null (committee_event), it rendered `item.label` as a `MuiLink` *and then* unconditionally rendered the same `item.label` as a `Typography body2` below. Bills hid the bug because `BillNumber` filled the link slot. Fix: guard the trailing `<Typography>` behind `item.bill_number` so committee rows show the label once. **Lesson:** any time a list-item render has a bill-vs-non-bill branch, audit each text node that follows for "did the branch already render this?"
- **`LandingPersonalStrip` CTA destination — moved from `/feed` to `/profile#activity`.** `/feed` is a bills-only view; with v1.5 the strip can include committee_event rows that `/feed` doesn't surface. **Decision (user-confirmed):** the strip is a launcher into the *unified* timeline (which is `/profile#activity`), not into `/feed`. Button label changed from "View your feed" → **"View all activity"**. **Trade-off:** divorces the strip's CTA from the navigation item it used to mirror; acceptable because the strip's content scope is also broader now (bills + committees + hearings).
- **Pre-existing lint error in `committees/[id]/follow/route.ts:22` cleared.** Inherited from PR #38: `// eslint-disable-next-line @typescript-eslint/no-explicit-any` on a `(data as any)?.id` cast was tripping the linter ("rule not found") in this repo's config. Replaced with `.maybeSingle<{ id: string }>()` + `data?.id ?? null` — cleaner typing, no rule reference, no disable comment. **Why include in v1.5 polish:** had been flagged as out-of-scope but the diff is two lines and the linter board was carrying it as noise.
- **Follow toggle on agenda search results.** v1.5 originally landed the toggle only on `CommitteeMeetingCard` (rendered when `agendaQuery` is empty); search results (rendered through `AgendaSearchResults`) had no follow affordance. Added optional `followedCommitteeIds: ReadonlySet<string>` + `onToggleFollow` props, threaded from `MeetingsBrowse` (same `useFollowedCommittees` browse-level fetch). Toggle uses the same bookmark IconButton pattern as the card. **Trade-off:** the row layout grew a flex wrapper so the bookmark sits to the right of the `ListItemText` — a minor structural change, but it preserves the existing primary/secondary text composition.

### Visual tightening — activity rows match bill-card pattern *without* becoming cards

**Constraint reaffirmed:** decisions.md § 2026-05-10, § 2026-05-27, and § 2026-06-02 (above) explicitly carve out activity surfaces as list timelines, not card grids. The user request to "more closely match the bill cards" was therefore implemented as *visual treatment* (status chips with icons, body1 title, clickable committee links), not as a structural rewrite to `CivicCard`. **Why this matters:** turning the strip and profile activity into card grids would re-open the 2026-05-10 "no dashboard" boundary and put the strip in direct visual competition with `LandingFeatures` below it.

- **New `event_type` field on `ProfileActivityItem`** so the UI can pick a tone without hard-coding label-substring matches. `event_type` carries the digest slug (`signed_or_vetoed`, `passed_chamber`, `meeting_scheduled`, etc.). `committee_name` + `committee_slug` also added so committee titles can render as links instead of being embedded inside the `detail` sentence.
- **`kyDigestEventChipTone(eventType, label)` helper in `ky-notification-preferences.ts`** maps event slugs to `'default' | 'primary' | 'success' | 'warning' | 'error' | 'info'`. **Why label-aware:** `signed_or_vetoed` covers both signing and vetoes; reading `label` (which is already disambiguated by `formatDigestEventLabel`) is cheaper than adding two more event slugs.
- **`ActivityStatusChip` shared component** in `src/components/civic/`. Wraps `MetaChip` with tone-mapped border + text color and a leading `Check` (success) / `Cancel` (error) icon. **Why a wrapper, not raw `MetaChip`:** the site's `theme.ts` has a global `MuiChip.styleOverrides.outlined` that hard-codes `borderColor: slate[200]` and `color: text.primary`, which silently neutralizes MUI's tone-specific border colors site-wide. `BillStatusMetaChip` on `/bills` cards works around this with the same trick (green `Check` icon + green text overrides). `ActivityStatusChip` is the same trick centralized so both activity surfaces stay aligned and any future tone tweak is one file. **Trade-off:** another small wrapper component in `civic/`. Acceptable because both `LandingPersonalStrip` and `ProfileActivitySection` would otherwise duplicate ~25 lines of color-override sx.
- **Bill title and committee name promoted to `body1` weight 500.** Previously `body2` color-secondary appended after a "—". Now anchors the row visually the way bill cards' title does, without becoming a card header.
- **Committee names are now `NextLink` to `/committees/[slug]`.** Hearing rows have a `committee_name` but route through the bill href (which they should — the user follows the bill, not the committee in that case), so the committee name is shown as plain text. Committee_event rows get the link.
- **Date moved to far right of the primary row via `ml: 'auto'`** on both surfaces. Makes the chip cluster left-aligned and the timestamp glanceable on the right — same scan order as bill-card meta rows (chamber+status left, timestamp/sponsor right).
- **Render fixed:** strip rows now show three distinct columns of information: kind chip → status chip → date (right). Committee rows: kind chip → status chip → date; below: committee name (link) and date/location caption.

### Decisions explicitly rejected
- **No next-step / previous-step status indicator.** Was proposed in the critique. Rejected because: (a) it duplicates state the bill-detail page owns, (b) committee events don't have a status state machine to derive a "next step" from, (c) it would nudge activity rows toward bill-detail-mini cards — back toward the dashboard boundary.
- **No converting activity rows into `CivicCard`-based cards.** Same reason — see boundary constraint above.

**Revisit if:** the green ✓ / red ✗ icon visual signal proves insufficient at typical scanning distance (the chip border stays slate per the theme override — only the icon and text are colored); the next-step indicator is requested again in user feedback after launch.

---

## 2026-06-03 — Accuracy-audit agent: seeded random sampling + scope boundaries

**The weekly content-accuracy agent (`audit:accuracy`, `.github/workflows/accuracy-audit.yml`) now samples a *different* slice of data each run, reproducibly.** Records the sampling design and the deliberate scope boundaries (what this deterministic agent checks vs. what is delegated to an LLM/data agent).

### Sampling design

- **Seeded random sampling, not "most recent."** `src/lib/accuracy-audit/sampling.ts` exposes `makeRng` (mulberry32), `seededShuffle`, and `sampleTable`. Bills, votes, and committee-materials checkers now pull a random window via one `COUNT` + one bounded `range()` fetch, then seed-shuffle and slice the per-domain limit. **Optimization:** rotating coverage across the *entire* corpus over many runs (old sessions included), not just whatever changed in the last N days. **Trade-off:** a single run no longer guarantees the freshest rows are checked; freshness is covered by the existing sync workflows, and full-corpus coverage accrues across weekly runs.
- **Seed is printed on every run and surfaced in the report** (console `[accuracy-audit] seed=…`, plus `seed=` in the console/Slack summary). Default = random per run (`Math.random`); pin with `--seed=N` or `ACCURACY_SEED`. **Why:** "different every time" for coverage, but any flagged run is reproducible for debugging/triage.
- **Per-domain seed streams** are derived by XOR-ing the base seed with fixed constants (e.g. bill-text link sample uses `seed ^ 0x9e3779b9`, topics uses `seed ^ 0x85ebca6b`, glossary uses `seed ^ 0xc2b2ae35`) so two samples in the same run don't pick correlated offsets while staying reproducible.
- **Legislators stay full-coverage (no sampling).** The Open States roster is a single fetch and the table is ~141 rows, so every active legislator is checked each run. Added lightweight `email` / `phone` (digit-normalized) / `photo` presence diffs vs. Open States — zero extra API calls since the roster is already fetched. **`ACCURACY_DAYS` is now effectively reserved** (committees use live calendar data; bills/votes seed-sample) rather than a hard lookback filter.

### Deterministic vs. LLM scope (boundary)

- **In scope for this agent (deterministic, source-of-truth diffs):** bill metadata + sponsor *identity* (people_id set, not just count) vs LegiScan `getBill`; roll-call tallies vs `getRollCall`; legislator roster/contact vs Open States; committee-material + agenda drift vs live LRC; static link-shape validation (live probing opt-in via `ACCURACY_PROBE_LINKS`).
- **Out of scope here — delegated (see `TASKS.md` → Backlog → "Accuracy-audit follow-ups"):** anything requiring semantic judgment or heavy fetches — `ai_summary` faithfulness, `topics[]` plausibility, and glossary correctness (the `--no-llm`-gated `llm-review.ts` pass), plus full bill-text/amendment body diffs and committee-membership deep reconciliation. **Why:** keep the always-on agent cheap, deterministic, and free of false positives from LLM variance; route fuzzy/expensive verification to a dedicated pass that a human or separate agent triages. LLM findings are advisory and must be cross-checked against primary sources before any content edit (cf. the 2026-06-03 glossary corrections, where the model's suggested veto/emergency-clause thresholds were themselves wrong).

### CI status policy — green = the agent ran, not "no content drift" (added 2026-06-03 after PR #67)

- **The GitHub Action fails ONLY on operational problems** — a checker crashed (`erroredDomains`) or LegiScan quota blocked the run. These also escalate the report to `#errors`. **Content findings — even deterministic `fail`s — are reported to the status digest but keep the job green** (`scripts/accuracy-audit.ts` exits `hasOperationalError ? 1 : 0`). **Why:** a weekly monitor over a large civic corpus will almost always surface *some* drift (topic tags, post-session interim-committee status nuances, cross-session `bill_number` ambiguity). Failing CI on every finding trains the team to ignore the red X. Separating "the agent broke" (red, fix the agent) from "content needs triage" (green job + Slack digest) keeps the signal meaningful. **Revisit if:** a class of deterministic finding proves urgent enough to warrant paging.
- **LLM verdicts are capped at `warn`** (`normalizeSeverity` in `llm-review.ts` maps the model's `fail` → `warn`). Consistent with the advisory/out-of-scope boundary above: the LLM never turns CI red and never pages `#errors`.
- **Context:** surfaced while troubleshooting the failing weekly run. `main` was running a stale squash-merged snapshot (deprecated `claude-3-5-sonnet-20241022` → 404; live link probing → reachability timeouts; `getBill`-has-no-`last_action` status false positives). PR #67 synced `main` to the validated version and added this policy.

### Topic classifier keyword precision (added 2026-06-03)

Acting on the LLM topic warnings, removed the three keywords in `src/lib/ky-topic-classifier.ts` responsible for most mis-tags, then backfilled existing rows:

- **`emergency` / `safety` → Public Safety:** bare `emergency` matched the "emergency clause" / "declares an emergency" boilerplate present in a large share of bills (and `safety` was generic), so unrelated bills got "Public Safety" — often as the *only* tag. Replaced with specific phrasing: `emergency management`, `emergency services`, `first responder`, `state of emergency`, `public safety`. Genuine signals (`police`, `crime`, `disaster`, `911`, `sheriff`, `ems`, `fire`, `flood`) still fire.
- **`commissioner` → Local Government:** matched state offices (Commissioner of Agriculture, Insurance/Workers'-Claims Commissioner), not local government. Replaced with `magistrate` and `county judge-executive`; `fiscal court` / `county` / `city council` etc. remain the KY local-gov signals.
- **`fiscal` → Taxation:** matched "fiscal court" (local gov) and "fiscal note/year/impact" boilerplate, not tax policy. Removed.
- **Backfill:** `scripts/reclassify-bill-topics.ts` (`npm run topics:reclassify[:dry]`) recomputes `ky_bills.topics` and updates changed rows — needed because the sync only reclassifies new/changed bills. First apply: **22,547 scanned, 2,536 changed (~2,548 bogus tags removed, 219 real topics promoted into the top-4).** Idempotent and re-runnable after future keyword edits.
- **Trade-off / limits:** keyword precision, not perfection — `agriculture` still matches incidental "Commissioner of Agriculture" mentions, and `HCR84` (Energy vs. Natural Resources/Mining) needs a taxonomy decision (no "Natural Resources" topic). Deeper semantic tagging stays delegated/advisory (LLM), per the scope boundary above.

---

## 2026-06-03 — Accuracy-audit LLM triage pass #2 (Voting Rights keyword precision; HCR84 taxonomy call)

**Second pass on the advisory `llm-review.ts` warnings.** Ran the LLM domain dry-run across seeds **1, 2, 3, 4, 7, 11, 99** at `ACCURACY_LLM_SAMPLE` 40–80 (`ACCURACY_LLM_SAMPLE=N npm run audit:accuracy -- --domain=llm --dry-run --json --seed=K`). **Every run returned 0 warnings** — the prior precision pass (above) plus the earlier glossary corrections already cleaned the surfaced content. The real fix this pass came from *direct* primary-source triage of the corpus, not from a model flag.

### Structural finding — the `ai_summary` faithfulness pass reviews 0 rows
- `ky_bills.ai_summary` is **null for all 22,547 bills**, so `reviewSummaries` always returns 0 items (the `checked` count is consistently exactly 2× the sample = topics + glossary only). The summary-faithfulness leg is effectively a no-op until summaries are generated and stored. **No DB edits** — there is no stored summary content to be unfaithful. Flagged here so the next operator knows the leg is dormant, not passing.

### Glossary — verified clean against primary sources, no edits
- At sample 80 the LLM pass reviews the **entire** `governmentTooltips` set (~76 entries) every run; clean across seeds. Independently verified the fact-bearing entries against KY primary sources: veto override 51 House / 20 Senate per **Ky. Const. § 88** (`vetoed`, `veto_override`); quorum 51/100 & 20/38 (`quorum`); 100 House / 38 Senate and term lengths (`house`, `senate`, `representative`, `senator`); and the `emergency_clause` citation to **Ky. Const. § 55** ("concurrence of a majority of the members elected to each House" by yea/nay vote, with the reasons "set out at length in the journal of each House" — confirmed verbatim at legislature.ky.gov). All accurate. **No glossary changes.**
- **Scope note (not changed):** the `topic_*` subject-topic definitions and the vote-count chip tooltips live in the `voteCountTooltips` export, which `llm-review.ts` does **not** import (it only audits `governmentTooltips`), so those entries are never LLM-reviewed. Left as-is — out of scope for a content-triage pass, and they read accurately on inspection.

### HCR84 — DECLINE adding a "Natural Resources" topic (resolves the open item from the pass above)
- Two rows carry `bill_number = HCR84`: the **2025 RS** "Automatic Expungement Task Force" → `Criminal Justice` (correct), and the flagged **2010 RS** "Establish the Kentucky Natural Resources Caucus to support the coal, oil, and natural gas industries." → `Energy`.
- **Decision: do not add "Natural Resources" to `KY_TOPICS`.** Rationale: (1) the flagged 2010 bill is about the **coal, oil, and natural gas industries**, which fall squarely under the site's *own* `Energy` topic definition ("Electricity, natural gas, coal, oil, renewables, utility regulation…"), so `Energy` is a defensible tag, not a confirmed error — the LLM's "really Natural Resources" framing keys off the caucus's *name*, not its subject. (2) A corpus scan of ~620 bills mentioning extractive/natural-resource terms (mining, mineral, reclamation, coal, forestry, fish & wildlife, state parks, oil & gas, timber) shows them **already distributed sensibly** across `Environment` (fish & wildlife, conservation, forestry), `Energy` (coal/oil/gas), and `Taxation` (severance tax) — there is **no coherent unmet cluster** that a "Natural Resources" topic would serve. (3) `KY_TOPICS` is a user-facing follow taxonomy (notification prefs grid, glossary `subject_topics`, LegiScan mapping); a 21st topic that overlaps ambiguously with `Energy`/`Environment` and forces a re-tag of every coal/mining/mineral/forestry bill is exactly the sweeping/speculative change the triage ground rules caution against. **Left HCR84/2010 as `Energy`.** Revisit only if a genuine high-volume mining/extraction cluster emerges that `Environment`/`Energy` demonstrably mis-serve.

### Real fix — Voting Rights classifier false positives (`registration`, `primary`)
Direct triage of the `Voting Rights` tag (surfaced while scanning the topic corpus, not by an LLM flag) found two bare keywords generating the bulk of its mis-tags — the same false-positive class the pass above removed:
- **`registration` → Voting Rights:** matched generic vehicle / business / professional / motorboat / firearm registration boilerplate — radon contractors, metal detectors in state parks (HB352), pharmacy technicians, optometrists, motor-vehicle titling. **311** of 1,258 VR-tagged bills triggered on it.
- **`primary` → Voting Rights:** matched `primary care`, `primary school`, `primary residence`, "heart attack response". **191** triggers.
- **Replaced with voter-specific phrasing** (`voter registration`, `primary election`) and, critically, **added the plural forms `elections` and `voters`.** The classifier matches on word boundaries, so singular `election`/`voter` silently miss the plurals that genuine "AN ACT relating to elections" bills use (KRS 116/118/120) — without the plurals, removing `registration`/`primary` left real election bills (HB688, HB287, SB79, SB232) with **no topic or only "Budget"**. `elections`/`voters` are unambiguous (they rarely appear outside an actual elections context), unlike the bare keywords they replace. `election` (the dominant 495-hit genuine signal) was kept.
- The LegiScan-subject mapping (`ky-topic-legiscan-mapping.ts`) was **already** correctly scoped (`/voter.*registration/`, `/election law|election integrity/`, no bare `primary`), confirming the classifier's bare keywords were the outlier; **mapping left unchanged.**
- **Backfill:** `npm run topics:reclassify` — **22,547 scanned, 648 changed (343 tags removed, 227 added).** Two-directional verification on the new keywords: **179** bills newly/again carry `Voting Rights`, **0** of them non-vote-related (no new false positives from the plurals); the 343 removals are non-voting bills (vehicles, firearms, radon, marijuana-program registration, etc.). `npx tsc --noEmit` clean.
- **Trade-off / limits:** still keyword precision, not perfection. The plural gap is patched only for the two highest-impact terms (`elections`/`voters`); other singular keywords across the taxonomy may have analogous plural blind spots, addressed when a specific finding warrants it. Deeper semantic tagging stays advisory/delegated per the scope boundary.

---

## 2026-06-04 — Accuracy-audit triage pass #3 (add `Transportation` topic; Infrastructure/Labor/Local-Gov precision)

**Third pass on the advisory `llm-review.ts` topic warnings** (the two runs in the launch terminal: seeds `1714552507` + `474419580`, 9 distinct `topics` warnings). Each flagged bill was traced to the exact keyword that fired (read-only DB diagnostic, since `bill_number` repeats across sessions). The warnings fell into three buckets and resolved as follows.

### ADD a 21st topic: `Transportation` (reverses the default-decline posture *for this cluster only*)
- **Why this clears the bar that "Natural Resources" (§ 2026-06-03 pass #2) failed.** Five of the nine warnings (`HB354` railroads, `SB14` school-bus lighting, `HB209` special license plates, `SB142` motor-vehicle recycling, plus the recurring "Infrastructure is a catch-all" theme) point at one coherent, high-volume cluster. The classifier *already had* `road / highway / bridge / transit / transportation` — they were just bucketed under `Infrastructure`, so transport bills either got the vague tag or matched it only incidentally ("private **road**" in a railroad bill; "**Transportation** Cabinet" agency name in a vehicle bill). Unlike Natural Resources, this is not a name-vs-subject misread and there *is* a clean unmet cluster.
- **Moved** transport keywords out of `Infrastructure` into a new `Transportation` topic: `road, highway, transit, transportation, motor vehicle, license plate, railroad, railway, vehicle registration, driver's license, school bus, toll road, public transit, mass transit`. `Infrastructure` now means water/sewer/wastewater/stormwater/sewage/broadband/internet/dams only.
- **Bare `bridge` deliberately NOT a classifier keyword** — it matched financial "bridge loans" (`HB284`). Genuine bridge bills are still surfaced to topic-followers via the LegiScan `/bridge/` **subject** mapping (structured subjects are reliable; free-text `bridge` is not). Same split rationale as the `registration`/`primary` pass.
- **Blast radius (no migration needed — `topic_filters` is a free `TEXT[]`, no DB CHECK):** `KY_TOPICS` + keywords (`ky-topic-classifier.ts`); `TOPIC_TO_SUBJECT_PATTERNS` gained a `Transportation` key and lost the transport patterns from `Infrastructure` (`ky-topic-legiscan-mapping.ts` — `Record<KYTopicTag>` so TS enforces completeness); new `topic_transportation` glossary entry + trimmed `topic_infrastructure` copy (`tooltipContent.ts`). The notification-prefs grid derives from `KY_TOPICS` automatically.

### Precision fixes (no taxonomy change)
- **`Infrastructure`: removed bare `construction`.** It matched finance/legal boilerplate ("construction loans", "construction contracts", "statutory construction") more than public works; genuine state construction still hits road/highway/water/sewer. Fixes `HB284` (high-cost home loans) → now correctly **untagged** (no `Finance`/`Banking` topic exists, so no tag is the honest outcome).
- **`Labor`: `worker` → `workers` (plural).** Singular matched incidental "health care **worker**"/"social worker" in non-labor bills (`SB9` born-alive-infant bill was tagged `Labor`). Plural is the genuine signal ("essential workers", "workers' rights/compensation"); real labor bills also hit employment/wage/labor/union. **Bonus:** because `\bworker\b` never matched the plural, this also *recovered* worker-focused resolutions the singular keyword had been silently missing (e.g. `SR45`, `SR152`) — same plural-gap mechanic as the `elections`/`voters` fix.
- **`Local Government`: added `area development district` + `area development districts`.** Fixes `HB431` (Joint Funding Administration → ADDs) → now `["Local Government","Budget"]`. The plural form was required separately because the text says "Area Development District**s**".

### Deliberately LEFT (core-signal limits, documented not fixed)
- **`SB146`** (coal-miner state-hiring preference) keeps `Energy` via `coal` — `coal` is a core Energy signal; the bill is a job-qualifier mention. Primary topic `Labor` is correct; the extra tag is the same accepted class as "agriculture matches incidental 'Commissioner of Agriculture'."
- **`SCR64`** (water/wastewater task force) keeps `Energy` via the agency name "**Energy** and Environment Cabinet." `energy` is a core signal with no clean word-boundary exclusion; the bill correctly keeps `Infrastructure` (water), which the LLM accepted. Removing bare `coal`/`energy` would gut the Energy topic — not worth it for two incidental tags.

### Verification
- `npx tsc --noEmit` clean (confirms every `Record<KYTopicTag>` map got the new key). `ReadLints` clean.
- **Backfill:** `npm run topics:reclassify` — **22,547 scanned, 2,227 changed** (Transportation un-conflation + precision), then a follow-up **15 changed** for the ADDs plural. Direct read-back confirmed the 9 flagged bills: `HB354 → [Transportation]`, `SB14 → [Education,Transportation]`, `HB209 → [Veterans Affairs,Transportation]`, `SB142 → [Transportation,Environment]`, `SB9 → [Healthcare]`, `HB284 → null`, `HB431 → [Local Government,Budget]` (7 resolved); `SB146`/`SCR64` as noted above.
- **Re-running the audit on the same two seeds samples *different* bills now** — changing `topics` on ~2.2k rows shifts the `topics is not null` population that `sampleTable` draws from, so exact reproduction isn't possible. `SB9` still surfaces but its complaint flipped from "`Labor` is clearly irrelevant" (fixed) to wanting `Abortion`/`Child Protection` topics that don't exist (non-actionable, Natural-Resources class).
- **Next-pass candidates surfaced by the rotated sample (NOT fixed here — out of scope for the referenced warnings):** `HB162` `Voting Rights` on a corporate-income-tax bill; `HB411` `Environment` on firearms disposal; `HB104` `Education` on art-therapist licensure; `HB167` `Voting Rights`/`Public Safety` on a pension bill. The persistent `Fiscal Note` glossary flag (KRS 6.350 makes it not solely request-driven) is a *glossary* item — pass #2 verified other entries but not this one; worth a dedicated glossary check.
- **Trade-off / limits:** keyword precision, not perfection (unchanged stance). `Transportation` is the first taxonomy expansion; future single-bill "missing topic X" flags still default to **decline** unless they show a comparable coherent cluster.

---

## 2026-06-04 — Accuracy-audit: reproducible sampling + keyword-precision floor + Fiscal Note glossary

**Follow-up to pass #3 the same day.** Two problems: (1) re-running the audit with the same `--seed` returned *different* bills after the pass-#3 backfill, making fixes hard to confirm; (2) the rotated re-run surfaced a fresh batch of `topics` warnings to triage.

### Sampling is now stable across data changes (`sampling.ts` rewrite)
- **Root cause:** the old `sampleTable` chose `offset = rng(seed) * (total - poolSize)` over the **filtered row COUNT**, then read a contiguous `range()` window. Any change to the filtered population — a `topics` backfill, a sync adding/removing rows, even a different `topics is not null` count — shifts `offset` and returns a completely different window for the *same* seed. That's why pass #3's reclassify (which changed ~2.2k `topics` values, moving the `topics is not null` count) made the same two seeds sample different bills.
- **Fix — bottom-k hash sampling.** Select rows by a deterministic `hashKey(seed, stableKey)` (FNV-1a + avalanche over the row's `id`) and keep the lowest-`limit` hashes. A row's membership depends only on its own key + the seed, **not** on how many other rows exist, so the same seed re-selects the same rows even after the table mutates — a previously-sampled row only drops out if *it* stops matching the filter, and the next-lowest hash takes its place. Mechanics: page the filtered table for just the key column (cheap, indexed), hash + bottom-k in process, then one `IN (...)` fetch for the full rows. Costs more requests than the old one-COUNT-one-window approach (a paged id scan), negligible for a weekly job and dwarfed by the LegiScan/Open States fetches.
- **Verified:** same seed → identical sample (`identical(A,B)=true`); different seed → different sample (rotation preserved, `differs(A,C)=true`); and the n=8 sample is exactly the lowest-hash subset of the n=16 sample (`A ⊆ sample(n=16)=true`), proving selection is population-size-independent. `npx tsc` + lint clean.
- **One-time effect:** because the seed→rows *mapping* changed with the algorithm, old seeds no longer reproduce their pre-rewrite bills. Reproducibility holds **going forward**; the glossary sampler (in-memory `seededShuffle` over `governmentTooltips`) was already stable and is unchanged.

### Topic warnings from the rotated re-run — the keyword-precision FLOOR (no classifier change)
Traced every newly-flagged bill to its keyword. Unlike pass #3's clean false positives (noise keywords like `construction`), these are **core-signal incidental matches** that keyword precision cannot fix without gutting the topic:
- **`election` / `elections` / `ballot` in the legal/financial sense** (a formal *choice*, not a vote): `HB162/2012` "files an **election** for a consolidated income tax return" → Voting Rights; `HB167/2017` retirement-system board "elections"/proxy "ballot" → Voting Rights; plus retirement-benefit and employment "elections" across the corpus.
- **Quantified before deciding:** **188 of 1,102** Voting-Rights-tagged bills (17%) are tagged *only* via singular `election` with no strong voting keyword. But a sample shows they split ~50/50 between **genuine** (campaign finance, "election of Justices of the Supreme Court", Registry of Election Finance confirmations) and **false** (retirement/employment/tax "election"). Removing singular `election` would drop roughly as many real voting bills as false ones — **not a net win**, which is exactly why pass #2 kept it. **Decision: leave `election`.**
- **Agency-name incidentals:** `HB411/2018` "destruction of firearms" → Environment via "**wildlife**" (Fish & Wildlife is the agency holding confiscated guns); same class as pass #3's "Energy and Environment Cabinet." `HB104/2013` art-therapy licensure → Education via "education" (continuing-ed boilerplate). Core signals, left as-is.
- **Conclusion:** the cleanly keyword-fixable false positives are now exhausted; what remains is the **semantic long tail** (distinguishing a vote from a legal "election", or a subject from an administering agency's name), which the scope boundary (§ 2026-06-03) delegates to the advisory LLM lane. This matches pass #2's finding of ~0 warnings at scale once noise keywords were removed. **Declined** adding `criminal history` → Criminal Justice for the `HB267` "ban-the-box-in-admissions" miss: it would mis-tag employment/childcare background-check bills (e.g. `HB267/2020`), a net negative.

### Fiscal Note glossary — corrected, and the LLM's flag was itself partly wrong
- The recurring LLM warning claimed "**KRS 6.350** requires a fiscal note on any bill with fiscal impact; it is not solely request-driven." **Cross-check against primary sources: KRS 6.350 is about actuarial analysis for public retirement systems, not fiscal notes** — the model cited the wrong statute (the same class of LLM error that produced the bad veto/emergency thresholds in § 2026-06-03). Kentucky's fiscal-note process is governed by **Legislative Rule 52** + KRS 6.950–6.970/13A, and Rule 52 says a "sponsor, committee or its chair, or a chamber **may request** a fiscal analysis" — so the existing "on request" framing was **accurate**, not the error the LLM asserted. (Correcting the note in pass #3's entry above, which repeated the model's wrong `KRS 6.350` citation.)
- **Real, smaller improvement made:** broadened "cost (or save) **the state**" → "**state or local government**" (KRS 6.965 covers local-mandate notes) and added that a fiscal statement "examining any provision with fiscal effects is typically attached to the measure before the chamber takes final action" (Rule 52), so readers don't think it's purely discretionary. Kept the accurate request-based language and the LRC nonpartisan-staff attribution; did **not** adopt the incorrect statutory-mandate framing.
- **Other persistent glossary flags left as-is** (verified borderline-phrasing, not errors, consistent with pass #2): `Passed a Chamber` ("committee review" in the second chamber), `Referred to Committee` ("will hold hearings"), `Engrossed` (clean-copy vs transmittal), `Kentucky Senate` (staggered 4-year terms). These read as the model preferring different emphasis, not factual corrections.

---

## 2026-06-04 — Status mapper: preserve furthest-progress milestone

**Closes the TASKS.md backlog item "Status mapper doesn't preserve furthest progress."** ~4% of sampled bills were affected (first surfaced on HB21 in the bills accuracy checker).

- **Root cause:** `mapLegiScanBillStatus` keyed off latest action text before checking the LegiScan status code. For post-session bills referred to interim committees the action reads "To: Interim Joint Committee on…", which contains the word "committee" and triggered the `'In Committee'` branch — even when the LegiScan status code was `2` (Engrossed), meaning the bill had already passed at least one chamber.
- **Fix:** Added a `CHAMBER_PASSED_CODES = {2, 3, 4}` guard in `src/lib/map-legiscan-bill-status.ts`. When the status code is Engrossed (2), Enrolled (3), or Passed (4), an action text containing "committee" or "referred to" no longer overrides it; the code's milestone label is returned instead. Terminal-state checks (veto, signing, chaptered, failure) still take full precedence. **Example:** HB21, statusCode=2 + action="To: Interim Joint Committee on Health and Welfare" → now correctly returns `Engrossed` instead of `In Committee`.
- **Effect on audit:** The `expectedStatus` computed in `checkers/bills.ts` uses the same mapper, so the false-positive `fail` findings for post-session bills disappear immediately. Rows still stored with the incorrect status in the DB will be corrected on the next scheduled sync run (bills workflow runs every 6 hours).
- **Effect on sync:** Future syncs write the correct milestone status; no separate backfill script needed.
- **No effect on terminal states:** Codes 5 (Vetoed), 6 (Failed), 7 (Veto Override), 8 (Chaptered) are all already caught by explicit action-text guards earlier in the function (veto/signed/failed/chaptered checks) and are unaffected by this change.

---

## 2026-06-07 — Accuracy-audit triage pass #4 (status mapper + bill data + glossary)

Resolved all hard failures and addressed glossary/topic advisory warnings from the seed-1189243192 audit report (`fail=2, warn=8`). Final state after this pass: **fail=0, warn=6** (all remaining warns are LLM advisory; no deterministic failures). Builds on the 2026-06-04 status-mapper guard (`CHAMBER_PASSED_CODES`) and Transportation/Labor precision from main.

### Status mapper — KY `(H)`/`(S)` committee-referral pattern (`src/lib/map-legiscan-bill-status.ts`)

The 2026-06-04 guard preserved Engrossed/Enrolled/Passed when action text contains "committee", but KY LRC action strings like `"to State & Local Government (S)"` or `"to Judiciary (H)"` never contain that word. Added `/\([hs]\)\s*$/` to `isCommitteeReferral` and wired it into the existing `CHAMBER_PASSED_CODES` check. Fixes SB17 (`Introduced` when last_action was a KY-style referral) and SB100 (`Engrossed` stored as `In Committee`).

### `sync:ky:bills:status` pipeline — two fixes (`src/lib/ky-sync-pipeline.ts`)

- **`getMasterListRaw` carries no title/status.** The status-sync path used `raw.title` and hit the DB NOT-NULL constraint, silently writing 0 rows. Root cause: `--skip-bill-sponsor-details` skipped the entire `getBillDetail` call. **Fix:** always fetch detail; `skipBillSponsorDetails` only controls whether sponsor data is written.
- **Last-action alignment.** Sync now derives `last_action` from `history[]` the same way the accuracy checker does.

- **Backfill:** `npm run sync:ky:bills:status` — **207/207 upserted** (was 0/207).

### Data correction — 8,288 stale `Introduced` rows (`scripts/remap-committee-referral-statuses.ts`)

One-time script for bills stored before the `(H)`/`(S)` mapper fix. Post-correction audit: **bills 40/40 ok, 0 fail**.

### Glossary corrections (`src/lib/tooltipContent.ts`)

- **`fiscal_note`:** Branch initially adopted GOPM/KRS 6.350 per an LLM audit flag; **retained main's § 2026-06-04 definition** (LRC staff + Legislative Rule 52) after primary-source cross-check showed KRS 6.350 is retirement actuarial, not fiscal notes.
- **`lrc`, `tabled`, `majority_leader`, `passed`, `timeline_passed`, `referred`, `committee_hearing`:** Wording tightened per audit flags (see branch diff).

### Topic classifier additions (`src/lib/ky-topic-classifier.ts`)

- **Labor:** merged main's `worker` → `workers` plural fix with branch's removal of bare `employment` (replaced with `employer`, `labor law`, `employment law`).
- **`law enforcement` added to Public Safety; `diabetes` added to Healthcare.**
- **Backfill:** `npm run topics:reclassify` — **22,547 scanned, 344 changed (14 tags removed, 280 added).**

---

## 2026-06-07 — Cron schedule audit + heartbeat retired (canvas knockout)

Closure pass on Slack-canvas review-queue rows #12, #13, #18, #21 (see prior session). Scheduled-job landscape was last documented piecemeal across workflow YAMLs and TASKS.md; consolidating here so future agents (and onboarding reviewers) can confirm coverage without re-deriving it.

### Cron landscape — current state

**Vercel Cron (`vercel.json`):**

| Path | Schedule (UTC) |
|---|---|
| `/api/sync?source=bills&useChangeHash=true&skipBillSponsorDetails=true&historicSessions=1` | `0 5 * * *` |
| `/api/sync?source=legislators` | `0 6 * * *` |
| `/api/sync?source=votes&limit=5` | `15 6 * * *` |
| `/api/cron/notify` | `0 11 * * *` |
| `/api/sync?source=lrc-committee-materials` | `30 13 * * *` |
| `/api/cron/health-check` | `0 14 * * *` |

**GitHub Actions (`.github/workflows/`):**

| Workflow | Schedule (UTC) | Command |
|---|---|---|
| `sync-ky-bills-status.yml` | `0 */6 * * *` | `npm run sync:ky:bills:status` (hash-gated; `getBill` only for changed/new bills) |
| `sync-lrc-calendar.yml` (live) | `0 12 * * *` + `0 18 * * *` | `npm run sync:ky:lrc-calendar` |
| `sync-lrc-calendar.yml` (backfill) | `0 6 * * 0` | `npm run backfill:lrc:calendar` + refresh |
| `legislator-links-weekly.yml` | `0 12 * * 1` | `sync:ky:legislators` → `verify:legislator-links` → `audit:legiscan-subjects` |
| `accuracy-audit.yml` | `0 7 * * 0` | `npm run audit:accuracy` |

### Removed as redundant

`.github/workflows/verify-outbound-links.yml` (Mondays 06:00 UTC) — deleted. `legislator-links-weekly.yml` already runs `verify:legislator-links --json` as a job step and is the source of truth for the weekly link-health report. The standalone workflow was a dry-run wrapper with no Slack notification.

### Intentionally distinct (not duplicates)

- **Vercel `/api/sync?source=lrc-committee-materials` (13:30 daily) vs. GH Actions `sync-lrc-calendar.yml` (12:00 + 18:00 daily).** Different LRC surfaces — `lrc-committee-materials` scrapes per-committee document pages into `ky_committee_materials`; `lrc-calendar` parses the LRC weekly-calendar HTML into `ky_committee_meetings` + agenda. Same data source (`apps.legislature.ky.gov`), different endpoints, different tables.
- **Vercel bills sync (05:00 daily, hash-gated with `--skip-bill-sponsor-details`) vs. GH Actions `sync-ky-bills-status.yml` (every 6h, same flags).** Both use `syncKyBillsByHash`: idle runs cost ~2 LegiScan calls; `getBill` runs only for changed/new bills (sponsor JSON omitted when `skipBillSponsorDetails`). The every-6h cadence is conservative intra-day refresh; Vercel's 05:00 run is the guaranteed daily baseline.
- **Vercel does NOT run `lrc-calendar`** (retired in Wave 4a; GH Actions is sole scheduler). Stale comment in `sync-lrc-calendar.yml` header reflecting the old setup was corrected in this pass.

### Heartbeat mode retired — `SLACK_SYNC_CLI_DIGEST_ALWAYS`

The temporary flag that made CLI sync jobs post a Slack digest on *every* run (regardless of activity) was removed from `sync-ky-bills-status.yml`, `legislator-links-weekly.yml`, and both `sync-lrc-calendar.yml` legs. **Trigger for retirement:** 2+ weeks of clean sync digests since the heartbeat went in (Katie's read 2026-06-07). Workflows now Slack on change/error only — the default behavior in `src/lib/slack-webhook.ts`. The flag itself remains supported in code; re-enable on a per-workflow basis if validation noise returns.

### 2026 RS milestones pending LRC publication

`KY_SESSIONS[0].milestones` (`src/lib/ky-sessions.ts`) is intentionally left undefined for the 2026 Regular Session pending LRC publication of the session-calendar joint resolution that sets veto-recess (start/end) and sine die dates. **Banner behavior under the gap:** `getSessionBannerModel()` falls back to the session date range when `milestones` is undefined — verified during the 2026-06-01 session milestones + interim banner work (§ 2026-06-01). **Refresh trigger:** when LRC publishes the 2026 RS joint resolution, populate `vetoRecessStart`, `vetoRecessEnd`, and `sineDie` on the 2026 RS record. Replaced a code-level `TODO` with a one-line pointer to this entry so future agents landing in `ky-sessions.ts` aren't tempted to fabricate dates.

### Status mapper — already closed, re-verified

Canvas row #18 ("Status mapper doesn't preserve furthest progress") was already resolved in PR #74 — see § 2026-06-04 — Status mapper: preserve furthest-progress milestone. Re-verified during this knockout pass: `CHAMBER_PASSED_CODES = {2, 3, 4}` guard is live at `src/lib/map-legiscan-bill-status.ts:95-98`; TASKS.md backlog entry updated to mark resolved. DB-level spot-check on HB21 deferred to Katie's next Supabase-connected session as belt-and-suspenders confirmation.

---

## 2026-06-08 — /api/intelligence LLM call security

**PR #80.** Two hardening changes to `src/app/api/intelligence/route.ts` and `src/lib/rate-limit.ts`.

### `getClientIp` — fix XFF spoofability (`src/lib/rate-limit.ts`)

**Bug:** the previous implementation took `x-forwarded-for.split(',')[0]` as the rate-limit key. Vercel's edge *appends* the real client IP to the XFF chain, so `[0]` is the first client-supplied value — a client can send `x-forwarded-for: 1.2.3.4` and the rate limiter keys on `1.2.3.4` regardless of the actual connecting IP, making per-IP limits trivially bypassable.

**Fix:** reversed priority.
1. `x-real-ip` — Vercel's edge sets this to the actual connecting IP; clients cannot forge it because the edge overwrites any incoming value.
2. Last entry of `x-forwarded-for` — Vercel appends the real client IP at the *end* of the chain. The last entry is trustworthy; first entries may be client-controlled.

**Effect:** the Supabase-backed token-bucket rate limiter now keys on the true connecting IP, restoring the 30 req/min-per-IP guarantee documented in the rate-limit module.

### Global daily LLM ceiling (`src/app/api/intelligence/route.ts`)

**Problem:** per-IP rate limiting alone does not bound Anthropic spend when many distinct IPs (or VPN rotators) hit the route simultaneously. `generateWhyItMatters` calls `claude-sonnet-4-6` with `max_tokens: 150`; up to 3 calls per request; no cross-IP ceiling existed.

**Decision: rolling 24h cap via the existing token-bucket rate limiter with a shared key.**
- Key: `anthropic:llm:daily` (single global bucket, not per-IP)
- Capacity: **200 individual LLM calls** per rolling 24h window
- Refill: `200 / 86400 ≈ 0.0023 tokens/sec` (one full refill every 24h)
- Worst-case cost at current Sonnet pricing (~$0.003/call): **~$0.60/day**

**Failure mode:** graceful degradation — when the ceiling is hit, items are returned without `whyItMatters` rather than a 429. The ceiling is only relevant when the in-memory cache is cold across many serverless instances simultaneously; under normal load the 15-min TTL cache absorbs most requests.

**Signed-in-only considered and declined for now.** Making the route require `Authorization: Bearer` (via `getAuthedUser`) would eliminate all anonymous abuse, but the intelligence panel is intended as a publicly accessible civic surface. The fixed IP key + global ceiling makes the exposure bounded and the cost manageable. **Revisit if:** Anthropic spend regularly approaches the daily ceiling, or if a product decision gates the intelligence panel behind login (at which point switching to `getAuthedUser` is a small diff).

**Revisit if:** the 200-call daily ceiling proves too tight under normal traffic. The `ky_sync_state` counter table already tracks `anthropic_cache_hits` and `anthropic_cache_misses` — query those by day to establish a baseline before adjusting capacity.

---

## 2026-06-08 — Sentry DSN: no hardcoded fallback

**PR #79.** Removed the DSN literal fallback from `sentry.server.config.ts` and `sentry.edge.config.ts`.

- **Problem:** a committed DSN is trivially available to anyone with repo access and allows fake event injection into the Sentry project.
- **Fix:** read `SENTRY_DSN || NEXT_PUBLIC_SENTRY_DSN` from env only; `enabled: !!dsn && (production || reportInDev)` so Sentry stays silent when neither var is set. Same pattern on server and edge configs.
- **Ops:** ensure `SENTRY_DSN` (or `NEXT_PUBLIC_SENTRY_DSN`) remains set in Vercel production — removing the fallback does not remove the need for the env var in deployed environments.

---

## 2026-06-08 — PostHog named user-action events

**PR #78.** Adds stable, client-side event names in `src/lib/analytics.ts` so PostHog Action subscriptions (Slack notifications, daily digests) survive UI refactors.

- **Events shipped:** `user_registered` (register page, both immediate-session and pending-verification paths, tagged `needs_verification`); `bill_followed` / `bill_unfollowed` (`FollowBillButton`, fired only after the API call succeeds — failures revert state without emit); `preferences_saved` (`ProfileNotificationsSection` digest + event-types save); `account_deleted` (profile delete flow, fired before `signOut` so the identity is still attached).
- **Intentionally not instrumented:** per-topic toggle clicks on `/profile` — would spam one event per checkbox click; the explicit save path for frequency/event-types is the stable signal.
- **Client-only:** all via `posthog-js`; no `posthog-node` dependency added.
- **Revisit if:** product wants committee-follow or saved-search events for the same Action-subscription use case — follow the same "named helper, fire after API success" pattern.

---

## 2026-06-08 — LLM glossary review: extend coverage to voteCountTooltips

**Change:** `src/lib/accuracy-audit/checkers/llm-review.ts` `reviewGlossary` previously built its entry pool from `governmentTooltips` only. Extended to merge both `governmentTooltips` (76 entries) and `voteCountTooltips` (25 entries — 4 vote-count labels + 21 `topic_*` subject descriptions) into a single 101-entry pool that is seed-shuffled and sampled each run.

**Why it was a gap:** `voteCountTooltips` is the same shape (`{title, content}`) as `governmentTooltips` and is user-visible on the vote-tally UI and the bill-detail topic chips, yet was silently excluded from all LLM review passes.

**First-run findings (seed=3525153774):** two `voteCountTooltips` entries flagged as `warn` — confirm against primary sources before editing:
- `yea`: "majority of members present" is accurate for some procedural votes but misleading for final passage, which Ky. Const. § 46 requires a majority of all members elected (51 House / 20 Senate).
- `nv`: conflates "present but not voting" and "absent" as a single status (KY roll calls record them separately); the claim they "don't count toward the total needed to pass" is misleading because passage requires a majority of members elected, making NV/absent votes effectively count against. See TASKS.md backlog § "NEEDS TRIAGE 2026-06-08."

**Scope of advisory cap:** LLM findings remain capped at `warn` and never hard-fail the run per the 2026-06-03 decision. Verify `yea`/`nv` wording against Ky. Const. §§ 46, 88 before making edits.

**Tooltip content fixes applied (2026-06-08):** six entries in `src/lib/tooltipContent.ts` were corrected based on the first-run findings and two additional seeds (3525153774, 42):

| Entry | Change |
|---|---|
| `yea` | "majority of members present" → "majority of all members elected (51/20), some procedural votes need only members present" (Ky. Const. § 46) |
| `nv` | Removed conflation with absent; "same effect as No" → "one fewer Yes available" |
| `absent` | Same framing fix as `nv` |
| `concurrence` | Fixed logic inversion (conference follows refusal, not agreement); added "bill may die" as an outcome |
| `floorVote` | "all 100 members / all 38 Senators" → "members present" |
| `lrc` | "a committee of legislative leaders" → "co-chaired by the Speaker of the House and the Senate President, along with other designated legislative leaders" |

**Residual LLM warnings after iteration:** `Concurrence` and `Introduced` continued to generate warns on seed=3525153774 after multiple rounds. The `Introduced` warn cited a phrase ("will be assigned") that does not appear in the entry — confirmed hallucination. The `Concurrence` warn became self-contradictory across iterations (the model alternately criticized and endorsed the same phrasing). Both are dismissed as advisory noise consistent with the 2026-06-03 decision; the remaining topic-classifier warns (HB426, HB546, HB739) are data issues for the classifier, not content edits.

**Full 8-seed triage pass (2026-06-08):** Extended the session to resolve all remaining glossary issues across seeds 1/2/3/7/11/99/1234/5678. Additional entries corrected beyond the first-run findings above:

| Entry | Change |
|---|---|
| `hjr` / `sjr` | Ky. Const. § 56: substantive JRs must go to Governor; purely procedural ones (adjournment) don't — blanket "no Governor signature" was wrong |
| `first_reading` | Removed "rapid succession" claim — Ky. Const. § 46 three-separate-days is a genuine constraint, not routinely collapsed |
| `third_reading` | "moves to the other chamber" is only true in first chamber; second-chamber passage goes to enrollment and Governor |
| `sponsor` | "wrote" → "introduced"; LRC staff typically draft the text |
| `cosponsor` | "wrote" → "introduced" |
| `speaker` / `senate_president` | "elected leader" → "chosen by [chamber] members from among themselves" (internal election, not public) |
| `unanimous_consent` | Removed "extending debate time" example — that's a US Congress / filibuster concept with no KY equivalent |
| `fiscal_note` | Removed attribution to specific preparer (LLM gave 3 contradictory answers across seeds); cite KRS 6.955–6.960; "when prepared" not "typically attached" |
| `chaptered` | "Kentucky Revised Statutes" → "Acts of the Kentucky General Assembly"; LRC codifies into KRS as a separate step |
| `signed_by_governor` | Same Acts-of-GA fix |
| `enacted` | Added veto override as a third enactment path (Governor's signature / inaction / override) |
| `floor_amendment` | "Any member" → "Any member of that chamber" |
| `motion_to_reconsider` | "winning side" → "prevailing side under chamber rules" (softened; KY-specific rule uncertain) |
| `timeline_introduced` | "will be assigned" → "typically referred … by the Speaker or Senate President" (leadership controls referral) |
| `engrossed` | Reframed as clean-copy preparation rather than post-passage confirmation |
| `ballotpedia` | Removed "nonprofit" (nonprofit status disputed) and "voting record" (KY leg profiles unreliable for that) |
| `concurrence` | Added recede option and "bill may die" as alternatives to conference committee |

**Deliberate non-fixes after iteration:**
- `chaptered` 90-day effective date: LLM gave contradictory verdicts across seeds; Ky. Const. § 55 is explicit that 90 days runs from adjournment; current text is correct.
- `fiscal_note` preparer: three distinct, contradictory attributions across seeds — stripped to statute citation only rather than risk introducing a new error.
- `topic_education` SEEK→SFCC: seed=99 hallucinated this claim twice (SFCC is the *School Facilities Construction Commission*, not a per-pupil formula); SEEK reverted.
- `passed`, `concurrence`, `senate_president`, `alcohol_cannabis`: remaining warns are marginal omissions or editorial hedging, not factual errors; all capped at advisory per the 2026-06-03 decision.

---

## 2026-06-09 — 2026 RS milestones populated

Closed the `TODO` in `src/lib/ky-sessions.ts` (§ 2026-06-07). Dates sourced from the LRC published session calendar (`legislature.ky.gov/Documents/RS_Calendar.pdf`, updated 2026-04-13) and confirmed by NKYTribune coverage of the session close.

- **vetoRecessStart:** 2026-04-02 — chambers adjourned after concurrence days (Mar 31–Apr 1); governor's 10-day window began.
- **vetoRecessEnd:** 2026-04-14 — chambers reconvened to consider veto overrides.
- **sineDie:** 2026-04-15 — final adjournment (already matched `session.end`; confirmed by LRC legislative-record fixture).

**Banner effect:** `getSessionPhase()` now correctly returns `'interim'` for today (we are past `session.end`), but `veto_recess` and `final_days` will render correctly if `asOf` is backfilled to an April date for QA or screenshot purposes. The `SessionBannerServer` copy for each phase was already implemented in the 2026-06-01 milestones work.

---

## 2026-06-08 — /committees data quality: empty-state copy, PDF staleness note, browse dedup

**Context:** `/design-critique` audit of `kyvky.com/committees` found three data-quality issues affecting user trust: (1) 27 of 69 committee cards (39%) showed no member data with operator-facing error text; (2) PDF document links from the LRC `CommitteeDocuments` server silently 404 in a new tab with a raw IIS error page; (3) some committee entries were duplicated — a seeded placeholder (migration 027 / calendar sync) and a synced entry with the same name but different `lrc_rsn` or `committee_type`, causing both to appear in the browse grid.

### Empty state copy (`src/components/committees/CommitteeMembersSection.tsx`)
Replaced the operator-facing strings ("No members synced yet. Check the LRC committee profile or run a calendar sync after the next listed meeting." / "…Run a legislative calendar sync…") with user-facing copy that links to the LRC committee profile when one is available, and a plain honest fallback otherwise. **Why:** the old strings exposed internal tooling vocabulary to constituents. **New pattern:** "Member roster not yet available. [View the official LRC committee profile →] for the current membership."

### PDF staleness note (`src/components/committees/CommitteeMaterialsSection.tsx`)
Extended the existing section description to include: "Links may become unavailable after a session ends — if a document can't be opened, try the [LRC committee profile ↗]." When no profile URL is available the fallback drops the link. **Why:** LRC rotates `CommitteeDocuments/{rsn}` file paths after each session; the quick-facts "8 meeting materials" count is accurate for what's stored but doesn't reflect whether those URLs are still live. **Trade-off:** a visible staleness note is less precise than per-link status badges; per-link status would require adding a `link_status` column to `ky_committee_materials` and a background probe job — deferred (see backlog below).

### Browse dedup (`src/lib/ky-committees-browse-enriched.ts`)
Added a post-fetch name-based dedup in `fetchKyCommitteesBrowseEnriched`: after building member counts, group by lowercase-trimmed name; if multiple entries share the same name and at least one has members, suppress all zero-member duplicates. **Why:** migration 027 seeds IJ/S-type committees that sometimes already exist under a different `lrc_rsn` or `committee_type` from the live calendar sync — the unique constraint is `(lrc_rsn, committee_type)` so both rows survive and both appear on the browse page. **Trade-off:** if the calendar-synced version is itself empty (no meetings yet), both would still show; the filter only suppresses the zero-member entry when a populated twin exists. This handles the Budget Review Subcommittee duplicate pairs and the `Administrative Regulation(s) Review Subcommittee` near-duplicates. **Intentionally not deduped at DB level:** the seeded rows carry correct `profile_url` values and are used by the detail page; deleting them would break follows + materials links. The JS-layer filter is the correct surface.

### Syncs run (2026-06-08)
- `npm run sync:ky:lrc-calendar` — refreshed 6 meetings, 21 agenda lines; `member_refs` updated for this week's calendar window.
- `npm run sync:ky:lrc-committee-materials` — 20 new docs inserted, 1,050 updated across 39 committees; 30 committees have no materials page on LRC yet (interim period committees awaiting first meeting).
- `npm run backfill:lrc:calendar` — Wayback backfill run to pull historical `member_refs` from prior calendar snapshots.

### Deferred / backlog items (not built this session)
- **Per-link 404 detection:** add `link_status TEXT` + `link_checked_at TIMESTAMPTZ` columns to `ky_committee_materials`; extend the weekly accuracy-audit `ACCURACY_PROBE_LINKS` pass to HEAD-check stored material URLs and mark broken ones. Render broken links with an `(unavailable)` suffix on the detail page. LRC rotates paths after each session, so this will keep recurring.
- **DB-level committee dedup:** identify the specific RSN pairs where migration 027 and the live sync created duplicate rows (same real-world committee, different `lrc_rsn` or `committee_type`); write a one-time migration to reassign child rows (`ky_committee_meetings`, `ky_committee_follows`, `ky_committee_materials`) from the lower-quality row to the higher-quality one and delete the stub. The JS-layer dedup is the interim solution.
- **Interim member roster population:** all 16 `interim-joint-*` committees still show 0 members because `member_refs` on meeting rows is empty — the LRC calendar HTML lists committees and times but not rosters. The authoritative source is the LRC committee-detail page per committee. A one-time scrape of each `profile_url` to parse the member table (Chair + Members list) and write to `member_refs` on the next scheduled meeting would close this gap. See `legislature.ky.gov/Committees/committee-detail?CommitteeRSN={rsn}&CommitteeType=IJ`.
- **"Meeting materials" count caveat:** the quick-facts panel shows "N meeting materials" counted from the DB, not from live LRC. Consider adding "(some may be unavailable)" or capping the display to reflect only recently-probed-live docs once the per-link probe job ships.

---

## 2026-06-09 — Health check: GitHub Actions + Vercel

Scheduled health check across connected monitoring services.

### GitHub Actions — all workflows nominal

| Workflow | Most recent run | Result |
|---|---|---|
| Sync KY bill statuses | `27198206457` 2026-06-09T09:52Z | ✅ success |
| Sync LRC committee calendar | `27164586628` 2026-06-08T20:21Z | ✅ success |
| Legislator links — weekly sync + verify | `27149284051` 2026-06-08T15:43Z | ✅ success |
| Content accuracy audit | `27089178669` 2026-06-07T09:53Z | ✅ success |
| Slack — commits & PRs | `27182555863` 2026-06-09T03:47Z | ✅ success |

**30/30 runs in the current page** returned `success` — no active failures.

### Resolved: 2026-06-01 legislator-links failure

Root cause confirmed from job logs: `ReferenceError: parseArgs is not defined` at `scripts/verify-legislator-external-links.ts:268` (step "Verify outbound links"). The sync step (141 legislators) and LegiScan-subjects audit both succeeded; only the link-verify script crashed. The 2026-06-08 run passed cleanly, confirming the fix was already in place. No data loss — the legislator sync step completed before the crash, and the artifact upload captured the partial JSON report.

### Fixed: Node.js 20 → 24 migration in `legislator-links-weekly.yml`

Three of four scheduled workflows (`accuracy-audit.yml`, `sync-ky-bills-status.yml`, `sync-lrc-calendar.yml`) had already migrated to `node-version: '24'` + `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`. `legislator-links-weekly.yml` was the outlier — still on Node 20. **GitHub Actions forces Node 24 by default from 2026-06-16** (7 days from this check). Fixed in this session: bumped to `node-version: '24'` and added the `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: 'true'` env var to match the other workflows.

**Secondary warning from June 1 logs:** `@react-email/*` packages (all sub-packages) show `npm warn deprecated` — "Package no longer supported." These are the React Email v1 sub-packages superseded by the monorepo `react-email` v2 package. Non-urgent (still functional), but should be addressed when email templates are next touched. Also: 1 moderate-severity `npm audit` finding — unknown severity/package from the log excerpt alone; check `npm audit` output when convenient.

### Vercel — limited visibility

The Vercel MCP `list_projects` call returned an empty array for team `team_gmP71OjnH1pcPVIH72YLmfMX` ("Katie's projects"). This is likely an API token scope issue rather than a real outage — PRs #78–#80 (2026-06-08) all reflect successful Vercel deployments via the normal push-to-main flow. Runtime logs and cron execution history are therefore not included in this check. **Action:** if Vercel monitoring is desired in future health checks, confirm the MCP token has `project:read` scope and that the project is linked to this team in the Vercel dashboard.

---

## 2026-06-09 — Committee membership reconciliation + recommittal mapper bug (PR #84)

Closes the long-deferred accuracy-audit backlog item "Committee membership deep reconciliation vs. Open States roles (normalization-heavy, false-positive-prone)." Addresses three classes of discrepancy plus a related mapper bug discovered during analysis.

### Recommittal mapper bug (`src/lib/map-legiscan-bill-status.ts`)

**Root cause:** the `CHAMBER_PASSED_CODES` guard added in PR #74 (2026-06-04) prevented bills with status code 2/3/4 from being regressed to `In Committee` when the latest action looked like a committee referral. This was correct for forward second-chamber referrals (e.g. `"to Senate Agriculture (S)"` after House engrossment), but it incorrectly blocked recommittals — e.g. `"recommitted to House Appropriations & Revenue (H)"`. A recommittal is a genuine backward step; the bill is back in the originating chamber's committee.

**Fix:** added `isRecommittal = /recommit/i.test(action)` and changed the guard to `CHAMBER_PASSED_CODES.has(statusCode) && isCommitteeReferral && !isRecommittal`. The intent of the original guard is preserved for forward referrals; only recommittals bypass it.

**One-time data correction:** `scripts/remap-recommittal-statuses.ts` (`npm run remap:recommittal-statuses`) — fetches bills in `Engrossed`/`Enrolled`/`Passed` whose `last_action` contains "recommit", re-applies the fixed mapper, and updates to `In Committee`. Idempotent. The existing `scripts/remap-committee-referral-statuses.ts` (PR #74) was the pattern.

### Slug normalization — canonical slugs at sync time (`src/lib/ky-sync-pipeline.ts`, `src/lib/ky-committee-utils.ts`)

**Problem:** `syncKyLegislators` wrote raw Open States-normalized slugs to `committee_memberships` (e.g. `"committee-on-transportation-h"` from a Popolo org name like `"Committee on Transportation (H)"`). `ky_committees.slug` for the same committee is `"transportation-h"` (from the LRC calendar sync). The gap was bridged by `committeeMembershipSlugMatchesFilter()` using fragile substring matching — works for most cases but fails when org names diverge in prepositions or word order.

**Fix:** `syncKyLegislators` now pre-fetches `ky_committees` (one query, ~45 rows) at the start of each sync and builds a canonical `committeeSlugFromName(name) → slug` map. New function `extractCanonicalCommitteeSlugsFromOpenStatesPerson(leg, canonicalMap)` in `ky-committee-utils.ts` resolves each OS Popolo org name to a canonical `ky_committees.slug` — trying exact match, then stripping the Popolo `"committee-on-"` prefix, then substring scan against canonical keys. Org names that don't resolve to any known committee are silently dropped. **This is the false-positive guard** that was the primary reason for deferral: transient bodies, subcommittees, and non-GA commissions only survive if they are already seeded in `ky_committees`.

**Fallback:** if `ky_committees` is empty (fresh DB before migrations 024/027), the old extractor is used — prevents wiping all memberships on a first-run environment.

**TODO left in code:** `committeeMembershipSlugMatchesFilter` can be simplified to exact equality once all DB rows carry canonical slugs (after the first full sync post-PR-merge). The function is kept as-is for backward compat with any rows that haven't been re-synced; the comment marks it for simplification.

### Member profile priority inversion (`src/lib/ky-member-committees.ts`)

**Problem:** `fetchCommitteeAssignmentsForLegislator` tried Open States slugs first and fell back to LRC calendar. But OS slugs produce `roleLabel: null` — no Chair/Vice Chair labels. LRC calendar produces real role labels from the `member_refs` display name format (`"Sen. Jane Doe (Chair)"`). So the member profile showed committees without role labels whenever OS had data, and showed them correctly only when OS was empty (which is most of the time currently, since `roles` may not be returned by the OS v3 bulk endpoint).

**Fix:** inverted to LRC-calendar-primary / OS-fallback. This matches what `buildCommitteeMemberDisplay` in `ky-committee-members.ts` already does for the committee detail page (unchanged). Role labels now appear on member profiles when LRC calendar data is available. OS path activates only when a legislator has not appeared in any meeting's `member_refs` — e.g. newly assigned before their first meeting of the session.

### Audit coverage (`src/lib/accuracy-audit/checkers/legislators.ts`)

Added `committee_memberships` comparison to `checkLegislators`. The checker already fetches the full OS roster; it now re-extracts raw OS slugs for each legislator and diffs against the stored array.

**Severity: `warn`** — per the CI policy established in § 2026-06-03, content findings never fail the build. Committee membership drift is normal between sessions and across OS data update cycles.

**Guard: `osSlugs.size > 0`** — the comparison is skipped entirely when OS returns no roles data. This is the key false-positive protection: if the OS v3 `/people` endpoint doesn't include `roles` in its response (which appears to be the current state), the checker produces zero committee membership findings rather than flagging every legislator as having "unexpected" DB memberships. The guard means the checker becomes useful precisely when OS starts returning roles — at which point drift becomes detectable.

**Format mismatch note:** the checker compares raw OS slugs against DB slugs. Before the first sync post-PR-merge, DB rows may have canonical slugs while the checker computes raw OS slugs — a transient mismatch that resolves automatically on the next scheduled sync. The finding message includes a reminder: `(run sync:ky:legislators to resolve format mismatches)`.

### Diagnostic script (`scripts/reconcile-committee-memberships.ts`)

`npm run reconcile:committee-memberships [--only-mismatches] [--legislator=Name]` — read-only; no DB writes. Fetches DB legislators, OS roster, and `ky_committees`; reports per-legislator slug state by category: OK, OS roles empty, missing from DB, extra in DB, format mismatch. Also prints all unresolvable OS org name slugs (the transient/subcommittee set) so future operators can decide if any standing committee needs to be added to the canonical map.

**Intended use:** run before and after `sync:ky:legislators` to confirm canonical slug writing is working correctly. `FORMAT_MISMATCH` count should drop to 0 after the first post-deploy sync.

---

## 2026-06-11 — Phase 5b enrollment-actions sync + accuracy backfill pass

Shipped the Phase 5b recommendation from [docs/specs/session-record-spike-report.md](./docs/specs/session-record-spike-report.md): parse LRC `enrollment_actions.html` and write date-stamped executive-action rows into `ky_bill_status_history`. Same session: topic/glossary precision fixes, committee-materials historical backfill on primary, and operator tooling for post-mapper bill-status drift.

### Phase 5b — `sync:lrc:enrollment-actions`

**Source:** `apps.legislature.ky.gov/record/{session}/enrollment_actions.html` (session slug from `kySessionToLrcRecordSlug`, e.g. `26rs`).

**Parser:** `src/lib/lrc-enrollment-actions-parser.ts` — walks `<h4>` date → `<h5>` action → `<p>` bill links. Fixture: `fixtures/lrc/legislative-record-enrollment-actions-26rs-live.html`.

**Sync:** `src/lib/ky-lrc-enrollment-actions-sync.ts` + `scripts/sync-lrc-enrollment-actions.ts`. Resolves bills via `(bill_number, session)`; dedupes via `legiscan_change_hash = sha256('lrc-record|{action}|{bill_id}|{action_date}')`.

**Event types (v1):** reuses existing digest slugs only — no new `KY_DIGEST_EVENT_TYPES` entries yet:
- `signed_or_vetoed` with `event_payload.kind`: `signed`, `vetoed`, `line_item_vetoed`, `signed_without_signature`
- `veto_override_attempt` for "Veto Overridden In House/Senate"
- Skipped in v1: `Delivered To Governor`, enrollment signing lines, per-status bill-list pages (redundant with LegiScan / `ky_bills.status`)

**`observed_at = action_date` (not `now()`).** Executive actions are stamped at noon UTC on the LRC action date so digest grouping and profile timelines reflect when the governor acted, not when our scrape ran. This is the main departure from LegiScan-driven history rows.

**Scheduler:** Vercel Cron — `/api/sync?source=lrc-enrollment-actions` at **`45 14 * * *` UTC** (after committee materials 13:30 and health-check 14:00). Wired through `SYNC_SOURCES['lrc-enrollment-actions']` in `ky-sync-pipeline.ts`. **Not** a GitHub Actions workflow — same split as committee materials (Vercel daily) vs calendar/agenda (GH Actions 2× daily + Wayback). Page is ~100 KB and changes only when the governor acts; daily is sufficient in interim.

**Primary backfill (2026-06-11):** 466 rows inserted (292 × 2026 RS, 174 × 2025 RS); 0 unresolved bill refs.

**Digest labels:** `formatDigestEventLabel` extended for `line_item_vetoed` and `signed_without_signature` kinds under `signed_or_vetoed`.

### Data-layer map — what this does *not* cover

| Surface | Table(s) | Scheduler |
|---|---|---|
| Meeting schedule + cancellations | `ky_committee_meetings` | GH Actions `sync-lrc-calendar.yml` (12:00 + 18:00 UTC live; Sun 06:00 Wayback backfill) |
| Agenda line items + bill refs | `ky_committee_agenda_items` | Same calendar sync |
| Committee PDFs / docs | `ky_committee_materials` | Vercel 13:30 UTC daily + one-time `backfill:lrc:committee-materials` |
| Governor sign/veto/override history | `ky_bill_status_history` | Vercel 14:45 UTC daily (**new**) |

Enrollment actions fill a **LegiScan gap** (date-stamped executive actions, line-item-veto distinction). They do not replace or backfill meeting/agenda rows.

### Committee materials historical backfill

`npm run backfill:lrc:committee-materials` — walks each committee's `Other Meeting Years` chain (same idempotent `(committee_id, url)` upsert as daily sync). Primary run 2026-06-11: **12 inserted, 1,002 updated** across 69 committees / 40 prior-year pages. Some LRC year-page URLs 404 (expected — LRC rotates paths); script skips and continues.

### Accuracy / topic pass

**Topic classifier (`src/lib/ky-topic-classifier.ts`):** removed bare `drug` from Healthcare; added `financial literacy`; Public Safety + Criminal Justice keywords for law-enforcement / warrant bills mis-tagged as Healthcare or Alcohol & Cannabis. Backfill: `npm run topics:reclassify` — **22,547 scanned, 2,392 changed**.

**Glossary NV/absent:** scoped 51/20 threshold language to **final passage (third reading)** with procedural-vote caveat — follow-up to § 2026-06-08 (LLM flagged conflation with veto-override framing on generic votes).

**Bill status drift tool:** `scripts/refresh-bill-status-from-legiscan.ts` (`npm run refresh:bill-status`) — re-fetches LegiScan `getBill` detail, derives `last_action` from `history[]`, re-applies `mapLegiScanBillStatus`. Use after mapper fixes when hash-gated sync skips unchanged bills (`change_hash` unchanged on LegiScan side). 2026 RS full pass: 1,737 scanned, 0 updates (DB already matched detail + current mapper).

**Recommittal remap fix:** `scripts/remap-recommittal-statuses.ts` referenced non-existent `ky_bills.status_code` — fixed to derive numeric code from stored status label via `LEGISCAN_STATUS_MAP`. Run on primary: 0 candidates (recommittal rows already correct or absent).

### Cron landscape update (supersedes § 2026-06-07 table for Vercel)

**Vercel Cron (`vercel.json`):**

| Path | Schedule (UTC) |
|---|---|
| `/api/sync?source=bills&useChangeHash=true&skipBillSponsorDetails=true&historicSessions=1` | `0 5 * * *` |
| `/api/sync?source=legislators` | `0 6 * * *` |
| `/api/sync?source=votes&limit=5` | `15 6 * * *` |
| `/api/cron/notify` | `0 11 * * *` |
| `/api/sync?source=lrc-committee-materials` | `30 13 * * *` |
| `/api/cron/health-check` | `0 14 * * *` |
| `/api/sync?source=lrc-enrollment-actions` | **`45 14 * * *`** |

**GitHub Actions:** unchanged from § 2026-06-07 (`sync-ky-bills-status.yml`, `sync-lrc-calendar.yml`, `legislator-links-weekly.yml`, `accuracy-audit.yml`). **Future agent note:** if enrollment-actions ever moves to GH Actions (e.g. for Slack CLI notify parity with calendar sync), add a workflow mirroring `sync-lrc-calendar.yml` secrets block — Vercel cron path has no `SLACK_SYNC_NOTIFY_CLI` hook today; failures surface via `ky_sources` + health-check only.

### Open follow-ups

- **`delivered_to_sos` event slug** — deferred; payload-only under `signed_or_vetoed` or future slug when bill-detail countdown ships.
- **Committee materials link 404 detection** — ✅ DONE 2026-06-13 (migration 031 `link_status`/`link_checked_at` + audit-probe writeback + `probe:committee-links` backfill + UI "Link unavailable" flag). See § 2026-06-13 — Committee material link-status.
- **Historical enrollment sessions** — extend `KY_SESSIONS` + one-time sync when older record slugs are needed beyond 2025/2026 RS.

---

## 2026-06-12 — Design + a11y pass: never-reviewed surfaces (committees, meetings, search, glossary, about, auth)

**Combined `/design-critique` + `/accessibility-review` (WCAG 2.1 AA) of live kyvky.com**, scoped with the user to the surfaces the 2026-06-01 pass never covered, at desktop (~1280px) and mobile (~500px CSS viewport — Chrome's minimum window width; xs breakpoint <600px active, so target-size measurements are valid mobile signals, same caveat class as 2026-06-01). Signed-out only: the deferred signed-in profile/feed/follow sweep stays deferred (no authenticated session available to the audit agent). Findings checklist: TASKS.md § In Progress → Design + a11y pass (2026-06-12).

- **The 2026-06-01 fixes did not propagate — that's the systemic lesson.** Every major finding on these surfaces is a recurrence of a failure class already fixed elsewhere on 2026-06-01: placeholder-as-label (fixed on `/members/map`, recurred on `/search` + `/meetings`), missing Select `labelId` (fixed on `/bills`, recurred on all four `/search` filters), sub-44px targets (theme floor only catches canonical MUI components — `ToggleButton` groups, bespoke `span[role=button]` bookmarks, and `size="small"` chips all bypass it), and `variant="h6"`-as-size-primitive (fixed on `/bills/[id]`, recurred in committee-detail meeting materials). **Implication:** per-call-site fixes don't stick as the surface area grows; prefer theme/component-level enforcement (the bookmark control and ToggleButton needed component fixes, not call-site patches) and put new surfaces through the checklist before ship.
- **Split committee records is the highest-priority finding and is NOT part of the UI fix PR.** `/committees` carries seed-vs-LRC duplicate records of the same body with data split across them — confirmed: `administrative-regulation-review-subcommittee` (8 members, 2 meetings, "No upcoming meetings") vs `admin-regs-review` (0 members, 7 meetings, **upcoming Jul 8 meeting**, 46 materials). A user on the canonical record is told there is no upcoming meeting when there is one; a follow on one record misses the other's events. Suspected same-class pairs among Budget Review subcommittees (short seed names vs long LRC names). **Decision:** handle as a dedicated data-reconciliation task (merge + slug redirect + near-dupe-name check in `audit:accuracy`), not squeezed into the UI PR — merging user-followable records touches `ky_committee_follows` and needs the same care as the 2026-06-09 membership reconciliation.
- **Mobile nav omitted Log in and Search entirely.** Header Log in was `display: { xs: 'none' }`, header Search `display: { xs: 'none', md: 'flex' }`, and the drawer rendered only the five section links + tooltip toggle — leaving 21px footer links as the only mobile path to login (the gateway to the follow/digest loop) and search. Fixed by adding both to the drawer. **Why it was missed:** the drawer predates the auth + search nav additions; nothing enforced parity between header and drawer link sets.
- **Bookmark on committee cards: fake affordance when signed out.** `KYCommitteeCard` rendered a decorative bookmark (`IconButton component="span"`, `aria-hidden`, `tabIndex={-1}`, `pointer-events: none`) on every card for signed-out users. The audit initially read the live `span[role="button"]` as an unnamed control; code review showed it was correctly `aria-hidden` — the real problems were (1) a visual affordance that does nothing and falls through to the card link, and (2) inconsistency with bill cards, where the bookmark is status-only and appears **only when followed** (§ 2026-05-11). **Fixed:** decorative variant removed entirely; the interactive signed-in toggle (already labeled + `aria-pressed`) gains a 44px floor at xs on both `KYCommitteeCard` and `CommitteeMeetingCard`. **Lesson for future audits:** check `aria-hidden` on the wrapper before filing a name/role/value failure from a live probe.
- **Strong baseline held:** skip link, landmarks, keyboard-verified 2px `:focus-visible` ring, `aria-pressed` chamber pills, exemplary glossary outline (H1 → 7 H2 → 76 H3), labeled auth forms with correct `autocomplete` + native empty-submit validation, honest empty states, voice consistency from the 2026-05-27 passes.
- **Not tested (carry-forward):** real screen reader (VoiceOver/NVDA), 200% zoom reflow, signed-in surfaces, real-device 390px (viewport floor was ~500px).

**Revisit if:** committee dedupe surfaces more pairs than the Budget Review cluster (then the seed itself needs renaming to LRC-canonical names); drawer link list drifts from header again (consider deriving both from one nav-config array).

---

## 2026-06-10 — Sine-die display override for pending bills (PR #85)

Bills still `In Committee` / `Introduced` / otherwise pending when a session adjourned sine die kept their pre-adjournment status on display, implying they were still live (accuracy finding: HB563 2026 RS reading "In Committee" as of 2026-06-10).

- **Pure display-layer fix — no DB sync.** `sessionHasEnded(sessionName, asOf?)` in `ky-sessions.ts` reads the existing `sineDie`/end milestone data and returns **false for unknown sessions** so nothing is ever silently mislabeled. `isActivePendingBillStatus(status)` in `bill-display.ts` identifies the non-terminal statuses that become misleading post-adjournment (In Committee, Introduced, Referred, Reported, Draft, Prefiled).
- **Override point: `BillStatusMetaChip`.** When both conditions hold, the chip shows **"Adjourned Sine Die"** routed to the existing `adjourned_sine_die` tooltip ("Any bills not yet passed are dead until the next session").
- **Untouched:** terminal statuses (Signed, Vetoed, Failed, Chaptered, Passed Chamber) and any bill from a session still active/future in `KY_SESSIONS`. **Depends on** the 2026 RS `sineDie` milestone populated 2026-06-09 (§ 2026-06-09).

---

## 2026-06-11 — District-map hover UX (PRs #86/#87)

Replaced the non-interactive full-card popup on `/members/map` with a lighter-weight hover model. (#86 shipped the change; #87 refined it — same title.)

- **Chromeless hover chip + sidebar preview.** Hovering a district shows a lightweight chip tooltip and previews that district's member(s) in the sidebar, rather than overlaying a full member card on the map that the pointer couldn't interact with.
- **Selected-fill tint + smoother transitions** for clearer "which district am I on" feedback. Continues the 2026-06-01 map-affordance line (real `<label>` on the address input, empty vs no-district states).

---

## 2026-06-12 — Committee record merge (seed-code vs LRC full-label duplicates) (PR #89)

> **✅ Re-landed on `main` 2026-06-13 (PR #90).** PR #89 was originally merged into the **`fix/design-a11y-pass-2026-06-12` branch (PR #88), not `main`** — and #88 had already squash-merged to main by then, so #89's code never reached `main`. Re-landed by lifting the seven code files (migration **030** `ky_committees.aliases`, `scripts/merge-duplicate-committees.ts`, `scripts/diagnose-committee-duplicates.ts`, the `audit:accuracy` checkCommittees near-dupe guard, `src/lib/ky-committee-data.ts` alias lookup + `/committees/[slug]` 308-redirect, `package.json` scripts) onto `main`; typecheck + eslint clean. The **data** change was already applied to primary 2026-06-12 (below) and migration 030 is idempotent (`ADD COLUMN/CREATE INDEX IF NOT EXISTS`), so the re-land needs no DB action.

**Fixes the top finding from the same-day design+a11y audit (§ 2026-06-12 above).** `ky_committees` upserts on `(lrc_rsn, committee_type)`, and the LRC changed the `CommitteeType` URL param on the legislative calendar from short codes (`IJ`, `S` — the values migration 027's seed also used) to full labels (`Interim Joint Committee`, `Statutory Committee`). Every interim/statutory committee then got a second row on the next sync: **14 confirmed pairs** (not the 2 suspected during the audit), each sharing an `lrc_rsn` with data split across the rows — old row held the PDF-backfilled future meetings and any follows; new row received current calendar scrapes and materials copies.

- **Survivor rule: the row current LRC syncs target** (full-label row) — merging the other direction would let the next sync recreate the duplicate.
- **Meeting collision matching is date-only, deliberately** — loser PDF-backfill time strings ("11:00 ET") vs survivor calendar form ("11:00 am ET / 10:00 am CT, Annex Room 154") are the same meeting; `(date, time_and_location)` equality would double-list and later fire false `meeting_cancelled` digests (one had already fired for the loser's 2026-06-02 education meeting).
- **Aliases over hard 404s (migration 030).** `ky_committees.aliases TEXT[]` + GIN; merge appends the loser slug; `/committees/[slug]` falls back to alias lookup + `permanentRedirect` (308) so old bookmarks keep working.
- **Idempotent + auditable.** `merge:duplicate-committees` is dry-run by default (`--live` to write, `--pair=loser:survivor` overrides; auto mode only merges clean same-rsn short/full splits); live runs write a JSON change report under `reports/`. Re-run: "No mergeable pairs found."
- **Applied to primary 2026-06-12:** 14 pairs, 244 actions; `ky_committees` **69 → 55 rows**; the one real follower's 3 follows moved with per-user dedupe; no loser-slug refs in `committee_memberships`. Verified: canonical admin-regs page shows members *and* the Jul 8 meeting; alias slug 308s to it.
- **Regression guard:** `audit:accuracy` checkCommittees warns when two rows share an `lrc_rsn` or normalized (depluralized) name, **before** the calendar fetch (fires even when LRC is down). *(Re-landed on main with PR #90.)*

**Revisit if:** LRC changes the `CommitteeType` param again (the weekly warn catches it); a committee genuinely meets twice on one date during a merge window (date-only matching would fold them — recheck before merging session-period standing committees); fresh-DB installs re-seed 027's short codes and immediately duplicate (consider updating the 027 seed to full labels for new environments).

---

## 2026-06-18 — LegiScan bill sync timeout resilience + quota hold

**Problem:** `sync-ky-bills-status.yml` failed ~17% of runs over the prior week — all on the first LegiScan call (`getSessionList`), with `timeout of 25000ms exceeded` across three retries. No bill data was fetched; the job exited 1 and posted to `#errors`.

**Root cause:** transient LegiScan API latency, not quota exhaustion or a logic bug. Each GH Actions run starts with a cold client (no in-process cache), so a slow `getSessionList` had no fallback.

### Fixes (`src/lib/ky-legiscan-client.ts`, `src/lib/legiscan-quota.ts`, `src/lib/ky-sync-pipeline.ts`, `.github/workflows/sync-ky-bills-status.yml`)

- **Longer timeout + more retries:** axios timeout **25s → 60s**; retries **3 → 5** with exponential backoff on timeouts (2s, 4s, 8s, 16s).
- **Session list cache:** successful `getSessionList` responses persist to `ky_sync_state` key `legiscan_ky_sessions` (7-day TTL). On API failure, `fetchSessions()` falls back to the cached list and logs a warning; hard-fails only when the API fails and no cache exists (fresh DB).
- **Sync quota hold:** `checkLegiscanQuotaForSync()` skips LegiScan calls when monthly usage ≥ `LEGISCAN_SYNC_QUOTA_STOP_PCT` (default **95**, falls back to `ACCURACY_LEGISCAN_QUOTA_STOP_PCT`). Returns `status: 'skipped'` (exit 0) — same threshold policy as the weekly accuracy audit.
- **Workflow retry:** one automatic retry after **120s** when the first sync step fails (operational failure only; successful no-op and quota-skip runs do not retry).

### Documentation corrections

- Hash-gated cron paths **do** call `getBill` for changed/new bills; `skipBillSponsorDetails` only omits sponsor JSON on upsert. Updated workflow header, `/api/sync` route comment, and § 2026-06-07 cron landscape above.

**Trade-off:** retry on timeout adds up to 5 extra `getSessionList` attempts per failed run before cache fallback; the session cache and quota hold prevent runaway usage. Monthly quota visibility remains via existing Slack digest lines (`LegiScan quota` in sync notifications).

## 2026-06-16

**Notification + analytics hygiene pass.**

- **Dead Slack lib removed.** Deleted `src/lib/slack.ts` (Block-Kit `sendErrorAlert`/`sendSyncNotification`/`sendDeploymentNotification`/`sendAlert`/`sendSlackMessage`) — zero importers; superseded by `src/lib/slack-webhook.ts`. It used a divergent env-var convention (`SLACK_WEBHOOK_ALERTS/SYNC`) that muddied the channel model. Active Slack plumbing is `slack-webhook.ts` only (channels: `SLACK_WEBHOOK_STATUS_REPORTS` / `ERRORS` / `SUPPORT`, legacy aliases `SYNC`/`ALERTS`/`URL` still honored as fallbacks — **kept** for now). **Legacy aliases not dropped this pass** (would require migrating Vercel + GitHub secrets to canonical names first).
- **CI failure double-post fixed.** GitHub Actions sync/verify/audit scripts post a rich `#errors` message and then `exit 1`, which tripped each workflow's generic "notify on workflow failure" step → a second `#errors` post. New shared helper `markSlackErrorNotified()` (`slack-webhook.ts`) drops a `.slack-notified` sentinel (only when `GITHUB_ACTIONS=true`); each workflow's failure step now `[ -f .slack-notified ]` → skip. The generic step is now a true last-resort net for failures *outside* the script's notify path (setup/`npm ci`/OOM/pre-flight `exit 1`). Wired in `manual-sync.ts` (errors + crash), `verify-legislator-external-links.ts` (failed>0), `accuracy-audit.ts` (operational error only — content findings exit 0). `.slack-notified` gitignored.
- **PostHog preview-deploy exclusion.** `vercel.json` forces `NODE_ENV=production` for *all* deploys, so preview/branch builds were sending events into the production PostHog project. `next.config.ts` now exposes `NEXT_PUBLIC_VERCEL_ENV` (from Vercel's build-time `VERCEL_ENV`); `instrumentation-client.ts` skips PostHog init when it's `"preview"`. No dashboard change needed. **Internal-user / bot / IP filtering is PostHog-UI-only** — documented in [docs/analytics-internal-traffic.md](./docs/analytics-internal-traffic.md) (relies on `identifyUser` passing `email`; signed-out internal browsing needs host/IP filters). PostHog→Slack Action subscriptions live in the PostHog UI, not the repo.

**Revisit if:** migrating Slack secrets to canonical names (then strip `SLACK_WEBHOOK_SYNC/ALERTS/URL` fallbacks from `slack-webhook.ts`, the 4 workflows, and `env-template.txt`); a script that posts its own `#errors` message is added without calling `markSlackErrorNotified()` (it will double-post in CI).

### 2026-06-16 (cont.) — new-user alert + PostHog Slack consolidation

- **New-user Slack alert moved server-side.** Added `notifyNewUserSlack()` (`src/lib/slack-webhook.ts`, masks email) called from `src/app/api/me/welcome-email/route.tsx` on the committed-stamp success path → fires exactly once per *verified* user to `#status-reports`. Reliable vs the client-side `user_registered` PostHog event (ad-blockable).
- **PostHog Slack wiring consolidated (done in PostHog UI, project #450281, channel #subscriptions / C094NBMCU3U).** Signups were pinging `#subscriptions` twice (two destinations both matched `user_registered`). Resolution: removed the `user_registered` matcher from destination "Slack #subscriptions — user actions" (kept `preferences_saved` + `account_deleted`), and disabled the generic "Slack" destination (its sole matcher was `user_registered`; removing it would have made it fire on all events, so the whole destination was paused). Net: PostHog no longer pages Slack on signup; the server-side alert is the single source.
- **Bill follow/unfollow notification disabled.** It was a *scheduled daily Slack digest* — subscription "Bill Follows/Unfollows Daily Slack Report" on insight `Tcdx6K8J` (09:00 ET → #subscriptions), NOT a per-event ping. Disabled (not deleted); `bill_followed`/`bill_unfollowed` events still collected for analytics.
- **Internal/test filter left OFF** on the Slack destinations per owner. Stale name on the "user actions" destination still reads "(registered/preferences/deleted)" — cosmetic.

**Revisit if:** wanting signup alerts on *registration* (not just verification) — the server-side alert fires post-verification; re-enabling a PostHog `user_registered` destination would cover unverified signups too (accept the duplicate or move both to one channel). PostHog event→Slack topology is documented in memory `project_posthog_notifications`.
## 2026-06-13 — Committee material link-status (404 detection persisted)

Open follow-up from § 2026-06-09 / § 2026-06-11 (committee materials notes). LRC document URLs go dead after a session ends; we link out (no file hosting), so a stored link that now 404s shows the user a broken link. The accuracy audit *already* probed a rotating sample and flagged 404s — but the result was ephemeral (a weekly finding), never surfaced to users. This persists it.

- **Schema (migration 031, idempotent).** `ky_committee_materials.link_status TEXT CHECK (link_status IN ('ok','dead'))` + `link_checked_at TIMESTAMPTZ`. NULL = never probed.
- **Only definitive outcomes are recorded.** `classifyLinkStatus`: 404 → `dead`, 2xx/3xx → `ok`, everything else (timeout, 403/5xx, status 0) → `null` = leave the stored value untouched. A transient blip or a bot-block never flips a good link to dead. The probe persists; the audit *findings* still warn on any non-2xx (unchanged).
- **Shared probe lib.** `src/lib/ky-committee-material-link-probe.ts` extracts `probeUrl` (HEAD→Range-GET fallback, one retry) + `mapWithConcurrency` from the audit checker so both the audit and the backfill script use one implementation.
- **Two writers.** (1) The accuracy-audit materials checker persists `link_status` for the ~`ACCURACY_LINK_SAMPLE/2` material rows it probes when `ACCURACY_PROBE_LINKS=true` — keeps it fresh weekly. (2) `npm run probe:committee-links` (`:dry` to probe-without-writing) is the full-coverage / backfill tool and a cron candidate — `--only-unchecked`, `--limit=N`, `--committee=<slug>`, `--concurrency=N`; orders by `link_checked_at` nulls-first so capped runs rotate coverage.
- **UI.** Committee detail flags a `dead` material as line-through title + a non-interactive "Link unavailable" chip (pointing at the LRC profile via the existing section caveat) instead of rendering a link to a 404. `ok`/unchecked links render normally.
- **⚠️ Deploy ordering.** The materials read query now selects `link_status`, so **migration 031 must be applied to primary before this code deploys** — otherwise the select errors and the materials section renders empty. After applying, run `npm run probe:committee-links` once to backfill `link_status`.

**Revisit if:** LRC starts returning 403/anti-bot on document HEADs at scale (then `dead` coverage stalls — consider treating a stable 403 streak as dead); or if we want a Vercel cron for `probe:committee-links` rather than relying on audit-sample rotation + manual backfill.

---

## 2026-06-21 — SEO + GEO discoverability pass (branch `seo-geo-optimization`)

First pass at making `kyvky.com` indexable by search engines and citable by generative engines. Audit surfaced: sitemap covered only ~9 static paths (no bills/members/committees); zero schema.org JSON-LD anywhere; `og-image.jpg` referenced from the root layout but absent from `/public` (every social share rendered a broken card); a literal `"your-google-verification-code"` placeholder was shipping as the Google Search Console verification meta tag; no `llms.txt`. **Not merged yet** — sitting on `seo-geo-optimization` for review.

- **Dynamic sitemap, capped at 5,000 bills.** `src/lib/sitemap-data.ts` selects `id, updated_at` from `ky_bills` (filtered to the active session via `getCivicDataSessionName()`), all committees (`slug, updated_at`), and active legislators (slug derived via `memberSlug(leg.name)` from the existing slim roster helper). `src/app/sitemap.ts` is now `async` with `revalidate = 3600`. Total URLs jumped **9 → 1,218** on first hit against primary (1,002 bills, 142 members, 63 committees, 11 static). **Why the bill cap:** Google's per-sitemap limit is 50k URLs / 50 MB and we have headroom, but a single uncapped query against `ky_bills` would also pull prior-session rows the active session has already replaced — current-session filter + `order by updated_at desc` + `.limit(5000)` is enough to cover any realistic active session without forcing a multi-sitemap index. **Trade-off:** prior-session bills (e.g. 2025 RS) drop out of the sitemap once the session changes; they remain reachable by URL and crawlable from the bills browse page, but Google has to re-discover them. **Revisit if:** an active session ever exceeds ~3,000 bills (no KY session ever has), or stakeholders want indexing of multi-session archives (then split into per-session sitemap children behind a sitemap-index file).

- **Static paths expanded.** `/about`, `/glossary`, `/privacy`, `/terms` were missing from the sitemap. Added — all four return 200 in dev. `/dashboard`, `/browse`, `/admin`, `/dev/*` stay out (they're already covered by `noIndexMetadata` or robots.ts disallows).

- **Schema.org JSON-LD, built via a tiny `<JsonLd>` server component.** Choosing JSON-LD over Microdata/RDFa because Google's docs explicitly recommend it and it's the only format the major generative engines reliably parse without DOM context. Per-page strategy:
  - **Root layout** (one block, emitted in `<head>`): `Organization` + `WebSite` joined via `@graph` so they cross-reference by `@id`. `WebSite` carries a `SearchAction` that points at `/search?q={search_term_string}` — eligible for the Sitelinks Search Box treatment if Google decides to render it.
  - **Bill detail:** `Legislation` + `BreadcrumbList`. `Legislation` is the most specific schema.org type for a US state bill; populated `legislationIdentifier` (canonicalized to `SJR68`/`HB1` form), `legislationJurisdiction` = AdministrativeArea/Kentucky, `legislationDate` from `introduced_date`, `dateModified` from `last_action_date`, `creator[]` from the bill's sponsors array (mapped to `Person` nodes — handles both string sponsors and `{name}` objects). **Why `legislationLegalForm: "Bill"` for joint resolutions too:** schema.org doesn't enumerate "Joint Resolution" and the simpler bucket reads correctly in SERP previews; the bill_number prefix (`SJR`) already conveys the resolution distinction.
  - **Member detail:** `Person` + `BreadcrumbList`. Includes `jobTitle` from `kyMemberTitleShort()`, `worksFor: GovernmentOrganization { Kentucky General Assembly }`, `memberOf: PoliticalParty` mapped `D → Democratic Party / R → Republican Party / other passthrough`, `sameAs: [ballotpedia]` when present, `image` from the normalized photo URL. **Why Ballotpedia in `sameAs`:** it's the highest-authority cross-reference we have per legislator; Google uses `sameAs` for Knowledge Panel disambiguation.
  - **Committee detail:** `GovernmentOrganization` + `BreadcrumbList`, with `parentOrganization` = KY General Assembly. Standing committees are organizations, not events; meetings are events but live elsewhere on the page and aren't worth schema-ing individually (no Event JSON-LD this pass).
  - **No Event schema this pass.** `/meetings` could host `Event` JSON-LD per meeting, but the Event shape requires `startDate` + `location` + a name, and the meeting time strings are currently free-form (`"11:00 am ET / 10:00 am CT, Annex Room 154"`) without parsed ISO timestamps. Deferred until time parsing lands.
  - **No FAQPage schema on `/glossary` this pass.** Worth doing but Google has narrowed FAQ rich results visibility since 2023 (now mostly limited to authoritative gov/health sites); the structured-data engineering exists in `structured-data.ts` to add it later, and the glossary's 76 terms already form a clean H2/H3 outline that LLM crawlers can read directly. **Revisit if:** Google reopens FAQ surface area, or LLM citation patterns show the glossary being under-cited.

- **OG image: dynamic via Next.js file-based `app/opengraph-image.tsx`, runtime = edge.** Chose this over (a) checking in a static 1200×630 JPG or (b) reusing `ky-capitol-hero.jpg` (only 1024×457 — wrong aspect ratio for social cards). Edge `ImageResponse` renders a branded card (gold KY badge, kyvky.com URL, headline, tagline, sections line) at the canonical 1200×630 PNG; Next auto-injects it into OpenGraph + Twitter metadata, so the explicit `images:` blocks were removed from `layout.tsx`. **Trade-off:** every uncached social-card fetch executes an edge function (cheap, but not zero); a static asset would be one disk read. Worth it because the dynamic path means the card updates automatically with copy/brand changes — no separate Figma → export → check-in dance. **Revisit if:** OG fetches show up as a meaningful share of edge invocations on the Vercel bill, or we want per-page card variants (different cards for bills vs members).

- **GSC verification placeholder removed.** `verification: { google: "your-google-verification-code" }` was shipping a literal `<meta name="google-site-verification" content="your-google-verification-code" />` to production — harmless (verification just fails) but embarrassing. Removed entirely; re-add to `layout.tsx` once we have a real code from Search Console.

- **Per-page `alternates.canonical`.** Added on `/bills/[id]`, `/members/[slug]`, `/committees/[slug]` as a defensive measure against parameter URLs (sort/filter combos, tracking params, future A/B tests). The root layout sets a site-wide canonical via `metadataBase`; detail pages now override with their own absolute path. `openGraph.type` also set per page (`article` for bills/committees, `profile` for members).

- **`llms.txt` for generative engines.** New route handler at `src/app/llms.txt/route.ts` (1-hour `revalidate`, 24-hour SWR cache header). Follows the `llms.txt` proposal: short summary, primary sections with links, data-source attribution (LegiScan / Open States / LRC), citation guidance (link bill numbers to `/bills/{id}`, legislator names to `/members/{slug}`), and crawl policy. **Why dynamic and not a static `/public/llms.txt`:** the body interpolates `publicSiteOrigin()` so preview branches don't claim to be `kyvky.com`. **Trade-off:** the spec is unratified and crawler adoption is inconsistent (Anthropic and a few others honor it; Google does not). Cheap to maintain; large upside if/when adoption broadens.

- **What this PR does *not* touch.** `next/image` adoption is still minimal (4 alt-text sites total across the codebase) — not blocking for indexing, but a follow-up for LCP. No internal-link audit. No `BlogPosting`/`NewsArticle` (we don't have an editorial surface). No GSC verification (waiting on a real code).

**Verification (dev server, against primary data):** `curl http://localhost:3000/sitemap.xml` → 1,218 URLs (200, 223 KB). `/llms.txt` → 200, 2.5 KB text/plain. `/opengraph-image` → 200, 1200×630 PNG, 127 KB. Detail pages parse out the expected JSON-LD types (`['Organization', 'WebSite']` site-wide block + page-specific block). Real SJR68 bill yielded `Legislation` with full sponsor `Person[]` and KY jurisdiction; Senator Julie Raque Adams page yielded `Person` with Senator/Senate District 36/Ballotpedia/Republican Party/KY GA. `tsc --noEmit` and `eslint` clean.

**Revisit if:** GSC arrives (re-add `verification.google` in `layout.tsx`); bill cardinality ever forces a sitemap-index file (split per session); we want meeting `Event` schema (requires ISO time parsing for `time_and_location`); LLM citation traffic shows up in PostHog (signal that `llms.txt` is working and worth expanding).

---

## 2026-06-23 — Audience lens as a distinct axis from subject-area topics

Framing decision, no code changes yet. Driven by two adjacent pieces of user feedback ([FEEDBACK.md #1](./FEEDBACK.md), [#3](./FEEDBACK.md)): Iva Markicevic asked for plain-language per-bill summaries ("what the bill means for Kentuckians"); Katie Greene asked for a "Women & Families" entry point on `/bills` to drive her group to relevant legislation. Both are the same question — *"what does this bill mean for me / the people I care about?"* — from opposite ends (per-bill prose vs cross-bill aggregation).

- **Audience lens is a separate facet from subject area, not a new entry in the existing taxonomy.** The current `KY_TOPICS` (Education, Healthcare, Labor, Transportation, …) are subject areas — what the bill is *about*. An audience lens (Women & Families, Workers, Seniors, Parents, Veterans, Renters, Rural, Disabled, LGBTQ+, Immigrants, Students, Small Business) is *who is affected*. They're orthogonal: a paid-family-leave bill is Labor *and* affects Women & Families *and* affects Workers. Cramming both into the single `ky_bills.topics TEXT[]` would work mechanically (it's just an array) but conflates two ideas and erodes the meaning of "topic." **Trade-off:** the current taxonomy already has audience lenses smuggled in inconsistently (Veterans Affairs is an audience; Higher Education straddles); this decision means accepting that inconsistency for now rather than reclassifying. **Revisit if:** we ever do a taxonomy cleanup pass — Veterans Affairs / Higher Education should probably move to the audience axis at that point.

- **This reverses the "defer topic expansion" stance from [§ 2026-05-10](#2026-05-10).** That call was about adding more *subject areas*; the audience axis didn't exist as a concept yet. Adding "Women & Families" as a topic was the obvious move when Katie Greene asked, but it would have baked the conflation in. Better to recognize the axis now.

- **Three candidate architectures considered:**
  - **(A) Two-axis taxonomy** — add an `audiences TEXT[]` column on `ky_bills`, mirror the classifier (keyword + LegiScan-subject + AI fallback), add a second facet to `/bills`, extend the follow/digest plumbing. Clean and consistent but a real lift (schema + classifier + UI + follow plumbing), and we'd be building it on a hunch.
  - **(B) Curated landing pages** — `/lenses/women-and-families` is hand-built: saved query over existing topics + manually-pinned bills + editorial copy. Zero schema change. Doesn't scale beyond a handful of lenses; no follow/digest integration; quality is editorial, not algorithmic.
  - **(C) Structured "impact" field per bill** — each bill gets a plain-English summary plus structured fields (`affects: []`, `key_change`, `cost_to_kentuckians`). Audience lenses become automatic queries over `affects`. Same investment unlocks Iva's per-bill summaries, lens pages, better digest copy, social-share cards, and search. Large build — LLM generation + editorial review pipeline + UI surfaces.

- **Sequencing: B → C, with A deferred indefinitely.** Ship one curated lens (Women & Families) first to validate that audience entry points actually drive traffic and sharing; this is the cheapest way to answer "do users want this?" If it sticks, expand to 2–3 more curated lenses, then invest in C (structured impact field) as the durable architecture. C subsumes A — once `affects` is a structured field, audience lenses are queries, no separate column needed. **Why not jump straight to A:** we don't yet know that audience lenses are a sustained user need vs. a one-time ask from one group chat; B costs ~1 day of editorial work per lens and is reversible; A costs weeks and is forward-only. **Why not jump straight to C:** scope and risk — LLM-generated civic content needs an editorial review loop we haven't designed (mis-summaries in a legislative context erode the trust the digest decisions in [§ 2026-05-10](#2026-05-10) were built to protect).

- **Interaction with [§ 2026-05-10](#2026-05-10) "no AI summaries in v1":** that decision was scoped to *email digests* — the trust argument doesn't automatically transfer to on-site bill view, where users can read the source bill alongside the summary and corrections are easy. C will need its own decision entry on AI vs. human authorship, review cadence, and how to surface uncertainty (e.g. "auto-generated, verify against bill text" label). Not deciding that today.

- **What this means for the open feedback items:**
  - [#3] (Women & Families) is now a curated-lens build, not a taxonomy edit. Smaller and faster than the original plan.
  - [#1] (plain-English summaries) stays open as the destination; pre-work is the lens-page experiment.
  - The `KY_TOPICS` constant is **not** edited as a result of #3 — that was the immediate-but-wrong move.

**Revisit if:** the first curated lens fails to drive traffic / sharing (pull back from the audience-lens direction entirely); we get audience-lens asks from 3+ unrelated user groups (accelerate to C); or we decide to do a taxonomy cleanup that moves Veterans Affairs / Higher Education out of `KY_TOPICS` (then re-evaluate whether A becomes worth it as a forcing function).

---

## 2026-06-23 — Health check findings

Routine automated health check against GitHub Actions and Vercel.

**GitHub Actions status (all workflows, trailing 7 days):**
- Sync KY bill statuses: ✅ 14/14 runs success — last run 2026-06-23 09:49 UTC
- Sync LRC committee calendar: ✅ All recent runs success — last run 2026-06-22 20:48 UTC
- Legislator links weekly: ✅ Success — 2026-06-22 16:50 UTC (correct Monday cadence)
- Slack repo events: ✅ Success — 2026-06-22 01:17 UTC
- Content accuracy audit: ⚠️ **Cancelled** — 2026-06-21 10:23 UTC (run #27901338397)

**Accuracy audit timeout — root cause and fix:**
The Sunday audit (`accuracy-audit.yml`) has `timeout-minutes: 30`. The job started at 10:23:48 UTC and was killed at 10:53:26 UTC — exactly 30 minutes. Step 5 "Run content accuracy audit" was the step that timed out; steps 1–4 (checkout, setup-node, npm ci) all succeeded. The Slack notify step uses `if: failure()`, which evaluates to `false` when a job is cancelled (timeout kills produce conclusion=`cancelled`, not `failure`) — so **no Slack alert fired**. The audit ran 3 hours after the scheduled 07:00 UTC cron time, which is consistent with GitHub Actions queuing delay on a busy Sunday morning; the delay itself is not the issue.

**Decision: fix the Slack notify condition.** Change `if: failure()` → `if: cancelled() || failure()` in `.github/workflows/accuracy-audit.yml` so both hard failures and timeout-cancellations post to `#errors`. This is a one-line change, low risk.

**Decision: audit timeout budget.** The 30-minute cap was originally conservative. If the audit regularly takes >25 minutes (LegiScan + OpenStates API calls + LLM pass are the slowest steps), consider bumping to `timeout-minutes: 45`. Do not raise blindly — check the next two successful runs' actual durations first. If the audit consistently finishes in <20 min the timeout is fine and the 2026-06-21 run was an outlier (slow external API day).

**Vercel observability gap:**
`mcp__Vercel__list_projects` returned an empty array for team `katies-projects-4f5ab601`. Direct project-slug lookups (`know-your-vote-kentucky`, `kyvky`) returned 404. This means Vercel runtime logs and cron invocation records for the four daily Vercel crons (digest 11:00, committee materials 13:30, enrollment actions 14:45, health-check 14:00 UTC) could not be pulled programmatically this session. **Not a production issue** — a monitoring access issue. Check the Vercel dashboard at vercel.com/katies-projects-4f5ab601 directly; verify the MCP token scope if automated Vercel observability is needed in future health checks.

**Revisit if:** the accuracy audit times out again next Sunday — that would suggest a structural slowness (e.g. LegiScan rate-limit backoff loop, LLM pass consuming most of the budget) and should be diagnosed via `--no-llm` dry run locally. Vercel MCP access should be confirmed before the next health check.

---

## 2026-06-25 — Spot-check conventions: member display-name truncation

**Known and accepted:** kyvky.com omits middle names from legislator display names (e.g. "Julie Adams" for the official "Julie Raque Adams", "Cassie Armstrong" for "Cassie Chambers Armstrong"). This is intentional display simplification, not a data error. District numbers, chamber assignments, and party affiliations are the authoritative identity fields. **Do not flag middle-name omissions as discrepancies in future spot-checks or accuracy audits.**

**Spot-check output format:** Report results as a single concise table — one row per check, columns: Check | Result | Notes/Action. Result is PASS / FAIL / UNABLE TO VERIFY. Notes should be one line; flag any required action inline. No prose sections unless a finding is complex enough to warrant it.

---

## 2026-06-26 — LegiScan quota guard moved into the client + edge-triggered Slack alerts

Branch `feat/legiscan-quota-guard-and-slack-dedupe` (commit `e32133c`, not merged). Triggered by Slack flag triage: `#errors` was getting `*LegiScan quota threshold (90%+)*` every sync tick (19 posts in 48h drifting 94.3% → 97.1%) and `#status-reports` was re-posting `bills: skipped — LegiScan quota XX% (>= 95% sync hold)` every hourly bills cron — both level-triggered alerts with no edge dedupe. Underneath the noise, monthly quota was still climbing ~840 calls in 48h *while bills sync was on hold the entire window*, so something else was leaking.

### Why the level-triggered alerts existed

`maybeAlertLegiscanQuotaHigh()` in [slack-webhook.ts](src/lib/slack-webhook.ts) was called from `notifySyncSlack` with no state tracking — any tick where `quota.pct >= SLACK_LEGISCAN_QUOTA_ALERT_PCT` re-posted the same message. The `#status-reports` bills heartbeat had the same shape: `vercelBillsHeartbeat = true` for `source=bills` cron unless `SLACK_SYNC_BILLS_DIGEST_ALWAYS=false`, and the `worthDigest` clause counted *any* `r.status === 'skipped' && Boolean(r.error)` as interesting — but the "error" string was the unchanged hold reason, so it tripped on every tick.

### Where the quota leak came from

`checkLegiscanQuotaForSync` was wired *only* into [`syncKyBills`](src/lib/ky-sync-pipeline.ts:758). Every other LegiScan caller bypassed the hold: `syncKyVotes`, `syncKyLegislatorBios`, the accuracy audit, and — biggest in volume — [`getCachedLegiscanBillDetail`](src/lib/ky-bill-legiscan-cache.ts) which fires 1 `getBill` + up to 12 `getRollCall` on every bill-detail cache miss (300s TTL), driven by public traffic. Per-caller wiring is the wrong shape — there's no way to extend it to "all upstream API calls" without missing one. The right shape is a single chokepoint inside the API client.

### Architecture choice — guard at the client, soft-fail upstream

- **Quota check is now inside [`KyLegiScanClient.request()`](src/lib/ky-legiscan-client.ts).** Every method on the client — `fetchBillDetail`, `fetchRollCall`, `fetchVotes`, `fetchPerson`, `fetchSessions`, etc. — automatically respects the hold. Result is cached in-process for 60s (`QUOTA_GUARD_TTL_MS`) so the Supabase read doesn't double request volume.
- **`LegiscanQuotaHoldError` is the signaling channel** ([legiscan-quota.ts](src/lib/legiscan-quota.ts)). `isLegiscanQuotaHoldError(err)` is the public predicate so callers can distinguish quota-hold from real network failures.
- **Public traffic falls back, doesn't crash.** [`getCachedLegiscanBillDetail`](src/lib/ky-bill-legiscan-cache.ts) catches `QuotaHoldError` and returns `null`; bill detail page renders the DB-only payload (`fallbackSubjects` already in place at [ky-bill-detail-server.ts:88](src/lib/ky-bill-detail-server.ts:88)). `unstable_cache` stores the null for the TTL window, so the next ~5 minutes of cache misses don't re-trigger the check.
- **Mid-run quota crossings still record as `status: 'error'`** on `ky_sources`. Acceptable for now; the cleaner shape would be per-sync top-level catches that classify QuotaHoldError as `skipped`. Tagged as a follow-up rather than blocking this PR — the more common case (start-of-run check) already returns `skipped`.

### Why not split the budget (e.g. routine 85% / hard stop 98%)

Originally proposed two thresholds. Single threshold turned out to be enough: every caller now respects the same `LEGISCAN_SYNC_QUOTA_STOP_PCT`, and operators can raise it temporarily via env for one-off runs. Adding a second threshold would mean a second env var and second alert band with no incremental safety. **Revisit if:** we hit a scenario where the accuracy audit needs its own budget independent of routine syncs (today they intentionally share via the `ACCURACY_LEGISCAN_QUOTA_STOP_PCT` fallback in [legiscan-quota.ts:46](src/lib/legiscan-quota.ts:46)).

### Interim gate — `syncKyVotes` + `syncKyLegislatorBios`

Both LegiScan-touching daily crons now short-circuit when `getSessionPhase() === 'interim'` ([ky-sessions.ts:129](src/lib/ky-sessions.ts:129)). KY 2026 RS adjourned sine die 2026-04-15; there are no new roll calls until 2027 RS convenes, and legislator bio fields (Ballotpedia, headshot) don't change session-to-session. **Why a phase check instead of a date range:** the phase API already exists and handles the special cases (veto recess, final days). **Override paths:** per-request `?force=true` on `/api/sync`, or process-wide `KY_SYNC_FORCE_INTERIM=true`. **Note:** `syncKyLegislators` is **not** gated — it uses Open States, not LegiScan, and OS data (committee assignments, contact info) does drift during interim.

### Edge-triggered Slack — band state in `ky_sync_state`

`maybeAlertLegiscanQuotaHigh()` now persists `{ month, band }` under `slack_legiscan_quota_alert_state` and only posts when the band crosses up (90 → 95 → 98 → 100) within a month, or when the month rolls over. Worst case: 4 posts/month. The minimum-band gate (`SLACK_LEGISCAN_QUOTA_ALERT_PCT`, default 90) determines which crossings count as alert-worthy; below that band is always silent. The `#status-reports` bills digest got the same treatment from the opposite direction: `SLACK_SYNC_BILLS_DIGEST_ALWAYS` default flipped to `false`, and skip rows whose error matches `/LegiScan quota/i` no longer count toward `hasNewOrInteresting`.

### Env vars

- `SLACK_LEGISCAN_QUOTA_ALERT_PCT` (default `90`) — minimum band before `#errors` will fire. Existing var; semantics changed from "fire every tick above this" to "fire when crossing into this band or higher."
- `LEGISCAN_SYNC_QUOTA_STOP_PCT` (default `95`) — existing var, now applies to every LegiScan caller via the client.
- `SLACK_SYNC_BILLS_DIGEST_ALWAYS` — **default flipped from `true` to `false`**. Set to `true` on Vercel to restore the previous hourly heartbeat.
- `KY_SYNC_FORCE_INTERIM` (new, optional) — set to `true` to bypass the interim gate process-wide. Leave unset on Vercel.

### Reset step (one-time)

To unstick the band state from the pre-PR firing pattern:
```sql
delete from ky_sync_state where key = 'slack_legiscan_quota_alert_state';
```
Next sync will post one fresh banded alert at the current band, then go quiet until the band increases.

### Deliberate non-goals (deferred follow-ups — handed off via TASKS.md)

- **Persist roll-call data to DB during sync; strip LegiScan from bill-detail render path entirely.** Once shipped, public traffic stops touching LegiScan at all (the guard becomes belt-and-suspenders).
- **Classify mid-run `QuotaHoldError` as `skipped` not `error`** on `ky_sources`. Cosmetic until it actually causes a misleading alert.
- **Dataset Pull API (`getDatasetList` + `getDataset`) as the weekly full-reconcile.** ~2 quota points for the whole session; would replace selective `getBill` calls in the weekly accuracy audit. Worth doing when interim ends and we want a belt-and-suspenders catch-up.

**Revisit if:** we see another quota-leak window where the hold is engaged but quota keeps climbing — the most likely cause is a new code path that imports `getKyLegiScanClient` directly and circumvents the per-method API (unlikely, the client is the chokepoint), or a Vercel cron added after this PR that doesn't pass through the sync API route.

---

## 2026-06-26 — AI plain-language bill descriptions (with embedded impact audiences)

Implements [FEEDBACK #1](./FEEDBACK.md) (Iva Markicevic — plain-language summaries of "what the bill means for Kentuckians") and partially serves [FEEDBACK #3](./FEEDBACK.md) (Katie Greene — audience entry point). Supersedes the standalone **audience-axis classifier** sketched in [§ 2026-06-23](#2026-06-23--audience-lens-as-a-distinct-axis-from-subject-area-topics): per user direction, a separate queryable "who's affected" axis is too hard to get right, so audiences are surfaced as **grounded prose inside the AI summary** instead of a structured `affects[]` field or lens pages. Call this **"C-lite"** — it answers "what does this mean for me?" per-bill without committing to the full structured-impact architecture.

- **Reuse over rebuild — the feature was ~80% scaffolded but dormant.** `ky_bills.ai_summary` (migration 001), `generateBillSummary()` (`src/lib/ky-content-generation.ts`), the `AiGeneratedBlock` render component with its built-in "AI-generated — always verify" disclaimer (`src/components/civic/AiAttribution.tsx`), the bill-detail render path, **and** the weekly faithfulness audit (`reviewSummaries` in `src/lib/accuracy-audit/checkers/llm-review.ts`) all already existed. Nothing populated `ai_summary`, so all of it sat idle. This change wires them together; net-new code is small.

- **Grounding inputs: title + description + topics + LegiScan subjects only. No full-text fetch.** Deliberate — full bill text isn't stored, and fetching it costs LegiScan quota (the thing the rest of this branch guards). Deterministic topic/subject classification runs first and is fed into the prompt as grounding (the prompt now also passes official `legiscan_subjects`). **Trade-off:** summaries of bills with terse descriptions are thinner; accepted, because consistency with the quota-guard stance matters more and the disclaimer + feedback loop catch misses.

- **Audiences are the highest hallucination risk, so they're guarded on three sides.** "Who is affected" is inferential, unlike restating a title. (1) **Prompt guardrails:** name audiences only when clearly inferable from the provided fields, hedge with "may affect," **omit** the clause when unclear, no outside knowledge. (2) **Accuracy check:** `reviewSummaries` now also flags fabricated/overbroad audience claims (still severity-capped to `warn` — advisory, never fails CI, posts to Slack weekly Sundays 07:00 UTC). (3) **Human backstop:** the disclaimer + a frictionless feedback CTA on every summary.

- **Feedback CTA closes the loop into FEEDBACK.md.** `AiGeneratedBlock` gained a `billNumber` prop that renders "See a problem? Tell us" → `mailto:katie@kyvky.com` prefilled with `Feedback on {billNumber} summary`. Reports land in Katie's inbox → triaged into FEEDBACK.md per the workflow established earlier this session. (Email for now; a PostHog survey path can feed the same file later.)

- **Staleness tracking via input hash (migration 034).** Bills get amended, so a summary can go stale. Added `ai_summary_generated_at`, `ai_summary_model`, `ai_summary_input_hash` to `ky_bills`. The hash covers title + description + sorted topics + sorted subject names; the backfill regenerates **only** when that changes — the summary analog of the topics-reclassify change-detection. Also records which model wrote each summary (provenance + future model migrations).

- **Generation is a decoupled backfill, not part of sync.** `scripts/backfill-bill-summaries.ts` (`npm run backfill:bill-summaries[:dry]`) mirrors `reclassify-bill-topics.ts`: paginate the **active session** by default (flags to widen / `--only-missing` / `--limit` / `--session=`), bounded concurrency (4), skip-unchanged, idempotent. **Why not in the LegiScan sync path:** keeps AI latency/cost out of the quota- and timeout-sensitive sync (this branch's whole theme). Cost is Anthropic tokens only (~256 output tok/bill), zero LegiScan quota. A cron to auto-summarize new/changed bills is a deliberate **follow-up**, not shipped here.

- **Preserves [§ 2026-05-10](#2026-05-10) "no AI summaries in v1" — which was digest-scoped.** That trust argument was about *email digests*; it doesn't transfer to the on-site bill page where the user reads the source alongside the summary and can report problems. `ai_summary` stays **on-site only** and must NOT be added to digest emails — the `/about` page still correctly promises "no AI-generated summaries in digest emails."

**Revisit if:** the weekly audit starts surfacing a cluster of audience-overclaim `warn`s (tighten the prompt or drop the audience clause); feedback volume justifies promoting audiences to a structured `affects[]` field + cross-bill lens pages (the deferred FEEDBACK #3 proper); or summary backfill cost/latency warrants a scheduled cron instead of manual runs.

---

## 2026-06-26 — Bill detail rendered entirely from the DB (no live LegiScan on the read path)

Production incident + durable fix. The LegiScan quota guard ([§ 2026-06-26 — LegiScan quota guard](#2026-06-26--legiscan-quota-guard-moved-into-the-client--edge-triggered-slack-alerts)) makes `getCachedLegiscanBillDetail` return null once monthly usage crosses the 95% hold threshold. Usage hit ~97%, the hold engaged, and **every bill-detail page rendered with empty sponsors, roll calls, and steps** — because those were built only from the live `getBill` + `getRollCall` calls, and the null-fallback hardcoded empty arrays. Hotfix [PR #104](https://github.com/ktoepp/know-your-vote-kentucky/pull/104) restored sponsors + a synthesized step timeline from the DB; this entry covers the full follow-up (the [§ 2026-06-26 quota-guard](#2026-06-26--legiscan-quota-guard-moved-into-the-client--edge-triggered-slack-alerts) deferred item #1): make the read path 100% DB-sourced so it never spends LegiScan quota again.

- **The read path now makes zero LegiScan calls.** Everything the bill page renders is persisted during sync and read from the DB: subjects (`ky_bills.legiscan_subjects`), sponsors (`ky_bills.sponsors`), roll calls (`ky_votes`), action history + bill-text versions (`ky_bills.legiscan_history` / `legiscan_texts`). `committee` isn't rendered, so it's dropped. `getCachedLegiscanBillDetail` and `enrichVotes` are deleted; `ky-bill-legiscan-cache.ts` is gone. **Verified:** a clean dev server renders HB2/HB314 roll calls + sponsors + history with no `Fetching bill detail` log, under the live 97% hold.

- **Roll calls from `ky_votes`, not `getRollCall` (Phase 1).** This was the biggest sink — the read path issued up to 12 `getRollCall` calls per bill on each cache miss (`MAX_BILL_ROLL_CALL_ENRICH = 12`), scaling quota with page traffic. `ky_votes` already stored the tallies the UI shows (yea/nay, roll_call_id, date) for 463 bills, so this was a pure read-side switch. **Accuracy gap closed:** `ky_votes` never stored LegiScan's `nv` (not-voting) — only `absent` — so migration **035** adds `ky_votes.nv_count` and `syncKyVotes` now persists `vote.nv`. Existing rows stay NULL; the UI hides the NV chip until a re-sync fills it, so Yea/Nay stay correct meanwhile. **Trade-off:** for the (currently rare, quota-held) case where a live call would have succeeded, we drop the live NV until the row is re-synced — acceptable vs. the alternative of an empty votes section.

- **History + texts persisted as JSONB on `ky_bills` (Phase 2), mirroring `sponsors`.** Migration **036** adds `legiscan_history` + `legiscan_texts`; `syncKyBills` writes them via `legiscanHistoryTextColumnsFromDetail()` at all three detail-fetch sites — same cadence as sponsors, only when present so a detail-less sync never clobbers them. **Why JSONB columns, not new tables:** the bill page renders these as opaque ordered lists (no per-row querying — digest events already live in `ky_bill_status_history`), so a column matches the existing `sponsors` pattern with no joins, seq management, or dedupe indexes.

- **Graceful, self-healing degradation while the new columns populate.** `legiscan_history` / `legiscan_texts` are NULL for every existing row until its next detail sync — and sync is itself quota-held until the **2026-07-01** reset (a backfill would need `getBill` per bill, which is exactly the quota we're protecting). Until then the page falls back to the synthesized two-anchor timeline (Introduced + latest action) and the stored `bill_text_url`. This is identical to the page's current behavior under the hold, so nothing regresses; full history/texts return as bills re-sync. **Backfill timing:** running one *during* the June hold would defeat the quota protection, so it's deferred to **after** the 2026-07-01 reset, when there's fresh headroom. A quota-aware `scripts/backfill-bill-history-texts.ts` (`npm run backfill:bill-history`, added in PR #106) populates the columns via one `getBill` per missing bill and stops cleanly if the hold re-engages; a one-time scheduled task fires it on **2026-07-02** to verify + run it.

- **`fetchRollCall` is kept on the client** — the weekly accuracy audit (`checkers/votes.ts`) still uses it to diff stored tallies against LegiScan. Only the bill-page enrichment was removed.

**Deploy ordering:** migrations **035** + **036** are applied to primary (2026-06-26) and are additive/idempotent, so they can land before or after the code. The code is safe against NULL columns (fallbacks), so there is no strict ordering requirement.

**Revisit if:** post-reset syncs don't populate `legiscan_history` for a meaningful share of bills (then a one-time, quota-budgeted `getBill` backfill is warranted once headroom exists); or we want richer roll-call detail (per-member breakdown is already stored in `ky_votes.roll_call` JSONB but not yet rendered).

---

## 2026-06-27 — Mid-run LegiScan quota-hold classified as `skipped`; accuracy-audit timeout raised

Two small reliability fixes from the [§ 2026-06-26 quota-guard](#2026-06-26--legiscan-quota-guard-moved-into-the-client--edge-triggered-slack-alerts) deferred item #2 and the [§ 2026-06-23 health-check](#2026-06-23--health-check-findings) ops note.

- **Mid-run `LegiscanQuotaHoldError` now records `skipped`, not `error`.** The start-of-run `checkLegiscanQuotaForSync` in `syncKyBills` already returns `skipped`, but if monthly quota crosses the hold threshold *mid-sync* (long hash-gated runs, catch-up syncs) the `LegiscanQuotaHoldError` thrown by `KyLegiScanClient.request()` surfaced as a `status: 'error'` on `ky_sources` — a misleading red on `/admin/sync-status`. Fix: a shared `quotaHoldSkipResult()` helper, wired into the top-level catch of the three LegiScan-primary syncs (`syncKyBills`, `syncKyVotes`, `syncKyLegislatorBios`); it records `success` + the hold reason on `ky_sources` (mirroring the start-of-run guard) and returns `skipped`. Since `hasErrors` keys off `status === 'error'`, a quota-hold skip no longer trips the `#errors` Slack path either.
  - **Subtlety — inner per-item catches were swallowing the hold.** In the hash-gated bill path and the per-bill/per-legislator loops, the detail-fetch `try/catch` logged-and-continued on *any* error, so the quota hold never reached the top-level catch — the run would spin through every remaining item (each a cheap pre-HTTP throw, since the client short-circuits a hold before fetching) and finish as a misleading partial `success`. Each such inner catch now re-throws `LegiscanQuotaHoldError` (`if (isLegiscanQuotaHoldError(err)) throw err;`) so it propagates.
  - **`syncKyLegislators` deliberately untouched.** Its data is Open States; LegiScan is only a non-fatal `people_id` reconcile already wrapped in its own try/catch — a hold there should not flip the whole run.
  - **`ky_sources` status stays `success` (not a new `skipped` enum) for a hold.** `KYSource['status']` is `'success' | 'error' | 'running' | null`; the start-of-run guard already uses `success` + a descriptive `error_message` for skips, so the mid-run path matches that established pattern rather than widening the type.

- **Accuracy-audit `timeout-minutes` 30 → 45; Slack alert distinguishes a timeout from a failure.** The 2026-06-21 run was cancelled at the 30-min ceiling. The `if: cancelled() || failure()` notify condition was already fixed in `c39f1aa` (2026-06-23) — so the only remaining gaps were (1) the ceiling itself (raised to 45; the audit is weekly, headroom is cheap, a genuine hang still surfaces via the cancelled() notify) and (2) the alert text, which now branches on `job.status` so a `cancelled` (timeout) reads differently from a hard `failure`, pointing the operator at the right cause.

---

## 2026-06-27 — Auth-page a11y: titles, password rules, reveal toggle

First slice of the open "Minor a11y polish" item from the [§ 2026-06-12 design + a11y pass](#2026-06-12--design--a11y-pass-never-reviewed-surfaces). Auth surfaces (signed-out) were never given a dedicated a11y pass; three WCAG gaps closed.

- **Distinct document `<title>` per auth route (2.4.2 Page Titled).** Every auth page inherited the root `'Know Your Vote Kentucky'` title because the forms are `'use client'` components, which cannot export `metadata`. Rather than refactor each form into a server wrapper (moving live session logic), each route gets a tiny **server `layout.tsx` that exports only `metadata.title`** and renders `{children}` — Log in / Create account / Forgot password / Reset password / Email verification / Log out. **Why a layout, not a server page wrapper:** zero churn to the working client forms, uniform across all six routes, and metadata from a nested layout merges/overrides the parent title cleanly.
- **Password rules stated up front (3.3.2 Labels or Instructions).** Reset already enforced an 8-char minimum on submit but never told the user; register relied entirely on a post-submit Supabase error with vague helper copy. Both now show "At least 8 characters. Use one you do not reuse elsewhere." before submit, and register gained a matching **client-side length check** so the rule is enforced consistently with reset (8 is the canonical minimum already used by reset).
- **Show/hide reveal toggle via a shared `PasswordField` (2.5.5 + 4.1.2).** New `src/components/auth/PasswordField.tsx` wraps MUI `TextField`, manages `type` internally, and renders a reveal `IconButton` in the end adornment — a real focusable button with a state-describing `aria-label` (Show/Hide password) + `aria-pressed`, sized 44×44 by the theme's existing `MuiIconButton` floor (from the 2026-06-01 pass). Wired into login, register, and both reset fields. **Why a component, not per-call-site markup:** the [§ 2026-06-12 systemic lesson](#2026-06-12--design--a11y-pass-never-reviewed-surfaces) — per-call-site a11y fixes don't stick; a shared component is the enforcement point.

**Verified in-browser** on the dev server: titles render per route, the up-front helper copy shows, and the toggle flips the input `type` + swaps its label/`aria-pressed`. tsc + eslint clean.

**Deliberately out of scope (still open under "Minor a11y polish"):** `/search` fallback-chip/jargon/loading copy, committee-detail new-tab announcements, glossary in-page filter + back-to-top, and search relevance — different surfaces, separate PR.

---

## 2026-06-27 — Search/glossary/committee a11y polish

Continuation of the "Minor a11y polish" item ([§ 2026-06-12 design + a11y pass](#2026-06-12--design--a11y-pass-never-reviewed-surfaces)); copy kept deliberately minimal to avoid adding UI noise.

- **`/search` suggestion heading: drop jargon, fix the contradiction.** "Popular LegiScan subjects this session" exposed the internal data-source name (LegiScan) and was inaccurate — the chip row always also includes bill-number examples ("Bill number: 23", "HB 1"), and falls back to generic "Try: …" chips when no subjects load, none of which are "popular subjects." Renamed to **"Suggested searches"** — honest for the full mixed set, no jargon. One-word-level change, no new prose.
- **`/search` result count no longer reads as a hard cap.** The client fetches up to `SEARCH_FETCH_LIMIT = 500` merged hits then slices to it, so a broad query (e.g. "education") rendered a flat "500 results" that looked like a ceiling. Now shows **"500+"** when `totalResults >= SEARCH_FETCH_LIMIT`. Display-only; the fetch cap is unchanged.
- **Committee detail external link announces the new tab.** The inline "official LRC committee profile" link opens with `target="_blank"` but lacked the new-tab announcement that `OfficialSourceLinks` already gives every other outbound link. Added `aria-label="… (opens in a new tab)"` to match (WCAG G201). Icon intentionally omitted — an `OpenInNew` glyph mid-sentence reads as noise; the aria-label is the actual a11y fix.
- **Glossary in-page filter + back-to-top via a new `GlossaryBrowser` client component.** The page stays a server component (keeps its `metadata`); the list moved into `src/components/glossary/GlossaryBrowser.tsx`, which adds a labeled "Filter terms" search over title + definition (live `role="status"` "N of 76 terms" count + a no-match line), hides the section jump-nav while a filter is active (anchors are meaningless mid-filter), and renders a "Back to top" link per section (the page `<h1>` gained `id="glossary-top"`). Verified in-browser: filter narrows correctly, jump-nav toggles, counts update.

**Deliberately deferred:** the `/search` **relevance reorder** (appointment/confirmation resolutions outranking substantive bills) — a behavior-changing ranking tweak to `relevanceScoreForKyBillSearch` that needs real query-data validation, so it's not a low-risk polish item. The loading skeleton's literal "…" chip is left as-is — it's `aria-hidden` and decorative, so not an a11y defect.

---

## 2026-06-27 — /search relevance: demote low-substance resolutions

Closes the deferred `/search` relevance reorder. **Decision framework set by the request: accuracy first, efficiency second**, within the project's transparency value (a civic-records tool should not hide records).

**Problem (reproduced against live data).** On topical queries, appointment/confirmation and ceremonial resolutions outranked substantive bills, because `relevanceScoreForKyBillSearch` rewards title / LegiScan-subject keyword presence with no prior for legislative substance — a "confirming the appointment of … to the Kentucky Council on Postsecondary Education" resolution matches "education" as strongly as an education ACT. Repro: "education" → top results were `SR213`, `SR265`, `SR214` (confirmations) above `HB5`/`HB253`/`SB263`/`HB1`/`SB1`; "agriculture" similar (`SR273`/`SR263`).

**Options weighed.** (A) guarded in-memory demotion; (B) boost substantive bills; (C) hard-filter the resolutions out; (D) persisted `bill_class` column + classifier at sync. Picked **A**. (C) was rejected as it hides real legislative records (transparency). (D) was rejected as overkill — a migration + sync change + backfill for a ranking polish; revisit only if browse/digest need the same class. (B) is less precise than (A) — blanket-boosting bills risks burying genuinely relevant substantive resolutions (task forces, policy JRs).

**Chosen design.** A ranking-policy step in `fetchKyBillsMatchingSearch` (not inside the scorer, which stays a pure relevance measure): subtract `LOW_SUBSTANCE_RESOLUTION_PENALTY` (5000) from rows flagged by `isLowSubstanceResolutionForSearch` — a resolution-type designation (`HR/SR/HJR/SJR/HCR/SCR`) whose title matches `confirming the (re)appointment` or `^A … RESOLUTION (honoring|recognizing|congratulating|commemorating|celebrating|mourning|designating|adjourning|in memory of)`. **Guards** (`shouldPenalizeLowSubstanceResolutions`) suppress the penalty for bill-number (`numericOnlyQuery`) / designation (`HB23`) queries and for queries whose own words signal intent (`appoint|confirm|nominat|honor|recogniz|commemorat|memorial|resolution`), so explicit lookups still surface them.

- **Why demote, not exclude.** Preserves discoverability — searching `SR213`, "confirm appointment", or the board name still returns the resolution; only the topical ordering changes. Accuracy without hiding records.
- **Detection precision.** Validated on all 444 resolutions of the 2026 RS: 66 appointment + 218 ceremonial flagged, 160 substantive (task forces, policy/urging/affirming resolutions) left untouched. LRC title drafting is regular enough that anchored regexes don't catch substantive resolutions.
- **Efficiency.** Pure in-memory, O(n) over rows already fetched — zero schema / sync / LegiScan-quota cost. Same change also precomputes per-row scores into a `Map` once instead of re-scoring inside the O(n log n) sort comparator.

**Verified against live data:** "education"/"agriculture" now lead with substantive bills; the intent guard ("education appointment") still shows confirmations; the designation guard ("SR213") still returns the resolution; "health" keeps its substantive task-force resolutions (`SJR116`, `HCR113/103`) — i.e. not over-demoted. tsc + eslint clean.

**Revisit if:** browse / digest / member-profile surfaces want the same substance prior (then promote the heuristic to a persisted `bill_class` per option D); or the penalty magnitude needs tuning once we have query analytics. **Adjacent, out of scope:** the `ky_bills_plain_search` FTS RPC hit a statement timeout in repro and fell back to `ilike` legs — a separate search-performance item.

---

## 2026-06-28 — Accuracy audit: a LegiScan quota stop is a skip, not an operational error

**Trigger.** The first scheduled accuracy audit after the § 2026-06-27 timeout fix (run [#28318388587](https://github.com/ktoepp/know-your-vote-kentucky/actions/runs/28318388587)) confirmed the timeout is gone — it finished in **2m**, not 30m+ — but it still failed CI (exit 1) and paged `#errors`. The content was clean: `checked=208 ok=188 fail=0 warn=20`. The only "problem" was a start-of-run **LegiScan quota stop** (`bills` / `votes` skipped at 97.2% ≥ the 95% stop), which `scripts/accuracy-audit.ts` folded into `hasOperationalError`.

**Decision.** A quota stop is **not** an operational error. It's the same expected, self-protective skip that § 2026-06-27 reclassified for the sync pipeline (`syncKyBills` / `syncKyVotes` / `syncKyLegislatorBios`) — the audit just hadn't been brought in line. `hasOperationalError` is now `summary.hasOperationalError` alone (a checker actually **crashing** — `result.error` set). The `|| legiscanBlockedReason != null` clause was removed. A quota stop already surfaces in the status digest as a `skipped` domain line ("• bills: skipped — LegiScan quota 97.2% …"), so it loses no visibility; it simply no longer escalates to `#errors` (`escalateToAlerts: false`) and the script exits 0.

- **Why this matters now.** During interim there are no new bills, so the monthly LegiScan quota sits high all month — meaning the audit's start-of-run guard trips **every Sunday**. Under the old logic that was a guaranteed weekly false-red on `#errors` for a non-event. The whole thrust of § 2026-06-26 / § 2026-06-27 was that quota holds are expected and should be quiet, not alarming.
- **What still pages.** A genuine operational error — a checker throwing (network, schema drift, an unhandled bug) — still sets `summary.hasOperationalError`, still escalates to `#errors`, and still exits 1. Content `fail` findings continue to report to the status digest without failing CI (unchanged).
- **Scope.** One file (`scripts/accuracy-audit.ts`): the `hasOperationalError` expression, plus the explanatory comment and the header `Exit:` line. No change to the checkers, the report formatter, the Slack helper, or the workflow YAML. tsc + eslint clean.

**Revisit if:** we want a *distinct* low-severity signal for "audit couldn't fully run this week" (e.g. a one-line note to the status digest when LegiScan-backed domains were all skipped) — currently that's inferable from the `skipped` lines. The cleaner long-term fix is task #28 (LegiScan Dataset Pull weekly reconcile), which removes the audit's per-bill `getBill` quota pressure entirely.

---

## 2026-06-28 — AI model-id consolidation + dead `summarize` module removal

**Trigger.** While scoping the deferred "AI-model-id cleanup" follow-up, a grep showed the Anthropic model id hardcoded in six places with **three different values**: `claude-sonnet-4-6` (content-gen, intelligence, accuracy-audit), `claude-sonnet-4-20250514` (topic classifier — an older Sonnet 4 snapshot), and `claude-3-5-sonnet-20241022` (two `summarize.ts` files). The drift meant the topic classifier was silently running a different, older model than every other LLM surface.

**Decision — one canonical constant.** Added `src/lib/anthropic-model.ts`:

```ts
export const KY_DEFAULT_ANTHROPIC_MODEL =
  process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-6';
```

All four live call sites now import it: `ky-content-generation` (`KY_CONTENT_MODEL` re-exports it, preserving the value persisted to `ky_bills.ai_summary_model` for provenance), `ky-intelligence`, `ky-topic-classifier`, and the accuracy audit's `buildAuditConfig` (`ACCURACY_LLM_MODEL` still overrides per-run; it now falls back to the shared default instead of its own literal). A model migration is now a one-line edit, or a no-deploy `ANTHROPIC_MODEL` env flip.

- **Topic classifier aligned to 4.6 — a deliberate behavior change.** It was the lone holdout on `claude-sonnet-4-20250514`. Bringing it onto `claude-sonnet-4-6` matches every other surface and is a newer model; topic classification has a keyword fast-path with the LLM only as an ambiguous-item fallback, and outputs are constrained to the fixed `KY_TOPICS` set, so the blast radius is small. Re-running `npm run topics:reclassify` would pick up any shifts, but isn't required — existing tags stand until the next classify pass.
- **Why env-overridable.** The repo has flagged model migration as a recurring concern; a single `ANTHROPIC_MODEL` knob lets an operator test a new model in one environment without a code change. Per-surface knobs (`ACCURACY_LLM_MODEL`) still layer on top for targeted experiments.

**Decision — delete two dead modules.** `src/lib/summarize.ts` and `src/app/lib/summarize.ts` were confirmed **fully unused** (no imports of either module; no references to any of their exported functions — `analyzeCongressionalContent`, `summarizeForYoungVoters`, `summarizeDecisions`, etc.). They're leftovers from the retired generic event-summarizer product (congressional / "young voters" framing, not the KY civic tool) and were the only remaining holders of the stale `claude-3-5-sonnet-20241022` id. Removed both. tsc + eslint clean.

**Revisit if:** a future surface needs a genuinely different model (e.g. a cheaper Haiku tier for high-volume classification) — at that point add a second named constant rather than re-scattering literals.

---

## 2026-06-28 — Auto-summarize new/changed bills, paired with the 6h bills sync

**Trigger.** With active-session summary coverage verified at 100% (1,737/1,737), the remaining gap was *keeping* it at 100% as bills move during session — the deferred "cron to auto-summarize new/changed bills" follow-up. Without it, a new or amended bill would sit with a stale/missing `ai_summary` until the next manual backfill.

**Decision — a step on the existing bills-sync workflow, not a new cron.** Added a `Summarize new/changed bills` step to `.github/workflows/sync-ky-bills-status.yml` (the every-6h hash-gated sync), running `npm run backfill:bill-summaries -- --limit=300` after a clean primary sync.

- **Why pair it with the sync instead of a standalone schedule.** The summary input hash is over title / description / topics / `legiscan_subjects` — exactly the fields the bills sync updates. Running the backfill immediately after the sync means summaries refresh in the same window a bill changes, with no separate schedule to reason about and a shared checkout / `npm ci`. The backfill is hash-gated and idempotent, so when nothing changed it just scans and generates zero (the steady state during interim).
- **Gated on `steps.bills_sync.outcome == 'success'`.** If the primary sync failed (even if the retry step later rescued the job), summaries are skipped this round and picked up on the next 6h run. Keeps the dependency explicit and avoids summarizing against a half-synced state.
- **Advisory, never reds the sync.** `continue-on-error: true` — bill summaries are beta and their faithfulness is already monitored by the weekly accuracy audit's LLM pass; a transient Anthropic hiccup must not fail the bill-status sync or page `#errors`. A missing `ANTHROPIC_API_KEY` cleanly skips the step (the secret is optional on this workflow, unlike the audit).
- **`--limit=300` as the per-run cost cap.** Bounds generations per run so a burst of changes (e.g. a busy session day, or a sitewide `topics:reclassify`) can't fire an unbounded Anthropic batch; overflow is absorbed by the next 6h run. Zero LegiScan quota either way — this path is Anthropic-only, decoupled from the quota-sensitive sync (see § 2026-06-26). New-DB bootstrap or a large catch-up is still an operator's manual `npm run backfill:bill-summaries` (no limit).

**Revisit if:** during a heavy session the 6h cadence lags bill changes noticeably (raise the limit or cadence), or if Anthropic spend needs a hard ceiling (wire the backfill through the existing `anthropic:llm:daily` token bucket the way `/api/intelligence` does — currently the `--limit` cap is the only guard).

---

## 2026-07-03 — Performance pass 1: image pipeline + home-hero SSR (PR pending)

**Trigger.** First dedicated speed pass (branch `perf/speed-optimization`). Baseline Lighthouse on a local production build found two dominant problems the 2026-05-19 server-side caching pass couldn't touch: (1) the SSR HTML for `/` was a `CircularProgress` — `HomePageContent` gated everything behind `useUser().loading`, so the hero (the LCP element) waited for hydrate → Supabase auth → CSS background-image fetch (home mobile: perf 30, LCP 11.4s, TBT 2.3s); (2) `/members` transferred **~31MB**, almost all of it images served at original resolution into small slots.

**Decision — serve every legislator image through `next/image`; server-render the marketing hero.**

- **Portraits were the real 28MB, not district thumbs.** The committed district thumbnails (53MB in `public/geo/district-thumbs`, 2x Mapbox renders at 1200×560 / 1440×840 shown at ~200px / ~480px) were the *suspected* offender, but lazy-loading had capped their per-page cost; the actual weight was hot-linked state portraits — Governor Beshear's official photo is **18.3MB**, one senate headshot 4MB, ~100 more at 100–175KB. Both now go through `next/image`: thumbnails via `fill` + `sizes` in `LegislatorDistrictThumbnail` (a ~78–190KB card thumb now serves ~9KB), portraits via an `Image` child inside MUI `Avatar` in `LegislatorAvatar` (`sizes="88px"` ceiling — the largest avatar token; the 18.3MB portrait serves ~8KB at 256w).
- **Portrait hosts are allowlisted, the tail is not.** `images.remotePatterns` covers `legislature.ky.gov` (577 of ~595 DB photo URLs), `governor.ky.gov`, `www.ag.ky.gov`, and Ballotpedia's S3 bucket; `isOptimizedPortraitUrl` (`ky-member-utils.ts`, kept in sync by comment on both sides) routes only those through the optimizer. The long tail of one-off campaign/news hosts keeps the previous plain `<img>` behavior rather than 400-ing the optimizer. Failure chain: optimizer error → plain `<img>` → MUI initials fallback. The `/api/geo/district-thumbnail` fallback branch also stays a raw `<img>` — it redirects to Mapbox Static Images, which `/_next/image` must not proxy.
- **Hero un-gated from auth (user-approved trade).** `LandingHero` is passed as a server-rendered `marketingHero` prop through the client boundary and renders during auth loading and signed-out; only `LandingHeroReturning` + `LandingPersonalStrip` remain auth-gated. A signed-in visitor sees a brief marketing→returning hero swap (~100–300ms, same background photo). The full-page spinner is gone; below-the-fold sections render immediately for everyone.
- **Quick wins in the same PR:** explicit `revalidate = 60` on `/` (was already implicitly 60s via the `unstable_cache`d bill count — now survives refactors); `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` on `/api/search` success responses (anon client, public data — same policy as `/api/bills/browse`); hero re-encoded 91KB JPG → 28KB webp q75 and preloaded from the head with `fetchPriority=high` (CSS backgrounds are invisible to the preload scanner); unused `dayjs` uninstalled.
- **Investigated and dropped:** `experimental.optimizePackageImports` for MUI/lucide (already in Next 15's default list — adding it is a no-op; don't re-suggest); Tailwind removal (load-bearing — layout shell + form utilities); further `next/dynamic` splits on `BillDetailView` (no heavy imports left).

**Measured (local prod build, Lighthouse 12.8.2):** home desktop 68→**97** (LCP 2.2s→1.1s, TBT 404→13ms); home mobile 30→**53** (TBT 2345→263ms); members desktop transfer **31.2MB→1.2MB**, members mobile LCP 122s→8.1s; bills desktop 89→97 (sponsor avatars were on the browse cards too — transfer 2.8MB→1.2MB).

**Known remainders (deliberate, → perf pass 2):** home/browse mobile scores are now bundle- and render-blocking-bound, not image-bound — Typekit CSS blocks ~870ms on throttled mobile; the landing map preview eagerly pulls the 462KB mapbox chunk + ~590KB GeoJSON + tiles on `/` after hydration. Planned: defer the landing map until in-viewport, async Typekit (drop if the Georgia→aesthet-nova FOUT reads badly), `mapshaper`-simplified GeoJSON, `loading.tsx` skeletons, roster `select('*')` narrowing.

**Revisit if:** Vercel Hobby image-transformation quota becomes a constraint (276 thumb sources + ~600 portraits × few breakpoints, all cacheable — well within limits today), or a portrait host changes domains (add to both allowlists).

---

## 2026-07-03 — Performance pass 2: render-blocking fonts, eager map, GeoJSON, skeletons

**Trigger.** Pass-1 measurement (§ above) showed the remaining mobile cost was bundle/render-blocking-bound: Typekit CSS blocked ~870ms of first paint, and the landing map preview eagerly fetched the 462KB mapbox chunk + ~1.9MB district GeoJSON + tiles on every home visit. Branch `perf/speed-optimization-2`, stacked on pass 1.

**Decisions.**

- **Landing map preview mounts only near-viewport.** An `IntersectionObserver` (400px rootMargin) in `LandingMapSection` gates mounting the `next/dynamic` preview; the placeholder box keeps the slot size (no CLS); environments without IO load immediately. The dynamic import alone never prevented the *fetch* — only the bundle split.
- **District GeoJSON simplified 64% (1.9MB → 672KB).** `mapshaper -simplify visvalingam weighted 40% keep-shapes`, coordinates 14 → 5 decimals (~1m). All 100+38 features preserved. **Accuracy gate:** point-in-polygon district assignment (`findDistrictFeatureAtPoint` drives "find my legislators") validated against the originals on a ~2,600-point in-state grid per chamber — 0.076% of points flip, all boundary-adjacent, none to-null; within geocoding error. Re-run that check if these files are ever regenerated.
- **Typekit non-blocking + metric-adjusted fallback face (the hard-won one).** The stylesheet moved to preload-as-style + inline-script attach (+`<noscript>`). First attempt shipped without font-metric compensation and **CLS exploded 0.02 → 0.65+ on detail pages** — aesthet-nova bold is ~16% narrower than Georgia, so long bill-title headings re-wrapped on swap and pushed the footer. Fix: `aesthet-nova-fallback` `@font-face` pair (local Georgia, `size-adjust` 83.1% bold / 92.8% regular, canvas-measured against the live kit; post-adjust widths match <0.1%) slotted into `FONT_HEADING` + `--font-display`. **Lesson: never ship an async font swap without a size-adjusted fallback face — measure, don't eyeball.**
- **Browse `loading.tsx` scoped via `(browse)` route groups.** First attempt put fallbacks on detail segments too; detail routes are dynamic, so every visit streamed spinner → content (CLS 0.67). Browse index pages (+ house/senate) moved into `(browse)` groups so their `BrowseLoadingSkeleton` (Container-lg + CardGrid mirror) no longer wraps `[id]`/`[slug]`; detail fallbacks removed — detail pages measure best with none. URLs unchanged.
- **Roster `select('*')` narrowing — investigated, dropped.** `ky_legislators` has only 22 columns, ~1KB/row, one cached fetch per hour — the "70-column over-fetch" from exploration was wrong; narrowing saves nothing measurable. `IN_MEMORY_FILTER_CAP=1000` reviewed and kept — already documented as deliberately aligned with PostgREST's 1000-row response cap, with an honest `capped` flag and UI caveat; raising it means SQL-side filtering (feature work, not a perf tweak).
- **Fuller home server-split (pass-1 "D5") — not needed.** Post-fix home mobile LCP is ~5.2s (from 11.4s baseline), bound by the hero image racing ~1.9MB of JS on throttled 4G. The lever left is bundle size (MUI/emotion/shared chunks ~250KB gz), a separate project — not a hero-rendering problem anymore.

**Measured (local prod build, Lighthouse 12.8.2, vs pre-pass-1 baseline → after pass 2):** home 68→98 desktop / 30→74 mobile; bills 89→95 / 60→76; members 97→98 / 59→74; bill detail 98→99 / 73→81; member profile 93→97 / 73→76. FCP ~250–300ms desktop and ~0.9–1.2s mobile sitewide (baseline: ~800ms / 2.6–6.4s). CLS ≤0.031 everywhere.

**Revisit if:** the Typekit kit's font files change (re-measure the size-adjust ratios), district GeoJSON is regenerated (re-run the PIP parity check), or a future pass targets shared-bundle size (the remaining mobile LCP lever).

---

## 2026-07-04 — Meetings + committees UX pass (browse scannability, next-meeting orientation)

**Trigger.** First dedicated UX pass on `/meetings` and `/committees` since the 2026-06-12 a11y-focused audit. In-browser review (desktop + 375px) found the surfaces structurally sound but weak at the two questions civic users actually bring: *"what's happening, and when?"* (meetings) and *"is this committee active?"* (committees). Branch `feat/meetings-committees-uiux`.

**Findings → decisions.**

- **/meetings list gets day-group headers; cards drop their date row there.** The grid repeated "Mon, Jul 6, 2026" on every card with no visual chronology. Meetings now group under `Today · Monday, July 6, 2026`-style `h2` headers (weekday + Today/Tomorrow prefixes); `CommitteeMeetingCard` gains `hideDate` so the heading carries the date (also applied in the calendar's selected-day panel, which had the same redundancy). Cards' aria-labels keep the full date for screen readers.
- **Cancelled meetings de-emphasized, not hidden.** 5 of the first 8 "Upcoming" cards were full-weight red-chip Cancelled cards — cancellations visually outranked meetings actually happening. Cancelled cards render at `opacity 0.68` (full opacity on hover) with "(cancelled)" appended to the aria-label. Kept in the list: a cancellation is real information during interim.
- **"Recent" now sorts newest-first.** The list fetch is date-ascending (right for Upcoming); Recent was showing the oldest past meeting first. Reversed for the recent range only.
- **Committee detail: meetings split Upcoming (soonest first) / Past (newest first); the next meeting leads, chipped, agenda pre-expanded.** The server hands meetings newest-first, which buried the *next* meeting (2 days out, 13 agenda items) at position 5 under Nov/Oct/Sep interim dates. The next non-cancelled upcoming meeting also gets a "Next meeting" `info` chip and its agenda opens expanded — it's the page's headline question.
- **Meeting deep links.** Every meeting card on the detail page gets `id="meeting-<id>"` + scroll margin; `CommitteeMeetingCard` (meetings browse + calendar) now links to `/committees/<slug>#meeting-<id>` (footer copy "View committee" → "View meeting details"), and quick-facts "View agenda →" targets the specific next meeting. A mount-time hash effect expands the linked meeting's agenda. Previously, a meeting card dropped users at the top of the committee page to hunt for the meeting themselves.
- **/committees cards get a next-meeting signal; subcommittees sort after full committees.** Cards showed only kind tags + leadership — no way to tell an active committee from a dormant one. Card footers now show `Next meeting · <date>` (from data the enriched browse fetch already loaded — zero new queries) or "No upcoming meetings scheduled." Default sort demotes names containing "subcommittee" below full committees (alpha within each group) — the alphabetical wall of Budget Review subcommittees was burying every major committee below the fold.
- **Committee detail header decluttered.** Removed: the "← All committees" button (breadcrumbs already provide the path), the duplicate "Meeting materials" official link (same URL as the LRC profile link two lines up), and the `height: '100%'` stretch on the overview card (two lines of text stretched to match the quick-facts column — pure dead space).

**Data finding (not in this PR):** `/committees` shows near-duplicate rows "Commission on Race **&** Access to Opportunity" / "Commission on Race **and** Access to Opportunity" with meeting data split across them — the § 2026-06-12 merge failure class, but the &/and variant evades the audit's depluralized-name near-dupe guard. Spawned as a dedicated data-reconciliation task (merge via existing tooling + teach the guard `&`≡`and`), per the § 2026-06-12 rule that follow-bearing record merges don't ride UI PRs.

**Deferred:** agenda previews on browse meeting cards (needs an agenda fetch the browse path doesn't do; calendar day-panel + detail deep links cover the need for now); real portraits on committee-card leadership avatars (initials-only today, and two "SR" co-chairs on one card demonstrate the ambiguity).

**Revisit if:** LRC posts intra-day meeting times in a parseable form (day groups could then order by time); the subcommittee-last sort confuses anyone looking for Budget Review subs specifically (a name-filter input would be the fix, not a sort revert).

---

## 2026-07-04 — Committee record merge, round 2: the 10 seed rows the June merge couldn't see

**Trigger:** the § 2026-07-04 UX pass data finding — `/committees` listed both "Commission on Race **&** Access to Opportunity" (calendar-synced row, no upcoming meetings shown) and "Commission on Race **and** Access to Opportunity" (seed row holding the future interim meetings).

**Diagnosis — same failure class as § 2026-06-12, new instances, and *not* a guard evasion.** `diagnose:committee-duplicates` found **10 high-confidence pairs** (not 1), every one a migration-027 seed row (short type code `IJ`/`S`, seed-style slug, `created_at` 2026-05-22, future meetings from the Interim Calendar **PDF backfill**) paired with a full-label row the live calendar sync minted on 2026-06-13/20/27. These committees simply hadn't appeared on the live legislative calendar by the 2026-06-12 merge — they were single rows then, and became pairs one by one as interim season progressed. Two corrections to the finding as originally recorded:

- **The &/and variant does not evade the audit guard.** `normalizeCommitteeNameForDupes` already folds `&` → "and" (both Race names normalize identically), and the same-`lrc_rsn` check flags the pair regardless of name. **No guard change needed; none made.**
- **The weekly audit had been warning all along** — 10 `[WARN] near-duplicate committee rows share lrc_rsn …` lines in every completed run since 2026-06-14 (see run 28318388587's log). The warnings reached the status digest but weren't acted on; the two most recent runs also didn't complete cleanly (6/21 timeout-cancel → fixed § 2026-06-27; 6/28 quota-stop false-red → fixed § 2026-06-28), which muffled the signal exactly when the pair count peaked.

**Merge applied to primary 2026-07-04** (`merge:duplicate-committees --live`, auto mode — all 10 pairs were clean same-rsn short/full splits, no `--pair` overrides needed): 166 actions, `ky_committees` **66 → 56 rows**, report `reports/committee-merge-2026-07-05T00-28-38-669Z.json`.

- **Survivor = the full-label row**, same rule as June — verified against live behavior before merging, not assumed: current calendar syncs upsert full-label rows (`updated_at` 2026-07-04 on state/local-government survivors; survivor meetings carry `source_url=…/legislativecalendar` vs the losers' PDF-backfill URL). The Race survivor keeps the "**&**" name because that is what LRC's calendar emits.
- Losers' PDF-backfilled future meetings moved to survivors (Race: Jul 20 → Nov 18 now on the canonical row); collided same-date meetings merged per the June date-only rule; loser slugs appended to `aliases` (alias 308-redirect verified on `/committees/commission-race-access-opportunity`).
- The 3 diagnose **SUSPECT** pairs (House Budget Review subs vs joint Budget Review subs) are genuinely distinct committees (different `lrc_rsn` + chamber) — left alone.
- Verified on a local dev server against primary: `/committees` renders one Race commission card with "Next meeting · Mon, Jul 20, 2026"; 56 committees total. (kyvky.com may serve the cached list briefly until revalidation.)
- Script quirk noted, not fixed: dry-run "plans" over-count vs live (188 vs 166) because dry-run's collided-meeting event repoints don't persist, so step 3 re-lists the same events. Cosmetic; live counts are correct.

**Revisit if:** a short-type row reappears (only two sources: a fresh-DB 027 re-seed — the § 2026-06-12 suggestion to re-cut the seed with full-label types is now the *known* fix for the last latent instance of this class — or LRC flipping the `CommitteeType` param back; the weekly same-rsn warn catches both); audit `warn` findings again age for weeks unactioned (the digest carries them, but nothing escalates a warning that repeats N weeks running).

---

## 2026-07-04 — Supabase security advisor: search_path pinning + definer RPC revokes (migration 037)

**Trigger:** the Supabase security advisor showed 12 warnings — 5 × `function_search_path_mutable`, 6 × anon/authenticated can execute a `SECURITY DEFINER` function, 1 × leaked-password protection disabled.

**Migration `037_ky_advisor_function_hardening.sql` (applied to primary 2026-07-04):**

- **Pinned `search_path = public`** (via `ALTER FUNCTION`, no body changes) on the five functions created before the pinning convention: `ky_rate_limit_consume` (008), `ky_increment_counter` (009), `ky_top_legiscan_subject_names` (017), `ky_user_profiles_touch_updated_at` (016), `ky_notification_preferences_touch_updated_at` (019). `public` rather than `''` because the bodies reference tables unqualified — matches the already-pinned `ky_increment_bill_view` / `ky_sync_profile_from_auth_user`.
- **Revoked EXECUTE from `PUBLIC`/`anon`/`authenticated`** on two definer functions that are not public API: `ky_sync_profile_from_auth_user` (fired only by triggers on `auth.users`; Postgres checks EXECUTE at trigger *creation*, not fire time, so triggers are unaffected) and `rls_auto_enable` (**dashboard-created event-trigger function `ensure_rls`, not in the repo** — auto-enables RLS on new `public` tables; returns `event_trigger` so PostgREST couldn't genuinely run it, revoked to clear the finding. Definition recorded here since 037 only alters grants: loops `pg_event_trigger_ddl_commands()` on `CREATE TABLE` in `public` and runs `ALTER TABLE … ENABLE ROW LEVEL SECURITY`).
- **`ky_increment_bill_view` anon EXECUTE kept by design** — the bill detail page increments `view_count` from the browser (`BillDetailView`), and the definer wrapper exists to avoid granting anon `UPDATE` on `ky_bills`. The two advisor warnings on it (0028/0029) are **accepted**, not misses.

**Verified on primary:** `pg_proc.proconfig` + `has_function_privilege` confirm all eight functions pinned and the two revokes in place; anon-facing RPCs smoke-tested (`ky_top_legiscan_subject_names` returns subjects, `ky_rate_limit_consume` allows + bucket cleaned up); **signup path re-proven end-to-end** — Auth admin `createUser` → profile trigger inserted the `ky_user_profiles` row → `deleteUser` cascaded cleanup (a rolled-back `SET ROLE supabase_auth_admin` test wasn't possible; `postgres` can't assume that role on hosted).

**Leaked-password protection (HIBP) — enabled 2026-07-04, all 12 warnings now addressed.** An Auth config toggle, not SQL (Dashboard → Authentication → Sign In / Providers → Email → "Prevent use of leaked passwords", `PASSWORD_HIBP_ENABLED`; the local `supabase` CLI token belongs to a different org, so the Management API path was unavailable — flipped via the dashboard UI in Chrome instead). **Verified against GoTrue directly**, not just the UI (the dashboard SPA went down mid-session — status-page incident): a signup attempt with `password123` now returns `422 weak_password` ("Password is known to be weak and easy to guess"), rejected before any user is created. **User-facing consequence:** sign-ups and password changes with breached/guessable passwords now fail with that GoTrue message; the auth forms surface API error text, so no copy change needed unless users report confusion.

**Revisit if:** a future migration adds a function without `SET search_path` (advisor will re-warn — pin at creation instead of a follow-up 037-style pass), or Supabase's advisor starts flagging the accepted `ky_increment_bill_view` grants at a higher severity.

---

## 2026-07-05 — Accuracy-audit triage (run seed=1288069341): 7 LLM warnings resolved; audit clip was hiding grounding

**Trigger:** the 2026-07-05 weekly run came back `checked=258 ok=251 fail=0 warn=7` — all deterministic domains clean, 7 advisory LLM warnings (1 ai_summary, 3 topics, 3 glossary). Every finding was cross-checked against primary sources before any edit, per the standing advisory rule.

**Triage outcomes:**

- **HB257 (2026 RS) ai_summary "school climate" — FALSE POSITIVE, root cause fixed in the checker.** The summary's claim ("removes … school climate as a state indicator") is stated verbatim in the bill description ("remove quality of school climate and safety as state indicator") — at char ~1,050 of a 1,275-char description, past `llm-review.ts`'s 800-char `clip()`. The auditing model literally couldn't see the grounding the generator saw. **Fix:** description clip raised 800→2,000 in `reviewSummaries` and 500→2,000 in `reviewTopics` (the keyword classifier also runs on the full description, so the shorter topics clip could make keyword-matched tags look unsupported). Weekly sample is ~24 bills, so the token cost is negligible. **Principle: the auditor must see at least the input the system under audit saw.**
- **HB534 (2025 RS) topics — CONFIRMED, keyword gap.** KRS 383 eviction bills use the statutory term "forcible entry and detainer", never "eviction", so Housing scored 0 while `expungement` fired Criminal Justice. Added `forcible entry and detainer` / `forcible detainer` → Housing (full phrases only — bare `detainer` would match criminal jail-detainer bills, bare `forcible entry` burglary bills). Criminal Justice stays on the bill (it *is* about expungement/sealing of records) but Housing now leads: `["Housing","Criminal Justice"]`.
- **SB98 (2016 RS) topics — CONFIRMED, keyword gap.** Healthcare had no `physician` keyword (preceptor/licensure bills say "physician", not "doctor"/"health"). Added `physician` + `physicians` (word-boundary regex misses plurals, cf. the 2026-06-03 `elections`/`voters` lesson). Now `["Healthcare","Taxation"]`.
- **Backfill applied to primary:** `npm run topics:reclassify` — 22,547 scanned, **153 changed** (132 tags added — overwhelmingly Healthcare on physician bills — 1 removed by the max-4 cap). Dry-run reviewed before apply.
- **HB44 (2018 RS) "Voting Rights too narrow; Judiciary missing" — DECLINED (taxonomy limitation, not a tagging bug).** The taxonomy has no Judiciary or Constitutional Amendment topic; "Voting Rights" is a defensible (if thin) tag since the amendment converts judicial elections to appointments with retention elections. Follows the HCR84 precedent (§ 2026-06-03): a 22nd topic is a product decision requiring a corpus-wide re-tag, not a triage edit. Logged in TASKS.md backlog for a deliberate call.
- **Glossary `hb`/`sb` — CONFIRMED (omission).** "then go to the Governor" implied a binary outcome. Both entries now name the three §88 outcomes (sign / veto / become law unsigned) + override by majority of all members in each chamber — phrasing mirrors the existing `timeline_signed` and `enacted` entries.
- **Glossary `timeline_markup` ("Committee Amendments") — MARGINAL, lightly improved.** The rendered copy never said "markup" (the *internal key* is `timeline_markup`, which is likely what the model sniffed); substance was already correct. Reworded to name the KY instruments (committee amendments / committee substitute).
- **Glossary `senate_district` — MODEL PARTLY WRONG, partly right.** Its claim that "you have both a House rep and a Senate rep" holds "only for incorporated areas" is **false** — both district types tile the whole state; the sentence stays. Its second point was right: the entry never said each district elects exactly one Senator. Added, mirroring `house_district`'s "every Kentuckian lives in one" framing.
- **Bonus (same class, previously adjudicated):** `timeline_vote` still said "all 100 House members or all 38 Senators" — the exact framing the 2026-06-08 pass corrected in `floorVote` but missed in the timeline twin. Aligned to "members present".

**Revisit if:** the LLM pass re-flags any of these entries next run (would indicate contradictory-across-seeds, cf. chaptered/fiscal-note residuals), or a Judiciary-shaped cluster of bills grows large enough to justify the taxonomy expansion.

**Round 2 (same session) — pinned-seed re-runs surfaced variance findings; three more fixed, three dismissed:**

- Re-running `--domain=llm --seed=1288069341` confirmed all seven original findings resolved (HB44 excepted by design), but the model — now seeing fuller descriptions — produced new advisory warns each run. Fixed the substantive ones: **HB294 (2019 RS)** Agriculture keyword gap (`\bagriculture\b` misses the adjectival "agricultural program trust fund"; added `agricultural`/`cattle`/`cattlemen`, second backfill: 22,547 scanned, **138 changed**); **HB877 (2026 RS)** summary regenerated — it said "combat-related service injury" where §170's term is "service-connected combat-related disability" (illness qualifies, not just injury); **`timeline_markup` key renamed** `timeline_committee_amendments` (tooltipContent + LegislativeStageTooltip icon map; nothing else references it) — the *internal key* leaked into the audit prompt and drew a repeat "markup is federal terminology" flag against rendered copy that never said markup.
- **`--bill=` flag added to `backfill-bill-summaries.ts`** for this workflow: targets one bill within the session scope and forces regeneration even when the input hash is unchanged.
- **Dismissed per the advisory cap:** SB168 "cannabis businesses" audience (defensible — the amendment guarantees a right to *sell* and grants the GA control over commercial activity; a trial regen kept the clause and added a worse "county governments" inference, so the stored summary stands); "Tabled" glossary (model concedes the entry is "accurate in practice"; its formalist rewrite would mislead more); HB860 (model's own words: "minor overreach").
- **Lesson:** with richer input the LLM pass finds different marginal nits each run rather than converging to zero — triage to substantive fixes, dismiss the long tail, don't chase a clean board.

---

## 2026-07-05 — `Judiciary` added as the 22nd topic (+ boilerplate pre-strip in the classifier)

**Trigger:** the 2026-07-05 audit triage (§ above) backlogged HB44's "Judiciary topic missing" flag as a product decision. Decision made same day: **add it.** The dry-run count settled the "coherent unmet cluster" question the HCR84 precedent asks — **370 bills** (~1.6% of the 22,547-bill corpus) classify as Judiciary under deliberately narrow keywords, and they previously had no home (court-structure bills were tagged Voting Rights via 'election of judges', Criminal Justice via procedure overlap, or nothing).

- **Taxonomy:** `Judiciary` added to `KY_TOPICS`. All consumer surfaces derive from the constant (prefs checkbox grid, browse Topic filter, activity API validation, `Record<KYTopicTag,…>` maps enforced by tsc), so no per-surface wiring; `LANDING_TOPICS` home tiles stay curated as-is. New `topic_judiciary` tooltip entry (subject_topics category, covered by the audit's glossary leg).
- **Keywords (narrow by design):** `judiciary`, `judicial`, `supreme court`, `court of appeals`, `court of justice`, `appellate`, `chief justice`, `family court`, `circuit judge`, `district judge`, `judgeship(s)`. **Excluded:** bare `judge`/`judges` (`\b` matches inside "county judge-executive" — local gov), bare `court(s)` ("fiscal court", "court costs"), and `circuit court`/`district court` ("may appeal to the Circuit Court" is boilerplate in occupational-licensing bills).
- **Boilerplate pre-strip — new classifier mechanism.** Spot-checking the first dry run (396 changed) caught three measured misfire classes: committee-referral clauses ("report to the Interim Joint Committee on Judiciary" — 11 of 39 'judiciary' hits), interstate-compact separation-of-powers language ("executive, judicial, and legislative branches" — 11 of 241 'judicial' hits), and federal-court contingency clauses ("United States Supreme Court" — 3 of 105 'supreme court' hits). Rather than delete the keywords (right only when *most* hits are noise, cf. bare 'emergency'), `classifyTopics` now strips `BOILERPLATE_PATTERNS` from the text before matching. Re-run: 396 → **370 changed** and the spot-checked false positives (HCR20 nurse-examiner study, HB43 EMS compact, SB22 sports wagering) all cleared while HB44/SB190-class bills kept the tag.
- **LegiScan subject bridge:** `TOPIC_TO_SUBJECT_PATTERNS.Judiciary` uses anchored `/^courts?\b/` and `/^judges?\b/` so LRC subjects like "Courts, Circuit" and "Judges" map while "Fiscal Courts" / "County Judge/Executive" don't; plus judicial/judiciary/appellate and the named courts.
- **Backfill applied to primary:** 22,547 scanned, **370 changed** (41 tag displacements from the max-4 cap). HB44 (2018 RS) now `["Judiciary","Voting Rights"]`. Verified in the browser: `/bills?topic=Judiciary` returns exactly 370 bills.
- **Known follow-on:** `topics[]` feeds `summaryInputHash`, so the next `backfill:bill-summaries` run without `--only-missing` will regenerate summaries for re-tagged bills that have one — expected, bounded (only active-session bills carry summaries), not urgent.

**Revisit if:** the weekly audit's topic leg flags Judiciary over/under-reach, or the boilerplate list grows past a handful (at that point consider a smarter referral-clause stripper instead of enumerated phrases).

---

## 2026-07-05 — Scheduled health check (GitHub Actions + Vercel MCP)

**Scope:** no Sentry/Datadog connector is attached to this session; the only monitoring-capable connectors are GitHub (Actions run history) and Vercel MCP. Reviewed all 5 workflows' run history back to the 2026-06-23 health check.

- **No active incidents.** Nothing red at the time of this check; all workflows' most recent runs are green.
- **accuracy-audit.yml confirmed stable post-fix** — run #9 (2026-07-05) succeeded, holding the § 2026-06-28 quota-stop-is-a-skip fix.
- **New, self-healed:** `sync-ky-bills-status.yml` failed 4 times between 2026-07-01 and 2026-07-03 (runs #174/#177/#180/#181), each on a `60000ms` LegiScan API timeout (`getSessionList` and `masterlistraw`, both exhausted 5/5 retries plus the workflow's own one retry). Each failure was followed by a clean run within hours on the next 6h cron tick — treated as transient upstream LegiScan slowness, not a code regression, since nothing shipped to the sync path in that window. Worth re-checking if the timeout rate keeps climbing; 4 failures in 3 days is new (none in the two weeks prior).
- **New, unresolved:** `legislator-links-weekly.yml` run #14 (2026-06-29) failed — not on the LegiScan quota hold (that was a non-fatal skip within a sync that otherwise succeeded 141/141), but because `verify:legislator-links` itself exited 1, meaning it found a genuinely broken outbound legislator link. No fix has landed; the specific URL lives in that run's `reports/legislator-links.json` artifact. Next scheduled run is 2026-07-06.
- **Persisting gap:** the Vercel MCP connector still returns zero projects for this team/org (same as 2026-06-23), so Vercel cron health (digest, committee materials, enrollment actions, health-check) and Sentry-surfaced runtime errors remain unverifiable from a Claude session. Two health-check cycles now with no remediation — either the MCP connector needs to be pointed at the right Vercel project, or this class of check should move to a manual dashboard review cadence instead of relying on the MCP.

Full detail and run links: [TASKS.md § Ops notes (2026-07-05 health check)](./TASKS.md#ops-notes-2026-07-05-health-check).

---

## 2026-07-06

**Voting record UI — split vote types to match the official roll call.** LegiScan distinguishes four positions (Yea / Nay / Not voting / Absent) and the DB has stored them separately since migration 035, but the UI collapsed them: member profiles merged NV + Absent into one amber "Not voting / absent" chip, and bill roll calls showed only Yea/Nay (NV when > 0, Absent never).

- **Shared display mapping** in `src/lib/vote-display.ts` — one label + MUI chip color per `VoteBucket`, used by both member profile and bill roll calls, so vote types can't drift between surfaces. Colors: Yea green, Nay red, **Not voting amber** (present but declined — behaviorally notable), **Absent gray** (not present — neutral). **Trade-off:** Absent shares gray with the rare "Other" bucket; labels disambiguate.
- **Member profile:** separate "Not voting: N" and "Absent: N" filter chips (each rendered only when its count > 0), replacing the combined toggle; `VoteFilter` is now `'all' | VoteBucket`. Per-vote chips keep the official roll-call text (e.g. "Excused") but expand the bare "NV" abbreviation to "Not voting" for readability.
- **Bill roll calls:** added the Absent count chip (with the existing civic tooltip); NV chip label changed "NV: n" → "Not voting: n". Yea/Nay stay filled, non-vote types outlined so decisive counts read as primary. `fetchDbVotes` now selects `absent_count`. NV chip still hides on pre-migration-035 rows (`nv_count` NULL → 0) until a votes re-sync fills it — as of this change production has **no rows with `nv_count` populated**, so bill-page NV chips appear only after the next full votes sync. Per-member "NV" entries in `roll_call` JSONB are unaffected (member profiles show them today).
- **Not done:** `src/components/ui/VotingRecord.tsx` is dead code from a pre-MUI design (federal-style positions, Tailwind classes) — flagged for separate deletion rather than updated.

---

## 2026-07-06 — Apex DNS/IPv6 incident (resolved same day)

**Found during live verification of PR #136:** `https://kyvky.com` (apex, no www) failed with a TLS handshake error (alert 40) for all IPv6-capable clients — most mobile carriers. `www.kyvky.com` was unaffected, which is why it went unnoticed.

- **Root cause:** an `ALIAS @ → 560cb0e1fc1c9ae0c4c1.cf-prod-us-proxy.proxyhog.com` record in the Hostinger DNS zone — a PostHog managed reverse proxy hostname fronted by Cloudflare, added to the **apex** (zone serial dated 2026-07-02, same edit that repointed the A record to Vercel). Hostinger flattens ALIAS records at the nameserver, so the zone editor showed **no AAAA rows** while the nameservers served Cloudflare AAAA answers for the apex. The explicit `A @ 216.198.79.1` (Vercel) shadowed the ALIAS for IPv4, so only IPv6 broke: those visitors reached Cloudflare, which has no cert for kyvky.com.
- **Why deleting it was safe:** production sends PostHog events directly to `us.i.posthog.com` (confirmed by watching live network traffic — `NEXT_PUBLIC_POSTHOG_HOST` is unset, `instrumentation-client.ts` default applies). Nothing referenced a proxy on the domain, and an apex proxy could never coexist with the site anyway.
- **Fix:** deleted the ALIAS row in Hostinger hPanel (Katie, 2026-07-06). AAAA answers cleared from both authoritative nameservers (~4 min, ALIAS-flattening cache TTL 300), verified `curl -6 https://kyvky.com` → 307 → `https://www.kyvky.com/` and full page load in Chrome.
- **If a PostHog reverse proxy is ever wanted:** put it on a subdomain (e.g. `e.kyvky.com` CNAME → the proxyhog target), set `NEXT_PUBLIC_POSTHOG_HOST` in Vercel, and configure the custom domain in the PostHog UI — never on `@`.
- **Lesson for future DNS checks:** Hostinger's zone editor does not show the records ALIAS flattening publishes; diagnose with `dig @athena.dns-parking.com <name> <type>` against the authoritative nameservers, and compare the SOA serial to confirm whether an edit has actually landed.

**Revisit if:** apex TLS errors recur (check for re-added ALIAS/AAAA), or analytics setup changes to a first-party proxy.

---

## 2026-07-06 — Redirect-domain DNS cleanup (Vercel "Invalid Configuration" cleared)

**Follow-up to the same-day apex incident:** the Vercel Domains page flagged `knowyourvoteky.com` and `knowyourvotekentucky.com` as **Invalid Configuration** and `kyvky.com` as **DNS Change Recommended**. All three fixes were DNS edits in Hostinger hPanel; nothing changed in Vercel or the repo.

- **Root cause (redirect domains):** both apex zones carried a leftover Hostinger `AAAA @ 2a02:4780:84::32` alongside the correct Vercel `A @ 216.150.1.1` — the same IPv6-goes-to-Hostinger failure mode as the apex ALIAS incident, just via a plain AAAA record this time. Vercel's error panel named that exact record as the conflict. Deleted it from both zones.
- **216.150.1.1 is Vercel, not parking.** whois: `VERCEL-09 / Vercel, Inc`. An earlier session misread these zones as "Hostinger parking/redirect service" because of this IP — they were already pointed at Vercel, with Vercel handling the 308 → `www.kyvky.com` redirect.
- **kyvky.com recommendation:** Vercel's IP range expansion now recommends `A @ 216.150.1.1` over the older `216.198.79.1` / `76.76.21.21` (which keep working). Updated the apex A record to match; badge cleared.
- **Verified:** authoritative `dig` on all three zones (apexes → `216.150.1.1`, no AAAA); Vercel re-validated all domains to **Valid Configuration** without a manual refresh; curl confirms `kyvky.com` → 307 and all four `knowyourvote*` hosts → 308, all landing on `https://www.kyvky.com/` (200).

**Revisit if:** Vercel flags these domains again (check for re-added AAAA/ALIAS rows in the three separate Hostinger zones — each domain has its own zone editor and nameserver pair).

---

## 2026-07-06 — Vercel MCP connector gap: root cause found (connector lacks "The Eighth Dimension" team grant)

**The 13-day observability gap (first flagged 2026-06-23, re-flagged in three sessions since) is not a token or project-scoping bug — the Claude Vercel connector was never granted the team that hosts the production project.** No repo change fixes this; the record exists so no future session re-diagnoses it from scratch.

- **Evidence chain (all firsthand, 2026-07-06):** `list_teams` through the connector returns exactly one team — `Katie's projects` (Hobby, `team_gmP71OjnH1pcPVIH72YLmfMX`); `list_projects` for that team returns `[]`; Katie confirmed via the Vercel dashboard (driven through Chrome, since the connector can't see it) that the production project lives under **The Eighth Dimension** team. The connector's OAuth grant covers only the Hobby team, so the team hosting `kyvky.com` is entirely invisible — the token "works" but can never find the project.
- **This resolves the 07-05 puzzle** ("the token/connector works, it just can't see the project — re-link the connector to the project"): re-linking within the granted team could never have worked, because the project isn't in that team at all. The project was evidently created under or transferred to The Eighth Dimension at some point, while the connector grant stayed Hobby-only.
- **Misleading breadcrumb — stale `.vercel/project.json`:** the local (gitignored) link file still records `orgId: team_gmP71OjnH1pcPVIH72YLmfMX` with `projectId prj_lZwB7WdEGRqlK27YiVj0zQ5JkE7M`. Vercel MCP tool docs explicitly tell agents to read this file to discover the team ID, so it actively steers every session toward querying the wrong (empty) team. Re-run `vercel link` after the grant lands so the file points at The Eighth Dimension.
- **The fix is operator-only:** claude.ai → Settings → Connectors → Vercel → re-authorize, and include The Eighth Dimension in the team grant. No session can perform this (OAuth flows can't run non-interactively), which is why the gap survived three flags — each session could only re-confirm and recommend.
- **Post-fix verification (any session):** `list_teams` shows The Eighth Dimension → `list_projects` for its team ID surfaces the kyvky project → spot-check `get_project` / `list_deployments` → close the open TASKS.md checkbox and resume Vercel cron/deploy health in the daily checks (digest 11:00, committee materials 13:30, health-check 14:00, enrollment actions 14:45).

**Revisit if:** the grant lands but `list_projects` is still empty (then it's a per-project access restriction inside the team, a different problem than this one).

**✅ RESOLVED same day (2026-07-06):** Katie re-authorized the connector and granted The Eighth Dimension. Verified end-to-end in the same session, exactly per the plan above: `list_teams` now returns The Eighth Dimension (`team_xthrGK3NQ3gA0f3mBKQ4PFmN`; the Hobby team no longer appears — the new grant replaced it, which is fine since nothing lives there); `list_projects` surfaces `know-your-vote-kentucky` (`prj_lZwB7WdEGRqlK27YiVj0zQ5JkE7M` — **same project ID as the stale link file**, confirming the project kept its ID through a team transfer and only the `orgId` went stale); `list_deployments` returns full history — latest production deploy (PR #139 merge, `ce86f45`) READY, 20/20 recent deployments READY. The local `.vercel/project.json` `orgId` was updated to the new team ID in the same pass (equivalent to re-running `vercel link`). TASKS.md checkbox closed; daily health checks can resume Vercel cron/deploy verification via MCP.

---

## 2026-07-06 — Editor-verified notes channel for AI bill summaries (extends § 2026-06-26) + bill-text-versions UI

**Trigger:** first reader-impact feedback (FEEDBACK.md **#4** — an Amvets post trustee on HB904's charitable-gaming device-placement rule). The provision is real (verified against 2026 Ky. Acts ch. 184, Section 29, reenacting KRS 238.538(11)) but invisible to the summary pipeline: generation grounds ONLY in title/description/topics/subjects, never full bill text, so HB904's summary omitted it and "Who it may affect:" couldn't name veterans service organizations.

- **Mechanism — `editor_notes` on `ky_bills` (migration 038):** human-verified facts fed into BOTH the generation prompt (as authoritative grounding, "NOT license to speculate") AND `ai_summary_input_hash`. **Rejected alternative:** manual `ai_summary` edit — the 6h sync cron regenerates on input change (silently reverting it), `ai_summary_model` provenance would lie, and the weekly accuracy audit would flag the unsourced claim as a hallucination.
- **Hash rule (load-bearing):** `editor_notes` joins the hash payload **only when non-empty**. Adding the key unconditionally would change every bill's hash and mass-regenerate the whole session in 300-bill cron waves. Conditional inclusion keeps note-less hashes byte-identical; setting/editing a note auto-regenerates that bill on the next backfill pass.
- **Content rules:** verified facts ONLY, checked against the official bill/act text, section cited. Never analysis, speculation, or advocacy (the reader's "small posts can't comply" stays out; naming VSOs in the audience clause is the grounded version of that concern). Set via `scripts/set-bill-editor-note.ts`; provenance narrative in FEEDBACK.md.
- **Honesty surfaces:** `AiGeneratedBlock` gains `editorVerified` — overline becomes "AI-generated from bill data and editor-verified notes — always verify with primary sources". The accuracy audit's `reviewSummaries` now receives `editorNotes` and is told to treat them as valid grounding (same lesson as the description-clip fix of 2026-07-05).
- **Bill-text-versions UI (same feedback, second gap):** the placement rule entered HB904 via substitute/amendment, and the page showed no document versions. Sync + schema were already done (migration 036 `legiscan_texts`, zero extra LegiScan quota — texts[] rides the existing getBill call); added a "Bill Text Versions" card on the bill page listing every version newest-first (date, then Chaptered>Enrolled>Engrossed finality tie-break) with a "Most current" chip and official `state_link` links. Rows synced before migration 036 stay empty until their next detail sync — the card hides itself.

**Revisit if:** notes accumulate to where a history/audit trail matters (then a table), or readers report confusion between "editor-verified" and "AI-generated" wording.
