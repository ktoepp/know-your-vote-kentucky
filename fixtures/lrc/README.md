# LRC HTML fixtures (Phase 0)

Committed snapshots for parser development and CI-free regression checks.

| File | Source | Purpose |
|------|--------|---------|
| `legislative-calendar-live.html` | https://apps.legislature.ky.gov/legislativecalendar | Weekly committee calendar parser |
| `legislative-record-26rs-live.html` | https://apps.legislature.ky.gov/record/26rs/record.html | Session record index (link hub; not day-by-day) |

Refresh a fixture:

```bash
npm run spike:lrc:calendar -- --refresh
```

Re-fetch record HTML manually:

```bash
curl -sL "https://apps.legislature.ky.gov/record/26rs/record.html" -o fixtures/lrc/legislative-record-26rs-live.html
```

Do not commit enormous diffs without noting the capture date in [committee-calendar-phase0-report.md](../docs/specs/committee-calendar-phase0-report.md).
