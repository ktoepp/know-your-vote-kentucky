# April 2027 decision rules (pre-registered)

Owner: WS8-08. This file is the only home of the April 2027 thresholds, the verdict rules and their order, the "partner conversation open" definition and the verdict-to-option mapping. How each number is measured is in [`docs/metrics.md`](../metrics.md) "2027 session measurement protocol (pre-registered)" (WS7-08). Measured values come from WS7-13 by 2027-04-15. WS8-16 applies these rules and records the decision by 2027-04-30.

Status of every number: `PROPOSED` until the owner accepts or edits it in review. Unanswered by 2026-12-14, each becomes `accepted by default 2026-12-14`. After 2027-01-05 nothing here changes except through an ADR and an entry under Amendments.

## The five options (C7)

1. "My Legislator for Kentucky" with a newsroom.
2. Digital Democracy Kentucky partner.
3. Data and tip-sheet provider.
4. Election-cycle tool.
5. Maintain mode.

## Inputs

- **KPI-1** in-session weekly median of KY human visitors: `docs/metrics.md` "2027 session measured values" (WS7-13).
- **KPI-3** week-1 return over the session cohorts, the only gating return metric: same section (WS7-13).
- **KPI-6** weekly-email subscribers from the 2027-03-30 snapshot: same section (WS7-13).
- **KPI-7** March 2027 unique bill-digest recipients: same section (WS7-13).
- **Owner hours**, in-session monthly average: `docs/evaluation/2027-04-maintenance.md` (WS5-13).
- **Partner category counts** on 2027-04-15, counts only: WS8-11.
- Context only, never gating: KPI-4 (30-day return), KPI-5 (lookup rate), KPI-9 (opt-in source), cash cost and data headroom (WS4-16), corrections and WS3-11a's audit result (WS3-14, WS9-14).

## Partner conversation open (definition)

On the date checked, the owner's private outreach log (WS8-11) has at least one organization in category "conversation", "written interest" or "pilot" with contact in the previous 60 days. Reported as counts only. `PROPOSED`

## Verdict rules

Apply in this order. The first rule that holds is the verdict.

- **R1 Partner.** WS8-11's counts on 2027-04-15 show at least 1 organization in `written interest` or `pilot`. `PROPOSED`
- **R2 Loop works.** All four hold. `PROPOSED`
  - (a) KPI-3 week-1 return over the 2027 session cohorts (final 2027-04-05) is at least 5%. Baseline 1.4%, best interim cohort 3.4% (T2).
  - (b) KPI-1 in-session weekly median (ISO weeks 2027-01-04 to 2027-03-29) is at least 150. September 2026 was 83 to 104 (T1).
  - (c) KPI-6 weekly-email subscribers on 2027-03-30 number at least 20.
  - (d) Owner hours (WS5-13, in-session monthly average, 2027-01 to 2027-03) are 45 or fewer, or a partner conversation is open on 2027-04-30.
- **R3 Maintain.** Neither R1 nor R2 holds.

**Not measured.** If WS7-08's retention-bet status says the weekly email was "deferred to W5", R2(c) is `not measured (deferred)` and is left out of R2, not counted as "not met". Any other gating input that is "not measured" makes its rule "not met (input not measured)". The decision doc names the missing input.

## Email consolidation rule (W5), adopted from WS7-08

Applies only if the weekly email shipped. If KPI-6 weekly-email subscribers on 2027-03-30 are below 20, remove the weekly-email code and its columns in W5. If they exceed KPI-7's March 2027 unique bill-digest recipients, fold followed-bill events into the weekly email and retire the separate digest in W5. Otherwise keep both and revisit after the 2028 session. `PROPOSED`

## Verdict to options

"Loop works" maps to option 1, or option 3 if there is no newsroom partner. "Partner" maps to option 2, or option 1 if the partner is a Kentucky newsroom rather than Digital Democracy. "Maintain" maps to option 5. Option 4 is an owner judgement note, considered when KPI-5 (lookup rate) is the main use. The owner may record disagreement beside the mechanical verdict but cannot change it.

**Maintain mode:** Syncs and fixes only, a 2028 session check, no new features. Detail: docs/evaluation/maintain-mode.md (WS5-16).

## Outputs

`docs/evaluation/2027-04-decision.md` (WS8-16).

## Amendments

None. Changes after 2027-01-05 need an ADR.
