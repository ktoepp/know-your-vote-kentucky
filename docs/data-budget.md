# KYvKY data budget

**Status: PROPOSED 2026-10-06, pending WS4-04.** The owner adopts or edits these numbers in WS4-04 (default: accept on 2026-10-20). Until then they are planning numbers, not rules any code enforces.

This is the one place that states how much KYvKY may take from each data source and vendor. The numbers code reads are in [`src/lib/data-budget.ts`](../src/lib/data-budget.ts) (`DATA_BUDGET`); this file explains them and covers the vendors no code meters. Source findings are in [`docs/program-spec/appendix-a-findings.md`](program-spec/appendix-a-findings.md) (D1–D4, A8).

## Running Kentucky today (estimated)

Five lines for partner conversations (WS8-10). Every figure is an estimate; WS4-16 replaces them with measured numbers after the 2027 session.

1. **LegiScan queries a month** (*estimate*): about 200–300 in the interim after the 2026-09-29 fixes (decisions.md § 2026-09-29, option a); measured August 1,165 and September 947 on our own counter. Session peak about 3,500–5,500 (decisions.md § 2026-10-06).
2. **LRC fetches a day by scheduled jobs** (*estimate from code*): about 97 a day today, about 77 a day once WS4-09b stops fetches for sessions that cannot change. See "LRC load by source" below.
3. **AI cost** (*estimate*): about $0.006 per bill summary today (A8), about $0.03 per bill once summaries are grounded in bill text (WS3 estimate).
4. **Cash** (*estimate, inferred*): about $700–1,100 a year for hosting, database and vendors (D4).
5. **Safeguards** (*description, not a measurement*): one LegiScan key, `change_hash` gating, per-run caps (planned, WS4-03a), the 95% quota hold, and polite LRC fetching (planned, WS4-09a).

## Per-vendor table

| Vendor | Hard limit | Our planning target | Alert level | Per-run cap | Where it is enforced in code | Who can change it |
|---|---|---|---|---|---|---|
| LegiScan (all callers) | 10,000 queries/month (`LEGISCAN_PUBLIC_MONTHLY_LIMIT_DEFAULT`); about 2 requests/s sliding | 5,000/month; no run takes the month above 6,000 | Slack at 90/95/98/100% (`QUOTA_ALERT_BANDS`, `src/lib/slack-webhook.ts`); sync hold at 95% | see rows below | `src/lib/ky-legiscan-client.ts` `ensureQuotaAllows()` → `src/lib/legiscan-quota.ts` `checkLegiscanQuotaForSync()`; per-run caps planned: WS4-03a | Owner (WS4-04) |
| LegiScan `sync-bills` | as above | as above | as above | counted, no cap (`null`) until WS4-06 sets 250 | planned: WS4-03a, WS4-06 | Owner |
| LegiScan `sync-legislators` | as above | as above | as above | 10 | planned: WS4-03a | Owner |
| LegiScan `sync-votes` | as above | as above | as above | 60 | planned: WS4-03a | Owner |
| LegiScan `dataset-sync` | as above | as above | as above | 40 | planned: WS4-03a | Owner |
| LegiScan `accuracy-audit` | as above | as above | as above | 40 | planned: WS4-03a | Owner |
| LegiScan `session-preview` | as above | as above | as above | 5 | planned: WS4-03a | Owner |
| LegiScan `legislator-links` | as above | as above | as above | 40 | planned: WS4-03a | Owner |
| LegiScan `sync-legislator-bios` | as above | as above | as above | **`--budget`-only**: no `perRunCap` key. Manual-only (`getPerson`, 1 per legislator that needs enrichment, up to about 138). After WS4-03a it resolves to 0 and every run passes `--budget=N` through `scripts/manual-sync.ts` | planned: WS4-03a | Owner, per run |
| LegiScan, any other caller (scripts, WP tags) | as above | as above | as above | 0; must pass `--budget=N`. Above 1,000 needs owner approval | planned: WS4-03a (`--owner-approved`: WS4-03b) | Owner, per run |
| Kentucky LRC site | public site, no API, no published limit | serial, at most 1 request/s per host | none yet; WS4-10 makes an empty parse an error | none | planned: WS4-09a (`DATA_BUDGET.lrc`) | Owner |
| Open States | none published [verify on the account page] | about 6 calls a day | 7-day zero-yield alarm (existing) | none | up to 3 attempts per request (`MAX_RETRIES`, `src/lib/ky-openstates-client.ts`); no counter | Owner |
| Anthropic | pay as you go | Console monthly limit $40 (PROPOSED) | Console usage page | `--limit=N` today; `--max-usd` once WS3-09c merges | `scripts/backfill-bill-summaries.ts` flags; Console limit set by the owner (WS4-07) | Owner |
| Resend | free tier, about 100 emails/day (D4) | 70 logged sends a day plus a reserve of 30 | none in code | none | planned: WS7-09c daily send budget | Owner |
| Mapbox | free tier, about 50k loads (D4) | under the free tier | none | none | none | Owner |
| PostHog, Sentry, GitHub Actions | [verify on the vendor's pricing page] | under the free tier | none | none | none | Owner |

## LegiScan rules

- **One key.** Never create, request or rotate a second key, including for development. The cap is **10,000 queries a month**, with a sliding rate limit of about **2 requests a second**. Audited enforcement of the terms starts **2026-11-01**, and a violating key is permanently banned.
- **Gating.** The bills sync fetches a bill only when its `change_hash` changed. Every `getDataset` path is gated on `dataset_hash` and reads the stored ZIP when the hash is unchanged. Never re-fetch a roll call that is already stored.
- **Attribution.** LegiScan data is licensed CC BY 4.0. Every surface that shows or serves it takes its credit wording from [`src/lib/legiscan-attribution.ts`](../src/lib/legiscan-attribution.ts) (or `src/components/civic/LegiScanCredit.tsx`).
- **Paid-tier trigger** (decisions.md § 2026-09-29, first clause of "Revisit if"): "a 2027 RS month passes 5,000 queries by the 15th (projects over ~8,000) → buy before month-end, state-limited Pull first".
- **January–March 2027 projection** (decisions.md § 2026-10-06). Method: measured inputs from our database for the 2025 Regular Session (1,441 bills): bills introduced January 295, February 953, March 193; roll calls January 4, February 169, March 528. Change-driven re-fetch volume is scaled from March 2026's 2,970 bill-days with actions by 1,441/1,737. Fixed load after the 09-29 cuts is about 250 a month (masterlist about 150, people and session lists about 40, link verifier about 20, dataset and audit about 20, votes cron `getBill` about 150 in session).

  | Month | First pickup | Change re-fetch | Roll calls | Fixed | **Total** |
  |---|---:|---:|---:|---:|---:|
  | Jan 2027 | ~300 | 300–700 | ~5 | ~400 | **~1,000–1,500** |
  | Feb 2027 | ~950 | 1,500–2,300 | ~170 | ~400 | **~3,000–4,000** |
  | Mar 2027 | ~200 | 2,400–3,700 | ~530 | ~400 | **~3,500–5,500** |

  The upper end allows a changed bill to be fetched by more than one run a day. The peak is at most 55% of the cap with one state.
- **Our counter undercounts.** It records successful responses only (until WS4-02). Add 10% to any estimate.
- [verify] LegiScan's API manual page 7 sets per-operation timing guidelines (Crash Course line 8). Confirm that our cadence for getMasterListRaw and getSessionList meets them.

## Kill switch (existing brake, no new code)

Set the GitHub repository variable **and** the Vercel environment variable `LEGISCAN_MONTHLY_QUERY_LIMIT=1`. Vercel needs a redeploy for the environment change to take effect. Every GitHub workflow that calls LegiScan already passes `LEGISCAN_MONTHLY_QUERY_LIMIT: ${{ vars.LEGISCAN_MONTHLY_QUERY_LIMIT || '10000' }}`. With a limit of 1, the client's quota guard raises `LegiscanQuotaHoldError` on every request once the month total is at least 1, for scheduled routes and scripts alike (WS4-03a adds a test for this).

Known gaps:

- The first query of a calendar month can pass, because the month total starts at 0.
- The guard fails open when the counter cannot be read (for example, the database is unreachable or the service key is missing).
- The guard caches its result for 60 seconds per process (`QUOTA_GUARD_TTL_MS`).

For an immediate stop, follow [`docs/ops/runbooks/legiscan.md`](ops/runbooks/legiscan.md) steps (a)–(c) (created by WS9-06a): set `LEGISCAN_MONTHLY_QUERY_LIMIT=1` in the Vercel environment and the Actions variables, redeploy, and disable the crons and workflows. Taking the key out of the environment is not a stop: until WS4-02 merges, the client warns and still sends keyless requests with retries. After WS4-02 the client refuses to send without a key, but the brake above stays the documented stop, because the key also lives in GitHub secrets and on the owner's machine.

Undo by deleting the variable (and redeploying Vercel).

## LRC load by source

The Kentucky LRC has no API. Every fetch sends the `KnowYourVoteKentucky/1.0 (+https://kyvky.com; <job-name>)` User-Agent, is serial, and is at most 1 request a second per host (operating manual §4). The hosts are `apps.legislature.ky.gov` and `legislature.ky.gov`. WS4-15 measures each row.

| Source | Load | Measured or estimated |
|---|---|---|
| Scheduled syncs | calendar 2/day; committee materials about 69/day; enrollment actions 23/day (one per `KY_SESSIONS` entry); popular names 23/week. About 97/day today, about 77/day after WS4-09b | estimate from code |
| Accuracy audit, weekly | the materials checker fetches one page per committee with an `lrc_rsn`, plus 1 calendar page: about 70/week | estimate |
| Bill-page link probe `/api/lrc/bill-link-status` | 1–3 per bill-page view, crawlers included. Owned by WS6-03 and WS6-09a | to measure |
| Bill-text PDFs (WS3-08, if approved) | at most 1,737 one-time, at most 100/day in session | estimate (WS3-08) |
| Wayback backfills | not LRC load (the Wayback Machine serves them) | n/a |

## Open States

No published rate limit is known to us [verify on the account page]. About 6 calls a day, with retries and a 7-day zero-yield alarm already in place (D2 re-check). The `/people` endpoint often returns 504. There is no call counter (WS4 Deferred). Make no retry loop without backoff and a maximum attempt count. The bulk data is CC0.

## Anthropic

- **Monthly spend limit:** $40 in the Anthropic Console (PROPOSED; the owner sets it in WS4-07). It covers WS3's in-session estimate for grounded summaries (about $15–35 a month) plus WS3-10's one-time spend of at most $10.
- **Per-run stops:** `--limit=300` on the summary run today, plus `--max-usd` once WS3-09c merges. Agents never launch a backfill.
- **Where to read spend:** the Console usage page.
- **Model:** `claude-sonnet-4-6`, set only in [`src/lib/anthropic-model.ts`](../src/lib/anthropic-model.ts) (`KY_DEFAULT_ANTHROPIC_MODEL`).
- **Model retirement date:** [verify: owner, by 2026-11-15, WS4-07]. Read it from Anthropic's model deprecations page (https://platform.claude.com/docs/en/about-claude/model-deprecations [verify the URL]) and write the date, or "no date announced as of <date>", here with the link. WS4-01 did not fetch the page (its run made no external calls).
- **Trigger:** if retirement falls before 2027-04-30, open a model-switch WP owned by the AI-summaries workstream (WS3), using its grounded evaluation set.

## Free tiers

| Vendor | Limit | Where to look | Number to write down |
|---|---|---|---|
| Resend | about 100 emails/day (D4) | Resend dashboard, usage | highest daily send count this quarter |
| Mapbox | about 50k loads (D4) | Mapbox account, statistics | map loads last month |
| PostHog | [verify on the vendor's pricing page] | PostHog billing page | events last month |
| Sentry | [verify on the vendor's pricing page] | Sentry stats / subscription page | errors and transactions last month |
| GitHub Actions | [verify on the vendor's pricing page] (public repository) | repository Actions usage | minutes last month |

The check runs **quarterly** inside the one monthly owner check (WS9-08, `docs/ops/vendors.md` §Monthly check), or at once when a vendor emails about limits or monthly visitors pass 10 times the September 2026 level.

## How to price a run

Short form of [operating manual §4](program-spec/00-agent-operating-manual.md#4-data-limit-protocol-o2):

1. **Estimate** the calls by operation and the money, and add 10% for the undercounting counter.
2. **Check the counter:** `npm run check:legiscan-quota -- --planned=N` (needs production secrets; it reads `ky_sync_state` only and makes no LegiScan call). It prints the month's usage, then the planned and remaining lines, compared with both the cap and the planning target.
3. **Dry-run first.** Read the script's header: "dry run" means different things in different scripts.
4. **Set a stop condition**, such as `--limit=N` or (from WS4-03a) `--budget=N`. Above 1,000 LegiScan queries needs owner approval.
5. **Record** the planned and actual spend and the counter before and after.
