# Operations

Runbooks and operating notes for KYvKY.

## What pages you

Every alert below posts to `#errors` **and** to the page channel (`SLACK_WEBHOOK_SUPPORT`). Point that webhook at a Slack channel with phone notifications on (WS9-02). If it is unset, these alerts reach `#errors` only and nothing pages.

| Alert | Where it comes from | Channel | First action |
|---|---|---|---|
| Health check failed (infra) | `/api/cron/health-check`, Vercel cron daily 14:00 UTC (`vercel.json`) | `#errors` + page | see runbook (WS9-06b) |
| Sync sources degraded | The same health check, and `.github/workflows/source-health.yml` daily 02:00 UTC; edge-triggered, one post per breach | `#errors` + page | see runbook (WS9-06a/b) |
| Sync crashed | A Vercel cron `/api/sync` run (`vercel.json`) or a CLI sync | `#errors` + page | see runbook (WS9-06a/b) |
| LegiScan quota band | 90/95/98/100% of the monthly limit, edge-triggered, posted after a sync run (`src/lib/slack-webhook.ts`) | `#errors` + page | [LegiScan runbook](runbooks/legiscan.md): First 15 minutes |
| Source-health run failed | `source-health.yml` failed, timed out or was cancelled and could not report for itself | `#errors` + page | Open the run link in the post |
| Site check failed | `source-health.yml` daily 02:00 UTC fetches `https://www.kyvky.com/` and `/bills` from GitHub Actions, outside Vercel; any non-200 after one retry. Detection latency up to ~24 h plus GitHub schedule delay (up to ~2 h). Not an uptime monitor. | `#errors` + page | Open the site; then Vercel → Deployments |
| Sentry `[page]` rule | A Sentry issue-alert rule whose name starts with `[page]`, forwarded by `/api/webhooks/sentry`. Metric alerts are not forwarded, so a paging rule must be an issue alert. | `#errors` + page | Open the Sentry link in the post |

Everything else goes to `#errors` or `#status-reports` and does not page. Reader reports about a wrong summary or vote: follow `docs/corrections-procedure.md` (WS3-14).

Test the page channel with `npm run slack:smoke-test` (posts one message per configured webhook, including `support`). Test the site check with GitHub → Actions → "Sync source health" → Run workflow, with `site_check_path` set to a path that returns 404.

## Runbooks

- [LegiScan: quota and ban risk](runbooks/legiscan.md)

## Releases

- [Release calendar, election freeze and deploy checklist](release.md)
