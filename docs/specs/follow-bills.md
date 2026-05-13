# Spec — Follow Bills + Email Digests

Status: Draft (2026-05-10)
Owner: TBD
Depends on: existing Supabase Auth, `ky_bills` sync pipeline, Vercel cron

---

## Goal

Let signed-in users follow specific bills and/or KY topic categories and receive a **daily email digest** at 7:00 AM ET when followed bills hit selected legislative events. Keep emails factual using verified data already in `ky_bills` — no AI-generated summaries in v1.

## Non-goals (v1)

- Real-time/instant push notifications
- SMS, web push, RSS
- AI-generated "what this means" copy in emails
- Anonymous (no-account) email follows
- Profile photos / avatars
- Custom user-defined topics outside the fixed KY 20

---

## Pre-build verification (resolve before M3)

Inline UI assumptions in this spec are reasonable but **unverified against the live components**. Confirm or revise these before building the Follow UX milestone:

- [ ] **`KYBillCard` has room for a bookmark/followed indicator** — review existing card layout, identify placement that doesn't crowd existing affordances (bill number, status pill, sponsors, etc.); confirm icon size meets 44×44 touch target if interactive, or is decorative-with-aria-label if status-only.
- [ ] **Bills browse can absorb a "Following" filter chip** — review existing filter UI; confirm the chip pattern is consistent with current filters; decide chip placement order and whether it lives alongside topic chips or in a separate filter group.
- [ ] **Topic chip component supports a "followed" visual variant** — confirm filled vs. outlined treatment is achievable in the existing chip component without forking; verify contrast for both states meets WCAG AA.
- [ ] **Bill detail action row has space for a Follow button** — confirm placement keeps "read the bill" as the visual primary action; decide button style (text/icon/both) consistent with existing secondary actions on the page.
- [ ] **`/profile` shell exists or needs to be built** — the current `/profile` page shows only `user.email` and links to dashboard. Confirm scope of the profile rebuild (panels, navigation between sections, mobile layout).

Outcome of this pass should land in `decisions.md` and adjust M1 / M3 scope as needed.

## User stories

1. As a signed-in user, I can click **Follow** on a bill detail page and start receiving updates about that bill.
2. As a signed-in user, I can follow one or more KY topics and get notified when any bill in those topics hits a selected event.
3. As a user, I can choose which **event types** trigger emails (defaults: major milestones only).
4. As a user, I can choose digest frequency: **daily** (default), **weekly**, or **off**.
5. As a user, I can manage my followed bills/topics and preferences from my profile.
6. As a user, I can one-click unsubscribe from a digest email without logging in (token-based).
7. As a new user, I can sign up with email + password, verify my email, and recover my account via password reset.

---

## Account & profile model

### Auth flows (built on Supabase Auth)

| Flow | Surface | Notes |
|---|---|---|
| Sign up | `/auth/register` | Email + password; Supabase sends verification email |
| Email verification | redirect to `/auth/verify` | Confirms `email_verified_at` in profile |
| Sign in | `/auth/login` | Existing |
| Password reset | `/auth/forgot` → emailed link → `/auth/reset` | Supabase magic link |
| Change email | `/profile/security` | Re-verification required |
| Change password | `/profile/security` | Requires current password |
| Resend verification | banner CTA on un-verified sessions | |
| Delete account | `/profile/security` | Hard delete; cascades to follows + prefs + logs |

### Profile page (`/profile`)

The **only** management surface for v1. No separate dashboard. Sections:

- **Account** — display name, email (with change/verify state)
- **Notifications** — frequency + event-type checkboxes + topic filter grid
- **Followed bills** — plain list with unfollow button, links to bill detail
- **Followed topics** — plain list with unfollow button (inline with prefs grid is fine)
- **Security** — password change, email change, delete account

No profile photo. No public-facing profile pages in v1. No dashboard, activity feed, or digest preview in v1.

### Surfacing followed state in existing UI

Rather than building a destination page, weave followed state into surfaces users already visit:

1. **Bill detail (`/bills/[id]`)** — Follow toggle button (solid state when followed).
2. **`KYBillCard` in browse + search** — small bookmark/star icon, filled when followed.
3. **Bills browse filter** — add a **"Following"** chip alongside existing filters; query param `?follows=me` scopes the existing browse view to followed bills. No new page.
4. **Topic chips** — followed topics get a subtle visual treatment (filled vs outlined) across browse and search.
5. **Bill detail topic-follow hint** — a quiet line like *"You follow Healthcare"* when a bill matches a topic the user follows but isn't individually followed. Helps users understand *why* an email arrived.

Email digest overflow link ("and N more updates") points to `/bills?follows=me`, the same filtered browse view.

---

## Notification preferences

### Frequency (radio, one of)

- `daily` — **default**, 7:00 AM ET digest
- `weekly` — Monday 7:00 AM ET digest
- `off` — paused, but follows are retained

### Event types (checkboxes)

★ = included in "Major milestones only" preset (default for new accounts)

- ★ Introduced (new bill matching a followed topic)
- ★ Committee action (referred / reported / amended in committee)
- ☐ Hearing scheduled
- ★ Floor vote recorded
- ★ Passed chamber
- ★ Sent to Governor
- ★ Signed into law / Vetoed
- ☐ Veto override attempt
- ☐ Amendment filed
- ☐ New cosponsor added
- ★ Dead / failed

Two preset buttons: **Major milestones only** (★) and **Everything**.

### Topic filters

Checkbox grid of the 20 KY topics from `KY_TOPICS` ([src/lib/ky-topic-classifier.ts:9](../src/lib/ky-topic-classifier.ts)). Empty selection = no topic-following (individual bill follows still active). All selected = follow events on every topic.

**Known caveat:** `ky_bills.topics` is heuristic (keyword classifier with optional AI fallback). Bills may be mis-tagged or untagged. User-visible help text should note that individual bill follows are the most reliable way to track a specific bill. Whether to expand AI tagging is an open investigation (see Resolved Decisions §4); for v1, the preferences UI should also expose official `legiscan_subjects` filtering if/when that pathway is wired in.

---

## Data model

Three new tables, one new column on profiles.

### `ky_user_profiles` (new)

```sql
CREATE TABLE ky_user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT NOT NULL,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Populated via Supabase Auth trigger on `auth.users` insert.

### `ky_notification_preferences` (new)

```sql
CREATE TABLE ky_notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_frequency TEXT NOT NULL DEFAULT 'daily'
    CHECK (digest_frequency IN ('daily', 'weekly', 'off')),
  event_types TEXT[] NOT NULL DEFAULT ARRAY[
    'introduced','committee_action','floor_vote','passed_chamber',
    'sent_to_governor','signed_or_vetoed','dead'
  ],
  topic_filters TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  unsubscribed_all_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `ky_bill_follows` (new)

```sql
CREATE TABLE ky_bill_follows (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bill_id BIGINT NOT NULL REFERENCES ky_bills(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, bill_id)
);
CREATE INDEX idx_bill_follows_bill ON ky_bill_follows(bill_id);
```

### `ky_topic_follows` (new)

```sql
-- Convenience: persisted as JSONB in preferences.topic_filters for v1.
-- Promote to its own table only if we need per-topic timestamps / analytics.
```

(Keeping topic follows inside `ky_notification_preferences.topic_filters` for v1 simplicity.)

### `ky_bill_status_history` (new)

Needed to detect "what changed since last digest." Append-only.

```sql
CREATE TABLE ky_bill_status_history (
  id BIGSERIAL PRIMARY KEY,
  bill_id BIGINT NOT NULL REFERENCES ky_bills(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,   -- e.g. 'introduced','committee_action','floor_vote'...
  event_payload JSONB NOT NULL, -- canonical event details from LegiScan
  legiscan_change_hash TEXT,   -- dedupe key
  observed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_bill_history_bill_observed ON ky_bill_status_history(bill_id, observed_at DESC);
CREATE UNIQUE INDEX uq_bill_history_dedupe ON ky_bill_status_history(bill_id, event_type, legiscan_change_hash);
```

Sync pipeline writes here on each diff.

### `ky_notifications_log` (new)

```sql
CREATE TABLE ky_notifications_log (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  digest_window_start TIMESTAMPTZ NOT NULL,
  digest_window_end TIMESTAMPTZ NOT NULL,
  event_ids BIGINT[] NOT NULL,
  resend_message_id TEXT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  delivery_status TEXT NOT NULL DEFAULT 'sent'  -- sent | failed | bounced
);
CREATE INDEX idx_notifications_log_user ON ky_notifications_log(user_id, sent_at DESC);
```

### RLS

All five tables: enable RLS. Policies — users can `SELECT`/`UPDATE`/`DELETE` their own rows only. Service role (used by cron) bypasses RLS.

---

## API surface

| Route | Method | Purpose |
|---|---|---|
| `/api/bills/[id]/follow` | `POST` / `DELETE` | Follow / unfollow a bill (auth required) |
| `/api/me/preferences` | `GET` / `PATCH` | Read/update notification prefs |
| `/api/me/follows` | `GET` | List followed bills + topics |
| `/api/unsubscribe/[token]` | `GET` | One-click unsubscribe page (no auth); sets `unsubscribed_all_at` |
| `/api/cron/notify` | `POST` | Cron-triggered digest builder + sender (CRON_SECRET-gated) |

UI:
- "Follow" toggle button on `src/app/bills/[id]/page.tsx`
- Bookmark indicator on `KYBillCard` for followed bills (browse + search)
- `?follows=me` query-param filter on bills browse
- Followed-topic visual treatment on topic chips across browse + search
- Notification preferences + followed-bills/topics lists on `/profile`

---

## UX states & hierarchy

Applied per the project UI/UX principles (clarity > consistency > efficiency; surface state explicitly; hierarchy is a decision).

### Follow button (bill detail)

- **Primary action on bill detail remains "read the bill"** — Follow is a *secondary* action, placed in the bill action row, not as the page primary CTA.
- States: `idle (not followed)` → `loading (pending API)` → `followed (solid)` → `error (revert + inline retry)` → `signed-out (button shows "Sign in to follow")`.
- Optimization: efficiency for return users; clarity for first-time users (label reads "Follow" not "★").

### Bookmark indicator on `KYBillCard`

- Status, not action. Non-interactive icon; click-through opens the bill.
- States: hidden when not followed; visible solid icon when followed; respects `prefers-reduced-motion` (no animation on state change).
- Accessibility: icon has accessible name ("Followed"); not conveyed by color alone.

### `?follows=me` browse filter

- Renders as a filter chip in the existing browse UI, consistent with current chip patterns.
- Empty state: *"You haven't followed any bills yet. Browse current bills and tap Follow to start tracking."* with primary action linking back to unfiltered browse.
- Disabled / hidden for signed-out users (filter requires an account).

### Topic chip styling

- Followed topics use a filled chip; unfollowed use the existing outlined chip. Re-uses the existing chip component — no new variant.
- Accessibility: visual treatment paired with screen-reader text (e.g., "Following: Healthcare"); not color-only.

### Profile page (`/profile`)

- **Primary action: save notification preferences.** Visual hierarchy puts the Notifications panel above the followed-bills list, with Account and Security as supporting sections.
- States for every panel: `loading (initial fetch)`, `saving`, `saved (transient toast)`, `error (inline, with retry)`.
- Followed-bills empty state: *"You're not following any bills yet."* with link to bills browse.
- Followed-topics empty state: *"You're not following any topics. Pick from the categories above to get matching bills in your digest."*
- **Friction tiers:**
  - Unfollow a bill / topic: one click, no confirmation (low consequence, easily reversed).
  - Toggle digest off: one click, confirmation toast ("You won't receive digests until you turn this back on").
  - Delete account: full confirmation modal requiring typed email (irreversible, high consequence).

### Email digest

- Zero events in window → **do not send** (no empty emails).
- Partial render failure (one bill template throws) → log to Sentry, send remaining events, footer note "Some updates couldn't be displayed."
- Every email includes a visible one-click unsubscribe link and `List-Unsubscribe` header.

### Defaults (carry the most weight)

- New account: digest frequency = `daily`, event types = "Major milestones only" preset, topic filters = empty (user opts into topics explicitly).
- Rationale: opt-in to topics avoids users getting unexpected mass emails right after signup; daily digest matches legislative pace; major milestones reduces noise for users who never customize.

## Sync + diff pipeline

Augment existing `ky-sync-pipeline.ts`:

1. On each bill update from LegiScan, compute a stable `legiscan_change_hash` from the change record.
2. Classify the change into one of the event-type tags above.
3. Insert into `ky_bill_status_history` (UNIQUE constraint dedupes replays).
4. No email sent at sync time — sending is owned by `/api/cron/notify`.

## Digest job

Cron entries (add to `vercel.json`):

- `0 11 * * *` — daily digest (7 AM EDT / 6 AM EST)
- `0 11 * * 1` — Monday weekly digest (same UTC time)

Job logic (`/api/cron/notify`):

1. Determine digest window: from each user's last `ky_notifications_log.sent_at` (or 24h / 7d back).
2. For each user with `digest_frequency != 'off'`:
   - Collect `ky_bill_status_history` rows where `observed_at` is within window AND
     (bill ∈ user's `ky_bill_follows` OR bill.topics intersects user's `topic_filters`) AND
     `event_type` ∈ user's `event_types`.
   - If zero events → skip (no empty emails).
   - Render React Email template with grouped bill events.
   - Send via Resend; record `resend_message_id` in `ky_notifications_log`.
3. Resend errors → log to Sentry; mark `delivery_status='failed'`.

Idempotency: `ky_notifications_log` records the event-id set, so a crashed/retried run won't double-send for the same window.

---

## Email

**Provider:** Resend (free tier: 3k/mo, 100/day — fine for v1).
**Domain:** **`kyvky.com`** (canonical; verify in Resend). Legacy hosts (`knowyourvotekentucky.com`, `.org`, `knowyourvoteky.com`, `www.*`) should point at Vercel; **`next.config.ts`** redirects them to `https://kyvky.com`.
**From:** `alerts@kyvky.com` (or another address on the verified domain)
**Reply-to:** `no-reply@kyvky.com` (or `hello@...` if desired)

**Templates** (React Email components in `src/lib/email/templates/`):

1. `WelcomeEmail` — sent on first email verification
2. `BillDigest` — daily/weekly digest with grouped bill events
3. `PasswordResetEmail` — handled by Supabase, styled later

**Digest content per bill:**
- Bill number + short title (linked to bill detail)
- One line per event in window: event label + date + LegiScan source link
- Status verbatim from `ky_bills.status` (no AI rewording)
- Sponsor names (already in `ky_bills.sponsors`)

**Required compliance:**
- One-click unsubscribe link (`/api/unsubscribe/[token]`) in every email
- `List-Unsubscribe` header set by Resend integration
- Plain-text alternative auto-generated

---

## Configuration / env vars

Add to `env-template.txt`:

```
RESEND_API_KEY=
RESEND_FROM_EMAIL=alerts@kyvky.com
APP_PUBLIC_URL=https://kyvky.com
```

`CRON_SECRET` already exists.

---

## Resolved decisions

1. **DST handling for cron** — single Vercel cron at **11:00 UTC** daily (7 AM EDT / 6 AM EST). Accept the 1h shift across DST. Weekly digest: `0 11 * * 1`. **Follow-up:** verify this is the right send time after the first DST transition or once open-rate data exists (task in TASKS.md).
2. **Welcome email** — sent on **first successful email verification**, not at signup. Protects Resend deliverability reputation by skipping unverified addresses.
3. **Digest cap** — **10 events max per email**, grouped by bill, newest-first within each bill, milestone events (★) prioritized. Overflow footer line: *"and N more updates — view all on your followed bills"* linking to `/bills?follows=me`.
4. **Re-classify untagged bills with AI** — **postponed.** Decision blocked on investigation: how do project-defined `ky_bills.topics` (vs. LegiScan's official `legiscan_subjects`) currently surface in the frontend, and what is the user-visible cost of an untagged bill? Prioritize official LegiScan subjects in this feature where possible; only revisit AI-fallback tagging once frontend impact is understood. Investigation tracked in TASKS.md.

---

## Out of scope, parked for v2+

- AI "what this means" summary line per event
- SMS / web push
- Per-bill notification overrides (e.g. "for HB 23, only notify on signed/vetoed")
- Public profile pages
- Comment / social features
- Shareable "my followed bills" list
- Digest preview in profile
