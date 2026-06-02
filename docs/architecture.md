# Architecture map

A visual orientation to the KYvKY codebase. Keep this file high-level — for current work, see [TASKS.md](../TASKS.md); for rationale, see [decisions.md](../decisions.md).

## Data flow

```
┌──────────────────────────────────────────────────────────────────────────┐
│  External sources                                                         │
│  ─────────────────                                                        │
│  LegiScan API  ──┐                                                        │
│  Open States  ───┤                                                        │
│  KY LRC (HTML) ──┤                                                        │
│  Mapbox geo  ────┘                                                        │
└────────────┬─────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Sync orchestration  (src/lib/ky-sync-pipeline.ts)                       │
│  ─────────────────────────────────────────────────                       │
│  Triggered by:                                                           │
│   • Vercel Cron → /api/sync?source=…                                     │
│   • GitHub Actions → /api/sync?source=lrc-calendar                       │
│   • Manual → npm run sync:ky[:source]                                    │
│                                                                          │
│  Per-source clients:                                                     │
│   ky-legiscan-client · ky-openstates-client                              │
│   ky-lrc-calendar-sync · ky-lrc-committee-materials-sync                 │
│                                                                          │
│  Side effects:                                                           │
│   • Upsert into ky_bills / ky_legislators / ky_committees / ky_votes…    │
│   • Record diff events → ky_bill_status_history, ky_committee_events     │
│   • Update ky_sources timestamps                                         │
│   • Increment counters in ky_sync_state                                  │
└────────────┬─────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Supabase / Postgres  (supabase/migrations/001–029)                      │
│  ──────────────────────────────────────────────────                      │
│  Civic data:    ky_bills, ky_legislators, ky_votes, ky_committees,       │
│                 ky_committee_calendar_*, ky_committee_materials          │
│  User data:     ky_user_profiles, ky_bill_follows, ky_committee_follows, │
│                 ky_notification_preferences, ky_saved_searches,          │
│                 ky_notifications_log                                     │
│  Event log:     ky_bill_status_history, ky_committee_events              │
│  Ops:           ky_sources, ky_sync_state, ky_rate_limit_buckets         │
└────────────┬─────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Next.js App  (App Router — src/app)                                     │
│  ───────────────────────────────────                                     │
│  Server components + Route Handlers (src/app/api/*)                      │
│   • Browse / detail pages: unstable_cache + revalidate                   │
│   • /api/me/* : Bearer-token auth (Supabase JWT)                         │
│   • /api/sync : Bearer SYNC_API_KEY / CRON_SECRET                        │
│                                                                          │
│  Client islands: Mapbox map, follow toggles, filter UIs                  │
└────────────┬─────────────────────────────────────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────────────────────────────────────┐
│  Outbound                                                                │
│  ────────                                                                │
│  Browser UI  ·  Resend digest emails (daily 11:00 UTC)  ·  Sentry        │
└──────────────────────────────────────────────────────────────────────────┘
```

## Route map

Public surfaces are in the app bar or footer; the rest are reachable by URL but `noindex` and not promoted.

```
src/app/
├── /                          Home (returning hero for signed-in users)
├── /bills                     Browse + filters; /bills/[id] detail
│   └── house, senate          Chamber-scoped browse
├── /search                    Bill search (FTS)
├── /members                   Roster; /members/[slug] profile; /members/map district map
├── /committees                Browse; /committees/[slug] detail
├── /meetings                  Meetings + agenda search
├── /feed                      Followed-bills timeline (signed-in)
├── /profile                   Account, Security, Notifications, Followed bills/committees,
│                              Activity, Digest history, Saved searches
├── /legislature/resources     LRC / KET / Bill Watch external link hub
├── /glossary                  Public glossary rendered from governmentTooltips
├── /about · /privacy · /terms · /licenses     Footer pages
│
├── /auth                      login, register, forgot, reset, verify, logout
├── /admin/sync-status         Operator dashboard (ADMIN_TOKEN required)
│
├── [hidden / noindex]         /dashboard, /browse, /find-content,
│                              /design-system, /dev/digest-history
│
└── /api                       Route handlers — see README "API endpoints"
    ├── bills/             ├── committees/[id]/follow    ├── cron/notify
    ├── search             ├── intelligence              ├── cron/health-check
    ├── roster/active      ├── sync (+ ?source=…)        ├── webhooks/resend
    ├── geo/               ├── unsubscribe/[token]       └── lrc/
    └── me/                (account, activity, digest-history, export,
                            follows, preferences, saved-searches, welcome-email)
```

## Source layout

```
src/
├── app/              App Router pages + API route handlers
├── components/       Feature components
│   ├── bills/        KYBillCard, BillDetailView, BillHearingsSection, …
│   ├── members/      MemberCard, DistrictMapExplorer, LegislatorIdentityBlock, …
│   ├── committees/   CommitteeDetailView, MeetingsBrowse, CommitteeMeetingCard, …
│   ├── profile/      ProfileActivitySection, ProfileNotificationsSection, …
│   ├── civic/        Shared civic primitives (CivicCard, ActivityStatusChip, …)
│   ├── home/         Landing surfaces (LandingHero, LandingPersonalStrip, …)
│   └── ui/           Tooltip, EmptyState, PaginatedSection, …
├── lib/              Domain logic + data access (no React)
│   ├── ky-sync-pipeline.ts          Sync orchestrator
│   ├── ky-legiscan-client.ts        LegiScan adapter
│   ├── ky-openstates-client.ts      Open States adapter
│   ├── ky-lrc-calendar-sync.ts      LRC HTML calendar → DB
│   ├── ky-lrc-committee-materials-sync.ts
│   ├── ky-bill-status-history.ts    Diff capture for digest events
│   ├── ky-search-bills.ts           FTS-first bill search
│   ├── ky-notification-preferences.ts
│   ├── digest/                       Digest cron runner
│   ├── email/                        React Email templates
│   ├── supabase/                     SSR/middleware Supabase clients
│   ├── tooltipContent.ts             Educational tooltip + glossary content
│   └── theme.ts, ui-tokens.ts        MUI theme + shared layout tokens
└── middleware.ts     Supabase session refresh on auth-relevant routes

supabase/migrations/   001 → 029 (apply in order; see TASKS.md operator checklist)
scripts/               One-off + cron CLI tools (tsx)
docs/specs/            Feature specs (follow-bills, committee-calendar)
docs/reference/        UX reference (Bill Watch screenshots, mappings)
docs/legacy-npm-deps/  Heavy deps removed from root; manifest to copy into optional/
```

## Auth + follow flow (signed-in user)

```
Browser
  │ login (Supabase Auth, cookie session)
  ▼
src/middleware.ts ── shouldRefreshSupabaseSession ──► Supabase
  │ (skips anonymous public routes)
  ▼
Page or /api/me/* ── Bearer JWT ──► RLS-scoped query
  │
  ├── Follow bill        POST /api/bills/[id]/follow      → ky_bill_follows
  ├── Follow committee   POST /api/committees/[id]/follow → ky_committee_follows
  └── Update prefs       PATCH /api/me/preferences        → ky_notification_preferences

Daily 11:00 UTC
  └── /api/cron/notify  →  runBillDigestCron
                            ├── reads ky_bill_status_history + ky_committee_events
                            ├── joins user prefs + follows
                            ├── renders BillDigest (React Email)
                            └── Resend send + ky_notifications_log
```

## Cron summary

| When (UTC) | Where | What |
| --- | --- | --- |
| 05:00 daily | Vercel | bills sync |
| 06:00 daily | Vercel | legislators sync |
| 06:15 daily | Vercel | votes sync |
| 11:00 daily | Vercel | digest email |
| 12:00 + 18:00 daily | GitHub Actions | LRC calendar (committee meetings + agendas) |
| 13:30 daily | Vercel | LRC committee materials |
| 14:00 daily | Vercel | health check |
| Mon 12:00 weekly | GitHub Actions | legislator-link verifier + LegiScan-subject audit |
