# WS3 — Data accuracy & trust

## Purpose

KYvKY's one durable asset is that a Kentuckian can trust what it says about a bill, a roll call and *their* legislators (C1, C4). Today four things people actually read can mislead them:

- Member profiles print LegiScan's broken roll-call labels, such as "House: Veto Override RCS# 155" on ordinary votes (U1).
- Bill histories show unexplained "Failed" rows on bills that passed (U3).
- AI summaries are written from the title, the one-to-two-sentence LegiScan description, the status, topic and subject labels and any editor notes, never the bill text. They can describe a version of the bill that no longer exists (A1, A2).
- A ZIP lookup quietly returns one pair of legislators for a ZIP that may span several districts (U6).

This workstream fixes the election-critical labels first (before 2026-11-03). Next it makes every summary say honestly what it was built from, and gives the owner a one-command way to hide a bad summary. Only then, and only if a dated go/no-go passes, does it ground new summaries in the official text of the version they describe. It keeps the good practice already in place (A9) and adds no schedules.

**Priority rule for W2 capacity.** Vote labels and the roll-call ↔ legislator link are the defensible niche (C1). When they compete with summary work for W2 capacity, they win. Plain-language AI summaries are offered free elsewhere (C1), and a partner such as Digital Democracy brings its own pipeline (C2). WS3's summary work therefore aims at an honest, cheap and reversible floor (WS3-04, WS3-11b). The text-grounding stack (WS3-07 → WS3-09d) is built only if it fits before the freeze, and it carries a W4 sunset test.

**Owned findings:** U1, U3, U5, U6, A1, A2, A3, A4, A6, A7 (deferred, see "Deferred"), A9 (preserve), and errata N1 (WS3-15) and N5 (with WS6-06).

**Program class:** 5 of this file's 23 WPs are Core (WS3-01, WS3-02, WS3-03a, WS3-04, WS3-05a: the W0 election-critical fixes); the other 18 are Backlog. Definition-of-done items 1, 2 (description basis), 4 (through WS3-04's caveat), 8 and 10 are met by Core WPs. Items 3, 5, 6, 7 and 9 apply only to the Backlog WPs the owner picks up.

**Tracker.** Steps below that record evidence "in the tracker" mean the WP's row in `docs/program-spec/TRACKER.md`. Owner decisions and their defaults are in `OWNER-DECISIONS.md`; deferred items, with their W4 status, are in `DEFERRED.md`.

**Definition of done for the workstream** (each item objectively checkable):

1. **Vote labels.** No member-profile vote row and no bill-history row renders LegiScan's raw roll-call description. `git grep -n "r.description || 'Roll call'"` returns nothing, and the WS3-01 unit tests assert that no fallback label contains "floor". On three named member profiles (WS3-02 Owner actions), no row label contains `RCS#` or `RSN#`. Every roll call that cannot be matched to an official history action says so in words (WS3-03a).
2. **Summary provenance.** Every rendered AI summary states its basis. It gives either the text version and date it summarized, or the sentence "Written by AI from the bill's title and official description, not the full bill text." (WS3-04, WS3-09d).
3. **Grounding (conditional on the 2026-12-07 go/no-go).** If the go/no-go passes, then by 2027-02-15 at least 90% of 2027 Regular Session bills with an AI summary have `ai_summary_basis = 'bill_text'`, checked with the SELECT in WS3-09c Owner actions. If it does not pass, this item is replaced by item 2 plus item 4 for the whole 2027 session, and the grounding WPs move to W4/W5.
4. **Superseded versions.** Every 2026 Regular Session bill that became law and has a committee-substitute or amended text version either has a text-grounded summary (WS3-10) or shows the "changed after it was introduced" caveat (WS3-04).
5. **Bad-summary response.** From 2026-10-30, the owner can hide any one bill's summary with one command, and the page then says the summary is being corrected (WS3-11b). If the go/no-go passed, the weekly audit during W3 also checks up to `ACCURACY_SUMMARY_TEXT_CAP` (default 30) of the most-viewed text-grounded summaries generated in the prior 8 days against their stored text (WS3-11a).
6. **Topics.** HB1 (2026 RS) is no longer tagged "Voting Rights" or "Elections" in production. The share of untagged 2026 RS bills is recorded before and after the reclassify (WS3-12b Owner actions). At least 10 per-bill topic regression tests run in `npm test` (WS3-12a).
7. **Meetings.** `/meetings`, including the `?q=` agenda search path, and committee pages never show the same committee on the same date as both cancelled and scheduled (WS3-06a).
8. **ZIP lookups.** Every ZIP lookup result says it is based on the center of the ZIP, that district lines can split a ZIP code, and offers a street-address lookup (WS3-05a).
9. **Accountability.** A public `/corrections` page with at least three dated, owner-approved corrections is live by 2026-10-30. `docs/corrections-procedure.md` says how to make one (WS3-14).
10. **Cost.** No new schedule, cron or workflow. In-session Anthropic spend for summaries plus the audit stays inside the $40/month Anthropic Console limit (adopted with the budget in WS4-04, set by the owner in WS4-07). WS3 adds no metering table or month counter. Agent-initiated LegiScan spend is zero.

**WS3 ongoing cost (net, after all WPs merge).**
- **Interim (W4 onward, no session):** about 0.5 h/month (corrections entries, the occasional suppression) and about $0/month of new spend.
- **In session, if the go/no-go passes:** about 1–1.5 h/month of owner time. Anthropic rises to an estimated $15–35/month for text-grounded summaries, against about $5/month today [estimate: about 2,500 new text versions per session at about $0.03 each; WS3-07 replaces this figure with a measurement]. The audit text pass adds about $4/month. Bill-text fetches are about 2,000–3,000 per session, spread across about 60 session days. They are LRC PDF fetches under option (a), or LegiScan queries under option (b).
- **In session, if it does not pass:** about 0.5–1 h/month and no new spend.
- **Removed:** the metadata-only check of text-grounded summaries (the audit keeps it only for description-based ones), the open TASKS.md ~424 item, and one-bill-at-a-time topic keyword tuning.
- **Against E13:** the grounding stack is the only WS3 item that adds recurring cost. Its W4 sunset test is in WS3-11a.

**Interfaces with other workstreams**

| Topic | Other workstream's WP / finding | How WS3 relates |
|---|---|---|
| Test harness and CI | WS1-04 (E7, E8) | Every WS3 test is a `src/**/*.test.ts` file and runs under `npm test` and WS1-04's CI. WS3 adds no harness. |
| Status tests | WS1-10 (creates `src/lib/bill-display.test.ts`) | WS3 never creates that file. WS3-03b uses `src/lib/bill-history-display.test.ts`. WS3-13 updates WS1-10's expectations in its own diff. |
| Summary input hash | WS1-11 (pins the v1 hash, target 2026-10-30) | WS3-09a adds a v2 hash beside v1 with its own golden tests. WS3-12b's optional hash rewrite reuses WS1-11's v1 function. Both state the regeneration estimate WS1-11 requires. |
| Script-reference invariant | WS1-05b | Any npm script WS3 adds is registered there if the test exists. |
| Email footers | WS1-12, WS1-13 | WS3 changes no email. Digest status text keeps its current wording (out of scope for WS3-13). |
| LegiScan budget | WS4-01, WS4-03a, WS4-04 (D1) | WS3 spends zero LegiScan queries unless WS3-07 picks option (b). In that case the production fetch goes through WS4-03a's per-run budget and is counted in WS4-01's budget. |
| Anthropic spend limit | WS4-04 (adopts the budget, including a $40/month Console limit), WS4-07 (Owner sets it in the Anthropic Console and records the model's retirement date; no code) | WS4 delivers no metering code, so WS3 uses none. WS3-09b prices each call from `message.usage` with a per-model price constant kept beside `KY_DEFAULT_ANTHROPIC_MODEL`. WS3-09c's `--max-usd` sums **this run's** usage only. The Console limit is the monthly backstop. No WS3 WP depends on WS4-07, so its 2026-11-30 default cannot delay the 2026-12-07 go/no-go. |
| LRC fetches | WS4-09a (`fetchLrcPage`), WS4-09b | If WS3-07 picks option (a), WS3-08 adds a binary variant to WS4-09a's helper (same gate, User-Agent and retries) and depends on WS4-09a. WS3-08 fetches only for summary candidates of a session WS4-09b's rule still refreshes. |
| Summary workflow | WS4-12 (keeps bills and summaries in `.github/workflows/sync-ky-bills-status.yml`, deletes only the Vercel duplicate bills cron, moves `accuracy-audit.yml` to 14:00 Sunday) | WS3 adds no workflow step. WS3-09c changes only the arguments and comment of the existing "Summarize new/changed bills" step in `.github/workflows/sync-ky-bills-status.yml`. |
| Eval set, batch path and model retirement | WS4 Deferred rows "Batch API path" and "Summary model evaluation" (keep one eval set, WS3's); WS4-01 step 3 and WS4-07 step 3 (model retirement date, A8) | WS3-09b creates the only eval set, `fixtures/ai-eval/bills-20.json` (20 bill identifiers, no text). WS3 builds no batch path: WS3-09b's request builder is standalone and WS3-10 uses the synchronous backfill. WS3-10 runs only after WS4-07 step 3's retirement-date note is in `docs/data-budget.md`. If retirement falls before 2027-04-30, the model-switch WP that note opens merges first, so the switch and the grounding regeneration share one run. |
| Script count | WS5-01b (≤ 40 npm aliases) | WS3 adds at most two npm scripts (`summaries:suppress` in WS3-11b, `spike:bill-text` in WS3-07, deletable after the decision). Aliases added by merged WPs are exempt from the cap and listed in `scripts/README.md`. |
| Generator file | WS5-06a (removes parked generator code; W2, merge by 11-14) | WS3-04 deletes one line in `ky-content-generation.ts` in W0. Whichever merges second rebases. |
| Routine retirement | WS5-07 | WS3 builds no review queue, so it gives WS5-07 no evidence for retiring the "accuracy spot check" Routine. WS5-07 relies on WS9-01/02 paging. |
| Meetings UI | WS6-06 (W2, edits `ky-ga-browse-server.ts` and cards, and fetches upcoming meetings separately for N5) | WS3-06a (W1) changes only which rows are returned and leaves `.limit(500)` alone. Whichever of WS3-06a and WS6-06 merges second rebases. |
| Meta descriptions | WS6-07 (W2, stops using `ai_summary` in meta and JSON-LD) | Until WS6-07 merges, WS3-04 strips the audience clause from those two fallbacks and WS3-11b hides suppressed summaries there. WS6-07 then deletes the fallbacks. |
| Bill page split | WS6-09a (W2, `computeEffectiveStatus`, moves helpers to `bill-detail-view-model.ts`) | WS3-01 moves `rollCallChamberFromDesc`, `matchVotesToHistory` and `deriveRollCallLabel` to `src/lib/roll-call-label.ts`, and WS3-04 moves `textDateOrNull` and `TEXT_TYPE_LABELS` to `src/lib/bill-text-versions.ts`, so WS6-09a imports them rather than moving them again. WS3-03b and WS3-13 land after WS6-09a and use its files. |
| Bill page version stamp | WS6-09b | WS6-09b imports `aiSummaryBasisLine()` from `src/lib/ai-summary-basis.ts` (WS3-04, extended by WS3-09d) and never re-types basis copy. |
| Member-page AI line | WS6-11a (`plainLanguageLine`) | It must return `null` for a suppressed summary (`summaryForDisplay()` from WS3-11b) and use `billChangedAfterIntroduction()` from WS3-04. |
| Status labels | WS6-14 (density) | WS3-13 owns what status labels say. WS6-14 no longer changes how many chips a row shows (moved to WS6's Deferred list). |
| Weekly email and remember-me | WS7-09b, WS7-09e, WS7-09d, WS7-09f, WS7-10 | WS7-09b and WS7-09e use WS3-01's labels. WS3-05a lists no candidate districts, so WS7-09d, WS7-09f and WS7-10 treat **every** ZIP lookup (`lastLookupType === 'zip'` in `DistrictMapExplorer.tsx`) as unresolved, and offer "email me" or "remember" only after an address or map-click result. |
| Public API and methods page | WS8-02, WS8-07a, WS8-07b, WS8-08 | WS8-02 exposes `ai_summary_basis` once it exists and omits suppressed summaries via `summaryForDisplay()`. WS8-07a counts `ai_summary_basis = 'bill_text'` only if WS3-09a's column exists. WS8-07b imports `aiSummaryBasisLine()` and `UNMATCHED_ROLL_CALL_CAPTION` and links `/corrections`. WS8-08 links WS3-11a's sunset test as an input to the April review and does not turn it into a threshold. |
| Release calendar | WS9-03 (election freeze 2026-10-31 → 11-05, P0 only) | WS3-06a, WS3-11b and WS3-14 target merge by 2026-10-30. |
| Reader reports | WS9-01 (`docs/ops/README.md`), WS9-06a/b runbooks | There is no separate reader-report runbook: WS3-14's `docs/corrections-procedure.md` owns reader reports. `docs/ops/README.md` and the WS9-06a/b runbooks link it and do not copy it. |
| Session review | WS9-14 (W4) | It applies WS3-11a's sunset test and the WS3-05b and WS3-06b gates. |

**Out of scope:** new data sources other than official bill text, a second state, summaries in email digests (decisions.md 2026-05-10 and 2026-06-26 keep AI out of email), structured `affects[]` fields and audience lens pages (TASKS.md ~151), LRC record-vote scraping (`docs/specs/lrc-vote-scrape.md`, shelved 2026-08-02), model migration (A8: WS4-01/WS4-07 record the retirement date; a model-switch WP opens only if it falls before 2027-04-30), meta descriptions (A5, WS6-07), page layout and visual design (U2, U8 layout, U16 visuals), digest email status wording.

## WP summary

| ID | Title | Priority | Window | Tier | Size | Depends on | Class |
|---|---|---|---|---|---|---|---|
| WS3-01 | Extract roll-call labelling into a tested library | P0 | W0 | Sonnet | S | none | Core |
| WS3-02 | Show derived vote labels on member profiles | P0 | W0 | Sonnet | S | WS3-01 | Core |
| WS3-03a | Label unmatched roll calls honestly and fix the outcome chip | P0 | W0 | Sonnet | S | WS3-01 | Core |
| WS3-03b | Use sentence case and fewer underlines in bill history | P2 | W2 | Sonnet | S | WS3-03a, WS6-09a | Backlog |
| WS3-04 | State what each AI summary was built from and gate the audience clause | P0 | W0 | Sonnet | S | none | Core |
| WS3-05a | Say that a ZIP result is based on the ZIP's center | P0 | W0 | Sonnet | S | none | Core |
| WS3-05b | Name the districts a ZIP actually touches (conditional) | P3 | W4 | Opus | M | WS3-05a | Backlog |
| WS3-06a | Hide meeting rows superseded by a reschedule | P1 | W1 | Sonnet | S | none | Backlog |
| WS3-06b | Treat LRC time and room changes as updates (conditional) | P3 | W4 | Opus | M | WS3-06a, WS4-05, WS4-10 | Backlog |
| WS3-07 | Measure bill-text sources and choose one by a stated rule | P1 | W1 | Opus | S | none | Backlog |
| WS3-08 | Add a bill-text store and an on-demand fetcher | P1 | W2 | Opus | M | WS3-07, WS3-04, WS4-09a (option a) or WS4-03a (option b) | Backlog |
| WS3-09a | Add summary provenance columns and the v2 input hash | P1 | W2 | Opus | S | WS1-11 | Backlog |
| WS3-09b | Write prompt v2 with tool-use JSON and an evidence check | P1 | W2 | Opus | M | WS3-09a | Backlog |
| WS3-09c | Wire text grounding into the summary backfill with cost guards | P1 | W2 | Opus | M | WS3-08, WS3-09a, WS3-09b | Backlog |
| WS3-09d | Show the summarized version on the bill page and /about | P1 | W2 | Sonnet | S | WS3-09a, WS3-04 | Backlog |
| WS3-10 | Regenerate summaries for 2026 enacted bills that changed | P1 | W2 | Owner | S | WS3-09c | Backlog |
| WS3-11a | Check new text-grounded summaries against their text in the weekly audit | P2 | W2 | Opus | M | WS3-09c, WS3-15 | Backlog |
| WS3-11b | Let the owner suppress a bad summary with one command | P1 | W1 | Opus | S | WS3-04 | Backlog |
| WS3-12a | Add a subject fallback and an HB1 fix to the topic classifier | P2 | W1 | Sonnet | S | none | Backlog |
| WS3-12b | Switch topic tagging to the new classifier and reclassify | P2 | W2 | Opus | S | WS3-12a, WS1-11 | Backlog |
| WS3-13 | Use one "became law" status label on cards and filters | P3 | W4 | Sonnet | S | WS1-10, WS3-03b, WS6-09a | Backlog |
| WS3-14 | Publish a corrections log and the procedure behind it | P1 | W1 | Sonnet | S | WS3-02, WS3-04 | Backlog |
| WS3-15 | Make the accuracy audit's dry run skip the Anthropic pass | P1 | W1 | Sonnet | S | none | Backlog |

**Execution notes.**

- **W0 (merge by 2026-10-20):** WS3-01 → 02 → 03a in sequence. WS3-04 and WS3-05a run in parallel with them. All five are size S and Core.
- **W1 (merge by 2026-10-30, the day before WS9-03's election freeze; all Backlog):** WS3-06a, WS3-11b, WS3-14, WS3-15 and WS3-12a (which changes no production path). WS3-07, the spike, deploys nothing and should also finish in W1, so the source decision is answered before W2 opens.
- **W2 grounding stack (5 agent PRs, all Backlog):** WS3-08 → 09a → 09b → 09c, plus 09d, in that order. WS3-10 is an Owner run.
- **W2 cut line.** If W2 falls behind, cut in this order: WS3-11a (to W4), WS3-03b (hand to WS6 or move to W4), WS3-12b (to W4), then narrow WS3-10 to the 25 most-viewed candidates.
- **Go/no-go for the in-session text pipeline: 2026-12-07.** **Go** if WS3-08, 09a, 09b and 09c are merged and the owner's first production run (WS3-09c Owner action 4: five bills) has written five `bill_text` summaries with spend recorded. **No-go** otherwise. On no-go, WS3-09c's production use, WS3-10 and WS3-11a move to W4/W5. WS3-08, 09a, 09b and 09d may still merge, because they change nothing in production on their own. The 2027 session then runs on description-based summaries with WS3-04's basis label and changed-bill caveat, which already makes A2 honest at zero cost. Record the result in `TRACKER.md` and in a decision note (≤ 15 lines).
- **Nothing from WS3 merges in FZ** except P0 fixes.

---

### WS3-01 · Extract roll-call labelling into a tested library

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Sonnet | S | none | U1, U3, E7 |

- **Program class:** Core
- **Owner decision:** none.
- **Data-limit impact:** none. Pure functions and fixtures only. No LegiScan, Open States, LRC or Anthropic calls.
- **Ongoing cost:** removes about 80 lines of untested logic from a 1,269-line client component and replaces them with a tested module. About 0 h/month.
- **Why:** The bill page already derives a trustworthy label for each roll call from the official action history, because LegiScan's Kentucky roll-call `desc` says "Veto Override" or "Third Reading" for every vote (U1). That logic lives inside `BillDetailView.tsx`, so the member page, the weekly email (WS7-09b) and the public API (WS8-02) cannot reuse it, and it has no tests (E7). It also matches the tally by plain substring, so a tally like `8-0` can match an action that says `38-0`.
- **Current state (verified 2026-10-06):**
  - `src/components/bills/BillDetailView.tsx`: `rollCallChamberFromDesc` (line ~152), `deriveRollCallLabel` (~166–188), whose fallback is `` `${chamberLabel} floor vote` `` or `'Floor vote'` at line ~187, and `matchVotesToHistory` (~208–233). Both matchers use `norm(h.action).includes(\`${yea}-${nay}\`)`, a substring test with no digit boundary.
  - `src/lib/ky-bill-detail-server.ts` `fetchDbVotes` (~55–110) does a read-time dedupe of twin roll-call rows (same date, tally and RCS#/RSN#). The member page does not (TASKS.md ~537: "the member-profile RPC (`get_votes_for_legislator`) and any other consumer still see raw rows").
  - `src/lib/ky-vote-dedupe.ts` holds the *sync-time* twin guard (`physicalKey`, `dropDuplicateRollCallRows`), which is a separate concern.
  - No test file covers any of this.
- **Do:**
  1. Create `src/lib/roll-call-label.ts` with no React and no Supabase imports. Export:
     - `rollCallChamberFromDesc(desc)` (moved verbatim).
     - `rollCallNumberFromDesc(desc): string | null`, parsing `/(?:RCS|RSN)#\s*(\d+)/i` (the regex `fetchDbVotes` uses).
     - `historyActionMatchesTally(action, yea, nay): boolean`. Normalize whitespace and en dashes to `-`. Then require a non-digit (or the string edge) on both sides of `${yea}-${nay}`, for example `new RegExp(\`(^|\\D)${yea}-${nay}(\\D|$)\`)`.
     - `matchRollCallToHistory(vote, history): number`, returning the history index or `-1`. Keep today's chamber rule: prefer a same-date entry, else take the first candidate.
     - `deriveRollCallLabel(vote, history): { label: string; matched: boolean; chamber: 'H' | 'S' | null; rollCallNumber: string | null }`. When matched, the label is `"House: "` or `"Senate: "` plus the action with its first letter upper-cased (today's behavior). When not matched, the label is `"House roll call no. 155"`, `"Senate roll call no. 12"`, `"House roll call"` (no number) or `"Roll call"` (no chamber). No fallback may contain the word "floor".
     - `export const UNMATCHED_ROLL_CALL_CAPTION = 'The official bill history does not say which motion this vote was on.'` This is the one caption for unmatched roll calls on every page (WS3-02, WS3-03a).
     - `matchVotesToHistory(votes, history)`, moved and now built on `matchRollCallToHistory`.
     - `dedupeRollCallRows(rows)`, moved from the body of `fetchDbVotes` with its comment. It is generic over `{ roll_call_id?, date, desc|description, yea|yea_count, nay|nay_count, absent|absent_count, nv|nv_count }`. Accept both field spellings so WS3-02 needs no mapping layer.
  2. Make `BillDetailView.tsx` import these and delete its local copies. Callers that used the string return of `deriveRollCallLabel` now use `.label`. Make `fetchDbVotes` call `dedupeRollCallRows`. The only intended visible changes are the boundary fix and the fallback text, which WS3-03a builds on.
  3. Create `src/lib/roll-call-label.test.ts` with synthetic fixtures. Model the action strings on Kentucky's format, for example `"3rd reading, passed 91-0"`, `"3rd reading, passed 38-0 with Committee Substitute (1)"` and `"veto overridden, passed 60-35"`. Cover at least:
     - the `8-0` vs `38-0` boundary
     - en-dash tallies
     - same-date preference
     - a chamber mismatch
     - a `"House: Veto Override RCS# 155"` desc whose tally matches a passage action, which takes its label from the history
     - no match, which gives `"House roll call no. 155"`
     - no chamber and no number, which gives `"Roll call"`
     - a loop asserting that no fallback label matches `/floor/i`
     - both dedupe shapes from the `fetchDbVotes` comment (a NULL `roll_call_id` twin and a same-RCS# twin)
     - the "27 legitimate same-tally pairs" case, where different RCS# numbers must both survive
     - both field spellings (`yea` and `yea_count`)
- **Don't:** change `src/lib/ky-vote-dedupe.ts` or any sync code; change the history timeline layout; touch `MemberProfileView.tsx` (WS3-02); add a DB column; change `MeetingsCalendar.tsx`'s "Floor votes" wording (see Findings re-checked).
- **Acceptance criteria:**
  - [ ] `src/lib/roll-call-label.ts` exists and imports nothing from `react`, `@mui/*` or `@supabase/*`.
  - [ ] `git grep -n "function deriveRollCallLabel\|function matchVotesToHistory\|function rollCallChamberFromDesc" src/components` prints nothing.
  - [ ] `git grep -n -i "floor vote" src/components/bills src/lib/roll-call-label.ts` prints nothing.
  - [ ] `npm test` passes with at least 15 new tests in `src/lib/roll-call-label.test.ts`, including the `8-0`/`38-0` boundary and the no-"floor" loop.
  - [ ] `npx tsc --noEmit` and `npm run lint` pass with no new warnings in touched files.
- **Verify:** plain container, no secrets: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`. The unit tests are the agent's gate. The rendered-page check is an Owner action.
- **Owner actions:** on the PR's Vercel preview, open HB500 (2026 RS). Expect the same history as production, except that unmatched rows now read "House roll call no. N". Paste one screenshot into the PR.
- **Rollback:** `git revert` of the PR. No data or schema change.

---

### WS3-02 · Show derived vote labels on member profiles

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Sonnet | S | WS3-01 | U1, C8, T5 |

- **Program class:** Core
- **Owner decision:** none.
- **Data-limit impact:** none external. It adds one server-side Supabase read per member page (`id, legiscan_history` for the voted bills). The page is ISR-cached for 300 s, and about 140 pages are pre-rendered at build (`generateStaticParams`). Expected payload: about 200 bills × the average `legiscan_history` size per page [verify: Owner SELECT below]. Stop condition: if the average is over 10 KB per bill (more than about 2 MB per page), stop and hand off (manual §9). A server-side RPC returning only the needed fields would then be an Opus follow-up.
- **Ongoing cost:** about 0. It removes a known trust bug on the pages people reach from "find my legislator" (T5) during the 2026-11-03 election (C8).
- **Why:** About 385 House roll calls from the 2026 session display as "House: Veto Override RCS# N" on member profiles, although they were ordinary passage or amendment votes (U1). That is the single most damaging label on the site in an election month: it tells a voter their representative voted on a veto override that never happened.
- **Current state (verified 2026-10-06):**
  - `src/components/members/MemberProfileView.tsx` line ~188 renders `{r.description || 'Roll call'}`. Line ~335 builds the vote-search haystack from `v.description`. Line ~513 has the placeholder "Search votes by bill number, title, or roll-call description".
  - `src/lib/member-profile-data.ts`: `MemberRecentRollVote` (~151–159) carries `description`, and `mapRollVotes` (~187–200) copies `vote.description`. `fetchMemberVoteRecord` (~288–370) calls RPC `get_votes_for_legislator`, which returns `SETOF ky_votes` (migration `045_get_votes_for_legislator_perf.sql`). It then selects `id, bill_number, title, status, session` from `ky_bills` for the voted bills (~350).
  - `src/app/members/[slug]/page.tsx`: `revalidate = 300`, and `generateStaticParams` pre-renders about 140 canonical members.
  - `KYVote` (`src/types/kentucky.ts` ~130) has `yea_count`, `nay_count`, `absent_count`, `description`, `date` and `chamber`. RPC rows also include `roll_call_id` and `nv_count`.
- **Do:**
  1. In `fetchMemberVoteRecord`, add a **separate** query, `select('id, legiscan_history').in('id', votedBillIds)`, and build `historyByBillId`. Keep it server-side. Never add history to any object passed to the client.
  2. Before mapping, run the RPC rows through `dedupeRollCallRows` (WS3-01). Recompute `tally` and `totalRollCalls` from the deduped list.
  3. Extract the row mapping into an exported pure function, `buildMemberRollVotes(votes, billsById, historyByBillId, peopleKey)`. Add `label: string` and `labelMatched: boolean` to `MemberRecentRollVote`, computed with `deriveRollCallLabel`. Bills with NULL `legiscan_history` (rows synced before migration 036) use an empty array, which yields the "roll call no. N" fallback.
  4. Remove `description` from `MemberRecentRollVote` so the raw text cannot leak back into the UI. Fix the compile errors this causes.
  5. In `MemberProfileView.tsx`, render `r.label` at line ~188. When `r.labelMatched` is false, add a `Typography variant="caption"` with `UNMATCHED_ROLL_CALL_CAPTION` (imported, not re-typed). Use `r.label` in the search haystack (~335). Change the placeholder (~513) to exactly `Search votes by bill number, title, or vote label`.
  6. Tests in `src/lib/member-profile-data.test.ts`, with synthetic rows:
     - a mislabelled "Veto Override" row that matches a passage action
     - an unmatched row, which gets the caption flag
     - a bill with NULL history
     - a twin pair that dedupes to one row, so the tally counts it once
- **Don't:** change the RPC or any migration; change the vote chips, filters, layout or ordering; add key votes or party-line context (U11, WS6-11a); call LegiScan.
- **Acceptance criteria:**
  - [ ] `git grep -n "\.description" src/components/members/MemberProfileView.tsx` prints nothing.
  - [ ] `npm test` passes with at least 4 new tests for `buildMemberRollVotes`.
  - [ ] `MemberRecentRollVote` has no `description` and no history field (code review of the type).
  - [ ] The caption string appears only in `src/lib/roll-call-label.ts` (`git grep -n "does not say which motion" src` shows one definition).
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`. A plain container cannot render member pages: they need Supabase env, and `perf:members:stub` serves only the roster. The unit tests are the agent's gate.
- **Owner actions:**
  1. Before merge, SELECT-only: `select round(avg(pg_column_size(legiscan_history))) as avg_bytes, max(pg_column_size(legiscan_history)) as max_bytes from ky_bills where session = '2026 Regular Session';`. Paste both numbers into the PR. If `avg_bytes` > 10240, do not merge, and comment.
  2. On the Vercel preview, open three House member profiles with session "2026 Regular Session". Expect no row containing `RCS#`, and passage votes reading like "House: 3rd reading, passed 91-0". Screenshots at 390 px and 1440 px. If any row still shows a raw description, paste its bill and date into the PR.
- **Rollback:** `git revert`. No data change.

---

### WS3-03a · Label unmatched roll calls honestly and fix the outcome chip

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Sonnet | S | WS3-01 | U3, U1 |

- **Program class:** Core
- **Owner decision:** **The roll-call outcome chip.** This settles TASKS.md ~424, which is marked "Katie's call" and says that "the `showOutcome`/`synthetic` coupling should not survive it". Options:
  - (a) Delete the chip. The tally and the bill status carry the outcome, accepting the Ky. Const. § 46 edge case that TASKS.md describes.
  - (b) Show it on every roll call, driven by `vote.passed`, labelled `Vote result: passed` or `Vote result: failed`.
  - (c) Show it only where `vote.passed === false`, labelled `Vote result: failed`, on matched and unmatched rows alike.
  - (d) Keep it only on unmatched rows, relabelled. This keeps the coupling TASKS.md rejects.

  **Recommended: (c).** "Failed" is the one outcome a reader cannot reliably infer from the tally (§ 46). Adding a chip to every row would add chip clutter (U8), and (c) removes the coupling. **Default if no answer by 2026-10-13: (c).** With (a), skip Do step 2's chip and keep step 1.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0. **Supersedes** TASKS.md ~424 with the option chosen above.
- **Why:** HB500 (2026), a budget bill that passed, shows seven rows like "House floor vote · Failed 20–21, Absent 59" with no explanation (U3). Those rows are roll calls that the official history does not name. The "Failed" chip appears only on such unmatched rows, so to a reader it looks as if the bill failed. This is an election-month trust defect on the votes people look up (C8).
- **Current state (verified 2026-10-06):**
  - `src/components/bills/BillDetailView.tsx`:
    - `HistoryTimeline` (~634) builds synthetic rows for unmatched votes (~655–664) and passes `showOutcome={item.synthetic}` to `InlineRollCall` (~770).
    - The chip is rendered under `showOutcome && vote.passed != null` (~385), with `label={vote.passed ? 'Passed' : 'Failed'}` (~388). Its doc comment is at ~321.
  - TASKS.md ~424 records, from a production query, that `passed` is never NULL (6,746 true and 198 false, of 6,944).
  - Why HB500's unmatched rows show 59 absent is not known [verify: Owner SELECT below]. They may be votes on amendments or procedural motions, which Kentucky's history lines do not tally.
- **Do:**
  1. Unmatched rows: use `deriveRollCallLabel(...).label` (WS3-01) as the row title, for example "House roll call no. 155". Under it, render `UNMATCHED_ROLL_CALL_CAPTION` as a caption.
  2. Outcome chip, per the decision. Add `rollCallOutcomeLabel(passed: boolean | null, policy: 'none' | 'all' | 'failed_only'): string | null` to `src/lib/roll-call-label.ts`. It returns `Vote result: passed`, `Vote result: failed` or `null`. Render the chip from it on every `InlineRollCall`, replacing `showOutcome`. Wrap the chip in the existing tooltip pattern, with exactly `This is the result of this one vote, not the status of the bill.` Delete the `showOutcome` prop and update the doc comment (~321).
  3. Append tests to `src/lib/roll-call-label.test.ts`: `rollCallOutcomeLabel` for each policy with `true`, `false` and `null`, and the caption constant has no em dash or semicolon.
- **Don't:** change the history text casing or the underlines (WS3-03b); change chip colors; change status chips, cards or the progress meter; reword the copy above (a label-wording change is a hand-off trigger in manual §3, and copy rules are in §7); change `vote.passed` semantics.
- **Acceptance criteria:**
  - [ ] `git grep -n "'Passed' : 'Failed'\|showOutcome" src/components` prints nothing.
  - [ ] `npm test` passes with at least 4 new tests.
  - [ ] The new strings contain no em dash and no semicolon (asserted in a test).
  - [ ] The PR states which decision option was applied and links the owner's answer, or says that the default applied.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`. The rendered check is an Owner action.
- **Owner actions:**
  1. Answer the decision in the PR thread by 2026-10-13, or the default applies.
  2. Optional, SELECT-only, aggregate: `select count(*) filter (where absent_count >= 50) as high_absent, count(*) as total from ky_votes v join ky_bills b on b.id = v.bill_id where b.bill_number = 'HB500' and b.session = '2026 Regular Session';`. Record the result in the PR. If high-absent rows are common, open a follow-up for WS4. Do not block this WP.
  3. On the preview, open HB500 (2026 RS) and one bill with a veto override. Take screenshots at 390 px and 1440 px.
- **Rollback:** `git revert`. No data change.

---

### WS3-03b · Use sentence case and fewer underlines in bill history

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS3-03a, WS6-09a | U3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0.
- **Why:** A forced Title Case transform turns "delivered to Secretary of State" into "Delivered To Secretary Of State", and glossary underlines cover nearly every phrase (U3). This is cosmetic, so it waits for WS6-09a's split of the bill page instead of conflicting with it. The WS6 agent may fold this WP into WS6-09a or WS6-09b and close it as `superseded`.
- **Current state (verified 2026-10-06; re-check after WS6-09a):**
  - `src/components/bills/BillHistoryActionText.tsx` calls `formatBillLabelText` (`src/lib/bill-display.ts` ~51–57, which lower-cases the string and capitalizes every word) and underlines every phrase that `segmentBillActionText` (`src/lib/bill-action-tooltip-segments.ts`) finds.
  - After WS6-09a, the timeline lives in `src/components/bills/detail/HistoryTimelineClient.tsx`.
- **Do:**
  1. Create `src/lib/bill-history-display.ts` with `formatHistoryActionText(s)`. It trims the string, upper-cases only the first letter and otherwise keeps the source text. Use it in `BillHistoryActionText.tsx` in place of `formatBillLabelText`. Do not change `formatBillLabelText`, because status chips use it (WS3-13).
  2. Add a pure helper, `firstOccurrenceSegments(entries)`, in `src/lib/bill-action-tooltip-segments.ts`. Across one timeline, it keeps the tooltip key only on the first occurrence of each term. Pass the allowed keys per entry from the timeline into `BillHistoryActionText` through a new optional prop, `allowedKeys?: ReadonlySet<string>`. Other callers keep their current behavior.
  3. Tests in `src/lib/bill-history-display.test.ts`, a new file that is **not** WS1-10's `bill-display.test.ts`:
     - `formatHistoryActionText` on "delivered to Secretary of State (Acts Ch. 2)", "3rd reading, passed 91-0" and an empty string
     - `firstOccurrenceSegments` over three entries that each contain "committee substitute": only the first keeps its key
- **Don't:** change status chips or `formatBillLabelText`; change WS3-03a's strings; change layout.
- **Acceptance criteria:**
  - [ ] `git grep -n "formatBillLabelText" src/components/bills/BillHistoryActionText.tsx` prints nothing.
  - [ ] `npm test` passes with at least 4 new tests.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
- **Owner actions:** on the preview, check HB500 (2026 RS): history lines read in sentence case, and repeated terms are underlined once.
- **Rollback:** `git revert`.

---

### WS3-04 · State what each AI summary was built from and gate the audience clause

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Sonnet | S | none | A1, A2, A4, A9, U16, C4 |

- **Program class:** Core
- **Owner decision:**
  1. **Changed-bill summaries (A2).** Options:
     - (a) Show the summary with a caveat when the bill changed after introduction.
     - (b) Hide the summary on those bills until WS3-10 regenerates it.
     - (c) No change.

     **Recommended: (a).** It is honest and keeps the content for the 2026-11-03 election. **Default if no answer by 2026-10-13: (a).**
  2. **"Who it may affect" clause (A4).** Options:
     - (a) Keep showing it.
     - (b) Hide it at render time until summaries are text-grounded, then show it only when the generator quoted supporting text (WS3-09b/09d).
     - (c) Remove it permanently.

     **Recommended: (b).** The clause is inferred from one or two sentences, and the audit's own prompt calls it "the highest-risk part". Hiding it at render costs nothing and can be reversed with one constant. **Default if no answer by 2026-10-13: (b).**
- **Data-limit impact:** none. No regeneration and no API call. Removing the `Status:` line from the prompt affects only future generations and changes no input hash, because status is not a hash input.
- **Ongoing cost:** about 0. One constant to flip when WS3-09d lands.
- **Why:**
  - Summaries are built from the title, the LegiScan description, topic and subject labels, the status and any editor notes, never the bill text (A1). The page says only "AI-generated. Always verify with primary sources", so a reader assumes the bill text was read.
  - On bills passed via committee substitute or title amendment, the summary can describe a version that no longer exists. In 2026, 141 of 433 enacted bills passed via committee substitute and 70 had title amendments. SB197's title says "appropriation act", while its summary describes a county tier system (A2).
  - The prompt passes `Status` although its rules forbid status language (A1).
  - Saying exactly what the summary was built from is the honest-sourcing rule of `docs/voice-and-tone.md`.
- **Current state (verified 2026-10-06):**
  - `src/components/civic/AiAttribution.tsx`: `AUDIENCE_LABEL = 'Who it may affect:'` (~46), and `AiGeneratedBlock` (~84) with the overline "AI-generated. Always verify with primary sources" (~97) and the "Report a problem with the summary" mailto link. `AiSummaryInline` and `AiSummaryTooltip` in the same file are imported by nothing (dead code, left for WS5).
  - `src/components/bills/BillDetailView.tsx` ~1162–1172 renders `AiGeneratedBlock` with `officialHref={officialTextForAi}` and `beta`. `officialTextForAi` (~866–872) takes `texts.find(t => t.type === 'Chaptered' || 'Enrolled' || 'Engrossed') ?? texts[0]`, the *first* such entry in array order, so it can pick Engrossed over a later Enrolled. `BillTextVersionsList` (~533–555) picks "Most current" by a different rule: newest real date, then the later array index. **New finding:** the two selectors can disagree.
  - `legiscan_texts` holds version metadata only (`doc_id`, `type`, `mime`, `date`, `url`, `state_link`; migration `036_ky_bills_legiscan_history_texts.sql`). Kentucky dates are often `0000-00-00` (`textDateOrNull`, ~136).
  - The prompt in `src/lib/ky-content-generation.ts` `generateBillSummary` (~95–111) includes `Status:` (line ~105), and also `Topics:` (~107), subjects and `editor_notes` (~109).
  - `src/app/about/page.tsx` already has a "How bill summaries are written" section (~74–88). Its paragraph at ~78–82 says summaries use "only the bill's own fields and any notes an editor has verified against the official text". It does not say that the full text is not used.
  - When `description` is empty, the full `ai_summary`, including "Who it may affect", is used as the meta description (`src/app/bills/[id]/page.tsx` ~43) and as JSON-LD `description` (`src/lib/structured-data.ts` ~73). WS6-07 (W2) removes both fallbacks.
  - decisions.md 2026-06-26 chose "no full-text fetch", with the in-page disclaimer as the backstop. This WP keeps that backstop and makes it accurate. decisions.md 2026-07-06 removed every "editor-verified" surface ("don't market verification until there are subject-matter experts"). The basis line therefore does not mention editor notes (see Do step 4).
- **Do:**
  1. Create `src/lib/bill-text-versions.ts` (pure) with:
     - `selectCurrentBillText(texts)`. Rank by finality, `Chaptered > Enrolled > Engrossed > Amended > Comm Sub > Introduced > Draft > unknown`. Use the real date (`textDateOrNull`, moved here) only to break ties **within the same type**, then the later array index. Return `null` for an empty list.
     - `billChangedAfterIntroduction(texts, history)`. It is true when `texts` contains a `Comm Sub` or `Amended` type, or when any history action matches `/committee substitute|floor amendment.*adopted|title amendment/i`.
     - `TEXT_TYPE_LABELS`, moved from `BillDetailView.tsx` (~125).
  2. Use `selectCurrentBillText` both for `officialTextForAi` and for `BillTextVersionsList`'s "Most current" chip.
  3. Create `src/lib/ai-summary-basis.ts` (pure):
     - `export type AiSummaryBasis = { kind: 'description' } | { kind: 'bill_text'; versionLabel: string; date: string | null }`.
     - `export const AI_SUMMARY_DESCRIPTION_BASIS_LINE = "Written by AI from the bill's title and official description, not the full bill text."`
     - `aiSummaryBasisLine(basis)`. It returns that constant for `description`. For `bill_text` it returns the WS3-09d form, and until WS3-09d it returns the description line.
     - `stripAudienceClause(summary)`. It returns the text before `Who it may affect:`, trimmed, or the input unchanged when the label is absent.
     - `export const SHOW_AUDIENCE_CLAUSE = false` (or `true` if decision 2 is (a)).
  4. In `AiGeneratedBlock`, add a required prop `basis: AiSummaryBasis` and replace the overline with `aiSummaryBasisLine(basis)`. Every caller passes `{ kind: 'description' }` until WS3-09d. Do not add an editor-notes variant: decisions.md 2026-07-06 forbids surfacing editor verification, and the line understates the inputs without overclaiming them.
  5. Add a prop `changedAfterIntroduction?: boolean`. When it is true and the basis is `description`, render above the summary, as `Typography variant="body2"`: `This bill changed after it was introduced. This summary may describe an earlier version.` If decision 1 is (b), hide the block instead.
  6. When `SHOW_AUDIENCE_CLAUSE` is false, render `stripAudienceClause(summary)` in `AiGeneratedBlock`. Apply the same function to the two meta and JSON-LD fallbacks (`src/app/bills/[id]/page.tsx` ~43, `src/lib/structured-data.ts` ~73), one call each. Do not redesign meta descriptions (A5 belongs to WS6-07). Do not edit stored summaries. Do not touch the dead `AiSummaryInline` or `AiSummaryTooltip`.
  7. Revise the existing `/about` paragraph (~78–82) **in place** to exactly:

     `Bill pages carry a plain-language summary written by a language model working under fixed rules. Today it works from the bill's title, its official description and subject labels, and any notes an editor has checked against the official text. It does not yet read the full bill text, so a summary can describe an earlier version of a bill that changed. It never characterizes a legislator. Votes, sponsorships, and positions pass through exactly as the official record has them. Each summary links to the official text and has a link to report a problem.`

     Add no duplicate "Data sources" item.
  8. In `ky-content-generation.ts`, extract the user prompt into an exported pure function, `buildBillSummaryUserPrompt(bill): string`, used by `generateBillSummary`, and delete the `Status:` line. Change nothing else in the prompt or the request.
  9. Extend `src/app/dev/bill-summary-preview/page.tsx` with one sample per state: description basis, changed-bill caveat, and a summary with a "Who it may affect" clause hidden. This page renders `AiGeneratedBlock` from in-file samples with no database.
  10. Tests:
      - `src/lib/bill-text-versions.test.ts`:
        - ranking with `0000-00-00` dates
        - an undated Enrolled against a dated Engrossed, where Enrolled wins
        - a Comm Sub after Introduced
        - an empty list
        - `billChangedAfterIntroduction` with each trigger phrase and a negative case
      - `src/lib/ai-summary-basis.test.ts`:
        - `stripAudienceClause` with and without the label
        - both basis lines, and that neither contains an em dash or a semicolon
      - `src/lib/ky-content-generation.test.ts`: `buildBillSummaryUserPrompt` on a synthetic bill with a status contains no `Status:` and does contain the title. Import only the pure function. If importing the module requires `ANTHROPIC_API_KEY`, set a dummy value in the test, and make no network call.
- **Don't:** regenerate or edit any stored `ai_summary`; change the input hash, model, `max_tokens` or any other prompt line; remove the "AI-generated" framing, the feedback link (A9) or the "Beta" chip (U16, WS6-09b); change meta descriptions beyond the one-call strip.
- **Acceptance criteria:**
  - [ ] Every `AiGeneratedBlock` call site passes `basis` (TypeScript enforces it, because the prop is required).
  - [ ] `git grep -n "Status: \${" src/lib/ky-content-generation.ts` matches only the non-bill generators (ordinance), not `generateBillSummary`.
  - [ ] `npm test` passes with at least 10 new tests.
  - [ ] `/about` contains the revised paragraph once, and `git grep -n "Plain-language summaries" src/app/about` prints nothing.
  - [ ] The diff does not touch `summaryInputHash` or `scripts/backfill-bill-summaries.ts`.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`. `npm run dev`, then open `/dev/bill-summary-preview` and take screenshots at 390 px and 1440 px [verify the page renders without Supabase env; if not, these screenshots become an Owner action on the preview].
- **Owner actions:** answer both decisions in the PR thread by 2026-10-13, or the defaults apply. On the preview, open SB197 (2026 RS) and one unchanged bill.
- **Rollback:** `git revert`, or flip `SHOW_AUDIENCE_CLAUSE` to `true` to restore the clause alone. No data change.

---

### WS3-05a · Say that a ZIP result is based on the ZIP's center

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P0 | W0 | Sonnet | S | none | U6, T5, C8 |

- **Program class:** Core
- **Owner decision:** none.
- **Data-limit impact:** development: at most 5 geocode calls (the Nominatim fallback, serial, at least 1 s apart) for an optional local check. Production: unchanged. No new vendor, field or analytics property.
- **Ongoing cost:** about 0.
- **Why:** "Find my legislators" is the one behavior people actually use (T5), and demand peaks before the 2026-11-03 election (C8). A ZIP lookup resolves one center point and presents one House and one Senate member as *the* answer, with no warning that ZIPs cross district lines (U6). The honest fix that cannot name a wrong district is to say what the answer is based on and to steer the reader to an address. Bounding-box sampling is not used, because it can list districts the ZIP never touches (see WS3-05b).
- **Current state (verified 2026-10-06):**
  - `src/components/members/DistrictMapExplorer.tsx`:
    - `LookupType = 'zip' | 'address' | 'map_click'` (~72).
    - `resolvePoint` (~333–352) resolves one point and sends `lookupType` to `trackDistrictMapLookup`.
    - `onSearch` (~376–428) geocodes a ZIP and calls `setResolvedLabel(\`ZIP ${q}\`)` (~400).
    - The result panel (~871–892) shows the label, then "House · District N" and "Senate · District N".
  - `src/app/guides/find-your-kentucky-legislator/page.tsx` (~63–64) already says "district lines can split a ZIP code". The map UI does not.
- **Do:**
  1. Add `zipCenterNotice(zip: string): string` to `src/lib/ky-district-geo.ts`, returning exactly `Based on the center of ZIP 40004. District lines can split a ZIP code, so a street address is more precise.` with the ZIP substituted.
  2. **Lookup type.** Add `const [lastLookupType, setLastLookupType] = useState<LookupType | null>(null)` next to `resolvedLabel`. Set it inside `resolvePoint`, from `lookup.type`, on the line after the early return. Every lookup path goes through `resolvePoint`: the ZIP and address branches of `onSearch` (~403, ~418), `onMapClick` (~371) and the `?lat=&lng=` restore effect (~614), so a map click or address lookup after a ZIP lookup resets it. The `?chamber=&district=` preselect (~631) does not call `resolvePoint` and leaves it `null`, which shows no notice.
  3. **Notice.** In the result panel (~873–877), when `lastLookupType === 'zip' && lastQuery`, render `zipCenterNotice(lastQuery)` in place of `resolvedLabel`. `lastQuery` holds the 5-digit ZIP exactly when the type is `'zip'` (set at ~401 only after `/^\d{5}$/` matched). For any other type, render `resolvedLabel` as today. Leave `setResolvedLabel(\`ZIP ${q}\`)` (~400) in place: the notice replaces it at render time, and `resolvedLabel` still clears on map click. Say so in the PR.
  4. **Button.** Under the notice, render a text `Button` labelled `Enter a street address`. Create `const addressInputRef = useRef<HTMLInputElement | null>(null)` and pass `inputRef={addressInputRef}` to the `TextField` inside `renderInput` (~692). In the installed MUI 5.17.1, Autocomplete passes its own input ref as `params.inputProps.ref`, and `InputBase` merges `inputRef` with it (`node_modules/@mui/material/InputBase/InputBase.js` ~269), so both refs work. Keep the `{...params}` spread and do not put a `ref` inside `inputProps`. On select, call `addressInputRef.current?.focus()` and then `.select()`, so the ZIP text is selected and typing replaces it (a UX choice made here; do not change it). Do not move focus automatically.
  5. **For later consumers.** Change `type LookupType` (~72) to `export type LookupType`. Add no prop, context or URL parameter, and no new consumer. WS7-09d and WS7-10 render inside `DistrictMapExplorer.tsx` and read `lastLookupType` there, passing it as a prop to their own components if they need it.
  6. Tests in `src/lib/ky-district-geo.test.ts`: the exact string for one ZIP, and no em dash or semicolon. (WS1-15 uses a different file.)
- **Don't:** list candidate districts; add bounding-box sampling or a ZIP dataset (WS3-05b); change how address lookups or map clicks resolve (setting `lastLookupType` in `resolvePoint` is the only change to those paths); add or change any PostHog property (S10); fix the U7 mobile gap (WS6-01).
- **Acceptance criteria:**
  - [ ] Every ZIP result shows the notice and the button (code review of the single render path).
  - [ ] A map click, an address lookup or a `?lat=&lng=` restore after a ZIP lookup shows no ZIP notice: `setLastLookupType` is called in `resolvePoint` and nowhere else sets the type to `'zip'` (code review).
  - [ ] Selecting `Enter a street address` focuses the address field with its text selected, and Autocomplete suggestions still open while typing (local check or Owner check).
  - [ ] `LookupType` is exported from `DistrictMapExplorer.tsx`, and no new prop, context or URL parameter is added.
  - [ ] `npm test` passes with at least 2 new tests.
  - [ ] `git diff` adds no `track`, `capture` or `posthog` call.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`. The optional local check uses the Nominatim fallback when no Mapbox token is set (`NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`, ~70), within the 5-call budget.
- **Owner actions:** after deploy, try two ZIPs (for example 40004 and one Louisville ZIP). Confirm the notice appears, that the button focuses the address field with the ZIP selected, and that a map click afterwards removes the notice.
- **Rollback:** `git revert`. No data change.

---

### WS3-05b · Name the districts a ZIP actually touches (conditional)

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P3 | W4 | Opus | M | WS3-05a | U6, T5 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Build or not.** Build only if W3 PostHog data shows ZIP lookups are at least 30% of district-map lookups (`lookupType`), or reader reports cite a wrong district from a ZIP. Otherwise close it as `not needed` in WS9-14's review. **Default: not built** unless the gate is met and the owner confirms by 2027-04-30.
- **Data-limit impact:** development: none external. The owner downloads the Census 2020 ZCTA boundaries once [verify the current census.gov source URL and licence]. Production: none (a static crosswalk file).
- **Ongoing cost:** one committed crosswalk file (about 30 KB [estimate]) to regenerate after redistricting.
- **Why:** When ZIP lookups are a large share, listing the real candidate districts is better than a generic notice. It must use ZIP-area polygons, never a bounding box, so it cannot name a district that the ZIP does not touch (U6, manual §7 "never guess"). ZCTAs approximate USPS ZIPs, so the copy says "may".
- **Current state (verified 2026-10-06):** `src/lib/ky-district-geo.ts` uses `@turf/boolean-point-in-polygon`. `@turf/bbox` is a dependency. District GeoJSON lives under `public/geo/`. `mapboxGeocodeZip` (`src/lib/mapbox-geocode.ts` ~75–98) already takes an `options.bbox` *search* filter for Kentucky, which is unrelated to this WP.
- **Do:**
  1. Write `scripts/build-zip-district-crosswalk.ts`. It reads the owner-supplied ZCTA file from a path argument, intersects each Kentucky ZCTA with the House and Senate polygons (area overlap above 1% of the ZCTA, to ignore sliver overlaps along shared edges), and writes `public/geo/ky-zip-districts.json` as `{ [zip]: { house: string[]; senate: string[] } }`.
  2. In `DistrictMapExplorer.tsx`, when the crosswalk lists more than one district in a chamber, add to the WS3-05a notice: `Parts of ZIP 40004 may be in House districts 18 and 24.` (per chamber, joined with "and"). Keep the center-point result.
  3. Tests: the list-joining helper (1, 2 and 3 items), and the sliver threshold on two synthetic squares.
- **Don't:** use a ZIP bounding box; add an API call; add analytics properties.
- **Acceptance criteria:**
  - [ ] The crosswalk is generated by the committed script, and the PR states the source file and its date.
  - [ ] Owner spot-check of 3 ZIPs known to be split matches the official district maps.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
- **Owner actions:** supply the ZCTA file. Spot-check 3 split ZIPs against the LRC district maps.
- **Rollback:** `git revert`. Delete the JSON file.

---

### WS3-06a · Hide meeting rows superseded by a reschedule

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 | Sonnet | S | none | U5, U17, N5 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0. This is a display guard. The cause is handled by WS3-06b if that WP is ever built.
- **Why:** 13 of 91 upcoming meeting rows are "Cancelled", and 12 committee/date pairs appear as both cancelled and scheduled, for example the Budget Review subcommittees on 2026-10-07 (U5). Meetings are the best interim content (U17), and a list that says a meeting is both on and off reads as unreliable. **Target merge: 2026-10-30**, before WS9-03's election freeze. Sequence it with WS6-06, which edits the same browse fetch: whichever merges second rebases.
- **Current state (verified 2026-10-06):**
  - `src/lib/ky-ga-browse-server.ts`: `fetchKyMeetingsBrowseWindow` (~33–66, an `unstable_cache` wrapper) selects `ky_committee_meetings` with `.limit(500)` (~47–53) and returns rows unfiltered. It is called by `src/app/meetings/page.tsx` (~28) **only when there is no `?q=`**.
  - `src/components/committees/MeetingsBrowse.tsx` (~160–172) queries `ky_committee_meetings` client-side with `KY_MEETING_BROWSE_SELECT` and `.limit(500)`. This path serves `/meetings?q=…` and client reloads.
  - Both reads sort ascending from the session start with `.limit(500)`, so a window over 500 rows cuts upcoming meetings (N5). WS6-06 owns that fix. WS3-06a does not change the limit.
  - `src/lib/ky-committee-data.ts`: `fetchKyCommitteeMeetingsForCommitteeUncached` (~103–117) and `fetchKyCommitteeMeetingsForCommittee` (~119–128) feed `src/app/committees/[slug]/page.tsx` (~58). `fetchKyCommitteeMeetingsBrowse` (~212) has no callers (dead code, left for WS5). `countKyMeetingsForCommittee` (~264) counts rows.
  - Out of scope: `src/lib/ky-committees-browse-enriched.ts` (~106) and `src/lib/ky-member-committees.ts` (~80). They read meetings for summary counts and links, not for a dated list.
  - `CommitteeMeetingCard.tsx` (~42, ~83–88) and `CommitteeDetailView.tsx` (~427–467) style `status === 'cancelled'`.
  - Cause (see WS3-06b): the upsert key includes `time_and_location`, so a time or room change inserts a new row, and the cancellation diff marks the old one cancelled.
- **Do:**
  1. Add `collapseSupersededMeetings(rows)` to a new file, `src/lib/ky-meeting-display.ts`. It is generic over `{ committee_id, meeting_date, status }`. Within each `(committee_id, meeting_date)` group: if at least one row is `scheduled`, drop the group's `cancelled` rows; if every row is cancelled, keep them all. Otherwise preserve input order.
  2. Apply it in exactly three places:
     - the return of `fetchKyMeetingsBrowseWindow`
     - the `setMeetings(...)` result in `MeetingsBrowse.tsx`
     - the return of `fetchKyCommitteeMeetingsForCommitteeUncached`

     Collapsing after `.limit()` can return fewer rows than the limit. That is acceptable, so say so in a one-line comment.
  3. Tests in `src/lib/ky-meeting-display.test.ts`:
     - cancelled plus scheduled → scheduled only
     - two cancelled → both kept
     - two scheduled at different times (a real double meeting) → both kept
     - different committees on the same date → untouched
     - order preserved
- **Don't:** change sync code or data; hide genuine cancellations; change card design or agenda previews (WS6-06); change the counts in `countKyMeetingsForCommittee`.
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 5 new tests.
  - [ ] `git grep -n "collapseSupersededMeetings" src` shows the definition, the test file and exactly three call sites.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`. The rendered check is an Owner action.
- **Owner actions:** on the preview, open `/meetings` and `/meetings?q=budget` for the week of the next interim meetings, and one Budget Review subcommittee page. Expect no committee twice on one date with opposite statuses.
- **Rollback:** `git revert`.

---

### WS3-06b · Treat LRC time and room changes as updates (conditional)

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P3 | W4 | Opus | M | WS3-06a, WS4-05, WS4-10 | U5, E6, D3, T3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Build or not.** Build only if a committee-event email reaches more than 10 recipients per month (for example if the My Legislators email, WS7-09b, adds meeting events), because false `meeting_cancelled` events then reach real readers. WS3-06a already fixes what readers see on the site. **Default: not built**, decided at WS9-14's W4 review.
- **Data-limit impact:** none during development. Tests use `fixtures/lrc/legislative-calendar-live.html` through WS4-05's parser harness, with no live LRC fetch. The twice-daily calendar sync keeps its frequency.
- **Ongoing cost:** removes false `meeting_cancelled` events and the duplicate rows WS3-06a hides. It edits the job with the most failures (E6), which is why it waits for WS4-05's parser tests and WS4-10's empty-parse guard.
- **Why:** When the LRC changes a meeting's time or room text, `upsertLrcCalendarMeetings` inserts a second row, and the post-loop diff marks the original "cancelled" and emits a `meeting_cancelled` event (U5). Today about 1 recipient a month receives digests (T3), so the harm is small until email reach grows.
- **Current state (verified 2026-10-06):**
  - `src/lib/ky-lrc-calendar-sync.ts`:
    - `upsertLrcCalendarMeetings` (~302).
    - The prior-row lookup by `(committee_id, meeting_date, time_and_location)` (~343–350).
    - The upsert with `onConflict: 'committee_id,meeting_date,time_and_location'` (~379).
    - The cancellation diff pass (~482–536). It cancels every `scheduled` row in the date window that was not seen this run, and inserts a `meeting_cancelled` event.
  - The parser (`src/lib/lrc-legislative-calendar-parser.ts`) has no cancellation detection, and no saved LRC page contains a cancellation notice. Every historical `cancelled` row therefore came from the diff pass, and no column records why a row was cancelled.
  - The mechanism is inferred from code [verify: Owner SELECT below].
- **Do:**
  1. Add a pure `planMeetingIdentity(parsedForCommitteeDate, dbRowsForCommitteeDate)` in `src/lib/ky-meeting-identity.ts`. It returns:
     - `update_in_place`, when the parse has exactly one meeting for a committee and date, the DB has exactly one `scheduled` row for that pair, and the `time_and_location` differs.
     - `update_in_place_after_delete`, when, in the same situation, a `cancelled` row already holds the parsed `time_and_location`. The cancelled twin is deleted first, so the update cannot hit the `(committee_id, meeting_date, time_and_location)` unique key. Its agenda items cascade (migration 024 ~55), and its events keep a NULL `meeting_id` (migration 026 ~45).
     - `keyed` (today's behavior) in every other case, including two scheduled rows.
  2. In `upsertLrcCalendarMeetings`, carry out the plan. Update `time_and_location`, `member_refs`, `agenda_content_hash`, `source_url` and `scraped_at` in place, and add the row id to `syncedMeetingIds` so the diff pass leaves it alone. Emit `agenda_updated` only on a hash change, as today. Emit no `meeting_cancelled`.
  3. Tests for the planner, covering:
     - a moved room → update in place, no cancel
     - a move onto a cancelled twin's key → delete, then update
     - two same-day meetings → both kept
     - a vanished meeting with no replacement → cancelled (today's behavior)
- **Don't:** detect LRC cancellation notices (Deferred until a real one is captured); write a repair script for past rows (they age out, and WS3-06a hides them); change the unique index or add a migration; change the guards for empty fetches or the Wayback backfill.
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 4 planner tests. `npx tsc --noEmit` passes.
  - [ ] WS4-05's parser tests still pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`.
- **Owner actions:** before building, SELECT-only: `select count(*) from (select committee_id, meeting_date from ky_committee_meetings where meeting_date >= current_date group by 1,2 having count(distinct status) > 1) p;`, plus a manual look at three pairs in the Supabase table view. Proceed only if the pairs differ only in time or room text.
- **Rollback:** `git revert`.

---

### WS3-07 · Measure bill-text sources and choose one by a stated rule

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 | Opus | S | none | A1, A2, A8, D1, D3, E6, O2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Where to get bill text.** Options:
  - (a) **LRC PDFs.** Fetch the official document already linked from each bill page (`legiscan_texts[].state_link` [verify host]) and extract its text locally. It uses zero LegiScan quota. It is a new fetch type on the most fragile source (E6: 802 dead URLs after one URL-scheme change), so it needs a written exception to manual §4 ("no new crawl targets"): only `state_link` URLs, only through WS4-09a's helper, only for summary candidates, with a hard cap per run.
  - (b) **LegiScan `getBillText`.** This is the channel LegiScan sanctions ("Bill documents are available via getBillText… There is no need to download the same document blob more than once", `docs/reference/legiscan/LegiScan-API-Crash-Course.txt` lines ~18–21). It costs one query per new document through the existing throttled, metered client: about 2,000–3,000 per session, or about 700–1,000 in a peak month [estimate, measured here]. It needs no manual exception. LegiScan datasets do **not** contain text (crash course line ~13: only getBill, getRollCall and getPerson payloads), so there is no free path.
  - (c) **Anthropic fetches the PDF** through a URL `document` block. Anthropic's servers still fetch from the LRC, PDF input costs more tokens than extracted text [verify on Anthropic's pricing page], and no text is stored for the audit.

  **Decision rule (no pre-set default).** Choose (b) if WS4-01's projected in-session LegiScan peak month (the high estimate, or WS4-15's figure if available), plus (b)'s measured peak-month volume, stays at or below 60% of the cap (6,000). Otherwise choose (a). Choose (c) only if both (a) and (b) are blocked. **If the owner has not answered by 2026-11-13, the agent applies the rule** and records the numbers. Every production fetch stays an Owner-run or scheduled action, and the manual §4 exception takes effect only when the owner merges it.
- **Data-limit impact:**
  - LRC: at most 25 PDF fetches, serial, 1 per second, from the owner's URL list only. The User-Agent is the existing pattern `KnowYourVoteKentucky/1.0 (+https://kyvky.com; bill-text-spike)`, or `kyvkyBotUserAgent('bill-text-spike')` if WS4-09a has merged.
  - LegiScan: 0. Option (b)'s volume is computed from stored `legiscan_texts` counts, and the document bytes are the same PDF [verify `mime` in the owner SELECT].
  - Anthropic: at most 10 sample generations, ≤ $0.50, to measure tokens and p95 latency on text-sized prompts.
  - Stop conditions: abort on any HTTP 429 or 3 consecutive 5xx. If the container cannot reach the LRC, the fetch becomes an Owner action with the same caps.
- **Ongoing cost:** none from this WP. The spike script and its npm alias are deleted once WS3-08 merges.
- **Why:** decisions.md 2026-06-26 skipped full text to save LegiScan quota, and that trade-off produced A1 and A2. A1's premise that "`legiscan_texts` is stored" is only half true: the column stores links, not text. Grounding therefore needs a new, budgeted fetch, and the choice must rest on measured numbers. W1 timing gets the decision answered before W2 opens.
- **Current state (verified 2026-10-06):**
  - The comment in migration `036_ky_bills_legiscan_history_texts.sql` says `legiscan_texts` is "LegiScan getBill texts[] (doc_id/type/mime/date/url/state_link)", with no text body.
  - `src/lib/ky-legiscan-client.ts` has no `getBillText` method (its public methods run from ~362 to ~496).
  - `package.json` has no PDF library. CI uses Node 24 (`node-version: '24'` in `sync-ky-bills-status.yml` and `accuracy-audit.yml`). `package.json` has no `engines` field.
  - TASKS.md ~570 ("Bill-text / amendment body diff — not built … requires `getBillText`"). This WP supersedes that note's assumption.
- **Do:**
  1. Open a draft PR at once. Set the `TRACKER.md` row to `blocked` until the owner has committed `fixtures/lrc/bill-text/spike-urls.txt` (Owner action 1) to the PR branch. Never build URLs or crawl LRC index pages.
  2. Add `.cache/bill-text-spike/` to `.gitignore`. Write `scripts/spike-bill-text.ts` (npm `spike:bill-text`). It reads the URL file, fetches serially with a 1,000 ms gap, saves the PDFs to the scratch directory, and extracts text with at most two candidate libraries (for example `unpdf` and `pdfjs-dist`) [verify licence, maintenance, Node 24 support, and the Vercel runtime's Node version, in case a route ever imports it]. Per document it reports: bytes, pages, extracted characters, a token estimate (characters / 4), extraction time, and whether there is a usable text layer.
  3. Commit 3–5 small PDFs (each under 300 KB, public records) under `fixtures/lrc/bill-text/`, with a README row each (source URL, date fetched, purpose). Include one committee substitute.
  4. Optionally generate up to 10 summaries with a draft text-grounded prompt (no DB writes). Record cost from `usage` and the p95 latency per call.
  5. Write `docs/specs/bill-text-source-decision.md` (about one page) with:
     - the measured table
     - option (b)'s volume, from the owner's counts: documents per session, and per peak month for 2025 RS and 2026 RS
     - the decision rule applied to WS4-01's numbers
     - cost per bill, and the projected **peak-month** Anthropic spend against the $40/month Console limit (WS4-04/WS4-07)
     - the size cap recommended for WS3-08/09b, in characters and tokens, and how many measured bills exceed it
     - the p95 latency per text-sized call, which sets WS3-09c's per-run limit
     - the recommended library
  6. If the rule picks (a), propose the manual §4 exception in the same PR as a diff to `docs/program-spec/00-agent-operating-manual.md`: a sub-bullet under "Kentucky LRC site", marked "effective when the owner merges".
- **Don't:** add the PDF library to production `dependencies` (devDependency only); fetch any URL not in the owner's file; call LegiScan; write to the DB.
- **Acceptance criteria:**
  - [ ] `docs/specs/bill-text-source-decision.md` exists, with measured numbers for at least 15 documents and the rule's outcome. The PR states actual LRC fetches and Anthropic spend.
  - [ ] The fixture PDFs and README rows are committed, each PDF under 300 KB, and `.cache/bill-text-spike/` is git-ignored.
  - [ ] `npm test` and `npx tsc --noEmit` pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`. Running the spike needs network access to the LRC (no secrets). The optional generations need `ANTHROPIC_API_KEY`, run by the owner or by an agent with the stated $0.50 budget.
- **Owner actions:**
  1. Run SELECT-only and commit the output, one URL per line, as `fixtures/lrc/bill-text/spike-urls.txt` on the PR branch: `select t->>'state_link' as url from ky_bills b, jsonb_array_elements(b.legiscan_texts) t where b.session = '2026 Regular Session' and b.bill_number in ('HB1','HB500','SB197','HB904','SB2','HB6','SB70','HB13') limit 25;`
  2. Run SELECT-only and paste the result into the PR: `select b.session, t->>'mime' as mime, count(*) as docs, count(distinct b.id) as bills from ky_bills b, jsonb_array_elements(b.legiscan_texts) t where b.session in ('2025 Regular Session','2026 Regular Session') group by 1,2;`
  3. Answer the decision by 2026-11-13, or the rule applies.
- **Rollback:** `git revert`. This deletes the spike script, the doc and the fixtures.

---

### WS3-08 · Add a bill-text store and an on-demand fetcher

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS3-07, WS3-04, WS4-09a (option a) or WS4-03a (option b) | A1, A2, A3, D1, D3, O2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none beyond WS3-07's. The steps assume option (a). For (b), the fetcher is a new `fetchBillText(docId)` on the existing LegiScan client, which decodes the base64 blob, with `LEGISCAN_CALLER=wp-ws3-08` and WS4-03a's per-run budget. Everything else is unchanged.
- **Data-limit impact:** development: 0 external calls (tests use WS3-07's fixtures and an injected fetcher). Production: no fetches from this WP on its own. The fetcher is called only by WS3-09c, for summary candidates. WS3-09c and WS3-10 state those budgets.
- **Ongoing cost:** one new table and one module. No script, no npm alias, no workflow step and no schedule. About 0.5 h/month in session to watch fetch-error alerts.
- **Why:** WS3-09c cannot ground summaries, and WS3-11a cannot audit them, without the text of the version summarized. Fetching only for bills that are about to be (re)summarized, and storing each version once, avoids about 1,500 fetches that a blanket fill would waste (O2).
- **Current state (verified 2026-10-06):**
  - Migrations end at `056_ky_committee_meetings_agenda_recovery.sql`. Two files share `045`. Use the next free number at implementation time and never reuse one.
  - `selectCurrentBillText` exists in `src/lib/bill-text-versions.ts` (WS3-04).
  - `src/lib/lrc-fetch.ts` `fetchLrcPage` exists after WS4-09a. It returns HTML only.
- **Do:**
  1. Migration `supabase/migrations/NNN_ky_bill_texts.sql` (idempotent). Create table `ky_bill_texts` with:
     - `id uuid primary key default gen_random_uuid()`
     - `bill_id uuid not null references ky_bills(id) on delete cascade`
     - `doc_id integer not null unique`, `text_type text`, `text_date date null`
     - `source_url text not null`, `sha256 text not null`
     - `page_count integer`, `char_count integer not null`, `extracted_text text not null`
     - `extractor text not null`, `fetched_at timestamptz not null default now()`
     - an index on `(bill_id)`

     `enable row level security` with **no** anon or authenticated policies (service role only). Add a comment citing WS3-08. Put the down SQL in the PR.
  2. `src/lib/bill-text-extract.ts` (pure, takes a `Uint8Array`). Extract the text, normalize whitespace, strip repeated page headers, footers and line numbers [verify the LRC layout against the fixtures], and return `{ text, pages, chars }`. Test it against each WS3-07 fixture, asserting a known phrase from each.
  3. Option (a): add `fetchLrcDocument(url, { job })` to `src/lib/lrc-fetch.ts`. It returns `{ kind: 'ok', bytes } | { kind: 'absent' } | { kind: 'failed', message }` and shares `fetchLrcPage`'s host gate, User-Agent, retries and timeouts, with `Accept: application/pdf` and a byte cap from WS3-07. Add 2 tests beside WS4-09a's tests.
  4. `src/lib/bill-text-store.ts`, exporting `ensureBillText({ bill, mode, fetchDoc, db, maxChars, isSessionEligible })`:
     - `mode: 'plan'` → zero fetches. It reports whether a fetch would be needed.
     - `mode: 'dry'` → it fetches and extracts **in memory** and does not insert.
     - `mode: 'live'` → it fetches, extracts and inserts.
     - It picks the doc with `selectCurrentBillText(bill.legiscan_texts)` and returns the existing row if that `doc_id` is stored. It refuses to fetch when `isSessionEligible(bill.session)` is false; the default is `lrcRecordSessionsToRefresh` from WS4-09b if merged, otherwise the most recently started session. It returns `over_cap` when the extracted characters exceed `maxChars`.
     - Return type: `{ kind: 'existing' | 'stored' | 'fetched_dry' | 'over_cap' | 'no_doc' | 'ineligible' | 'error'; docId?; text?; sha256?; textType?; textDate? }`.
     - A run-level breaker: after 3 consecutive `error` results, every later call returns `error` without fetching.
  5. Tests in `src/lib/bill-text-store.test.ts`, with an injected `fetchDoc` and a stubbed `db`:
     - `plan` makes zero `fetchDoc` calls
     - an existing `doc_id` makes zero calls
     - `dry` makes one call and no insert
     - `live` makes one call and one insert
     - an ineligible session makes no call
     - over cap gives `over_cap`
     - three errors trip the breaker
  6. Keep the PDF library a devDependency. Only `scripts/` (run with `tsx` after `npm ci`, which installs devDependencies) reaches `bill-text-extract.ts`, and no `src/app` file may import it.
- **Don't:** add a CLI, npm script or workflow step; fetch historical (non-current) versions; fetch anything but `state_link`; expose `ky_bill_texts` through any public route; run anything against production.
- **Acceptance criteria:**
  - [ ] The migration is idempotent (`IF NOT EXISTS`) and enables RLS in the same file.
  - [ ] `npm test` passes, with extraction tests over every committed fixture and at least 7 store tests.
  - [ ] `git grep -n "bill-text-extract\|bill-text-store" src/app` prints nothing.
  - [ ] `git diff --stat` touches no `.github/workflows/` file.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, and `npm run typecheck:scripts` if WS1-02 has merged.
- **Owner actions:** apply the migration before merge: `npm run db:apply-sql -- supabase/migrations/NNN_ky_bill_texts.sql`.
- **Rollback:** `git revert`. Down SQL: `drop table if exists ky_bill_texts;`. Nothing reads the table until WS3-09c.

---

### WS3-09a · Add summary provenance columns and the v2 input hash

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | S | WS1-11 | A1, A2, A9, U16 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. (The regeneration policy is in WS3-09c.)
- **Data-limit impact:** none. Adding the v2 hash regenerates nothing: no code calls it until WS3-09c, and WS3-09c never compares v2 hashes against legacy rows.
- **Ongoing cost:** about 0.
- **Why:** Readers must be able to see which version was summarized (U16, A2), and regeneration must stay hash-gated (A9). The v1 hash includes topics, so any topic reclassification silently regenerates summaries. v2 drops that coupling.
- **Current state (verified 2026-10-06):**
  - `scripts/backfill-bill-summaries.ts` `summaryInputHash` (~61–79) hashes title, description, sorted topics, sorted subjects and optional `editor_notes`. It writes `ai_summary`, `ai_summary_generated_at`, `ai_summary_model` and `ai_summary_input_hash` (~150–167). After WS1-11 the hash lives in `src/lib/ai-summary-input-hash.ts` with golden tests.
  - Migration `034_ky_bill_ai_summary_metadata.sql` added the three provenance columns.
- **Do:**
  1. Migration `NNN_ky_bill_ai_summary_basis.sql` (idempotent). Add to `ky_bills`:
     - `ai_summary_basis text check (ai_summary_basis in ('description','bill_text'))`
     - `ai_summary_text_doc_id integer`
     - `ai_summary_text_type text`
     - `ai_summary_text_date date`
     - `ai_summary_prompt_version smallint`

     Comment each column. NULL `ai_summary_prompt_version` means "legacy v1 summary".
  2. In `src/lib/ai-summary-input-hash.ts`, keep `summaryInputHash` (v1) byte-identical. Add `summaryInputHashV2({ title, textSha256, description, editorNotes })`, whose payload is `{ v: 2, title, text: textSha256 ?? null, description: textSha256 ? null : description, editor_notes? }`. Topics, subjects and status are **not** inputs. Add golden tests for v2.
  3. In the PR, state the regeneration estimate that WS1-11 requires: zero, with the reason above.
- **Don't:** wire v2 into the backfill (WS3-09c); change v1 or its goldens.
- **Acceptance criteria:**
  - [ ] The v1 golden hashes are unchanged, and at least 3 v2 golden tests pass.
  - [ ] The migration is idempotent.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`.
- **Owner actions:** apply the migration before merge: `npm run db:apply-sql -- supabase/migrations/NNN_ky_bill_ai_summary_basis.sql`. Approve the v2 goldens in the PR (WS1-11 rule).
- **Rollback:** `git revert`. Down SQL: `alter table ky_bills drop column if exists ai_summary_basis, drop column if exists ai_summary_text_doc_id, drop column if exists ai_summary_text_type, drop column if exists ai_summary_text_date, drop column if exists ai_summary_prompt_version;`.

---

### WS3-09b · Write prompt v2 with tool-use JSON and an evidence check

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS3-09a | A1, A2, A4, A9, O2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** development: zero Anthropic calls (tests stub the SDK). The eval fixture holds identifiers only and is filled by an Owner SELECT (no LegiScan, LRC or Anthropic calls). The paid evaluation is an Owner action in WS3-09c, after the wiring exists.
- **Ongoing cost:** replaces the description-only prompt for new summaries. v1 stays exported for legacy tooling. One price constant to update whenever the model changes (a test fails if the default model has no price).
- **Why:** Summaries must describe what the bill says now (A1, A2). The audience clause is acceptable only when quoted text supports it (A4).
- **Current state (verified 2026-10-06):**
  - `src/lib/ky-content-generation.ts`: `SYSTEM_PROMPT` (~30–46) says "Use ONLY the bill fields provided". `generateSummary` (~70–92) uses `max_tokens: 300`, reads only `message.content[0]`, and ignores `message.usage`. The model is `KY_CONTENT_MODEL` (line ~16), which equals `KY_DEFAULT_ANTHROPIC_MODEL`.
  - `src/lib/anthropic-model.ts` exports only `KY_DEFAULT_ANTHROPIC_MODEL` (`process.env.ANTHROPIC_MODEL?.trim() || 'claude-sonnet-4-6'`). There is no price table anywhere in `src`.
  - `@anthropic-ai/sdk` is pinned at `^0.54.0`, and the installed version is 0.54.0. It has **no** `output_config` structured-output parameter (grep of `node_modules/@anthropic-ai/sdk` finds none). It does support `tools` with `tool_choice: { type: 'tool', name }` (`resources/messages/messages.d.ts` ~592, ~976).
  - No request builder, usage recorder or monthly-cap helper exists, and none is planned: WS4 retired its batch path and metering (WS4 Deferred), and WS4-07 is a Console setting only. `fixtures/ai-eval/` does not exist (`fixtures/` holds only `lrc/`).
- **Do:**
  1. Add a pure, standalone `buildBillSummaryRequestV2(input)` in `src/lib/ky-content-generation.ts` that returns `{ model, max_tokens: 800, system, messages, tools, tool_choice }`.
     - **Inputs:** bill number, title, the bill text labelled with its version and date, and editor notes. When the text is missing or over the cap, use the description instead, labelled "the LRC description of the bill as introduced".
     - **Rules added to the system prompt:** follow the bill text when it conflicts with the description; describe the version given; no status.
     - **JSON through forced tool use:** one tool `record_bill_summary`, with `input_schema` `{ summary: string, who_may_affect: string | null, audience_evidence: string | null }`, where `audience_evidence` is a short verbatim quote from the text. Set `tool_choice: { type: 'tool', name: 'record_bill_summary' }`.
     - **No SDK upgrade in this WP.** If a later SDK upgrade (WS1 dependency policy) adds structured output, switching to it is a separate PR.
     - Forced `tool_choice` works on `claude-sonnet-4-6`. Some newer models reject forced tool use [verify for any model a future model-switch WP picks]; that WP must re-check this request shape.
  2. **Per-call cost from `usage`.** In `src/lib/anthropic-model.ts`, beside `KY_DEFAULT_ANTHROPIC_MODEL`, add `ANTHROPIC_PRICES_USD_PER_MTOK: Record<string, { input: number; output: number }>` with one entry, `'claude-sonnet-4-6': { input: 3, output: 15 }` [verify on Anthropic's pricing page at implementation time and cite the page and date in a comment], and a pure `estimateAnthropicCallUsd(model, usage)` = `(usage.input_tokens × input + usage.output_tokens × output) / 1,000,000`. It returns `null` for a model with no price. This is a per-run guard, not a meter: it stores nothing.
  3. Add `generateBillSummaryV2(input)`. It reads `message.usage` and returns `costUsd` from `estimateAnthropicCallUsd`. It reads the `tool_use` block's `input` and validates it with a hand-written type guard. It returns `{ aiSummary, basis, promptVersion: 2, usage, costUsd } | { unavailable: sentinel, usage?, costUsd? }`, reusing `SUMMARY_UNAVAILABLE_SENTINELS`. An API error (including a call rejected by the Console limit) becomes a sentinel, so the backfill's existing `isUsableSummary` check keeps the old summary.
  4. Evidence check: keep `who_may_affect` only when `audience_evidence` appears in the normalized source text (a substring test ignoring whitespace and case). Otherwise drop the clause. Store `ai_summary` in today's format (`summary` + `\n\nWho it may affect: …`), so `stripAudienceClause` and existing rendering keep working.
  5. **Eval fixture (the only one; WS4 keeps none).** Create `fixtures/ai-eval/bills-20.json`: an array of exactly 20 objects `{ "session": "2026 Regular Session", "bill": "SB197", "why": "…" }`, identifiers only, no bill text or summaries. Fixed anchors: SB197, HB904, HB500, HB1. Add `fixtures/ai-eval/README.md` with the selection rule: the 4 anchors, plus 8 bills with a `Comm Sub` text version, plus 8 bills without one, 2026 Regular Session only. The agent commits the 4 anchors and leaves the PR in draft until the owner has added the other 16 from Owner action 1.
  6. Tests in `src/lib/ky-content-generation.test.ts` (and `src/lib/anthropic-model.test.ts` for the price helper), with a stubbed client:
     - the request has `tool_choice` set and no `Status`
     - a description fallback is labelled as such
     - evidence present → clause kept; absent → dropped; whitespace and case variants
     - a missing `tool_use` block → sentinel
     - an API error → sentinel, with no throw
     - `costUsd` computed from a stubbed `usage` (for example 10,000 input and 500 output tokens → $0.0375 at the constant above)
     - `estimateAnthropicCallUsd` returns `null` for an unknown model, and `ANTHROPIC_PRICES_USD_PER_MTOK` has an entry for the literal default `'claude-sonnet-4-6'`
     - `fixtures/ai-eval/bills-20.json` parses, has 20 unique `bill` values, and includes the 4 anchors
- **Don't:** change `KY_DEFAULT_ANTHROPIC_MODEL` (a model switch is its own WP, opened only from WS4-07 step 3's retirement note); add a usage table, migration, month counter or monthly-cap check; build a Batch API path; put bill text in the fixture; delete v1; add summaries to emails; call Anthropic in tests; upgrade `@anthropic-ai/sdk`.
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 10 new tests.
  - [ ] `git grep -n "output_config" src` prints nothing, and `package.json`'s SDK version is unchanged.
  - [ ] `git grep -n "checkAnthropicMonthlyCap\|recordAnthropicUsage" src scripts` prints nothing, and the PR adds no migration.
  - [ ] `fixtures/ai-eval/bills-20.json` has exactly 20 entries, at least 5 of them `Comm Sub` bills per the owner's SELECT output pasted in the PR.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`.
- **Owner actions:**
  1. Before merge, SELECT-only, and paste the output into the PR (the agent then commits the 16 rows to the fixture): `with c as (select b.bill_number, exists (select 1 from jsonb_array_elements(b.legiscan_texts) t where t->>'type' = 'Comm Sub') as comm_sub from ky_bills b where b.session = '2026 Regular Session' and b.bill_number not in ('SB197','HB904','HB500','HB1') and b.legiscan_texts is not null), r as (select *, row_number() over (partition by comm_sub order by bill_number) as rn from c) select bill_number, comm_sub from r where rn <= 8 order by comm_sub desc, bill_number;`. It returns 8 bills with `comm_sub = true` and 8 with `false` [verify that `Comm Sub` is the stored type string, as WS3-04's `billChangedAfterIntroduction` assumes].
  2. The paid evaluation is in WS3-09c.
- **Rollback:** `git revert`. Nothing calls v2 until WS3-09c, and the fixture and price constant are unused until then.

---

### WS3-09c · Wire text grounding into the summary backfill with cost guards

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS3-08, WS3-09a, WS3-09b | A1, A2, A9, D1, D3, E6, E13, O2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Regeneration policy for legacy summaries.** Options:
  - (a) Legacy summaries (v1, description-built) are never regenerated automatically, only by an Owner-run backfill.
  - (b) The scheduled job upgrades them in batches.

  **Recommended: (a).** It keeps spend predictable (O2) and matches WS1-11's rule that a hash change is a deliberate event. **Default if no answer by 2026-11-27: (a).**
- **Data-limit impact:**
  - **Development:** 0 external calls (unit tests with stubs).
  - **Owner evaluation:** at most 20 bills, Anthropic ≤ $1 (`--max-usd=1`), LRC ≤ 20 fetches (option a) or LegiScan ≤ 20 queries (option b).
  - **Production scheduled job:** new and changed bills only.
    - Anthropic is estimated at about $0.03 per bill [estimate; WS3-07 measures it]. It runs under the existing `--limit`, this run's `--max-usd`, and the $40/month Console limit (WS4-04/WS4-07) as the monthly backstop.
    - Text fetches are capped per run by `--max-text-fetches` (default 50). With (b), the same cap counts as LegiScan queries and must fit inside WS4-03a's per-run budget.
    - Stop conditions: `--max-usd` (this run's summed `costUsd`), the WS3-08 breaker, `--limit`, and the Console limit (calls rejected there become sentinels, so no summary is overwritten).
- **Ongoing cost:** no new schedule or step. In session, Anthropic spend rises as estimated under "WS3 ongoing cost". If fetch errors exceed the threshold, the script alerts Slack itself.
- **Why:** This WP turns text grounding on, and it must not cause a mass regeneration, silent fetch failures or a job timeout.
- **Current state (verified 2026-10-06):**
  - `scripts/backfill-bill-summaries.ts`:
    - flags `--limit`, `--session`, `--bill`, `--only-missing`, `--all-sessions`, `--dry-run` (header ~5–17)
    - `--dry-run` still calls Anthropic (manual §4)
    - `--limit` counts generations, and `--limit=0` breaks the scan loop before scanning anything, so it cannot be used as a plan
    - the candidate test is at ~83 (`!isUsableSummary(row.ai_summary)` → candidate)
  - `.github/workflows/sync-ky-bills-status.yml`:
    - "Summarize new/changed bills" runs `npm run backfill:bill-summaries -- --limit=300` with `continue-on-error: true` (~118–138)
    - the Slack step runs only `if: failure()` (~139–150), so it never fires for a continue-on-error step
    - the job has `timeout-minutes: 45`, and its header comment budgets about 15–20 min for summaries (~59–63)
    - WS4-12 leaves this step in this file. It deletes only the Vercel duplicate bills cron and moves `accuracy-audit.yml` to `0 14 * * 0`.
  - `src/lib/slack-webhook.ts` exports `notifySyncExceptionSlack` (~507) and `markSlackErrorNotified` (~29).
- **Do:**
  1. **Candidate filter, as a pure exported function.** Put `summaryCandidateDecision(row, flags)` in `src/lib/ai-summary-candidates.ts`:
     - no usable summary (`!isUsableSummary(ai_summary)`) → always a candidate (new bills)
     - **legacy** means exactly `isUsableSummary(ai_summary) && ai_summary_prompt_version IS NULL` → skipped, unless `--upgrade-legacy` or `--bills=`/`--bill=` names the row
     - v2 row → candidate only when `summaryInputHashV2(current inputs) !== ai_summary_input_hash`
     - `--only-missing` keeps its meaning
     - `--changed-enacted` restricts to `classifyKyBillBrowseBucket(bill) === 'signed'` and `billChangedAfterIntroduction(...)` (WS3-04)
  2. **Generation.** For each candidate (up to `--limit`), call `ensureBillText` (WS3-08):
     - mode `plan` under `--plan`, `dry` under `--dry-run`, `live` otherwise
     - session eligibility as WS3-08 defines it
     - per-run budget `--max-text-fetches` (default 50)

     Then call `generateBillSummaryV2` with the text, or with the description when the result is `over_cap`, `no_doc`, `ineligible`, `error` or out of budget. Write `ai_summary`, `ai_summary_generated_at`, `ai_summary_model`, the v2 `ai_summary_input_hash`, `ai_summary_basis`, `ai_summary_text_doc_id`, `ai_summary_text_type`, `ai_summary_text_date` and `ai_summary_prompt_version = 2`.
  3. **New flags:**
     - `--plan` runs candidate selection only. It prints the candidate count, the planned text fetches and an estimated cost (count × the WS3-07 per-bill figure), and makes **zero** Anthropic and zero fetch calls.
     - `--bills=HB1,SB197,…` targets several bills and works with `--upgrade-legacy` and `--dry-run`.
     - `--upgrade-legacy` and `--changed-enacted`.
     - `--max-usd=N` (default 5) stops scheduling new generations once this run's spend reaches N. This run's spend is the sum of `costUsd` returned by `generateBillSummaryV2` (WS3-09b), including calls that returned a sentinel with usage. It reads no stored counter. If `estimateAnthropicCallUsd` returns `null` for the configured model, the script exits before its first call with `no price for model <id>; add it to ANTHROPIC_PRICES_USD_PER_MTOK` (fail closed). In-flight calls at the moment the limit is crossed may finish, so the overshoot is at most 4 calls (the concurrency).
     - `--max-text-fetches=N`.

     Print `planned=… generated=… text_basis=… description_basis=… fetched=… fetch_errors=… spentThisRun≈$…` at the end.
  4. **Fetch-failure alert.** If `fetch_errors > 0` and `fetch_errors / max(fetch attempts, 1) > 0.05`, or the WS3-08 breaker tripped, call `notifySyncExceptionSlack({ error, source: 'bill-text-fetch', dryRun: false, isVercelCron: false, fromCli: true })` [verify its parameters and return value], then `markSlackErrorNotified(delivered)`. Inject the notifier so a test can stub it. The step stays `continue-on-error`, so a fetch outage degrades to description-basis summaries and is still reported (E6, E13).
  5. **Timeout budget.** Choose the scheduled `--limit` so that `limit ÷ 4 (concurrency) × p95 seconds per text-sized call (from WS3-07) + max-text-fetches × 2 s ≤ 25 min`, which leaves the rest of the 45-minute job for the sync. If WS3-07 has no latency figure, use `--limit=150 --max-text-fetches=50`. Change **only the arguments** of the existing "Summarize new/changed bills" step in `.github/workflows/sync-ky-bills-status.yml` (it runs `npm run backfill:bill-summaries -- --limit=300` today). Update that step's comment with the arithmetic.
  6. **Tests** in `src/lib/ai-summary-candidates.test.ts` and a script-level test with stubs:
     - a new bill with no summary → generated
     - a legacy row → skipped
     - a legacy row named in `--bills=` → generated
     - a v2 row with a changed text sha → regenerated
     - an unchanged v2 row → skipped
     - `--changed-enacted` selection
     - `--plan` makes zero generator and zero fetcher calls
     - `--max-usd` stops scheduling once summed stubbed `costUsd` reaches N, and an unpriced model exits before any call
     - the alert fires above the threshold and not below it
- **Don't:** add a workflow step or a schedule; launch any backfill beyond the Owner evaluation; delete the v1 path; send bill text to Slack (counts only).
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 8 new tests, including the four legacy and v2 cases.
  - [ ] The workflow diff changes only the summary step's arguments and comment (`git diff .github/workflows` shows no new `- name:` and no `schedule:` line).
  - [ ] The PR states the timeout arithmetic and the chosen `--limit`.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, and `npm run typecheck:scripts` if present. All runs below need production secrets (Owner).
- **Owner actions:**
  1. `npx tsx scripts/backfill-bill-summaries.ts --session="2027 Regular Session" --plan` (or the 2026 session if 2027 is not yet loaded). Expect zero spend and a candidate count.
  2. **Evaluation (≤ $1):** `npx tsx scripts/backfill-bill-summaries.ts --session="2026 Regular Session" --bills=<the 20 bills in fixtures/ai-eval/bills-20.json (WS3-09b), which include SB197, HB904, HB500 and at least 5 committee-substitute bills> --upgrade-legacy --dry-run --max-usd=1`. It writes nothing to `ky_bills`. Paste the before and after summaries of 5 bills and the actual spend into the PR.
  3. Answer the regeneration-policy decision by 2026-11-27, or the default applies.
  4. **First production run (the go/no-go evidence):** `npx tsx scripts/backfill-bill-summaries.ts --session="2026 Regular Session" --bills=<5 committee-substitute bills from the evaluation> --upgrade-legacy --max-usd=1`. Expect 5 rows with `ai_summary_basis = 'bill_text'`. Record the spend. This must be done by 2026-12-07 for **Go**.
  5. On 2027-02-15, SELECT-only: `select ai_summary_basis, count(*) from ky_bills where session = '2027 Regular Session' and ai_summary is not null group by 1;`. Definition-of-done item 3 needs `bill_text` ≥ 90% (if Go).
- **Rollback:** `git revert`. The v1 path still exists, and v2 rows keep rendering. To stop grounding in production without a revert, set the scheduled step's `--max-text-fetches=0`. Every summary then falls back to description basis.

---

### WS3-09d · Show the summarized version on the bill page and /about

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | S | WS3-09a, WS3-04 | A2, A4, U16, C4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. The copy is fixed below.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0.
- **Why:** A reader, a partner (C2) and an AI tool that cites the page (C4) should see which version was summarized. This UI change is harmless before any `bill_text` row exists, so it may merge even on a no-go.
- **Current state (verified 2026-10-06):** after WS3-04, `src/lib/ai-summary-basis.ts` exports `aiSummaryBasisLine`, `SHOW_AUDIENCE_CLAUSE` and `stripAudienceClause`, and `TEXT_TYPE_LABELS` lives in `src/lib/bill-text-versions.ts`. `src/app/about/page.tsx` ~78–82 holds the WS3-04 paragraph.
- **Do:**
  1. Extend `aiSummaryBasisLine` for `bill_text`: exactly `Written by AI from the Committee Substitute text dated Feb 12, 2026.`, or `Written by AI from the Enrolled text.` when there is no date. Take the version label from `TEXT_TYPE_LABELS` without its parenthetical, and format the date with `formatCivicDate`.
  2. On the bill page, select `ai_summary_basis`, `ai_summary_text_doc_id`, `ai_summary_text_type` and `ai_summary_text_date`. Pass `basis={{ kind: 'bill_text', … }}` when `ai_summary_basis = 'bill_text'`. Point the official-text link at that version's `state_link`. Suppress WS3-04's "changed after it was introduced" caveat when the basis is `bill_text` and the summarized `doc_id` equals `selectCurrentBillText(...)`'s.
  3. Replace the constant `SHOW_AUDIENCE_CLAUSE` with `showAudienceClause(basis)`, which returns true only for `bill_text` (validated by WS3-09b), unless the owner chose to remove the clause permanently in WS3-04.
  4. Update the `/about` paragraph's third and fourth sentences to exactly: `For newer bills it reads the official text of the version it names, and the summary says which version and date. Older bills, and bills whose text is too long or not yet published, use the official description, and the summary says so.`
  5. Add `bill_text` samples to `/dev/bill-summary-preview`.
  6. Tests: both `bill_text` forms, `showAudienceClause`, and the caveat suppression rule.
- **Don't:** change WS3-04's description-basis line; re-type copy anywhere else (WS6-09b and WS8-07b import `aiSummaryBasisLine`).
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 5 new tests.
  - [ ] `git grep -n "Written by AI from" src` shows definitions only in `src/lib/ai-summary-basis.ts`.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`. Screenshots of `/dev/bill-summary-preview` at 390 px and 1440 px.
- **Owner actions:** after WS3-09c's first production run, open one of its five bills on production and confirm the version line.
- **Rollback:** `git revert`.

---

### WS3-10 · Regenerate summaries for 2026 enacted bills that changed

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Owner | S | WS3-09c | A2, A9, O2, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Scope and budget.** Options:
  - (a) 2026 RS enacted bills that changed after introduction (about 141–211 bills, about $5–8).
  - (b) (a) plus every other 2026 RS bill (about 1,737 bills, about $50–60).
  - (c) 2024–2026 RS (about 4,936 bills, about $150).

  All are estimates at about $0.03 per bill [verify after WS3-07]. **Recommended: (a) now, and (b) only if the W4 evaluation shows that traffic to 2026 bills justifies it.** **Default if no answer by 2026-12-05: (a).**

  **Run condition (model retirement, A8).** Run only after WS4-07 step 3's retirement-date note (the date, or "none announced as of <date>", with a source link) is in `docs/data-budget.md`. If that date falls before 2027-04-30, run only after the model-switch WP that note opens has merged, so the switch and this regeneration happen in one run. Otherwise run on the current model. If the note is still missing on 2026-12-05, the owner looks up the date then (WS4-07 step 3) before running. Use the synchronous path (`scripts/backfill-bill-summaries.ts`). There is no batch path: WS4 deferred it with the trigger "an approved regeneration estimated above $50", which (a) is not.
- **Data-limit impact:**
  - Anthropic ≤ $10 for (a), enforced by `--max-usd=10` (this run's summed usage) and inside the $40/month Console limit (WS4-04/WS4-07). Check the Console usage page first: if the month's spend plus $10 would exceed $40, wait for the next month or have the owner raise the limit.
  - Text fetches ≤ 250 (the candidates only), in at most 2 runs: LRC at ≤ 1/s (option a), or LegiScan under `--budget` (option b, WS4-03b).
- **Ongoing cost:** none. This is a one-time run.
- **Why:** The worst summaries are on laws that changed after introduction (A2). Enacted 2026 bills are what people look up between sessions and during the election.
- **Current state (verified 2026-10-06):** WS3-09c adds `--plan`, `--bills=`, `--changed-enacted`, `--upgrade-legacy`, `--max-usd` and `--max-text-fetches`. `--dry-run` still calls Anthropic (manual §4). `src/lib/anthropic-model.ts` defaults to `claude-sonnet-4-6`; no retirement date is recorded in the repo yet (WS4-01/WS4-07 record it).
- **Do (Owner):** before step 1, confirm the run condition above (WS4-07 step 3's retirement note exists, and any model-switch WP it requires has merged).
  1. Back up the affected columns into a schema that the API does not expose:
     ```sql
     create schema if not exists ops_backup;
     revoke all on schema ops_backup from anon, authenticated;
     create table ops_backup.ky_bills_ai_summary_ws3_10 as
       select id, ai_summary, ai_summary_generated_at, ai_summary_model, ai_summary_input_hash,
              ai_summary_basis, ai_summary_text_doc_id, ai_summary_text_type, ai_summary_text_date,
              ai_summary_prompt_version
       from public.ky_bills where session = '2026 Regular Session';
     alter table ops_backup.ky_bills_ai_summary_ws3_10 enable row level security;
     revoke all on ops_backup.ky_bills_ai_summary_ws3_10 from anon, authenticated;
     ```
     [verify in Dashboard → Settings → API that `ops_backup` is not an exposed schema]. Drop the table on or after 2027-01-31: `drop table ops_backup.ky_bills_ai_summary_ws3_10;`.
  2. Plan without spending: `npx tsx scripts/backfill-bill-summaries.ts --session="2026 Regular Session" --changed-enacted --upgrade-legacy --plan`. Note the candidate count and the planned fetches. Do not use `--dry-run` for this, because it still calls Anthropic.
  3. Run `npx tsx scripts/backfill-bill-summaries.ts --session="2026 Regular Session" --changed-enacted --upgrade-legacy --max-usd=10 --max-text-fetches=250`. Repeat once if the fetch cap stopped the first run.
  4. Spot-check SB197, HB904 and three others on production. Record the spend and counts in a decision note (≤ 15 lines).
- **Don't:** run without `--max-usd`; widen to (b) or (c) without updating the decision.
- **Acceptance criteria:**
  - [ ] SB197 (2026 RS) shows a summary labelled with the version it summarized, and the summary no longer contradicts the title.
  - [ ] `select count(*) from ky_bills where session='2026 Regular Session' and ai_summary_prompt_version = 2;` ≥ the step 2 candidate count, minus over-cap bills.
  - [ ] Actual spend is recorded and ≤ $10.
  - [ ] The decision note cites the retirement-date line in `docs/data-budget.md` that the run condition relied on.
- **Verify:** production secrets required (Owner only).
- **Owner actions:** all of the above.
- **Rollback:** restore from the backup, including the provenance columns, so no description summary keeps a `bill_text` label:
  ```sql
  update public.ky_bills b set ai_summary = k.ai_summary, ai_summary_generated_at = k.ai_summary_generated_at,
    ai_summary_model = k.ai_summary_model, ai_summary_input_hash = k.ai_summary_input_hash,
    ai_summary_basis = k.ai_summary_basis, ai_summary_text_doc_id = k.ai_summary_text_doc_id,
    ai_summary_text_type = k.ai_summary_text_type, ai_summary_text_date = k.ai_summary_text_date,
    ai_summary_prompt_version = k.ai_summary_prompt_version
  from ops_backup.ky_bills_ai_summary_ws3_10 k where k.id = b.id and b.ai_summary_prompt_version = 2;
  ```

---

### WS3-11a · Check new text-grounded summaries against their text in the weekly audit

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Opus | M | WS3-09c, WS3-15 | A3, A4, A9, E13, O2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. The caps are set below and can be changed with env vars. **First to cut** if W2 runs late (Execution notes), and deferred with the pipeline on a no-go.
- **Data-limit impact:**
  - Development: 0 external calls (stubbed tests).
  - Owner verification run: ≤ $1.
  - Production: one call per checked summary, at most `ACCURACY_SUMMARY_TEXT_CAP` (default 30) a week, at about 9k input tokens each. That is about 270k tokens, or about $1 a week at $3/$15 per million tokens [verify current pricing for `KY_DEFAULT_ANTHROPIC_MODEL`].
  - Set `ACCURACY_LLM_MAX_TOTAL_TOKENS: 400000` in `.github/workflows/accuracy-audit.yml`'s env, replacing the 200k default. That covers the text pass plus the existing topics and glossary passes [verify their usage from a recent run's ledger line, and adjust so the total stays ≤ $1.50 a run]. The summary pass already runs first (`llm-review.ts` ~494), so if the budget runs out, the topics pass and then the glossary pass are skipped, as today.
  - LegiScan and LRC: 0.
- **Ongoing cost:** about $4/month in session. It narrows the metadata-only pass to description-basis summaries and adds no schedule. **Sunset test (W4, applied by WS9-14; WS8-08 links it as an input to the April review):** if fewer than 2% of the summaries checked in W3 are flagged, set `ACCURACY_SUMMARY_TEXT_CAP=8` (sampling). If W3 reader reports and flags show no meaningful description-vs-text error rate, or summary pages draw no meaningful traffic, the owner may also retire WS3-09c's per-run text fetch with `--max-text-fetches=0`.
- **Why:** The audit samples 8 summaries a week from about 22.5k bills and judges them against the same metadata they were built from, so it cannot catch a summary that misstates the bill (A3). Checking the most-viewed new summaries against their own text targets the errors readers would actually see.
- **Current state (verified 2026-10-06):**
  - `src/lib/accuracy-audit/checkers/llm-review.ts`:
    - `reviewSummaries` (~133–207) samples `cfg.llmSample` rows and prompts with the title, the description clipped at 2,000 characters, the subjects and the editor notes. Verdicts are capped at `warn`.
    - `billKey()` (~129) builds the finding entity as `"<billNumber> · <session>"`.
    - `DEFAULT_LLM_TOKEN_BUDGET = 200_000` (~45). The passes run in the order summary, topics, glossary (~494–496).
  - `src/lib/accuracy-audit/types.ts` ~244: `llmSample: envInt('ACCURACY_LLM_SAMPLE', 8)`.
  - `.github/workflows/accuracy-audit.yml` runs on cron `'0 13 * * 0'`. `docs/accuracy-audit.md` says "Sundays 07:00 UTC" (doc drift).
  - Migration 053's header says "The summary and topics passes are NOT cached", because their inputs change often. The cache's primary key is `(content_hash, model)`.
- **Do:**
  1. Add `reviewSummariesAgainstText`, which runs first. It selects bills with `ai_summary_basis = 'bill_text'` and `ai_summary_generated_at` within `ACCURACY_SUMMARY_WINDOW_DAYS` (default 8), ordered by `view_count` desc, then newest, and capped at `ACCURACY_SUMMARY_TEXT_CAP` (default 30).
  2. For each bill, load `ky_bill_texts.extracted_text` for `ai_summary_text_doc_id`, and make one call per bill. Get JSON through forced tool use (as in WS3-09b, no SDK upgrade), with `{ ok: boolean, severity: 'fail'|'warn'|'info', issue: string, unsupported_claim: string|null }`.
  3. Cache verdicts in `ky_accuracy_llm_cache`, with `content_hash = sha256(summary + '\n' + text sha256 + '\n' + promptVersion)` and `model = the model id`. This reverses migration 053's "summaries are NOT cached" choice. It is safe now because the key includes both the summary and the text hash, so any change misses the cache, and a summary is never paid for twice. Record this in `docs/accuracy-audit.md` (the table comment in 053 stays as history).
  4. Narrow the existing metadata pass to `ai_summary_basis is distinct from 'bill_text'` (legacy and description-basis summaries), with the same `ACCURACY_LLM_SAMPLE`.
  5. Keep verdicts advisory (capped at `warn`). Findings use `domain='llm'`, `field='ai_summary'` and the `billKey` entity, and their message includes the `doc_id` and `unsupported_claim` clipped to 240 characters.
  6. Update `docs/accuracy-audit.md`: the environment table (new variables), the `llm` domain row, the cache note, and the schedule line, changing "07:00 UTC" to match the cron.
  7. Unit-test candidate selection (window, cap, ordering, `bill_text` only) and the cache key, with a stubbed query builder. No live calls.
- **Don't:** make LLM verdicts fail CI; send summaries or bill text to Slack (finding text only, clipped); add a schedule; check description-basis summaries against text.
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 6 new tests.
  - [ ] `accuracy-audit.yml` sets `ACCURACY_LLM_MAX_TOTAL_TOKENS`, and the PR states the dollar ceiling per run.
  - [ ] `docs/accuracy-audit.md` reflects the new variables, the cache change and the correct schedule.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`. The audit runs below need production secrets (Owner).
- **Owner actions:**
  1. `npx tsx scripts/accuracy-audit.ts --dry-run --domain=llm`. With WS3-15 merged, it makes no Anthropic or other external call [verify in the output]. Expect a planned summary-check count.
  2. One live run, ≤ $1: `ACCURACY_SUMMARY_TEXT_CAP=10 npx tsx scripts/accuracy-audit.ts --domain=llm`. It **writes** `ky_accuracy_findings` and rotation stamps and **posts to Slack**, like a normal Sunday run of that domain. Record the token usage and cost in the PR. Expect up to 10 text checks plus the usual topics and glossary passes.
  3. After the first in-session Sunday run (2027-01-10 or later), note in the `TRACKER.md` row how many summaries were checked and flagged.
- **Rollback:** `git revert` restores the metadata pass. No schema change.

---

### WS3-11b · Let the owner suppress a bad summary with one command

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 | Opus | S | WS3-04 | A3, A4, A9, C8, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Public "checked by a person" label.** Options:
  - (a) Add an approve command and show `Checked against the official text by a person on <date>.`
  - (b) No public review label. Build suppression only.

  **Recommended: (b).** decisions.md 2026-07-06 ("Editor-verified UI disclosure removed") records the owner's rule: "don't market verification until there are subject-matter experts behind the word". (a) would reverse it and add about 1 h a week of review in session. **Default if no answer by 2026-10-20: (b).** The approve label and a review queue are Deferred until SMEs or a partner's reviewers exist.
- **Data-limit impact:** none. Database reads and writes only, run by the owner.
- **Ongoing cost:** minutes per suppression. No review cadence and no schedule.
- **Why:** During the election and the session, the owner needs to hide a wrong summary in minutes, without a deploy or a regeneration (A3, A4). **Target merge: 2026-10-30**, before WS9-03's election freeze.
- **Current state (verified 2026-10-06):** no review or suppression state exists on `ky_bills`. `scripts/set-bill-editor-note.ts` is the existing operator-CLI pattern. AI summary text is rendered on the bill page (`BillDetailView.tsx` ~1162–1172) and in the meta and JSON-LD fallbacks (`src/app/bills/[id]/page.tsx` ~43, `src/lib/structured-data.ts` ~73) until WS6-07 removes them. Search uses `ai_summary` for matching only (`src/lib/ky-search-bills.ts`).
- **Do:**
  1. Migration `NNN_ky_bill_ai_summary_suppression.sql` (idempotent). Add `ai_summary_suppressed_hash text` and `ai_summary_suppressed_note text` to `ky_bills`, with comments. The note is internal and is never selected by public pages.
  2. `src/lib/ai-summary-display.ts`: `summaryForDisplay(bill: { ai_summary, ai_summary_input_hash, ai_summary_suppressed_hash }): string | null`. It returns `null` when the summary is unusable, or when `ai_summary_suppressed_hash` is not null and equals `coalesce(ai_summary_input_hash, '')`. A regenerated summary (a new hash) shows again automatically.
  3. Use `summaryForDisplay` at the three render sites above. When the summary is suppressed on the bill page, render the official-text link with exactly `A plain-language summary for this bill is being corrected.`
  4. `scripts/suppress-summary.ts` (npm `summaries:suppress`):
     - `<billNumber> --session=… --note="…"` sets `ai_summary_suppressed_hash = coalesce(ai_summary_input_hash, '')` and the note.
     - `--clear` sets both to NULL.
     - It updates exactly one row by `id`, after a select confirms exactly one match, and prints the before and after state. It refuses on zero or several matches.
     - Remind the operator that the page updates within the ISR window (300 s).
  5. Tests in `src/lib/ai-summary-display.test.ts`:
     - not suppressed
     - suppressed with a matching hash
     - suppressed with a stale hash
     - a null input hash
     - an unusable summary
     - the copy has no em dash or semicolon
- **Don't:** build an admin web UI, a review queue or an approve label; write reviewer names; let the audit suppress automatically.
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 6 new tests.
  - [ ] `git grep -n "bill.ai_summary" src/components src/app src/lib/structured-data.ts` shows no direct render that bypasses `summaryForDisplay`.
  - [ ] The script writes only the two suppression columns of one row (code review).
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`. Script runs need production secrets (Owner).
- **Owner actions:** apply the migration before merge (`npm run db:apply-sql -- supabase/migrations/NNN_ky_bill_ai_summary_suppression.sql`). After deploy, suppress and then clear one bill, and confirm on production within 5 minutes.
- **Rollback:** clear any suppressions deliberately first (`--clear`), then `git revert`. Down SQL drops the two columns.

---

### WS3-12a · Add a subject fallback and an HB1 fix to the topic classifier

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W1 | Sonnet | S | none | A6, A9 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none for the code. The owner supplies the fixture (Owner actions).
- **Data-limit impact:** none. Keyword and subject-mapping code only. `classifyTopicsAI` is not called. No production code path uses the new function until WS3-12b, so merging this WP changes no tags and no input hash.
- **Ongoing cost:** replaces one-bill-at-a-time keyword tweaks (TASKS.md ~563–567) with regression tests. About 0.
- **Why:** HB1 (2026), a scholarship tax-credit bill, is tagged "Voting Rights" and "Elections", and 22% of 2026 bills have no topic (A6). The topic filter is used by 0.5% of visitors (T5), so this WP is kept small: a narrow fix, a free fallback and regression tests.
- **Current state (verified 2026-10-06):**
  - `src/lib/ky-topic-classifier.ts`:
    - `KY_TOPICS` (24 topics).
    - `TOPIC_KEYWORDS`: Voting Rights includes bare `election`, `elections`, `voter` and `poll` (~101). Elections includes `secretary of state` (~113).
    - `classifyTopics(title, description)` (~259–302).
  - `src/lib/ky-topic-legiscan-mapping.ts` `topicsForLegiScanSubjects` (~246) maps LegiScan subjects to topics. It is called from `src/components/bills/BillTopicMatchHint.tsx` (~48) and `src/app/api/me/activity/route.ts` (~90). The digest (`src/lib/digest/run-bill-digest-cron.tsx` ~277, ~500, ~530) uses `billMatchesTopicFilters` and `matchedTopicFilters` from the same module. **None of them assigns stored tags.**
  - Why HB1 matches is not visible in the repo. A likely cause is tax-law use of "election" ("an election to claim the credit").
- **Do:**
  1. Open a draft PR. Set the `TRACKER.md` row to `blocked` until the owner has committed `src/lib/__fixtures__/topic-regressions.json` (Owner action 1) to the branch.
  2. Add `classifyTopicsWithSubjects(title, description, subjects)`. It runs `classifyTopics` and, **only when that returns no topic**, falls back to `topicsForLegiScanSubjects(subjects)`, at most 2 topics.
  3. Fix HB1 with the narrowest rule the fixture supports. For example, do not count `election` when followed within 3 words by "to claim", "under this section" or "by the taxpayer" [adapt to the evidence]. Add a dated comment, as the existing keyword rules have.
  4. Tests in `src/lib/ky-topic-classifier.test.ts`, at least 10 per-bill cases from the fixture:
     - HB1 excludes Voting Rights and Elections
     - one real elections bill keeps Elections
     - the regressions documented in the classifier's comments (HB475 2020 at ~38, SR35 2023 at ~44)
     - at least 5 currently untagged bills that the fallback tags
  5. Report, in the PR, how many of the fixture's untagged bills get a topic. Target: at least 50%. If the target is not reached, record the achieved number, keep it as the test's baseline, mark the WP `blocked` for the owner, and hand off. Do not lower the bar silently and do not call Anthropic.
- **Don't:** switch any production call site (WS3-12b); call Anthropic; add topics to the taxonomy; change topic pages or filter UI; build a 100-bill evaluation set (Deferred).
- **Acceptance criteria:**
  - [ ] `git grep -n "classifyTopicsWithSubjects" src scripts` shows only the classifier and its test.
  - [ ] `npm test` passes with at least 10 new tests, including HB1.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`.
- **Owner actions:**
  1. Run SELECT-only on public bill fields, with no user data, and commit the result as JSON at `src/lib/__fixtures__/topic-regressions.json` on the PR branch:
     - `select bill_number, session, title, description, legiscan_subjects, topics from ky_bills where (session = '2026 Regular Session' and bill_number = 'HB1') or (session, bill_number) in (('2020 Regular Session','HB475'),('2023 Regular Session','SR35'));`
     - plus `… where session = '2026 Regular Session' and (topics is null or topics = '{}') order by md5(id::text) limit 30;`
     - plus 5 bills you know are about elections
  2. Review the expected topics the agent proposes in the PR (about 20 minutes).
- **Rollback:** `git revert`.

---

### WS3-12b · Switch topic tagging to the new classifier and reclassify

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Opus | S | WS3-12a, WS1-11 | A6, A9, O2 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **The topic/hash coupling.** Topics are a v1 hash input, so changed tags make legacy summaries regenerate on the next scheduled run. Options:
  - (i) The reclassify script also rewrites `ai_summary_input_hash` (using WS1-11's v1 function) for rows whose topics change and whose stored hash matched their old inputs. This is a DB-only change, with no regeneration, because topics barely affect summary text.
  - (ii) Wait until WS3-09c is live, since its legacy rule skips v1 rows.

  **Recommended: (i).** It does not depend on the go/no-go, and the HB1 fix reaches production. **Default if no answer by 2026-11-20: (i).**
- **Data-limit impact:**
  - LegiScan: 0.
  - Anthropic under (i): about $0. The owner runs the reclassify **from the PR branch immediately before merging**, so after deploy the sync recomputes the same topics and no hash changes. Worst case, if a bill is re-synced between the reclassify and the deploy: ≤ 20 regenerations ≈ $0.12 [estimate at $0.006 per bill].
  - Under (ii): 0.
- **Ongoing cost:** about 0.
- **Why:** WS3-12a's fix must reach the stored tags that drive `/bills/topics/*`, filters and digest matching (A6) without triggering an unbudgeted regeneration (O2).
- **Current state (verified 2026-10-06):**
  - Call sites that assign tags: `src/lib/ky-sync-pipeline.ts` (~559, ~654, ~890), `src/lib/ky-legiscan-dataset-import.ts` (~142, `buildBillRow`), and `scripts/reclassify-bill-topics.ts` (~56).
  - The reclassify script's select (~45) is `id, bill_number, session, title, description, topics`. It does not include `legiscan_subjects`.
- **Do:**
  1. Switch the four call sites to `classifyTopicsWithSubjects`, passing the subjects in scope at each one [verify at each site, and pass `[]` where a site has none].
  2. In `scripts/reclassify-bill-topics.ts`, add `legiscan_subjects` to the select. Under (i), also select `ai_summary_input_hash`, `editor_notes` and `ai_summary_prompt_version`. Then add `--rewrite-summary-hash`: for a changed row with `ai_summary_prompt_version IS NULL` whose stored hash equals `summaryInputHash(old inputs)`, write `summaryInputHash(new inputs)`. Leave its `--dry-run` behavior as is, and print the counts of changed rows and rewritten hashes.
  3. Add a test of the hash-rewrite decision, as a pure function with matching, stale and v2 rows.
- **Don't:** call Anthropic; change the taxonomy; touch v2 rows.
- **Acceptance criteria:**
  - [ ] `git grep -n "classifyTopics(" src/lib/ky-sync-pipeline.ts src/lib/ky-legiscan-dataset-import.ts scripts/reclassify-bill-topics.ts` prints nothing.
  - [ ] `npm test` passes with at least 3 new tests.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`. The reclassify needs production secrets (Owner).
- **Owner actions:**
  1. Before merge, from the PR branch, run SELECT-only: `select count(*) filter (where topics is null or topics = '{}') as untagged, count(*) as total from ky_bills where session = '2026 Regular Session';`
  2. Run `npx tsx scripts/reclassify-bill-topics.ts --dry-run`, then `npx tsx scripts/reclassify-bill-topics.ts --rewrite-summary-hash` (under (i)).
  3. Repeat the SELECT, record before and after in the PR, and merge the same day.
- **Rollback:** `git revert`, then re-run the reclassify on the reverted code (DB-only).

---

### WS3-13 · Use one "became law" status label on cards and filters

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P3 | W4 | Sonnet | S | WS1-10, WS3-03b, WS6-09a | U8, U3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Wording.** Recommended: the chip reads `Became law`, with a detail line from `Signed by the Governor`, `Became law after a veto override` or `Filed with the Secretary of State` (a chaptered bill with no clearer action). The browse filter is labelled `Became law`. **Default if no answer by 2027-04-10: the recommended wording.**
- **Data-limit impact:** none.
- **Ongoing cost:** about 0. One helper replaces three hand-rolled label paths.
- **Why:** Three labels that all mean "became law" ("Signed by Governor", "Chaptered", "Veto Override") read as different outcomes on cards and filters (U8, owned by WS6 for layout). This is copy consistency, not a factual error, so it waits for W4.
- **Current state (verified 2026-10-06):**
  - `src/lib/map-legiscan-bill-status.ts` returns `'Veto Override'` (~175), `'Signed'` (~178) and `'Chaptered'` (~193, ~197).
  - `src/lib/bill-display.ts`: `classifyKyBillBrowseBucket` (~255) puts all three in bucket `signed`. `billStatusChipLabel` (~313) maps "Signed" to "Signed by Governor". `isSignedByGovernorBillStatus` is at ~203.
  - Render sites that bypass `billStatusChipLabel` for "Chaptered" and "Veto Override":
    - `src/components/bills/BillStatusMetaChip.tsx` ~120
    - `src/components/bills/BillsListTable.tsx` ~138–140
    - `src/components/home/HomeCuratedBillList.tsx` ~101
  - The bill page's history-derived status becomes `computeEffectiveStatus` in `src/lib/bill-detail-view-model.ts` (WS6-09a).
- **Do:**
  1. Add `billStatusDisplay(status): { chip: string; detail: string | null }` to `src/lib/bill-display.ts`. It returns `Became law` plus the detail for the three became-law statuses. For any other status it returns `formatHistoryActionText(status)` (WS3-03b) and `null`.
  2. Route the three components above through `billStatusDisplay`. The bill page passes `computeEffectiveStatus(...)` (WS6-09a) into the same helper. Change the browse filter label for the `signed` bucket to `Became law`, keeping the key `signed` so URLs keep working.
  3. Update WS1-10's expectations in the same diff and remove the `// U8` comments this WP resolves.
- **Don't:** change `mapLegiScanBillStatus` or stored `status` values; change bucket keys or URL parameters; restyle chips (WS6-14); change digest email status text (out of scope, WS1-12/WS7); add a second effective-status function.
- **Acceptance criteria:**
  - [ ] Unit tests assert that `billStatusDisplay(...).chip` is never `Chaptered` or `Veto Override`, across all mapper outputs.
  - [ ] `git grep -n "formatBillLabelText(status\|bill.status!" src/components/bills src/components/home` prints nothing.
  - [ ] `npm test` passes, with the updated WS1-10 expectations and at least 6 new tests.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`.
- **Owner actions:** confirm the wording by 2027-04-10, or the default applies. On the preview, check `/bills` and one enacted bill.
- **Rollback:** `git revert`.

---

### WS3-14 · Publish a corrections log and the procedure behind it

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 | Sonnet | S | WS3-02, WS3-04 | A9, U1, A2, O4, C2, C4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Location.** Options:
  - (a) A `/corrections` page linked from the footer and from `/about`.
  - (b) A section on `/about`.

  **Recommended: (a).** It is a stable, citable URL for partners and for AI tools that cite sources (C4). **Default if no answer by 2026-10-20: (a).** The owner approves the wording of each seed entry in the PR.
- **Data-limit impact:** none.
- **Ongoing cost:** about 10 minutes per correction. No database and no schedule: entries live in a typed file in the repo.
- **Why:** Admitting and dating errors is the honest-sourcing rule of `docs/voice-and-tone.md`, and it is the clearest evidence of rigor a funder or newsroom partner can check (O4, C2). The project already fixes real errors (U1, A2, and the SB197 status bug of PR #175), but the fixes are not visible. **Target merge: 2026-10-30**, ahead of the NLnet deadline and the election (2026-11-03).
- **Current state (verified 2026-10-06):** no corrections page exists (`src/app` has no `corrections` directory). The footer is `src/app/components/SiteFooter.tsx`. The sitemap is `src/app/sitemap.ts` (`/about` at ~33). Reader reports arrive through the "Report a problem with the summary" mailto in `AiAttribution.tsx` and are triaged in `FEEDBACK.md`, which contains personal data (S12), so nothing may be copied from it.
- **Do:**
  1. `src/lib/corrections-log.ts`: `export const CORRECTIONS: Array<{ date: string; area: 'votes' | 'summaries' | 'status' | 'meetings' | 'districts' | 'topics'; whatWasWrong: string; whatChanged: string; howFound: 'reader report' | 'audit' | 'review' }>`, newest first. Seed it with entries for:
     - the WS3-02 vote labels
     - the WS3-04 summary disclosure
     - the 2026-07-17 SB197 "Vetoed" status fix (PR #175, TASKS.md ~255)

     Never name reporters.
  2. `src/app/corrections/page.tsx`: H1 `Corrections`. The intro is exactly `When we find or are told about an error in KYvKY's data or summaries, we fix it and record it here.`, followed by a dated list. Add `buildPageMetadata` and a sitemap entry, and link the page from the footer and from `/about`.
  3. `docs/corrections-procedure.md` (≤ 40 lines): how to correct each kind of error, and when an entry is required (any error a reader could have relied on). **Name only commands that exist in `package.json` on `main` when this merges.** For anything else write "when available (WS3-11b)" without a command:
     - vote label: a code fix plus an entry
     - summary: `npm run summaries:suppress` if WS3-11b has merged, then `scripts/set-bill-editor-note.ts` or a one-bill regeneration with `--bill=`
     - status: fix the mapper, then the owner runs `refresh:bill-status` within the LegiScan budget, if that alias survives WS5-01a/01b
     - meeting: a data fix through the owner
  4. A test that `CORRECTIONS` is sorted newest first and that every string is free of em dashes and semicolons.
- **Don't:** include personal data or reporter names; add a database table or CMS; list minor typo fixes; write a separate reader-report runbook (`docs/ops/README.md`, WS9-01, and the WS9-06a/b runbooks link here).
- **Acceptance criteria:**
  - [ ] `/corrections` builds statically (`npm run build` lists it as static), appears in the sitemap, and is linked from the footer and `/about`.
  - [ ] There are at least 3 seed entries, approved by the owner in the PR.
  - [ ] Every `npm run` command named in `docs/corrections-procedure.md` exists in `package.json` (code review).
  - [ ] `npm test` passes, including the copy check.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`, `npm run build`. `npm run dev`, open `/corrections`, and take screenshots at 390 px and 1440 px. The page reads no database.
- **Owner actions:** approve the seed wording. In W3, add an entry within 2 days of each qualifying fix.
- **Rollback:** `git revert`.

---

### WS3-15 · Make the accuracy audit's dry run skip the Anthropic pass

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 | Sonnet | S | none | N1, A3, O2, E13 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none. Tests are pure. This WP *removes* unbudgeted Anthropic spend: today every `npm run audit:accuracy:dry` runs the full LLM pass, up to the 200k-token budget.
- **Ongoing cost:** about 0.
- **Why:** `buildAuditConfig` is meant to force `skipLlm` on for dry runs (`types.ts` ~224–233, and `docs/accuracy-audit.md` ~124 says "`--dry-run` forces this on"). But the CLI always passes `skipLlm: false`, and `false ?? …` keeps `false`. So a "free" preview spends Anthropic tokens. WS3-11a's verification and manual §4's dry-run guidance depend on this being right (O2).
- **Current state (verified 2026-10-06):**
  - `scripts/accuracy-audit.ts` `parseArgs` (~79–100) initializes `skipLlm = false` and sets it to true only for `--no-llm`. Then ~176–177 passes `dryRun: args.dryRun, skipLlm: args.skipLlm`.
  - `src/lib/accuracy-audit/types.ts` ~233: `const skipLlm = overrides.skipLlm ?? (dryRun || envBool('ACCURACY_SKIP_LLM'));`.
  - `docs/accuracy-audit.md` ~124 names the override flag `--skip-llm`, but the script's flag is `--no-llm`.
- **Do:**
  1. Add a pure `auditOverridesFromCli({ dryRun, noLlm }): AuditConfigOverrides` to `src/lib/accuracy-audit/types.ts`. It sets `skipLlm: true` when `noLlm`, and otherwise leaves `skipLlm` undefined. Use it in `scripts/accuracy-audit.ts`.
  2. Tests in `src/lib/accuracy-audit/types.test.ts`: `buildAuditConfig(auditOverridesFromCli({ dryRun: true, noLlm: false })).skipLlm === true`; a live run without the flag → `false` when `ACCURACY_SKIP_LLM` is unset; `--no-llm` → `true`. Save and restore `process.env` around the tests.
  3. Fix `docs/accuracy-audit.md` ~124 to name `--no-llm`, and say that the dry run skips the LLM pass.
- **Don't:** change any checker, schedule or Slack output.
- **Acceptance criteria:**
  - [ ] `npm test` passes with at least 3 new tests.
  - [ ] `git grep -n "skipLlm: args.skipLlm" scripts/accuracy-audit.ts` prints nothing.
- **Verify:** plain container: `npx tsc --noEmit`, `npm test`, `npm run lint`.
- **Owner actions:** at the next manual dry run, confirm the output shows the LLM pass as skipped.
- **Rollback:** `git revert`.

---

## Deferred

These rows are also in `DEFERRED.md`, where the W4 review records each row's status.

| Item | Reason | Revisit trigger |
|---|---|---|
| **A7:** AI summaries for sessions before 2024 (about 17.5k bills) | About $500+ at text-grounded cost [estimate], plus thousands of document fetches, for pages that get little traffic (T1, T4). Description-based summaries would reintroduce A1/A2. Pre-2024 bill pages work without a summary. | The W4 evaluation shows meaningful traffic to pre-2024 bills, or a partner needs historical summaries and funds them. |
| Chunked (map-reduce) summaries of bills over the size cap (budgets, appropriations) | Multi-pass summarization of bills of 100+ pages is a separate design with its own faithfulness risk. Those bills keep a description-based summary with the honest label (WS3-04, WS3-09d). | More than 5% of a session's enacted bills exceed the cap, or a partner asks for budget-bill summaries. |
| Public "checked by a person" label and a human review queue (cut from WS3-11b) | decisions.md 2026-07-06: no verification marketing without SMEs. About 1 h a week of owner time in session. | SMEs join, or a partner (C2) brings reviewers. |
| 100-bill labelled topic evaluation set with precision gates (cut from WS3-12) | The topic filter is used by 0.5% of visitors and follows by 0.17% (T5). The per-bill regression tests in WS3-12a are enough. | W3 PostHog shows topic pages or filters at ≥ 3% of visitors. |
| LLM topic classification (`classifyTopicsAI`) for untagged bills | WS3-12a's subject fallback is free and deterministic. AI tags would add spend and another unaudited AI output. | WS3-12a cannot reach its 50% untagged-recovery target. |
| Structured `affects[]` audience field and audience lens pages (TASKS.md ~151) | decisions.md 2026-06-26 rejected a separate audience axis as too hard to get right. Audiences stay as validated prose (WS3-09b step 3). | Grounded audience clauses pass WS3-11a at ≥ 95% for a full session. |
| LRC cancellation-notice detection (cut from WS3-06b) | No saved LRC page shows what a cancellation notice looks like. A hand-edited fixture would pin a format nobody has observed. | A real LRC cancellation page is captured into `fixtures/lrc/`. |
| Repairing past duplicate meeting rows (cut from WS3-06b) | Future duplicates age out, and WS3-06a hides them. A repair script adds an npm script while WS5-01b cuts them. | WS3-06b is built and duplicates still exist on future dates. |
| Labelling the motion of unmatched roll calls from LRC record votes | A different need from `docs/specs/lrc-vote-scrape.md` (pre-2018 roll calls, shelved 2026-08-02 because the LRC publishes no per-member data for those sessions). It would need a new scraper, which manual §4 prohibits and E6 warns against. WS3-03a says honestly what is unknown. | A partner or newsroom supplies motion data, or the LRC publishes a feed. |
| Text-diffing successive bill versions ("what changed in the substitute") | High value for partners, but a separate feature. WS3-08 stores only the versions fetched for summaries. | W4 partner conversations ask for it. `ky_bill_texts` can then keep superseded versions. |

## Findings re-checked (2026-10-06)

Verification ran on the working HEAD `96365a2`, whose code is identical to `a4e543a` (it adds only `appendix-a-findings.md`).

- **U1: confirmed, with additions.** `MemberProfileView.tsx:188` renders `r.description || 'Roll call'`, and `deriveRollCallLabel` is local to `BillDetailView.tsx:166`.
  - The bill page's matcher uses a plain substring test for the tally, so `8-0` can match `38-0`. WS3-01 adds a digit boundary.
  - The member page also skips the read-time twin dedupe (TASKS.md ~537), which is folded into WS3-02.
  - **Found, not fixed:** `src/components/committees/MeetingsCalendar.tsx` (~258, ~459, ~529) calls every roll call on a day a "floor vote", including unmatched ones. Handed to WS6 (meetings UI).
- **U3: confirmed, cause refined.** The "House Floor Vote" text is `deriveRollCallLabel`'s fallback (`BillDetailView.tsx:187`). The "Failed" chip appears *only* on unmatched rows (`showOutcome={item.synthetic}`, ~770), as TASKS.md ~424 documented. Why HB500's rows show 59 absent is unverified [verify: WS3-03a Owner SELECT]. WS3-03a stops calling them "floor" votes and settles TASKS.md ~424 through an owner decision.
- **U5: confirmed, mechanism inferred from code.** The upsert key includes `time_and_location` (`ky-lrc-calendar-sync.ts:379`; `upsertLrcCalendarMeetings` at 302), and the diff (~482–536) cancels any unseen scheduled row. The `/meetings?q=` path reads meetings client-side (`MeetingsBrowse.tsx` ~163), so WS3-06a covers it. The same reads' `.limit(500)` can cut upcoming meetings (N5, WS6-06). `fetchKyCommitteeMeetingsBrowse` (`ky-committee-data.ts` ~212) has no callers (dead code, for WS5).
- **U6: confirmed.** Single-point resolution (`DistrictMapExplorer.tsx:333–352`). The guide page warns about split ZIPs (`find-your-kentucky-legislator/page.tsx:63–64`), and the tool does not. Bounding-box sampling is ruled out because a ZIP's bounding rectangle covers neighbouring districts.
- **A1: partly wrong as stated.**
  - The prompt omits the bill text and passes `Status` (`ky-content-generation.ts:105`).
  - `legiscan_texts` does **not** store bill text, only version metadata and links (migration 036 comment).
  - LegiScan datasets carry no text either (crash course ~13: only getBill, getRollCall and getPerson payloads). Grounding therefore needs a new, budgeted fetch (WS3-07/08).
  - `Status` is not a hash input, so WS3-04 can remove it now without regenerating anything.
- **A2: confirmed, with a nuance and a new related defect.** The v1 hash includes `title`, so a title amendment *does* trigger regeneration, but from a description that may describe the introduced version [verify: SB197's stored `description` vs. its enacted text]. New: two "current version" selectors disagree (`officialTextForAi` ~866–872 vs. `BillTextVersionsList` ~533–555). Fixed in WS3-04.
- **A3: confirmed.**
  - `ACCURACY_LLM_SAMPLE` defaults to 8 (`types.ts:244`).
  - Doc drift: `docs/accuracy-audit.md` says "Sundays 07:00 UTC", while the cron is `'0 13 * * 0'` (fixed in WS3-11a).
  - **New defect (N1):** `npm run audit:accuracy:dry` still runs the Anthropic pass, because the CLI passes `skipLlm: false` into a `??` default (`scripts/accuracy-audit.ts` ~177, `types.ts` ~233). The doc also names a nonexistent `--skip-llm` flag. Fixed in WS3-15.
- **A4: confirmed as a risk [I].** There is no measured error rate. WS3-04 hides the clause until WS3-09b can validate it against quoted text. The clause also leaked into the meta and JSON-LD fallbacks when `description` is empty. WS3-04 strips it there until WS6-07 removes those fallbacks.
- **A6: confirmed as reported, cause unverified.** The keyword lists contain bare `election`/`elections` under Voting Rights. Official LegiScan subjects are mapped to topics (`ky-topic-legiscan-mapping.ts`) but never used to assign tags, so WS3-12a adds a free fallback.
- **A7: confirmed.** Deferred.
- **A9: confirmed and preserved.** Offline generation, hash-gated regeneration (WS1-11 pins v1, WS3-09a adds v2), provenance columns (migration 034, extended by WS3-09a), the disclosure plus feedback link (kept and made specific by WS3-04 and WS3-09d), and editor notes (migration 038). No WS3 WP removes any of them.
- **SDK capability.** The installed `@anthropic-ai/sdk` 0.54.0 has no `output_config`. WS3-09b and WS3-11a use forced tool use, which 0.54 supports.
- **TASKS.md / decisions.md reconciliation:**
  - decisions.md 2026-06-26 "No full-text fetch": **superseded** only if the go/no-go passes. WS3-07 writes the decision note.
  - decisions.md 2026-07-06 "Editor-verified UI disclosure removed": **kept**. WS3-04 and WS3-11b follow it.
  - TASKS.md ~424 (inconsistent `Passed` tag): **superseded** by WS3-03a's owner decision.
  - TASKS.md ~537 (member RPC sees raw duplicate rows): **folded into** WS3-02.
  - TASKS.md ~570 (bill-text diff needs `getBillText`): **premise superseded** by WS3-07. The feature is Deferred.
  - TASKS.md ~151 (audience lens pages): **kept** as Deferred.
  - TASKS.md "Tier 1 Task 3 — per-member votes": **kept** for WS6. WS3-02 fixes labels only.
  - TASKS.md ~181 (daily "accuracy spot check" Routine): **kept** for WS5-07. WS3 no longer provides replacement evidence.
