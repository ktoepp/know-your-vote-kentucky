# Kentucky Bill Watch — UI reference

Official product (Kentucky.gov account): [Bill Watch](https://www.kentucky.gov/services/pages/billwatch.aspx)

| Resource | URL |
|----------|-----|
| Public help (screenshots) | [billwatch-help.aspx](https://www.kentucky.gov/Services/Pages/billwatch-help.aspx) |
| **Premium help (full text)** | [PremiumBillWatchHelp.htm](https://secure.kentucky.gov/billwatch/help/PremiumBillWatchHelp.htm) |
| **Bill Tracking section** | [PremiumBillWatchHelp.htm#billtrack](https://secure.kentucky.gov/billwatch/help/PremiumBillWatchHelp.htm#billtrack) |
| Login | [secure.kentucky.gov/billwatch](https://secure.kentucky.gov/billwatch/) |

## Repo docs

| Doc | Contents |
|-----|----------|
| [bill-tracking.md](./bill-tracking.md) | Tabs, alert types, email subjects, KYvKY mapping |
| [help-long-form.md](./help-long-form.md) | Long scroll help: Tips, Status glossary, daily email |
| [status-vocabulary.md](./status-vocabulary.md) | Bill Watch status labels → digest / browse |
| [premium-help-excerpt.md](./premium-help-excerpt.md) | Offline archive of premium help page |
| [screenshots/INDEX.md](./screenshots/INDEX.md) | Screenshot catalog + UX borrow/avoid |

## Screenshots

Save captures under [`screenshots/`](./screenshots/) using names in `INDEX.md` (e.g. `01-home-dashboard.png`).

We are **not** cloning Bill Watch. Goals:

- **Beat** the legacy three-column dashboard with a unified activity feed  
- **Match or exceed** alert granularity (especially **Agenda**, **Committee**, **Interim**, **Pre-Filed**) using LegiScan + LRC calendar  
- **Replace** rules wizard with modern `/bills` filters + saved URLs / profile prefs  
- **Avoid** Kentucky.gov-only auth and premium split for basic email  

## KYvKY direction

See [committee-calendar spec](../../specs/committee-calendar.md) and digest events in `src/lib/ky-notification-preferences.ts`.

Link to official Bill Watch from `/legislature/resources` when that page ships (honest comparison, not endorsement).
