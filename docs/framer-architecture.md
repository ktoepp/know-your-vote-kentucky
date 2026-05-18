# kyvky.com — Framer Redesign Architecture

**Scope:** Public-facing pages only  
**Visual tone:** Clean civic / gov-adjacent  
**Stack receiving the handoff:** Next.js + MUI + Tailwind (Claude Code will integrate)

---

## Finalized Decisions (post-design review)

| Decision | Resolution |
|----------|------------|
| Nav color | White globally (replacing blue `#1e40af` background) |
| Nav search | Global search across bills + members → `/search?q=...` (not address/map search) |
| Nav search placeholder | "Search bills, members..." |
| Landing page (`/`) | Pure marketing page — **no Supabase data loading**; logged-out only |
| Logged-in home | `/feed` or `/dashboard` — personalized, live data |
| Map on landing | Lightweight teaser: renders KY map + address input → on submit, redirects to `/members/map?address=...` |
| Map overlay | Removed (simplified map, no district overlay on landing) |
| "Find my legislator" CTA | Routes to `/members/map` |
| Bill/member pagination | "Load more" pattern (replaces numbered pagination) |
| Member detail page | Modeled on bill detail layout (65/35 split) — design in progress |

---

## Page Inventory (7 pages to design)

| Page | Route | Primary purpose |
|------|-------|----------------|
| Home | `/` | Marketing landing — logged-out only; no live data |
| Feed / Dashboard | `/feed` | Logged-in home — followed bills, recent activity, personalized |
| Bills Browse | `/bills` | Filter + browse all KY bills |
| Bill Detail | `/bills/[id]` | Single bill — status, sponsors, text, follow |
| Members Roster | `/members` | Browse all 138 legislators by chamber/committee |
| Member Profile | `/members/[id]` | Legislator bio, sponsored bills, vote record |
| Search | `/search` | Full-text search across bills + members |

Auth pages (`/auth/*`) are out of scope for this redesign pass.  
`/profile` is replaced in concept by `/feed` — the logged-in home.

---

## Global Nav

### Desktop
```
[Logo / kyvky.com]        [Bills]  [Members]  [Search]        [Sign in]  [Sign up →]
```

- **Background: white globally** (`#ffffff`) — no blue nav
- Logo: left-aligned, links to `/`
- Nav links: Bills, Members, Search — no dropdowns needed
- Auth CTAs: "Sign in" (text/ghost) + "Sign up" (filled/primary) — right-aligned
- Sticky on scroll; subtle bottom border or shadow on scroll
- Nav search (if present): routes to `/search?q=...`, placeholder "Search bills, members..."

### Mobile
```
[Logo]                                                          [☰ Menu]
```
- Hamburger opens a full-height drawer
- Drawer items: Bills, Members, Search, divider, Sign in, Sign up
- Same logo + auth CTA pattern

### Design states to cover
- Default
- Scrolled (shadow appears)
- Active link (current page highlighted)
- Mobile drawer open

---

## Footer

Two-column layout, simple:

```
[Logo + tagline]          [Bills] [Members] [Search]
                          [Sign in] [Sign up]
                          
© 2026 Know Your Vote Kentucky · Open source · Licenses
```

- Tagline: "Free civic resource for Kentucky residents"
- Minimal — no social links needed in v1

---

## Page Layouts

### Home `/` — Marketing landing (logged-out only)

> **No Supabase data loading on this page.** All content is static or near-static.  
> Logged-in users are redirected to `/feed`.

**Hero section**
- Headline: "Know what's happening in Frankfort."
- Subheadline: 1–2 sentences — who this is for, what they can do
- Two CTAs: "Find my legislators" (primary) → `/members/map` + "Browse bills" (secondary) → `/bills`
- Background: light wash or subtle KY-themed illustration — no photo

**Map teaser module**
- Lightweight Mapbox embed — KY state view, simplified (no district overlay)
- Address input: "Enter your address or ZIP"
- On submit → redirect to `/members/map?address=...` (full interactive map handles the lookup)
- This is a **teaser/entry point**, not a full map interaction

**Browse by topic**
- Topic chip grid: 4–8 chips (Education, Budget, Health, Environment, etc.)
- Static chips — clicking routes to `/bills?topic=...`
- Label: "Explore bills by topic"

**How it works / value prop section**
- 3-step or 3-feature explainer: Find your reps → Track bills → Stay informed
- Marketing copy, no live data

**Sign up CTA section**
- "Stay informed on Kentucky legislation" — email capture or sign up prompt

---

### Feed / Dashboard `/feed`

> Logged-in users land here after auth. Logged-out users who hit this route redirect to `/`.

**Header**
- "Welcome back, [name]" or "Your feed"
- Quick stats: bills following, unread updates

**Followed bills section**
- Compact bill cards for bills the user follows, sorted by most recently updated
- Empty state: "You're not following any bills yet — Browse bills"

**Recent legislative activity**
- House + Senate activity feed — newest actions, no personalization required
- "Load more" pattern

---

### Bills Browse `/bills`

**Filter bar** (sticky below nav)
- Chamber toggle: All / House / Senate
- Status filter (dropdown or chips)
- Topic chips (horizontal scroll)
- "Following" toggle (only shown when signed in)
- Search input (local filter)
- Page size selector (25 / 50 / 100)

**Bill card grid**
- Card: chamber chip + status chip (header), bill number + title (body), sponsor avatars + last action (footer)
- Followed indicator: filled bookmark icon (signed-in only)
- Responsive: 1-col mobile → 2-col tablet → 3-col desktop

**Pagination**
- "Load more" button (replaces numbered pagination)
- Shows count: "Showing 25 of 312 bills"

**Empty state**
- No results: clear message + reset filters CTA

---

### Bill Detail `/bills/[id]`

**Layout:** Content column (left, ~65%) + Sidebar (right, ~35%)

**Content column**
1. Breadcrumb: Bills → Bill number
2. Title (`h1`)
3. Status timeline (introduced → committee → floor → passed/failed)
4. Subject/topic chips
5. Description / summary (if available)
6. **Follow button** — secondary outlined button, below chips
7. Sponsor section — avatar + name links
8. Bill text card — primary CTA: "View full bill text" (PDF link)

**Sidebar**
- Official sources: LRC link, LegiScan link
- Votes (roll call link if exists)
- Session / introduced date meta

**States to design**
- Signed out (Follow button → "Sign in to follow")
- Signed in + not following
- Signed in + following (bookmark filled, button label changes)

---

### Members Roster `/members`

**Filter bar**
- Chamber toggle: All / House / Senate
- Committee filter (dropdown)
- Search by name (inline)

**Roster grid**
- Member card: circular portrait, name, chamber pill (House = blue, Senate = purple), party badge (R/D circle), role, district number, phone + email with copy button
- On hover: see profile affordance
- Responsive: 2-col mobile → 3-col tablet → 4-col desktop
- "Load more" pagination

**States to design**
- Default grid
- Filtered (active filter chip shown)
- Loading

---

### Member Profile `/members/[id]`

> ⚠️ **Design in progress** — Framer page not yet complete. Layout below is planned; update when Framer design is finalized.

**Layout:** Same 65/35 split as bill detail

**Content column**
1. Back link: ← Members
2. Portrait (circular) + name + party badge + chamber + district (`h1`)
3. External links row: KY Legislature, Ballotpedia, LegiScan
4. Tabs or sections: Sponsored Bills / Voting Record
5. Bill list (reuses `BillCard` component)
6. Vote summary table (roll calls)

**Sidebar**
- Contact info: phone + email (with copy buttons, matching member card pattern)
- Committee memberships
- District info + district map link
- Official links

---

### Search `/search`

**Search bar** — prominent, full-width, auto-focused
- Suggestion chips below (top LegiScan subjects)

**Results**
- Tabbed: Bills / Members (or unified with type labels)
- Bill result: bill number + title + status chip
- Member result: name + chamber + district

**States**
- Empty / no query (show suggestion chips)
- Loading
- No results
- Results

---

## Design Tokens to Define in Framer

### Color
| Token | Value | Use |
|-------|-------|-----|
| `primary` | `#1e40af` | CTAs, active states, links |
| `primary-light` | `#dbeafe` | Chip backgrounds, hover fills |
| `surface` | `#ffffff` | Cards, nav |
| `background` | `#f8fafc` | Page bg |
| `border` | `#e2e8f0` | Card edges, dividers |
| `text-primary` | `#0f172a` | Headings, body |
| `text-secondary` | `#475569` | Meta, labels |
| `success` | `#16a34a` | Passed, signed |
| `warning` | `#d97706` | In committee, pending |
| `error` | `#dc2626` | Failed, vetoed |

### Typography
| Role | Size | Weight |
|------|------|--------|
| Page heading | 28–32px | 700 |
| Section heading | 20–24px | 600 |
| Body | 16px | 400 |
| Label / meta | 13–14px | 400–500 |
| Chip / tag | 12–13px | 500 |

### Spacing
- Base unit: 4px
- Card padding: 16–20px
- Section gap: 40–64px
- Nav height: 64px

### Border radius
- Cards: 8px
- Chips: 16px (pill)
- Buttons: 6px

---

## Shared Components to Design

These appear across multiple pages — design them once as Framer components:

- `NavBar` (desktop + mobile states)
- `Footer`
- `BillCard` (used on home rails, browse, search, profile)
- `MemberCard` (used on roster, search)
- `StatusChip` (bill status — color-coded)
- `ChamberChip` (House / Senate)
- `TopicChip` (filled vs outlined = followed vs not)
- `FilterBar` (bills browse, members roster)
- `PageHero` (home hero section)
- `SectionHeader` (label + optional CTA)

---

## Framer → Claude Code Handoff Notes

To make the handoff clean:

1. **Name components consistently** — use the names above (`BillCard`, `StatusChip`, etc.) — Claude Code will map them to existing React components by name
2. **Export design tokens** — color, type, spacing as variables in Framer so they map directly to `tailwind.config.js` and `theme.ts`
3. **Annotate interactive states** — label hover, active, disabled, loading, empty states in Framer directly on the canvas
4. **One page per frame** — desktop + mobile variants side-by-side per page
5. **Mark what's new vs. existing** — comment which components need to be rebuilt vs. just restyled (the existing MUI components can be themed rather than replaced)
6. **Don't design auth pages** — `/auth/*` and `/profile` are out of scope and already functional

The handoff document to give Claude Code should include:
- Link to this Framer file
- This architecture doc
- The design token mapping (Framer variable → CSS variable / Tailwind class)
- A list of which components are net-new vs. restyled existing ones
