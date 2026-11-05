# LegiScan runbook: quota and ban risk

One key, 10,000 queries a month, audited from 2026-11-01. A violation can mean a permanent ban, so **stop the spend first and diagnose second**. Bill pages read only the database, so the site keeps serving while LegiScan calls are stopped. The numbers live in [`docs/data-budget.md`](../../data-budget.md) (WS4-01); this file is the procedure. Every step is an owner action.

## Signals

- The quota-band page `LegiScan quota threshold (90%+)`, then 95, 98 and 100% (`src/lib/slack-webhook.ts`; edge-triggered, one post per band per month), or a LegiScan pace breach once WS4-08 lands.
- The `bills`, `votes` or `dataset` source reported degraded (health check or `source-health.yml`), or HTTP errors from `api.legiscan.com` and `LegiScan: <message>` errors in sync or workflow logs.
- An email from LegiScan about terms, usage or suspension.

## First 15 minutes

1. Run `npm run check:legiscan-quota` (needs production env; it reads our counter and makes no LegiScan call). Read the per-op and per-caller lines and find the caller whose count jumped.
2. GitHub → Actions: look for a running or queued LegiScan workflow (list in (a)), above all a manual backfill. Cancel it.
3. If the month is at 90% or more, LegiScan has emailed, or the cause is unclear, go to Stop the spend now.

## Stop the spend

**Always do both (a) and (b).** (a) does not touch the Vercel crons or a manual `/api/sync` caller; (b) reaches every scheduler but has the gaps listed in (b). Add (c) if the guard may fail open (Supabase down, or the counter cannot be read). Use (d) only together with (a)–(c).
- **(a) GitHub workflows.** GitHub → Actions → each workflow → "…" → "Disable workflow". Immediate, no deploy. The six that hold the key: `sync-ky-bills-status.yml`, `legiscan-dataset-weekly.yml`, `legislator-links-weekly.yml`, `accuracy-audit.yml`, `backfill-vote-nv-counts.yml`, `backfill-session-votes.yml`. The last two are already disabled from WS4-04 until WS4-03a merges, and are never re-enabled to work around a cap.
- **(b) The limit brake, everywhere.** Set the GitHub repository **variable** (Settings → Secrets and variables → Actions → Variables, not a secret) `LEGISCAN_MONTHLY_QUERY_LIMIT=1`, and the Vercel Production env var of the same name, then redeploy production (Vercel → Deployments → Redeploy). Once the month count is 1 or more, usage is at least 100% of the limit and the client throws `LegiscanQuotaHoldError` before it sends. Expect one 100% quota-band page (expected). A running process may keep sending for up to 60 s, and the guard fails open if the counter cannot be read; the other gaps are in the data budget's [kill-switch section](../../data-budget.md#kill-switch-existing-brake-no-new-code). For a script on your own machine, put the line in `.env.local` (it overrides the shell) or stop the script.
- **(c) Vercel crons.** If the guard may fail open, stop the three LegiScan crons in `vercel.json`: bills 05:00, legislators 06:00, votes 06:15 UTC. Use Vercel → Project → Settings → Cron Jobs → Disable [verify the control exists; it disables every cron, including health-check], or a hotfix PR that removes those three entries from `vercel.json` (allowed in any window as a P0).
- **(d) Last resort, only together with (a)–(c).** Remove `LEGISCAN_API_KEY` from Vercel (then redeploy) and from the GitHub secrets, and keep the value only in your password manager. **Removing the key is not the stop.** Until WS4-02 merges, the client only warns and keeps sending keyless requests to `api.legiscan.com` for bills, votes and dataset runs, with retries, and the counter still increments [verify whether LegiScan counts or penalizes keyless requests from our IP]. After WS4-02 the client refuses to send without a key, but the key also lives on your machine, so (a)–(c) stay the stop. Health breaches are then expected.

| Scheduler | Name it actually reads | Stops with |
|---|---|---|
| The six workflows in (a) | repository variable `vars.LEGISCAN_MONTHLY_QUERY_LIMIT`, fallback `'10000'`. None passes `LEGISCAN_SYNC_QUOTA_STOP_PCT`, so that name does nothing on Actions as a secret or a variable | (a), (b) |
| Vercel crons: bills, legislators, votes (`/api/sync`) | Vercel env `LEGISCAN_MONTHLY_QUERY_LIMIT`, and `LEGISCAN_SYNC_QUOTA_STOP_PCT` (1–100, else `ACCURACY_LEGISCAN_QUOTA_STOP_PCT`, else 95), after a redeploy. The stop-pct names are not needed when (b) is set | (b), (c) |
| Accuracy audit (`accuracy-audit.yml`) | the client reads the repository variable above; the audit's own stop reads `ACCURACY_LEGISCAN_QUOTA_STOP_PCT` (`src/lib/accuracy-audit/types.ts`), which the workflow does not pass, so it is 95 | (a), (b) |

## Diagnose

Match the jumped caller tag (`month:op@caller` in the readout) to its source, and compare it with the per-run caps in `docs/data-budget.md` (enforced from WS4-03a). If our counter and LegiScan's figure disagree: until WS4-02 lands, the counter adds one per HTTP-success response (a `status: "ERROR"` reply and each of its retries included), not per attempt, and the write is fire-and-forget. LegiScan's figure is the one that counts.

| Tag | Set in | Run by |
|---|---|---|
| `sync-bills` | `src/lib/ky-sync-pipeline.ts` | Vercel bills cron; `sync-ky-bills-status.yml` (`npm run sync:ky:bills:status`) |
| `sync-legislators` | `src/lib/ky-sync-pipeline.ts` | Vercel legislators cron; `legislator-links-weekly.yml` (`npm run sync:ky:legislators`) |
| `sync-votes` | `src/lib/ky-sync-pipeline.ts` | Vercel votes cron |
| `dataset-sync` | `scripts/sync-ky-dataset.ts` | `legiscan-dataset-weekly.yml` (`npm run sync:ky:dataset`) |
| `accuracy-audit` | `scripts/accuracy-audit.ts` | `accuracy-audit.yml` (`npm run audit:accuracy`) |
| `legislator-links` | `LEGISCAN_CALLER` in `legislator-links-weekly.yml` | that workflow's link verifier |
| `sync-legislator-bios`, `session-preview` | `src/lib/ky-sync-pipeline.ts`; `scripts/preview-session-sync.ts` | manual only (`scripts/manual-sync.ts legislator-bios`; `npm run sync:ky:session-preview`) |
| `untagged` | nothing set a tag | the two backfill workflows and other scripts: find the run in Actions or your shell |

## Recover

1. Fix the cause first (a PR, or wait for the month to roll over). After a suspension or terms email, reply from the account that holds the key (WS4-04) and keep (a)–(c) in place until LegiScan answers. Then undo in reverse order: restore the key if (d) was used, then the crons from (c). Lift the brake: delete the repository variable (workflows fall back to `'10000'`), set the Vercel var back to 10000 (or remove it), and redeploy.
2. Re-enable one scheduled workflow at a time and run `npm run check:legiscan-quota` after each run. The two backfill workflows stay disabled unless WS4-03a has merged.
3. If the 100% page fired during the brake, the quota-band page stays silent for the rest of that month (the band is stored per month). Read the counter by hand each day until the 1st. If the month passes 5,000 by the 15th, follow the paid-tier trigger in `docs/data-budget.md` (WS4-04).

## Never

- Register or request a second key, or rotate the key to "reset" a quota.
- Remove or weaken LegiScan attribution (`src/lib/legiscan-attribution.ts`).
- Run a backfill to catch up after an outage (the hash-gated syncs self-heal), or re-enable `backfill-vote-nv-counts` or `backfill-session-votes` before WS4-03a merges, or any LegiScan workflow to work around a cap.

## Log it

Add an `incident` entry to `docs/ops/log.md` (WS9-04): what paged, the counter before and after, which steps you used, and when each was undone. Until that file exists, write it in the PR or issue that fixes the cause.
