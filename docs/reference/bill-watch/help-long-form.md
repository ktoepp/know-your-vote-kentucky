# Bill Watch — long-form help page (in-app)

Captured from team screenshot **2026-05-18** (`screenshots/07-help-long-scroll.png` when saved).

This is the scrollable **Bill Watch Help** inside the authenticated app — a single page with blue section headers. It complements the tabbed UI and [PremiumBillWatchHelp.htm](https://secure.kentucky.gov/billwatch/help/PremiumBillWatchHelp.htm).

## Top navigation (help page)

Observed links (may differ slightly from main app tabs):

| Link | Likely maps to app tab |
|------|-------------------------|
| Bill Watch Home | Home dashboard |
| Bill Search | Search for Bills |
| My Bill Watch | Bill Tracking / watch list |
| User Guide | This help content |
| Bill Watch Tips | Tips section below |
| Status | Status glossary |
| Contact | LRC contact |

Main app tabs (from premium help): Home | Search for Bills | New Bill Notification | Bill Tracking | Settings.

## Bill Watch Tips

- Search by bill number (e.g. HB 1, SB 10) — sidebar quick lookup on search UI  
- Add to **watch list** via checkbox on search results (not only “Track This Bill” on detail)  
- Email when **status changes** on watched bills  

**KYvKY:** Follow on card + digest; optional bulk follow from browse later.

## User Guide (FAQ themes)

- Account: register, login, password, email, delete  
- Search, watch list add/remove, **custom reports** on watched bills  

**KYvKY:** Profile export (`GET /api/me/export` backlog) approximates “reports”; digest history partial.

## Search for Bills (criteria)

| Criterion | KYvKY today |
|-----------|-------------|
| Bill number | `/bills/[id]`, search, `?` quick lookup |
| Sponsor | Search + member sponsored bills |
| Keywords | FTS `ky_bills_plain_search` |
| Committee | `?committee=` + `committee_name` |
| Bill type (House/Senate) | Chamber filter + HB/SB prefix |

Results show: number, short title, **most recent status**.

## Bill Tracking (behavior)

- Monitors legislative DB for movement on watched bills  
- **Daily email summaries** of prior-day changes (aggregate)  

**KYvKY:** Daily digest cron (`/api/cron/notify`) — same product pattern, different copy and richer bill cards.

## Status glossary (Bill Watch labels)

User-facing status phrases from help — map to KYvKY browse buckets / digest events:

| Bill Watch status | KYvKY direction |
|-------------------|-----------------|
| Prefiled | `prefiled` / LegiScan draft |
| Introduced | `introduced` |
| To Committee | `in_committee`, `committee_action` |
| Reported from Committee | `committee_action` (reported out) |
| Passed House / Passed Senate | `passed_one_chamber` |
| To Governor | `sent_to_governor` |
| Signed by Governor | `signed` |
| Vetoed | `vetoed` / `signed_or_vetoed` digest |

Use plain language on bill detail; avoid copying Bill Watch wording exactly.

## Definitions (glossary)

Terms called out: Amendment, Act, Bill, Committee, Resolution, Sponsor.

**KYvKY:** `tooltipContent.ts` + bill detail tooltips already cover many; link glossary from `/legislature/resources`.

## Contact

Legislative Research Commission (Frankfort) — address, phone, support email.

**KYvKY:** Link to LRC PIO / public info; our contact is `katie@kyvky.com` for product issues.

## UX notes (long page vs modern help)

| Bill Watch | KYvKY |
|------------|--------|
| One long scroll, blue bars | Short in-app help or docs canvas; anchor nav |
| Separate Status + Definitions sections | Tooltips on status chips + link to resources |
| Checkbox watch on search results | Follow icon on `KYBillCard` |
| Custom reports | Digest history + export API (backlog) |
