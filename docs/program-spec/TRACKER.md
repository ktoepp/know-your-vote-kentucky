# KYvKY program tracker

One row per work package (WP). The program front door is [README.md](README.md); how to pick up a WP and update a row is in the [agent operating manual](00-agent-operating-manual.md) §2 and §8. Owner decisions are in [OWNER-DECISIONS.md](OWNER-DECISIONS.md), and deferred items in [DEFERRED.md](DEFERRED.md).

The amendments from the 2026-10-06 consistency pass are applied in place; no separate amendment list exists.

**How to read a row.**

- Priority, Window, Tier, Size and Depends on are copied exactly from each WP's own table in its workstream file. If a row and the WP file ever differ, the WP file wins; note the mismatch under "Found, not fixed".
- **Class** is the WP's **Program class** line: `Core` (committed; 45 WPs) or `Backlog` (fully specified; needs the owner's go-ahead, manual §2 "Core vs Backlog"). Only the owner changes a Class.
- **Status** values (manual §8): `todo`, `in-progress`, `review`, `awaiting-owner`, `blocked`, `done`, `deferred`. Every row starts at `todo`. In your WP's PR, edit only your own row. On a merge conflict, rebase and resolve only that row.

**At a glance:**

- **WPs:** 167. **Core** 45, **Backlog** 122.
- **Priority:** P0 25, P0 if triggered 1, P1 95, P2 36, P3 10
- **Window** (by first code): W0 40, W1 22, W2 80, FZ 7, W3 1, W4 15, W5 2
- **Tier:** Sonnet 112, Opus 40, Owner 15
- **Size:** S 123, M 44
- **Core by window:** W0 24, W1 1, W2 16, FZ 2, W3 1, W4 1. **Core by tier:** Sonnet 27, Opus 14, Owner 4.

| ID | Title | WS | Priority | Window | Tier | Size | Depends on | Class | Status |
|---|---|---|---|---|---|---|---|---|---|
| WS1-01 | Restore the missing dataset-store import in two backfill scripts | WS1 | P0 | W0 | Sonnet | S | none | Core | done (#292) |
| WS1-02 | Type-check `scripts/` with its own tsconfig and clear the errors | WS1 | P0 | W0 | Sonnet | M | WS1-01, WS1-04 (soft: WS5-01a) | Core | todo |
| WS1-03 | Replace `next lint` with the ESLint CLI and a warning ceiling | WS1 | P1 | W0 | Sonnet | S | none | Core | todo |
| WS1-04 | Add a secret-free pull-request CI workflow and align the PR template | WS1 | P0 | W0 (target merge 2026-10-12) | Sonnet | M | none | Core | done (#293) |
| WS1-05a | Assert that LegiScan `getDataset` is reached only through the gated store | WS1 | P0 | W0 | Sonnet | S | none | Core | todo |
| WS1-05b | Add repo-invariant tests for migrations, script references and cron paths | WS1 | P2 | W2 | Sonnet | S | WS1-05a | Backlog | todo |
| WS1-07 | Protect `main` with a ruleset that requires CI and turn on GitHub security alerts | WS1 | P1 | W0 (toggles by 2026-10-20; ruleset the day after WS1-04 merges) | Owner | S | WS1-04 (ruleset steps only; the toggle steps depend on nothing) | Backlog | todo |
| WS1-09 | Convert the bill-status regression script into unit tests | WS1 | P1 | W2 (target merge 2026-11-20) | Sonnet | S | none | Backlog | todo |
| WS1-10 | Test status buckets and the progress meter end to end | WS1 | P1 | W2 (target merge 2026-11-20) | Sonnet | M | WS1-09 | Backlog | todo |
| WS1-11 | Extract and pin the AI summary input hash | WS1 | P1 | W1 (target merge 2026-10-30) | Sonnet | S | none | Backlog | todo |
| WS1-12 | Test that every outbound email carries the postal address and unsubscribe link | WS1 | P1 | W2 (target merge 2026-11-20) | Sonnet | S | none | Backlog | todo |
| WS1-13 | Caption the digest progress meter with the newest event | WS1 | P2 | W2 | Sonnet | S | none (merge after WS7-07b if WS7-07b is open) | Backlog | todo |
| WS1-15 | Pin district lookup against the committed boundaries | WS1 | P1 | W0 (target merge 2026-10-20) | Sonnet | S | none | Backlog | todo |
| WS2-01 | Patch Next.js 15 and clear production dependency advisories | WS2 | P0 | W0 | Sonnet | S | none (prefer after WS1-04) | Core | done (#294) |
| WS2-02 | Harden admin-route access control and consolidate six bearer-token checks into one constant-time guard | WS2 | P0 | W0 | Opus | M | none | Core | done (#295) |
| WS2-03 | Harden the post-signup session flow (owner decision) | WS2 | P0 | W0 | Opus | M | none | Core | done (#297) |
| WS2-04 | Guard Mapbox attribution on every shipped map surface | WS2 | P2 | W1 | Sonnet | S | WS5-02 | Backlog | todo |
| WS2-05 | Remove personal data from FEEDBACK.md and block its return | WS2 | P0 | W0 | Sonnet | S | none | Core | todo |
| WS2-06a | Stop the browser view-count write | WS2 | P1 | W0 | Sonnet | S | none | Backlog | todo |
| WS2-06b | Harden Supabase grants: revoke anonymous execute, pin search_path, drop the legacy dupes table | WS2 | P1 | W2 | Opus | S | WS2-06a | Backlog | todo |
| WS2-07 | Narrow CORS to public reads and retire the unused /api/intelligence route | WS2 | P1 | W0 | Sonnet | S | none | Backlog | todo |
| WS2-08 | Publish SECURITY.md | WS2 | P2 | W1 | Sonnet | S | none (toggles: WS1-07) | Backlog | todo |
| WS2-09a | Cut analytics, error-tracking and alert personal data | WS2 | P1 | W0 | Sonnet | S | none | Backlog | todo |
| WS2-09b | Make /privacy match the real data flows | WS2 | P1 | W1 | Opus | S | WS2-09a | Backlog | todo |
| WS2-10 | Close the unused service-role wrapper gap | WS2 | P3 | W2 | Sonnet | S | none | Backlog | todo |
| WS2-11a | Declare React 19 in package.json and fix type fallout | WS2 | P0 | W2 | Opus | M | WS2-01 | Core | todo |
| WS2-11c | Upgrade to Next 16, bump @mui/material-nextjs, rename middleware to proxy | WS2 | P0 | W2 | Opus | M | WS2-02, WS2-11a, WS1-03 | Core | todo |
| WS2-12a | Extract and correct the CSP in a tested function | WS2 | P3 | W4 | Sonnet | S | WS2-11c | Backlog | todo |
| WS2-12b | Enforce the CSP after a production Report-Only check | WS2 | P2 | W4 | Opus | S | WS2-12a | Backlog | todo |
| WS2-13 | Get a legal review of /privacy and /terms when a trigger fires | WS2 | P3 | W4 | Owner | S | WS2-09b | Backlog | todo |
| WS2-14 | Run the pre-session security readiness check | WS2 | P1 | FZ | Sonnet | S | WS2-01, WS2-02, WS2-03, WS2-05, WS2-06b, WS2-07, WS2-09b, WS2-11c, WS2-15 | Backlog | todo |
| WS2-15 | Confirm 2FA and recovery codes on every vendor account that can deploy, change DNS, read user data or spend money | WS2 | P1 | W0 | Owner | S | none | Backlog | todo |
| WS3-01 | Extract roll-call labelling into a tested library | WS3 | P0 | W0 | Sonnet | S | none | Core | done (#296) |
| WS3-02 | Show derived vote labels on member profiles | WS3 | P0 | W0 | Sonnet | S | WS3-01 | Core | todo |
| WS3-03a | Label unmatched roll calls honestly and fix the outcome chip | WS3 | P0 | W0 | Sonnet | S | WS3-01 | Core | todo |
| WS3-03b | Use sentence case and fewer underlines in bill history | WS3 | P2 | W2 | Sonnet | S | WS3-03a, WS6-09a | Backlog | todo |
| WS3-04 | State what each AI summary was built from and gate the audience clause | WS3 | P0 | W0 | Sonnet | S | none | Core | todo |
| WS3-05a | Say that a ZIP result is based on the ZIP's center | WS3 | P0 | W0 | Sonnet | S | none | Core | todo |
| WS3-05b | Name the districts a ZIP actually touches (conditional) | WS3 | P3 | W4 | Opus | M | WS3-05a | Backlog | todo |
| WS3-06a | Hide meeting rows superseded by a reschedule | WS3 | P1 | W1 | Sonnet | S | none | Backlog | todo |
| WS3-06b | Treat LRC time and room changes as updates (conditional) | WS3 | P3 | W4 | Opus | M | WS3-06a, WS4-05, WS4-10 | Backlog | todo |
| WS3-07 | Measure bill-text sources and choose one by a stated rule | WS3 | P1 | W1 | Opus | S | none | Backlog | todo |
| WS3-08 | Add a bill-text store and an on-demand fetcher | WS3 | P1 | W2 | Opus | M | WS3-07, WS3-04, WS4-09a (option a) or WS4-03a (option b) | Backlog | todo |
| WS3-09a | Add summary provenance columns and the v2 input hash | WS3 | P1 | W2 | Opus | S | WS1-11 | Backlog | todo |
| WS3-09b | Write prompt v2 with tool-use JSON and an evidence check | WS3 | P1 | W2 | Opus | M | WS3-09a | Backlog | todo |
| WS3-09c | Wire text grounding into the summary backfill with cost guards | WS3 | P1 | W2 | Opus | M | WS3-08, WS3-09a, WS3-09b | Backlog | todo |
| WS3-09d | Show the summarized version on the bill page and /about | WS3 | P1 | W2 | Sonnet | S | WS3-09a, WS3-04 | Backlog | todo |
| WS3-10 | Regenerate summaries for 2026 enacted bills that changed | WS3 | P1 | W2 | Owner | S | WS3-09c | Backlog | todo |
| WS3-11a | Check new text-grounded summaries against their text in the weekly audit | WS3 | P2 | W2 | Opus | M | WS3-09c, WS3-15 | Backlog | todo |
| WS3-11b | Let the owner suppress a bad summary with one command | WS3 | P1 | W1 | Opus | S | WS3-04 | Backlog | todo |
| WS3-12a | Add a subject fallback and an HB1 fix to the topic classifier | WS3 | P2 | W1 | Sonnet | S | none | Backlog | todo |
| WS3-12b | Switch topic tagging to the new classifier and reclassify | WS3 | P2 | W2 | Opus | S | WS3-12a, WS1-11 | Backlog | todo |
| WS3-13 | Use one "became law" status label on cards and filters | WS3 | P3 | W4 | Sonnet | S | WS1-10, WS3-03b, WS6-09a | Backlog | todo |
| WS3-14 | Publish a corrections log and the procedure behind it | WS3 | P1 | W1 | Sonnet | S | WS3-02, WS3-04 | Backlog | todo |
| WS3-15 | Make the accuracy audit's dry run skip the Anthropic pass | WS3 | P1 | W1 | Sonnet | S | none | Backlog | todo |
| WS4-01 | Publish one data budget and remove stale 30k quota references | WS4 | P0 | W0 | Sonnet | S | none | Core | done (#298) |
| WS4-02 | Count every LegiScan attempt and stop retrying rejected requests | WS4 | P0 | W0 | Opus | S | none | Core | todo |
| WS4-03a | Charge every LegiScan call to a per-run budget and deny unbudgeted processes | WS4 | P0 | W2 | Opus | M | WS4-01, WS4-02 | Core | todo |
| WS4-03b | Print estimates in the high-spend LegiScan scripts and make the hash path the default | WS4 | P1 | W2 | Sonnet | S | WS4-03a, WS1-01 (soft: WS5-01a) | Backlog | todo |
| WS4-04 | Confirm LegiScan key ownership and adopt the budget and paid-tier trigger | WS4 | P0 | W0 | Owner | S | WS4-01 | Core | done (owner 2026-10-08) |
| WS4-05 | Test all four LRC parsers against the saved pages | WS4 | P1 | W1 (merge by 10-30, or after 11-05) | Sonnet | M | none | Backlog | todo |
| WS4-06 | Make the hash-gated bills sync resumable, then turn on its run cap | WS4 | P0 | W2 | Opus | M | WS4-03a | Core | todo |
| WS4-07 | Set an Anthropic spend limit and record the model's retirement date | WS4 | P2 | W2 | Owner | S | WS4-01 | Backlog | todo |
| WS4-08 | Report LegiScan pace in the existing daily health check | WS4 | P1 | W2 | Sonnet | S | WS4-01, WS4-06 | Backlog | todo |
| WS4-09a | Route LRC fetches through one polite, deadline-aware helper | WS4 | P1 | W2 | Sonnet | M | WS4-01 | Backlog | todo |
| WS4-09b | Stop daily LRC fetches for sessions that cannot change | WS4 | P2 | W2 | Sonnet | S | WS4-09a | Backlog | todo |
| WS4-10 | Report an error when an LRC page parses to nothing | WS4 | P1 | W1 (merge by 10-30, or after 11-05) | Sonnet | S | WS4-05 | Backlog | todo |
| WS4-11 | Make one schedule registry the source of truth | WS4 | P2 | W2 | Sonnet | S | WS4-12 | Backlog | todo |
| WS4-12 | Delete the duplicate bills and legislators runs | WS4 | P1 | W2 | Sonnet | S | none | Backlog | todo |
| WS4-13 | Fetch new roll calls in the bills sync and delete the votes cron | WS4 | P1 | W2 | Opus | M | WS4-06 | Backlog | todo |
| WS4-15 | Rehearse the 2027 session load against the budget | WS4 | P1 | FZ | Sonnet | S | WS4-06 (soft: the other WS4 WPs) | Backlog | todo |
| WS4-16 | Review real session usage and publish the per-state data-cost sheet | WS4 | P2 | W4 | Sonnet | S | WS4-15 | Backlog | todo |
| WS5-01a | Archive one-off scripts and the aliases that point at them | WS5 | P1 | W0 (merge by 10-16) | Sonnet | S | none | Backlog | todo |
| WS5-01b | Cut npm aliases to an explicit keep-set and index `scripts/` | WS5 | P2 | W2 | Sonnet | S | WS5-01a (soft: WS5-07) | Backlog | todo |
| WS5-02 | Delete never-imported source files, drop `openai`, add an orphan guard | WS5 | P1 | W1 (merge by 10-30) | Sonnet | M | none (soft: WS2-07, WS1-05a) | Backlog | todo |
| WS5-03a | Freeze `TASKS.md` and `decisions.md` and start ADRs | WS5 | P1 | W0 (merge by 10-20) | Sonnet | S | none | Backlog | todo |
| WS5-03b | Write `CURRENT.md` and map every open `TASKS.md` item | WS5 | P1 | W1 (merge by 10-30) | Sonnet | S | WS5-03a | Backlog | todo |
| WS5-04a | Correct two wrong Kentucky-law statements (README veto rule, special-session copy) | WS5 | P1 | W0 (merge by 10-20) | Sonnet | S | none | Backlog | todo |
| WS5-04b | Rewrite the README to be short and accurate | WS5 | P2 | W2 | Sonnet | S | WS5-01b, WS5-03b | Backlog | todo |
| WS5-05 | Record the maintenance baseline and label PRs by type | WS5 | P2 | W1 (merge by 10-30) | Sonnet | S | WS5-03b, WS1-04 | Backlog | todo |
| WS5-06a | Remove parked local-government and executive-order code | WS5 | P2 | W2 (merge by 11-14) | Opus | M | WS5-02 (soft: WS2-07) | Backlog | todo |
| WS5-07 | Retire the LLM triage step and the two daily Claude Code Routines | WS5 | P1 | W1 (merge by 10-30) | Sonnet | S | none (Routine action after WS9-02) | Backlog | todo |
| WS5-08 | Move build- and script-only dependencies to dev and record `react-email` reachability | WS5 | P2 | W2 (before WS2-11c opens, about 11-21) | Sonnet | S | WS2-01, WS5-02 | Backlog | todo |
| WS5-09 | Remove the public `/design-system` page and the 712 KB design export | WS5 | P2 | W2 | Sonnet | S | none | Backlog | todo |
| WS5-10 | Remove the Tailwind and PostCSS toolchain | WS5 | P2 | W2 (merge by 11-14, else Deferred) | Sonnet | M | WS5-02, WS5-09 | Backlog | todo |
| WS5-12a | Check for surname collisions and, if any, require a first-initial match on profile sponsor matching | WS5 | P0 if triggered | W0 owner check (by 10-13); W1 fix (by 10-30) | Opus | S | none | Backlog | todo |
| WS5-12b | Pin legislator name matching with characterization tests | WS5 | P1 | W2 | Opus | M | WS5-12a | Backlog | todo |
| WS5-13 | Re-measure maintenance after the session and grade each plumbing subsystem | WS5 | P1 | W4 (merge by 04-17) | Sonnet | S | none (soft: WS5-05) | Backlog | todo |
| WS5-15 | Adopt "one in, one out" and enforce ceilings on dependencies, aliases, schedules, LLM callers and process-doc bytes | WS5 | P1 | W2 | Sonnet | S | WS5-03a (soft: WS5-01b, WS5-08, WS4-11) | Backlog | todo |
| WS5-16 | Write the maintain-mode profile, including dependency and framework currency | WS5 | P1 | W4 (merge by 04-24) | Sonnet | S | WS5-13 (soft: WS4-11, WS9-14) | Backlog | todo |
| WS6-01 | Close the mobile gap on Find my legislators and bring results into view | WS6 | P1 | W0 | Sonnet | S | none | Backlog | todo |
| WS6-02 | Make follow and signup copy match what an account actually does | WS6 | P1 | W0 | Sonnet | S | none | Backlog | todo |
| WS6-03 | Stop probing the LRC site on every bill page view | WS6 | P1 | W0 | Sonnet | S | none | Backlog | todo |
| WS6-05 | Lead member profiles with the voting record and an honest tally | WS6 | P1 | W0 | Sonnet | S | WS3-02 | Backlog | todo |
| WS6-04a | Put the address lookup in the home hero and remove the map preview | WS6 | P1 | W1 | Sonnet | S | WS6-01 | Backlog | todo |
| WS6-06 | Make Meetings a top-level destination and show agenda lines on meeting cards | WS6 | P1 | W2 | Sonnet | M | none | Backlog | todo |
| WS6-07 | Write meta descriptions that end on a word and never use unlabeled AI text | WS6 | P1 | W2 | Sonnet | S | none | Backlog | todo |
| WS6-08 | Add an axe check script and fix the audit's accessibility violations | WS6 | P1 | W2 | Sonnet | M | none | Backlog | todo |
| WS6-04b | Remove the remaining duplicate home sections and the lifetime-views ranking | WS6 | P1 | W2 | Sonnet | S | WS6-04a | Backlog | todo |
| WS6-09a | Split the bill page into server components with client islands | WS6 | P1 | W2 | Opus | M | WS3-01, WS3-03a, WS3-04, WS2-06a, WS6-03, WS6-08 | Backlog | todo |
| WS6-18 | Show how each member voted on a roll call | WS6 | P1 | W2 | Opus | M | WS6-09a, WS3-05a; soft: WS7-10 | Backlog | todo |
| WS6-09b | Lead the bill page with the plain-language summary and a version stamp | WS6 | P1 | W2 | Opus | M | WS6-09a, WS6-07 | Backlog | todo |
| WS6-10 | Make the home page and /bills follow the legislative calendar | WS6 | P1 | W2 | Sonnet | M | WS6-04b, WS6-06 | Backlog | todo |
| WS6-11a | Compute whole-session vote context for member profiles on the server | WS6 | P1 | W2 | Opus | M | WS3-02, WS3-04, WS6-05, WS6-07 | Backlog | todo |
| WS6-11b | Rebuild the member profile around key votes, with party shown as text | WS6 | P1 | W2 | Sonnet | M | WS6-11a, WS6-08 | Backlog | todo |
| WS6-12a | Add an email-link path for login, signup and the weekly email | WS6 | P1 | W2 | Opus | M | WS2-03 | Backlog | todo |
| WS6-12b | Let visitors follow a bill or committee with only an email address (optional) | WS6 | P2 | W2 | Opus | M | WS6-12a, WS6-02 | Backlog | todo |
| WS6-14 | Shorten /bills and /members on phones (optional) | WS6 | P2 | W2 | Sonnet | S | WS6-10 | Backlog | todo |
| WS6-15 | Remove post-hydration layout shift (optional) | WS6 | P2 | W2 | Sonnet | S | WS6-08 | Backlog | todo |
| WS6-16 | Run the axe check in CI with a no-regression baseline (optional) | WS6 | P2 | W2 | Sonnet | S | WS6-08, WS1-04 | Backlog | todo |
| WS6-17a | Raise body text size and add source links through tokens (optional) | WS6 | P2 | W2 | Sonnet | S | WS6-08 | Backlog | todo |
| WS6-17b | Decide the heading typeface and remove Typekit if chosen (optional) | WS6 | P2 | W2 | Sonnet | S | WS6-17a | Backlog | todo |
| WS6-19 | Run the pre-session product readiness drill | WS6 | P1 | FZ | Sonnet | S | WS6-04b, WS6-06, WS6-07, WS6-08, WS6-09b, WS6-10, WS6-11b, WS6-12a, WS6-18 | Backlog | todo |
| WS6-20 | Review session product usage and retire surfaces that did not earn their keep | WS6 | P1 | W4 | Sonnet | S | WS6-19, WS7-12, WS7-13 | Backlog | todo |
| WS7-01 | Define the KPIs once, record a filtered baseline, and close the Tier-1 handoff | WS7 | P0 | W0 | Sonnet | M | none | Core | todo |
| WS7-02a | Correct the internal-traffic doc | WS7 | P1 | W0 | Sonnet | S | none | Backlog | todo |
| WS7-02b | Add a URL flag that turns analytics off in the owner's browsers | WS7 | P2 | W2 | Sonnet | S | WS7-02a | Backlog | todo |
| WS7-03 | Correct funder-facing figures before the NLnet deadline | WS7 | P0 | W0 | Owner | S | WS7-01 | Core | todo |
| WS7-03b | Correct the launch month on /about | WS7 | P1 | W1 | Sonnet | S | WS7-03 | Backlog | todo |
| WS7-05 | Label email links by campaign instead of tracking opens | WS7 | P2 | W2 | Sonnet | S | none | Backlog | todo |
| WS7-06 | Stop the underpowered PMF survey and close the intent survey | WS7 | P2 | W0 | Owner | S | none | Core | todo |
| WS7-07a | Fix the account data export | WS7 | P0 | W0 | Sonnet | S | none | Core | todo |
| WS7-07b | Separate email kinds, record complaints, and trim the mail log | WS7 | P1 | W2 | Opus | M | WS7-07a | Core | todo |
| WS7-08 | Map every April decision metric to one KPI and write the measurement protocol | WS7 | P1 | W2 | Sonnet | S | WS7-01 | Core | todo |
| WS7-09a | Store a subscriber's districts and weekly opt-in | WS7 | P1 | W2 | Opus | M | none | Core | todo |
| WS7-09b | Build the My Legislators email from a pure builder and template | WS7 | P1 | W2 | Opus | M | WS3-01, WS3-02 (soft: WS1-12) | Core | todo |
| WS7-09e | Load the email's input in one pass per run | WS7 | P1 | W2 | Opus | M | WS7-09b, WS3-02 | Core | todo |
| WS7-09c | Send the weekly email from the notify cron under a daily send budget | WS7 | P1 | W2 | Opus | M | WS7-09a, WS7-09e, WS7-07b | Core | todo |
| WS7-09d | Offer the weekly email to signed-in visitors after a lookup and in preferences | WS7 | P1 | W2 | Sonnet | M | WS7-09a, WS3-05a | Core | todo |
| WS7-09f | Let signed-out visitors start the weekly email from an email link | WS7 | P1 | W2 | Sonnet | S | WS7-09d, WS6-12a | Backlog | todo |
| WS7-10 | Remember my legislators on this device and show them on the home page | WS7 | P2 | W2 | Sonnet | M | WS3-05a | Backlog | todo |
| WS7-14 | Record the October and election-period readout for the partner brief | WS7 | P1 | W2 | Sonnet | S | WS7-01, WS7-06 | Core | todo |
| WS7-11 | Run the pre-session measurement and email readiness drill | WS7 | P1 | FZ | Sonnet | S | WS7-01, WS7-07b, WS7-08, WS7-14; WS7-09c and WS7-09d if shipped | Core | todo |
| WS7-12 | Record the in-session monthly readouts | WS7 | P1 | W3 | Sonnet | S | WS7-11 | Core | todo |
| WS7-13 | Fill measured values for the April decision | WS7 | P1 | W4 | Sonnet | S | WS7-12, WS8-08 | Core | todo |
| WS8-01a | Confirm data rights and choose a license for KYvKY-authored content | WS8 | P1 | W2 | Owner | S | none | Backlog | todo |
| WS8-01b | Record data rights in one doc, one module and `/licenses` | WS8 | P1 | W2 | Sonnet | S | WS8-01a (defaults apply after 2026-11-06) | Backlog | todo |
| WS8-02 | Stop the public bill endpoints leaking internal columns and raw roll-call text | WS8 | P1 | W2 | Sonnet | S | WS2-07, WS3-01; soft: WS3-11b | Backlog | todo |
| WS8-03 | Add Open Civic Data identifiers to the member-vote route (trigger-gated) | WS8 | P3 | W5 | Sonnet | S | trigger; WS6-18, WS8-02 | Backlog | todo |
| WS8-05a | Correct `llms.txt` and test it against the code | WS8 | P1 | W1 (merge by 2026-10-30) | Sonnet | S | none | Backlog | todo |
| WS8-05b | Add session-qualified identifiers and official-source links to bill JSON-LD | WS8 | P2 | W2 | Sonnet | S | WS6-07, WS8-05a | Backlog | todo |
| WS8-07a | Add read-only coverage-stats SQL functions and a pure section model | WS8 | P1 | W2 | Opus | S | none; soft: WS3-09a | Backlog | todo |
| WS8-07b | Publish `/methodology` and point `/about`, the footer and `llms.txt` at it | WS8 | P1 | W2 (merge by 2026-12-14) | Sonnet | S | WS8-07a, WS3-14; soft: WS8-01b, WS8-05a | Backlog | todo |
| WS8-08 | Pre-register the April thresholds and verdict rules, and map verdicts to the five options | WS8 | P1 | W2 (merge by 2026-12-14) | Sonnet | S | WS7-08 | Core | todo |
| WS8-09 | Add CONTRIBUTING.md and a data-error issue form | WS8 | P3 | W2 or later (only if W2 capacity remains; otherwise W4) | Sonnet | S | WS2-08, WS3-14 | Backlog | todo |
| WS8-10 | Draft the partner capability brief and demo path | WS8 | P1 | W1 (v0 merge by 2026-10-30, otherwise by 11-10) | Sonnet | S | WS3-02, WS7-01; soft: WS4-01, WS8-07b | Backlog | todo |
| WS8-11 | Hold discovery conversations with Digital Democracy and a Kentucky newsroom | WS8 | P1 | W1 → W3 | Owner | S | WS2-05, WS3-02, WS5-04a, WS8-10; soft: WS5-04b, WS8-01a, WS8-01b | Backlog | todo |
| WS8-12 | Publish a one-off per-session file of the KYvKY layer (trigger-gated) | WS8 | P3 | W5 | Sonnet | S | trigger; WS8-01b, WS8-02 | Backlog | todo |
| WS8-14a | Assemble the evidence index, portability catalog and sunset path | WS8 | P1 | W4 (merge by 2027-04-24) | Sonnet | M | soft: WS8-10, WS9-07, WS9-08, WS4-16, WS5-13, WS5-16 | Backlog | todo |
| WS8-14b | Write a one-off data dictionary from an owner schema query | WS8 | P2 | W4 | Sonnet | S | none | Backlog | todo |
| WS8-15 | Ship an embeddable roll-call card for newsrooms (decision-gated) | WS8 | P3 | W2 if (a), otherwise not built | Opus | M | WS2-11c, WS3-01, WS8-02 (option b), WS8-01b | Backlog | todo |
| WS8-16 | Record the go / partner / maintain decision | WS8 | P1 | W4 (by 2027-04-30) | Owner | S | WS7-13, WS8-08, WS5-13, WS5-16; soft: WS8-14a, WS8-14b | Backlog | todo |
| WS9-01 | Route every page-worthy alert to one channel and add an off-Vercel site check | WS9 | P1 | W0 | Sonnet | S | none | Core | todo |
| WS9-02 | Make the page channel ring the owner's phone, arm the Sentry rules, and check renewals | WS9 | P1 | W0 | Owner | S | WS9-01 | Backlog | todo |
| WS9-03 | Publish the release calendar, the election freeze and the deploy checklist | WS9 | P1 | W0 | Sonnet | S | none | Core | todo |
| WS9-06a | Write the LegiScan quota and ban-risk runbook before enforcement | WS9 | P0 | W0 | Opus | S | none | Core | todo |
| WS9-04 | Start `docs/ops/log.md` and cap the ops docs with a test | WS9 | P1 | W1 | Sonnet | S | WS9-01, WS9-03 | Core | todo |
| WS9-05 | Make the `.org` domains redirect with the path intact | WS9 | P2 | W2 | Owner | S | none | Backlog | todo |
| WS9-06b | Write one runbook file for LRC, Open States, Supabase and email | WS9 | P1 | W2 | Opus | M | WS9-04 | Core | todo |
| WS9-08 | Inventory vendors, list what does not transfer, and define the one monthly check | WS9 | P2 | W2 | Sonnet | S | WS9-04 | Core | todo |
| WS9-11b | Check that the migrations rebuild the production schema | WS9 | P2 | W2 | Opus | S | none | Backlog | todo |
| WS9-07 | Catalogue every env var by name and purpose, with a one-way drift test | WS9 | P2 | W2 (after WS5-02; target 12-11) | Sonnet | S | WS9-04, WS5-02 (soft: WS5-01b) | Backlog | todo |
| WS9-10 | Write the 2027 session runbook: go/no-go list, key dates, daily and weekly checks | WS9 | P1 | W2 | Sonnet | S | WS9-03, WS9-06a, WS9-06b, WS9-08 | Core | todo |
| WS9-11a | Run the database backup and restore drill | WS9 | P1 | FZ | Owner | M | WS9-06b | Backlog | todo |
| WS9-12 | Run the session go/no-go and record the result | WS9 | P1 | FZ | Sonnet | S | WS9-10 | Backlog | todo |
| WS9-13 | Verify the roster after the newly elected members are seated | WS9 | P0 | FZ→W3 (2027-01-02 → 01-08) | Owner | S | WS9-10 | Core | todo |
| WS9-14 | Review session operations, trim what did not earn its keep, and hand the ops floor to WS5-16 | WS9 | P1 | W4 (merge by 2027-04-24) | Sonnet | S | WS9-12, WS9-13 (soft: WS5-13) | Backlog | todo |

## Retired-ID map

Retired IDs are never reused. If a WP, PR or older note cites an ID in the left column, read it as the right column.

| Old ID | Now |
|---|---|
| WS1-05 | Split: WS1-05a (D1 gating, W0) and WS1-05b (hygiene, W2) |
| WS1-06 | Folded into WS1-04 (PR template) |
| WS1-08 | Deferred (Dependabot version updates, `.github/dependabot.yml`). The security toggles are in WS1-07 |
| WS1-13a | Deferred (digest extraction) |
| WS1-13b | Renumbered WS1-13 |
| WS1-14 | Folded into WS9-12 as WS1's "Pre-session gate checks" |
| WS2-06, WS2-09 | Split: WS2-06a/06b and WS2-09a/09b. A bare "WS2-06" means WS2-06a. A bare "WS2-09" means both halves |
| WS2-11b | Retired: the lint change is WS1-03; the `@mui/material-nextjs` bump is in WS2-11c |
| WS2-11d | Deferred (Turbopack) |
| WS3-03, -05, -06, -09, -11, -12 | Groups: WS3-03a/b, 05a/b, 06a/b, 09a–d, 11a/b, 12a/b |
| WS4-14, old WS4-13 (batch) | No WS4-14 exists. The batch path and the model evaluation are Deferred, and WS4-13 now means the roll-call WP |
| WS5-01, -03, -04, -12 | Split: WS5-01a (archive, W0) / 01b (aliases, W2); 03a (freeze) / 03b (`CURRENT.md`); 04a (Kentucky-law fixes) / 04b (README rewrite); 12a (surname fix) / 12b (tests) |
| WS5-06b, WS5-11, WS5-14a, WS5-14b | Deferred (parked-table drop, lucide swap, pipeline split) |
| WS6-04, -09, -11, -12, -17 | Groups: WS6-04a/b, 09a/b, 11a/b, 12a/b, 17a/b. View-count readers on the home page are WS6-04b's |
| WS6-13 | Deferred (legislator follows) |
| WS7-02, WS7-07 | Split: WS7-02a/02b and WS7-07a (export fix) / 07b (email kinds and log trim) |
| WS7-04 | Folded into WS7-01 (Tier-1 handoff close-out, WS7-01 step 10) |
| WS7-09 | Group: WS7-09a–f (09e is the loader, 09f the signed-out path) |
| WS8-04 | Retired: no `/data` page or OpenAPI document (Deferred). Its license and fair-use text are in WS8-01b and WS8-07b. Where older text links "WS8-04's `/data` page", link `/methodology` (WS8-07b) |
| WS8-05, WS8-07, WS8-14 | Groups: WS8-05a/b, 07a/b, 14a/b |
| WS8-06 | Replaced by WS8-14b (a one-off data dictionary, no drift test) |
| WS8-13 | Retired: the portability catalog is in WS8-14a; the code seam is Deferred |
| WS8-17 | Never adopted; maintain mode is WS5-16 |
| WS9-06c | Merged into WS9-06b (its email section). Reader reports go to WS3-14 |
| WS9-09 | Retired: the time-sensitive parts are in WS9-08 (§Does not transfer) and WS9-10. The transfer order is Deferred |
| WS9-11 | Split: WS9-11a (owner drill, FZ) and WS9-11b (schema check, W2) |
