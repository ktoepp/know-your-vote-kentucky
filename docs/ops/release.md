# Release calendar and deploy checklist

Merging to `main` deploys to production on Vercel. This page says what may deploy when, and what the owner checks before and after a code deploy. Agents follow the same windows in [manual §2](../program-spec/00-agent-operating-manual.md#2-picking-up-a-wp).

## Calendar

Dates are inclusive.

| Window | Dates | What may deploy |
|---|---|---|
| W0 | 2026-10-06 → 10-20 | Anything that passes the deploy checklist |
| W1 | 2026-10-21 → 11-03 | As W0. Code PRs merged by 10-30 |
| Election freeze | 2026-10-31 → 11-05 | Option (a): P0 fixes only, plus docs/test-only PRs |
| W2 | 2026-11-04 (code from 11-06) → 12-14 | Migrations, refactors, dependency majors. Cut line 12-07 |
| FZ | 2026-12-15 → 2027-01-04 | Fixes, drills and readiness only |
| W3 | 2027-01-05 → 03-30 | Small fixes only (see Session days) |
| W4 | 2027-04-01 → 04-30 | Evaluation, docs and fixes |
| W5 | Set by the W4 decision (WS8-16) | Only what that decision opens |

The election freeze uses option (a), the default that applied on 2026-10-17. A docs/test-only PR changes only `docs/**`, root `*.md` files and `src/**/*.test.ts`. It still redeploys unchanged code, which is accepted as harmless.

## Deploy checklist

The owner runs this for every merge that changes anything outside docs and tests. About 5 minutes.

- [ ] CI (`checks`, `build`) is green on the PR.
- [ ] The PR's "Deploy notes" are read, and any migration is applied in the stated order.
- [ ] It is between 16:00 and 22:00 UTC, and not within 10 minutes of a cron (table below).
- [ ] If the PR changes `src/` (other than tests), `supabase/migrations/`, `vercel.json`, `next.config.ts` or `package.json`: after deploy, load `/`, one bill page and `/members/map`, then watch Sentry for 30 minutes.
- [ ] If something breaks, use Vercel instant rollback first and debug second. The drill is in [WS2-14](../program-spec/02-security-and-platform.md#ws2-14--run-the-pre-session-security-readiness-check).

Docs/test-only PRs merge any time, with no checklist.

Vercel crons (UTC, from `vercel.json`). GitHub Actions jobs run outside Vercel and a deploy does not interrupt them. Once WS4-11 lands, read these times from `src/lib/schedule-registry.ts` instead.

| Time (UTC) | Job |
|---|---|
| 05:00 daily | sync bills |
| 06:00 daily | sync legislators |
| 06:15 daily | sync votes |
| 11:00 daily | notify |
| 13:30 daily | sync lrc-committee-materials |
| 14:00 daily | health-check |
| 14:45 daily | sync lrc-enrollment-actions |
| 15:30 Sunday | sync lrc-popular-names |
| 00:00, 06:00, 12:00, 18:00 | notify-signups |

Inside the 16:00–22:00 window, only notify-signups at 18:00 applies, so skip 17:50–18:10.

## Session days (W3)

- Hotfixes only. Prefer Monday to Thursday.
- Never deploy code within 24 hours before 2027-03-25 (reconvene) or 2027-03-30 (sine die), unless it is a P0.
- Any migration in W3 needs the down SQL in the PR.

## What "P0" means here

- **P0:** must ship in its window: security, correctness, legal/ToS, data-limit safety.
- **P1:** high value.
- **P2:** valuable.
- **P3:** opportunistic.
