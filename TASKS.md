# Know Your Vote Kentucky — Task Tracker

> This file is the source of truth for roadmap tasks.
> Update it as work is completed or priorities shift.
> It lives in the repo so any AI with file access can read and act on it.

---

## In Progress

*(see **Backlog** for larger features — e.g. follow-by-email, member profile bills)*

---

## Cleanup (Sentry)

After Sentry is verified in production:

- **Unset `SENTRY_ENABLE_EXAMPLE_PAGE`** in Vercel (and locally in `.env.local` if set) so `/sentry-example-page` stays disabled in production.
- **Remove the Sentry example routes** when you no longer need them: delete `src/app/sentry-example-page/` and `src/app/api/sentry-example-api/route.ts`, and remove the `SENTRY_ENABLE_EXAMPLE_PAGE` block from `env-template.txt`.

---

## Up Next

- **Tooltip toggle parity** — `MemberCard` Ballotpedia tooltip now respects the global `tooltipsEnabled` toggle. Added `useTooltips` import and gated MUI `title` prop on `tooltipsEnabled`.
- **Inline term tooltips on bill detail page** — `BillHistoryActionText` + `segmentBillActionText` scan action/last-action text; matches wrap `LegislativeStageTooltip` (global toggle respected). Phrase list: `src/lib/bill-action-tooltip-segments.ts`.
- **Map page: explain the two-rep system** — Right sidebar callout in `DistrictMapExplorer.tsx`: two legislators (100 House / 38 Senate), different district sizes and numbers.
- **Vote cards: link to Ballotpedia vote pages** — Per vote: **LegiScan roll call** when `roll_call_id` exists (`legiscanRollCallPublicUrl` in `src/lib/external-legislative-links.ts`). **Ballotpedia** uses `Special:Search` with bill + date + description (no stable per-vote URLs on Ballotpedia).
- **Audit all Ballotpedia and external links** — Centralized helpers in `src/lib/external-legislative-links.ts`: `normalizeBallotpediaHref` for sponsor/co-sponsor (full URL or path/slug). `ballotpediaMemberSearchUrl` moved here; `ky-member-utils` re-exports it. Member profiles without a Ballotpedia slug still use search + “Kentucky” (best available).
- **Revisit 100-bill fetch limit rationale** — `BillsBrowse` now uses `BROWSE_QUERY_ROW_LIMIT = 1000` (Supabase per-request cap) with an inline note: a full KY session is ~500–600 bills, so one fetch remains reasonable.
- **Results per page selector** — 25/50/100 on `PaginatedSection` when `pageSizeOptions` + `onPageSizeChange` are set. `usePersistedPageSize` in `src/lib/use-persisted-page-size.ts` stores `kyv:pageSize:bills`, `kyv:pageSize:search`, `kyv:pageSize:home`. Home has one "Bills per page" control for all three main deck sections. Search merge cap in `ky-search-bills.ts` raised from 120 → 1000; search `fetch` limit 500. Home section fetch window `HOME_SECTION_FETCH` is 100.
- **District map nav icon: replace with Kentucky state shape** — `KentuckyStateIcon` in `src/components/icons/KentuckyStateIcon.tsx` (MUI `SvgIcon`, 24×24 path from a simplified state polygon). `Navigation.tsx` “District map” item uses it instead of MUI `Map`.
- **Fix mobile menu background color** — Changed `Collapse` menu in `Navigation.tsx` from blue primary gradient to `background.paper`. Updated `mobileNav` colors from white `contrastText` to `text.secondary`/`primary.main`. All active borders and indicator dots now use `primary.main`.
- **Update hero section copy and CTA** — Hero subhead and CTAs: clearer value prop, primary **Browse all bills** + **Search** + **House** / **Senate** + **District map** (`/members/map`). Headline kept as product name.
- **Update official calendar link** — Home `SessionBanner` button points to LRC **committee & meeting schedule**: `https://legislature.ky.gov/Committee/Schedule` (replaces generic legislature.ky.gov). Label **LRC schedule**.
- **Fix session status banner** — Distinguish **in session** / **upcoming** (before `KY_SESSIONS[i].start`) / **after scheduled last day**. After end date: no blanket “legislature adjourned”; short note that chambers may still show limited activity and to use LRC. Pulsing dot only while in the scheduled window.
- **Hide view count from "Most Viewed" section** — Removed `line="viewCount"` prop from the `HomeCuratedBillList` in `src/app/page.tsx`.
- **Footer: copyright, version, and licenses** — `SiteFooter`: © year The Eighth Dimension, LLC, `v` + `APP_VERSION` from `src/lib/app-version.ts`, **Licenses** → `/licenses` (MIT + LegiScan / Plural-Open States / Mapbox / OSM / Census text).
- **Audit "(clerical)" label in bill timeline** — Kept the label. Added `clerical` in `tooltipContent.ts` and `LegislativeStageTooltip` on "(clerical)" when tooltips are enabled (dotted underline + help cursor).
- **Increase card images by 50%** — Bill detail: primary sponsor `MuiAvatar` 52→78, co-sponsor row 36→54 (`[id]/page.tsx` / `SponsorCard`).
- **Reduce top/bottom padding on second sidebar item** — Right column `md={4}` uses `& > .MuiCard:nth-of-type(2) .MuiCardContent` with `py: 1` (halved vs default) and `px: 2`.
- **Remove border/shadow on bill sidebar card** — Primary sponsors container `MuiCard`: `elevation={0}`, `boxShadow: 'none'`, `border: 'none'` (per-card sponsor `SponsorCard` styling unchanged).
- **Map toggle UX** — Exclusive `ToggleButtonGroup`: House or Senate only; one boundary layer is always shown (default House). No off state.

---

## Backlog

- **LRC vs structured APIs (legislator data strategy)** — Kentucky LRC / `legislature.ky.gov` is the **canonical public-facing** source, but it does **not** provide a stable, documented **bulk API** for the full chamber roster the way Plural v3 (Open States) does. The app **syncs** from Open States into `ky_legislators` and **points users to the LRC** with stored profile URLs and official **House/Senate** roster/directory fallbacks (`kyLegislaturePublicUrl` in `src/lib/ky-member-utils.ts`; sync in `src/lib/ky-openstates-client.ts`). **Revisit** if the state ever publishes **machine-readable bulk data** (CSV, API) with clear reuse terms. **HTML scraping** of LRC pages remains a last resort (fragile, higher maintenance) unless product requirements change.
- **"Follow this bill" — email alerts** — Allow users to subscribe to a bill and receive an email when there is new action (status change, vote, signing, veto). Requires: user accounts or email-only opt-in, a subscription table in Supabase, a check during the data sync pipeline to detect changes and trigger notifications, and a transactional email provider. **Resend** is the suggested provider (resend.com — simple API, generous free tier). Notify on: status change, new vote recorded, signed by Governor, vetoed. This is a meaningful civic engagement feature but is post-MVP — requires auth/user system first.
- **Address autocomplete on map** — Street address + **Find address** (Mapbox forward geocoding, `src/lib/mapbox-geocode.ts`, bbox/ proximity bias to Kentucky). ZIP search unchanged. Requires `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` (same as the map).
- **Rep contact section on map** — Hover `DistrictMapMemberTooltip` now shows `CopyableEmail`, `tel:` line when present, and **Capitol: Kentucky LRC** link when the roster has no email. Sidebar still uses full `MemberCard` (unchanged).
- **Rep sponsored bills on member profile** — `getCivicDataSessionName` + `fetchSponsoredBillsForLegislator` (`ky_bills` JSONB `sponsors` contains LegiScan `people_id`); `MemberProfileView` lists bill links, status chip, last action. Requires `legiscan_id` on the roster row.
- **Voting record summary on member profile** — `get_votes_for_legislator` (migration `012_get_votes_for_legislator.sql`) + `fetchMemberVoteRecord`: yea/nay/not voting/absent/other counts and recent roll calls for the same session, linked to bill pages.
- **"How to contact your rep" explainer** — `DistrictMapExplorer` accordion: capitol contact, hearings/livestreams, written testimony, constituent letters. Placed in the right-hand column.
- **Filter/browse by committee on members page** — Users interested in a specific policy area (e.g., Education) can't currently find all Education Committee members in one place.
- **Events page** — Added to nav as "Meetings". Removed federal terminology (filibuster, cloture, reconciliation, etc.) from `InteractiveTermTooltip` and `events/[id]/page.tsx`. Fixed bill number prefix (H.R. → HB/SB).

---

## Deferred / Decided Against

- **Executive orders sync** — Deferred. `governor.ky.gov` listings are unreliable for automated sync (404s, client-only rendering). Scraper code exists in `src/lib/ky-executive-orders.ts` but is excluded from product surface and cron. Revisit when a stable feed/API exists.
- **Filibuster / cloture / budget reconciliation tooltips** — Removed. These are federal Congress concepts that do not apply to the Kentucky General Assembly. Do not re-add.