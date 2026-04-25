# Know Your Vote Kentucky — Task Tracker

> This file is the source of truth for roadmap tasks.
> Update it as work is completed or priorities shift.
> It lives in the repo so any AI with file access can read and act on it.

---

## In Progress

_(nothing active — last deploy was tooltip system wiring, Apr 2026)_

---

## Up Next

- [x] **Tooltip toggle parity** — `MemberCard` Ballotpedia tooltip now respects the global `tooltipsEnabled` toggle. Added `useTooltips` import and gated MUI `title` prop on `tooltipsEnabled`.

- [ ] **Inline term tooltips on bill detail page** — `src/app/bills/[id]/page.tsx` renders the bill history/action log as free-form text strings from LegiScan. Terms like "recommitted," "engrossed," "posted for passage" appear there but have no tooltips. Approach: scan action text for known terms and wrap matches in `<LegislativeStageTooltip>`. Keys and content already exist in `src/lib/tooltipContent.ts`.

- [ ] **Map page: explain the two-rep system** — Add a one-line callout in the right sidebar of `src/components/members/DistrictMapExplorer.tsx` explaining that every Kentuckian has both a House rep and a Senate rep representing different-sized districts. Currently confusing for first-time users.

- [ ] **Vote cards: link to Ballotpedia vote pages** — Vote cards in the bill detail sidebar (third child in `MuiGrid-grid-md-4`, selector: `div.MuiGrid-grid-md-4 > div:nth-child(3) > div > div:nth-child(2)`) should be clickable and link to their respective Ballotpedia vote pages. Find the vote card component, look up the Ballotpedia vote URL pattern, and add navigation. Check whether Ballotpedia has direct vote URLs or if this requires linking to the bill page with an anchor.

- [ ] **Audit all Ballotpedia and external links** — Some external links (Ballotpedia, KY Legislature, etc.) are landing on search results pages instead of the actual legislator or bill page. Audit `ballotpediaMemberSearchUrl()` in `src/lib/ky-member-utils.ts` and any other link-building functions. Check whether Ballotpedia has a direct profile URL pattern available or if the search URL is the best option. Fix any links that can be made more direct.

- [ ] **Revisit 100-bill fetch limit rationale** — `BillsBrowse.tsx` line 60 hardcodes `.limit(100)` on the Supabase query. This was set intentionally in a previous session — revisit the original reason before raising it. If the concern was performance/cost, evaluate whether loading ~500–600 bills (a full KY session) is acceptable. If approved, raise to 1000 (Supabase's per-query max). Related to the results-per-page task below.

- [ ] **Results per page selector** — Add a control to let users choose how many results are shown at once (25 / 50 / 100). Applies to bill browse, search results, and any other paginated lists. Find the pagination component (`src/components/ui/PaginatedSection.tsx`) and add a page size selector. Persist the preference in localStorage so it carries across pages.

- [ ] **District map nav icon: replace with Kentucky state shape** — The district map nav item currently uses a generic map icon. Replace with an SVG outline of the state of Kentucky. The icon is likely set in `src/app/components/Navigation.tsx` or `src/components/mobile/MobileHeader.tsx`. Create or source a clean minimal KY state outline SVG and use it as a custom icon. `public/` is a good place to store it, or inline it as a React component in `src/lib/icons.tsx`.

- [x] **Fix mobile menu background color** — Changed `Collapse` menu in `Navigation.tsx` from blue primary gradient to `background.paper`. Updated `mobileNav` colors from white `contrastText` to `text.secondary`/`primary.main`. All active borders and indicator dots now use `primary.main`.

- [ ] **Update hero section copy and CTA** — Current copy needs a refresh. Decide on new headline, subhead, and CTA button text before implementing.

- [ ] **Update official calendar link** — The link to the official KY General Assembly calendar is outdated or pointing to the wrong URL. Find where it's hardcoded and update to the current session calendar.

- [ ] **Fix session status banner** — Banner currently says the session is adjourned but there is still activity in the House. Verify the correct session status and update the banner logic. May need to revisit how adjournment is detected — check whether the app is reading a hardcoded date or a live source. The 2026 regular session adjourned sine die in the Senate but House action continues; banner should reflect this accurately or be removed until status is confirmed.

- [x] **Hide view count from "Most Viewed" section** — Removed `line="viewCount"` prop from the `HomeCuratedBillList` in `src/app/page.tsx`.

- [ ] **Footer: copyright, version, and licenses** — Add a subtle copyright line and version number to the site footer (`src/app/components/SiteFooter.tsx`). Should read something like: `© 2026 The Eighth Dimension, LLC` with a version string (pull from `package.json` or hardcode). Also include relevant license attributions — at minimum MIT (the project license), plus any data source attributions required by LegiScan, OpenStates, Mapbox, and OpenStreetMap terms. A small "Licenses" link opening a modal or linking to a `/licenses` page is cleaner than listing them inline. Keep all of it low-contrast and small — purely informational.

- [ ] **Audit "(clerical)" label in bill timeline** — The bill detail timeline (second child in the `MuiGrid-grid-md-8` main column, selector: `div.MuiGrid-grid-md-8 > div:nth-child(2) > div`) labels some actions as "(clerical)." Verify this is the correct term for what's being described — check against KY LRC usage. If accurate, consider adding a tooltip explaining what clerical actions are (e.g., "An administrative step with no effect on the bill's substance or status"). If not accurate, find the right label.

- [ ] **Increase card images by 50%** — Images inside `MuiCard-root.css-e9ouj7` in the main content area are too small. Scale up by 50%. Selector: `#main-content > div > div > div.MuiCard-root`. Find the component setting the image size and multiply the width/height values by 1.5.

- [ ] **Reduce top/bottom padding on second sidebar item** — The second child in the right-hand `MuiGrid-grid-md-4` sidebar has too much vertical padding. Halve the top and bottom padding. Selector: `div.MuiGrid-grid-md-4 > div:nth-child(2)`.

- [ ] **Remove border/shadow on bill sidebar card** — The first card in the right-hand 4-column grid sidebar (MUI `MuiGrid-grid-md-4`) has an unwanted border or box shadow. CSS selector for reference: `#main-content > div > div > div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-3 > div.MuiGrid-grid-md-4 > div:nth-child(1) > div > div.MuiBox-root > div > div`. Track down the component and remove the border/shadow styling.

- [ ] **Map toggle UX** — The OFF | HOUSE | SENATE district layer toggle is not intuitive. "OFF" could be "None." Consider whether showing both layers simultaneously (two checkboxes) would be better than a mutually exclusive toggle.

---

## Backlog

- [ ] **"Follow this bill" — email alerts** — Allow users to subscribe to a bill and receive an email when there is new action (status change, vote, signing, veto). Requires: user accounts or email-only opt-in, a subscription table in Supabase, a check during the data sync pipeline to detect changes and trigger notifications, and a transactional email provider. **Resend** is the suggested provider (resend.com — simple API, generous free tier). Notify on: status change, new vote recorded, signed by Governor, vetoed. This is a meaningful civic engagement feature but is post-MVP — requires auth/user system first.



- [ ] **Address autocomplete on map** — Currently only ZIP code search. Full address autocomplete (via Mapbox Geocoding) would be more precise and friendlier, especially for users near district boundaries.

- [ ] **Rep contact section on map** — Surface phone and email for each rep directly in the map sidebar member card. `MemberCard` already renders these when data exists; the map page uses a stripped-down version. Evaluate showing `CopyableEmail` inline.

- [ ] **Rep sponsored bills on member profile** — `src/app/members/[slug]/page.tsx` — show bills this legislator has sponsored with live status. Hook into `/api/bills` filtering by sponsor.

- [ ] **Voting record summary on member profile** — Show a simple yea/nay count for the current session on the member profile page. Data is in `ky_votes` table.

- [ ] **"How to contact your rep" explainer** — Expandable section on the map or member profile explaining that constituents can attend committee hearings, submit written testimony, and call/email reps. Civic education layer.

- [ ] **Filter/browse by committee on members page** — Users interested in a specific policy area (e.g., Education) can't currently find all Education Committee members in one place.

- [ ] **Session status banner** — Prominently surface whether the General Assembly is currently in session or adjourned sine die. The 2026 regular session adjourned April 2026; next regular session is January 2027.

- [ ] **Events page** — Currently hidden from frontend nav (`noindex`, not in primary nav). Built but deprioritized. Has its own inline term detection logic in `src/app/events/[id]/page.tsx` that still references some federal terminology — clean up before re-enabling.

---

## Deferred / Decided Against

- **Executive orders sync** — Deferred. `governor.ky.gov` listings are unreliable for automated sync (404s, client-only rendering). Scraper code exists in `src/lib/ky-executive-orders.ts` but is excluded from product surface and cron. Revisit when a stable feed/API exists.

- **Filibuster / cloture / budget reconciliation tooltips** — Removed. These are federal Congress concepts that do not apply to the Kentucky General Assembly. Do not re-add.
