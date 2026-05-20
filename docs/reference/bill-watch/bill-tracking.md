# Bill Watch — Bill Tracking & alerts (official help)

Source: [Premium Bill Watch Help — Bill Tracking](https://secure.kentucky.gov/billwatch/help/PremiumBillWatchHelp.htm#billtrack) (LRC / Kentucky.gov). Public overview: [billwatch-help.aspx](https://www.kentucky.gov/Services/Pages/billwatch-help.aspx).

Captured in repo: 2026-05-18 (text from help page; UI from team screenshots in `screenshots/INDEX.md`).

---

## Information architecture (tabs)

| Tab | Purpose |
|-----|---------|
| **Bill Watch Home** | Three-column dashboard: shortcuts, recent tracking alerts, recent new-bill notifications |
| **Search for Bills** | Rules wizard → one-time search; optional save as profile |
| **New Bill Notification** | Saved **profiles**; email when new bills/amendments/committee events match (premium) |
| **Bill Tracking** | Track specific bill numbers; per-bill alert history |
| **Settings** | Contact email, mobile quiet hours, default alert checkboxes |

---

## Bill Tracking tab (layout)

Per official help, the **Bill Tracking** page has three regions:

1. **Current Bills Being Tracked** (left) — list of followed bill numbers  
2. **Add Bill For Tracking** (top right) — bill type dropdown + number → “Track This Bill”  
3. **Recent Bill Tracking Alerts** (bottom right) — activity feed; link to full alert history  

Bill summary (from tracking list) offers:

- Full text link  
- Alert history for that bill only  
- **Per-bill** alert settings (override defaults)

---

## Settings — contact

| Field | Behavior |
|-------|----------|
| **User e-mail** | Primary notification address |
| **Mobile e-mail** | Optional second address |
| **Mobile quiet time** | Send anytime **or** suppress mobile during From/To window (12-hour dropdowns) |

Screenshots: `screenshots/03-settings-alert-configuration.png`, `screenshots/04-settings-edit-contact.png`.

---

## Settings — Bill Tracking Alert Settings (defaults)

All checked by default. User clicks **Edit Default Settings** to uncheck types, then **Save Configuration**.

| Bill Watch checkbox | Meaning (help text) |
|---------------------|---------------------|
| **Notify me of Agenda Alerts** | Agenda-related notifications |
| **Introduction Actions** | Bill introduced |
| **Committee Actions** | Committee referrals, reports, etc. |
| **Enrolled Actions** | Enrolled in chamber |
| **Floor Actions** | Floor activity |
| **Pre-Filed Actions** | Prefiled before session |
| **Interim Actions** | Activity outside regular session |

Per-bill overrides exist; if unset, defaults apply.

### Email subject lines (Bill Watch)

| Event | Subject prefix |
|-------|----------------|
| New bill (profile match) | `[BILLWATCH NOTIFICATION] New Bill Notification` |
| Amendment | `[BILLWATCH NOTIFICATION] Amendment Notification` |
| Committee | `[BILLWATCH NOTIFICATION] Committee Notification` |

Emails contain a link back to Bill Watch (login required).

---

## New Bill Notification (profiles) — three match events

Profiles use the same **rules wizard** as Search. When saved, Bill Watch compares profiles to:

1. **Introduction** of a new bill  
2. **Amendments** filed on existing bills  
3. **Committee notifications**

Premium: email on match. Registered (non-premium): no email; matches visible on home column 3 only.

Session reset notice (2026 UI): red banner that prior session profiles/tracking are cleared — users must recreate each session.

---

## Search rules wizard (inclusive / exclusive)

**Inclusive** (must match):

- Keyword (any / all / exact phrase)  
- Topic (index heading) — dual listbox +/−  
- Sponsor (House/Senate lists; optional primary sponsor only)  
- Introduced in GA (chamber + date on/before/after/between)  
- **In committee** (House/Senate committee lists)  
- Bill type (HB, SB, HJR, …)  
- Bill **actions** (checkbox list; “Add All Alerts”)  
- Action **date range** (works with actions rule)

**Exclusive** (must NOT match): keyword, topic, sponsor, bill type negations.

Sidebar: **Current Rule Settings** mirrors active rules; **View Bill By Bill Number** quick lookup.

---

## KYVKY mapping (do not clone; align features)

| Bill Watch | KYVKY today / planned |
|------------|----------------------|
| Track by bill number | **Follow** on bill detail + `ky_bill_follows`; **Track another bill** on profile |
| Default alert checkboxes | **`/profile#notifications`** — grouped Committee & interim / Floor & passage |
| Agenda Alerts | **`hearing_scheduled`** + LRC calendar; opt-in (not in major-milestones preset) |
| Committee Actions | **`committee_action`** (LegiScan history) |
| Interim Actions | Calendar + interim meetings; digest when bill moves |
| Pre-Filed Actions | LegiScan prefile / browse filter |
| Introduction / Floor / Enrolled | **`introduced`**, **`floor_vote`**, **`passed_chamber`**, etc. |
| New Bill Notification profiles | **Topic filters** + saved searches; not premium email blast |
| Rules wizard | **`/bills` filters** + copy/save search link + **`ky_saved_searches`** on profile |
| Per-bill alert overrides | **Deferred** — global prefs only; **snooze** per follow (digest only) |
| Mobile quiet time | **Deferred** — single UTC cron; per-user TZ later |
| Kentucky.gov account | **Supabase auth** |
| Three-column dashboard | **Unified activity** on `/profile#activity` with filters |

---

## Bill type acronyms (Bill Watch definitions)

SB, SR, SCR, SJR, HB, HR, HCR, HJR — same as Kentucky GA conventions.

---

## Support contacts (from help)

- Kentucky.gov Customer Service: (502) 875-3733, toll-free (877) 855-3573  

For LRC legislative research: (502) 564-8100.
