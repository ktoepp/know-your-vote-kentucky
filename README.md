# Know Your Vote Kentucky (KYvKY)

A civic transparency app for the **Kentucky General Assembly**: browse bills, read AI-assisted summaries on bill detail, follow legislation, get a daily email digest, and explore the legislator roster and district map.

**Scope:** Frankfort / GA only. Local-government sync code (Louisville/Lexington ordinances, JCPS/FCPS school boards, county Legistar) remains in the repo for manual runs but is off Vercel Cron and excluded from default `npm run sync:ky`. Executive orders are deferred — `governor.ky.gov` listings aren't reliably scrapeable; the scraper, table, and helpers stay in-repo for a future re-enable.

See [docs/architecture.md](./docs/architecture.md) for a visual map of routes, data flow, and the sync pipeline.

## For AI agents

Read first if you're picking up this project:

- **[TASKS.md](./TASKS.md)** — current roadmap, what's shipped, what's next.
- **[decisions.md](./decisions.md)** — append-only rationale log; check before changing established patterns.
- **[FEEDBACK.md](./FEEDBACK.md)** — incoming user feedback (email / in-person / PostHog) and how it's triaged into work. Raw artifacts live in gitignored `docs/feedback/`.
- **[docs/specs/](./docs/specs/)** — feature specs (follow-bills, committee-calendar).
- **This is the Kentucky General Assembly**, not the US Congress. Use KY terminology: 100 House / 38 Senate, Governor (not President), 3/5 veto override.
- **Stack:** TypeScript, Next.js 15 (App Router only), React 18, MUI (primary), Tailwind (minimal — tooltip layer), Supabase / Postgres.
- **Data sources:** LegiScan (bills, votes), Open States (legislators), LRC HTML calendar (committee meetings + agendas + materials). Orchestrated by `src/lib/ky-sync-pipeline.ts`.

### Key files for common tasks

| Task | Files |
| --- | --- |
| Bill card / detail | `src/components/bills/KYBillCard.tsx`, `src/app/bills/[id]/page.tsx` |
| Bill status → tooltip mapping | `src/lib/bill-display.ts` (`billStatusToTooltipKey`, `billPrefixToTooltipKey`) |
| AI bill summary (plain-language, incl. impact audiences) | generator `src/lib/ky-content-generation.ts`; render `src/components/civic/AiAttribution.tsx` (`AiGeneratedBlock`); backfill `scripts/backfill-bill-summaries.ts`; faithfulness audit `src/lib/accuracy-audit/checkers/llm-review.ts` |
| Member roster / profile / map | `src/components/members/MemberCard.tsx`, `src/app/members/[slug]/page.tsx`, `src/components/members/DistrictMapExplorer.tsx` |
| Committees / meetings | `src/app/committees/`, `src/components/committees/MeetingsBrowse.tsx`, `src/components/bills/BillHearingsSection.tsx` |
| Profile activity feed | `src/components/profile/ProfileActivitySection.tsx`, `GET /api/me/activity` |
| Tooltip content + toggle | `src/lib/tooltipContent.ts`, `src/lib/TooltipContext.tsx`, `src/components/ui/Tooltip.tsx` |
| LRC calendar parser | `src/lib/lrc-legislative-calendar-parser.ts` (spike: `npm run spike:lrc:calendar`) |
| Sync pipeline | `src/lib/ky-sync-pipeline.ts` |
| Bill Watch UX reference | `docs/reference/bill-watch/` |
| App shell / providers | `src/app/layout.tsx` |
| SEO / GEO (sitemap, JSON-LD, OG, llms.txt) | `src/app/sitemap.ts`, `src/lib/sitemap-data.ts`, `src/lib/structured-data.ts`, `src/components/seo/JsonLd.tsx`, `src/app/opengraph-image.jpg`, `src/app/llms.txt/route.ts`, `src/app/robots.ts` |

### Hidden routes (no nav, `noindex`)

`/dashboard` (legacy redirect target — superseded by `/profile`), `/browse`, `/find-content`, `/design-system`, `/dev/digest-history`, `/dev/bill-summary-preview` (dev-only, gated on `NODE_ENV`). Reachable by URL for development. `/admin/sync-status` requires the `ADMIN_TOKEN` header.

### Tooltip taxonomy

Three categories. Only the first is the system you'll likely touch.

| Category | What | Where | Notes |
| --- | --- | --- | --- |
| **Educational** | Civic / legislative term (e.g. "veto", "Reported"). | `src/components/ui/Tooltip.tsx`; content in `src/lib/tooltipContent.ts` (`governmentTooltips`) and bill-status records in `src/lib/bill-display.ts`. | Gated by `tooltipsEnabled` (`src/lib/TooltipContext.tsx`). Same `governmentTooltips` entries power the public [`/glossary`](./src/app/glossary/page.tsx). |
| **UI affordance** | Short label on an icon button (e.g. "Open in new tab"). | Inline MUI `<Tooltip title="…" />`. | Always on. Not for definitions. |
| **Preview (removed)** | Whole-card hover popovers that mirrored row data. **Do not re-introduce.** | Deleted in Wave 4b (`KYBillCardTooltipTitle`, `BillTooltip`). | If tempted, link to detail or surface the data on the card body. |

## Quick start

```bash
git clone <repository-url>
cd know-your-vote-kentucky
npm install
cp env-template.txt .env.local   # fill in your keys
npm run dev
```

Requires Node 18+, a Supabase project, and API keys for Anthropic, LegiScan, Open States, Mapbox (see `env-template.txt`).

If `next dev` returns 500s or missing webpack chunks: kill anything on port 3000, then `npm run dev:clean` (deletes `.next` and restarts).

### Maintenance scripts

All tooling lives in `scripts/` and is exposed via `package.json`. There is no Jest/Vitest suite — `npm run test:env` only validates `.env.local`.

| Script | Purpose |
| --- | --- |
| `npm run test:env` | Validate required env vars. |
| `npm run sync:ky` | Manual sync (all default sources). `:legislators`, `:quota`, `:dry`, `:lrc-calendar`, `:lrc-committee-materials`, `:lrc-enrollment-actions` for targeted runs. |
| `npm run check:legiscan-quota` | LegiScan API usage this month (vs 30k cap). |
| `npm run db:apply-sql` | Apply SQL when `DATABASE_URL` is set. |
| `npm run geo:ky-districts` / `geo:ky-mask` | Rebuild district GeoJSON / outside-mask assets. |
| `npm run verify:votes` / `verify:legislator-links` / `spot-check:bill-links` | Data integrity checks. |
| `npm run preview:digest` / `preview:welcome` | Render digest / welcome email locally. |
| `npm run backfill:bill-summaries` (`:dry`) | Generate AI plain-language `ai_summary` for bills (active session by default; `--limit`, `--only-missing`, `--session`, `--all-sessions`). Anthropic tokens, zero LegiScan quota. |
| `npm run diagnose:legislators` | Report active rows missing `legiscan_id`. |
| `npm run generate:district-thumbnails` | Static district minimap PNGs. |
| `npm run slack:smoke-test` | Post a test message to configured Slack webhooks. |

Full list: see `scripts` in [package.json](./package.json).

### Optional legacy npm stacks

Heavy deps removed from the root app (puppeteer, pdf tooling, GCS client, `three`, etc.) live in [`docs/legacy-npm-deps/`](./docs/legacy-npm-deps/README.md). Install into gitignored `optional/legacy-npm-deps/` and run with `npx` from there; the Next.js app doesn't depend on that folder.

## Tech stack

- **Framework:** Next.js 15 (App Router), React 18, TypeScript
- **UI:** MUI (primary), Tailwind (tooltip layer only)
- **Database:** Supabase / Postgres — schema in `supabase/migrations/`
- **AI:** Anthropic Claude (bill-detail summaries, intelligence scoring)
- **Data:** LegiScan, Open States, KY LRC (HTML calendar + committee materials)
- **Email:** Resend (digests, welcome, auth)
- **Maps:** Mapbox (House/Senate district layers, geocoding)
- **Monitoring:** Sentry
- **Deployment:** Vercel — cron-driven data sync; LRC calendar runs on GitHub Actions

## Public surface

**App bar:** Bills (with House/Senate shortcuts), Members, Committees, Meetings, District map, global search.

**Also public:** `/legislature/resources` (LRC/KET/Bill Watch links), `/glossary` (plain-English civic terms from `governmentTooltips`), signed-in `/profile` (follows, notification preferences, activity timeline, digest history).

**Footer:** About, Glossary, Licenses, Privacy, Terms. `/about` is a stub awaiting real copy.

### Headline features

- **Bills** — Status, sponsors, committee context, AI summary on bill detail, follow + per-bill alerts.
- **Members** — Roster, profiles, sponsored bills, vote summaries, outbound links (LRC, LegiScan, Ballotpedia).
- **District map** — Mapbox House/Senate layers + address lookup (KY-biased geocoding).
- **Committees / meetings** — Browse, follow, agenda search, hearings on bill detail.
- **Email digest** — Daily/weekly digest of followed bills + committee meetings (factual content only — no AI summaries in email).

## Data sync

Pipeline status (data landing in Supabase). Schedules in `vercel.json` and `.github/workflows/`.

| Source | Schedule | Notes |
| --- | --- | --- |
| bills | Daily 05:00 UTC (Vercel) | LegiScan; `useChangeHash` + `skipBillSponsorDetails` |
| legislators | Daily 06:00 UTC (Vercel) | Open States |
| votes | Daily 06:15 UTC (Vercel) | LegiScan; `limit=5` per run |
| bill digest | Daily 11:00 UTC (Vercel) | `/api/cron/notify` — Resend; weekly users batched Mondays |
| lrc-committee-materials | Daily 13:30 UTC (Vercel) | Committee meeting documents → `ky_committee_materials` |
| health-check | Daily 14:00 UTC (Vercel) | `/api/cron/health-check` |
| lrc-calendar | 12:00 + 18:00 UTC (GitHub Actions) | LRC HTML calendar — `.github/workflows/sync-lrc-calendar.yml` (off Vercel Cron since 2026-05-21 — Hobby plan caps cron granularity at daily) |
| legislator-links verifier | Weekly Mondays 12:00 UTC (GitHub Actions) | `.github/workflows/legislator-links-weekly.yml` |
| ordinances, school-boards, county-actions | **Paused** | Manual `GET /api/sync?source=…` only |

## API endpoints

| Endpoint | Description |
| --- | --- |
| `GET /api/bills` | Kentucky bills with filtering |
| `GET /api/bills/browse` | Paginated browse with slim columns (`KY_BILL_BROWSE_SELECT`) |
| `GET /api/search` | Bill search (FTS-first via `ky_bills_plain_search`) |
| `GET /api/intelligence` | Top-scored bills (rate-limited to 30 req/min/IP) |
| `GET /api/roster/active` | Cached active legislator roster (CDN-cacheable) |
| `GET /api/me/*` | Signed-in user: `follows`, `preferences`, `activity`, `saved-searches`, `digest-history`, `export`, `account`, `welcome-email` |
| `GET/POST/DELETE /api/bills/[id]/follow` | Bill follow toggle (Bearer token) |
| `GET/POST/DELETE /api/committees/[id]/follow` | Committee follow toggle |
| `GET/POST /api/sync` | Trigger sync (Bearer `SYNC_API_KEY` or `CRON_SECRET`). With `?source=` runs that source; without, returns status. Also called by Vercel Cron. |
| `POST /api/webhooks/resend` | Resend bounce / complaint webhook (Svix-signed) |
| `GET /api/unsubscribe/[token]` | Unsubscribe (RFC 8058 one-click compatible) |

## Operations

### Rate limiting

`/api/intelligence` is limited to **30 req/min/IP** via a shared Postgres token bucket (`ky_rate_limit_buckets`, RPC `ky_rate_limit_consume`, migration `008`). Fail-open: if Supabase is unreachable, the request is allowed and a warning logged.

### Observability counters

All counters land in `ky_sync_state` (JSONB, date-bucketed) via the `ky_increment_counter` RPC (migration `009`):

| Key | Bucket | Tracks |
| --- | --- | --- |
| `legiscan_query_counter` | `YYYY-MM` | LegiScan API calls vs 30k/month cap |
| `rate_limit_denies` | `YYYY-MM-DD` | `/api/intelligence` 429s |
| `anthropic_cache_hits` / `_misses` | `YYYY-MM-DD` | Anthropic response cache |

These feed `/admin/sync-status` (requires `ADMIN_TOKEN`).

### Outbound mail

`From: alerts@kyvky.com` (transactional only — do not reply). `Reply-To: katie@kyvky.com` (real inbox). All inbound contact and vulnerability reports go to `katie@kyvky.com`. Resend webhook posts to `https://www.kyvky.com/api/webhooks/resend` (apex 307s break POST). Every transactional send includes a plain-text fallback.

## Deployment

Vercel project. Set `CRON_SECRET` (16+ random chars) — Vercel Cron invokes `/api/sync?source=…` with `Authorization: Bearer <CRON_SECRET>`. Manual operator runs can use `SYNC_API_KEY` instead. At least one of the two must be configured.

Canonical origin is `https://kyvky.com` (`NEXT_PUBLIC_APP_URL` / `APP_PUBLIC_URL`). `next.config.ts` 308-redirects `www.kyvky.com` and legacy hosts.

See **[docs/launch-checklist.md](./docs/launch-checklist.md)** for the operator launch checklist (Resend DKIM, Sentry alerts, inbox routing, legal review, email-client QA, Vercel env cleanup, regression cadence).

## Environment variables

See `env-template.txt`. To render the `DataFreshnessNote` on public pages, the anonymous Supabase client must have `SELECT` on `ky_sources` (otherwise the note is omitted silently).

## License

MIT
