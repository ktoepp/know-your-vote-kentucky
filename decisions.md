# Design decisions (append-only)

Do not rewrite earlier entries. Append new dated sections at the bottom.

---

## 2026-05-09

- Adopted UI/UX Operating Principles for designer-assisted work (modes Generative vs Critique; conflict resolution layers hierarchy / trade-off / decision questions; documentation via `tasks.md` UX tracker + this file). Existing roadmap sections in `tasks.md` retained; UX subsection added for Active/Done/Blocked/Notes.
- Home page product choice: **prioritize new-user orientation** over bill-first entry. **Optimization:** comprehension and correct first visit path (map / roster before deep bill exploration). **Cost:** returning users who primarily track bills see map as the hero primary CTA until they scroll.
- Topic exploration: **single module** (`Explore by topic`) combining trending tiles (when data exists) and full chip list under subheadings, replacing two separate section headers.
- Home loading UX: orientation copy and topic module stay visible during fetch; spinner scoped to bill rails only so static guidance does not compete with a full-page wait state.
- Members roster filtered view: restoring missing `profileHref` on `MemberCard` was a **bugfix** (parity with grouped layout).
- Member profile: document outline uses **`h1` via `profileNameHeading` on `MemberCard`**, section **`h2`** for Sponsored bills / Voting record, **`h3`** for Recent votes; back navigation uses **`Link`** (`Button component={Link}`) instead of `router.push`.
- Member roster cards: **stretch `Link` overlay** + `pointer-events` on nested controls for keyboard and SR access to profile navigation (WCAG 2.1.1); portrait **`alt`** text when name known; legislator list refresh control **`aria-label`**.
- **Legislator outbound links:** Open States `links[]` ranked to prefer **Legislator-Profile.aspx** / **DistrictNumber** over generic LRC pages; **social** hosts excluded from stored campaign `website`; **HTTPS** normalization at sync and in `kyLegislatureProfileUrl` / `kyLegislatorCampaignWebsite`; **Ballotpedia** enrichment uses **`normalizeBallotpediaForStorage`**; dual Open States fetch merges preserve **`links`** when the offices-only pass omits them. Existing DB rows refresh only after **re-running legislator sync** (and optional bio enrichment).
- **Future:** Persist **all** outbound links (including social) in structured JSON + **backfill**; surface in UI by category.
- **Verification:** Script **`scripts/verify-legislator-external-links.ts`** (`npm run verify:legislator-links`) performs systematic HTTP checks on stored/computed legislator URLs; intended for manual runs and eventual CI. **Limitation:** confirms reachability and status codes, not that page content still matches the legislator (content drift requires different checks).
