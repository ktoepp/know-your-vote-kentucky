# Bill Watch screenshots index

Add PNG/JPG files to this folder. Names below match the captures shared 2026-05-18; rename files to match if needed.

**Status (2026-05-19):** INDEX and UX notes are in repo; PNG captures are **pending from product**. Drop files here using the names in the table when available — no code change required beyond optional INDEX note updates.

| File (suggested) | Screen | Notes for KYVKY |
|------------------|--------|-----------------|
| `01-home-dashboard.png` | Bill Watch Home | Three columns; session reset red notice; empty alert columns |
| `02-settings-alert-configuration.png` | Settings → Bill Tracking tab | Default alert checkboxes: Agenda, Introduction, Committee, Enrolled, Floor, Pre-Filed, **Interim** |
| `03-settings-edit-contact.png` | Edit Bill Tracking Alert Configuration | Email + mobile quiet time radios |
| `04-search-rules-wizard.png` | Search for Bills | Inclusive/exclusive rule links; empty rules table |
| `05-search-introduced-date.png` | Rule: introduced in GA | Month/day dropdowns (dated UX) |
| `06-search-bill-types.png` | Rule: bill types | Dual listbox SB/SR/SCR/SJR… |
| `07-help-long-scroll.png` | In-app Bill Watch Help (full scroll) | Tips, User Guide, Status glossary, Definitions — see [help-long-form.md](../help-long-form.md) |

## Home dashboard (01)

- **Left:** “I want to…” — alert settings, profiles, search, track bill  
- **Center:** Recent Bill Tracking Alerts (empty state)  
- **Right:** Recent New Bill Notifications (empty state)  
- **Avoid:** Three equal columns when empty; session-reset scare banner style  

**Borrow:** Clear separation of “bills I track” vs “new bills matching my interests”  

**KYVKY:** Merge into one **Activity** feed with filters (Following | Topics | Hearings)

## Alert settings (02–03)

- Seven action-type toggles — maps to digest `event_types`  
- **Agenda** + **Interim** are explicit in Bill Watch but easy to miss in KYVKY without calendar data  

**KYVKY:** Expose `hearing_scheduled` once LRC calendar sync ships; label “Committee / interim activity” clearly

## Search wizard (04–06)

- Multi-step rules; committee and sponsor pickers already exist conceptually  
- Quick “view by bill number” sidebar — keep on `/bills` or bill detail  

**KYVKY:** Single-page filters instead of wizard; save as `?…` URL + optional “Save search” on profile

## Official help (no screenshot)

- [Premium Bill Watch Help — Bill Tracking](https://secure.kentucky.gov/billwatch/help/PremiumBillWatchHelp.htm#billtrack)  
- Full text: [../bill-tracking.md](../bill-tracking.md)
