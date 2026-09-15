# Handoff — Tier 1, analytics-driven re-prioritization (2026-09-15)

Five tasks re-ranked from the Wishlist & Roadmap after a PostHog review of the September
organic surge. Ship order matters: 1 unblocks a real search read, 2 unblocks 4's link
hierarchy, 3 supplies the vote-card shape 5 will reuse. Do not batch — one task per PR.

## Context you need before touching anything

- **Notion Wishlist & Roadmap** — the `📊 Data context — 2026-09-15` callout and the
  `Data-driven adds (2026-09-15)` section on
  [Wishlist & Roadmap](https://app.notion.com/p/3aff63e8815781a6be0ad62bb292f9bb) are the
  live prioritization. If they disagree with this file, Notion wins — this file is a
  snapshot for execution.
- **PostHog notebook** —
  [Sep 2026 organic surge — findings & re-prioritization](https://us.posthog.com/project/450281/notebooks/4q9H7yCK)
  captures the numbers behind the ranking. Read it once before starting.
- **PostHog dashboard** —
  [Know Your Vote Kentucky App Dashboard](https://us.posthog.com/project/450281/dashboard/1656654)
  has the DAU/WAU, retention, growth-accounting, funnel, top-pages, registrations, search,
  and (new) registered-user conversion tiles you will read to verify each ship.

## Ground rules

1. **One task per PR.** Sequencing is by dependency, not batch size.
2. **Instrumentation before UI redesign.** Task 1 and Task 2 land events; they do not touch
   layout. `/search` overload redesign and legislator link hierarchy are explicitly out of
   scope here — see the Wishlist for why.
3. **Filter test accounts.** PostHog insights created for these tasks should set
   `filterTestAccounts: true` and mirror the DAU/WAU tile's exclusions
   (`$current_url not_icontains vercel.app`, `email not_icontains minafter.com`,
   `$referrer not_icontains vercel`, `$referrer not_icontains minuteinbox.com`) unless a
   task below says otherwise.
4. **Analytics wrapper.** Client events go through `src/lib/analytics.ts` — its `capture()`
   helper handles the SSR/loaded guards. Never call `posthog.capture` directly from
   components. Add a typed helper next to the others in that file when introducing an
   event.
5. **Do not skip, disable, or work around the `filterTestAccounts` project setting.** It
   is the assumption behind every existing tile.

---

## Task 1 — Distinguish suggestion-chip vs typed searches on `search_performed`

**Why first.** Every downstream `/search` decision (whether the overload redesign is worth
doing, what the topical entry point should look like, whether to keep suggestion chips at
all) is blocked on knowing which search intent is real vs. chip-click noise. Filed in the
Wishlist Log 2026-08-23; already in `TASKS.md` Backlog under "Owner wishlist, filed
2026-08-23."

### Scope

Add a `source` property to the existing `search_performed` event. Values:

- `"typed"` — user typed a query and submitted (Enter, Search button, form submit).
- `"suggestion_chip"` — user clicked a subject-suggestion chip on `/search`.
- `"topic_chip"` — user clicked a topic chip that routes into search (e.g. the
  "Women's health" / "Data centers" chips on `/bills`).
- `null` — programmatic re-executions (URL param change on back/forward, deep-link
  landing with a `?q=` present); do not force these into one of the above.

### Files

- `src/lib/analytics.ts` — extend `trackSearchPerformed` to accept
  `source: "typed" | "suggestion_chip" | "topic_chip" | null` and pass it through as
  `source` on the capture payload. Default to `null` if unspecified, to keep existing call
  sites compiling.
- Every call site of `trackSearchPerformed` — pass `source` explicitly. Do not rely on the
  default; the point of the property is that it is always set at the call site.
- Search-page + bills-page chip handlers — each chip's click handler already navigates
  to `/search?...`; the search execution then fires `search_performed`. Route the intent
  through so the execution knows why it ran. If the chip navigates and the search page
  reads it from the URL, add a short-lived `?source=` (or a session-storage handoff) and
  strip it before user sees it.

### Acceptance

- The four Trends tiles the team already cares about (top searches, search volume over
  time, and any new insights broken down on `source`) can filter by `source`.
- `search_performed` events emitted after the deploy carry a `source` property on every
  fired event; check in PostHog Live Events.
- No backfill of historical events. `source: null` on pre-fix rows is fine.

### PostHog validation (post-merge)

1. Live-events tail on `search_performed` for 15 minutes — confirm every event has
   `source` populated.
2. Duplicate the existing "Top search queries" insight, add a breakdown on `source`, save
   it as `Top search queries by source` and attach to dashboard 1656654.
3. Two weeks after deploy: read the split. Whichever source has < 10 events over two
   weeks is a candidate for removal in a later PR.

### Do not do in this PR

- Do not redesign `/search`. Do not remove any chips. Do not change chip visual state.

---

## Task 2 — Click analytics on legislator outbound links + aggregate heatmap

**Why second.** The legislator page is the #1 traffic destination (see the "Top pages by
pageview" tile — 187 pageviews on the two "Find my legislators" title variants combined,
143 on the Kentucky state legislators list). The Wishlist wave-2 "link hierarchy
unvalidated" item is stuck without this data. Instrumentation only — no UI redesign.

### Scope

Add a single client event `outbound_link_clicked` fired from every outbound link on
`/members/[id]` profiles and the `/members/[id]/*` sub-surfaces:

Properties:

- `destination_host` — `apps.legislature.ky.gov`, `ballotpedia.org`, `twitter.com`,
  `x.com`, `facebook.com`, `instagram.com`, `linkedin.com`, `youtube.com`,
  `tiktok.com`, `threads.net`, plus a bucket `"other"` for anything else. Use the URL's
  hostname; strip `www.` and normalize `x.com`/`twitter.com` under one label
  (`"twitter_or_x"`) — the same person may be linked either way and dashboards should not
  fight it.
- `link_type` — one of `"ky_legislature"`, `"ballotpedia"`, `"social"`, `"other"`. This is
  the field the hierarchy decision will read; keep it stable.
- `member_id` — the KY member ID (e.g. Adam Moore's slug or numeric ID, whichever your
  route uses today — pick one and document it in the helper).
- `chamber` — `"house"` or `"senate"`.
- `party` — `"D"` | `"R"` | `"I"` (member's stored party); useful for the heatmap.

### Files

- `src/lib/analytics.ts` — add `trackOutboundLinkClicked(props)` next to the other named
  helpers.
- `src/components/civic/LegislatorIdentityBlock.tsx` and any other file that renders the
  outbound links on member profiles (grep for `apps.legislature.ky.gov`,
  `ballotpedia.org`, and each social host under `src/components/`). Add `onClick`
  handlers that call the helper. Do not `preventDefault` — the click still opens the link
  in a new tab.

### PostHog validation

Create three insights and attach all three to dashboard 1656654:

1. **`Outbound-link clicks by link_type`** — Trends, event `outbound_link_clicked`,
   breakdown on `link_type`, 90d, `ActionsBarValue`.
2. **`Outbound-link clicks by destination_host`** — same, breakdown on
   `destination_host`, top 15.
3. **`Outbound clicks per member profile (top 20)`** — Trends, event
   `outbound_link_clicked`, breakdown on `member_id`, top 20, `ActionsBarValue`. This is
   the aggregate heatmap the Wishlist wave-2 item calls for; a bar chart across
   `member_id` gives us the rollup pattern.

### Acceptance

- The three insights render non-zero data within 24 hours of deploy.
- Every outbound link on every legislator profile fires the event.
- The event payload has all five properties on every fire; check Live Events.

### Do not do in this PR

- Do not change link order, weight, size, or style. The point of this task is to gather
  the data the hierarchy decision needs; the hierarchy decision is a later PR.
- Do not add social handles that are not already displayed. Adding handles is Task 4.

---

## Task 3 — Individual legislator votes behind the tally tags (design pass first)

**Why third.** Biggest content upgrade to the highest-traffic page. Data already stored on
every roll call, so this is design + interface, not pipeline. Filed in the Wishlist
Product surface & UX section; the ICP review flagged it as P0.

### Scope

Two PRs, in order:

1. **Design PR.** A single Notion/Figma page (linked from the Wishlist item and this
   handoff) that decides: how per-member votes surface (inline expand under the tally
   bar, drawer, secondary tab); how the vote list is ordered (by party then last name is
   the default; open to alternatives); how the mobile view degrades; whether the block is
   default-open or default-collapsed. Get Katie's sign-off before touching code.
2. **Build PR.** Implement the approved design. Reuse existing `LegislatorAvatar` +
   `LegislatorIdentityBlock` components — do not fork them. Route reuse through the same
   `outbound_link_clicked` helper from Task 2 where the member row links to the profile.

### Instrumentation for the build PR

Add two events:

- `bill_votes_expanded` — fires when a user opens the per-member votes block on a bill.
  Props: `bill_id`, `roll_call_id`, `default_open` (bool).
- `bill_vote_member_clicked` — fires when a user clicks through from a per-member vote
  row to a legislator profile. Props: `bill_id`, `roll_call_id`, `member_id`, `vote`
  (`"yea"` | `"nay"` | `"nv"` | `"absent"`).

### PostHog validation

Create one insight after the build PR ships:

- **`Per-member vote block — engagement`** — a funnel: `$pageview` on a bill page →
  `bill_votes_expanded` → `bill_vote_member_clicked`. This is the retention hypothesis in
  measurable form; if the third step is near zero, per-member votes are being consumed but
  not driving profile-page depth, which is a signal for Task 5's feed idea rather than
  more work here.

### Acceptance

- Design PR: approved page linked from the Wishlist item.
- Build PR: per-member votes render on at least one recent roll call on `/bills/[id]`;
  three events (`bill_votes_expanded`, `bill_vote_member_clicked`,
  `outbound_link_clicked`) fire correctly.

### Do not do in this PR

- Do not change the roll-call display for chambers that don't yet publish per-member
  votes. Fall back to the current tally bar.
- Do not touch the "passed" tag from the Wishlist item — that is a separate PR on the
  same section.

---

## Task 4 — Legislator social media handles on profiles

**Why fourth.** Deepens the same top-traffic page and pairs naturally with Task 2 — the
new handles show up in the same link hierarchy those analytics measure. Doing it before
Task 2 would be building blind; doing it after lets the first two weeks of click data
inform which platforms carry visible weight.

### Scope

- Add optional social handle fields to the member data model:
  `twitter_or_x_handle`, `facebook_url`, `instagram_handle`, `youtube_url`,
  `linkedin_url`, `tiktok_handle`, `threads_handle`. Nullable; do not require any.
- Render as icon links on `/members/[id]` when populated. Reuse the icon-link pattern
  from the Wishlist "Collapse the LegiScan source link into an icon" item — same
  tooltip / a11y approach, same 44px touch target floor.
- Route every click through `trackOutboundLinkClicked` (Task 2's helper) with
  `link_type: "social"` and the appropriate `destination_host`.

### Data entry

The long tail is populating the fields, not the code. Two options; pick whichever Katie
prefers and put the choice in the PR description:

- **Manual bulk load** — a one-time CSV import for the ~138 sitting members. Owner:
  Katie (SME).
- **Progressive rollout** — ship the code with fields empty; populate over time from
  the LRC directory + candidate campaign links.

### PostHog validation

Read the Task 2 insight `Outbound-link clicks by destination_host` two weeks after this
PR ships. The `link_type: "social"` share vs `"ky_legislature"` and `"ballotpedia"` is the
data the hierarchy decision reads.

### Acceptance

- Handles visible on at least the House roster with a data-loading plan Katie has
  approved.
- No unpopulated icon appears for members without handles (empty state renders nothing,
  not a broken icon).
- Every click fires `outbound_link_clicked` with correct properties.

### Do not do in this PR

- Do not scrape handles automatically from third parties. Handle attribution is a trust
  surface — see the Guiding Principles page.
- Do not add a "verified" or "official" badge; we don't have a reliable primary source
  for that.

---

## Task 5 — Homepage live-feed preview (design pass only)

**Why fifth (still Tier 1).** Biggest retention lever in the backlog — Week-1 retention
is 0–3% today, and this is the only backlog item that gives an anonymous visitor a
tangible reason to come back. But it is also the biggest design scope, so this handoff
covers **design only**. A build PR is a separate scope decision at the next planning
pass.

### Prerequisite

Task 3's design PR must be approved. The live-feed preview reuses the vote card shape
Task 3 defines; designing it before Task 3 lands means two different vote card designs
in flight at once.

### Scope

A single design page that answers:

- **Signed-out preview** — what event types render (new bill, roll-call vote, committee
  action, sponsor announcement), how the animation looks, how it degrades under
  `prefers-reduced-motion`, whether it pauses on hover, whether it's default-on or an
  opt-in surface.
- **Signed-in filtered feed** — how the same surface flips to the user's actual
  followed bills / members / committees; what happens when the user has followed
  nothing yet.
- **Empty and error states** — no events in the last 24h, event loading failed.
- **Mobile** — the feed at 375px width.
- **Filters** — topic, chamber, event type. Pick the smallest set that answers the
  homepage-preview job; move the rest to a follow-up.

### Deliverable

A Notion page (linked from the Wishlist item) with the above, plus one screenshot per
state that a contract engineer could build against. No code in this task.

### Do not do in this task

- Do not implement the feed. Build scope decision is deferred to the next planning
  pass.
- Do not decide whether partisanship shows on bill event cards. That question is called
  out in the Wishlist wave-2 item and is not this task's to resolve.

---

## What NOT to do under this handoff

- **`/search` overload redesign** — the Wishlist explicitly holds this until Task 1's
  event property has produced two weeks of data. If Task 1 lands and you feel the urge
  to keep going on `/search`, stop and read the Notion callout.
- **The `.org` rebrand** — a data-visible SEO problem justifying the full rebrand does
  not exist yet. Interim path-preserving redirect (Wishlist Infrastructure section) is
  fine.
- **Legislator link hierarchy redesign** — blocked on two weeks of Task 2 data. Do not
  guess at the ordering.
- **Auto-generated posts about bills** (Tier 2) — worthwhile, but do not start until
  Tier 1 has shipped.

## References

- Notion — [Wishlist & Roadmap](https://app.notion.com/p/3aff63e8815781a6be0ad62bb292f9bb)
- Notion — [Strategic Hub](https://app.notion.com/p/3abf63e88157818c9b63ff23f64103c1)
- PostHog — [Sep 2026 organic surge notebook](https://us.posthog.com/project/450281/notebooks/4q9H7yCK)
- PostHog — [App dashboard 1656654](https://us.posthog.com/project/450281/dashboard/1656654)
- PostHog — [Registered-user conversion rate insight](https://us.posthog.com/project/450281/insights/kX1m5xzU)
- Repo — [TASKS.md](../TASKS.md) (owner wishlist entries filed 2026-08-22, 08-23, 08-31)
