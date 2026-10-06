# KYvKY owner decisions and owner-only actions

Every WP decision that has options is listed here, sorted by the date its default applies, followed by the steps only the owner may take. The front door is [README.md](README.md). WP status is in [TRACKER.md](TRACKER.md).

**Rules.**

- **If a row is unanswered by its date, the default applies and agents proceed.** "Blocked" or "No default" means there is none.
- **The WP file is authoritative.** If a row here differs from the WP's own Owner decision line, the WP file wins; agents note the mismatch under "Found, not fixed" (manual §2).
- **Core first.** Rows marked **Core** belong to the 45 committed WPs. A Backlog row's default matters only once the owner gives that WP a go-ahead; if its date has passed by then, the default applies at pickup.
- **Where to answer.** In the WP's PR, or in `CURRENT.md` or an ADR once WS5-03a/b exist.
- **Public repo.** Security decisions name only the choice and the date. Their options and details are in the owner's private security note and never appear here.

## 1. Decision calendar

27 of the 84 rows are Core.

| Decide by | WP | Class | Decision | Options → recommended | Default if unanswered |
|---|---|---|---|---|---|
| immediately | WS1-04 | **Core** | Node version in CI; run `next build` in CI | `'24'` or Vercel's version; build job yes/no → match Vercel; yes | `'24'`; separate `build` job |
| immediately | WS2-02 | **Core** | Admin access method | header only / header + HTTP Basic | header only |
| 2026-10-09 | WS5-01a | Backlog | Which one-off scripts to delete | (a) Tier A / (b) Tier A+B / (c) none → (a) | (a) |
| 2026-10-12 | WS6-05 | Backlog | Election and members-elect note on profiles and lookups | (a) dated two-variant note / (b) pre-election only / (c) none → (a) | (a) |
| 2026-10-12 | WS9-01 | **Core** | Off-Vercel site check | (a) Sentry Uptime if $0 / (b) daily `curl` in `source-health.yml` → (a) if free | (b) |
| 2026-10-13 | WS2-03 (1) | **Core** | How to harden the post-signup session flow | the options and the recommendation are in the owner's private security note | the note's recommended option. Under any other option the WP is blocked and the agent reports privately, with no specifics in the public PR |
| 2026-10-13 | WS2-05 (1) | **Core** | `FEEDBACK.md` git history | (a) HEAD only / (b) history rewrite, done by the owner, no agent PR / (c) private repo → (a) | (a). The WP does not start before this date |
| 2026-10-13 | WS2-05 (2) | **Core** | Outreach notes in the public repo | move out / keep → move | move out |
| 2026-10-13 | WS2-06a (WS2-06b follows) | Backlog | View counts | (a) retire client increments / (b) server route / (c) keep → (a) | (a) |
| 2026-10-13 | WS2-07 | Backlog | `/api/intelligence` | (a) delete / (b) strip LLM / (c) keep → (a) | (a) |
| 2026-10-13 | WS2-09a | Backlog | Five personal-data flows | ZIP in PostHog; person traits; Sentry `sendDefaultPii`; Slack signup alert fields; Speed Insights | drop ZIP; stop email/name traits; `false`; drop name and masked email; remove |
| 2026-10-13 | WS3-03a | **Core** | Roll-call outcome chip (settles TASKS.md ~424) | (a) delete / (b) every row / (c) "failed" only / (d) unmatched rows only → (c) | (c) |
| 2026-10-13 | WS3-04 (1) | **Core** | Summaries of bills changed after introduction | (a) caveat / (b) hide / (c) no change → (a) | (a) |
| 2026-10-13 | WS3-04 (2) | **Core** | "Who it may affect" clause | (a) keep / (b) hide at render until grounded / (c) remove → (b) | (b) |
| 2026-10-13 | WS5-02 | Backlog | Delete the unrendered district minimap | (a) delete / (b) allowlist → (a) | (a) |
| 2026-10-13 | WS5-03a | Backlog | Retire `TASKS.md` and `decisions.md` | (a) freeze in place / (b) move to `docs/archive` / (c) keep appending with a cap → (a) | (a) |
| 2026-10-13 | WS7-01 | **Core** | Headline reach figure | (a) KY human / (b) all human / (c) both → (c), with (a) first | (c) |
| 2026-10-13 | WS7-06 | **Core** | PMF survey | (a) retarget / (b) pause, then retarget / (c) stop → (c) | (c) |
| 2026-10-14 | WS9-02 | Backlog | Which Slack channel pages the phone | (a) new dedicated channel / (b) existing `SLACK_WEBHOOK_SUPPORT` channel → (a) | (b) if that variable is set in Vercel, otherwise (a) |
| 2026-10-15 | WS6-04a | Backlog | Home H1, and the pre-filing copy | (a) "Find your Kentucky legislators and see how they vote" / (b) keep the slogan → (a); neutral pre-filing lines (a) | (a); (a) |
| 2026-10-16 | WS1-15 | Backlog | Landmark coordinates in the district test | (a) owner supplies 2–3 confirmed pairs / (b) structural checks only → (a) | (b) |
| 2026-10-16 | WS5-12a | Backlog | Run the surname-collision aggregate query (due 10-13) | trigger: `surname_suffix_pairs > 0` or `no_legiscan_id > 0` | If the query has not run, the agent applies the narrowing fix anyway. If it triggers or this default applies, WS5-12a enters Core as a P0 and WS7-13 moves to the April promotions (README) |
| 2026-10-17 | WS9-03 | **Core** | Election freeze | (a) P0 only plus docs/test exception / (b) no exception / (c) no freeze → (a) | (a) |
| 2026-10-20 | WS1-07 | Backlog | Ruleset and GitHub security toggles | admin bypass (a) no / (b) yes; up-to-date branches; Dependabot security-update PRs (a) alerts only / (b) PRs → (b); off; (b) | (b); off; (b). The toggles must be on by 10-20 |
| 2026-10-20 | WS3-11b | Backlog | Public "checked by a person" label | (a) add / (b) none → (b) | (b) |
| 2026-10-20 | WS3-14 | Backlog | Where the corrections log lives | (a) `/corrections` / (b) section on `/about` → (a) | (a). The owner approves the seed entries |
| 2026-10-20 | WS4-04 (1), written by WS4-01 | **Core** | Accept the data budget | accept / edit → accept | The PROPOSED numbers in `docs/data-budget.md` (README "Program budgets"), including the $40 Anthropic limit |
| 2026-10-20 | WS4-04 (2) | **Core** | LegiScan paid-tier trigger | (a) keep the 2026-09-29 trigger / (b) buy before the session / (c) never → (a), and also buy if a partner needs a second state | (a) |
| 2026-10-20 | WS4-04 (3), used by WS4-09a | **Core** | Contact address in bot User-Agents | `katie@kyvky.com` / a role alias → role alias | `katie@kyvky.com` |
| 2026-10-20 | WS5-03b | Backlog | Where open items live | (a) `CURRENT.md` / (b) GitHub Issues → (a) | (a) |
| 2026-10-20 | WS7-03 (1) | **Core** | The funding ask (one figure) | owner only | **No default.** Other corrections ship. Ask lines are flagged `ASK NOT FINAL`, and the owner sets the figure before submitting to NLnet (11-03) |
| 2026-10-20 | WS7-03 (2) | **Core** | "Never lead with retention" rule | (a) keep / (b) drop and present retention as the hypothesis under test → (b) | (b) |
| 2026-10-24 | WS2-09b | Backlog | Session-replay sentence on `/privacy` | owner edit / conservative copy | Conservative copy that is true either way |
| 2026-10-31 | WS2-03 (2) | **Core** | Existing accounts (only if the owner's aggregate count is above 0) | accept and record / the alternative in the private note → accept and record | accept and record; revisit in W4 |
| 2026-10-31 | WS2-08 | Backlog | Acknowledgement time in `SECURITY.md` | any → 5 business days | 5 business days |
| 2026-11-04 | WS2-10 | Backlog | Unused service-role wrapper | (a) wire in plus a lint rule / (b) delete → (b) | (b) |
| 2026-11-06 | WS8-01a | Backlog | Data rights: LegiScan re-serving; Open States; LRC; license for KYvKY content | (a) no limit / (b) bulk only / (c) unclear; CC0; public record; CC BY 4.0 / CC0 / all rights reserved → (b); CC0; public record; CC BY 4.0 | as recommended |
| 2026-11-10 | WS4-12 | Backlog | Which scheduler keeps the bills sync | (a) GitHub Actions; delete the Vercel duplicate / (b) move to Vercel → (a) | (a) |
| 2026-11-10 | WS5-07 | Backlog | Advisory AI layer | (a) remove triage, disable both Routines / (b) keep the health Routine weekly / (c) keep all → (a) | Triage is removed regardless. The Routines are disabled after WS9-02 is confirmed, and are flagged overdue on 11-10 |
| 2026-11-10 | WS5-09 | Backlog | Design-system page and export | (a) delete both, keep the written guidelines / (b) keep the page / (c) keep both → (a) | (a) |
| 2026-11-11 | WS6-12a | Backlog | Email-link auth | (a) add alongside password / (b) email link only / (c) don't add → (a) | (a). Under (c), WS6-12b and WS7-09f are blocked; the weekly email then ships signed-in only (WS7-09d) |
| 2026-11-11 | WS7-09a | **Core** | What a subscription is keyed to | (a) district numbers / (b) legislator follows / (c) email-only, no account → (a) | (a) |
| 2026-11-13 | WS3-07 | Backlog | Bill-text source | (a) LRC PDFs / (b) LegiScan `getBillText` / (c) Anthropic URL document → by rule | **No preset default.** The agent applies the rule: (b) if the projected peak plus (b)'s volume ≤ 6,000 a month, otherwise (a); (c) only if both are blocked |
| 2026-11-13 | WS4-03a | **Core** | Confirm the per-run caps against real use before merge | confirm / raise | WS4-01 caps |
| 2026-11-13 | WS8-11 | Backlog | Whom to approach, and in what order | Digital Democracy by 11-13, then a Kentucky newsroom by 11-20, civic groups in W3, small funders in W4 | this order. Until WS8-01b merges, offer only links and embeds |
| 2026-11-13 | WS8-02 | Backlog | Three public bill endpoints no page calls | (a) delete / (b) keep with minimal hardening → (b), unless 30-day logs show no outside use | (b) |
| 2026-11-16 | WS7-02b | Backlog | Owner's browsers flagged internal | (a) opt out of capture / (b) tag and add to the cohort → (a) | (a) |
| 2026-11-16 | WS7-05 | Backlog | Email engagement measurement | (a) campaign labels / (b) also Resend click tracking / (c) also an open pixel → (a) | (a) |
| 2026-11-16 | WS7-09b | **Core** | Send in empty weeks? | (a) skip / (b) always send → (a) | (a) |
| 2026-11-16 | WS7-09c | **Core** | Near the Resend free tier | (a) daily send budget; upgrade only above ~2,500 a month / (b) upgrade now → (a) | (a) |
| 2026-11-16 | WS7-10 | Backlog | Remember my legislators on this device | (a) ship / (b) skip → (a) | (a) |
| 2026-11-18 | WS6-09a | Backlog | Official-link probe | (a) delete / (b) server-side cached check → (a) if `not_found` < 2% | (b) |
| 2026-11-18 | WS6-09b | Backlog | Bill H1; "Beta" chip | (a) `HB 500: <short title>` / (b) short title with the number above it → (a); remove the chip → (a) | (a); (a) |
| 2026-11-18 | WS6-11a | Backlog | Key-vote definition | (a) as proposed / (b) passage and override only / (c) none → (a) | (a) |
| 2026-11-18 | WS6-17b | Backlog | Heading typeface | (a) keep Adobe Fonts / (b) self-hosted serif / (c) Instrument Sans → (b) | (a), no change |
| 2026-11-20 | WS3-12b | Backlog | Topic and summary-hash coupling | (i) rewrite the hash / (ii) wait for WS3-09c → (i) | (i) |
| 2026-11-20 | WS4-06 | **Core** | Bills per-run cap | 250 / other → 250 | 250 |
| 2026-11-20 | WS4-13 | Backlog | Same-day roll calls in the bills sync | (a) build / (b) keep the votes cron → (a) | (a) |
| 2026-11-20 | WS8-07a | Backlog | Where method details live | (a) `/methodology` / (b) expand `/about` → (a) | (a) |
| 2026-11-20 | WS8-09 | Backlog | Outside pull requests | (a) issues first / (b) PRs welcome / (c) issues only → (a) | (a) |
| 2026-11-20 | WS8-15 | Backlog | Embeddable roll-call card | (a) W2, only with a written newsroom commitment / (b) W4 demo / (c) don't build → (c) | (c) |
| 2026-11-24 | WS6-12b | Backlog | Email-only follows | (a) build / (b) defer | (a) if a PR is open by 11-24, otherwise (b) |
| 2026-11-25 | WS6-18 | Backlog | Party labels in the bill-page vote list | (a) party letter as text / (b) names only → (a) | (b) |
| 2026-11-27 | WS3-09c | Backlog | Regenerating legacy summaries | (a) owner-run only / (b) scheduled batches → (a) | (a) |
| 2026-11-30 | WS4-07 | Backlog | Anthropic monthly Console limit | $40 / other / none → $40 | $40. The amount is adopted by WS4-04 (10-20); set it in the Console as soon as WS4-04 is answered, since it is not in force until set |
| 2026-12-05 | WS3-10 | Backlog | Regeneration scope | (a) changed 2026 enacted bills, ~$5–8 / (b) all 2026 RS, ~$50–60 / (c) 2024–26, ~$150 → (a) | (a). Runs only after WS4-07's retirement-date note |
| 2026-12-07 | WS7-08 | **Core** | Gating return metric; record the retention-bet status | (a) KPI-3 week-1 / (b) KPI-4 30-day → (a); status is recorded, not chosen | (a) |
| 2026-12-14 | WS8-08 | **Core** | April thresholds and verdict rules (README "The April 2027 decision") | (a) accept / (b) edit / (c) drop a rule → (a) or (b) | Accepted by default. After 2027-01-05, changes need an ADR and an entry in the file's own "Amendments" subsection |
| 2026-12-14 | WS9-05 | Backlog | `.org` redirect mechanism | (a) Vercel redirect domains / (b) Hostinger path-preserving forward → (a) | **No default.** Moves to W4 if not done |
| 2026-12-15 | WS9-11a | Backlog | Backup drill method; keep the dump? | (a) CLI dump to a local stack / (b) restore to a new project / (c) dashboard only → (a); keep → yes | (a) if Docker is available, otherwise (c); delete the dump |
| 2026-12-28 | WS7-11 | **Core** | Date to set `MY_LEGISLATORS_SEND=true` | (a) the first Monday after the drill (needs an owner-only FZ exception) / (b) 2027-01-05 before 11:00 UTC / (c) 2027-01-11 → (b) | (b), if the drill passes |
| 2027-04-01 | WS2-13 | Backlog | Legal review of `/privacy` and `/terms` | (a) pro bono / (b) paid / (c) skip and say so → (c) until a W4 trigger | (c) |
| 2027-04-10 | WS3-13 | Backlog | "Became law" wording | as recommended | as recommended |
| 2027-04-20 | WS9-14 | Backlog | Ops trims | docs-only cuts; page demotions | Apply the docs-only cuts. Page demotions are **blocked** until answered |
| 2027-04-30 | WS2-12b | Backlog | Enforce the CSP | enforce / keep Report-Only | Enforce only if the production Report-Only list is clean |
| 2027-04-30 | WS3-05b | Backlog | Build the ZIP-to-districts list | gate: ZIP ≥ 30% of lookups, or reader reports | not built |
| 2027-04-30 | WS3-06b | Backlog | Build LRC time/room updates | gate: committee-event email > 10 recipients a month | not built (decided at WS9-14) |
| 2027-04-30 | WS4-16 | Backlog | Paid tier for the next session | stay free / state-limited Pull / only for a second state → decide from the measured peak | Stay free; revisit when a partner agreement is drafted |
| 2027-04-30 | WS6-20 | Backlog | Retire list | (a) as proposed / (b) with edits / (c) keep all | (a) for "delete" rows whose evidence meets the threshold |
| **2027-04-30** | **WS8-16** | Backlog | **Go / partner / maintain** (README "The April 2027 decision") | five C7 options | **Maintain mode** (option 5), also if WS8-16 is never picked up |
| trigger | WS8-03, WS8-12 | Backlog | OCD IDs; per-session bulk file (member votes only if WS8-01a answer 1 is (a)) | written partner request | not built; member votes excluded |
| trigger | WS2-11c | **Core** | Ship Next 16 in FZ if a critical 15.x advisory has no patch | owner judgement | stays on 15.5.x |
| conditional | WS5-04a | Backlog | Special-session copy | ships only if the agent confirms it from the Kentucky Constitution | README fix only; copy listed under "Found, not fixed" |
| conditional | WS5-15 | Backlog | Zero-growth spec files grew since the 2026-10-06 final pass and cannot be trimmed back without losing executable content (step 3) | owner's PR review | the measured value, with the reason recorded in the ADR |

## 2. Owner-only actions

No agent may do these (manual §5). **Core** marks actions that Core WPs need. Each WP's own "Owner actions" list is authoritative and has the exact commands.

| When | Action | WP | Class |
|---|---|---|---|
| W0, before any WP starts | Merge the program-spec PR (`docs/program-spec/`) to `main`. Agents branch from `main` and edit `TRACKER.md` there (manual §2, §8); until the spec is on `main`, every WP is blocked. | all | **Core** |
| W0, by 10-12 | Answer the off-Vercel site-check question (Sentry Uptime if it is free, otherwise a daily check in `source-health.yml`). | WS9-01 | **Core** |
| W0, by 10-13 | Answer the WS2-03, WS2-05, WS3-03a, WS3-04, WS7-01 and WS7-06 decisions above, or let the defaults apply. | several | **Core** |
| W0, by 10-13 | Run the surname-collision aggregate query (counts only). It decides whether WS5-12a enters Core as a P0. | WS5-12a | Core check |
| W0, before WS2-02 merges | Confirm the operator token is set for Production in Vercel, and do the pre-merge check in the private note. After deploy, confirm the next scheduled crons return 200 and that `/admin/sync-status` opens with your token. | WS2-02 | **Core** |
| W0, before WS2-03 merges | Check the Supabase Authentication settings the private note lists. Enable leaked-password protection. On the preview, run the private note's end-to-end checks once, then delete the test account. Run the private note's aggregate count and record only the number. | WS2-03 | **Core** |
| W0, before WS2-05 merges | If outreach notes move out, copy them to your local, gitignored `docs/feedback/` first. Decide whether to tell the people whose details were public. | WS2-05 | **Core** |
| W0, after WS2-01 merges | Check that the Vercel build used the patched Next 15 version, and smoke-test a bill page, one ZIP lookup and a legislator page. | WS2-01 | **Core** |
| W0, by 10-20 | Confirm which account owns the LegiScan key (one key; never create or rotate one). Accept the budget. In GitHub → Actions, disable `backfill-vote-nv-counts` and `backfill-session-votes`. | WS4-04 | **Core** |
| W0 → 11-03 | Correct the funder-facing figures in Notion and the NLnet draft. Set the one ask figure before submitting to NLnet (deadline 11-03). | WS7-03 | **Core** |
| W0 | Stop the PMF survey and close the intent survey in PostHog. | WS7-06 | **Core** |
| W0, recommended by 10-20 | Turn on the dependency graph, Dependabot alerts and security updates, secret scanning and push protection. After WS1-04 merges, add a ruleset on `main` that requires CI. | WS1-07 | Backlog (toggle, no PR) |
| W0, recommended by 10-20 | Turn on 2FA and store recovery codes on every vendor account that can deploy, change DNS, read user data or spend money. | WS2-15 | Backlog (toggle, no PR) |
| W0, recommended by 10-20 | Make the page channel ring the phone. Arm the Sentry `[page]` rules. Check renewals and card expiry. | WS9-02 | Backlog (toggle, no PR) |
| W1, after WS9-02 | Disable the two Claude Code Routines. | WS5-07 | Backlog |
| W1 | Turn on GitHub private vulnerability reporting. | WS2-08 | Backlog |
| W1 → W3 | Outreach: Digital Democracy by 11-13, a Kentucky newsroom by 11-20, at least 3 organizations by 2027-01-31. Keep the log outside the repo. | WS8-11 | Backlog |
| W2, before WS4-03a merges | Run `npm run check:legiscan-quota` and confirm each scheduled tag's largest run is within its cap. After merge, re-enable the two backfill workflows. Never re-enable any LegiScan workflow to work around a cap. | WS4-03a | **Core** |
| W2, before WS7-07b and WS7-09a merge | Apply each migration with `npm run db:apply-sql -- supabase/migrations/NNN_*.sql` **before** merging. Confirm the Resend bounce and complaint webhooks (WS7-07b). | WS7-07b, WS7-09a | **Core** |
| W2, after WS7-09c and WS7-09d merge | Subscribe your own account and run the manual dry run in WS7-09c. | WS7-09c | **Core** |
| W2, after WS2-11c's preview | Confirm the Vercel Node.js version is 20.9 or higher. Smoke-test the preview, and watch the first day of crons and Sentry after deploy. | WS2-11c | **Core** |
| W2, after WS9-08 merges | Fill the `[owner]` cells without secrets. Add a monthly phone-calendar event, "KYvKY monthly check", December 2026 to April 2027. | WS9-08 | **Core** |
| Monthly from 12-04 | Do the one monthly check (`docs/ops/vendors.md` §Monthly check), including owner hours, and PR labels once WS5-05 exists. | WS9-08 (WS5-05) | **Core** |
| W2, by 12-07 | Record the retention-bet status: "shipped" if WS7-09c and WS7-09d are both merged, otherwise "deferred to W5". | WS7-08 | **Core** |
| W2, by 12-14 | Accept or edit each April threshold and the "partner conversation open" definition. | WS8-08 | **Core** |
| W2, before FZ | Read the session runbook and flag any check you will not do, so it is removed rather than ignored. | WS9-10 | **Core** |
| W2 | Apply the other migrations, each in the order its WP states (WS2-06b by 12-10). | WS2-06b, WS3-08, WS3-09a, WS3-11b, WS6-11a, WS8-07a | Backlog |
| W2, by 11-06 | Read the LegiScan, Open States and LRC terms. Choose the content license. | WS8-01a | Backlog |
| W2 | Set the Anthropic Console limit. Record the model's retirement date. | WS4-07 | Backlog |
| W2, before 12-07 | Run the first text-grounded production summaries (five bills), then the WS3-10 regeneration if the go/no-go passes. | WS3-09c, WS3-10 | Backlog |
| W2 (optional) | Restrict the Mapbox token by URL, with the checks in WS2-04. | WS2-04 | Backlog |
| W2, by 12-14 | Make the `.org` domains redirect with the path intact (DNS). | WS9-05 | Backlog |
| FZ | Run the measurement and email readiness drill checklist, including the allowlist test send. | WS7-11 | **Core** |
| FZ | Run the backup and restore drill. Sign the session go/no-go by 2027-01-04. | WS9-11a, WS9-12 | Backlog |
| 2027-01-02 → 01-08 | Verify the roster after the new members are seated. | WS9-13 | **Core** |
| 2027-01-05 | Set `MY_LEGISLATORS_SEND=true` and redeploy before 11:00 UTC (default (b)), if the email shipped and the drill passed. In W3, apply WS7-09c's stop rule on complaints or bounces. | WS7-11, WS7-09c | **Core** |
| W4 | Supply owner hours. Choose the legal review only if a trigger fires. Record the decision by 04-30 (default: maintain mode). | WS5-13, WS2-13, WS8-16 | Backlog (W4 promotions) |
