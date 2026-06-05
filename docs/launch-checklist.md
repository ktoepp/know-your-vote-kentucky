# Launch checklist (operator)

Single source of truth for what needs to happen *outside the code* before
public launch. Replaces the three previously-scattered lists in
[TASKS.md](../TASKS.md) ("Operator follow-ups", "Operator checklist",
"Launch operator checklist") plus [docs/email-client-qa.md](./email-client-qa.md).

Items A–F are the actual launch gates. G is post-launch hygiene.

> **Code-side pre-flight (verified 2026-06-04).** Everything that can be
> confirmed in the repo/config has been:
> - **F is done** — `SENTRY_ENABLE_EXAMPLE_PAGE` is absent from both the Vercel
>   project env (`vercel env ls`) and `.env.local`.
> - **B tags are emitted** — `route:cron/notify` (`src/app/api/cron/notify/route.ts`)
>   and `route:webhooks/resend` (`src/app/api/webhooks/resend/route.ts`) fire on
>   both partial-failure `captureMessage` and thrown `captureException`. Only the
>   two Sentry **alert rules** remain (UI-only).
> - **E (code-checkable parts)** — both templates render an HTML *and* a
>   plain-text part; every link uses canonical `https://kyvky.com` (0 legacy
>   `knowyourvoteky.com` refs); digest footer carries preferences/unsubscribe/
>   privacy/terms; unsubscribe route serves GET (HTML) + POST (RFC 8058
>   one-click) and the send sets `List-Unsubscribe[-Post]`; sender defaults to
>   `alerts@kyvky.com`, Reply-To `katie@kyvky.com`; welcome is single-column with
>   browse/profile/find-my-legislators links.
> - **A (code side)** — webhook handler verifies Svix signatures; the `www`
>   requirement is a Resend-dashboard setting, not code.
>
> **Still genuinely manual (no repo/CLI access):** A (Resend SPF/DKIM/DMARC +
> webhook URL config), B (create the 2 Sentry alert rules), C (inbox routing),
> D (legal review), and the E visual pass + real test sends across the 4 clients.

---

## A. Resend (email deliverability)

- [x] **Resend → Domains → `kyvky.com`** — SPF / DKIM / DMARC all green.
      Cold-start sends to Gmail land in Junk otherwise.
      **2026-06-04:** Resend reported `verified`, but the **DKIM TXT at
      `resend._domainkey.kyvky.com` was missing from live DNS** (stale
      verification) — the actual cause of poor delivery. Re-added in Hostinger
      DNS (zone host = `*.dns-parking.com`); confirmed propagating (Google
      `8.8.8.8` resolves the `p=…` key; Cloudflare/local lag is normal). SPF
      MX/TXT on `send` were already correct.
- [ ] Sender = `alerts@kyvky.com`; Reply-To = `katie@kyvky.com`
      (transactional-only From; real-inbox Reply-To)
- [ ] Webhook = **`https://www.kyvky.com/api/webhooks/resend`**
      (apex `kyvky.com` 307-redirects POST and breaks signature
      verification — must be `www`)

## B. Sentry alerts (2 rules)

- [ ] Rule 1: any event tagged `route:cron/notify` → notify
- [ ] Rule 2: ≥5 events tagged `route:webhooks/resend` in 5 min → notify

Both tags are already emitted by the existing routes; the rules just need
to be configured in Sentry's Alerts UI.

## C. Inbox routing

- [x] Confirm `katie@kyvky.com` lands somewhere a human reads.
      Used in `/privacy`, `/terms`, every email Reply-To, and the
      vulnerability-report inbox.
      **Done 2026-06-04 — test sent & received (Hostinger mailbox, MX = `mx1/mx2.hostinger.com`).**

## D. Legal review

- [ ] Lawyer pass on [`/privacy`](../src/app/privacy/page.tsx)
- [ ] Lawyer pass on [`/terms`](../src/app/terms/page.tsx)

The current drafts are honest practical text, not lawyer-written. Fine for
a small audience; review before scaling beyond friends-and-family.

## E. Email-client QA (~2 hr)

Test sends:

```bash
npm run preview:digest -- --email you@example.com --send
npm run preview:welcome
```

**2026-06-04 — test sends fired** to `katietoepp@gmail.com` (welcome Resend id
`ff570d6d…`; digest `emailsSent:1` via synthetic HB1 `committee_action`). Now do
the visual + deliverability pass below in each client (confirm inbox not spam,
and `dkim=pass` in the raw headers now that the DKIM record is republished).

In each client below, verify the checklist for both bill digest and welcome.

### Clients

- [ ] Gmail (web)
- [ ] Gmail (mobile app)
- [ ] Apple Mail (macOS or iOS)
- [ ] Outlook (web or desktop)

### Per-message checks — bill digest

- [ ] Subject line readable; preview text not truncated awkwardly
- [ ] Plain-text part present (a11y + deliverability)
- [ ] Unsubscribe link works: GET page **and** one-click POST
      (List-Unsubscribe headers respected)
- [ ] Bill links use `https://kyvky.com` (not the legacy `knowyourvoteky.com`)
- [ ] Footer has privacy, terms, preference link

### Per-message checks — welcome email

- [ ] Single-column layout
- [ ] Links to browse, profile, find-my-legislators map
- [ ] Sender = `alerts@kyvky.com`, Reply-To = `katie@kyvky.com`

## F. Vercel env cleanup

- [x] Remove `SENTRY_ENABLE_EXAMPLE_PAGE` from the Vercel project (and
      `.env.local` if set). The `/sentry-example-page` route is already
      deleted; the var is harmless but stale.
      **Done 2026-06-04 — verified absent in `vercel env ls` and `.env.local` (nothing to remove).**

---

## G. Regression cadence (post-launch hygiene, not a launch gate)

Already on weekly GitHub Actions
([`.github/workflows/legislator-links-weekly.yml`](../.github/workflows/legislator-links-weekly.yml)).
Useful to run manually if something looks off after a large sync:

- `npm run verify:legislator-links`
- `npm run spot-check:bill-links`
- `npm run diagnose:legislators` (optional)

---

## Going live

When A–F are checked:

1. **Resend domain green** → first real digest send will deliver to inbox,
   not spam.
2. **Sentry alerts armed** → silent partial failures in
   `/api/cron/notify` or `/api/webhooks/resend` get caught immediately.
3. **`katie@kyvky.com` routes to a human** → users who reply / report
   issues / hit unsubscribe edge cases get a response.
4. **Legal review done** → safe to broaden marketing past
   friends-and-family.
5. **Email QA clean** → confidence the daily digest isn't visually
   broken in the four clients ~95% of users will be on.
6. **Vercel env trimmed** → no stale config drift.

Then turn up the audience.
