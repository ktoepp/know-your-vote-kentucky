# WS6 — Product & UX

## Purpose

KYvKY has real reach (about 2,400 human visitors since June, mostly from search, T1, T4) and almost no return visits (T2). The one thing people reliably do is look up their legislators (T5). In the four weeks before the 2026-11-03 general election, "how did my representative vote" is the highest-intent question the site can answer (C8).

This workstream does three things, in this order:

1. It makes that path short, honest and fast before the election.
2. It makes the pages behind it lead with what a reader came for: a plain-language summary and **how each member voted** on a bill page, a voting record on a member profile, an agenda on a meeting card. The per-member roll-call layer (WS6-18) is the defensible niche: "bill ↔ every roll call ↔ *your* legislators ↔ agendas" (C1). A partner such as CalMatters Digital Democracy (C2) will judge the product on it, and the partner demo path (WS8-10) depends on it (O3, O4).
3. It gives a visitor one low-friction way back: an email link that starts the weekly My Legislators email (signed-out path WS7-09f; the signed-in opt-in is WS7-09d) or a follow.

The rule is **improve existing pages before adding new ones**. Most work packages (WPs) delete or reorder components. The workstream adds **no tables, no schedules and no vendors**, and its net change in API routes is zero. In W4, WS6-20 reads the session data and retires the surfaces that did not earn their keep.

**Owned findings:** U2, U4, U7, U8, U9, U10, U11, U12, U13, U14, U15, U16, U17, A5, C8. Each is addressed by a WP below or deferred in [Deferred](#deferred) with a reason.

**Program class:** none of this file's 24 WPs are Core; all 24 are **Backlog** (manual, "Core vs Backlog"). Each is picked up only after the Core WPs in its window are merged or blocked, or when its trigger fires, with the owner's go-ahead and a fresh Current-state check. No Core WP in another file depends on a WS6 WP. The windows and order below say when and in what order to pick them up if the owner gives the go-ahead.

### Timing rules for this workstream

- **W0 (to 2026-10-20):** four small PRs that serve the election: WS6-01, WS6-02, WS6-03, WS6-05.
- **W1 (2026-10-21 to 10-30):** one small PR, WS6-04a. **W1 PRs must merge by 2026-10-30.** WS9-03's default election freeze runs 2026-10-31 → 11-05, and only P0 fixes deploy during it. Nothing else from WS6 opens in W1.
- **W2 (2026-11-06 to 12-14):** WS6-06, WS6-07 and WS6-08 go first (from 11-06), then the rest. See [W2 cut line](#w2-cut-line).
- **FZ:** WS6-19 only. **W3:** small fixes only. **W4:** WS6-20.

### Local environment for agents ("anon env")

Many checks below need real data. They use this setup, called **anon env** in this file:

- The owner provides only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. They point at **production** and allow public SELECT reads. The owner never provides the service-role key for UI work.
- Never set the PostHog, Sentry or Mapbox keys locally (`NEXT_PUBLIC_POSTHOG_*`, `POSTHOG_PERSONAL_API_KEY`, `NEXT_PUBLIC_SENTRY_*`, `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`) [verify the exact names in `env-template.txt`]. The lookup then uses the Nominatim fallback, within each WP's stated budget.
- Anon env is **not** read-only by itself:
  - Until WS2-06a merges, every bill page view calls `ky_increment_bill_view`, which is a production write (`BillDetailView.tsx` ~838–850).
  - Until WS6-09a merges, every bill page view calls `/api/lrc/bill-link-status`, which fetches `legislature.ky.gov` (`BillDetailView.tsx` ~813–834). `next start` locally has no CDN cache.
- So: open bill pages in a browser with anon env **only** after WS2-06a has merged, **and** with the WS6-08 script's request blocking (which aborts `**/rest/v1/rpc/ky_increment_bill_view` and `**/api/lrc/**`). Before WS6-08 merges, do not open bill pages locally with anon env. Server-side `curl` of a bill page is fine after WS2-06a, because the probe and view count run in the browser.
- Without anon env, a data check becomes an **Owner check on the Vercel preview**. Say so in the PR.
- `npm run build` with anon env prerenders the top bills (`generateStaticParams`). Before WS6-09a, that makes no LRC calls (the probe is client-side). WS6-09a keeps it at zero (see its step 3).

**Screenshots before WS6-08 exists.** Use `npx playwright screenshot --viewport-size=390,844 <url> out.png` (and `1440,900`). This downloads Playwright through the agent proxy [verify that the proxy allows the Playwright CDN]. If it cannot, write "owner to screenshot on preview" in the PR. Checks that say "Network" mean a Playwright request log (`page.on('request')`) or an Owner check in the browser. DevTools is not available in a headless container.

### Definition of done (measurable)

Checked by WS6-19 in FZ (if it is picked up) unless a WP says otherwise. Items whose WP was never picked up or was deferred (see [W2 cut line](#w2-cut-line)) are recorded as **deferred**, not "not met".

1. **Find my legislators (C8, U7).**
   - At 390 px wide, the address field and the Search button on `/members/map` sit together, with no vertical gap larger than 16 px.
   - After a lookup, the "Your legislators" heading is scrolled into view and has focus.
   - Each result card links to that member's voting record (`#voting-record`).
2. **Home (U4, U13, U15).**
   - `/` has exactly one address entry, and it is in the hero.
   - The home H1 contains "Kentucky" and "legislators".
   - Loading `/` makes **no** request to `api.mapbox.com`.
   - "Most viewed" never ranks by lifetime views.
   - In the interim, the session banner links to `/meetings`.
3. **Bill page (U2, U15, E10, C1).**
   - The H1 is at most 120 characters and is not the "AN ACT…" legal title.
   - On HB500 (2026) and SB197 (2026), the plain-language summary heading is inside the first viewport at 390×844 and at 1440×900.
   - `BillDetailView.tsx` is no longer a single `'use client'` file of more than 1,200 lines.
   - Every roll call with a stored member list can show how each member voted, grouped by vote, with names as text (WS6-18).
4. **Meta descriptions (A5).** No bill meta description ends mid-word, and none is built from `ai_summary`. Both are proven by unit tests.
5. **Accessibility (U14, U9).**
   - `npm run a11y` reports 0 `critical` and 0 `serious` axe violations on the env-free routes. If WS6-16 shipped, CI enforces this. If not, WS6-19's FZ run is the evidence.
   - The same holds on the data routes (a bill, a member, `/bills`), checked once against a preview URL.
   - Party appears as text wherever a legislator is named on a profile or a card.
6. **Layout stability (U13), if WS6-15 shipped.** Lab CLS is below 0.1 on `/`, `/committees`, `/search`, one bill page and one member page (`npm run a11y -- --metrics`).
7. **Member profile (U11, C8).**
   - The voting record comes before sponsored bills (W0).
   - The tally caption never presents a partial count as a session total (W0). After WS6-11a, tallies cover the whole session.
   - A "Key votes" list exists, its definition is stated on the page, and it says when it covers only recent roll calls.
   - No party-line statistic is computed or shown (deferred).
8. **Way back (U10, C5).**
   - A signed-out visitor can start the weekly email (with WS7-09f) or, if WS6-12b shipped, a bill or committee follow, by entering only an email address and selecting the link in that email, on any device.
   - No copy promises a legislator follow.
9. **Meetings (U17).** "Meetings" is a top-level nav item. Upcoming meeting cards on `/meetings` show up to two agenda lines.
10. **Session readiness (U4, U12).** Unit tests on fixed dates show that the home page and `/bills` switch from interim to session copy on 2027-01-05 with no code change. `/bills` explains the interim instead of silently showing an ended session.
11. **Restraint.**
    - No new table, schedule, cron, vendor or PostHog event. The only new workflow job is WS6-16's, if it ships.
    - Net API routes: 0. WS6-18 adds `/api/votes/[id]/members`, and WS6-09a deletes `/api/lrc/bill-link-status`.
    - The home page loses at least five components: `LandingFeatures`, `LandingMapSection`, `LandingDistrictMapPreview`, `HomeSearchSection` and `LandingHeroCtas`.

**Outcome signals (reported in W4 by WS6-20, not gating).** The measurement workstream owns how they are counted (T2, T5, T6, WS7-01).
- Share of lookups followed by a member-profile view.
- Week-1 return rate for visitors who looked up a legislator.
- Share of bill-page views that open "Show how members voted" (from PostHog autocapture of the button; no new event).
- Email-link logins and weekly-email opt-ins that started from an email link.

### Interfaces with other workstreams

| This WS | Other workstream's finding / WP | How they relate |
|---|---|---|
| WS6-05, WS6-11a/b (member profile) | U1, WS3-01 / WS3-02 (vote labels) | WS3-02 must merge first. WS6 imports `src/lib/roll-call-label.ts` and never renders raw `description`. WS3-01 exports `deriveRollCallLabel` (`{ label, matched, chamber, rollCallNumber }`) with no motion kind, so WS6-11a adds its own pure `rollCallMotionKind`. |
| WS6-09a (bill page split) | U3, A1, A2, WS3-01, WS3-03a, WS3-04 | After WS3-01, `rollCallChamberFromDesc`, `deriveRollCallLabel` and `matchVotesToHistory` live in `roll-call-label.ts`. WS6-09a imports them and moves only `textDateOrNull`, `fmtDate` and `computeEffectiveStatus` into `bill-detail-view-model.ts`. WS3-13 later routes `computeEffectiveStatus` through its label helper. WS3-03b edits `detail/HistoryTimelineClient.tsx` after WS6-09a. |
| WS6-09b (version stamp) | A2, WS3-04 / WS3-09d | WS6-09b imports `aiSummaryBasisLine()` from `src/lib/ai-summary-basis.ts` and never re-types basis copy. |
| WS6-07 (meta descriptions) | A5 interface in WS3; WS8-05a/b (JSON-LD) | Meta tags cannot carry WS3-04's basis label, so WS6-07 stops using `ai_summary` in meta and in JSON-LD. WS8-05b builds on WS6-07's `structured-data.ts` and leaves `description` alone. |
| WS6-14 (mobile density) | U8, WS3-13 | WS3-13 owns what status labels say. WS6-14 does not change how many chips a card shows (Deferred with the list view). |
| WS6-06, WS6-10 (meetings fetch) | U5, WS3-06a/b | WS3-06a filters superseded rows in `fetchKyMeetingsBrowseWindow`. WS6-06 adds a separate upcoming-meetings fetch in the same file. Whichever merges second rebases. WS6 changes the nav and card content only. |
| WS6-01, WS6-05 (`DistrictMapExplorer.tsx`) | U6, WS3-05a (ZIP notice, lookup type) | All three edit the same file in W0. Whichever merges second rebases. WS6-01 touches only the form `sx` and adds a heading. |
| WS6-02 step 4 (map `SignupCta` copy) | WS7-09f | WS6-02's text is **interim**. WS7-09f replaces the same `body` in W2 to promote the weekly email. |
| WS6-12a (email link, intents) | WS2-03; WS7-09d, WS7-09f; D4, WS7-09c | WS6-12a depends on WS2-03, which must merge first. WS6-12a reuses its `ResendConfirmationButton` and its `next` handling on `/auth/verify`, and must keep WS2's DoD #4. WS6-12a defines the `weekly:<house>-<senate>` intent. WS7-09f (signed-out path) consumes it by preselecting and focusing WS7-09d's opt-in button, and never auto-subscribes. WS7-09d is the signed-in opt-in only. Email links are unlogged Resend sends (if Supabase SMTP is Resend) and share WS7-09c's `UNLOGGED_SEND_RESERVE` (30/day, `src/lib/email/send-budget.ts`); WS6-12a's stop condition uses that reserve. |
| WS6-12b (email-only follow) | C5, WS7-09a–f | Optional (P2). The weekly email is the program's retention bet. Bill follows are 0.17% of visitors (T5). |
| WS6-18 (who voted how) | WS7-10 (saved districts), WS8-02 / WS8-03 (API contract, OCD IDs), WS8-10 (demo path) | WS6-18 reads districts only through WS7-10's `readSavedDistricts()`, and never writes them. It creates `src/lib/roll-call-members.ts`, which WS8-03 may reuse for `roll_calls[].members`. If WS8-02's `public-api-contract.ts` exists, WS6-18 registers its route's fields there. WS8-10's demo path uses WS6-18. |
| WS6-10 (phase-aware home) | WS7-10 (`MyLegislatorsCard` on home) | WS7-10 places its card near the top of `HomePageContent.tsx`. WS6-10 keeps it directly under the hero. |
| WS6-05 members-elect note | WS9-13 (roster after seating) | The note ends on 2027-01-01. If WS9-13 finds the roster still stale then, the owner extends the date in a one-line W3 PR. |
| WS6-09a (view count) | S6, WS2-06a | WS2-06a deletes the view-count `useEffect` in W0. WS6-04b deletes the `view_count` fallback ranking on home and changes the prerender ordering, which WS2 left to WS6-04b. |
| W2 UI WPs | S1, WS2-11c (Next 16) | Whichever of WS2-11c and a WS6 UI WP merges second rebases. WS6-17a/b take their screenshots after WS2-11c if it has merged. |
| WS6-17a/b | U16, D6, WS9-08 (font guard) | WS6-17b decides the typeface by 2026-11-18. Under option (b), WS6-17b deletes WS9-08's `src/lib/font-fallback.test.ts` and the Adobe row in `vendors.md`. Under (a), WS9-08's guard stays. |
| WS6-03, WS6-09a (LRC link probe) | D3, WS4-09a (polite LRC helper) | WS4-09a excludes the probe route by path. WS6-03 caches it in W0. WS6-09a moves it server-side through `fetchLrcPage` if WS4-09a has merged, or deletes it (decision). |
| WS6-08, WS6-16 (axe) | E8, WS1-04 (CI); WS1 Deferred (Dependabot) | WS1 left the browser assertion to WS6. Dependabot version updates are deferred in WS1, so no Playwright bump PRs are expected. If that is revived, group `playwright` and `@axe-core/playwright` in one monthly group. |
| WS6-04a/b (home cleanup) | E3, E4, WS5-02 (orphan guard) | WS6-04a and 04b **delete** the components they stop rendering, so WS5-02's orphan test stays green. WS6-04b removes `lottie-react`. WS5-02 may delete `BillsListTable.tsx`; WS6 no longer uses it. |
| WS6-19 / WS6-20 | WS9-14 (operations review), WS7-12 / WS7-13 (readouts), WS8-16 (W4 decision) | WS6-20 is the product half of the W4 review. It feeds WS8-16. |
| Analytics | S10, WS2-09a/b; WS7-01 | WS6 adds **no** PostHog events or properties. WS7-01 step 10 (Tier-1 handoff close-out) assigns the handoff's Task 3 (per-member votes) to WS6-18 and marks Task 2 (`outbound_link_clicked`) superseded. |

### Out of scope

- A second state, a Push API, a native app, dark mode, and an instant-alert schedule (see Deferred).
- A MUI v5 → v7/v9 migration (deferred in WS2).
- Rewriting status-label meanings (WS3-13).
- Summary generation or grounding (WS3).
- Analytics plumbing (WS7).
- The weekly per-legislator email itself (WS7-09a–f) and the saved-districts store (WS7-10).
- A legislator-follow table (see Deferred).
- `/search` redesign beyond the CLS fix in WS6-15 (Deferred).
- New guide pages.

---

## WP summary

| ID | Title | Class | Priority | Window | Tier | Size | Depends on |
|---|---|---|---|---|---|---|---|
| WS6-01 | Close the mobile gap on Find my legislators and bring results into view | Backlog | P1 | W0 | Sonnet | S | none |
| WS6-02 | Make follow and signup copy match what an account actually does | Backlog | P1 | W0 | Sonnet | S | none |
| WS6-03 | Stop probing the LRC site on every bill page view | Backlog | P1 | W0 | Sonnet | S | none |
| WS6-05 | Lead member profiles with the voting record and an honest tally | Backlog | P1 | W0 | Sonnet | S | WS3-02 |
| WS6-04a | Put the address lookup in the home hero and remove the map preview | Backlog | P1 | W1 | Sonnet | S | WS6-01 |
| WS6-06 | Make Meetings a top-level destination and show agenda lines on meeting cards | Backlog | P1 | W2 | Sonnet | M | none |
| WS6-07 | Write meta descriptions that end on a word and never use unlabeled AI text | Backlog | P1 | W2 | Sonnet | S | none |
| WS6-08 | Add an axe check script and fix the audit's accessibility violations | Backlog | P1 | W2 | Sonnet | M | none |
| WS6-04b | Remove the remaining duplicate home sections and the lifetime-views ranking | Backlog | P1 | W2 | Sonnet | S | WS6-04a |
| WS6-09a | Split the bill page into server components with client islands | Backlog | P1 | W2 | Opus | M | WS3-01, WS3-03a, WS3-04, WS2-06a, WS6-03, WS6-08 |
| WS6-18 | Show how each member voted on a roll call | Backlog | P1 | W2 | Opus | M | WS6-09a, WS3-05a; soft: WS7-10 |
| WS6-09b | Lead the bill page with the plain-language summary and a version stamp | Backlog | P1 | W2 | Opus | M | WS6-09a, WS6-07 |
| WS6-10 | Make the home page and /bills follow the legislative calendar | Backlog | P1 | W2 | Sonnet | M | WS6-04b, WS6-06 |
| WS6-11a | Compute whole-session vote context for member profiles on the server | Backlog | P1 | W2 | Opus | M | WS3-02, WS3-04, WS6-05, WS6-07 |
| WS6-11b | Rebuild the member profile around key votes, with party shown as text | Backlog | P1 | W2 | Sonnet | M | WS6-11a, WS6-08 |
| WS6-12a | Add an email-link path for login, signup and the weekly email | Backlog | P1 | W2 | Opus | M | WS2-03 |
| WS6-12b | Let visitors follow a bill or committee with only an email address (optional) | Backlog | P2 | W2 | Opus | M | WS6-12a, WS6-02 |
| WS6-14 | Shorten /bills and /members on phones (optional) | Backlog | P2 | W2 | Sonnet | S | WS6-10 |
| WS6-15 | Remove post-hydration layout shift (optional) | Backlog | P2 | W2 | Sonnet | S | WS6-08 |
| WS6-16 | Run the axe check in CI with a no-regression baseline (optional) | Backlog | P2 | W2 | Sonnet | S | WS6-08, WS1-04 |
| WS6-17a | Raise body text size and add source links through tokens (optional) | Backlog | P2 | W2 | Sonnet | S | WS6-08 |
| WS6-17b | Decide the heading typeface and remove Typekit if chosen (optional) | Backlog | P2 | W2 | Sonnet | S | WS6-17a |
| WS6-19 | Run the pre-session product readiness drill | Backlog | P1 | FZ | Sonnet | S | WS6-04b, WS6-06, WS6-07, WS6-08, WS6-09b, WS6-10, WS6-11b, WS6-12a, WS6-18 |
| WS6-20 | Review session product usage and retire surfaces that did not earn their keep | Backlog | P1 | W4 | Sonnet | S | WS6-19, WS7-12, WS7-13 |

**Retired ID:** WS6-13 (legislator follows) moved to [Deferred](#deferred). The ID is not reused (retired-ID map in `TRACKER.md`).

### W2 cut line

All W2 WPs here are Backlog, so each needs the owner's go-ahead once W2's Core WPs are merged or blocked.

- **First tier (P1), in this order if picked up:** 06 / 07 / 08 (from 11-06) → 04b → 09a → 18 → 09b → 11a → 11b → 12a → 10. WS6-12a can run in parallel with the bill-page chain because they share no files. A first-tier WP not merged by the program's 12-07 cut line follows the manual's missed-window rule (tracker row `deferred`, a row in `DEFERRED.md`).
- **Optional list (second tier, P2):** WS6-12b, WS6-14, WS6-15, WS6-16, WS6-17a, WS6-17b. Pick one up only after the first tier. One that has not **merged by 2026-12-05** moves to Deferred, with its revisit trigger. Record it as "deferred" in WS6-19.
- **No site-wide visual or auth change opens after 2026-12-01** (WS6-12a/b, WS6-17a/b, WS6-15). After that date, only fixes to merged WS6 work.

---

### WS6-01 · Close the mobile gap on Find my legislators and bring results into view

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 | Sonnet | S | none | U7, T5, C8 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none in production. The geocoding calls per lookup do not change. Agent check: at most 5 Nominatim lookups, serial, at least 1 s apart.
- **Ongoing cost:** about 0.
- **Why:**
  - "Find my legislators" is the one behavior people actually use (T5), and use peaks before the 2026-11-03 election (C8).
  - On phones, a 216 px gap separates the address field from the Search button (U7).
  - The result cards render below a 420 px-tall map, so after a successful lookup a phone user sees no change on screen.
- **Current state (verified 2026-10-06):**
  - `src/components/members/DistrictMapExplorer.tsx`:
    - The form (~663–735) uses `flexDirection: { xs: 'column', sm: 'row' }`. The `Autocomplete` (~690) has `sx={{ flex: '1 1 260px', maxWidth: 480 }}`. In a column flex container, `260px` becomes a **height** basis, which causes the gap.
    - The map `Paper` (~770) is `height: { xs: 420, md: 560 }`.
    - The result `<Stack spacing={2}>` follows it (~854). Its first child is the result `Paper` (~856–893), then the member cards (~895–924). At `xs` the grid is one column (`gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' }`, ~765), so results render under the map.
    - `onSearch` (~376–428) sets the marker and `resolvedLabel`. A `?address=` query auto-runs a lookup (~601–608).
  - Existing sticky-header offsets: `scrollMarginTop: '80px'` in `src/components/committees/CommitteeDetailView.tsx` (~357) and `96` in `GlossaryBrowser.tsx` (~92).
  - The page shell is `src/app/members/map/page.tsx`, a server component with an island.
- **Do:**
  1. Change the Autocomplete `sx` to `{ flex: { xs: '0 0 auto', sm: '1 1 260px' }, width: { xs: '100%', sm: 'auto' }, maxWidth: { xs: 'none', sm: 480 } }`.
  2. Add a **new visible heading** as the first child of the result `Stack`, rendered only when at least one district resolved (`marker && (selectedHouseName || selectedSenateName)`): `<Typography component="h2" variant="subtitle2" tabIndex={-1} ref={resultHeadingRef}>Your legislators</Typography>`. Give it `sx={{ scrollMarginTop: '80px', outline: 'none' }}`.
  3. After a lookup that resolves at least one district from an address, a ZIP, a suggestion pick or the `?address=` auto-run (**not** a map click), and only when `window.matchMedia('(max-width: 1199.95px)').matches` (below `lg`, where results sit under the map):
     - call `resultHeadingRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })`, where `reduced` comes from `matchMedia('(prefers-reduced-motion: reduce)')`
     - then call `resultHeadingRef.current?.focus({ preventScroll: true })`
     - Run this in an effect keyed on the resolved districts, so it fires after the heading renders.
- **Don't:**
  - Change geocoding, the ZIP logic or the copy of existing alerts (U6 is owned by WS3-05a).
  - Change map height or layout at `lg` and above.
  - Add analytics events.
- **Acceptance criteria:**
  - [ ] At 390×844, the vertical gap between the address field's bottom edge and the Search button's top edge is ≤ 16 px. Screenshot attached.
  - [ ] At 390×844, after an address lookup, the "Your legislators" heading is in the viewport and is `document.activeElement`. Screenshot attached, or Owner check on the preview.
  - [ ] At 1440×900 the layout is unchanged apart from the new heading. Before and after screenshots attached.
  - [ ] `npx tsc --noEmit`, `npm run lint`, `npm test` and `npm run build` pass.
- **Verify:**
  - Plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - The lookup check needs anon env (the roster comes from Supabase) and uses the Nominatim fallback (budget above). Without anon env, the owner checks on the preview.
- **Owner actions:** on the preview, look up your own address on a phone and confirm that the result appears without scrolling.
- **Rollback:** `git revert`. No data change.

---

### WS6-02 · Make follow and signup copy match what an account actually does

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 | Sonnet | S | none | U10, T3, T5 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. The copy is fixed below and reviewed against `docs/voice-and-tone.md`. A Sonnet agent must not reword it.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0. **Folds in** these open TASKS.md items under "Signup-funnel design critique, filed 2026-09-16":
  - Tier A: "Bill page sends new visitors to the wrong door" and "Home 'Get notified' card links to login".
  - Tier D: "`SignupCta` hardcodes `#EFF6FF`".
  - Tier A "Signup is invisible on phones" moves to WS6-12a, which lands it together with the one-field email link.
- **Why:** The member profile says "Follow what Representative X sponsors", which promises a legislator follow that does not exist (U10). A first-time visitor on a bill or committee page sees "Log in to follow", which leads to a login page for an account they do not have. With 16 accounts in total (T3), the funnel's first step is the leak.
- **Current state (verified 2026-10-06):**
  - `src/components/members/MemberProfileView.tsx` ~443–450 renders `SignupCta` with title `` `Follow what ${legislatorRoleTitle(leg)} ${leg.last_name ?? leg.name} sponsors` ``. It sits **above** the sponsored-bills list (~451–465).
  - `src/components/members/DistrictMapExplorer.tsx` ~926–933 renders `SignupCta` with title "Keep up with your legislators" and body "With a free account you can follow the bills they sponsor and the committees they serve on, and get an email digest when something changes."
  - `src/lib/follow-labels.ts`: line 8 `signInToFollow: 'Log in to follow'`; line 20 returns it for `signed_out`; line 26 `followBillAriaLabel('signed_out')` returns `'Log in to follow this bill'`. No test file exists for it.
  - `src/components/bills/FollowBillButton.tsx` ~69: signed out links to `/auth/login?next=…`.
  - `src/components/committees/FollowCommitteeButton.tsx` ~67–80: signed out renders a `Button` to `/auth/login?next=/committees/${committeeId}` with the hard-coded text `Log in to follow` (~78). Its only caller is `CommitteeDetailView.tsx` ~298.
  - `src/components/home/landing-data.ts`: `LANDING_FEATURE_CARDS[2].href` is `'/auth/login'`.
  - `src/components/civic/SignupCta.tsx` ~42–50 has `bgcolor: '#EFF6FF'`.
- **Do:**
  1. In `follow-labels.ts`:
     - Replace `signInToFollow` with `signedOutFollow: 'Follow'` and add `signedOutCaption: 'Free account. Email when this changes.'`.
     - `followBillButtonLabel('signed_out')` returns `'Follow'`. `followBillAriaLabel('signed_out')` returns `'Sign up to follow this bill'`.
     - Add and export `signedOutFollowHref(kind: 'bill' | 'committee', id: string): string`, returning `/auth/register?next=` + `encodeURIComponent('/bills/' + id)` or `encodeURIComponent('/committees/' + id)`.
     - Update every reference (`grep -rn "signInToFollow" src`).
  2. `FollowBillButton.tsx` signed-out state: link to `signedOutFollowHref('bill', billId)`. Render `FOLLOW_COPY.signedOutCaption` under the button as `Typography variant="caption" color="text.secondary"`. Wrap the button and caption in a `Box` with `display: 'flex', flexDirection: 'column', alignItems: 'flex-end'`.
  3. `FollowCommitteeButton.tsx` signed-out state: label `FOLLOW_COPY.signedOutFollow`, `aria-label="Sign up to follow this committee"`, link to `signedOutFollowHref('committee', committeeId)`, and the same caption and wrapper as step 2.
  4. Member profile `SignupCta`:
     - title: exactly `Get email updates on these bills`
     - body: exactly `With a free account you can follow any bill listed here, one at a time, and get an email when it moves. Committees work the same way.`
     - Move it **below** the sponsored-bills list (or below the empty-state text).
  5. District-map `SignupCta` (**interim copy**, WS7-09f replaces the body in W2):
     - title: exactly `Get email updates on bills and committees`
     - body: exactly `With a free account you can follow individual bills and committees and get an email when they change.`
  6. Set `LANDING_FEATURE_CARDS[2].href` to `'/auth/register'`.
  7. `SignupCta.tsx`: replace `'#EFF6FF'` with `(theme) => alpha(theme.palette.primary.main, 0.06)` via `sx`, importing `alpha` from `@mui/material/styles`.
  8. Add `src/lib/follow-labels.test.ts`: the signed-out label, the aria label, and `signedOutFollowHref` for a bill and a committee (the `next` is encoded and starts with `/bills/` or `/committees/`).
- **Don't:**
  - Touch `src/app/auth/register/page.tsx` or any auth route. WS2-03 owns signup behavior.
  - Change follow API behavior.
  - Change the header nav (moved to WS6-12a).
  - Add a signup band to the home page.
  - Add analytics events or properties.
- **Acceptance criteria:**
  - [ ] `git grep -n "Follow what" src` prints nothing.
  - [ ] `git grep -n "Log in to follow" src` prints nothing.
  - [ ] `git grep -n "#EFF6FF" src/components/civic/SignupCta.tsx` prints nothing.
  - [ ] `follow-labels.test.ts` passes with at least 4 tests.
  - [ ] Signed out, `/committees/<slug>` shows "Follow" linking to `/auth/register?next=…` (screenshot from `npm run dev` with anon env, or Owner check on the preview).
  - [ ] Copy check (operating manual §7): the new strings have no em dash and no semicolon, and they use "Sign up" / "Log in".
  - [ ] tsc, lint, test and build pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. The bill-page signed-out link is proven by the `signedOutFollowHref` test. A bill page cannot render without Supabase env, and per the anon-env rule agents do not open bill pages locally before WS6-08.
- **Owner actions:** on the preview, signed out, select Follow on one bill and one committee and confirm that both land on the signup page.
- **Rollback:** `git revert`. No data change.

---

### WS6-03 · Stop probing the LRC site on every bill page view

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 | Sonnet | S | none | D3, O2, U13 (new evidence, see Findings re-checked) |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:**
  - LRC fetches go **down**. Today every bill page view triggers 1–3 uncached requests to `legislature.ky.gov`, from humans and crawlers alike.
  - After this change, a definitive answer is cached at the CDN for 30 days per bill and session, and an unknown answer for 1 hour. Each Vercel region may cache separately [verify region behavior in Vercel docs].
  - Agent budget: at most 2 LRC requests (one `curl` against `npm run start`). No tests are added, so no stubs are needed.
- **Ongoing cost:** removes load. No new file, schedule or helper. WS6-09a builds the tested helper once, so this W0 change is deliberately minimal.
- **Why:**
  - The LRC has no API, and our access is a courtesy (D3).
  - A route that hits the LRC for every bill view, including bot traffic (T6), breaks the politeness policy (manual §4).
- **Current state (verified 2026-10-06):**
  - `src/app/api/lrc/bill-link-status/route.ts`:
    - `export const dynamic = 'force-dynamic'` (line 4)
    - `UA = 'KnowYourVoteKentucky/1.0 (+https://kyvky.com)'` (line 7), with no job name
    - `urlReturns404` (~33–53) tries HEAD (then a ranged GET on 405/501), then a ranged GET, then a full GET, up to 3 requests, and returns a boolean. A thrown error and a definitive non-404 both return `false`.
    - The route returns `{ notFound }` with no cache headers.
  - `src/components/bills/BillDetailView.tsx` ~813–834: a `useEffect` calls the route 500 ms after mount on every view and hides the "Kentucky Legislature" link when `notFound === true`.
  - No other caller (`grep -rn "bill-link-status" src`).
- **Do:**
  1. In the route only:
     - Remove `force-dynamic`.
     - Set `UA` to `'KnowYourVoteKentucky/1.0 (+https://kyvky.com; bill-link-probe)'` (manual §4 pattern).
     - Replace `urlReturns404` with `probeStatus(url): Promise<'found' | 'not_found' | 'unknown'>`, a module-private function (route files may not export extra names). At most 2 attempts: HEAD, then a ranged GET only if HEAD returned 405 or 501 **or** threw. Status 404 → `'not_found'`. Any other status → `'found'`. Both attempts threw → `'unknown'`.
     - Respond `{ notFound: status === 'not_found' }`. For `'found'` and `'not_found'`, send `Cache-Control: public, s-maxage=2592000, stale-while-revalidate=86400`. For `'unknown'`, send `Cache-Control: public, s-maxage=3600`.
     - Keep 400 responses uncached.
     - Log one line per probe: `console.info(JSON.stringify({ evt: 'lrc_bill_link_probe', status }))`. WS6-09a's owner decision reads these counts.
  2. In `BillDetailView.tsx`, replace the 500 ms timer with `requestIdleCallback` (falling back to `setTimeout(…, 2000)`). Do not change what the link does.
- **Don't:**
  - Add a library file or tests (WS6-09a).
  - Move the probe server-side (WS6-09a).
  - Add new LRC URLs.
- **Acceptance criteria:**
  - [ ] `grep -n "force-dynamic" src/app/api/lrc/bill-link-status/route.ts` prints nothing.
  - [ ] `grep -n "bill-link-probe" src/app/api/lrc/bill-link-status/route.ts` shows the User-Agent.
  - [ ] Code review: no request path makes more than 2 `fetch` calls.
  - [ ] `curl -sI "localhost:3000/api/lrc/bill-link-status?legislation=HB500&session=2026%20Regular%20Session"` against `npm run start` shows `s-maxage=2592000` (or `3600` if the LRC was unreachable). Paste the header. [verify the exact query values the client sends, ~818–821]
  - [ ] tsc, lint, test and build pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, then `npm run start` and the one `curl` (1–2 LRC requests). No Supabase env needed.
- **Owner actions:** after deploy, request the same bill page twice from two browsers. In the Vercel dashboard's function logs or Observability [verify the menu path], confirm that the second request shows a cache HIT for `/api/lrc/bill-link-status`.
- **Rollback:** `git revert`.

---

### WS6-05 · Lead member profiles with the voting record and an honest tally

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W0 | Sonnet | S | WS3-02 | U11, C8, T5, U1 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Election and members-elect note.** Options:
  - (a) A dated, neutral note on member profiles and lookup results, in two variants. Before the election (until 2026-11-04) it points to the State Board of Elections for candidates. After the election (2026-11-04 until 2027-01-01) it says that newly elected members take office in January and that the page shows the legislators serving now.
  - (b) Only the pre-election variant.
  - (c) No note.

  **Recommended: (a).** The site lists only sitting legislators. A voter looking for challengers should be told so plainly before the election. From 2026-11-04 until the new members are seated, a lookup shows members who may have lost or retired, and nothing else explains that (honest sourcing). **Default if no answer by 2026-10-12: (a).**
- **Data-limit impact:** none.
- **Ongoing cost:** about 0. Both variants hide themselves by date, so no follow-up PR is needed unless WS9-13 finds the roster stale after 2027-01-01.
- **Why:**
  - People arrive from "find my legislator" (T5). Before 2026-11-03 they want to know how their representative voted (C8).
  - Today the profile shows sponsored bills and a large signup box **above** the voting record (U11).
  - The tally is computed from at most the 200 most recent roll calls (`maxRows: 200`), but the caption reads like a session total (new evidence, see Findings re-checked). During the election that misstates records.
  - WS3-02 makes the vote labels correct. This WP makes them the first thing on the page and makes the count honest.
- **Current state (verified 2026-10-06):**
  - `src/components/members/MemberProfileView.tsx` (673 lines):
    - The header `MemberCard` renders with `showDistrictMinimap={false}` (~388–395).
    - "Sponsored bills" section (~431), heading (~440), `SignupCta` (~443–450), then either the empty state, which renders `sessionSelector` inline (~454), or `MemberSponsoredBills` with `sessionSelector` as a prop (~460–464). These two branches are exclusive.
    - "Voting record" (~467–630), with the subtitle naming the session (~482).
    - Tally caption (~601–603), exactly: `Based on {voteRecord.totalRollCalls} roll call{s} with this member’s vote recorded.` (pluralized, curly apostrophe `&rsquo;`).
    - "Committee assignments" (~631–).
    - `sessionSelector` (~237–260) contains `<InputLabel id="member-session-label">Session</InputLabel>`.
    - No section has an `id` anchor.
  - `src/app/members/[slug]/page.tsx`: `revalidate = 300` (line 21). Line 87 calls `fetchMemberVoteRecord(leg, { sessionName, maxRows: 200, recentLimit: 8 })`.
  - `src/lib/member-profile-data.ts` `fetchMemberVoteRecord` (~293–370) returns `totalRollCalls: votes.length`. Rows are newest first, so when `votes.length === maxRows` the record is truncated.
  - The lookup cards are `DistrictMapAnimatedMemberCard` in `DistrictMapExplorer.tsx` (~166–194), which wraps `MemberCard` with `profileHref`. `MemberCard` accepts `footerContent`.
- **Do:**
  1. Reorder `MemberProfileView` sections to: header, **Voting record**, Sponsored bills, the `SignupCta` (after WS6-02, it sits after the sponsored list), Committee assignments.
  2. Render `sessionSelector` **once**, in the Voting record header row, to the right of the heading on `sm+` and under it on `xs`. Remove it from both Sponsored-bills branches (stop passing the prop to `MemberSponsoredBills`; leave the prop optional there). This keeps one `member-session-label` id in the DOM. The Sponsored bills subtitle already names the session.
  3. Add `id="voting-record"` and `sx={{ scrollMarginTop: '80px' }}` to the Voting record heading `Box`.
  4. In `DistrictMapAnimatedMemberCard`, pass `footerContent` with an MUI `Button variant="text" size="small" component={NextLink}` to `${memberProfilePath(leg)}#voting-record`, reading exactly `See how they voted`.
  5. Honest tally:
     - In `fetchMemberVoteRecord`, add `truncated: votes.length >= maxRows` to the returned `MemberVoteRecord` (and `false` in `emptyMemberVoteRecord`). Do **not** change `maxRows` (WS6-11a raises it with the needed query changes).
     - Add `src/lib/member-vote-caption.ts` with `voteTallyCaption(n: number, truncated: boolean, sessionName: string): string`:
       - truncated: `Based on the ${n} most recent roll calls in ${sessionName} with this member’s vote recorded.`
       - otherwise: `Based on ${n} roll call${n === 1 ? '' : 's'} in ${sessionName} with this member’s vote recorded.`
     - Use it for the caption (~601–603).
  6. Election note (decision (a)):
     - Create `src/lib/election-note.ts`, exporting `ELECTION_NOTE_PRE_UNTIL = Date.parse('2026-11-04T05:00:00Z')`, `MEMBERS_ELECT_NOTE_UNTIL = Date.parse('2027-01-01T05:00:00Z')` (terms begin in January [verify the start date in KY Const. §30 or with the LRC before merge]) and `electionNoteVariant(now: number): 'pre' | 'post' | null`.
     - Create `src/components/civic/ElectionRecordNote.tsx` (server-safe, no hooks) with props `variant: 'profile' | 'lookup'` and `now?: number`. It renders `Alert severity="info" variant="outlined"`, or `null` when `electionNoteVariant` returns `null`.
     - Copy, exactly:
       - pre, profile: `Kentucky's general election is November 3, 2026. This page shows this legislator's record in office. It does not list candidates. For candidates and polling places, see the Kentucky State Board of Elections.`
       - pre, lookup: `Kentucky's general election is November 3, 2026. These are the current legislators for this location. For candidates and polling places, see the Kentucky State Board of Elections.`
       - post, profile: `Members elected on November 3, 2026 take office in January 2027. This page shows the legislator serving now and their record in office.`
       - post, lookup: `Members elected on November 3, 2026 take office in January 2027. These are the legislators serving now. For election results, see the Kentucky State Board of Elections.`
     - Link "Kentucky State Board of Elections" to `https://elect.ky.gov/` [verify the URL resolves before merge] with `target="_blank" rel="noopener noreferrer"`.
     - Place the profile variant directly under the header card for chamber members. Place the lookup variant above the result cards when a district resolved.
     - The profile page has `revalidate = 300`, so the note can lag the cutoff by up to 5 minutes. That is acceptable.
  7. Tests:
     - `src/lib/election-note.test.ts`: `pre` at 2026-11-03T23:59:00-05:00, `post` at 2026-11-04T00:00:00-05:00, `post` at 2026-12-31T23:59:00-05:00, `null` at 2027-01-01T00:00:00-05:00.
     - `src/lib/member-vote-caption.test.ts`: truncated, not truncated, and `n = 1`. The caption never contains "all" when truncated.
- **Don't:**
  - Change vote labels (WS3-02) or `maxRows` (WS6-11a).
  - Add party-line context or key votes (WS6-11a/b).
  - Name any candidate, party, race or result.
  - Add analytics.
- **Acceptance criteria:**
  - [ ] On a House member profile, the "Voting record" heading precedes "Sponsored bills" in DOM order (`document.querySelectorAll('h2')`).
  - [ ] `document.querySelectorAll('#member-session-label').length === 1`.
  - [ ] `/members/<slug>#voting-record` scrolls to the voting record, with its heading not hidden under the sticky header.
  - [ ] The lookup result cards show "See how they voted".
  - [ ] At least 7 new tests pass. The copy has no em dash or semicolon.
  - [ ] tsc, lint, test and build pass. Screenshots at 390 px and 1440 px attached (anon env), or Owner check on the preview.
- **Verify:**
  - Plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - Profile screenshots need anon env (profiles make no LRC calls or writes), or the owner checks on the preview.
- **Owner actions:**
  1. Answer the decision by 2026-10-12, and confirm the term start date.
  2. After 2026-11-04, confirm that one profile shows the post-election variant. After 2027-01-01, confirm that it is gone. If WS9-13 finds the roster not yet updated, extend `MEMBERS_ELECT_NOTE_UNTIL` in a one-line W3 PR.
- **Rollback:** `git revert`, or set either date constant to a past date to hide a variant.

---

### WS6-04a · Put the address lookup in the home hero and remove the map preview

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W1 | Sonnet | S | WS6-01 | U4, U13, U15, U12, T5, C8 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:**
  1. **Home H1.** Options:
     - (a) H1 `Find your Kentucky legislators and see how they vote`, with the existing slogan kept as a small line above it.
     - (b) Keep the slogan as the H1.

     **Recommended: (a).** It names the task people come for (T5) and adds "Kentucky" and "legislators" to the H1 (U15). The voice guide allows the slogan on marketing surfaces, so it stays as a kicker. **Default if no answer by 2026-10-15: (a).**
  2. **Interim copy about pre-filing.** The banner says interim committees "pre-file bills for the next session", and the glossary tooltip says "legislators may pre-file bills". The market audit says prefiling was abolished in 2022 (U12) [verify against LRC]. Options:
     - (a) Use the neutral lines below in both places. They are true either way.
     - (b) Keep the current lines.

     **Default if no answer by 2026-10-15: (a).**
- **Data-limit impact:** Mapbox map loads go **down**: the home page no longer mounts Mapbox GL (D4, about 50k free loads). No LegiScan, Open States, LRC or Anthropic calls.
- **Ongoing cost:** goes **down**. Deletes `LandingHeroCtas`, `LandingMapSection`, `LandingDistrictMapPreview` and `HomeSearchSection`. Adds one small client form.
- **Why:**
  - Home has three search boxes and feature cards that repeat the hero CTAs (U4).
  - The H1 has no Kentucky or legislature keyword (U15).
  - A live Mapbox preview makes desktop home 4.4 MB (U13).
  - The interim banner sends people to the LRC even though `/meetings` has 91 upcoming meetings (U4, U17).
  - One address field in the hero serves the real job (T5) at peak demand (C8). **Target merge: 2026-10-28.** Hard deadline: 2026-10-30 (WS9-03 freeze).
- **Current state (verified 2026-10-06):**
  - `src/app/page.tsx` (`revalidate = 60`) fetches `fetchKyCurrentSessionBillCount`, `fetchHomeTrendingBills`, `fetchHomeLatestActionBills` and `fetchKyActiveLegislatorRosterSlim` in one `Promise.all` (~30–35), then renders `SessionBannerServer` and `HomePageContent` with `HomeAuthHero` (marketing `LandingHero` versus `LandingHeroReturning` + `LandingPersonalStrip`).
  - `src/components/home/HomePageContent.tsx` renders `LandingFeatures`, `LandingMapSection`, `HomeSearchSection`, two `HomeBillCarousel`s and `LandingTopics`.
  - `src/components/home/LandingHero.tsx`: H1 "Your vote doesn't stop at the ballot box." plus `LandingHeroCtas` ("Find my legislators" → `/members/map`, "Browse bills").
  - `LandingMapSection.tsx` (~24–52) mounts `LandingDistrictMapPreview` (Mapbox GL) through an IntersectionObserver with a 100 px margin, and has an address form that routes to `/members/map?address=`.
  - Importers of the four components are only each other, `LandingHero.tsx` and `HomePageContent.tsx` (`grep -rln "LandingDistrictMapPreview\|HomeSearchSection\|LandingMapSection\|LandingHeroCtas" src`).
  - `src/lib/ky-session-banner.ts` (`getSessionBannerModel`): `showLrcLink` is `true` for `veto_recess` (~43), `final_days` (~52), interim (~72) and the fallback (~82), and `false` for a regular in-session day (~59). The interim `contextLine` (~70–71) contains "pre-file bills for the next session". No test file exists.
  - `src/components/home/SessionBannerServer.tsx` links to `LRC_LEGISLATIVE_CALENDAR_URL` when `showLrcLink`.
  - `src/lib/tooltipContent.ts` `interim_period.content` (~444) contains "and legislators may pre-file bills for the next session".
- **Do:**
  1. `LandingHero.tsx` (option (a)):
     - Kicker `Typography variant="overline" component="p"`: `Your vote doesn't stop at the ballot box.`
     - H1: `Find your Kentucky legislators and see how they vote`
     - Subtitle: `Enter your address to see your state House member and senator, how they voted, and the bills they sponsor.`
     - Then a new **client** island `src/components/home/HeroAddressForm.tsx` (the rest of the hero stays a server component):
       - a `TextField` labelled `Address or ZIP code`, placeholder `Enter your address or ZIP code`
       - a contained submit `Button` reading `Find my legislators`
       - on submit, `router.push('/members/map?address=' + encodeURIComponent(q.trim()))`, or `/members/map` when empty
       - field and button stack vertically at `xs` with no flex basis in the column (the WS6-01 rule)
     - Below the form, a text link `Browse bills` → `/bills`.
  2. Delete `LandingHeroCtas.tsx`, `LandingMapSection.tsx`, `LandingDistrictMapPreview.tsx` and `HomeSearchSection.tsx`, and remove their usages. Keep `LandingFeatures` for WS6-04b.
  3. Banner link:
     - In `ky-session-banner.ts`, replace `showLrcLink: boolean` with `link: 'meetings' | 'lrc' | null`. Interim and fallback → `'meetings'`. `veto_recess` and `final_days` → `'lrc'` (the LRC calendar is the authoritative schedule for reconvening). Regular session day → `null`.
     - In `SessionBannerServer.tsx`: `'meetings'` renders a Next `Link` to `/meetings` reading exactly `See upcoming committee meetings`. `'lrc'` keeps today's LRC link and text.
  4. Under decision 2 (a):
     - interim `contextLine`, exactly: `Between regular sessions. Interim joint committees meet to study issues before the next session.`
     - `tooltipContent.ts` `interim_period.content`: remove the clause `, and legislators may pre-file bills for the next session`, so the sentence ends `…meet monthly in Frankfort to study issues and take testimony.`
  5. Create `src/lib/ky-session-banner.test.ts` with fixed dates:
     - 2026-10-06 → interim, `link === 'meetings'`, `contextLine` does not contain "pre-file"
     - 2027-01-06 → regular session, `link === null`
     - 2027-03-15 → veto recess, `link === 'lrc'` [verify against `KY_SESSIONS[0].milestones`]
- **Don't:**
  - Change `LandingHeroReturning` or `LandingPersonalStrip` (signed-in).
  - Change `/members/map`.
  - Touch `LandingFeatures`, the carousels or `ky-home-bill-highlights.ts` (WS6-04b).
  - Add analytics. `district_map_lookup` already fires on the map page.
  - Change `buildPageMetadata` for `/`.
- **Acceptance criteria:**
  - [ ] `git ls-files src/components/home | grep -E "LandingMapSection|LandingDistrictMapPreview|HomeSearchSection|LandingHeroCtas"` prints nothing.
  - [ ] On `npm run start` with no env, a Playwright request log while loading `/` and scrolling to the bottom shows no request to `api.mapbox.com`. Paste the count.
  - [ ] The home H1 contains "Kentucky" and "legislators" (option (a)).
  - [ ] Submitting `40004` in the hero lands on `/members/map?address=40004`.
  - [ ] `ky-session-banner.test.ts` passes with 3 tests. `git grep -n "pre-file" src` prints nothing under decision 2 (a).
  - [ ] If WS5-02 has merged, `repo-orphans.test.ts` passes.
  - [ ] The copy has no em dash or semicolon. tsc, lint, test and build pass.
- **Verify:**
  - Plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, `npm run start`.
  - Screenshots at 390 px and 1440 px. These need no secrets: home renders without Supabase, and the carousels hide when empty.
- **Owner actions:** answer the two decisions by 2026-10-15. Merge by 2026-10-28. After deploy, check `/` on a phone.
- **Rollback:** `git revert`, which restores the components. No data change.

---

### WS6-06 · Make Meetings a top-level destination and show agenda lines on meeting cards

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | M | none | U17, U4, U5, N5 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none external. Per cache fill (`unstable_cache`, existing 300 s revalidate): one bounded Supabase SELECT of upcoming meetings, plus agenda-item SELECTs in chunks of 20 meeting ids (at most about 400 rows each).
- **Ongoing cost:** goes **down** slightly: the custom Committees dropdown (`CommitteesNavItem`, about 120 lines) is deleted, and the agenda-preview fetch becomes one shared module instead of a second copy.
- **Why:**
  - Between sessions, meetings are the best live content. Agendas list 5–20 items, yet `/meetings` is hidden under a Committees hover menu and its cards show no agenda (U17, U5).
  - The card component already supports a preview. The page never passes one.
- **Current state (verified 2026-10-06):**
  - `src/app/components/Navigation.tsx`: `navLinks` (~62–95) nests `{ href: '/meetings' }` under Committees as `children`. `CommitteesNavItem` (~139–260) implements the hover/caret dropdown. The mobile drawer renders the children [verify ~600–660].
  - `src/components/committees/CommitteeMeetingCard.tsx` accepts `agendaPreview?: string[]` (~26) and renders the first 2 lines plus "+N more" (~126–155).
  - `MeetingsBrowse.tsx` ~566 and `MeetingsCalendar.tsx` ~381 render `CommitteeMeetingCard` without `agendaPreview`.
  - `src/lib/ky-ga-browse-server.ts` ~32–59: the private `getCachedMeetingsBrowseWindow` (exported as `fetchKyMeetingsBrowseWindow`, ~67) selects `KY_MEETING_BROWSE_SELECT` (no agenda) from **30 days back, or the most recent session start if earlier** (today 2026-01-06, about 9 months back), through 120 days ahead, `order('meeting_date', ascending)`, `limit(500)`. If that window holds more than 500 rows, the **upcoming** meetings are the ones cut off.
  - `src/lib/ky-committees-browse-enriched.ts` ~64–92: the private `fetchAgendaPreviewsForMeetings(meetingIds)` returns `Map<string, KYCommitteeAgendaPreviewLine[]>` (`{ raw, ky_bill_id }`, type at ~31). It selects **all** items of the given meetings in one request and keeps 3 per meeting in JS. With many meetings this can exceed PostgREST's row cap [verify `max_rows` in Supabase API settings, typically 1000].
- **Do:**
  1. Nav:
     - Make Meetings a top-level primary item between Committees and Find my legislators: `{ href: '/meetings', label: 'Meetings', icon: <CalendarMonth />, priority: 'primary' }`.
     - Remove `children` from Committees, and delete `CommitteesNavItem` and its usage. Committees renders like the other buttons.
     - Check the desktop nav at 1024 px and 1280 px for overflow. If it overflows at 1024 px, hide the icons or reduce `px` from 2 to 1.5 at `md`.
  2. Create `src/lib/ky-meeting-agenda-preview.ts` (server-only) and move `fetchAgendaPreviewsForMeetings` and `AGENDA_PREVIEW_ITEMS_PER_MEETING` into it, keeping the return type `Map<string, KYCommitteeAgendaPreviewLine[]>` (move the type too, re-exported from its old module). Inside it:
     - Split `meetingIds` into chunks of 20 with a pure `chunk<T>(items: T[], size: number): T[][]` and run the chunks with `Promise.all`.
     - Extract the per-row loop into a pure `pickAgendaPreviewLines(rows, perMeeting)`.
     - `ky-committees-browse-enriched.ts` imports from the new module. `/committees` behavior must not change.
  3. In `ky-ga-browse-server.ts`, add and export `fetchKyUpcomingMeetingsWithAgenda(days = 21)`, wrapped in its own `unstable_cache` (key `['ky-meetings-upcoming-agenda', String(days)]`, same revalidate):
     - Select `KY_MEETING_BROWSE_SELECT` where `meeting_date` is between today (`kyTodayIso()`) and today + `days`, `status` is not `'cancelled'` [verify the column value], ordered ascending, `limit(200)`.
     - Fetch previews for those ids, and attach `agenda_preview: string[]` built as `lines.map((l) => l.raw)`. Add the optional field to `KYCommitteeMeetingBrowse` (`src/types/kentucky.ts` ~194).
  4. In `fetchKyMeetingsBrowseWindow`'s consumer path (`src/app/meetings/page.tsx` ~28), call both and merge: for each meeting in the window, set `agenda_preview` from the upcoming map by id. Upcoming meetings missing from the window (because of `limit(500)`, N5) are appended. Note it under "Found, not fixed" for WS3-06a's owner. Do not change the window query itself.
  5. Pass `agendaPreview={meeting.agenda_preview}` in `MeetingsBrowse.tsx` and `MeetingsCalendar.tsx`. Never for cancelled meetings.
  6. Tests in `src/lib/ky-meeting-agenda-preview.test.ts`: `chunk` splits 45 ids into 3 calls (20, 20, 5); `pickAgendaPreviewLines` caps per meeting, keeps `sort_order` order, and skips lines that are blank after `normalizeKyGaAgendaLine`.
- **Don't:**
  - Change cancelled or duplicate filtering (WS3-06a/b).
  - Change the agenda search mode (`?q=`).
  - Add a page, a cron or a sync.
- **Acceptance criteria:**
  - [ ] Desktop and mobile nav show "Meetings" as a top-level item. `grep -n "CommitteesNavItem" src/app/components/Navigation.tsx` prints nothing.
  - [ ] With anon env, at least 3 upcoming meeting cards on `/meetings` show agenda lines. Screenshot attached, or Owner check on the preview.
  - [ ] `/committees` cards show the same previews as before (before and after screenshot).
  - [ ] At least 4 new tests pass. tsc, lint, test and build pass.
  - [ ] The PR's "Findings re-checked" cites N5 and says whether the window still exceeds 500 rows (Owner count, if available).
- **Verify:**
  - Plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - Screenshots need anon env (meetings pages make no writes or LRC calls), or the owner checks on the preview.
- **Owner actions:** on the preview, check `/meetings` for one week with known agendas.
- **Rollback:** `git revert`. No data change.

---

### WS6-07 · Write meta descriptions that end on a word and never use unlabeled AI text

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | S | none | A5, U15, C4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. The WS3 interface already rules that meta text may not carry an unlabeled AI summary.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0. It adds two tested helpers.
- **Why:**
  - Search snippets are the site's front door (T4).
  - Bill meta descriptions are cut mid-word ("…details Pa", A5). When there is no description, they fall back to the AI summary with no label.
  - AI tools that cite the site (C4) would present that summary as official text. JSON-LD `Legislation.description` uses the same fallback.
- **Current state (verified 2026-10-06):**
  - `src/app/bills/[id]/page.tsx` `generateMetadata` (~24–52): `body = description || ai_summary || title`, then `` `Kentucky ${spacedNumber}, ${sessionLabel}. ${body}` `` and `.slice(0, 160)`.
  - `src/lib/structured-data.ts` ~71–85: `description = bill.description || bill.ai_summary || …`, then `.slice(0, 5000)`.
  - `src/lib/bill-display.ts` ~99–117: `kyBillSeoCatchline(title, maxLen)` already cuts at a word boundary.
  - `src/lib/seo.ts`: `buildPageMetadata` passes `description` through. No `seo.test.ts` exists.
- **Do:**
  1. In `src/lib/seo.ts`, add and export:
     - `firstSentence(text: string | null | undefined): string`. Split at the first `. `, `? ` or `! ` that is not part of a common abbreviation: `KRS`, `Ch.`, `Sec.`, `No.`, `U.S.`, `Ky.`, `etc.`, and single capital letters. Trim. Empty input → `''`.
     - `clampMetaDescription(text: string, max = 155): string`. Collapse whitespace. If the length is at most `max`, return it. Otherwise cut at the last space at or before `max - 1`, strip trailing `,;:-`, and append `…`.
     - `buildBillMetaDescription(bill: Pick<KYBill, 'bill_number' | 'session' | 'title' | 'description'>): string`, a pure function: `body = firstSentence(bill.description) || kyBillSeoCatchline(bill.title, 140)`, then `clampMetaDescription(\`Kentucky ${spacedNumber}${sessionLabel ? \`, ${sessionLabel}\` : ''}. ${body}\`)`. Its type has no `ai_summary`, so it cannot read it.
  2. `generateMetadata` calls `buildBillMetaDescription(bill)`.
  3. `structured-data.ts`: remove `bill.ai_summary` from the `description` fallback chain. Keep `description`, then the title.
  4. Tests in `src/lib/seo.test.ts`:
     - a 300-character digest gives ≤ 155 characters ending with `…`, with no partial word before it
     - a short description is unchanged
     - `clampMetaDescription` strips a trailing comma before the ellipsis
     - `firstSentence` keeps "KRS 186.010." intact inside a sentence
     - an empty description falls back to the catchline
     - `buildBillMetaDescription` given an object that also has `ai_summary: 'AI TEXT'` (cast) returns text that does not contain `AI TEXT`
- **Don't:**
  - Change titles or canonical URLs.
  - Change member, committee or district metadata (template strings, verified fine).
  - Add AI-written meta text.
- **Acceptance criteria:**
  - [ ] `git grep -n "ai_summary" src/app/bills/\[id\]/page.tsx src/lib/structured-data.ts` prints nothing.
  - [ ] At least 6 new tests pass.
  - [ ] After WS2-06a has merged, on `npm run start` with anon env, `curl -s localhost:3000/bills/<HB500 2026 slug> | grep -o '<meta name="description"[^>]*>'` shows a description ending on a whole word or `…`. Paste it. (A server `curl` runs no browser effects.) Otherwise the owner runs it against the preview.
  - [ ] tsc, lint, test and build pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- **Owner actions:** none. Search engines refresh snippets on their own schedule.
- **Rollback:** `git revert`.

---

### WS6-08 · Add an axe check script and fix the audit's accessibility violations

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | M | none | U14, U9, U13 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:**
  - The script drives a local Chromium against `localhost` or an owner-supplied preview URL. It **aborts** every request to analytics, error reporting, Mapbox, the LRC and the view-count RPC (step 2), so a run makes 0 LRC requests, 0 production writes and 0 PostHog events.
  - New **devDependencies** only: `@axe-core/playwright` and `playwright` (Chromium download about 150 MB). No vendor account.
- **Ongoing cost:** small but real: two devDependencies that release often, and one script that WS6-09a/b, 11b, 15, 16, 17a and 19 reuse. No schedule. **Folds in** TASKS.md "Signed-in mobile a11y sweep" for the signed-out routes. The signed-in part stays deferred.
- **Why:**
  - axe-core found contrast failures (6 on home, 20 on `/bills`, 4 on HB500), 34 `aria-prohibited-attr` on HB500, heading-order errors and a 1.79:1 initials avatar (U14).
  - Party is conveyed by a small colored badge whose letter is `aria-hidden`, so screen readers never hear a legislator's party (U9).
  - A civic site that partners will audit must pass basic automated checks (O3, O4).
- **Current state (verified 2026-10-06):**
  - No axe or Playwright dependency in `package.json`. `npm test` runs `node --import tsx --test "src/**/*.test.ts"`.
  - `src/components/bills/BillDetailView.tsx` `VoteTallyBar` (~293–318): the container is `role="img"` with an `aria-label`. Each segment is wrapped in `MuiTooltip` with a string `title`, which sets `aria-label` on a role-less `Box`. That is the likely source of `aria-prohibited-attr` [verify with the script].
  - `src/components/members/LegislatorAvatar.tsx` ~62–86: the party badge `Box` is `aria-hidden`, with white text at 0.55–0.62 rem on `partyBadgeBackgroundColor(party)`.
  - `src/lib/theme.ts` has no `MuiAvatar` override. MUI's default `colorDefault` background (grey 400) with white initials gives about 1.8:1.
  - Typography tokens (~139–157): `body2` and `caption` use `slate[600]`. `text.disabled` (`slate[400]`) is documented as failing AA as text.
  - `src/lib/bill-display.ts` exports `formatPartyLabel` (~322).
  - The repo-root `README.md` ~68–82 has a "Maintenance scripts" table. Its intro line says "There is no Jest/Vitest suite" (WS1-04 rewrites that line).
- **Do:**
  1. Add devDependencies `playwright` and `@axe-core/playwright`, pinned to exact versions.
  2. Create `scripts/a11y-check.ts`, run with `tsx`, and add the npm script `"a11y": "tsx scripts/a11y-check.ts"`. Behavior:
     - Args: `--base-url` (default `http://localhost:3000`), `--routes` (comma list, default `ENV_FREE_ROUTES`), `--json <path>`, `--metrics`, `--baseline <path>` (parsed; enforcement added by WS6-16).
     - `ENV_FREE_ROUTES = ['/', '/about', '/guides', '/guides/find-your-kentucky-legislator', '/glossary', '/auth/login', '/auth/register', '/members/map', '/bills', '/meetings']`.
     - `DATA_ROUTES` documented in the header, for a preview or anon env: `/bills/<HB500 2026 slug>`, `/bills/<SB197 2026 slug>`, one House member profile, `/members`, `/committees`, `/search?q=education`.
     - **Request blocking (required).** Before navigation, `context.route` aborts any request whose URL matches: `posthog`, `sentry`, `api.mapbox.com`, `legislature.ky.gov`, `/api/lrc/` and `/rest/v1/rpc/ky_increment_bill_view`. Count the aborts by pattern and print them after the table.
     - For each route at 390×844 and 1440×900: `goto` with `waitUntil: 'networkidle'`, then run AxeBuilder with tags `wcag2a, wcag2aa, wcag21a, wcag21aa`, excluding `.mapboxgl-canvas`.
     - Print a table of route × impact counts and the top rule IDs.
     - Exit 1 on any `critical` or `serious` violation when no `--baseline` is given.
     - `--metrics` also records CLS (`PerformanceObserver('layout-shift')`, summed, excluding `hadRecentInput`, and logging each shift's `sources` node names) and the JS bytes transferred per route (`page.on('response')`, JavaScript content types). It prints both.
     - Header comment: no secrets; the only network target is the base URL; do not point it at production more than once per PR, and only with blocking on.
  3. Fix, then re-run until the env-free routes have 0 critical and 0 serious:
     - **Tally segments:** mark the segment boxes `aria-hidden`. Replace the per-segment `MuiTooltip`s with one tooltip on the container whose title lists all segments, or remove them. Keep the container's `role="img"` and `aria-label`.
     - **Avatar:** add `MuiAvatar: { styleOverrides: { colorDefault: { backgroundColor: slate[600], color: '#FFFFFF' } } }` to `lightTheme.components` (about 7.6:1).
     - **Party (U9):** in `LegislatorAvatar`, replace `aria-hidden` on the badge with `role="img"` and `aria-label={formatPartyLabel(party)}`. In `MemberCard`'s role or subtitle line, append `` ` · ${formatPartyLabel(leg.party)}` `` when known, so party also appears as visible text. Check the profile header, the lookup cards and the `/members` cards.
     - **Contrast:** fix each reported node through tokens: `text.secondary` (slate 700) or `text.tertiary` instead of `text.disabled`, and `color` props rather than opacity over images. Do not shrink text or remove content to pass.
     - **Heading order:** fix with `component=` only (no visual change).
  4. Data routes: if the owner provides a preview URL, or anon env exists and WS2-06a has merged, run `npm run a11y -- --base-url <url> --routes <DATA_ROUTES>` once. Fix what it reports in files this WP already touches. List the rest under "Found, not fixed" with route and rule.
  5. Add one row for `npm run a11y` to the repo-root `README.md` "Maintenance scripts" table (~68–82), after WS1-04's rewrite of the intro line.
- **Don't:**
  - Add the CI job (WS6-16).
  - Change copy beyond `aria-label`s and the party suffix.
  - Change chart colors in ways that alter meaning (yea green, nay red).
  - Restyle pages.
- **Acceptance criteria:**
  - [ ] `npm run a11y` against `npm run start` (no env) exits 0, with 0 critical and 0 serious on `ENV_FREE_ROUTES`. Paste the table.
  - [ ] The same run prints the blocked-request counts. A request log shows 0 requests reached the blocked hosts.
  - [ ] On a data run, HB500 shows 0 `aria-prohibited-attr` and the avatar initials pass contrast. Paste the output, or mark it as an owner check.
  - [ ] The axe tree shows an accessible name of "Republican" or "Democrat" for a legislator avatar badge.
  - [ ] Party text is visible on `/members` cards and on the profile header. Screenshot attached (anon env or preview).
  - [ ] tsc, lint, test and build pass.
- **Verify:**
  - Plain container: `npx playwright install chromium` (downloads through the agent proxy [verify that the proxy allows the Playwright CDN]), `npm run build && npm run start &`, then `npm run a11y`. Also `npx tsc --noEmit`, `npm run lint`, `npm test`.
  - The data-route run needs a preview URL or anon env.
- **Owner actions:** paste a Vercel preview URL into the PR. If Vercel Deployment Protection blocks the script, run it yourself while logged in [verify the protection setting].
- **Rollback:** `git revert`, which removes the devDependencies and the script. Theme changes revert with it.

---

### WS6-04b · Remove the remaining duplicate home sections and the lifetime-views ranking

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | S | WS6-04a | U4, U13, E4, S6 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:**
  - One Supabase `count` query per home render goes away (`fetchKyCurrentSessionBillCount`).
  - The PostHog HogQL call that ranks trending bills is unchanged: one call per hour, cached.
  - No LegiScan, Open States, LRC or Anthropic calls.
- **Ongoing cost:** goes **down**.
  - Deletes `LandingFeatures`, `HoverLottie.tsx` and the `lottie-react` dependency (if unused).
  - Deletes the `view_count` fallback ranking (`fetchMostViewedFallback`).
  - **Folds in** TASKS.md "Two search-button patterns on the home page" and "Feature-card body 'House + Senate rep'" (both resolved by deletion).
- **Why:**
  - The feature cards repeat the hero CTAs (U4).
  - "Most viewed bills" falls back to lifetime views, which WS2-06a froze (U4, S6).
  - After WS2-06a, the bill prerender list (`fetchTopBillSlugsForPrerender`) is ordered by a frozen `view_count`. In January every 2027 bill has a count of 0, so the order is arbitrary.
- **Current state (verified 2026-10-06; re-check after WS6-04a):**
  - `HomePageContent.tsx` renders `LandingFeatures currentSessionBillCount={…}`. `src/app/page.tsx` fetches the count only for it (~31, ~43).
  - `HoverLottie` importers: `LandingFeatures.tsx` only, after WS6-04a deleted `LandingHeroCtas.tsx` (`grep -rln "HoverLottie\|lottie" src`).
  - `src/lib/ky-home-bill-highlights.ts`: `fetchHomeTrendingBills` (~153) uses PostHog unique visitors over the past day. It falls back to `fetchMostViewedFallback` (~140), ordered by `view_count`, when credentials are missing or fewer than 3 bills resolve. It returns `metric: 'visitors' | 'views'`. "Recent legislative action" already hides after 30 quiet days (`LATEST_ACTION_WINDOW_DAYS`).
  - `src/lib/sitemap-data.ts` ~66–80 `fetchTopBillSlugsForPrerender(limit = 100)` orders by `view_count`. It feeds `generateStaticParams` in `src/app/bills/[id]/page.tsx` (~17–20).
  - `KYBill.last_action_date` exists (`src/types/kentucky.ts` ~99).
- **Do:**
  1. Delete `LandingFeatures.tsx`. Remove its usage, the `currentSessionBillCount` prop from `HomePageContent`, and the `fetchKyCurrentSessionBillCount()` call and import in `src/app/page.tsx`. Leave the function in `ky-bills-browse-server.ts` if anything else imports it, otherwise delete it.
  2. Remove `LANDING_FEATURE_CARDS` from `landing-data.ts` if it becomes unused.
  3. If `grep -rln "HoverLottie" src` is then empty: delete `src/components/ui/HoverLottie.tsx`, remove `lottie-react` from `package.json`, and run `npm install`. Keep `public/lottie/*.json` (the welcome-email item may reuse them).
  4. "Most viewed":
     - Delete `fetchMostViewedFallback`. `fetchHomeTrendingBills` returns `{ bills: [], metric: 'visitors' }` when PostHog is unavailable **or** fewer than 3 bills resolve.
     - Render the carousel only when it has bills, titled `Most viewed in the past day`.
     - Leave `ky_bills.view_count` in the schema (WS2-06b).
  5. In `fetchTopBillSlugsForPrerender`, order by `last_action_date` descending (nulls last) instead of `view_count`, and select `id, bill_number, session` only. Update its comment.
  6. Order of sections after this WP: banner, hero, "Recent legislative action" (when present), "Most viewed in the past day" (when present), `LandingTopics`.
  7. Add a test for the trending threshold if `fetchHomeTrendingBills`'s ranking logic is pure enough to extract (`rankTrending(rows, min = 3)`). Otherwise note "no pure seam" in the PR.
- **Don't:**
  - Change the hero (WS6-04a) or signed-in components.
  - Add a signup band or new sections (WS6-10).
  - Drop `view_count` or touch `ky_increment_bill_view` (WS2-06b).
- **Acceptance criteria:**
  - [ ] `git ls-files src/components/home | grep -E "LandingFeatures"` prints nothing.
  - [ ] `git grep -n "fetchMostViewedFallback\|Most viewed bills\|fetchKyCurrentSessionBillCount" src/app src/components src/lib/ky-home-bill-highlights.ts` prints nothing.
  - [ ] `git grep -n "view_count" src/lib/sitemap-data.ts src/lib/ky-home-bill-highlights.ts` prints nothing.
  - [ ] Home first-load JS before and after is reported in the PR (from `next build` output, or `npm run a11y -- --metrics --routes /`).
  - [ ] If WS5-02 has merged, `repo-orphans.test.ts` passes. tsc, lint, test and build pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, `npm run start`, plus screenshots at 390 px and 1440 px.
- **Owner actions:** none.
- **Rollback:** `git revert`, which restores the components, the dependency and the old ordering. No data change.

---

### WS6-09a · Split the bill page into server components with client islands

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS3-01, WS3-03a, WS3-04, WS2-06a, WS6-03, WS6-08 | E10, U13, U2, D3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Keep or drop the official-link probe.** It exists to hide the "Kentucky Legislature" link when the LRC page returns 404. Options:
  - (a) Delete the probe and always show the link. The site then makes no LRC calls for it.
  - (b) Keep it as a server-side cached check (step 3).

  **Evidence:** the `lrc_bill_link_probe` log lines from WS6-03 (counts of `found`, `not_found`, `unknown`). **Recommended:** (a) if `not_found` is under 2% of probes, else (b). **Default if no answer by 2026-11-18: (b).** Both options delete `/api/lrc/bill-link-status`.
- **Data-limit impact:**
  - LRC under (b): at most 1–2 requests per bill and session per 30 days at runtime, and **0 at build time** (step 3). Expected per deploy: 0. Expected per month: at most the number of distinct bills viewed, at 2 requests each. Under (a): 0.
  - Whether Next's data cache survives a new Vercel deployment is [verify in Vercel docs]. If it does not, each deploy re-probes bills as they are viewed, still at most 2 per bill.
  - Agent budget: 0 LRC requests (tests stub `fetch`).
- **Ongoing cost:** goes **down**. A 1,269-line `'use client'` file becomes a server composition with named client islands, pure logic gains tests, and one API route is deleted.
- **Why:**
  - The most-visited page type ships its whole tree as client JS: 86 inline `sx` props and 8 inlined sub-components (E10). First-load JS is 380–407 kB gzipped (U13).
  - WS6-09b (layout) and WS6-18 (per-member votes) need a page they can change safely.
  - `effectiveStatus`, which decides what a bill's status chip says, has no test.
- **Current state (verified 2026-10-06; re-check after WS3-01, WS3-03a, WS3-04 and WS2-06a merge):**
  - `src/components/bills/BillDetailView.tsx` (1,269 lines, `'use client'` at line 1):
    - inlined helpers still local after WS3-01: `textDateOrNull` (~136), `fmtDate` (~148). WS3-01 moves `rollCallChamberFromDesc`, `deriveRollCallLabel` and `matchVotesToHistory` to `src/lib/roll-call-label.ts`.
    - local components: `VoteCountChip` (~245), `VoteTallyBar` (~293), `InlineRollCall` (~325), `SponsorCard` (~402), `BillTextVersionsList` (~533), `HistoryTimeline` (~634, uses `useTooltips()` at ~644)
    - the `effectiveStatus` IIFE (~891–910)
    - local client-only needs: `useRouter` (Back button), `useTheme` (alpha colors), the LRC probe `useEffect` (~813–834), `HistoryTimeline` expand/collapse state, `useTooltips` context, `MuiTooltip`s with JSX titles, `BillHearingsSection` (already `dynamic`, ~70–72)
  - **Existing child components that are already `'use client'`** (each is its own island and ships its own JS no matter where it is rendered): `AiGeneratedBlock` (`civic/AiAttribution`), `BillNumber`, `BillProgressMeter`, `BillStatusMetaChip`, `BillTopicMatchHint`, `BillHistoryActionText`, `LegislatorIdentityBlock`, `LegislatorExternalLinkButton`, `CopyableEmail`, `ui/Chip` (`ChamberChip`, `MetaChip`), `LegislativeStageTooltip`, `ExpandableText`, `FollowBillButton`, `BillHearingsSection`. Server-safe children: `LegiScanCredit`, `MemberName`.
  - `src/app/bills/[id]/page.tsx`: server component, `revalidate = 300` (line 13), `generateStaticParams` (line 17) prerenders `fetchTopBillSlugsForPrerender()` (100 bills), and `Promise.all` loads the page data (~56–59).
- **Do:**
  1. Create `src/lib/bill-detail-view-model.ts` (pure, no React) with `textDateOrNull`, `fmtDate` and `computeEffectiveStatus(bill, history)` (the IIFE). Import WS3-01's functions from `roll-call-label.ts`; do not copy them. Add `src/lib/bill-detail-view-model.test.ts` with at least 10 cases for `computeEffectiveStatus`: veto override, veto, signed, "delivered to Secretary of State", "became law without", failed, enrolled, engrossed, passed, empty history, plus `fmtDate` and `textDateOrNull` on null and invalid input.
  2. Create `src/components/bills/detail/`:
     - **Server components** (no `'use client'`, no hooks, no function-valued `sx`): `BillHeader.tsx`, `BillSummaryCard.tsx`, `BillSponsorsColumn.tsx` (with `SponsorCard`), `BillTextVersions.tsx`, `BillPageFeedbackLine.tsx`. Replace `useTheme()` and `alpha(theme…)` with theme-path strings in `sx` (`'divider'`, `'success.main'`) or `alpha()` on `civicPaletteTokens` at module scope. They may render the existing client children listed above, which stay islands. **Do not convert those children in this WP.**
     - **New client islands** (`'use client'`), only these: `HistoryTimelineClient.tsx` (expand/collapse state and `useTooltips`; `InlineRollCall`, `VoteTallyBar` and `VoteCountChip` live inside it) and `InfoTooltip.tsx` (a thin `MuiTooltip` wrapper for JSX titles).
     - The Back control becomes a plain `NextLink` `Button`.
     - `BillDetailView.tsx` becomes a server component that composes these and stays under 250 lines.
  3. Official-link probe:
     - **Under (a):** delete the client effect and always render the link.
     - **Under (b):** create `src/lib/lrc-bill-link-probe.ts` exporting `probeLrcBillLink(url, { fetchImpl, phase })` → `'found' | 'not_found' | 'unknown'` (WS6-03's 2-attempt logic and User-Agent, or `fetchLrcPage` if WS4-09a has merged) and `getLrcBillLinkStatus(billNumber, session)`, wrapped in `unstable_cache(…, ['lrc-bill-link', billNumber, session], { revalidate: 2592000 })` with a 3 s timeout. **Build-time skip:** when `process.env.NEXT_PHASE === 'phase-production-build'` [verify that Next sets it for route rendering during `next build`], return `'unknown'` without fetching. Every `'unknown'` shows the link (fail open). Call it from `page.tsx` inside the existing `Promise.all` and pass `showOfficialKyBillLink` as a prop. Delete the client effect. Tests in `src/lib/lrc-bill-link-probe.test.ts` with a stub `fetchImpl`: HEAD 404 → `not_found` (1 call); HEAD 405 then GET 200 → `found` (2 calls); HEAD throws then GET throws → `unknown` (2 calls); build phase → `unknown` with 0 calls.
     - **Both:** delete `src/app/api/lrc/bill-link-status/`.
  4. Keep the visible output identical: same text, order and chips. WS6-09b changes layout.
  5. Report the bill route's JS before and after with `npm run a11y -- --metrics --routes /bills/<HB500 slug>` (anon env, blocking on) or from `next build` output.
- **Don't:**
  - Change copy, order or styling.
  - Change WS3-03a/04 strings.
  - Convert the existing `'use client'` children to server components (a later, measured change).
  - Change data loading in `ky-bill-detail-server.ts` beyond what the probe needs.
  - Add `roll_call` payloads (WS6-18).
- **Acceptance criteria:**
  - [ ] `head -1 src/components/bills/BillDetailView.tsx` is not `'use client'`, and the file has 250 lines or fewer.
  - [ ] `grep -l "use client" src/components/bills/detail/*` lists only `HistoryTimelineClient.tsx` and `InfoTooltip.tsx`.
  - [ ] `src/app/api/lrc/bill-link-status/` does not exist, and `grep -rn "bill-link-status" src` prints nothing.
  - [ ] At least 10 view-model tests pass, plus 4 probe tests under (b).
  - [ ] Under (b), a local `npm run build` with anon env logs 0 requests to `legislature.ky.gov` (count with a temporary `console.info` in the helper, removed before merge, or with the test above). State the method in the PR.
  - [ ] Bill-route JS transferred before and after is reported and does **not increase**.
  - [ ] Before and after screenshots of HB500 (2026) and one bill with no votes, at 390 px and 1440 px, are visually identical apart from link-probe timing.
  - [ ] tsc, lint, test and build pass.
- **Verify:**
  - Plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - Screenshots and JS metrics need anon env with the WS6-08 blocking, or a preview.
- **Owner actions:** answer the decision by 2026-11-18, using the WS6-03 log counts from Vercel [verify log retention on the plan]. On the preview, open three bills (one 2026 bill that became law, one that died, one from 2024) and confirm that nothing looks different.
- **Rollback:** `git revert`. The deleted API route and client effect return with it. No data change.

---

### WS6-18 · Show how each member voted on a roll call

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS6-09a, WS3-05a; soft: WS7-10 | C1, T5, C8 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Party labels in the bill-page vote list.** TASKS.md records as unresolved "whether/how to express partisanship on bill pages". Options:
  - (a) Show each name with a party letter as text, for example "(R)", as the LRC record does.
  - (b) Names only. Party is on the profile.

  **Recommended: (a).** It is official affiliation stated as a fact, and WS6-08 already shows party as text on cards. **Default if no answer by 2026-11-25: (b),** the more conservative choice.
- **Data-limit impact:** none external. One new read route over `ky_votes.roll_call`, which is stored on all rows (TASKS.md: 6,944 of 6,944), cached at the CDN for a day.
- **Ongoing cost:** small. One route, one pure library and one disclosure inside the existing timeline island. No analytics events, no storage writes.
  - **Implements** the handoff's Task 3 (`docs/handoff-tier1-analytics-driven-2026-09-15.md` ~162–210), which WS7-01 step 10 assigns here. The design is fixed in this WP instead of a separate design PR.
  - **Drops** from that brief: the two events (`bill_votes_expanded`, `bill_vote_member_clicked`), because WS7-01 names no KPI that needs them and autocapture records the button clicks; `outbound_link_clicked` (superseded, per WS7-01 step 10); and avatars (`LegislatorAvatar`, `LegislatorIdentityBlock`), because a 100-name list would load about 100 images. Names are plain text links.
  - **Overrides** the brief's "party then last name" order: each group is sorted by last name only, so the list does not frame votes by party.
  - **Folds in** TASKS.md "Design needed: clicking a vote-tally tag should reveal who voted that way".
- **Why:**
  - The defensible niche is linking each bill to every roll call and to *your* legislators (C1). WS8-10's partner demo path depends on this view.
  - Today the bill page shows only counts. A visitor who just looked up their legislators (T5, C8) cannot see how those two people voted on this bill.
- **Current state (verified 2026-10-06; re-check after WS6-09a):**
  - `src/lib/ky-bill-detail-server.ts` `fetchDbVotes` (~55–110) selects `roll_call_id, date, description, yea_count, nay_count, nv_count, absent_count, passed` and maps them to `{ roll_call_id, date, desc, yea, nay, nv, absent, passed }`. It does **not** select `ky_votes.id` (UUID) or `roll_call`. `roll_call_id` is LegiScan's id and is unique only per `(bill_id, roll_call_id)` (migrations 006, 010), and some legacy rows have it NULL.
  - `KYVote.roll_call` elements are `{ legislator_id: String(people_id), vote }` (`ky-sync-pipeline.ts` ~1838).
  - `InlineRollCall` and `VoteCountChip` live in `detail/HistoryTimelineClient.tsx` after WS6-09a.
  - WS7-10 (if merged) provides `readSavedDistricts()` in `src/lib/saved-districts.ts` (`{ house, senate, savedDay }` under `kyv:myDistricts`), saved only by an explicit button and only for unambiguous results.
  - WS3-05a: ZIP lookups are center-point results.
- **Do:**
  1. Add `id` to `fetchDbVotes`'s select and expose it as `vote_id` on the mapped shape (`KyBillDetailEnrichment['votes']`). Keep `roll_call_id` unchanged.
  2. Create `src/lib/roll-call-members.ts` (pure, plus one server fetch helper):
     - `groupRollCall(rollCall, legislatorsByPeopleId)` → `{ yea, nay, nv, absent }`, each an array of `{ peopleId, name, slug, chamber, district, partyLetter }` (name `null` when unmatched), sorted by last name with unmatched rows last. Buckets come from the existing `bucketLegiscanVoteText`.
     - `fetchLegislatorsByPeopleIds(supabase, ids)`: one query, `ky_legislators` where `legiscan_id` is in the ids, including inactive members, selecting `id, legiscan_id, name, last_name, profile_slug, chamber, district, party` (`KYLegislator` in `src/types/kentucky.ts` ~13–60). Build `kyvky_path` with `memberProfilePath` (`src/lib/ky-member-utils.ts` ~121), which needs `id`, `name` and `profile_slug`.
  3. Route `src/app/api/votes/[id]/members/route.ts` (GET):
     - Validate `id` as a UUID (`ky_votes.id`). 400 otherwise, 404 if no row.
     - Select `roll_call, chamber, bill_id` for that row with the anon client, map through step 2, and return `{ api_version: 1, vote_id, groups }`. Each member is `{ legiscan_people_id, name, kyvky_path, district, party_letter }`, with `party_letter` included only under decision (a).
     - `Cache-Control: public, s-maxage=86400, stale-while-revalidate=604800`.
     - If WS8-02's `src/lib/public-api-contract.ts` exists, register these fields there and add the route to its contract test. Otherwise note in the PR that WS8-02 should register it.
     - Do not add CORS. WS2-07's rules apply by path.
  4. Client, in `HistoryTimelineClient.tsx`: each roll call row with a `vote_id` gets a text `Button` `Show how members voted` (`aria-expanded`, `aria-controls`), collapsed by default. Expanding fetches the route once, then renders four labelled lists: `Yea (N)`, `Nay (N)`, `Not voting (N)`, `Absent (N)`, using `voteBucketLabel` from `src/lib/vote-display.ts` (~23–29). Each matched name links to the profile. Unmatched rows read `Member not matched (LegiScan ID N)`. On error: `Could not load the member list. Try again.` with a retry button.
  5. Saved districts (only if WS7-10 has merged): read `readSavedDistricts()` after mount. When a listed member's chamber and district match, show one row per match at the top of the expanded list, exactly: `House District ${n} (saved on this device): ${name} voted ${Yea}`, and the same for `Senate District`. The vote word is text. **Never write, auto-save or clear districts** (WS7-10 owns the store and its Forget button). If WS7-10 has not merged, skip this step and say so in the PR.
  6. Tests:
     - `src/lib/roll-call-members.test.ts`: sort by last name; unmatched rows last; bucket mapping for "Yea", "Nay", "NV", "Absent" and an unknown string; the group sizes equal the input counts.
     - A pure `savedDistrictRows(groups, saved)` helper: House only, Senate only, both, none, and a saved district with no matching member.
- **Don't:**
  - Add `roll_call` to the server page payload.
  - Write browser storage or persist districts anywhere.
  - Add PostHog events or properties.
  - Add a page, characterize votes, or change counts or labels (WS3).
- **Acceptance criteria:**
  - [ ] On HB500 (2026), expanding a roll call lists named members in four groups whose sizes equal the chips' counts. Screenshot (anon env with WS6-08 blocking, or Owner on the preview).
  - [ ] With WS7-10 merged and districts saved, the same bill shows the "saved on this device" rows. Without saved districts, it shows none.
  - [ ] `git diff` adds no `localStorage.setItem`, `track`, `capture` or `posthog` call.
  - [ ] `curl -s localhost:3000/api/votes/not-a-uuid/members` returns 400.
  - [ ] At least 8 new tests pass. tsc, lint, test and build pass.
- **Verify:**
  - Plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
  - The feature check needs anon env or a preview.
- **Owner actions:** answer the decision by 2026-11-25. Check one bill on the preview, including a roll call where you know how your own legislators voted.
- **Rollback:** `git revert`. No data change.

---

### WS6-09b · Lead the bill page with the plain-language summary and a version stamp

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS6-09a, WS6-07 | U2, U15, U16, A2, A9 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:**
  1. **H1 wording.** Options:
     - (a) `HB 500: <short title>`. The short title is `official_short_titles[0]` if present, else `kyBillSeoCatchline(title, 90)`.
     - (b) `<short title>` as the H1, with the bill number as an overline above it.

     **Recommended: (a).** People search "kentucky hb 500" (the page `<title>` already leads with it), and the number disambiguates. **Default if no answer by 2026-11-18: (a).**
  2. **"Beta" chip on the summary.** Options:
     - (a) Remove it. WS3-04's basis line now says exactly what the summary is.
     - (b) Keep it.

     **Recommended: (a)** (U16). **Default if no answer by 2026-11-18: (a).**
- **Data-limit impact:** none.
- **Ongoing cost:** about 0.
- **Why:**
  - Today the H1 is a 34 px, roughly 60-word "AN ACT…" legal title. The AI summary starts around y≈1,760 px on mobile in 13 px gray text, and metadata precedes the bill number (U2).
  - Readers come for "what does this bill do and where is it". The legal title is reference material.
  - A version stamp, saying which text the summary was built from, is the honest-sourcing fix for A2. WS3-04 and WS3-09d provide it, and this WP gives it a place.
- **Current state (verified 2026-10-06; re-check after WS6-09a):**
  - Header card order today: (1) progress meter and last action, (2) chamber, status and session chips, (3) `BillNumber` and Follow, (4) `BillTopicMatchHint`, (5) H1 = `bill.title`, `h4` at 1.5–2.125 rem (~1035–1047), (6) short titles and popular names, (7) `ExpandableText` of `bill.description` (~1073), (8) subject chips, (9) effective-date notice, (10) official links.
  - The AI summary is in the left column below the header card (~1162–1172), as `AiGeneratedBlock` with `beta`.
  - `src/components/civic/AiAttribution.tsx` renders the summary with `typographyProps: { variant: 'body2', color: 'text.secondary' }` (13 px) inside `ExpandableText`. After WS3-04 it takes a `basis` prop, and the basis copy comes from `aiSummaryBasisLine()` in `src/lib/ai-summary-basis.ts`.
- **Do:**
  1. New header order, inside `BillHeader` (server):
     1. Overline row: `BillNumber` (small), session label and chamber as plain text separated by ` · `.
     2. H1 per decision 1: `component="h1"`, `variant="h3"`, `fontSize: { xs: '1.5rem', md: '2rem' }`.
     3. Status row: status chip, `BillProgressMeter` (compact variant if one exists, else `detail`), and "Last action · date".
     4. Follow button, right-aligned on `md+` and full-width on `xs`.
  2. Directly under the header, full width: `BillSummaryCard`.
     - `AiGeneratedBlock` with body text at `variant="body1"` and `color="text.primary"`.
     - The first paragraph without truncation, and `ExpandableText` only beyond 600 characters.
     - The basis line and changed-bill caveat exactly as WS3-04/WS3-09d render them, by passing their props through. **Import `aiSummaryBasisLine()`; never re-type basis copy.**
     - Under decision 2 (a), remove the `beta` prop at this call site.
     - When there is no summary, render nothing.
  3. Below the summary: a collapsible section titled `Official title and description` (`Typography component="h2"` with `ExpandableText`, collapsed by default on `xs`). It holds `bill.title`, short titles and popular names, and `bill.description`, then the subject chips (at most 6 with a `+N more` toggle), the official links and `LegiScanCredit`.
  4. Then the existing two-column grid: history (left), sponsors and text versions (right), and `BillHearingsSection`.
  5. JSON-LD and `<title>` do not change. `Legislation.name` in JSON-LD stays the legal title.
  6. Add `src/lib/bill-h1.ts` with `billH1(bill)` implementing decision 1, and `src/lib/bill-h1.test.ts`: the short title wins; with no short title the catchline is used; a resolution ("A JOINT RESOLUTION …") is handled; the length is ≤ 120; the H1 never starts with "AN ACT".
- **Don't:**
  - Change summary text, basis copy or the caveat (WS3).
  - Change status-chip labels (WS3-13) or history rows (WS3-03a/b).
  - Add new sections or data.
  - Remove the "AI-generated" disclosure or the feedback link (A9).
- **Acceptance criteria:**
  - [ ] HB500 (2026) and SB197 (2026): the summary heading's `getBoundingClientRect().top` is less than the viewport height at 390×844 and 1440×900. Measure with a Playwright snippet (anon env with blocking, or preview) and paste the numbers.
  - [ ] The H1 never begins with "AN ACT" (test), and its length is ≤ 120.
  - [ ] `git grep -n "Summarized from" src/components` prints nothing (copy lives only in WS3's module).
  - [ ] Under decision 2 (a), `git grep -n "beta" src/components/bills` prints nothing.
  - [ ] `npm run a11y -- --base-url <preview> --routes /bills/<slug>` shows no new heading-order violation.
  - [ ] Before and after screenshots at 390 px and 1440 px for HB500, SB197 and a bill without a summary are attached.
  - [ ] tsc, lint, test and build pass. The copy has no em dash or semicolon.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. Screenshots and the axe run need anon env with blocking, or a preview.
- **Owner actions:** answer the decisions by 2026-11-18. Review the preview on a phone.
- **Rollback:** `git revert`. The layout returns to the WS6-09a state.

---

### WS6-10 · Make the home page and /bills follow the legislative calendar

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | M | WS6-04b, WS6-06 | U4, U12, U17, T7 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. Copy is fixed below.
- **Data-limit impact:** none external. One cached Supabase read of upcoming meetings on `/`, reusing WS6-06's `fetchKyUpcomingMeetingsWithAgenda`.
- **Ongoing cost:** goes **down** in session. No one hand-edits the home page on 2027-01-05, and the calendar is a pure, tested function of `KY_SESSIONS`. **Supersedes** TASKS.md "Task 5 — homepage live-feed preview" and "Home feed concept: animated live-feed preview" (WS7-01 step 10 also records Task 5 as superseded).
- **Why:**
  - Between sessions the home page shows April bills (U4), and `/bills` defaults to a session that ended in April with no explanation (U12).
  - Meetings, the best interim content, are not on home (U17).
  - The 2027 session is the first one this architecture and the analytics will observe (T7). The home page must change state on its own on 2027-01-05, including the Jan 9 to Feb 1 break.
- **Current state (verified 2026-10-06):**
  - `src/lib/ky-sessions.ts`: `KY_SESSIONS[0]` is the 2027 RS (start 2027-01-05, end 2027-03-30, veto recess 03-13 to 03-25). The comment records "Part I Jan 5–8 … break Jan 9–Feb 1; Part II convenes Feb 2", but no milestone field holds the break. `getActiveSession`, `getSessionPhase`, `getInterimPeriod` (~307) and `getCivicDataSessionName` (~352) are pure with `asOf`. `src/lib/ky-sessions.test.ts` exists.
  - `getCivicDataSessionName` returns the 2026 RS during the interim **by design** and flips to the 2027 RS on 2027-01-05.
  - `src/app/bills/(browse)/page.tsx` metadata names the session. `BillsBrowse.tsx` has no interim notice.
  - After WS6-04b, home has a banner, hero, "Recent legislative action", "Most viewed in the past day" (PostHog only) and topics. WS7-10 may add `MyLegislatorsCard` under the hero.
- **Do:**
  1. Add the optional milestones `partOneEnd?: string` and `partTwoStart?: string` to `KYSessionMilestones`, and set them on the 2027 RS to `'2027-01-08'` and `'2027-02-02'`. Do **not** change `getSessionPhase` (sync gating depends on it).
  2. Create `src/lib/ky-home-phase.ts` with `getHomePhaseModel(asOf)`, returning one of:
     - `{ kind: 'interim', nextSession: { name, start } | null, daysUntil: number | null }`
     - `{ kind: 'session_break', resumes }`
     - `{ kind: 'in_session', sessionName, phase }`
     - `{ kind: 'post_session', lastSession: { name, end } }` (from sine die until 30 days after)
  3. Home sections, driven by the model, in `HomePageContent` after the hero (and after WS7-10's card if present):
     - **Interim:** a section `This week in Frankfort` with upcoming non-cancelled meetings for the next 7 days, at most 6, as `CommitteeMeetingCard` with `agendaPreview`, ending with a link `All upcoming meetings` → `/meetings`. If none: `No committee meetings are scheduled this week.` and the same link.
     - **Session break:** the same section, plus `The General Assembly is on a scheduled break until <Month D>. Committees may still meet.`
     - **In session:** `Today in Frankfort` with today's meetings, at most 6. "Recent legislative action" moves directly under it.
     - **Post session:** "Recent legislative action" first, then the meetings section.
  4. Banner: in interim with a known next session, append to `contextLine` exactly `The ${name} convenes ${Month D, YYYY}.`, which renders today as `The 2027 Regular Session convenes January 5, 2027.`. With no known next session, append nothing.
  5. Add a pure `billsInterimNotice(asOf): string | null` (in `ky-home-phase.ts`) and render its result above the `/bills` list as `Alert severity="info" variant="outlined"`:
     - Default session ended, next session known: `The ${last} ended ${Month D, YYYY}. The ${next} convenes ${Month D, YYYY}. Bills from ${nextYear} appear here after they are introduced.` Today: `The 2026 Regular Session ended April 15, 2026. The 2027 Regular Session convenes January 5, 2027. Bills from 2027 appear here after they are introduced.`
     - Default session ended, no next session in `KY_SESSIONS`: `The ${last} ended ${Month D, YYYY}. Bills from the next session appear here after they are introduced.` For 2027-04-02: `The 2027 Regular Session ended March 30, 2027. Bills from the next session appear here after they are introduced.`
     - Default session in progress with 0 bills: `No ${year} bills have been introduced yet. Bills appear here after the next data update, usually within a day.`
     - Otherwise `null`.
  6. Tests in `src/lib/ky-home-phase.test.ts`:
     - model: 2026-10-06 → interim, 91 days; 2027-01-05 → in session; 2027-01-12 → session break, resumes 2027-02-02; 2027-02-02 → in session; 2027-03-15 → in session, veto recess; 2027-04-02 → post session; 2027-06-01 → interim with `nextSession: null` (must not throw)
     - `billsInterimNotice`: 2026-10-06 (exact string above), 2027-04-02 (exact string above), 2027-01-05 with 0 bills, and 2027-02-10 with bills → `null`
- **Don't:**
  - Change `getSessionPhase` or the sync gating.
  - Add a live feed, animation or new API route.
  - Change `/meetings`.
  - Add a signup band. The TASKS.md "Home page never asks for a signup" item stays open for WS6-20.
- **Acceptance criteria:**
  - [ ] At least 11 new tests pass, covering every date in step 6.
  - [ ] With anon env, `/` today shows "This week in Frankfort" with meeting cards. Screenshot, or Owner check on the preview.
  - [ ] `/bills` today shows the interim notice. Screenshot.
  - [ ] `git grep -n "2027" src/components/home src/components/bills` prints nothing (years come from `KY_SESSIONS`).
  - [ ] tsc, lint, test and build pass. The copy has no em dash or semicolon.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. Screenshots need anon env or a preview.
- **Owner actions:** none now. WS6-19 includes the 2027-01-05 check.
- **Rollback:** `git revert`. The milestone fields are additive.

---

### WS6-11a · Compute whole-session vote context for member profiles on the server

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS3-02, WS3-04, WS6-05, WS6-07 | U11, C1, C8 (new evidence, see Findings re-checked) |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Key-vote definition.** It must be objective and neutral. Proposed: a roll call is "key" if either:
  - its matched history action is final passage or a veto override (`rollCallMotionKind`, step 3) and the bill became law or was vetoed (`classifyKyBillBrowseBucket(bill)` is `'signed'` or `'vetoed'`), or
  - the losing side was at least 25% of yea plus nay.

  Show at most 10, newest first. Options: (a) this; (b) passage and override only; (c) none. **Default if no answer by 2026-11-18: (a).**

  **Party-line context is not computed.** It is a new kind of partisan-adjacent claim that a solo operator without editorial review would have to defend every session. It is in Deferred.
- **Data-limit impact:** none external. One new SQL function with an aggregate over `ky_votes`, using the GIN index from migration 045. No backfill.
- **Ongoing cost:** small. One migration and one pure, tested library. No schedule.
- **Why:**
  - The tally is computed from at most 200 rows (`maxRows` in `src/app/members/[slug]/page.tsx` line 87; the RPC caps at 500, newest first). WS6-05 made the caption honest. This WP makes the tally cover the whole session.
  - Profiles lack key votes and a plain-language line per bill (U11). This is the per-member accountability layer a partner's "My Legislator" product is built on (C1, C2).
- **Current state (verified 2026-10-06; re-check after WS3-02 and WS6-05):**
  - `src/lib/member-profile-data.ts` `fetchMemberVoteRecord` (~293–370): calls `get_votes_for_legislator(legislator_people_id, p_session, max_rows)` (`SETOF ky_votes`), tallies `bucketLegiscanVoteText(memberRollVote(v.roll_call, peopleKey))` over the returned rows, then fetches `ky_bills (id, bill_number, title, status, session)` with **one** `.in('id', billIds)` (~345–349, errors ignored). After WS3-02 it also fetches `legiscan_history`. After WS6-05 it returns `truncated`.
  - `supabase/migrations/045_get_votes_for_legislator_perf.sql`: `LIMIT GREATEST(1, LEAST(COALESCE(max_rows,150), 500))`, `SECURITY INVOKER`, `search_path = public`, granted to `anon` and `authenticated`.
  - WS3-01's `deriveRollCallLabel` returns `{ label, matched, chamber, rollCallNumber }`, with no motion kind. `matchRollCallToHistory` returns the history index.
  - `classifyKyBillBrowseBucket` (`src/lib/bill-display.ts` ~255) returns `'signed'` (including veto override) and `'vetoed'` buckets.
  - Highest migration on 2026-10-06: `056`.
- **Do:**
  1. Migration `supabase/migrations/<next free number>_get_vote_tally_for_legislator.sql` (run `ls supabase/migrations | tail` first; other workstreams add migrations). It creates `get_vote_tally_for_legislator(legislator_people_id text, p_session text) RETURNS TABLE(vote text, n bigint)` with `LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public`, the same join and containment filter as 045, `jsonb_array_elements` to pick this member's `vote` text, grouped. Add `GRANT EXECUTE … TO anon, authenticated` and a `COMMENT`. Use `CREATE OR REPLACE`. Put `DROP FUNCTION IF EXISTS get_vote_tally_for_legislator(text, text);` in the PR's Rollback section.
  2. In `member-profile-data.ts`:
     - Call the new RPC for the tally and `totalRollCalls`, and set `tallyScope: 'session'`. If it errors (for example, the migration is not applied), keep the in-memory tally and set `tallyScope: 'recent'`.
     - Raise the list `maxRows` to 500 (page.tsx line 87).
     - Fetch bills with `.in('id', ids)` in chunks of 100 ids (`Promise.all`), so no request URL carries more than 100 UUIDs. Log a chunk error instead of ignoring it.
     - Set `listScope: rows.length >= 500 ? 'recent' : 'session'`.
  3. Create `src/lib/member-vote-context.ts` (pure) with:
     - `rollCallMotionKind(matchedAction: string | null): 'final_passage' | 'veto_override' | 'other'`. `veto overrid` (case-insensitive) → `'veto_override'`. `3rd reading` or `concurred in` → `'final_passage'`. Null or anything else → `'other'`. [verify these patterns against the history fixtures in `src/lib/roll-call-label.test.ts` and 5 real 2026 history strings, and list them in the PR]
     - `selectKeyVotes(rows, historyByBillId, billsById, opts)`: implements the decision. It uses `matchRollCallToHistory` from WS3-01 to find the matched action, returns at most 10 entries (vote id, WS3-01 label, bill, member bucket, result), and returns `{ entries, scope }`, where `scope` is the list scope from step 2.
     - `plainLanguageLine(bill)`: `firstSentence(bill.ai_summary)` (WS6-07) **only** when WS3-04's helper says the summary basis is bill text, or the bill did not change after introduction. `null` otherwise.
  4. Extend `MemberVoteRecord` with `tallyScope`, `listScope`, `keyVotes` and `plainLineByBillId`. Fetch `ai_summary` (and whatever WS3-04's basis helper needs) in the bills select **server-side only**. Pass only the computed line to the client.
  5. Tests in `src/lib/member-vote-context.test.ts`, at least 10 cases with synthetic rows: each `rollCallMotionKind` branch; a key vote chosen by margin; a key vote chosen by passage of an enacted bill; a passage vote on a bill that died is not key; at most 10 newest first; `scope: 'recent'` when the list is truncated; a changed bill yields no plain line. Add a test for the chunking helper (250 ids → 3 chunks).
- **Don't:**
  - Apply the migration (Owner).
  - Change `get_votes_for_legislator`.
  - Render anything new (WS6-11b).
  - Compute or store party-line statistics.
  - Characterize votes ("broke with", "loyal", "rebel").
  - Call LegiScan.
- **Acceptance criteria:**
  - [ ] The migration file exists, matches 045's security settings, uses `CREATE OR REPLACE`, and has a `COMMENT`.
  - [ ] At least 11 new tests pass.
  - [ ] With the RPC unavailable (stub), the record falls back to `tallyScope: 'recent'` without throwing.
  - [ ] The client props carry no `ai_summary` and no `roll_call` arrays (type check).
  - [ ] tsc, lint, test and build pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. The RPC itself needs the owner to apply the migration.
- **Owner actions:**
  1. Apply the migration **before merge** (either order is safe because of the fallback): `npm run db:apply-sql -- supabase/migrations/<NNN>_get_vote_tally_for_legislator.sql` (needs production `DATABASE_URL`).
  2. Run `select sum(n) from get_vote_tally_for_legislator('<a House member people_id>', '2026 Regular Session');` and compare it with the LRC record for that member. Also run `select count(*) from ky_votes where session = '2026 Regular Session' and chamber = 'H';` [verify column names] and record whether any member exceeds 500 roll calls.
  3. Answer the decision by 2026-11-18.
- **Rollback:** `git revert`, then `DROP FUNCTION IF EXISTS get_vote_tally_for_legislator(text, text);`. The fallback means order does not matter.

---

### WS6-11b · Rebuild the member profile around key votes, with party shown as text

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Sonnet | M | WS6-11a, WS6-08 | U11, U9, C8 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none here. It renders what WS6-11a's decision produced, and the copy is fixed below.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0. **Supersedes** TASKS.md "Legislator exploration is thin" for the profile page only. Browse-by-voting-pattern stays deferred.
- **Why:** WS6-11a computes what the page needs. This WP shows it, so that the profile answers "how did they vote on things that mattered", gives each bill a one-line plain-language description, and shows party as text (U11, U9).
- **Current state (verified 2026-10-06; re-check after WS6-05 and WS6-11a):**
  - `MemberProfileView.tsx` (673 lines, `'use client'`): the Voting record is first after WS6-05.
  - `VoteRollCallList` (~133) renders grouped rows. The tally chips are filters (~520–600).
  - The tally caption (~601–603) uses WS6-05's `voteTallyCaption`.
- **Do:**
  1. Header: confirm that party appears as text on the profile header (WS6-08 added it to `MemberCard`). Do not duplicate it.
  2. Voting record section, in order:
     - (a) A **Key votes** subheading (`component="h3"`) with one row per key vote: date · bill number (link) · `plainLanguageLine`, or if null, `billH1(bill)` from WS6-09b when merged, else `kyBillSeoCatchline(bill.title, 90)` · the WS3-01 label · the member's vote chip (existing bucket colors **and** text) · the result ("Passed" or "Failed") as text.
     - (b) Under the subheading, a caption, exactly: `Key votes are final-passage and veto-override votes on bills that became law or were vetoed, and votes where at least a quarter of members voted on the losing side.` Under WS6-11a option (b): `Key votes are final-passage and veto-override votes on bills that became law or were vetoed.` When `keyVotes.scope === 'recent'`, append ` These are drawn from the 500 most recent roll calls.`
     - (c) When plain-language lines exist, once per section: `One-line descriptions are written by AI from each bill's official description.` Use WS3-09d's wording if it has landed.
     - (d) **All votes**: the existing filters and list, unchanged.
     - (e) Tally caption, extending `voteTallyCaption` with `tallyScope`: `'session'` → `Based on all ${n} roll calls in ${sessionName} with this member’s vote recorded.` Otherwise keep WS6-05's truncated or count wording.
  3. Sponsored bills: add the `plainLanguageLine` under each bill title when present (via `MemberSponsoredBills` props), with the same AI caption once.
  4. Extend `member-vote-caption.test.ts` for the `'session'` case.
- **Don't:**
  - Use color alone for any vote or party.
  - Add adjectives about voting behavior, a party-line sentence, or charts.
  - Change the data layer.
- **Acceptance criteria:**
  - [ ] On a House member profile, "Key votes" appears before "All votes", with at most 10 rows. Screenshot at 390 px and 1440 px (anon env or preview).
  - [ ] The tally caption says "all … roll calls" when the RPC is applied, and never otherwise.
  - [ ] Every vote chip has a text label. `npm run a11y -- --routes /members/<slug>` shows 0 serious and 0 critical.
  - [ ] The copy has no em dash or semicolon, and no evaluative adjectives (reviewer check against the voice guide's "What to avoid").
  - [ ] tsc, lint, test and build pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. Screenshots and the a11y run need anon env or a preview.
- **Owner actions:** review 5 profiles (both chambers, both parties) on the preview.
- **Rollback:** `git revert`.

---

### WS6-12a · Add an email-link path for login, signup and the weekly email

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W2 | Opus | M | WS2-03 | U10, T3, C5, D4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Scope of email-link auth.** Options:
  - (a) Add "Email me a login link" to `/auth/login`, support it on `/auth/verify` on any device, and define the intent mechanism that WS7-09f (weekly email, signed-out path) and WS6-12b (follows) use. Keep password signup and login.
  - (b) Make email-link the only signup path.
  - (c) Do not add it.

  **Recommended: (a).** It is the smallest change that removes the four-field barrier, and it keeps existing accounts working. **Default if no answer by 2026-11-11: (a).** Under (c), WS6-12b and WS7-09f are blocked, and the weekly email ships signed-in only (WS7-09d).
- **Data-limit impact:**
  - Each request sends one auth email through Supabase Auth. If custom SMTP is Resend (`env-template.txt` ~22–42 documents the option [verify it is configured]), each counts toward Resend's free tier of about 100 a day (D4), which the digest shares. With Supabase's built-in mailer the hourly limit is very low [verify], and the feature would fail under load.
  - **Budget share:** email links, the welcome email (`src/app/api/me/welcome-email/route.tsx`) and Supabase auth email (if its SMTP is Resend) never reach `ky_notifications_log`. They share WS7-09c's `UNLOGGED_SEND_RESERVE = 30` per UTC day (`src/lib/email/send-budget.ts`, created by WS7-09c; until it merges, use 30). The digest and weekly email use the separate `DAILY_SEND_BUDGET = 70` of logged sends. So a normal digest or weekly-email day is **not** a reason to stop this feature.
  - **Stop condition:** the feature is visible only when `NEXT_PUBLIC_EMAIL_LINK_ENABLED === 'true'` (unset means hidden). The owner sets it only after capping Supabase's auth email rate (Owner actions). The owner unsets it and redeploys if, on any UTC day, **unlogged sends exceed `UNLOGGED_SEND_RESERVE` (30)**, where unlogged sends = Resend's daily total minus that day's `ky_notifications_log` rows (`sent_at` within the UTC day, `delivery_status <> 'failed'`) [verify the day boundary the Resend dashboard uses], or if the Supabase auth logs show rate-limit errors.
  - Supabase auth email cap: the lowest setting that keeps the daily maximum near 30 (Owner actions step 2; 1 per hour fits, 2 per hour does not). The cap also covers signup confirmations and password resets.
  - Client limits: a 60 s cooldown after each send, and a per-address cooldown of 10 minutes kept in `sessionStorage` (wrapped in try/catch).
  - Agent budget: 0 emails. Owner end-to-end test: at most 3 emails.
- **Ongoing cost:** small. One helper module, one form component, and changes to two auth pages. No new route or vendor. One env flag.
- **Why:**
  - Following anything, or getting the weekly email, needs a name, email, password and verification first (U10). The result is 16 accounts and 6 that follow anything (T3).
  - The program's retention bet is the weekly My Legislators email (C5, WS7-09a–f). An email link is the shortest path from a lookup to that email.
- **Current state (verified 2026-10-06; re-check after WS2-03):**
  - `src/app/lib/supabaseClient.ts` uses `createBrowserClient` from `@supabase/ssr` with no options. `@supabase/ssr` 0.8 forces `flowType: "pkce"` and `detectSessionInUrl: true` (`node_modules/@supabase/ssr/dist/main/createBrowserClient.js` ~38–40). So a link requested from the browser returns `?code=…`, and the code verifier lives only in the requesting browser. Opening it on another device or in a mail app's in-app browser fails.
  - `src/app/auth/verify/page.tsx` (`'use client'`): handles only `#access_token=&refresh_token=` in the hash (`exchangeSessionTokens` ~10–23), then calls `/api/me/ack-email-verification`. Otherwise it reads `getSession()`. It has **no** `next` handling and no redirect; on success it shows buttons. WS2-03 step 3 points the primary button at a safe `next`.
  - `src/lib/auth-redirect.ts`: `safeAuthRedirectPath(next, fallback = '/profile')`, used by login, register and `SignupCta`, not by verify.
  - `src/app/auth/login/page.tsx` ~38 uses `signInWithPassword`. `src/app/auth/register/page.tsx` ~77 uses `signUp` with `emailRedirectTo: …/auth/verify`.
  - `ky_user_profiles.display_name` is nullable `TEXT` (`supabase/migrations/016_ky_user_profiles.sql` line 6).
  - `src/app/components/Navigation.tsx` ~314–335: `Log in` and `Sign up` both use `display: { xs: 'none', sm: 'inline-flex' }`. The mobile drawer already has `Log in` (~644) and `Sign up` (~661).
  - No browser-side email-link request exists yet (`grep -rn "signInWithOtp" src` prints nothing).
- **Do:**
  1. Create `src/lib/auth/email-link.ts`:
     - `parseAuthIntent(raw: string | null)` → `{ kind: 'bill' | 'committee', id } | { kind: 'weekly', house, senate } | null`. Accept `/^(bill|committee):[0-9a-f-]{36}$/` and `/^weekly:(\d{1,3})-(\d{1,2})$/` with House 1–100 and Senate 1–38. Anything else → `null`.
     - `buildEmailLinkRedirect(origin, next, intent?)` → `${origin}/auth/verify?next=<encoded safeAuthRedirectPath(next, '/bills')>` plus `&intent=<encoded>` only when `parseAuthIntent` accepts it.
     - `requestEmailLink(supabase, email, { next, intent })` wraps `supabase.auth.signInWithOtp({ email, options: { emailRedirectTo, shouldCreateUser: true } })` [verify the signature in the installed `@supabase/supabase-js`].
     - `emailLinkEnabled()` reads `process.env.NEXT_PUBLIC_EMAIL_LINK_ENABLED === 'true'`.
     - `isPlausibleEmail(s)` (one `@`, a dot after it, no spaces, ≤ 254 characters).
  2. Create `src/components/auth/EmailLinkForm.tsx` (client): one `TextField` (`Email`, `type="email"`, `autoComplete="email"`) and a `Send link` button. Props: `next`, `intent?`, `submitLabel?`. It enforces both cooldowns, sends nothing when `isPlausibleEmail` fails, and on success shows exactly `Check your inbox. We sent a link to {email}. Select it to continue.` with WS2-03's `ResendConfirmationButton` pattern (60 s). It renders nothing when `emailLinkEnabled()` is false.
  3. `/auth/login`: under the password form, a secondary section `Or get a login link by email` rendering `EmailLinkForm` with `next` from the query.
  4. `/auth/verify`, after WS2-03's version:
     - If the query has `token_hash` and `type`, call `supabase.auth.verifyOtp({ token_hash, type })` (types `'email'` or `'magiclink'` [verify which the installed version accepts]). This works on any device.
     - Else if the query has `code`, rely on `detectSessionInUrl` and then `getSession()`. If no session results, show: `This link has to be opened in the same browser you requested it from. Request a new link and open it on this device.`
     - Keep the existing hash path and the `ack-email-verification` call.
     - On success, if a safe `next` is present: `router.replace(safeAuthRedirectPath(next, '/bills') + (intent ? '?intent=' + encodeURIComponent(intent) + '&from=email-link' : ''))`, appending with `&` if `next` already has a query. Without `next`, keep WS2-03's buttons.
  5. Intent consumers: this WP consumes none. WS7-09f reads `intent=weekly:H-S` to preselect and focus WS7-09d's opt-in button (no auto-subscribe). WS6-12b reads bill and committee intents. If WS7-09d has merged before this WP, render `EmailLinkForm` (with `intent: weekly:<h>-<s>`, `next: '/members/map'`, `submitLabel: 'Email me a link to start the weekly email'`) in place of `SignupCta`'s register button for signed-out visitors on the lookup result, only when both districts are resolved and the lookup was not a ZIP (WS3-05a's lookup type). Otherwise leave that to WS7-09f and say so in the PR.
  6. Register page: make "Display name" optional and move it last (folds in TASKS.md Tier C "Display name is required and first"). The column is nullable, and the trigger in 016 already ignores blank names. Keep the welcome-email greeting fallback.
  7. Fix TASKS.md Tier C "Verify page copy says 'signing in'" (`verify/page.tsx` ~81, ~96): use "log in".
  8. Header nav (folds in TASKS.md Tier A "Signup is invisible on phones"): show `Sign up` at `xs` (`display: 'inline-flex'`, `size="small"`) and keep `Log in` hidden at `xs` (the drawer has it). At 360 px, the wordmark, search icon, menu icon and `Sign up` must fit on one row. If not, reduce the wordmark width at `xs` from 200 to 168 (~461).
  9. Tests in `src/lib/auth/email-link.test.ts`: an unsafe `next` (absolute URL, `//evil`, `/auth/x`) becomes `/bills`; bill and committee intents kept; `weekly:12-7` kept; `weekly:101-7` and `weekly:12-39` dropped; a malformed intent dropped; `isPlausibleEmail` accepts and rejects.
- **Don't:**
  - Change Supabase dashboard settings or email templates (Owner).
  - Remove password login.
  - Add a server auth route, store intents server-side, or auto-subscribe anyone.
  - Send email from tests.
- **Acceptance criteria:**
  - [ ] At least 8 new tests pass for `email-link.ts`.
  - [ ] `grep -rn "signing in" src/app/auth` prints nothing.
  - [ ] With the flag unset, `/auth/login` shows no email-link section (screenshot). With it set locally, it shows the form (screenshot at 390 px and 1440 px).
  - [ ] No file is added under `src/app/api/auth/` (`git diff --stat`).
  - [ ] At 360 px, `Sign up` is visible in the header with no horizontal overflow. Screenshot.
  - [ ] tsc, lint, test and build pass. The copy follows the voice guide ("Log in", "select", no em dash or semicolon).
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. End to end: the owner on the preview.
- **Owner actions** (in this order):
  1. Confirm that Supabase Auth sends through custom SMTP (Resend), and record it in the PR.
  2. Supabase Dashboard → Authentication → Rate Limits [verify the menu path and the setting's granularity]: record the current email limit and set it to the lowest value that keeps the daily maximum near 30, to match `UNLOGGED_SEND_RESERVE` in `src/lib/email/send-budget.ts`. If the limit is per hour, set 1 per hour (at most 24 a day). Record the value in the PR.
  3. Authentication → Email Templates → "Magic Link": point the link at `{{ .SiteURL }}/auth/verify?token_hash={{ .TokenHash }}&type=email&next={{ .RedirectTo }}` [verify the variable names and the `type` value in current Supabase docs, and how `RedirectTo` carries our `next` and `intent`]. Subject: `Your Know Your Vote Kentucky login link`. Include the postal address line from `KYVKY_POSTAL_ADDRESS` (PO Box 133, Bardstown, Kentucky 40004) if the template allows it.
  4. Confirm that the redirect allow-list includes `https://www.kyvky.com/auth/verify` and the preview pattern.
  5. Set `NEXT_PUBLIC_EMAIL_LINK_ENABLED=true` in Vercel (Preview first), and redeploy.
  6. Test once on the preview: request a link **on a laptop and open it on a phone**. Expect to land logged in on the `next` page.
  7. Set the flag in Production. For the first week, compute unlogged sends daily: Resend's daily total minus `select count(*) from ky_notifications_log where sent_at >= date_trunc('day', now() at time zone 'utc') at time zone 'utc' and delivery_status <> 'failed'` (read-only, Supabase SQL editor), and check the Supabase auth logs for rate-limit errors. If unlogged sends exceed 30 (`UNLOGGED_SEND_RESERVE`) on any day, or rate-limit errors appear, unset the flag and redeploy.
- **Rollback:** unset `NEXT_PUBLIC_EMAIL_LINK_ENABLED` (instant hide), or `git revert`. Accounts created through email links remain valid password-less accounts and can set a password through the reset flow. Revert the template change only after the code is reverted.

---

### WS6-12b · Let visitors follow a bill or committee with only an email address (optional)

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Opus | M | WS6-12a, WS6-02 | U10, T3, T5 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Build it in W2 or defer it.** Bill follows are a 0.17% behavior (T5), and the weekly email is the retention bet (C5). Options: (a) build it if it can merge by 2026-12-01; (b) defer it. **Default: (a) if a PR is open by 2026-11-24, otherwise (b)** with revisit trigger "WS7-13 shows signup friction is the bottleneck".
- **Data-limit impact:** the same auth-email path and stop condition as WS6-12a (hidden when `NEXT_PUBLIC_EMAIL_LINK_ENABLED` is unset). After that, digest email under the existing daily cron (`vercel.json` `/api/cron/notify`), with no new schedule. Owner test: at most 2 emails.
- **Ongoing cost:** about 0. It reuses the follow APIs and generalizes the digest auto-enable.
- **Why:** The one step some people take is "email me when this moves". Today it needs a full registration first (U10).
- **Current state (verified 2026-10-06):**
  - `FollowBillButton.tsx` and `FollowCommitteeButton.tsx`: after WS6-02, signed out links to `signedOutFollowHref(…)`.
  - `src/lib/ky-notification-preferences.ts` ~211–240: `maybeEnableDigestOnFirstBillFollow` counts **only** `ky_bill_follows`, and only `src/app/api/bills/[id]/follow/route.ts` (~76) calls it.
  - `src/app/api/committees/[id]/follow/route.ts` imports only `ensureKyNotificationPreferencesRow` (~4, ~84). New accounts default to `digest_frequency 'off'` (migration 033). So today a visitor who follows only a committee gets **no** email.
  - Both follow routes take a Bearer JWT and rate-limit 60/min.
- **Do:**
  1. Rename `maybeEnableDigestOnFirstBillFollow` to `maybeEnableDigestOnFirstFollow`. It counts the user's `ky_bill_follows` plus `ky_committee_follows` and enables the digest only when the total is 1 and the user has not turned the digest off themselves (keep today's condition). Call it from both follow routes after a successful insert. Extract the decision into a pure `shouldAutoEnableDigest({ billFollows, committeeFollows, prefs })` and test it.
  2. Create `src/components/civic/FollowByEmailDialog.tsx`: a MUI `Dialog` wrapping WS6-12a's `EmailLinkForm` with `next` = the current path and `intent` = `` `${type}:${id}` ``. Copy, exactly:
     - title: `Follow ${label} by email`
     - body: `We will send you a link. Select it to confirm your email and start following. We email only when something you follow changes.`
     - a link to `/privacy`
     - Before sending, set `sessionStorage['kyv:pendingFollow'] = intent` (try/catch).
  3. In the signed-out state of both follow buttons, when `emailLinkEnabled()`, `Follow` opens the dialog. Keep a text link `Or sign up with a password` → `signedOutFollowHref(…)`. When the flag is off, keep WS6-02's behavior.
  4. Intent consumer `src/lib/use-pending-follow-intent.ts`, mounted in the bill page's and committee page's client islands. When the URL has an `intent` for **this** page and a session exists:
     - If `sessionStorage['kyv:pendingFollow']` equals the intent (same browser that asked), POST to the follow API once, clear the marker, remove `intent` and `from` from the URL (`history.replaceState`), call the existing `trackBillFollowed` / `trackCommitteeFollowed`, and show a `Snackbar`: `You are following ${label}. We will email you when it changes.`
     - Otherwise (another device, or a crafted link), do **not** follow. Show a `Snackbar` `Follow ${label}?` with a `Follow` action button, which follows on select.
  5. Tests: `parseFollowIntent(search, pageType, pageId)` in `src/lib/follow-intent.ts` (valid; mismatched id; wrong type; malformed); the consumer's pure decision `followIntentAction({ intent, marker, signedIn })` → `'auto' | 'confirm' | 'none'` (same browser → auto; no marker → confirm; signed out → none); `shouldAutoEnableDigest` (first bill follow, first committee follow, second follow, user turned digest off).
- **Don't:**
  - Create follows server-side before the link is opened, or store emails before auth.
  - Add a captcha or vendor.
  - Change digest content or schedule.
- **Acceptance criteria:**
  - [ ] With the flag set, signed out, `Follow` on a committee page opens the dialog. Screenshot.
  - [ ] At least 9 new tests pass.
  - [ ] Owner preview test: email → link (opened on another device) → back on the committee page with the "Follow?" snackbar → select Follow → `/profile` lists the committee, and the digest is on.
  - [ ] tsc, lint, test and build pass. The copy has no em dash or semicolon.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. End to end needs the preview and a real mailbox (Owner).
- **Owner actions:** decide by 2026-11-24. Run the preview test once for a bill and once for a committee (2 emails).
- **Rollback:** `git revert`. The signed-out button returns to WS6-02's link. Follows already created stay. The digest auto-enable returns to bill-only.

---

### WS6-14 · Shorten /bills and /members on phones (optional)

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS6-10 | U8, U12 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0. No new component.
- **Why:** On mobile, the `/bills` filters fill the first screen and Topic appears twice, and `/members` is 24,050 px tall (U8). The cheap fixes are layout only. The Cards/List toggle is deferred until W4 data shows that `/bills` browsing matters (T5: search 1.7%, topic 0.5%).
- **Current state (verified 2026-10-06):**
  - `src/components/bills/BillsBrowse.tsx` (799 lines): the topic quick-pick chip row (`LANDING_TOPICS` map at ~416, "Women's health" ~435, "Data centers" ~445, custom-topic chip ~465), then the filter bar with the Topic (~512), Status (~526), Session (~543) and Sort (~559) selects.
  - `src/components/members/MembersBrowse.tsx` uses `PaginatedSection` with `MEMBERS_PAGE_SIZE = 24` and `MemberCard`. `MemberCompactCard.tsx` exists.
- **Do:**
  1. `/bills` on `xs`:
     - Hide the topic chip row with `display: { xs: 'none', sm: 'flex' }` (the Topic select stays in the filter bar, which removes the duplicate).
     - Add a `Filters` text button (`display: { xs: 'inline-flex', sm: 'none' }`, `aria-expanded`, `aria-controls`) reading `Filters` or `Filters (N active)`.
     - Give the filter bar `display: { xs: open ? 'flex' : 'none', sm: 'flex' }`, with `open` defaulting to `false`. The server renders it collapsed on phones through CSS, so there is no hydration mismatch, layout shift or duplicate control ids.
     - Count active filters with a pure `activeFilterCount(params)` helper and test it.
  2. `/members` on `xs`: render `MemberCompactCard` instead of `MemberCard` in the grid through two CSS-hidden variants **only if** they have no duplicate ids. Otherwise use `MemberCompactCard` at all widths below `md` via a `sx` breakpoint inside one component [verify which is simpler after reading both cards]. Keep `MemberCard` on `md+`.
  3. Do not change status chips (WS3-13) or the number of chips on a card.
- **Don't:** change server queries, page sizes or sorting; add filters; change `/search`; add a view toggle or `localStorage`.
- **Acceptance criteria:**
  - [ ] At 390×844, the first bill result starts above y = 600 px with filters collapsed (screenshot, anon env or preview).
  - [ ] `/members` at 390 px has `document.body.scrollHeight` ≤ 8,000 px (paste the value).
  - [ ] `npm run a11y -- --metrics --routes /bills` reports CLS < 0.1.
  - [ ] tsc, lint, test and build pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`. Screenshots need anon env or a preview.
- **Owner actions:** none.
- **Rollback:** `git revert`.

---

### WS6-15 · Remove post-hydration layout shift (optional)

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS6-08 | U13 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0. No budget file or new rule.
- **Why:** CLS is 0.38 on `/committees` and 0.13–0.15 on `/search`, because the nav auth area and the footer shift after hydration (U13).
- **Current state (verified 2026-10-06):**
  - `src/app/components/Navigation.tsx` `UserMenu` (~263–340) does `if (loading) return null;` (~274), so "Log in / Sign up" appear only after auth resolves.
  - `src/app/components/SiteFooter.tsx` ~58–64 holds `year` in state, set in `useEffect`, and renders `© {year ?? ''}` (~178).
  - `src/components/civic/SignupCta.tsx` ~32 does `if (loading || user) return null;`.
- **Do:**
  1. `UserMenu`: while `loading`, render the signed-out buttons with `sx={{ visibility: 'hidden' }}` and `aria-hidden`, so they hold their space without flashing for signed-in visitors. Show them when signed out. Swap to the avatar when a user resolves.
  2. `SignupCta`: while `loading`, render the full CTA with `visibility: hidden` and `aria-hidden` (same height, no flash). Show it when signed out. Return `null` when a user resolves (a shift only for the signed-in minority, T3).
  3. Footer: render `new Date().getFullYear()` directly inside a `<span suppressHydrationWarning>`. Remove the state and effect. Keep the comment about the Jan 1 edge case.
  4. Run `npm run a11y -- --metrics` on `/`, `/committees` and `/search?q=education` (plain container), and on one bill and one member page (anon env with blocking, or preview). For any route still at CLS ≥ 0.1, find the node from the logged `sources` and fix it if it is in a file listed here. Otherwise list it under "Found, not fixed".
- **Don't:** restructure `UserContext`; change auth behavior; change fonts (WS6-17b); add `web-vitals` or another dependency.
- **Acceptance criteria:**
  - [ ] Lab CLS < 0.1 on all five routes. Paste the `--metrics` output.
  - [ ] `grep -n "if (loading) return null" src/app/components/Navigation.tsx` prints nothing.
  - [ ] tsc, lint, test and build pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, `npm run a11y -- --metrics`. Data routes need anon env or a preview.
- **Owner actions:** optional: on the preview, signed in, reload `/committees` and confirm that the header does not jump visibly.
- **Rollback:** `git revert`.

---

### WS6-16 · Run the axe check in CI with a no-regression baseline (optional)

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS6-08, WS1-04 | U14, E8, O4 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none. It is optional under the W2 cut line. **If cut:** WS6-19 runs `npm run a11y` once in FZ, and DoD #5 uses that run.
- **Data-limit impact:** none. The job uses no secrets and runs against its own `next start` build. GitHub Actions minutes are free for a public repo (D4).
- **Ongoing cost (true):** about 5–7 minutes of CI per matching PR [estimate], one baseline JSON to update when violations are fixed, and occasional flaky-run triage (about 0.5 h/month [estimate]). It adds a recurring cost and saves no scheduled work. Its value is catching a11y regressions that would otherwise ship silently.
- **Why:** Accessibility fixes regress silently without a gate (U14). WS1 left the browser assertion to this workstream.
- **Current state (verified 2026-10-06; re-check after WS1-04):** `.github/workflows/ci.yml` (from WS1-04) has `checks` and `build` jobs, Node 24, `npm ci`, no secrets. `scripts/a11y-check.ts` exists after WS6-08.
- **Do:**
  1. Implement `--baseline <path>` in `scripts/a11y-check.ts`: load `{ [route]: { [ruleId]: count } }` for `critical` and `serious`, and fail only when a route's count for a rule **exceeds** its baseline or a new rule appears. Print the diff.
  2. Commit `scripts/a11y-baseline.json` from a run over the CI routes (expected empty after WS6-08).
  3. Add an `a11y` job to `.github/workflows/ci.yml`:
     - `on.pull_request.paths`: `src/app/**`, `src/components/**`, `src/lib/theme.ts`, `scripts/a11y-check.ts`, `scripts/a11y-baseline.json`, `package.json`
     - checkout, `setup-node` (24, npm cache), `npm ci`, `npx playwright install --with-deps chromium`, `npm run build`, `npm run start &`, wait for `http://localhost:3000` (a `curl` retry loop of at most 60 s)
     - `npm run a11y -- --routes /,/bills,/members/map,/about --baseline scripts/a11y-baseline.json`
     - `timeout-minutes: 15`, no `secrets.*`, `NEXT_TELEMETRY_DISABLED: '1'`
     - If WS1-04 uses a single workflow-level `paths` filter, put the job in its own file `.github/workflows/a11y.yml` instead.
- **Don't:** add secrets; point CI at production or a preview; make `--metrics` gating; change WS1-04's existing jobs.
- **Acceptance criteria:**
  - [ ] `grep -c "secrets\." .github/workflows/ci.yml .github/workflows/a11y.yml 2>/dev/null` prints only zeros.
  - [ ] The PR's own CI run shows `a11y` green. Link it.
  - [ ] A throwaway commit that sets a heading color to `text.disabled` on `/about` makes `a11y` fail. Link the red run, then revert the commit.
  - [ ] tsc, lint, test and build pass.
- **Verify:** plain container: `npm run build && npm run start &`, then `npm run a11y -- --routes /,/bills,/members/map,/about --baseline scripts/a11y-baseline.json`. On GitHub: the PR Checks tab.
- **Owner actions:** after merge, decide whether to add `a11y` to the required checks in the WS1-07 ruleset. Recommended: not required. A red run is a review signal.
- **Rollback:** delete the job. If it is required, remove it from the ruleset first.

---

### WS6-17a · Raise body text size and add source links through tokens (optional)

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS6-08 | U16, O3 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** none.
- **Ongoing cost:** about 0. No new component.
- **Why:** Body text is 13–14 px gray (U16). Trust content is strong on `/about` but thin at decision points. A partner evaluating KYvKY (O3) sees typography and sourcing before features. **Cut-off:** merge by 2026-12-05 or it moves to Deferred (W2 cut line). Merge before WS6-09b's screenshots if possible, so its "after" images show final type.
- **Current state (verified 2026-10-06):**
  - `src/lib/theme.ts` typography (~139–157): `body1` 0.875 rem / `slate[700]`, `body2` 0.8125 rem / `slate[600]`, `caption` 0.75 rem / `slate[600]`.
  - `src/components/civic/LegiScanCredit.tsx` is server-safe (no `'use client'`) and renders "Bill data from LegiScan, CC BY 4.0, with our changes. What we change". Its only caller is `BillDetailView.tsx` ~1155.
  - `/about` (`src/app/about/page.tsx`) has a "Data sources" heading (~92) and a "District boundaries" entry (~115), with no `id` anchor.
  - `DataFreshnessNote` is a client component that queries Supabase, so it is not suitable for server pages.
- **Do:**
  1. Theme tokens: `body1` → `1rem`, line-height 1.6, `slate[800]`. `body2` → `0.9375rem`, line-height 1.6, `slate[700]`. `caption` → `0.8125rem`, `slate[600]`. Leave heading sizes.
  2. Add `id="data-sources"` to the `/about` "Data sources" heading.
  3. Extend `LegiScanCredit` with an optional prop `howLink?: boolean` that appends ` ` + a link `How we get this data` → `/about#data-sources`. Use it with `howLink` on the bill page and under the member voting record (render `LegiScanCredit` there too: roll calls come from LegiScan).
  4. Under the lookup result in `DistrictMapExplorer.tsx`, add one caption: `District boundaries from public data. How we get this data` (the second part a link to `/about#data-sources`). Re-check it against the `/about` "District boundaries" entry (~115).
  5. Take before and after screenshots of `/`, `/bills`, a bill page, a member page, `/meetings` and `/members/map` at 390 px and 1440 px (12 images, anon env with blocking, or preview). Fix any overflow caused by the size change with `sx` at the call site.
  6. Re-run `npm run a11y` (env-free) and keep 0 critical and 0 serious.
- **Don't:** introduce a MUI major; change the palette; add dark mode; redesign components; change fonts (WS6-17b); add copy beyond step 3–4.
- **Acceptance criteria:**
  - [ ] `theme.ts` shows the new sizes.
  - [ ] Twelve screenshots are attached, and none has horizontal overflow at 390 px (`document.documentElement.scrollWidth <= 390`).
  - [ ] `npm run a11y` exits 0.
  - [ ] tsc, lint, test and build pass. The copy has no em dash or semicolon.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, `npm run a11y`. Data-page screenshots need anon env or a preview.
- **Owner actions:** review the screenshots.
- **Rollback:** `git revert`.

---

### WS6-17b · Decide the heading typeface and remove Typekit if chosen (optional)

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P2 | W2 | Sonnet | S | WS6-17a | U16, D6 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Heading typeface.** Options:
  - (a) Keep Adobe Fonts `aesthet-nova`. It needs an active Creative Cloud plan, is a single point of failure (D6) with a graceful fallback (WS9-08), and loads third-party CSS.
  - (b) Switch headings to a serif served by `next/font/google` (self-hosted at build), for example Source Serif 4 [verify availability in `next/font/google`].
  - (c) Use the existing `Instrument Sans` for everything.

  **Recommended: (b).** It removes a paid dependency and a cross-origin CSS request and keeps a civic serif feel. **Decide by 2026-11-18**, so WS9-08 knows whether its font guard is needed. **Default if no answer by 2026-11-18: (a), no change** (brand is the owner's call), and this WP closes with no code.
- **Data-limit impact:** none. Option (b) removes a Typekit request on every page view.
- **Ongoing cost:** goes down under (b): one fewer vendor account, and WS9-08's guard test is deleted. About 0 under (a).
- **Why:** D6 lists Adobe Fonts as a single point of failure, and the visual identity reads as a stock template (U16).
- **Current state (verified 2026-10-06):**
  - `src/lib/theme.ts` (~19): `FONT_HEADING = '"aesthet-nova", "aesthet-nova-fallback", Georgia, …'`.
  - `src/app/globals.css`: the `aesthet-nova-fallback` `@font-face` blocks (~14–24) and `--font-display: "aesthet-nova", "aesthet-nova-fallback", Georgia, "Times New Roman", serif;` (line 85).
  - `src/app/layout.tsx` (~88–107) preloads `https://use.typekit.net/yru3sto.css`, attaches it with an inline script, and preconnects to `typekit.net`.
  - `next.config.ts` (~146–147) allows `typekit.net` in the CSP.
  - WS9-08 adds `src/lib/font-fallback.test.ts` and a vendors row for Adobe Fonts.
- **Do (option (b) only):**
  1. Add the font with `next/font/google` in `layout.tsx` (`display: 'swap'`, `subsets: ['latin']`, `variable: '--font-heading'`).
  2. Set `FONT_HEADING = 'var(--font-heading), Georgia, serif'` and `--font-display: var(--font-heading), Georgia, "Times New Roman", serif;` in `globals.css`.
  3. Remove the Typekit preload, inline script, `noscript` and the `typekit.net` preconnects. Remove `typekit.net` from the CSP and from `/privacy` if it is named there. Delete the `aesthet-nova-fallback` `@font-face` blocks.
  4. Delete WS9-08's `src/lib/font-fallback.test.ts` and the Adobe row in `docs/ops/vendors.md` (or wherever WS9-08 put it) [verify the path].
  5. Screenshots of `/`, a bill page and a member page at 390 px and 1440 px.
- **Don't:** change sizes (WS6-17a); cancel the Adobe kit (Owner, later).
- **Acceptance criteria:**
  - [ ] Under (b), `grep -rni "typekit\|aesthet-nova" src next.config.ts` prints nothing.
  - [ ] Six screenshots attached with no horizontal overflow at 390 px.
  - [ ] tsc, lint, test and build pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`.
- **Owner actions:** decide by 2026-11-18. Under (b), cancel the Adobe Fonts kit only after 30 days in production. That is a money decision.
- **Rollback:** `git revert`. Under (b), the Typekit kit must still exist to roll back, so keep it for 30 days.

---

### WS6-19 · Run the pre-session product readiness drill

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | FZ | Sonnet | S | WS6-04b, WS6-06, WS6-07, WS6-08, WS6-09b, WS6-10, WS6-11b, WS6-12a, WS6-18 | U4, U12, U13, U14, T7 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** none.
- **Data-limit impact:** one production a11y run with WS6-08's request blocking on: 0 LRC requests, 0 writes, 0 PostHog events. Record "production run: 1, blocked requests: N" in the PR. The owner's checks on 2027-01-05 and 01-06 are ordinary page views.
- **Ongoing cost:** none. A one-time drill that adds a section to an existing doc.
- **Why:** The 2027 session is the first one the current product and analytics will observe (T7). FZ allows readiness work only. This drill proves the WS6 definition of done before 2027-01-05 and leaves a short day-one checklist.
- **Current state (verified 2026-10-06):** `docs/launch-checklist.md` exists. It is unchecked for the legal review (S10) and has no session-start section.
- **Do:**
  1. Run `npm test` and confirm that the WS6-10 date tests cover 2027-01-05, 01-12, 02-02, 03-15 and 04-02.
  2. Run `npm run a11y -- --metrics` on env-free routes (plain container), and **once** on `DATA_ROUTES` against production with blocking on. Record CLS, JS bytes and axe counts in the PR.
  3. Walk DoD items 1–11. Mark each **met** (with command output or a screenshot path), **deferred** (its WP was deferred under the cut line; name the revisit trigger) or **not met** (open a W3 small-fix issue). Do not fix anything in FZ unless it is a one-line correction.
  4. Append to `docs/launch-checklist.md` a section `2027 session start (product)` with owner checks for 2027-01-05/06:
     - home shows "Today in Frankfort"
     - `/bills` defaults to the 2027 RS with the empty state until bills arrive, then lists them
     - the banner shows the session dates
     - one bill page and one member profile load with no console errors, and "Show how members voted" opens on a 2026 roll call
     - the members-elect note is gone, and the lookup shows the newly seated members (with WS9-13)
     - one email-link login completes on a phone (if the flag is on)
- **Don't:** refactor; change dependencies; run any sync; point the a11y script at production more than once or without blocking.
- **Acceptance criteria:**
  - [ ] The PR body has the DoD table with a status and evidence for items 1–11.
  - [ ] `docs/launch-checklist.md` has the new section.
  - [ ] tsc, lint and test pass.
- **Verify:** plain container: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run a11y`. One production a11y run, read-only with blocking.
- **Owner actions:** do the 2027-01-05 and 01-06 checks and tick them in the checklist.
- **Rollback:** `git revert` (docs only).

---

### WS6-20 · Review session product usage and retire surfaces that did not earn their keep

| Priority | Window | Tier | Size | Depends on | Findings |
|---|---|---|---|---|---|
| P1 | W4 | Sonnet | S | WS6-19, WS7-12, WS7-13 | T2, T5, T6, E3, U4, U8, U10, U11 |

- **Program class:** Backlog — pick up only after Core items in its window are done, or when its trigger fires; re-verify Current state at pickup
- **Owner decision:** **Apply the retire list.** The agent proposes keep / delete / defer per surface. Options: (a) apply the proposal as written; (b) apply it with owner edits; (c) keep everything. **Default if no answer by 2027-04-30: (a)** for rows marked "delete" whose evidence meets the stated threshold. Rows without evidence default to "keep".
- **Data-limit impact:** none external. It reads WS7-12/13 readouts and PostHog data the owner exports. The agent makes no PostHog API calls unless the owner provides a read-only export.
- **Ongoing cost:** goes **down**. Each deletion it proposes removes code to maintain.
- **Why:** The core critique is that the project is overbuilt for its audience (~78k LOC). The W4 go / partner / maintain decision (WS8-16) needs product evidence, and the Deferred table below has "W4 data shows…" triggers that someone must resolve. WS9-14 does this for operations only.
- **Current state (verified 2026-10-06):** candidate surfaces exist today: `/feed`, `/bills/topics`, `/search` scope, glossary tooltips (`src/lib/TooltipContext`), email-follow (if WS6-12b shipped), key votes (WS6-11b), "Show how members voted" (WS6-18), the home "Most viewed" carousel. [verify each path exists in W4]
- **Do:**
  1. Build a table, one row per candidate surface: share of human visitors who used it during W3 (from WS7-12's readouts, or an owner export), maintenance touched (PR count since 2026-10-06 from `git log --oneline -- <path> | wc -l`), and a proposal: **keep**, **delete** (proposed when use is under 0.5% of visitors **and** the surface is not on the find-my-legislator, bill-vote or weekly-email path), or **defer** (insufficient data).
  2. Resolve every row in this file's [Deferred](#deferred) table: met its revisit trigger, not met, or close it. Then fill the W4 status (`fired` / `not fired` / `revived`) of the WS6 rows in `DEFERRED.md`, and only those rows. Filling a status is not a verdict.
  3. Write it to `docs/evaluation/2027-04-product.md` (not to this file, which WS5-15 keeps at zero growth) under the heading `W4 product review (2027)`, and list one deletion PR per "delete" row (each S, Sonnet).
  4. Send the summary to WS8-16's decision record as product input.
- **Don't:** delete anything in this PR; add analytics; change the thresholds after seeing the data (they are fixed in step 1).
- **Acceptance criteria:**
  - [ ] Every candidate surface and every Deferred row has a decision with evidence or "no data", and every WS6 row in `DEFERRED.md` has a W4 status.
  - [ ] The deletion PR list names files by path.
  - [ ] `npm test` passes (docs only).
- **Verify:** plain container: `npm test`, `npm run lint`.
- **Owner actions:** provide the PostHog export if WS7-12 does not cover a surface. Approve or edit the list by 2027-04-30.
- **Rollback:** `git revert` (docs only).

---

## Deferred

These rows are also in the program register, `DEFERRED.md`, where WS6-20 records their W4 status.

| Item | Finding | Reason | Revisit trigger |
|---|---|---|---|
| Legislator follows (formerly WS6-13: table, route, button, `/profile` list) | U10, C2, C5 | WS7-09a's default keys the weekly email on district numbers and rejects a legislator-follow table, because it would point at departing members after the election. Built dark, it would be a public route and a table with no payoff. The committee-follows export gap it also fixed is in WS7-07a. | WS7-09a's owner chooses option (b), or a partner requires per-legislator follows. |
| Party-line statistic on member profiles | U11 | A new kind of partisan-adjacent claim. Digital Democracy's comparable output is human-reviewed (C2). A solo operator without editorial review should not compute it. | A partner with editorial review asks for it. |
| `/bills` Cards/List toggle and compact list (`BillsListTable`) | U8 | `/bills` browsing is not the core behavior (T5: search 1.7%, topic 0.5%). WS5-02 deletes the orphan `BillsListTable.tsx`. If revived, restore it with `git show <WS5-02 parent sha>:src/components/bills/BillsListTable.tsx`. | WS6-20 shows `/bills` sessions above 15% of visitors in W3. |
| Card chip density ("chip soup") | U8 | Label meaning is WS3-13's. Density changes wait for the list-view decision. | Same as the list view. |
| Instant (per-event) alerts | U10 | Today 4 accounts have the digest on (T3). Instant alerts need a new schedule or trigger and more sends against Resend's free tier of about 100 a day (D4). The daily digest already runs at 11:00 UTC. | More than 200 digest subscribers, or a partner requires it. |
| Homepage animated live-feed preview (TASKS.md Task 5 and "Home feed concept") | U4 | Superseded by WS6-10's calendar-driven sections and WS7-10's card. No evidence of demand. | WS6-20 shows signed-in return rates worth a feed. |
| Full visual refresh or MUI v7 restyle | U16, S1 | WS2 deferred the MUI major. WS6-17a/b cover type and sources on v5 tokens. A restyle during FZ or W3 is off-limits. | W4 "partner" outcome with a partner's design system, or the WS2 trigger. |
| Converting the bill page's existing client children to server components | U13, E10 | WS6-09a keeps them as islands to stay one PR. The JS win is unmeasured. | WS6-09a's JS report shows the bill route above 350 kB and a profile names the largest child. |
| `/search` hierarchy redesign (`SearchPageClient.tsx`, 1,011 lines) | E10, U13 | Search is used by 1.7% of visitors (T5). Only its CLS is fixed (WS6-15). | Search share above 5% of visitors in session. |
| Browse legislators by voting pattern | U11 | TASKS.md "Legislator exploration is thin". WS6-11a/b cover the per-profile layer first. | Partner request or WS6-20. |
| Interactive legislative-process flowchart (TASKS.md) | U4 | A new content surface that needs owner art. Guides already exist. | WS6-20, if guides traffic grows. |
| Welcome-email iconography (TASKS.md) | none (email) | Email design belongs with WS7. WS6-04b keeps `public/lottie/*.json` for it. | WS7 touches the welcome email. |
| Status label wording ("three became-law labels") | U8 | Owned by WS3-13. | n/a |
| Signed-in mobile a11y sweep | U14 | Needs an authenticated session, which secret-free CI cannot have. WS6-08 covers signed-out routes. | Owner provides a test account and preview. Then run `npm run a11y` with a logged-in storage state. |
| Home signup band (TASKS.md Tier B) | U10 | The weekly email (WS7-09d signed in, WS7-09f signed out) and the email link (WS6-12a) are the signup path. A generic prompt waits for their data. | WS6-20. |
| Any optional W2 WP not merged by 2026-12-05 (WS6-12b, 14, 15, 16, 17a, 17b) | as listed | W2 cut line. | WS6-20 decides whether to revive each one. |
| Dark mode | U16 | Out of scope per the theme comment ("guidelines §14"). | none |

## Findings re-checked

- **U4, partly stale.**
  - "Recent legislative action" already hides itself after 30 days without substantive action (`LATEST_ACTION_WINDOW_DAYS = 30`, `src/lib/ky-home-bill-highlights.ts`). Only "Most viewed bills" shows April bills.
  - "Most viewed" ranks by PostHog unique visitors over the past day and **falls back** to lifetime `view_count` when the PostHog server credentials are missing or fewer than 3 bills resolve. Which path production uses is unverified [verify `POSTHOG_PERSONAL_API_KEY` in Vercel env, Owner]. WS6-04b removes the fallback either way.
- **U9, partly wrong.** Party is not shown by color alone visually: the avatar badge contains a letter (D/R). The letter is `aria-hidden` and about 9 px, so assistive technology gets no party at all, and no profile shows party as text. WS6-08 fixes both.
- **U12, framing.** `/bills` defaulting to the 2026 RS in the interim is by design (`getCivicDataSessionName`), and it flips to 2027 automatically on 2027-01-05. The defect is the missing explanation, which WS6-10 adds. The market note "prefiling was abolished in 2022" conflicts with the live banner and the glossary tooltip [verify against LRC]. WS6-04a decision 2 makes both neutral either way.
- **U13, nuance.** The home Mapbox preview is already lazy-mounted through an IntersectionObserver with a 100 px margin. It loads on desktop because the section sits near the fold. WS6-04a removes it rather than tuning the margin.
- **U17 and N5, confirmed with cause.** `CommitteeMeetingCard` already supports `agendaPreview`. `/meetings` never passes it, and `KY_MEETING_BROWSE_SELECT` excludes agenda data. **New:** the meetings window reaches back to the most recent session start (about 9 months today) with `limit(500)` in ascending order, so upcoming meetings are the rows cut off if the window exceeds 500. WS6-06 fetches upcoming meetings separately and reports the window limit to WS3-06a.
- **New evidence, D3/O2.** `/api/lrc/bill-link-status` (`force-dynamic`, no cache, a User-Agent with no job name) makes 1–3 LRC requests on every bill page view, crawlers included. WS4-09a's inventory does not list it. WS6-03 (W0) caches it, and WS6-09a removes the route.
- **New evidence, U11.** Member tallies are computed from at most the 200 most recent roll calls (`maxRows: 200`; the RPC caps at 500), while the caption reads as a session total. WS6-05 (W0) makes the caption honest, and WS6-11a computes the whole-session tally.
- **New evidence, auth.** `createBrowserClient` from `@supabase/ssr` forces PKCE, so browser-requested email links work only in the requesting browser. WS6-12a adds the cross-device `token_hash` path.
- **New evidence, digest.** `maybeEnableDigestOnFirstBillFollow` ignores committee follows, so a committee-only follower never gets the digest that the follow UI implies. WS6-12b generalizes it. Until then, this is a known gap for the 6 accounts that follow anything (T3) [verify whether any follow only committees, as an aggregate count, Owner].
- **New evidence, U13.** `SignupCta` and `UserMenu` render `null` while auth loads, and the footer year is set in an effect. These are the likely post-hydration shift sources. WS6-15 fixes them.
- **E3 / WS5-02.** `src/components/bills/BillsListTable.tsx` is never imported, and WS6 does not use it, so WS5-02 may delete it.
- **Privacy, moved.** `/api/me/export` omits `ky_committee_follows`. WS7-07a fixes it.
