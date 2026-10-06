# WS8 — Partner readiness & portability

## Purpose

KYvKY's likely future is distribution through someone larger, such as a Kentucky newsroom or CalMatters Digital Democracy, which is expanding to more states through newsroom partners with $9M from Lever for Change (C2, C7). Solo expansion is not the plan. No single KYvKY feature is unique (C1). What a partner would take on is the **neutral, Kentucky-only layer** that links each bill to every roll call, to *your* legislators and to committee agendas, plus evidence that it is run carefully on a small data budget (O2, O3).

The thing that decides a partnership is **early conversations**, not integration code. So this workstream is ordered this way:

1. **Talk first (W1–W2).** A short, honest capability brief exists by the end of October. The owner then asks Digital Democracy and one Kentucky newsroom a discovery question ("what would you ingest, and what would you need for 2027?") by 2026-11-20, while a 2027-session pilot is still possible (WS8-10, WS8-11).
2. **Fix what is wrong or misleading in public surfaces, and nothing more (W1–W2).** That covers `llms.txt` facts before the election, internal columns and raw roll-call text leaking from the public bill API, data rights stated once, and one citable methodology page (WS8-01a/b, WS8-02, WS8-05a/b, WS8-07a/b).
3. **Build integration features only when a partner asks in writing.** An OCD-ID crosswalk, bulk files and an embeddable card are specified but trigger-gated (WS8-03, WS8-12, WS8-15). An OpenAPI reference, a jurisdiction seam and a drift-tested data dictionary are in Deferred.
4. **Decide with numbers chosen in advance (W4).** WS8-08 is the **single owner** of the April thresholds and verdict rules, pre-registered in `docs/evaluation/README.md` by 2026-12-14. WS7 defines how each number is measured (WS7-08) and supplies the measured values by 2027-04-15 (WS7-13), without a verdict. WS5-16 defines maintain mode. WS8-16 applies WS8-08's rules to WS7-13's values, maps the result onto the five strategic options (C7) and records the decision. WS8-14a/b assemble the due-diligence pack.

It adds no schedule, vendor or env var, builds no second state, and leaves outreach and money to the owner.

**Program class:** 1 of this file's 17 WPs is Core (WS8-08). The other 16 are Backlog (manual §2 "Core vs Backlog"). The Owner-tier WPs (WS8-01a, WS8-11, WS8-16) are owner time, not agent PRs, and their dates are in [OWNER-DECISIONS.md](OWNER-DECISIONS.md). Suggested agent pickup order as Core capacity allows: WS8-05a and WS8-10 (W1), then WS8-02, WS8-01b, WS8-07a and WS8-07b (W2), then WS8-14a (W4). WS8-05b, WS8-09 and WS8-14b come last.

**Owned findings:** C1, C2, C3, C4, C6, C7. Coverage: C1 (WS8-07a/b, WS8-10), C2 (WS8-10, WS8-11, WS8-14a), C3 (WS8-07b independence statement, WS8-11 step 4), C4 (WS8-05a/b, WS8-07b), C6 (WS8-11 item 4; NLnet is WS7-03's), C7 (WS8-08, WS8-16).

**Estimated ongoing owner time for the whole workstream:** about 2–4 h/month of outreach from W1 to W4, plus about 1 h per partner conversation to refresh the brief. Agent-maintained code adds about 0.25 h/month (one contract test, one methods page). After W4, about 0.5 h/month unless a trigger-gated WP is built.

**Definition of done for the workstream** (each item objectively checkable):

1. **Data rights.** `docs/data-rights.md` records the owner's answers (or marked defaults) for LegiScan, Open States, LRC, Census and Mapbox, plus the license for KYvKY-authored content. `/licenses` states the same, and `src/lib/data-license.ts` is the only place the site takes those license strings from (WS8-01a/b).
2. **No leaks from the public bill API.** Either the unused public endpoints are deleted (WS8-02 option (a)), or `/api/bills` and `/api/bills/{id}` return only allowlisted bill columns, no roll call carries a `desc` or `description` key, and every 500 body is generic. A unit test enforces it (WS8-02).
3. **Citation.** By 2026-10-30, `llms.txt` states the correct topic count, has no semicolon, and a test checks every path it lists against `src/app/` (WS8-05a). Bill JSON-LD carries a session-qualified identifier and an `isBasedOn` link to the official LRC text when one is known (WS8-05b).
4. **Method in one place.** `/methodology` is live before 2026-12-15. It renders per-session coverage counts from the database and states the summary method, the vote-label method, known limits, a corrections link and an independence statement. `/about`, the footer and `llms.txt` link to it (WS8-07a/b).
5. **One decision framework.** `docs/evaluation/README.md` (60 lines or fewer) holds every numeric threshold, the verdict rules and their order, the definition of "partner conversation open", and the mapping of verdicts onto the five C7 options. Its first commit is on `main` by 2026-12-14 (and in any case before 2027-01-05). `docs/metrics.md` contains no threshold: `grep -ni "threshold" docs/metrics.md` matches only WS7-08's pointer sentence (WS8-08). `docs/evaluation/2027-04-decision.md` records the decision by 2027-04-30. It applies every WS8-08 rule to WS7-13's measured values, citing each value, and does not change a rule or a value (WS8-16).
6. **Discovery happened.** Digital Democracy was asked by 2026-11-13 and at least one Kentucky newsroom by 2026-11-20. At least three organizations were contacted by 2027-01-31. Category counts, without names, appear in the decision doc (WS8-11, WS8-16).
7. **Due diligence.** `docs/partner/` contains the capability brief, the demo path, an evidence index, a portability catalog, an asset-provenance table and a sunset path. `docs/data-dictionary.md` exists. Every number in them carries a date and a source. `docs/partner/` contains no env-var names and duplicates no vendor or env-var table from `docs/ops/` (WS8-10, WS8-14a/b).
8. **Triggers held.** WS8-03, WS8-12 and WS8-15 are built only if their written trigger fired. WS8-16 records, for each of them and for each WS8 Deferred row, whether it fired, in [DEFERRED.md](DEFERRED.md) (WS8 rows only).
9. **Restraint held.** `git diff main -- vercel.json .github/workflows` is empty across all WS8 PRs. The only security-header change WS8 may make is the `/embed/` exclusion in WS8-15, if that WP is built. No cron, workflow, Routine, vendor or env var is added. LegiScan, Open States and Anthropic spend is zero.

**Interfaces with other workstreams**

| Topic | Other workstream's finding / WP | How WS8 relates |
|---|---|---|
| Pre-registered thresholds and the mechanical verdict | T2, T7, C7 (WS7-08, WS7-13) | **Thresholds and verdict rules live only in `docs/evaluation/README.md` (WS8-08, due 2026-12-14).** WS7-08 writes only the measurement protocol in `docs/metrics.md` (merge by 2026-12-07) and proposes inputs in its PR body, which WS8-08 adopts. WS7-13 writes the measured values by 2027-04-15 with no verdict. WS8-16 applies the rules to them. |
| Citable traction figures | T1, T2, T9 (WS7-01, WS7-03, WS7-14) | WS8-10 copies reach and retention figures verbatim from `docs/metrics.md` "Citable figures". After WS7-14 merges (target 2026-11-10), WS8-10's refresh and WS8-11's materials cite its dated election-period rows there instead of raw T1/T2. NLnet (deadline 2026-11-03) is handled by WS7-03, not WS8. |
| Maintain mode | E13, D4 (WS5-16) | WS5-16 writes `docs/evaluation/maintain-mode.md` by 2027-04-24. WS8-08 keeps a one-sentence definition and links it. WS8-16 reads it. WS8 does not write a second maintain-mode document. |
| Maintenance hours | E13 (WS5-13) | WS5-13 writes `docs/evaluation/2027-04-maintenance.md`, the path WS8-08 names. |
| Vendors, what does not transfer, env vars | E14, D4, D6 (WS9-07, WS9-08) | WS9 owns `docs/ops/env-vars.md` (WS9-07) and `docs/ops/vendors.md`, including its §Does not transfer (WS9-08). WS9-09 (handover runbook) is retired, and the full account-transfer order is a WS9 Deferred row triggered only by WS8-16 choosing a mode that moves accounts. No WP creates `docs/ops/handover.md`, so WS8 never links it. WS8-14a links the two existing files from `docs/partner/README.md` and copies no rows. |
| CORS and `/api/intelligence` | S5 (WS2-07) | WS2-07 narrows CORS to `bills|search` GET and deletes `/api/intelligence` by default (W0). WS8-02 option (a) would delete the remaining unused public bill endpoints. WS8 never re-adds `intelligence` and never edits CORS. |
| Service-role client in public reads | S7, N4 (WS2-10) | `src/lib/ky-bill-detail-server.ts` `createServerClient()` (~21–26) prefers `SUPABASE_SERVICE_ROLE_KEY`. WS8-02's allowlist limits what can leave, whichever key is used. New WS8 reads use the anon `supabase` client from `src/app/lib/supabaseClient.ts`. Fencing the key stays with WS2-10. |
| `SECURITY.md`, personal data in the repo | S12 (WS2-05, WS2-08) | WS8-11 does not start until WS2-05 has merged. WS8-09 links WS2-08's `SECURITY.md` and writes none of its own. Outreach logs stay out of the repo (WS2-05 interface). |
| CSP and framing | S8 (WS2-12a/b, both **W4**) | WS8-15 is the only WP that allows framing, only on `/embed/*`, and only if built. It reuses WS2-12a's `src/lib/security-headers.ts` if merged, or creates that file with only the header-source constant for WS2-12a to extend. It never loosens the site-wide policy. |
| Roll-call labels | U1 (WS3-01, WS3-02) | WS8-02 and WS8-15 use `deriveRollCallLabel` from `src/lib/roll-call-label.ts` (WS3-01) and never emit raw LegiScan roll-call text. |
| Summary basis, suppression and corrections | A1, A2, A9 (WS3-04, WS3-09a/d, WS3-11a/b, WS3-14) | WS8-02 passes `ai_summary` through `summaryForDisplay()` (WS3-11b) when it exists. WS8-07a counts `ai_summary_basis = 'bill_text'` only if WS3-09a's column exists. WS8-07b imports `aiSummaryBasisLine()` and `UNMATCHED_ROLL_CALL_CAPTION` rather than re-typing copy, and links `/corrections`. WS3-11a's W4 sunset test is applied by WS9-14. WS8-08 links it as an input and does not turn it into a threshold. |
| Meta descriptions and JSON-LD `description` | A5, C4 (WS6-07) | WS6-07 removes `ai_summary` from the JSON-LD description. WS8-05b adds identifiers and source links after it and does not touch `description`. |
| Per-member votes | C1 (WS6-18) | WS6-18 adds `GET /api/votes/[id]/members` and `src/lib/roll-call-members.ts` in W2. If WS8-03 is ever triggered, it adds OCD IDs to that route instead of building a second member list. |
| Data budget and per-state cost | D1–D4 (WS4-01, WS4-16) | WS8-10 cites WS4-01's "Running Kentucky today (estimated)" block. WS8-14a links `docs/data-budget.md` and `docs/data-cost-per-state.md` and restates neither. |
| Schedule registry | E2 (WS4-11) | WS8-14a links `src/lib/schedule-registry.ts` and lists no schedules. |
| README, ADRs, frozen docs | E12 (WS5-03a, WS5-04a/b) | Decision notes go to `docs/adr/` (WS5-03a). WS8-11 waits for WS5-04a's README fact fixes. WS8 adds README links only through WS5-04b's structure. |
| Repo-invariant tests | E8 (WS1-05a/b) | WS8 no longer adds a migration-parsing drift test (the old WS8-06 is retired), so nothing in WS8 touches `src/lib/repo-invariants.test.ts`. |
| Parked tables | E1, E3 (WS5 Deferred, formerly WS5-06b) | WS8-14b's data dictionary tags the four parked local-government tables and `ky_meetings` as `parked`. That tag is one of WS5's revisit triggers for dropping them. |
| Release calendar | WS9-03 (election freeze 2026-10-31 → 11-05, P0 only) | WS8-05a and WS8-10's v0 merge by 2026-10-30, or after 11-05. |
| Deferred items and their W4 status | All workstreams' Deferred tables; W4 review WPs (WS4-16, WS5-13, WS5-16, WS6-20, WS7-13, WS9-14) | One consolidated Deferred register, [DEFERRED.md](DEFERRED.md) (columns: item, WS, trigger, owner WP, W4 status). Each workstream's W4 review WP fills **only its own rows**. WS8-16 fills the WS8 rows (WS8-03, WS8-12, WS8-15 and this file's Deferred table) and reads the register for the rest. It never resolves another workstream's row. |
| Data rights before outreach | C2, D1 (WS8-01a/b, WS8-11) | WS8-01a's answers are due 2026-11-06, before Digital Democracy is contacted (by 11-13). Until WS8-01b merges, WS8-11 offers only links and embeds of KYvKY pages and KYvKY-authored content, with no bulk, API or re-hosting commitment. |

**Out of scope:**

- A second state, a multi-state data model, or renaming `ky_` tables and `ky-` files.
- The Push API, a native app, oEmbed, API keys or accounts, paid API tiers, and SLAs.
- Reporter tip sheets (see Deferred).
- Integration code written for one named partner before that partner asks in writing.
- Hearing transcripts and donor data. These are Digital Democracy features, and Kentucky sources for them were not assessed.
- Partner-specific pitch wording, funding asks and outreach logs. These are owner content and stay out of this public repo.
- NLnet. WS7-03 corrects the funder figures before its 2026-11-03 deadline.

---

## WP summary

| ID | Title | Priority | Window | Tier | Size | Depends on | Class |
|---|---|---|---|---|---|---|---|
| WS8-01a | Confirm data rights and choose a license for KYvKY-authored content | P1 | W2 | Owner | S | none | Backlog |
| WS8-01b | Record data rights in one doc, one module and `/licenses` | P1 | W2 | Sonnet | S | WS8-01a (defaults apply after 2026-11-06) | Backlog |
| WS8-02 | Stop the public bill endpoints leaking internal columns and raw roll-call text | P1 | W2 | Sonnet | S | WS2-07, WS3-01; soft: WS3-11b | Backlog |
| WS8-03 | Add Open Civic Data identifiers to the member-vote route (trigger-gated) | P3 | W5 | Sonnet | S | trigger; WS6-18, WS8-02 | Backlog |
| WS8-05a | Correct `llms.txt` and test it against the code | P1 | W1 (merge by 2026-10-30) | Sonnet | S | none | Backlog |
| WS8-05b | Add session-qualified identifiers and official-source links to bill JSON-LD | P2 | W2 | Sonnet | S | WS6-07, WS8-05a | Backlog |
| WS8-07a | Add read-only coverage-stats SQL functions and a pure section model | P1 | W2 | Opus | S | none; soft: WS3-09a | Backlog |
| WS8-07b | Publish `/methodology` and point `/about`, the footer and `llms.txt` at it | P1 | W2 (merge by 2026-12-14) | Sonnet | S | WS8-07a, WS3-14; soft: WS8-01b, WS8-05a | Backlog |
| WS8-08 | Pre-register the April thresholds and verdict rules, and map verdicts to the five options | P1 | W2 (merge by 2026-12-14) | Sonnet | S | WS7-08 | Core |
| WS8-09 | Add CONTRIBUTING.md and a data-error issue form | P3 | W2 or later (only if W2 capacity remains; otherwise W4) | Sonnet | S | WS2-08, WS3-14 | Backlog |
| WS8-10 | Draft the partner capability brief and demo path | P1 | W1 (v0 merge by 2026-10-30, otherwise by 11-10) | Sonnet | S | WS3-02, WS7-01; soft: WS4-01, WS8-07b | Backlog |
| WS8-11 | Hold discovery conversations with Digital Democracy and a Kentucky newsroom | P1 | W1 → W3 | Owner | S | WS2-05, WS3-02, WS5-04a, WS8-10; soft: WS5-04b, WS8-01a, WS8-01b | Backlog |
| WS8-12 | Publish a one-off per-session file of the KYvKY layer (trigger-gated) | P3 | W5 | Sonnet | S | trigger; WS8-01b, WS8-02 | Backlog |
| WS8-14a | Assemble the evidence index, portability catalog and sunset path | P1 | W4 (merge by 2027-04-24) | Sonnet | M | soft: WS8-10, WS9-07, WS9-08, WS4-16, WS5-13, WS5-16 | Backlog |
| WS8-14b | Write a one-off data dictionary from an owner schema query | P2 | W4 | Sonnet | S | none | Backlog |
| WS8-15 | Ship an embeddable roll-call card for newsrooms (decision-gated) | P3 | W2 if (a), otherwise not built | Opus | M | WS2-11c, WS3-01, WS8-02 (option b), WS8-01b | Backlog |
| WS8-16 | Record the go / partner / maintain decision | P1 | W4 (by 2027-04-30) | Owner | S | WS7-13, WS8-08, WS5-13, WS5-16; soft: WS8-14a, WS8-14b | Backlog |

**Load by window.** W1: two small agent PRs (WS8-05a, WS8-10 v0) and the start of owner outreach. W2: one Core doc PR of 60 lines or fewer (WS8-08) and five small Backlog agent PRs (WS8-01b, WS8-02, WS8-05b, WS8-07a, WS8-07b) that run only as Core capacity allows. WS8-09 runs only if W2 capacity remains after those. WS8-05b may slip to W4 if it is not merged by 12-07, and never enters FZ. FZ and W3 take no WS8 code. W4 is docs plus the decision.

**Retired IDs** (kept out of use so cross-references stay unambiguous; the program-wide map is in [TRACKER.md](TRACKER.md)):
- **WS8-04** (OpenAPI route and `/data` page). Its license and fair-use text moved into WS8-01b and WS8-07b. OpenAPI generation is in Deferred.
- **WS8-06** (migration-parsed data dictionary with a drift test). Replaced by the one-off WS8-14b. The parser and drift test are in Deferred.
- **WS8-13** (jurisdiction seam). The portability catalog moved into WS8-14a as documentation only. The code seam is in Deferred.

**Trigger rule.** Only a **written** request from an organization in WS8-11's discovery, recorded by the owner as category `written interest` or `pilot`, can move WS8-03, WS8-12, WS8-15 or a Deferred row into a window. The owner names the request's date (not the organization) in the PR that starts the work.

---

## Work packages

### WS8-01a · Confirm data rights and choose a license for KYvKY-authored content

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Owner | S | none | C2, C4, C7, D1, D2, D3, O3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** four answers, due **2026-11-06**, so they exist before WS8-11 contacts Digital Democracy (by 11-13) and a newsroom (by 11-20). LegiScan's 2026-11-01 enforcement concerns attribution and the one-key rule, which decisions.md § 2026-09-29 (ACCEPTED) and WS4-04 already handle, so these questions are not W0 work. Reading the terms pages takes about an hour.
  1. **LegiScan re-serving.** decisions.md § 2026-09-29 records that LegiScan data is licensed CC BY 4.0, and that redistribution through the CORS-open `/api/bills` JSON and digest emails was an *attribution* problem, now fixed. It never records whether the Public API agreement adds any restriction **beyond** CC BY 4.0 on re-serving API output. Question: does it? Options: (a) no added restriction; (b) restrictions apply to bulk re-serving only; (c) unclear. **Recommended: (b) until the terms are read.** **Default if unanswered: (b),** which keeps per-bill API responses as they are today and blocks bulk member-level votes in WS8-12. [verify the current terms URL on legiscan.com]
  2. **Open States.** Confirm that bulk data is CC0 (D2) and that the API terms allow showing and re-serving legislator fields. **Default: treat as CC0, and credit Plural/Open States anyway.**
  3. **LRC.** Confirm that nothing on legislature.ky.gov restricts reuse of calendar and agenda text, which is a public record (D3). **Default: public record, credited to the LRC with a link.**
  4. **License for KYvKY-authored content** (AI summaries, derived vote labels, topic tags, status buckets). Options: (a) **CC BY 4.0. Recommended:** it matches LegiScan, lets any newsroom or partner reuse the content, and keeps credit flowing back, which matters because the project needs to own distribution (C5). (b) CC0: maximum reuse, no credit. (c) All rights reserved: blocks partners and AI citation (C4). **Default: (a).** Whether AI-generated text is copyrightable at all is unsettled [verify with WS2-13's reviewer if one is engaged]. The license statement still tells reusers what they may do.
- **Data-limit impact:** none. Reading terms pages costs no API queries.
- **Ongoing cost:** about 0. Re-check only when a vendor emails new terms.
- **Why:** A partner's first diligence question is "may we reuse this?" (C2, O3). Attribution was fixed on 2026-09-29, but re-serving terms beyond CC BY were never recorded, and KYvKY's own content has no stated license (C4).
- **Current state (verified 2026-10-06):**
  - `src/lib/legiscan-attribution.ts` holds LegiScan's CC BY 4.0 credit and `LEGISCAN_API_ATTRIBUTION`. That object is returned by `src/app/api/bills/route.ts` (~55), `bills/[id]/route.ts` (~19), `bills/browse/route.ts` (~48), `search/route.ts` (~52) and `intelligence/route.ts` (~118, deleted by WS2-07 by default).
  - `src/app/licenses/page.tsx` (~60–64) says Open States data is "subject to Plural Policy / Open States terms and your API agreement". That addresses the reader as if they hold a key, the same wording problem fixed for LegiScan on 2026-09-29. It does not mention CC0.
  - `LICENSE` is MIT and covers code only. No file states a license for KYvKY-authored content.
  - decisions.md § 2026-09-29 (line ~2544) records "the public CORS-open `/api/bills` JSON and digest emails redistribute LegiScan data with no credit" as an attribution defect. It records nothing on re-serving terms beyond CC BY.
- **Do:** (owner)
  1. Read LegiScan's Public API terms and data-license page once. Write the answer to question 1 as a quote plus URL plus date.
  2. Do the same for Open States/Plural (bulk data license and API terms) and for the LRC site's disclaimer or terms page, if one exists.
  3. Answer question 4.
  4. Paste all four answers into a new issue or a comment on the WS8-01b PR, so the agent can copy them verbatim.
- **Don't:** email LegiScan unless a term is truly ambiguous. If you do write, keep to one message from the account that owns the key (WS4-04). Don't register new keys or accounts.
- **Acceptance criteria:**
  - [ ] Four answers exist in writing by 2026-11-06, each with source URL and date, or "default applied".
- **Verify:** owner read-through. No commands.
- **Owner actions:** all of the above.
- **Rollback:** not applicable. A later answer replaces an earlier one through WS8-01b.

---

### WS8-01b · Record data rights in one doc, one module and `/licenses`

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | S | WS8-01a (defaults apply after 2026-11-06) | C2, C4, D2, D3, O3, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. This WP uses WS8-01a's answers, or its defaults when the answers are missing after 2026-11-06. Aim to merge by 2026-11-20, because WS8-11 makes no bulk, API or re-hosting commitment until it does.
- **Data-limit impact:** none.
- **Ongoing cost:** goes down. License strings live in one module instead of being re-typed per surface. It absorbs the license and fair-use text of the retired WS8-04, so there is no separate `/data` page to maintain.
- **Why:** Rights must be stated once and reused by every surface (`/licenses`, `llms.txt`, `/methodology`). The same single-source pattern already prevents LegiScan attribution drift (C2, O3).
- **Current state (verified 2026-10-06):** see WS8-01a. These importers of `src/lib/legiscan-attribution.ts` must not change: `src/app/components/SiteFooter.tsx` (~110–113), `src/lib/email/bill-digest-email.tsx` (~352) and `src/components/civic/LegiScanCredit.tsx` (the bill-page credit). `src/app/licenses/page.tsx` also imports it and is edited here. `src/app/llms.txt/route.ts` lines ~42–43 list Open States and the LRC with no license.
- **Do:**
  1. Create `src/lib/data-license.ts`. Export:
     - `KYVKY_CONTENT_LICENSE`: `{ name, url, appliesTo: string[] }`, from answer 4. With the default, use `CC BY 4.0` and `CC_BY_4_URL` imported from `legiscan-attribution.ts` (do not repeat the URL). `appliesTo` = `['plain-language summaries', 'vote labels', 'topic tags', 'status labels']`.
     - `OPEN_STATES_ATTRIBUTION`: `{ source: 'Open States (Plural)', source_url: 'https://openstates.org', license: 'CC0 1.0', license_url: 'https://creativecommons.org/publicdomain/zero/1.0/' }`, adjusted to answer 2.
     - `LRC_ATTRIBUTION`: `{ source: 'Kentucky Legislative Research Commission', source_url: 'https://legislature.ky.gov', license: 'Public record' }`, adjusted to answer 3.
  2. Add `src/lib/data-license.test.ts`: every URL starts with `https://`, and no string contains `—` or `;`.
  3. Create `docs/data-rights.md` (80 lines or fewer): a table with one row per source (LegiScan, Open States, LRC, U.S. Census boundaries, Mapbox, KYvKY content). Columns: what we use, license or terms, URL, date checked, what we may re-serve (page / per-bill API / bulk), and the attribution string. Add a short "Not re-served" list: Mapbox geocoding results, user data, and raw bill texts or history (LegiScan's datasets already serve those). Mark default-applied answers "default, not confirmed".
  4. `src/app/licenses/page.tsx`:
     - Replace the Open States line with: `Plural (Open States). Legislator names, districts and contact details. Open States bulk data is dedicated to the public domain (CC0).` Adjust to answer 2, and link CC0.
     - Add a list item: `Kentucky Legislative Research Commission (LRC). Committee calendars, agendas and bill text links. These are public records.`
     - Add a paragraph under the MIT line: `Plain-language summaries, vote labels, topic tags and status labels written by KYvKY are licensed under` + linked license name + `. Credit Know Your Vote Kentucky and link to the page you used.`
     - **Only if** `/api/bills` still exists on `main` (WS8-02 option (b)), add a heading `Using the public bill data` with exactly: `Bill data is also available as JSON at /api/bills and /api/search. Responses are cached and can be a few minutes old. Please cache what you fetch and keep requests to a few per second. There are no API keys. Access may be limited if traffic affects the site.`
     - The new copy has no em dash and no semicolon.
  5. In `src/app/llms.txt/route.ts` (or `src/lib/llms-txt.ts` if WS8-05a has merged), take the Open States and LRC license wording from `data-license.ts`, and add one line naming the KYvKY content license with a link to `/licenses`.
- **Don't:** change `legiscan-attribution.ts` wording, the footer, the digest email or `LegiScanCredit.tsx`; change API responses (WS8-02); claim a legal conclusion the owner did not give; create a `/data` page.
- **Acceptance criteria:**
  - [ ] `docs/data-rights.md` exists, with every row dated and default-applied rows marked.
  - [ ] `git grep -n "your API agreement" src` returns nothing.
  - [ ] `/licenses` names a license for KYvKY-authored content and states the Open States and LRC terms.
  - [ ] `git grep -n "data-license" src` shows imports in `src/app/licenses/page.tsx` and the `llms.txt` builder.
  - [ ] `npm test` passes with the new test file.
  - [ ] The built `/licenses` HTML contains no `—` and no `;` in visible text (voice guide § Conventions, "How to check this rule").
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. Then scan `.next/server/app/licenses.html` for `—` and `;` in text nodes after stripping tags.
- **Owner actions:**
  - [ ] Read `docs/data-rights.md` and confirm that it matches what you found.
- **Rollback:** `git revert`.

---

### WS8-02 · Stop the public bill endpoints leaking internal columns and raw roll-call text

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | S | WS2-07, WS3-01; soft: WS3-11b | C1, C2, U1, S5, N4, O2, O3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** keep or delete the three public bill endpoints that no first-party page calls (`/api/bills`, `/api/bills/{id}`, `/api/search`). **Due 2026-11-13.**
  - (a) **Delete them.** This is the most restrained option, and it also shrinks the CORS surface WS2-07 narrows. It breaks any unknown external consumer, and usage is unmeasured (T10: the Vercel connector returned 403, and PostHog does not see API calls). Re-add on a written partner request.
  - (b) **Keep them and harden them minimally:** an explicit column allowlist, generic 500 bodies, and roll calls labelled with `deriveRollCallLabel`. No `api_version`, no field descriptions, no attribution rework beyond the existing `attribution` field, no new fields.
  - **Recommended: (b),** unless the owner's 30-day Vercel log check (Owner actions) shows no requests to these paths except from the site itself, in which case (a).
  - **Default if unanswered by 2026-11-13: (b).**
- **Data-limit impact:** none external. Supabase reads go down under either option: `/api/bills` stops selecting every column and gains a CDN cache header.
- **Ongoing cost:** (a) goes down: three routes are removed. (b) about 0.1 h/month: a new public column needs one line in the allowlist, and a test enforces it.
- **Why:**
  - `/api/bills` returns `select('*')`, which includes `search_vector`, `ai_summary_input_hash`, `editor_notes` and `editorial_popular_names`, and changes whenever a migration does (O3).
  - Bill-detail roll calls expose LegiScan's raw description, which is the same mislabel the member page shows (U1). An API is how that error would spread to other sites.
  - 500 bodies return internal Supabase error text.
- **Current state (verified 2026-10-06):**
  - `src/app/api/bills/route.ts`: `.select('*')` (~28) with no `Cache-Control`. The 500 path returns Supabase's `error.message` (~39). The 400 path for `ValidationError` (~59) is fine. Rows are filtered with `billMatchesBrowseStatusFilter` (`src/lib/bill-display.ts` ~300), which reads `status` and `last_action`.
  - `src/app/api/bills/[id]/route.ts` returns `{ bill: data.bill, detail: data.detail, attribution }`. `data.bill` comes from `fetchKyBillDetailPageData`, which does `select('*')` (`src/lib/ky-bill-detail-server.ts` ~167–191). `detail.votes` rows come from `fetchDbVotes` (~55–110), which selects `roll_call_id, date, description, yea_count, nay_count, nv_count, absent_count, passed` and maps them to `{ roll_call_id, date, desc, yea, nay, nv, absent, passed }`. **The raw LegiScan text is under the key `desc`**, and there is no chamber field. After WS6-18, rows also carry `vote_id`.
  - `src/app/api/search/route.ts`: already maps results to `id, bill_number, session, title, status, chamber, type` and is cached 60 s.
  - `src/app/api/bills/browse/route.ts` is the UI's own endpoint (`BillsBrowse.tsx` ~251, ~296). Its 500 path returns `err.message` (~54).
  - The only callers of `/api/bills`, `/api/bills/{id}` and `/api/search` in `src/` are never-imported files (`SearchDiscoveryVerification.tsx`, E3). No first-party UI depends on their response shape. `/api/bills/[id]/follow` is a separate route used by the UI and is unaffected.
  - `src/lib/ky-bill-detail-server.ts` `createServerClient()` (~21–26) prefers `SUPABASE_SERVICE_ROLE_KEY` for this public read (N4, S7). Fencing the key stays with WS2-10. This WP's allowlist limits what can leave whichever key is used. Cite N4 under "Findings re-checked" in the PR.
  - Other `select('*')` uses under `src/app/api` are out of scope: `src/app/api/me/export/route.ts` (~12, ~17) is the signed-in user's own export, and `src/app/api/intelligence/route.ts` (~47, ~51) is deleted by WS2-07.
- **Do (option (a)):**
  1. Delete `src/app/api/bills/route.ts`, `src/app/api/bills/[id]/route.ts` and `src/app/api/search/route.ts`. Keep `src/app/api/bills/browse/route.ts` and `src/app/api/bills/[id]/follow/route.ts`, which the UI calls. (`find src/app/api/search -name route.ts` lists only `search/route.ts` today.)
  2. Change only the 500 body of `/api/bills/browse` to `{ error: 'Internal server error' }`, logging the detail server-side.
  3. Remove rows for the deleted routes from `README.md` (or from WS5-04b's README structure if it has merged).
  4. Note under "Found, not fixed" that WS2-07's `vercel.json` CORS source can drop `bills|search` once nothing public remains under it. Do not edit `vercel.json` (WS2-07 owns it).
- **Do (option (b)):**
  1. Create `src/lib/public-api-contract.ts` (no React, no Supabase import):
     - `PUBLIC_BILL_FIELDS`: a readonly array of column names: `id`, `legiscan_id`, `bill_number`, `session`, `chamber`, `title`, `description`, `status`, `introduced_date`, `last_action`, `last_action_date`, `committee_name`, `topics`, `official_short_titles`, `bill_text_url`, `ai_summary`, `ai_summary_generated_at`, `ai_summary_model`, `updated_at`. If WS3-09a has merged, also `ai_summary_basis`, `ai_summary_text_type`, `ai_summary_text_date`. Otherwise leave a `// WS3-09a:` comment naming them.
     - `PUBLIC_BILL_SELECT`: `PUBLIC_BILL_FIELDS` joined with `, `, plus the columns `summaryForDisplay()` needs (`ai_summary_input_hash`, `ai_summary_suppressed_hash`) if WS3-11b has merged. These are read but never output.
     - `toPublicBill(row)`: returns exactly the `PUBLIC_BILL_FIELDS` keys. `ai_summary` is `summaryForDisplay(row)` when WS3-11b has merged, otherwise `row.ai_summary`.
     - `toPublicRollCall(vote, history)`: takes a `detail.votes` row and the bill's history. Returns `{ vote_id?, roll_call_id, date, chamber, label, label_matched, yea, nay, nv, absent, passed }`. `label` and `label_matched` come from `deriveRollCallLabel(vote, history)` (`.label`, `.matched`). Read the vote text from `desc`. `chamber` maps `deriveRollCallLabel(...).chamber` `'H'` → `'house'`, `'S'` → `'senate'`, `null` → `null`. Keep `vote_id` only if the input row has it (WS6-18). There is no `desc` and no `description` key.
  2. `/api/bills`: select `PUBLIC_BILL_SELECT`, map rows through `toPublicBill` after the status filter, keep the response envelope and the existing `attribution` field, and add `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`. On a database error, return `{ error: 'Internal server error' }` with status 500 and log the detail server-side. Keep the 400 path.
  3. `/api/bills/[id]`: return `{ bill: toPublicBill(data.bill), detail: { ...data.detail, votes: data.detail.votes.map(v => toPublicRollCall(v, data.detail.history)) }, attribution }`, handling `detail === null`. Leave `subjects`, `history`, `texts`, `sponsors` and `committee` unchanged. Do not change `fetchKyBillDetailPageData` or `fetchDbVotes`. Map in the route.
  4. `/api/bills/browse`: change only the 500 body to the generic message.
  5. `/api/search`: no change (already slim).
  6. Add `src/lib/public-api-contract.test.ts`:
     - A synthetic bill row with extra columns (`search_vector`, `editor_notes`, `editorial_popular_names`, `ai_summary_input_hash`, `view_count`, `sponsors`): `Object.keys(toPublicBill(row))` deep-equals `PUBLIC_BILL_FIELDS`, and none of the extra columns appear.
     - A vote whose `desc` is `House: Veto Override RCS# 155` with a history entry `3rd reading, passed 91-0` on the same date and tally: `label` does not contain `Veto Override`, `label_matched` is true, and `chamber` is `'house'`.
     - `JSON.stringify` of a mapped `detail.votes` fixture contains neither `"desc"` nor `"description"`.
     - When `summaryForDisplay` exists: a row whose `ai_summary_suppressed_hash` equals its `ai_summary_input_hash` maps to `ai_summary: null`.
- **Don't:**
  - Add routes, API keys, `api_version`, field descriptions or a database-backed rate limiter (`src/lib/rate-limit.ts` writes a row per request).
  - Change `/api/bills/browse`'s success shape, `fetchKyBillDetailPageData`, `fetchDbVotes`, CORS (WS2-07), `/api/me/export` or UI components.
  - Rename existing response keys other than removing `desc`. Unknown consumers may depend on them.
- **Acceptance criteria:**
  - [ ] Option (a): `test ! -e src/app/api/bills/route.ts && test ! -e "src/app/api/bills/[id]/route.ts" && test ! -e src/app/api/search/route.ts`, and `npm run build` lists no such routes.
  - [ ] Option (b): `git grep -n "select('\*')" src/app/api/bills/route.ts src/app/api/search/route.ts` returns nothing. (`/api/me/export` is intentionally out of scope, and `/api/intelligence` belongs to WS2-07.)
  - [ ] Option (b): the contract test passes, and fails when a key is added to `toPublicBill` without being listed (show this once in the PR with a throwaway edit).
  - [ ] Every 500 body in the remaining public bill routes is the generic message.
  - [ ] tsc, lint, test and build pass.
- **Verify:**
  - Plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - Owner or preview with anon env, option (b): `curl -s "<preview>/api/bills?limit=1" | jq '.bills[0] | keys'` and `curl -s "<preview>/api/bills/<HB500 2026 slug>" | jq '.detail.votes[0]'`. Paste both.
- **Owner actions:**
  - [ ] Before 2026-11-13: in Vercel (Logs or Observability for the production project [verify which view your plan offers]), check the last 30 days of requests to `/api/bills`, `/api/bills/` and `/api/search` and note whether any came from outside the site. Record "external calls seen: yes/no" in the PR or issue. This informs the option.
  - [ ] Option (b): run the two `curl` checks on the preview.
- **Rollback:** `git revert`. No schema change.

---

### WS8-03 · Add Open Civic Data identifiers to the member-vote route (trigger-gated)

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P3 | W5 | Sonnet | S | trigger; WS6-18, WS8-02 | C1, C2, D2, E10, O3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Trigger.** Start only if a partner's written ingestion request from WS8-11 asks for OCD person or division IDs. **Default: not built.** Also blocked until WS6-18 has merged.
- **Data-limit impact:** none. No Open States or LegiScan calls. Person IDs are already stored, and division IDs are derived.
- **Ongoing cost:** about 0. One pure module with tests, and two extra selected columns on an existing route.
- **Why:** Open States and Digital Democracy key people and districts by OCD IDs (C2, D2), which lets a partner join KYvKY's roll-call layer to their own data without fuzzy name matching (E10). WS6-18 already resolves each roll call's LegiScan `people_id` values to `ky_legislators` rows. This WP adds the OCD IDs to that same output. It does not build a second member list.
- **Current state (verified 2026-10-06; re-check at pickup):**
  - `ky_legislators.openstates_id` (migration 001, unique) is written from Open States `leg.id` (`src/lib/ky-sync-pipeline.ts` ~1398). Format `ocd-person/<uuid>` is [verify with the Owner SELECT].
  - `src/lib/ky-member-utils.ts` `dedupeKyLegislators` (~527–565) documents that a LegiScan-seeded row (keyed by `legiscan_id`) and an Open States row (keyed by `openstates_id`) can coexist for one person. A join on `legiscan_id` can therefore land on the row without an OCD ID.
  - `ky_votes.roll_call` elements are `{ legislator_id: String(people_id), vote }` (`ky-sync-pipeline.ts` ~1838).
  - WS6-18 (planned W2) adds `src/lib/roll-call-members.ts` with `fetchLegislatorsByPeopleIds` (one `ky_legislators` query including inactive members) and `GET /api/votes/[id]/members`.
  - `src/lib/ky-openstates-client.ts` ~252 and ~270 hard-code `'ocd-jurisdiction/country:us/state:ky/government'`. `src/lib/ky-district-pages.ts` ~17–18 export `KY_HOUSE_DISTRICT_COUNT = 100` and `KY_SENATE_DISTRICT_COUNT = 38`.
  - `ky_bills.openstates_id` exists (migration 001) with no writer in `src/` or `scripts/` [verify with the Owner SELECT]. Bill-level OCD IDs stay Deferred.
- **Do:**
  1. Create `src/lib/ocd-ids.ts`:
     - `kyDistrictOcdId(chamber: 'house' | 'senate', district: string | number): string | null` returns `ocd-division/country:us/state:ky/sldl:<n>` for House 1–`KY_HOUSE_DISTRICT_COUNT` and `.../sldu:<n>` for Senate 1–`KY_SENATE_DISTRICT_COUNT` (import both constants), and null otherwise. Confirm the `sldl`/`sldu` form against the `opencivicdata/ocd-division-ids` repository [verify] and cite the file in a comment.
     - `isOcdPersonId(s)` tests `/^ocd-person\/[0-9a-f-]{36}$/`.
  2. Add `src/lib/ocd-ids.test.ts`: House 1 and 100, Senate 38, Senate 39 → null, `'07'` → `sldl:7`, the person-ID regex accepts and rejects.
  3. In WS6-18's `fetchLegislatorsByPeopleIds`, add `openstates_id` to the select. In the route output, add `ocd_person_id` (set only when `isOcdPersonId(openstates_id)` passes, otherwise null) and `district_ocd_id` per member. Never guess an ID, and never match by name.
  4. Sponsor IDs only if the triggering request names sponsors. First inspect the sponsor objects written by `src/lib/ky-sync-pipeline.ts` and `src/lib/ky-legiscan-dataset-import.ts` [verify they carry `people_id`; `src/lib/ky-bill-sponsors.ts` `resolvedSponsorName` reads `s.people_id`, which suggests they do]. Where `people_id` is absent, emit `ocd_person_id: null`. Never match sponsors by name.
  5. Extend WS6-18's route test: one matched member with an OCD ID, one matched member without one, one unmatched member. Both of the last two give `ocd_person_id: null`.
- **Don't:** call Open States; write to `ky_bills.openstates_id`; touch `ky-openstates-client.ts`; add a legislators endpoint (Open States publishes the roster under CC0); change name matching or `dedupeKyLegislators`; add a session-identifier map.
- **Acceptance criteria:**
  - [ ] `ocd-ids.ts` has at least 7 passing tests.
  - [ ] The member route returns `ocd_person_id` and `district_ocd_id` per member, and the route test covers the null cases.
  - [ ] The PR reports both Owner SELECT results below. If join coverage is below 95%, the PR ships anyway with nulls, and files "Found, not fixed" for the pipeline owner (E10, WS4/WS5). WS8 does not change matching.
  - [ ] tsc, lint, test and build pass.
- **Verify:**
  - Plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - Preview with anon env (owner): `curl -s "<preview>/api/votes/<a 2026 vote_id>/members" | jq '.groups.yea[0:3]'`.
- **Owner actions** (SELECT-only, production):
  - [ ] Roster coverage: `select count(*) filter (where openstates_id like 'ocd-person/%') as ocd, count(*) as total from ky_legislators where active;`
  - [ ] Join coverage, which is what a partner actually gets: `with ids as (select distinct e->>'legislator_id' as pid from ky_votes v cross join lateral jsonb_array_elements(v.roll_call) e join ky_bills b on b.id = v.bill_id where b.session = '2026 Regular Session') select count(*) as distinct_people, count(*) filter (where exists (select 1 from ky_legislators l where l.legiscan_id::text = ids.pid and l.openstates_id like 'ocd-person/%')) as with_ocd from ids;` (`legiscan_id` is an integer and `active` a boolean per `src/types/kentucky.ts` ~15, ~65; the cast compares it with the JSON string).
  - [ ] `select count(*) from ky_bills where openstates_id is not null;`
- **Rollback:** `git revert`.

---

### WS8-05a · Correct `llms.txt` and test it against the code

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 (merge by 2026-10-30) | Sonnet | S | none | C4, C8, U12, U15, O3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** goes down. A test now catches the drift that a person used to find by reading.
- **Why:** One 2026 study found 29% of chatbot voting answers were inaccurate, and the opening is to be the source AI tools cite (C4). The 2026-11-03 election makes "how did my rep vote" the highest-intent query (C8). `llms.txt` exists (U15) but states the wrong topic count, describes an "active session" between sessions (U12), and still has a semicolon although the voice guide says it was swept on 2026-08-23. It must be right **before** the election freeze (WS9-03, 2026-10-31).
- **Current state (verified 2026-10-06):** `src/app/llms.txt/route.ts` (66 lines) builds the body inline.
  - ~28: "Browse all bills in the active session", which is wrong between sessions (U12).
  - ~29: "Bills grouped into 22 subject areas", but `KY_TOPICS` in `src/lib/ky-topic-classifier.ts` (~10–47) has 24 entries.
  - ~23: "…from official state systems via LegiScan and Open States;" contains a semicolon (voice guide § Conventions).
  - ~47–50: the citation guidance already says `"HB 1 (2026 Regular Session)"` with a link to the bill page. Only a pointer to the official LRC page is missing.
  - ~52–57 "Crawl policy" tells crawlers to avoid `/api`, which matches `src/app/robots.ts` (~14 `disallow: ['/api/', …]`). Keep both. The JSON API is for direct use, not crawling.
  - Paths in the body: `${origin}` links to `/bills`, `/bills/topics`, `/members`, `/districts`, `/committees`, `/meetings`, `/search`, `/glossary`, `/guides`, `/about`, `/robots.txt`, `/sitemap.xml`, plus bare paths `/bills/house`, `/bills/senate`, `/bills/{id}`, `/bills/topics/{topic}`, `/members/{slug}`, `/members/map`, `/districts/{chamber}-{number}`, `/committees/{slug}`. `/bills/house` and `/bills/senate` live under the route group `src/app/bills/(browse)/`. `/robots.txt` and `/sitemap.xml` are metadata routes (`src/app/robots.ts`, `src/app/sitemap.ts`).
- **Do:**
  1. Move the body into `src/lib/llms-txt.ts` as `buildLlmsTxt(origin: string): string`. The route calls it and keeps its headers and `revalidate`.
  2. Body changes:
     - Topic line: `Bills grouped into ${KY_TOPICS.length} subject areas`, imported, not typed.
     - Bills line: `Browse bills by session. Between sessions the list shows the most recent session. House and Senate filters at /bills/house and /bills/senate.` Keep the rest of that line.
     - Line ~23: rewrite as two sentences with no semicolon, for example `…assignments come from official state systems via LegiScan and Open States. Meeting schedules come from the Kentucky Legislative Research Commission (LRC).`
     - Add `## How content is made` with three sentences: `Plain-language summaries are written by AI and labelled on each bill page with what they were written from. Vote labels come from the official bill history for that day. Topic tags are automated and can miss or mislabel some bills.` Link `/about` for details (WS8-07b later points it at `/methodology`).
     - If `src/app/corrections/page.tsx` exists on `main` (WS3-14), add `## Corrections` with one line linking `${origin}/corrections`. Otherwise omit the section.
     - Citation: keep the existing sentence and append `Where possible, also link the official bill page on legislature.ky.gov.`
     - Keep `Avoid /api` in the crawl policy.
     - Remove the `…` ellipsis in the Topics line by ending the example list with `and more`.
  3. Add `src/lib/llms-txt.test.ts` (pure, no network):
     - Collect every `${origin}/<path>` link and every bare path in the "Primary sections" and "Crawl policy" indexable list. Resolve each against `src/app/` with these rules: a `(group)` directory is transparent; `robots.txt` maps to `src/app/robots.ts` and `sitemap.xml` to `src/app/sitemap.ts`; a `{name}` or `{a}-{b}` segment matches any `[param]` directory; the target directory must contain `page.tsx` or `route.ts`. Fail with the unresolved path.
     - The text contains `${KY_TOPICS.length} subject areas`.
     - The text contains no `—` and no `;`.
- **Don't:** add `llms-full.txt`, new pages, OpenAPI links or AI-written text; change titles, canonicals or JSON-LD (WS8-05b); change `robots.ts`.
- **Acceptance criteria:**
  - [ ] `llms-txt.test.ts` passes, and fails if a path in the body is renamed to one that does not exist (show this once in the PR with a throwaway edit).
  - [ ] `curl -s localhost:3000/llms.txt | grep -c "24 subject areas"` prints 1 (or the current `KY_TOPICS.length`).
  - [ ] `curl -s localhost:3000/llms.txt | grep -c ";"` prints 0.
  - [ ] Merged by 2026-10-30, or after 2026-11-05 if it misses the election freeze.
  - [ ] tsc, lint, test and build pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, then `npm run start` and the two `curl` checks. `llms.txt` needs no database.
- **Owner actions:** none.
- **Rollback:** `git revert`.

---

### WS8-05b · Add session-qualified identifiers and official-source links to bill JSON-LD

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS6-07, WS8-05a | C4, U15, O3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0.
- **Why:** A citation of "HB 1" without a session is ambiguous across 25 sessions. Bill JSON-LD has no session-qualified identifier and no link to the official text (C4, U15). OCD person identifiers are left out, because WS8-03 is trigger-gated.
- **Current state (verified 2026-10-06):** `src/lib/structured-data.ts`:
  - `buildBillJsonLd` (~70–104) sets `legislationIdentifier` to the bare number (`HB1`), `legislationJurisdiction` and `legislationLegalForm`, with no `identifier`, `isBasedOn` or `sameAs`. It has no `legislationPassedBy`.
  - `buildLegislatorJsonLd` (~107–141) has `sameAs` only for Ballotpedia.
  - `buildSiteJsonLd` (~21–36) has `sameAs: []`.
  - WS6-07 removes `ai_summary` from the bill `description`. Build on its version of the file.
- **Do:**
  1. `buildBillJsonLd`: keep `legislationIdentifier` as is. Add `identifier: [{ '@type': 'PropertyValue', propertyID: 'kyvky-session-bill', value: '<bill_number> (<session>)' }]`, plus `{ '@type': 'PropertyValue', propertyID: 'legiscan_bill_id', value: <legiscan_id> }` when `legiscan_id` is not null. Add `isBasedOn: bill.bill_text_url` only when that URL's host is `legislature.ky.gov` or `apps.legislature.ky.gov`.
  2. Do **not** add a `license` property to the bill node. It carries LegiScan-derived fields under LegiScan's CC BY, and `docs/data-rights.md` (WS8-01b) is where licenses are stated.
  3. `buildLegislatorJsonLd`: push `lrc_profile_url` (`KYLegislator`, `src/types/kentucky.ts` ~44) into `sameAs` when it is not null. Add no `identifier`.
  4. In `src/lib/llms-txt.ts`, point the "How content is made" link at `/methodology` if `src/app/methodology/page.tsx` exists on `main`.
  5. Extend or create `src/lib/structured-data.test.ts`: the bill identifier includes the session; `isBasedOn` is absent for a non-LRC URL and present for an LRC URL; `description` is unchanged from WS6-07's behavior for a fixture.
- **Don't:** change `description`, titles or canonicals; add `sameAs` links to social accounts; add OCD identifiers; touch `buildDistrictJsonLd`.
- **Acceptance criteria:**
  - [ ] The structured-data tests pass.
  - [ ] Merged by 2026-12-07, otherwise moved to W4. Not merged in FZ.
  - [ ] tsc, lint, test and build pass.
- **Verify:**
  - Plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - Owner, on the preview: run one bill page through Google's Rich Results Test and schema.org's validator. Paste "0 errors".
- **Owner actions:**
  - [ ] Run the two validators on the preview.
- **Rollback:** `git revert`.

---

### WS8-07a · Add read-only coverage-stats SQL functions and a pure section model

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | S | none; soft: WS3-09a | C1, C2, C4, A7, T9, O2, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** where method details live. (a) A new `/methodology` page holds coverage and method, and `/about` links to it. **Recommended:** it gives partners and AI tools one stable, citable URL (C4) for **coverage and method numbers**. Traffic and KPI figures stay in `docs/metrics.md` (WS7-01). (b) Expand `/about`. **Default if unanswered by 2026-11-20: (a).** This WP is needed under either option.
- **Data-limit impact:** none external. One read-only SQL function, called at most once a day by ISR. It scans `ky_bills` (about 22.5k rows), `ky_votes` and `ky_committee_agenda_items`.
- **Ongoing cost:** about 0. It replaces hand-updated coverage figures in owner documents (T9).
- **Why:** Partner diligence (C2) and AI citation (C4) need coverage counts that come from the database, not from prose, because funder-facing numbers already disagree (T9). Showing the bill ↔ roll call ↔ agenda link counts also demonstrates the niche (C1).
- **Current state (verified 2026-10-06):**
  - Tables: `ky_bills` (`session`, `ai_summary`, plus `ai_summary_basis` after WS3-09a), `ky_votes` (`bill_id`, `roll_call` JSONB, migration 001 ~78), `ky_committee_meetings` (`meeting_date`, `status` in `('scheduled','cancelled')`, migration 024 ~34–37), `ky_committee_agenda_items` (`meeting_id`, `ky_bill_id`, migration 024 ~55–62).
  - Anon requests run under a 3 s statement timeout (migration 045 header).
  - The migrations directory ends at `056_*`, and two files are numbered `045`. WS2-06b also takes the next unused number. WS4 adds no migration.
  - `npm test` runs `node --import tsx --test "src/**/*.test.ts"`. Importing a module that imports `server-only` throws under plain Node, so tested modules must not import it.
- **Do:**
  1. Migration `supabase/migrations/NNN_ky_public_coverage_stats.sql` (next unused number at pickup):
     - `public.ky_public_coverage_stats()` `RETURNS TABLE(session text, bills bigint, bills_with_summary bigint, roll_calls bigint, roll_calls_with_member_votes bigint, agenda_items_linked bigint)`, `LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public`. One CTE per table, grouped by `ky_bills.session`. `roll_calls_with_member_votes` counts `jsonb_array_length(roll_call) > 0`. Agenda items join on `ky_bill_id`.
     - **If WS3-09a's migration is on `main` at pickup**, add `summaries_from_text bigint` = `count(*) filter (where ai_summary_basis = 'bill_text')`. If not, omit it. Adding it later needs `DROP FUNCTION` then `CREATE`, because Postgres cannot change a function's return type with `CREATE OR REPLACE`. Say so in the migration comment.
     - `public.ky_public_meeting_stats()` `RETURNS TABLE(year int, meetings bigint, cancelled bigint, with_agenda bigint)` from `ky_committee_meetings` left-joined to agenda items.
     - `GRANT EXECUTE … TO anon, authenticated` on both. Add a `COMMENT ON FUNCTION` for each.
  2. Create `src/lib/coverage-stats-model.ts` (pure: no `server-only`, no Supabase import):
     - `mapCoverageRows(raw: unknown[]): CoverageRow[]` converts bigint strings to numbers and sorts newest session first.
     - `coverageSectionModel(rows: CoverageRow[] | null): { kind: 'table'; rows: CoverageRow[]; hasTextBasis: boolean } | { kind: 'fallback'; text: 'Coverage figures are unavailable right now.' }`. `hasTextBasis` is true only when the rows carry `summaries_from_text`.
  3. Create `src/lib/coverage-stats-server.ts`: calls both RPCs with the anon `supabase` client from `src/app/lib/supabaseClient.ts`, returns `mapCoverageRows(data)` or `null` on error or missing env, and logs server-side. Tests never import this file.
  4. Add `src/lib/coverage-stats-model.test.ts`: bigint strings map to numbers; ordering; `null` gives the fallback; rows without `summaries_from_text` give `hasTextBasis: false`.
- **Don't:** add a cron, a materialized view or a stats table; use the service-role key; select personal data; build the page (WS8-07b).
- **Acceptance criteria:**
  - [ ] The migration is idempotent (`CREATE OR REPLACE`), `SECURITY INVOKER`, has `search_path` pinned, and grants only EXECUTE.
  - [ ] `git grep -n "server-only\|supabase" src/lib/coverage-stats-model.ts` returns nothing.
  - [ ] The model tests pass.
  - [ ] tsc, lint, test and build pass.
- **Verify:**
  - Plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - Owner with production read: `explain analyze select * from ky_public_coverage_stats();` runs in under 1,000 ms. Paste the timing.
- **Owner actions:**
  - [ ] Apply the migration before WS8-07b merges: `npm run db:apply-sql -- supabase/migrations/NNN_ky_public_coverage_stats.sql`.
  - [ ] Run the `explain analyze` and paste it. If it is over 1,000 ms, do not merge WS8-07b; comment, and the agent adds an index or narrows the query.
- **Rollback:** `git revert`. Down SQL: `drop function if exists public.ky_public_coverage_stats(); drop function if exists public.ky_public_meeting_stats();`.

---

### WS8-07b · Publish `/methodology` and point `/about`, the footer and `llms.txt` at it

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 (merge by 2026-12-14) | Sonnet | S | WS8-07a, WS3-14; soft: WS8-01b, WS8-05a | C1, C3, C4, C2, A7, A9, T9, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none beyond WS8-07a's. Under option (b), put the same sections on `/about` instead of a new page.
- **Data-limit impact:** none beyond WS8-07a's daily RPC call.
- **Ongoing cost:** about 0.1 h/month. Method text changes only when WS3 changes the method, and it imports WS3's copy rather than re-typing it.
- **Why:** One page should state what is covered, how summaries and vote labels are made, what is missing, how errors are corrected, and that KYvKY takes no positions (C2, C4). Neutrality is the open lane, because Kentucky advocacy trackers take positions (C3). It must be live before the session and before partner conversations deepen.
- **Current state (verified 2026-10-06):**
  - `src/app/about/page.tsx` (146 lines): "How bill summaries are written" (~75–88, revised by WS3-04 and WS3-09d), and "Data sources" (~90–123), a `List` of four `ListItemText` items whose `primary` and `secondary` are plain strings, followed by a paragraph with a link.
  - `src/lib/ky-legiscan-coverage.ts` `legiscanHasNoRollCallsForKySession` (~21–26) returns true for `year < 2018 || (year === 2018 && kind === 'special')`, so there are no LegiScan roll calls before the **2018 Regular Session**.
  - WS3 exports to import: `aiSummaryBasisLine()` (`src/lib/ai-summary-basis.ts`, WS3-04/WS3-09d), `UNMATCHED_ROLL_CALL_CAPTION` (`src/lib/roll-call-label.ts`, WS3-01). `/corrections` comes from WS3-14 (W1).
  - `KY_DEFAULT_ANTHROPIC_MODEL` is in `src/lib/anthropic-model.ts`.
  - No `/methodology` route exists.
- **Do:**
  1. Extract the four `/about` data-source items into `src/lib/about-data-sources.ts` as `export const ABOUT_DATA_SOURCES: ReadonlyArray<{ primary: string; secondary: string }>`. The items are plain strings, so a `.ts` file needs no JSX. `/about` maps over it and renders the same markup as today.
  2. Create `src/app/methodology/page.tsx` with `revalidate = 86400`, `buildPageMetadata` from `src/lib/seo.ts`, and H1 `Methodology`. Sections:
     - `Coverage`: from `coverageSectionModel(await fetchCoverage())`. A table of sessions with bills, AI summaries, (only when `hasTextBasis`) summaries written from bill text, roll calls, roll calls with member votes, and agenda items linked to bills. Caption: `Counts as of <render date>.` In fallback mode, show the fallback text and render the rest of the page.
     - `Sources`: render `ABOUT_DATA_SOURCES`. Under it, if `src/lib/data-license.ts` exists (WS8-01b), one line per license from it and a link to `/licenses`.
     - `Plain-language summaries`: `Summaries are written by AI from the bill's official fields under fixed rules, and each bill page says what its summary was written from.` Then show the description-basis example line from `aiSummaryBasisLine({ kind: 'description' })`, and the bill-text example if WS3-09d has merged. Name the model family from `KY_DEFAULT_ANTHROPIC_MODEL` as a display name only. Link the feedback route that `AiAttribution.tsx` uses.
     - `Vote labels`: `Each roll call is labelled from the official bill history for that day. When no history entry matches, the page says so instead of guessing.` Then quote `UNMATCHED_ROLL_CALL_CAPTION` as the example.
     - `Corrections`: one sentence linking `/corrections`.
     - `Known limits`, as a list:
       - `LegiScan has no roll-call records for Kentucky sessions before the 2018 Regular Session.`
       - `Summaries cover bills from the 2024 session forward.`
       - `A ZIP code can cover more than one district. A street address gives an exact answer.`
       - `Committee schedules can change on short notice. The LRC calendar is the official record.`
     - `Independence`: `KYvKY does not take positions on bills, legislators or candidates. It is not affiliated with any party, campaign, advocacy group or government office.`
     - All copy follows the voice guide, with no em dash and no semicolon.
  3. `/about`: do **not** delete or rewrite WS3-04/WS3-09d copy. Add one sentence at the end of "How bill summaries are written": `Full details, including coverage counts, are on the methodology page.` linking `/methodology`.
  4. Add a footer link `Methodology` in `src/app/components/SiteFooter.tsx` next to the legal links, and `/methodology` to `src/app/sitemap.ts` (`weekly`, `0.5`).
  5. In `src/lib/llms-txt.ts` (WS8-05a), point the "How content is made" link at `/methodology` and add `[Methodology](${origin}/methodology)` to Primary sections. WS8-05a's link test then covers it.
- **Don't:** show traffic or user counts; restate coverage numbers in prose (the table is the only place they appear); write about other products; change `LegiScanCredit.tsx` or the footer's attribution line; add a `/data` page.
- **Acceptance criteria:**
  - [ ] `/methodology` builds without database env and shows the fallback line, and with anon env shows the table.
  - [ ] `git grep -n "about-data-sources" src/app` shows exactly 2 hits (`/about` and `/methodology`).
  - [ ] `git grep -n "does not say which motion" src` shows only the definition in `src/lib/roll-call-label.ts` (the page imports it).
  - [ ] There is no `—` or `;` in the visible text of the built page.
  - [ ] Merged by 2026-12-14.
  - [ ] tsc, lint, test and build pass.
- **Verify:**
  - Plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, then strip tags from `.next/server/app/methodology.html` and search for `—` and `;`.
  - Owner or preview with anon env: open `/methodology` and compare three numbers with a direct SELECT.
- **Owner actions:**
  - [ ] Confirm WS8-07a's migration is applied before merge.
  - [ ] After deploy, compare three numbers on the page with a direct SELECT and paste them.
- **Rollback:** `git revert`. The SQL functions stay harmless if unused.

---

### WS8-08 · Pre-register the April thresholds and verdict rules, and map verdicts to the five options

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 (merge by 2026-12-14) | Sonnet | S | WS7-08 | C7, C2, C5, T1, T2, E13, O1, O3, O4 |

- **Program class:** Core
- **Owner decision:** approve the proposed numbers in step 1 (thresholds, rule order, the email floor and the "partner conversation open" definition).
  - Options: (a) accept them as written; (b) edit any number in review; (c) drop a rule.
  - **Recommended: (a) or (b).** The numbers are anchored on the audit baselines (T1, T2, E13), and the point is that they are fixed before the session, not that they are perfect. Dropping a rule (c) weakens the pre-registration that O4 relies on.
  - **Default if unanswered by 2026-12-14:** the proposed numbers, each marked `accepted by default 2026-12-14`. After 2027-01-05 any change needs an ADR and an entry in the file's own "Amendments" subsection (step 1). The file is never silently edited.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0. One page of 60 lines or fewer, read once in April. It is the only rulebook: `docs/metrics.md` holds no thresholds.
- **Why:** The April decision (C7) is credible only if its thresholds were written down before the session (O4). This WP is the **single owner** of every threshold and verdict rule. It adopts WS7-08's PR-body proposals and leaves measurement to WS7, so April produces one verdict from numbers chosen in advance (O1, O3).
- **Current state (verified 2026-10-06):**
  - No `docs/evaluation/` and no `docs/metrics.md` exist yet (WS7-01 creates `docs/metrics.md`).
  - WS7-08 (`07-retention-and-measurement.md` ~548–590) writes **only** the section `2027 session measurement protocol (pre-registered)` in `docs/metrics.md` (merge by 2026-12-07). That section maps each metric to a KPI ID and contains the sentence `Thresholds and verdict rules live only in docs/evaluation/README.md (WS8-08).` WS7-08's Don't forbids threshold numbers in `docs/metrics.md`. Its acceptance check is that `grep -ni "threshold" docs/metrics.md` matches only that pointer sentence.
  - WS7-08 step 3 puts **proposed inputs for WS8-08 in its PR body**: week-1 return (KPI-3) is the only gating return metric, and 30-day return (KPI-4) is reported but not gating. It also proposes an email consolidation rule with a floor of 20 weekly-email subscribers. If the retention bet was deferred at the 2026-12-07 cut line, email metrics are "not measured (deferred)", not "not met".
  - KPI IDs come from WS7-01 (`07` ~151–159): KPI-1 KY human visitors (weekly), KPI-3 week-1 return, KPI-5 lookup rate, KPI-6 accounts and subscribers, KPI-7 email, KPI-9 weekly-email opt-in source.
  - WS7-13 (`07` ~1045–1070) writes `docs/metrics.md` "2027 session measured values" by **2027-04-15**. Its Don't bars applying thresholds or stating a verdict.
  - WS5-13 writes `docs/evaluation/2027-04-maintenance.md` (owner hours, by 04-17). WS5-16 writes `docs/evaluation/maintain-mode.md` by 04-24. WS4-16 writes `docs/data-cost-per-state.md`. WS3-11a's W4 sunset test is applied by WS9-14.
  - Baselines (appendix A): weekly KY human visitors in September 83–104 (T1); week-1 return 1.4%, best cohort 3.4% (T2); 4 accounts with the digest on and about 1 digest recipient a month (T3); maintenance 25–45 h/month between sessions [I] (E13).
- **Do:**
  1. Create `docs/evaluation/README.md` (60 lines or fewer). Each number carries `PROPOSED` until the owner accepts it, then `accepted <date>` or `accepted by default 2026-12-14`. Sections:
     - **The five options** (C7), one line each: (1) "My Legislator for Kentucky" with a newsroom; (2) Digital Democracy Kentucky partner; (3) data and tip-sheet provider; (4) election-cycle tool; (5) maintain mode.
     - **Inputs.** One line each, naming the source: KPI-1, KPI-3, KPI-6 and KPI-7 from `docs/metrics.md` "2027 session measured values" (WS7-13); owner hours/month from `docs/evaluation/2027-04-maintenance.md` (WS5-13); partner category counts on 2027-04-15 from WS8-11. Context only, not gating: KPI-4, KPI-5, KPI-9, cash cost and data headroom (WS4-16), corrections and WS3-11a's audit result (WS3-14, WS9-14).
     - **Partner conversation open (definition):** `On the date checked, the owner's private outreach log (WS8-11) has at least one organization in category "conversation", "written interest" or "pilot" with contact in the previous 60 days. Reported as counts only.`
     - **Verdict rules, applied in this order; the first that holds is the verdict:**
       - **R1 Partner:** WS8-11's 2027-04-15 counts show at least 1 organization in `written interest` or `pilot`.
       - **R2 Loop works:** all four hold. (a) KPI-3 week-1 return over the session cohorts is at least 5%. That is about 3.5 times the 1.4% baseline and above the best interim cohort (3.4%). (b) KPI-1 in-session weekly median is at least 150, about 1.5 times September's 83–104. (c) KPI-6 weekly-email subscribers on 2027-03-30 number at least 20. (d) Owner hours (WS5-13, in-session monthly average) are 45 or fewer, or a partner conversation is open on 2027-04-30.
       - **R3 Maintain:** neither R1 nor R2 holds.
     - **Not measured.** If WS7-08 recorded the weekly email as "deferred to W5", R2(c) is `not measured (deferred)` and is left out of R2, not counted as "not met". Any other gating input that is "not measured" makes its rule "not met (input not measured)". The decision doc says which input was missing.
     - **Email consolidation rule (W5), adopted from WS7-08.** This applies only if the weekly email shipped. If KPI-6 weekly-email subscribers on 2027-03-30 are below 20, remove the weekly-email code and its columns in W5. If they exceed March 2027's unique bill-digest recipients (KPI-7), fold followed-bill events into the weekly email and retire the separate digest in W5. Otherwise keep both and revisit after the 2028 session.
     - **Verdict to options:** "Loop works" maps to option 1, or option 3 if there is no newsroom partner. "Partner" maps to option 2, or option 1 if the partner is a Kentucky newsroom rather than Digital Democracy. "Maintain" maps to option 5. Option 4 is an owner judgement note, considered when KPI-5 (lookup rate) is the main use. The owner may record disagreement beside the mechanical verdict but cannot change it.
     - **Maintain mode:** `Syncs and fixes only, a 2028 session check, no new features. Detail: docs/evaluation/maintain-mode.md (WS5-16).`
     - **Outputs:** `docs/evaluation/2027-04-decision.md` (WS8-16).
     - **Amendments:** an empty subsection. Changes after 2027-01-05 need an ADR.
  2. Copy WS7-08's PR-body proposals into the PR description, saying which ones were adopted (all three by default). If the owner rejected one in WS7-08's PR, follow the owner.
  3. If `docs/adr/` exists (WS5-03a), add the next `docs/adr/NNNN-april-2027-decision-rules.md`. It records that the thresholds, rule order and option mapping are fixed on 2027-01-05 and that later changes need a new ADR.
  4. Add one line to `docs/program-spec/00-agent-operating-manual.md` §1: `April 2027 thresholds and verdict rules: docs/evaluation/README.md (WS8-08). How each number is measured: docs/metrics.md (WS7-08). Do not change either after 2027-01-05 without an ADR.`
- **Don't:** put any threshold, verdict rule or the "partner conversation open" definition in `docs/metrics.md` or any file other than `docs/evaluation/README.md`; edit WS7-08's protocol section; define or redefine a KPI (WS7-01 owns definitions); add analytics events or dashboards; include partner names, contact details or funding asks.
- **Acceptance criteria:**
  - [ ] `wc -l docs/evaluation/README.md` ≤ 60.
  - [ ] `grep -nE "KPI-1|KPI-3|KPI-6|KPI-7|WS5-13|WS8-11" docs/evaluation/README.md` shows each of the six IDs at least once, and each of R1, R2 and R3 states its number(s) and measurement date.
  - [ ] The file states the rule order, the "not measured" handling, the email consolidation rule and the "partner conversation open" definition.
  - [ ] `docs/metrics.md` contains no threshold: `grep -ni "threshold" docs/metrics.md` matches only WS7-08's pointer sentence (or prints nothing if WS7-08 has not merged), and the reviewer confirms that no numeric decision rule appears there.
  - [ ] First commit of the file is dated on or before 2026-12-14: `git log --diff-filter=A --format='%h %cs' -- docs/evaluation/README.md | tail -1`.
- **Verify:** plain container: `npm test`, `npm run lint` (docs only), the `grep`, `wc` and `git log` above.
- **Owner actions:**
  - [ ] Accept or edit each number and the definition in review by 2026-12-14.
- **Rollback:** `git revert` before 2027-01-05. After that date, record any change as an amendment with an ADR, not a deletion.

---

### WS8-09 · Add CONTRIBUTING.md and a data-error issue form

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P3 | W2 or later (only if W2 capacity remains; otherwise W4) | Sonnet | S | WS2-08, WS3-14 | C2, E14, O3, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** whether outside pull requests are invited.
  - (a) Issues welcome, and pull requests only after an issue is agreed. **Recommended:** a solo maintainer cannot review drive-by PRs, and agent PRs already follow the operating manual.
  - (b) Pull requests welcome.
  - (c) Issues only.
  - **Default if unanswered by 2026-11-20: (a).**
- **Data-limit impact:** none.
- **Ongoing cost:** 0–0.5 h/month triaging issues. The form routes data-error reports into WS3-14's corrections procedure instead of email threads.
- **Why:** A partner or funder judges a public repo partly by how it takes reports (O3, O4). Today the only public way to report a data error is an email address. A CONTRIBUTING file with the "never run syncs against production" rule also lowers the bus-factor risk of a helpful outsider spending shared quota (E14).
- **Current state (verified 2026-10-06):**
  - The repo root has `LICENSE` (MIT), `README.md`, `CLAUDE.md` and `FEEDBACK.md`. There is no `CONTRIBUTING.md`. WS2-08 adds `SECURITY.md`.
  - `.github/` contains only `pull_request_template.md` and `workflows/`.
  - The remote is `github.com/ktoepp/know-your-vote-kentucky`.
  - `js-yaml` 4.x is present in `node_modules` as a transitive dependency [verify at pickup].
- **Do:**
  1. `CONTRIBUTING.md` (40 lines or fewer):
     - What KYvKY is (2 lines).
     - How to report a data error (the issue form) and a security issue (`SECURITY.md`).
     - The contribution policy from the owner decision.
     - For code: `npm ci`, `npm test`, `npx tsc --noEmit`, `npm run lint`.
     - `Never run syncs, backfills or scripts against production. They spend shared quotas.` Link `docs/data-budget.md` if it exists.
     - The voice guide for copy, and "no personal data in issues or PRs".
     - AI agents: follow `docs/program-spec/00-agent-operating-manual.md`.
  2. `.github/ISSUE_TEMPLATE/data-error.yml` (issue form). Fields: page URL (required), what looks wrong (required), the official source you checked (optional), and a required checkbox `I have not included anyone's personal information.` Label: `data-error`. Description links `docs/corrections-procedure.md` (WS3-14) by absolute GitHub URL.
  3. `.github/ISSUE_TEMPLATE/config.yml`: `blank_issues_enabled: true`, with one contact link to `https://github.com/ktoepp/know-your-vote-kentucky/blob/main/SECURITY.md` (security). Add a second link to `https://www.kyvky.com/methodology` only if `src/app/methodology/page.tsx` exists on `main`, otherwise `https://www.kyvky.com/about`.
  4. README: add a `CONTRIBUTING.md` link in WS5-04b's README structure, or next to WS2-08's Security line if WS5-04b has not merged.
- **Don't:** add CODEOWNERS (one-person repo), `CITATION.cff` or a code of conduct (see Deferred); edit `LICENSE`; add workflows, labels or bots; touch `FEEDBACK.md`; inventory assets (WS8-14a does that after WS5's cleanup).
- **Acceptance criteria:**
  - [ ] `ls .github/ISSUE_TEMPLATE | wc -l` prints 2.
  - [ ] `node -e "const y=require('js-yaml'),fs=require('fs');for(const f of fs.readdirSync('.github/ISSUE_TEMPLATE'))y.load(fs.readFileSync('.github/ISSUE_TEMPLATE/'+f,'utf8'))"` exits 0.
  - [ ] `wc -l CONTRIBUTING.md` ≤ 40.
- **Verify:** plain container: the two commands above, `npm run lint` and `npm test` (no code change). GitHub renders issue forms only after merge.
- **Owner actions:**
  - [ ] After merge, open "New issue" once and check the form renders.
- **Rollback:** `git revert`.

---

### WS8-10 · Draft the partner capability brief and demo path

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 (v0 merge by 2026-10-30, otherwise by 11-10) | Sonnet | S | WS3-02, WS7-01; soft: WS4-01, WS8-07b | C1, C2, C3, C7, T1, T2, T5, T9, O3, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none for the public brief. Named-partner versions, asks and pricing are owner content kept outside the repo (WS8-11).
- **Data-limit impact:** none. Coverage numbers come from owner-run, SELECT-only queries until `/methodology` exists.
- **Ongoing cost:** about 0.5 h per refresh. Refreshed once in W4 by WS8-14a.
- **Why:** WS8-11's discovery conversations need something accurate to send by early November, while a newsroom or Digital Democracy can still plan 2027 coverage (C2, C7). It must lead with the niche: no single feature is unique (C1), but no one else links bill ↔ every roll call ↔ *your* legislators ↔ committee agendas in one neutral place. Its numbers must come from one checkable source, because funder-facing figures already disagree (T9). Reach is real but retention is near zero, and the brief says both (T1, T2).
- **Current state (verified 2026-10-06):**
  - No `docs/partner/` exists.
  - WS7-01 (P0, W0) creates `docs/metrics.md` with a "Citable figures" table. WS4-01 (P0, W0) creates `docs/data-budget.md` with a five-line "Running Kentucky today (estimated)" block meant for this brief.
  - `/about` (`src/app/about/page.tsx` ~52) says "running since February 2026", while the Supabase project was created 2026-03-09 (T9, corrected by WS7-03). The brief does not repeat the claim.
  - The demo path depends on corrected member vote labels (WS3-02, P0 W0) and, if merged, WS6-18's per-member votes.
  - The agent has no database access, so it cannot compute numbers.
- **Do:**
  1. Create `docs/partner/capability-brief.md` (about 70 lines, one printed page, plain language, voice guide):
     - **What it is:** 3 sentences. The first states the niche and says plainly that no single feature is unique.
     - **The layer:** the four links (each bill, every roll call with an official-history label, your legislators by address, committee agendas that name bills) and what each is built from.
     - **Coverage:** at most 4 headline numbers. If `/methodology` exists, link it and copy the numbers with its "as of" date. If not, write placeholders of the form `[owner: run the SELECT below and paste the result with today's date]`, each followed by the SELECT text in an HTML comment. Use these:
       - `select count(*) from ky_bills where session = '2026 Regular Session';`
       - `select count(*) from ky_votes v join ky_bills b on b.id = v.bill_id where b.session = '2026 Regular Session';`
       - `select count(*) from ky_committee_agenda_items where ky_bill_id is not null;`
       - `select count(*) from ky_bills where ai_summary is not null;`
     - **How it is run:** link `docs/data-budget.md` and copy WS4-01's "Running Kentucky today (estimated)" lines with their *estimate* labels; quality gates (WS1); corrections (`/corrections`, WS3-14).
     - **What a partner can use today:** the pages, `llms.txt`, JSON-LD, and the public bill JSON only if WS8-02 kept it. Say that a structured export or IDs can be discussed. Do not claim unbuilt features.
     - **What it does not do:** no transcripts, no donor data, no positions, one state.
     - **Honest traction:** copy reach and retention figures **verbatim** from `docs/metrics.md` "Citable figures", with their "as of" dates. If that table does not exist at pickup, use T1 and T2 from appendix A, labelled "as of 2026-10-06 (audit)", and mark them `[owner: replace with docs/metrics.md Citable figures]`.
  2. Create `docs/partner/demo-path.md` (30 lines or fewer): five numbered steps with real URLs on `www.kyvky.com`: find your legislators by address; open a member profile whose labels WS3-02 corrected; open a 2026 bill with a committee substitute and at least one roll call; (if WS6-18 merged) expand a roll call to see member votes; open a committee meeting whose agenda names that bill. Give the expected screen for each step. Mark each URL `[owner to check before sharing]`.
  3. Put no partner names, prices, funding asks or personal data in either file.
  4. **Refresh (W2).** After WS7-14 merges (target 2026-11-10), replace the T1/T2 traction lines with WS7-14's dated election-period rows from `docs/metrics.md` "Citable figures", copied verbatim with their dates. If v0 merges after WS7-14, do this in v0. Otherwise it is one small docs-only follow-up PR.
- **Don't:** write outreach emails (owner); fill any number yourself except T1/T2 copied from appendix A with their date; claim features that have not merged; use any number without a date and source.
- **Acceptance criteria:**
  - [ ] Both files exist, the brief is 80 lines or fewer and the demo path 30 or fewer.
  - [ ] Every number has a date and a source, or is an owner placeholder with its SELECT.
  - [ ] After WS7-14 has merged, the brief cites its election-period rows, and no raw T1/T2 line remains.
  - [ ] `git grep -n -i "calmatters\|lantern\|\bKPR\b\|\bLPM\b\|\bKET\b" docs/partner` returns nothing.
- **Verify:** plain container: `npm test` (no code change) and the `git grep`. The owner walks the demo path on production.
- **Owner actions:**
  - [ ] Run the SELECTs and paste results with dates, or confirm the `/methodology` numbers.
  - [ ] Walk the demo path once on a phone and once on desktop.
- **Rollback:** `git revert`.

---

### WS8-11 · Hold discovery conversations with Digital Democracy and a Kentucky newsroom

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 → W3 | Owner | S | WS2-05, WS3-02, WS5-04a, WS8-10; soft: WS5-04b, WS8-01a, WS8-01b | C1, C2, C3, C5, C6, C7, C8, D1, T4, O3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** whom to approach and in what order. **Recommended order**, so that a 2027-session pilot is still possible before FZ (2026-12-15):
  1. CalMatters Digital Democracy's expansion team, **by 2026-11-13**. It is the most credible partner and the main threat (C2). Its model works through newsroom partners, so ask which Kentucky outlet they would pair with.
  2. One Kentucky newsroom, **by 2026-11-20**, after election week. The election (C8) is a reason to talk now: "how did my rep vote" was the top query of the month. Kentucky Public Radio hand-builds a 15-bill vote tracker from LRC vote PDFs (C1) [verify before quoting], which makes it a natural first conversation. Kentucky Lantern, Louisville Public Media and KET are alternatives.
  3. Neutral civic groups that already use paid trackers, such as the Kentucky Civic Engagement Table (C3), in W3.
  4. Small funders in W4, when there are session numbers (C6: Press Forward Bluegrass, Trust for Civic Life, Knight Cities). **NLnet is handled by WS7-03 before 2026-11-03** and is not part of this WP.
  
  **Default:** this order.
- **Data-limit impact:** none. If a partner asks for bulk data, it goes through WS8-12's trigger, never an ad-hoc script.
- **Ongoing cost:** owner time, about 2–4 h/month from W1 to W4. There is no engineering cost unless a written request triggers WS8-03, WS8-12, WS8-15 or a Deferred row.
- **Why:** Surviving civic-data projects are newsroom-owned, institution-attached or paid, and they own distribution (C5). Partnerships produce no measurable traffic today (T4). The April decision (C7) needs real partner signals, and anything a partner asks for must be known before FZ to ship before the session.
- **Current state (verified 2026-10-06):** no conversation is recorded in the repo. `FEEDBACK.md` logs earlier outreach and contains personal data (S12). WS2-05 removes it and keeps outreach logs out of the public repo by default. WS5-04a fixes the README's wrong Kentucky-law statements by 2026-10-20. WS5-04b's README rewrite is W2.
- **Do:** (owner)
  1. **Before the first message,** check that WS2-05, WS3-02 and WS5-04a have merged, so a reader of the public repo or a member page does not meet personal data, mislabelled votes or a wrong veto rule. If WS5-04b has not merged, link the brief and the site rather than the repo README. Check whether WS8-01a's answers exist (due 2026-11-06) and whether WS8-01b has merged. If it has not, apply the data-rights fence in Don't.
  2. **Discovery, not a pitch.** Ask for 30 minutes. Send WS8-10's brief and demo path, tailored privately. Once WS7-14 has merged (target 2026-11-10), any traction figure in the materials is one of its dated election-period rows in `docs/metrics.md` "Citable figures", not raw T1/T2. Ask three questions: what format would you ingest (pages, JSON, CSV, embed); what would you need for the 2027 session; what would stop you using it.
  3. Record the answers in the private log. A **written** request for a specific capability is the only trigger that moves WS8-03, WS8-12, WS8-15 or a Deferred row into a window (see Trigger rule). Requests after 2026-12-01 are scheduled for W5, because nothing new ships in FZ or W3.
  4. Only nonpartisan organizations may co-brand or embed under KYvKY's name. Anyone may use the public data under its license (C3, voice guide "Non-partisan, always").
  5. Keep the log **outside** the repo (Notion). Record per organization: date contacted, response, and outcome category (`no reply` / `conversation` / `written interest` / `pilot` / `declined`).
  6. On 2027-01-31 and 2027-04-15, copy the per-category **counts** (not names) into WS8-16's decision doc. WS8-08's "partner conversation open" definition reads the same log.
- **Don't:** promise features, uptime or data the rights doc does not allow. **Until WS8-01b merges, offer only links and embeds of KYvKY pages and KYvKY-authored content. Make no bulk, API or re-hosting commitment.** (WS8-01a's answers are due 2026-11-06. WS8-01b turns them into `docs/data-rights.md`.) Send no numbers that are not in the brief, `/methodology` or `docs/metrics.md` "Citable figures". Put no outreach notes or contacts in the repo.
- **Acceptance criteria:**
  - [ ] Digital Democracy contacted by 2026-11-13 and at least one Kentucky newsroom by 2026-11-20.
  - [ ] At least 3 organizations contacted by 2027-01-31.
  - [ ] Category counts recorded for WS8-16.
- **Verify:** owner self-check against the private log.
- **Owner actions:** all steps.
- **Rollback:** not applicable.

---

### WS8-12 · Publish a one-off per-session file of the KYvKY layer (trigger-gated)

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P3 | W5 | Sonnet | S | trigger; WS8-01b, WS8-02 | C1, C2, C7, D1, O2, O3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:**
  1. **Trigger.** Build only if an organization asks in writing for bulk data (WS8-11). **Default: not built.** The sunset path in WS8-14a may also reuse this script as the final archive, if the W4 decision is to stop.
  2. **Member-level votes in the file.** Include only if WS8-01a's answer 1 is (a). **Default: excluded.**
- **Data-limit impact:** LegiScan, Open States, LRC and Anthropic: none. One owner-run read of the database per file, about 2,000 bill rows plus their roll calls and agenda items. No route, no cache, no schedule.
- **Ongoing cost:** 0. The output is a static file attached to a GitHub release. It replaces a live export route with its own cache and stop condition.
- **Why:** A data desk or partner evaluating Kentucky (C2, C7) needs a whole session at once. The file carries only what KYvKY adds (derived roll-call labels, summaries with their basis, topics, agenda links) plus LegiScan IDs to join with LegiScan's own datasets. Raw LegiScan data is already available from LegiScan (D1).
- **Current state (verified 2026-10-06):** no export routes or scripts exist. `/api/me/export` is the user's own account export and is unrelated. Session names are validated with `isKnownKyBillSession` (`src/lib/ky-sessions.ts` ~212) over `KY_SESSIONS` (~61). Bill history for labels is `ky_bills.legiscan_history`. WS3-02 measured its size per bill (Owner SELECT there).
- **Do:**
  1. Create `scripts/export-session-layer.ts` taking `--session="<full session name>"` (validated with `isKnownKyBillSession`) and `--out=<dir>`. It writes:
     - `bills.csv`: `toPublicBill` fields (WS8-02 option (b)) or the same allowlist, with arrays joined by `|`.
     - `roll-calls.csv`: `toPublicRollCall` fields plus `bill_id` and `bill_number`.
     - `agenda-items.csv`: meeting date, committee name, `sort_order`, `item_kind`, `bill_number`, `ky_bill_id`.
     - `README.txt`: sources, licenses from `data-license.ts`, the session, the generation date, and the commit SHA.
     - Member-level vote files only under decision 2 (a).
  2. Read bills in 200-row batches selecting only `id, bill_number, legiscan_history` for labelling, and the allowlisted columns separately.
  3. Write a tested CSV writer in `src/lib/csv.ts`: RFC 4180 quoting, a `'` prefix for cells that start with `=`, `+`, `-` or `@`, and `\r\n` line ends.
  4. Add `src/lib/csv.test.ts` (quoting, newlines, formula prefixes, unicode) and a pure test of the row mappers on a synthetic 2,000-bill input that asserts headers equal the allowlist and reports the mapping time.
  5. Document the owner run in the script header: `npx tsx scripts/export-session-layer.ts --session="2026 Regular Session" --out=./tmp-export`, then zip and attach to a GitHub release.
- **Don't:** add a route, storage bucket or schedule; export raw `legiscan_history` or `legiscan_texts`, editor notes, user tables or view counts; run the script from the agent container.
- **Acceptance criteria:**
  - [ ] Tests pass. The CSV writer handles quotes, newlines and formula prefixes.
  - [ ] An unknown session name exits non-zero with a message.
  - [ ] tsc (including `scripts/`, if WS1 enabled it), lint and test pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`. The real run is an Owner action.
- **Owner actions:**
  - [ ] Run the script once against production (read-only), check file sizes, and attach the zip to a GitHub release.
- **Rollback:** `git revert`. Delete the release asset if needed.

---

### WS8-14a · Assemble the evidence index, portability catalog and sunset path

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W4 (merge by 2027-04-24) | Sonnet | M | soft: WS8-10, WS9-07, WS9-08, WS4-16, WS5-13, WS5-16 | C2, C6, C7, E6, E10, E14, D4, O1, O3, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. Missing inputs are listed as `pending <WP>`, never estimated.
- **Data-limit impact:** none.
- **Ongoing cost:** about 1 h per refresh, once a year or per partner conversation. It replaces answering the same diligence questions by email. It absorbs the retired WS8-13 (portability, as documentation only) and the asset-provenance table.
- **Why:** A merger or partnership is decided on how cheaply someone else could run KYvKY (O3). That needs one index of the evidence, an honest account of what is Kentucky-specific (E6, E10), and a stated floor: what happens if the project stops (O1). The bus factor is one person (E14). WS9 already writes the vendor list with its §Does not transfer (WS9-08) and the env-var catalog (WS9-07), so this WP links them instead of repeating them. There is no handover runbook: WS9-09 is retired, and the full transfer order is a WS9 Deferred row.
- **Current state (verified 2026-10-06):**
  - None of the target files exist.
  - Inputs from other WPs: `docs/data-budget.md` (WS4-01), `docs/data-cost-per-state.md` (WS4-16), `docs/evaluation/2027-04-maintenance.md` (WS5-13), `docs/evaluation/maintain-mode.md` (WS5-16), `src/lib/schedule-registry.ts` (WS4-11), WS2-14's readiness record, `/corrections` and `docs/corrections-procedure.md` (WS3-14), `docs/ops/vendors.md` including §Does not transfer (WS9-08), `docs/ops/env-vars.md` (WS9-07), `docs/data-rights.md` (WS8-01b), `docs/data-dictionary.md` (WS8-14b).
  - `docs/architecture.md` (~39, ~134) still says migrations "001–029".
  - Kentucky-specific code: `'KY'` in `src/lib/ky-legiscan-client.ts` (one inline argument to `getSessionList` ~371 and two parameter defaults ~425, ~465); the OCD jurisdiction literal in `src/lib/ky-openstates-client.ts` ~252, ~270; `KY_HOUSE_DISTRICT_COUNT` / `KY_SENATE_DISTRICT_COUNT` in `src/lib/ky-district-pages.ts` ~17–18; `src/lib/ky-sessions.ts`; `src/lib/ky-legiscan-coverage.ts`; four LRC scraper modules plus parsers (E6); `America/New_York` in `src/lib/structured-data.ts` `etOffsetForDate`; the Census source in `scripts/build-ky-district-geojson.ts` (state FIPS 21); all tables prefixed `ky_`; guide and glossary copy encoding Kentucky law (U18).
  - `public/` holds `branding/`, `geo/`, `images/`, `lottie/` and loose files (`favicon.ico`, `file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`, `manifest.json`). WS6-04b may remove `lottie/` usage.
- **Do:**
  1. `docs/partner/README.md` (60 lines or fewer): a table with one row per question a partner will ask, each linking the document or page, or `pending <WP>`:
     - What does it cover? (`/methodology`)
     - How are summaries made and checked? (`/methodology`, WS3-11a results)
     - What were the errors? (`/corrections`)
     - What does it cost to run? (`docs/data-cost-per-state.md`, `docs/ops/vendors.md`)
     - How much maintenance? (`docs/evaluation/2027-04-maintenance.md`, `docs/evaluation/maintain-mode.md`)
     - What are the data rights? (`docs/data-rights.md`)
     - Is it secure? (`SECURITY.md`, WS2-14's record)
     - What is the schema? (`docs/data-dictionary.md`)
     - Can it run elsewhere? (`docs/partner/portability.md`)
     - How would accounts transfer? (`docs/ops/vendors.md` §Does not transfer, `docs/ops/env-vars.md`. The full transfer order is written only if WS8-16 chooses a mode that moves accounts, as a WS9 Deferred row.)
     - What if KYvKY stops? (`docs/partner/if-kyvky-stops.md`)
     
     Add a **Known risks** list (10 lines or fewer), each linked to its finding: Next.js support window (S1), LRC scraper fragility (E6), one LegiScan key (D1), font kit (D6), one maintainer (E14).
  2. `docs/partner/portability.md` (120 lines or fewer): one table row per Kentucky-specific item under Current state, plus the voice guide's Kentucky conventions. Columns: file or area; what is Kentucky-specific; what another state would need; whether a national source exists (LegiScan and Open States cover all states, the scrapers do not); effort (S/M/L); "partner would likely replace" (yes/no, marked [I]). Close with three short paragraphs: what transfers as is (status mapping, roll-call labelling, summary pipeline, budget guards, attribution); what is Kentucky-only (LRC scrapers, calendar, legal copy); and "no second-state build" (program restraint, with the Deferred trigger).
  3. `docs/partner/assets.md` (30 lines or fewer): one row per folder in `public/` plus one "loose files" row, giving source and license, or `[owner to confirm]`. The district GeoJSON comes from Census cartographic boundaries (`scripts/build-ky-district-geojson.ts` ~1–20).
  4. `docs/partner/if-kyvky-stops.md` (40 lines or fewer), the data-preserving sunset path: announce on `/about`; switch schedules off using the "off" column of `docs/evaluation/maintain-mode.md` (WS5-16), never a new mechanism; stop LegiScan calls (the key stays with its account holder, D1); publish a final archive of the KYvKY layer under the content license (WS8-12's script if built, otherwise `pending WS8-12`); handle accounts and subscribers under `/privacy` (`[owner/legal]`, WS2-13); keep or transfer the domain (see the domain/DNS vendor row and §Does not transfer in `docs/ops/vendors.md`, WS9-08). Mark every step that needs a production setting as an Owner action.
  5. `docs/architecture.md`: fix stale facts only (the migration range becomes "see `docs/data-dictionary.md`", schedulers, routes removed by WS2-07 and WS8-02). Add a `Last checked <date>` line.
  6. Refresh `docs/partner/capability-brief.md` (WS8-10) with session numbers from `/methodology` and `docs/metrics.md` "Citable figures". Move the previous numbers into an HTML comment with their date.
- **Don't:** paste credentials, personal emails, account IDs or partner names; copy rows from `docs/ops/vendors.md` or `docs/ops/env-vars.md`; restate numbers owned by WS4-16, WS5-13, WS5-16 or WS7 (link them); write runbooks (WS9); change any `src/` file.
- **Acceptance criteria:**
  - [ ] Every question row has a link or `pending <WP>`.
  - [ ] `grep -rnoE "\b[A-Z][A-Z0-9]*_[A-Z0-9_]{2,}\b" docs/partner` prints nothing (no env-var names).
  - [ ] `git grep -n -E "@gmail|sk_|eyJ|key=" docs/partner` returns nothing.
  - [ ] `docs/architecture.md` has no migration range and has a `Last checked` date.
  - [ ] This link check exits 0: `node -e "const fs=require('fs'),p=require('path');let bad=0;for(const f of fs.readdirSync('docs/partner').filter(f=>f.endsWith('.md'))){const t=fs.readFileSync('docs/partner/'+f,'utf8');for(const m of t.matchAll(/\]\(([^)#\s]+)(#[^)]*)?\)/g)){const l=m[1];if(/^(https?:|mailto:|\/)/.test(l))continue;if(!fs.existsSync(p.resolve('docs/partner',l))){console.error(f+': '+l);bad=1}}}process.exit(bad)"`.
- **Verify:** plain container: `npm test` (no code change), the greps and the link check above.
- **Owner actions:**
  - [ ] Confirm the asset provenance rows.
  - [ ] Refresh the brief's numbers.
- **Rollback:** `git revert`.

---

### WS8-14b · Write a one-off data dictionary from an owner schema query

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W4 | Sonnet | S | none | C2, E1, E3, E14, S6, O3, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none. One owner-run SELECT on catalog views.
- **Ongoing cost:** 0. It is regenerated only on a partner's request, with no drift test and no per-migration chore. It replaces reading 57 SQL files (E1, E14).
- **Why:** A partner's engineer needs the schema on one page with each column's meaning, and a reviewable list of which tables hold user data (O3, O4). Diligence needs it once, at handover time, not continuously. The migrations already carry `COMMENT ON` text (for example migration 038 on `editor_notes`), and those comments come back from the catalog.
- **Current state (verified 2026-10-06):**
  - `supabase/migrations/` has 57 files, two numbered `045`, and 31 `CREATE TABLE` statements including the `CREATE TABLE … AS` for `ky_committee_materials_legacy_dupes_048` (RLS off, S6; WS2-06b drops it).
  - `ky_meetings` (migration 001 ~83–85, "scheduled meetings across all levels") is a local-government-era table that no file in `src/` or `scripts/` reads. The live meetings table is `ky_committee_meetings` (migration 024).
  - The four parked local-government tables are `ky_ordinances`, `ky_executive_orders`, `ky_school_board_items` and `ky_county_actions` (WS5 Deferred row, formerly WS5-06b).
  - No data dictionary exists.
- **Do:**
  1. Ask the owner to run this SELECT-only query on production and paste the output (CSV) into the PR: `select c.table_name, c.column_name, c.data_type, c.is_nullable, col_description(cl.oid, c.ordinal_position::int) as column_comment, obj_description(cl.oid, 'pg_class') as table_comment, cl.relrowsecurity as rls_enabled from information_schema.columns c join pg_namespace n on n.nspname = 'public' join pg_class cl on cl.relnamespace = n.oid and cl.relname = c.table_name and cl.relkind in ('r','p') where c.table_schema = 'public' order by c.table_name, c.ordinal_position;`
  2. Format `docs/data-dictionary.md`: a header line `Generated <date> from the production schema. Not drift-tested. Regenerate on request.`, then per table: class, RLS yes/no, table comment, and a column table (name, type, nullable, comment).
  3. Classify every table by hand in the doc:
     - `public_data`: `ky_bills`, `ky_votes`, `ky_legislators`, committees, `ky_committee_meetings`, `ky_committee_agenda_items`, materials, status history, topics (list the exact names from the query).
     - `user_data`: profiles, follows, notification preferences and log, saved searches.
     - `operational`: sync state, sources, rate limits, datasets, accuracy tables.
     - `parked`: the four tables above, `ky_meetings` [verify unused: `grep -rn "ky_meetings\b" src scripts` prints nothing], and `ky_committee_materials_legacy_dupes_048`.
  4. Any `user_data` table with RLS off goes under "Found, not fixed" for WS2. `ky_meetings` goes under "Found, not fixed" for WS5 (E3).
- **Don't:** connect to a database from the agent container; add a parser, script, npm script or test; edit migrations.
- **Acceptance criteria:**
  - [ ] Every table in the owner's output appears with a class.
  - [ ] Every table named by `grep -ohiE "create table (if not exists )?(public\.)?[a-z_0-9]+" supabase/migrations/*.sql | sort -u` either appears or is noted as dropped.
- **Verify:** plain container: the `grep` above and `npm run lint` (docs only).
- **Owner actions:**
  - [ ] Run the query and paste the output.
- **Rollback:** `git revert`.

---

### WS8-15 · Ship an embeddable roll-call card for newsrooms (decision-gated)

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P3 | W2 if (a), otherwise not built | Opus | M | WS2-11c, WS3-01, WS8-02 (option b), WS8-01b | C1, C2, C5, S8, O3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** build or not.
  - (a) Build in W2 **only if** a Kentucky newsroom commits in writing by 2026-11-20 to embed it during the 2027 session.
  - (b) Build in W4 as a demo for the 2028 session.
  - (c) Don't build.
  - **Recommended and default: (c),** unless (a)'s written commitment exists. (b) would relax the global framing rule for a surface with no user, then leave it idle for about nine months.
- **Data-limit impact:** none external. Responses are cached on the CDN for 10 minutes, with one Supabase read per uncached bill.
- **Ongoing cost:** about 0.5 h/month while a newsroom uses it. It adds one public surface whose framing rules differ from the rest of the site.
- **Why:** Distribution belongs to whoever owns the audience (C5). A small card showing every roll call on a bill, with official-history labels and a link back, is the cheapest thing a newsroom can put in a story (C1), and it brings attribution traffic back.
- **Current state (verified 2026-10-06):**
  - `next.config.ts` `headers()` (~109–160) applies `X-Frame-Options: DENY` and a Report-Only CSP with `frame-ancestors 'none'` to source `'/((?!api/sync).*)'`. `next.config.ts` is wrapped with `withSentryConfig`, so a test cannot import it cheaply.
  - WS2-12a (W4) plans `src/lib/security-headers.ts` for the CSP, and WS2-12b (W4) enforces it. WS2's interface allows WS2-12a to be pulled forward if this WP needs a shared header module.
  - `src/app/layout.tsx` (~122–130) renders `Navigation` and `SiteFooter` around every page, so an App Router page cannot drop the site chrome without a route-group restructure.
- **Do:** (only under (a) or (b); under (a) merge after WS2-11c and before 2026-12-15, otherwise it moves to W5)
  1. Create `src/app/embed/bills/[id]/votes/route.ts`, a route handler (not a page), so no layout applies. It returns a self-contained HTML document built by a pure `buildEmbedHtml(bill, rollCalls)` in `src/lib/embed-html.ts`: inline CSS only, no JS, system fonts. Content: bill number, session and title (link to the KYvKY page, `target="_blank" rel="noopener"`); for each roll call, date, chamber, the `label` from `toPublicRollCall`, yea/nay/not voting, and passed or failed; a footer line `Vote data from LegiScan (CC BY 4.0). Labels and layout by Know Your Vote Kentucky.` Copy has no em dash and no semicolon.
  2. Escape every interpolated value with a tested `escapeHtml` in `src/lib/html-escape.ts` (`& < > " '`).
  3. Route headers: `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; img-src 'self'; frame-ancestors *; base-uri 'none'; form-action 'none'` and `Cache-Control: public, s-maxage=600, stale-while-revalidate=3600`.
  4. Export `GLOBAL_HEADER_SOURCE = '/((?!api/sync|embed/).*)'` from `src/lib/security-headers.ts` (create the file with only this constant if WS2-12a has not merged, or add it to WS2-12a's module). `next.config.ts` imports it for the global header rule, so `X-Frame-Options: DENY` does not apply to `/embed/*`. Apply the exclusion to whatever header mechanism exists at pickup. Add a comment explaining why.
  5. Tests: `buildEmbedHtml` on a fixture contains no raw roll-call text and contains the attribution line; a title containing `<script>` is escaped; a test on `GLOBAL_HEADER_SOURCE` confirms `/embed/bills/x/votes` is excluded and `/bills`, `/members/x` and `/api/bills` are matched.
- **Don't:** add JS, analytics, cookies, auth or oEmbed; allow framing of any other path; add an "Embed" button to bill pages (see Deferred); include member-level votes unless WS6-18 has shipped and the owner asks; change any other CSP directive.
- **Acceptance criteria:**
  - [ ] Plain container: the escape, HTML-builder and header-source tests pass.
  - [ ] Owner or preview with anon env: `curl -sI <preview>/embed/bills/<id>/votes` shows the route CSP with `frame-ancestors *` and no `X-Frame-Options`, and `curl -sI <preview>/bills` still shows `X-Frame-Options: DENY`.
  - [ ] The response is under 30 KB for HB500 (2026) (owner or preview).
  - [ ] tsc, lint, test and build pass.
- **Verify:**
  - Plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - Owner or preview with anon env: the two `curl` checks, and embed the snippet in a scratch HTML file served from another origin.
- **Owner actions:**
  - [ ] Choose (a), (b) or (c).
  - [ ] If built, run the preview checks.
- **Rollback:** `git revert`. This restores the global header source and removes the route.

---

### WS8-16 · Record the go / partner / maintain decision

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W4 (by 2027-04-30) | Owner | S | WS7-13, WS8-08, WS5-13, WS5-16; soft: WS8-14a, WS8-14b | C7, C2, C6, O1, O3, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** the decision itself, by **2027-04-30**. **Default if no decision by 2027-04-30:** maintain mode (option 5), as WS5-16's `docs/evaluation/maintain-mode.md` defines it.
- **Data-limit impact:** none.
- **Ongoing cost:** depends on the outcome. The decision doc states the expected hours/month, taken from WS5-16 for maintain mode.
- **Why:** The program exists to reach a decision with evidence (C7, O4). WS8-08 fixed the thresholds and rule order before the session, and WS7-13 supplies the measured values without a verdict. This WP applies the rules mechanically, citing each value. It translates the result into one of the five options, adds the partner evidence WS7 does not measure, and writes down why (O1, O3). It never changes a rule or a value. The owner may disagree in writing beside the mechanical result.
- **Current state (verified 2026-10-06):** no evaluation exists. Inputs:
  - WS7-13's `docs/metrics.md` "2027 session measured values" (by 2027-04-15; no verdict by design)
  - WS8-08's rules in `docs/evaluation/README.md`
  - WS5-13's `docs/evaluation/2027-04-maintenance.md` (by 04-17)
  - WS5-16 (by 04-24)
  - WS4-16's `docs/data-cost-per-state.md`
  - WS6-20's product summary
  - WS8-11's counts
  - WS8-14a's pack
  - the consolidated Deferred register, `docs/program-spec/DEFERRED.md`, with each workstream's W4 status filled by its own W4 review WP
- **Do:**
  1. (Agent, Sonnet) Draft `docs/evaluation/2027-04-decision.md` (100 lines or fewer):
     - **Rules applied.** Take each rule in `docs/evaluation/README.md` in its stated order (R1, R2 with each sub-condition, R3). For each, give the threshold, the measured value, and its citation: file, section and the query date from WS7-13's "2027 session measured values", or WS5-13's file, or WS8-11's 2027-04-15 counts. Give the result as `met`, `not met` or `not measured (<reason>)`, using WS8-08's "Not measured" handling. Then state the first rule that holds as the **mechanical verdict**. Do not re-measure, round differently or substitute a different source. If a value is missing at drafting time, write `pending <WP>` and do not guess.
     - **Email consolidation rule:** apply WS8-08's W5 rule to KPI-6 and KPI-7 from WS7-13, citing both, or write "not applicable (weekly email deferred)".
     - **Option per WS8-08's mapping**, with the owner's note if they disagree with the mechanical verdict.
     - **Partner signals:** WS8-11's category counts on 2027-01-31 and 2027-04-15.
     - **Triggers and Deferred items.** Read `docs/program-spec/DEFERRED.md`. Fill the W4 status **only for WS8's rows** (WS8-03, WS8-12, WS8-15 and this file's Deferred table): "fired" (with the request date) or "not fired". Do this in `DEFERRED.md` and in the decision doc. For every other row, copy the status its owner WP recorded. Where that is blank, write `not reviewed (<owner WP>)`. Do not resolve another workstream's row.
     - **Cost floor:** link `docs/evaluation/maintain-mode.md` and `docs/partner/if-kyvky-stops.md`.
     - Blank `Decision`, `Why`, `Expected hours/month` and `What changes next (W5 WPs, or "maintain mode only")` sections for the owner.
  2. (Owner) Fill in the blank sections.
  3. (Agent) Add the next `docs/adr/NNNN-2027-go-partner-maintain.md` pointing to the decision doc. Update the W5 line of `docs/program-spec/README.md` with the chosen path, and set WS8-16's status in `TRACKER.md`.
  4. (Agent) Once the decision ADR has merged, in its own PR: `git mv docs/program-spec docs/archive/program-spec`; update every link outside `docs/archive/` found by `grep -rln "docs/program-spec" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive .` (files inside the moved folder are frozen history and keep their text); add a one-line pointer to the archived spec in `CURRENT.md` (WS5-03b), or in the root `README.md` if `CURRENT.md` does not exist. WS5-15's ceiling test already reads `docs/archive/program-spec/` when `docs/program-spec/` is absent. From then on, new work is specified only in ADRs and `CURRENT.md`.
- **Don't:** change a threshold, rule, rule order or measured value (WS8-08 and WS7-13 own them); re-measure a KPI; change the mapping (WS8-08, ADR required); fill or resolve another workstream's Deferred rows; add W5 work beyond listing it.
- **Acceptance criteria:**
  - [ ] Every rule and sub-condition in `docs/evaluation/README.md` appears in the decision doc with its threshold, its cited value (file, section, date) or `not measured (<reason>)`, and a result.
  - [ ] The mechanical verdict equals the first rule marked `met`, in WS8-08's order (reviewer check).
  - [ ] Every WS8 trigger and Deferred row says "fired" or "not fired" in `DEFERRED.md` and in the decision doc.
  - [ ] A decision is recorded and dated by 2027-04-30, or the default is recorded as applied.
  - [ ] Step 4 (separate PR): `test ! -e docs/program-spec && test -d docs/archive/program-spec`, and `grep -rln "docs/program-spec" --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=archive .` prints nothing.
- **Verify:** plain container: `npm test` (no code change). Reviewer cross-checks each cited value against `docs/metrics.md` "2027 session measured values" and WS5-13's file. For step 4: `npm test` (WS5-15's ceiling test, if merged, passes on the archived path) and the two checks above.
- **Owner actions:** step 2.
- **Rollback:** the decision is not rolled back; a later decision supersedes it with a new ADR. Step 4's move PR is undone with `git revert`.

---

## Deferred

These rows, with WS8-03, WS8-12 and WS8-15, are WS8's rows in [DEFERRED.md](DEFERRED.md) (owner WP: WS8-16). WS8-16 fills their W4 status and no other workstream's.

| Item | Reason | Revisit trigger |
|---|---|---|
| OpenAPI document at `/api/openapi.json` and a `/data` developer page (retired WS8-04) | The API has no known consumer, `robots.ts` and `llms.txt` keep `/api` out of crawling, and CORS (WS2-07) would block browser-based OpenAPI tools anyway. A fifth trust page would be more copy to keep true (E12). License and fair-use text moved to `/licenses` (WS8-01b) and `/methodology` (WS8-07b). | A written partner request for machine-readable API docs (WS8-11), with WS8-02 option (b) shipped. Then generate the document from `public-api-contract.ts`, and ask WS2-07's owner whether to add it to the CORS allowlist. |
| Migration-parsed data dictionary with a drift test (retired WS8-06) | A regex SQL parser over 57 migrations plus a regenerate step on every migration is new process friction (E12, E13). Diligence needs the schema once (WS8-14b). | A partner takes over operations and asks for a continuously current schema doc. Then prefer generating from the catalog query in WS8-14b over parsing SQL. |
| Jurisdiction seam in code (retired WS8-13's `src/lib/jurisdiction.ts`) | It edits the quota-critical LegiScan client that WS4-02/WS4-03a change, for no behavior benefit. The portability catalog (WS8-14a) is the deliverable. | The W4 decision is "partner" **and** a funded agreement asks KYvKY to operate a second state. |
| Session-identifier map to Open States sessions | Needs copying and maintaining a map from `openstates-scrapers` every session, for a field no one has asked for. | Part of a triggered WS8-03 request that names it. |
| `CODEOWNERS` and `CITATION.cff` | Ceremony on a one-person repo with no partner payoff. | A second maintainer joins (CODEOWNERS), or a researcher asks how to cite (CITATION.cff). |
| Code of conduct | Owner choice. It matters only with outside contributors, and WS8-09 defaults to issues first. | The first accepted outside pull request. |
| Reporter tip sheet (a weekly committee or legislator brief, C2) | It needs editorial judgement, a weekly schedule and an audience that does not exist yet (T3). Digital Democracy's tip sheets are produced with newsroom partners. | A newsroom agrees in writing to use one during a session. Then a W5 WP builds it from existing data (meetings, agenda items, roll calls) with no AI text. |
| oEmbed endpoint and an "Embed" button on bill pages | Both add surface before anyone has used the iframe (WS8-15). | At least one newsroom has embedded the card in two or more stories. |
| Bill-level OCD IDs (`ocd-bill/…`) and filling `ky_bills.openstates_id` | No writer exists. Filling it needs Open States bill data and a matching step, which adds load and matching risk (D2, E10). Session plus bill number plus LegiScan bill_id already joins cleanly. | A partner's ingestion requires `ocd-bill` IDs, or Open States bulk CSVs prove to map 1:1 by bill number with no API calls. |
| API keys, per-consumer rate limits, SLA, status page | There is no known external consumer. The CDN cache bounds the load. A DB-backed limiter would write per request. | Vercel shows sustained non-browser traffic on `/api/bills*` or `/api/search` (over 1,000 calls a day for a week), or a partner contract requires an SLA. |
| Re-hosting raw LegiScan bill texts, history or datasets | LegiScan already publishes these under CC BY 4.0. Re-hosting adds license, storage and load questions (D1). | LegiScan's terms or availability change, or a partner pays for a mirror. |
| A second state, a multi-state schema, or renaming `ky_` | Program restraint. WS8-14a records what it would take. | The W4 decision is "partner", and the partner asks KYvKY to operate another state under a funded agreement. |
| Hearing transcripts and donor data | Digital Democracy's differentiators, but Kentucky sources and costs were not assessed, and both are new data pipelines. | A partner supplies the data or funds the pipeline. |

## Findings re-checked (2026-10-06, `a4e543a`)

- **C1–C7** are market and strategy findings from web search. They cannot be re-checked in the repo, so they are used as stated. Competitor facts in them (for example "Kentucky Public Radio covers 15 bills per session") are [verify before quoting externally] and are not repeated in `docs/partner/` without a source.
- **C6 and NLnet.** C6 lists Press Forward Bluegrass, Trust for Civic Life and the Knight Cities Challenge. NLnet appears only in appendix A's Key dates (deadline 2026-11-03) and is handled by WS7-03, not under C6 and not in W4.
- **C4 (llms.txt and JSON-LD exist): true, with drift.** `llms.txt` says "22 subject areas" (`KY_TOPICS` has 24), says "active session" between sessions, and line ~23 still contains a semicolon although the voice guide (§ Conventions) records a sitewide sweep on 2026-08-23. The session-qualified citation example ("HB 1 (2026 Regular Session)") already exists at ~48. Bill JSON-LD has no session-qualified `identifier`, no `isBasedOn` and no `legislationPassedBy`. WS8-05a/b fix these.
- **Redistribution.** `redistribut` appears at decisions.md line ~2544 (§ 2026-09-29), which records redistribution through the API and digest as an attribution defect, since fixed. The entry establishes CC BY 4.0 for LegiScan data but says nothing about re-serving terms beyond CC BY. WS8-01a question 1 is narrowed to that.
- **Seed "add attribution/license fields to API responses": mostly already done.** `LEGISCAN_API_ATTRIBUTION` is returned by the public bill routes since 2026-09-29. What is missing is the license for KYvKY-authored content and the Open States and LRC terms (WS8-01b). No API attribution rework is planned.
- **New, not in the appendix:** `/api/bills` returns `select('*')` (internal columns, including `search_vector`, `ai_summary_input_hash`, `editor_notes` and `editorial_popular_names`); `/api/bills/[id]` returns full bill rows via `fetchKyBillDetailPageData` and roll calls whose raw LegiScan text is under the key **`desc`** (not `description`), so the U1 mislabel also leaks through the API; the 500 paths of `/api/bills` and `/api/bills/browse` return internal error text. WS8-02 fixes all three, or deletes the unused routes.
- **New:** `/licenses` says Open States data is "subject to … your API agreement", the same reader-addressed wording fixed for LegiScan, and does not state CC0. WS8-01b fixes it.
- **New, for WS5 (E3):** `ky_meetings` (migration 001) is read by nothing in `src/` or `scripts/`. WS8-14b tags it `parked` and reports it under "Found, not fixed". `src/lib/tooltipGuidelines.ts` (~117–121) is imported by nothing and still states the wrong "3/5 … 61 of 100" veto rule (U18). It is not user-facing, but it should go with the other dead files.
- **S7 / N4:** the service-role client on the public bill-detail read path is now erratum N4 in appendix A. WS8-02's allowlist limits what can leave, and fencing the key stays with WS2-10.
- **T9, related:** `/about` still says "running since February 2026" (`src/app/about/page.tsx` ~52). WS8-10 does not repeat it. WS7-03 corrects it.
- **Open owner question (recorded only):** WS6-18's member-vote route returns `api_version: 1`, and WS8-02 adds no version field. The owner may want WS6-18 to drop it for consistency.
