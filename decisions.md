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
