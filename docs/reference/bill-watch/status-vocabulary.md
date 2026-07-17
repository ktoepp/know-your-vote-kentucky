# Bill Watch status labels → KYVKY mapping

Sources:

- Long-form help **Status** section (screenshot `07-help-long-scroll.png`)
- Settings alert types: Introduction, Committee, Enrolled, Floor, Pre-Filed, Interim, Agenda ([bill-tracking.md](./bill-tracking.md))

Use for copy, digest event coverage, and browse filter labels — not as database enums (LegiScan drives truth).

## Stage labels (user-facing)

| Bill Watch (help) | Typical meaning | `KyDigestEventType` / browse |
|-------------------|-----------------|------------------------------|
| Prefiled | Filed before session opens | (prefile — filter, not digest event) |
| Introduced | First chamber reading / filed | `introduced` |
| To Committee | Referred to committee | `committee_action` |
| Reported from Committee | Favorably reported (or substitute) | `committee_action` |
| Passed House | House floor passage | `passed_chamber` |
| Passed Senate | Senate floor passage | `passed_chamber` |
| To Governor | Sent to Governor | `sent_to_governor` |
| Signed by Governor | Became law | `signed_or_vetoed` |
| Vetoed | Governor veto (see KY nuance below) | `signed_or_vetoed` |

### Enacted vs. vetoed — the Kentucky nuance

The stored `ky_bills.status` distinguishes four end states, and **only one means the bill did *not* become law.** Getting this wrong is how SB197 2026RS came to display "Vetoed" while actually enacting as Acts Ch. 202 (see `decisions.md § 2026-07-17`). The rule, straight from KY law:

| Stored status | Meaning | Became law? |
|---------------|---------|-------------|
| `Signed` | Governor signed it (or let it become law unsigned after 10 days) | ✅ yes |
| `Veto Override` | Legislature overrode the veto — KY needs only a **simple majority** of each chamber | ✅ yes |
| `Chaptered` | Enacted and published in the *Kentucky Acts* with a chapter number — **including a line-item veto**, where Ky. Const. §88 strikes only the disapproved items of an appropriations bill and the rest becomes law | ✅ yes |
| `Vetoed` | A **full** veto that was **not** overridden | ❌ no |

Practical implications for copy and code:

- **"Vetoed" ≠ "there was a veto."** A line-item veto and an overridden veto both *became law*; reserve "Vetoed" for a full veto that stuck.
- An **"Acts chapter" citation anywhere** in a bill's action history ("Acts Ch. 202", "Acts, ch. 194", "Acts Chapter 1") is a definitive *became-law* signal.
- The mapping logic lives in `src/lib/map-legiscan-bill-status.ts`; the one-time corrector for already-stored rows is `scripts/backfill-veto-status.ts`.

## Alert types (settings checkboxes)

| Bill Watch alert | KYVKY |
|------------------|--------|
| Agenda Alerts | `hearing_scheduled` + LRC calendar |
| Introduction Actions | `introduced` |
| Committee Actions | `committee_action` |
| Enrolled Actions | `passed_chamber` (enrolled) |
| Floor Actions | `floor_vote` |
| Pre-Filed Actions | prefile detection in history |
| Interim Actions | interim calendar + bill history |

## Gaps to close in Phase 2+

1. **Hearing/agenda** without LegiScan movement — calendar ingest  
2. **Interim-only** committee activity on old-session bills — agenda bill resolution by session label  
3. **“Reported from Committee”** as distinct user-facing phrase — optional sub-label on `committee_action` in digest copy
