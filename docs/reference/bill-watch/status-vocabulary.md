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
| Vetoed | Governor veto | `signed_or_vetoed` |

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
