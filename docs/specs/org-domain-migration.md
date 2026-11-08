# `.com` → `.org` domain migration plan

Status: **plan, not started.** No code or infrastructure has changed. Written 2026-11-08.
Origin: TASKS.md › "Owner wishlist, filed 2026-08-31" (SFG feedback: present as a nonpartisan `.org`).

## Decisions taken (owner, 2026-11-08)

| Question | Decision |
|---|---|
| Scope | **Full canonical flip.** `https://www.kyvky.org` becomes the canonical origin. Every `kyvky.com` URL 301/308s to the same path on `www.kyvky.org`. |
| Email | **Move to `.org`.** Sender `alerts@kyvky.org`, reply-to and contact `katie@kyvky.org`, Supabase auth sender `auth@kyvky.org`. |
| Logo and share image | **Owner supplies new artwork.** `.com` is drawn into the artwork itself (see below). |
| Canonical host shape | `www.kyvky.org` with apex → www. This keeps the current www pattern, so the reasoning in `src/lib/site-canonical.ts` (auth fragments, webhook POSTs) still applies. |

## Timing constraint

`docs/ops/release.md` allows no DNS changes during FZ (2026-12-15 → 2027-01-04) or W3 (2027-01-05 → 03-30, the legislative session). `docs/program-spec/09-…` WS9-05 sets the same limit. **Cutover must finish by 2026-12-14, or it waits until April 2027 (W4).** Phases 0–1 can start now.

## What the audit found

There are 218 `kyvky.com` references. Most are in historical docs (`decisions.md`, `TASKS.md`, `docs/program-spec/**`), and those stay as written. The places that matter:

**Already derived from one origin (one change covers all):** sitemap, robots, `metadataBase`, canonical tags, JSON-LD (`src/lib/structured-data.ts`), `llms.txt`, digest and welcome-email links, unsubscribe URLs, and auth `emailRedirectTo`. All of these read `NEXT_PUBLIC_APP_URL` / `APP_PUBLIC_URL`, with `DEFAULT_SITE_ORIGIN` (`src/lib/site-canonical.ts:14`) as the fallback.

**Hardcoded in code:**
- Email addresses: `src/app/api/me/welcome-email/route.tsx:74,106`, `src/lib/digest/run-bill-digest-cron.tsx:142,613`, `scripts/preview-welcome-email.tsx:108,113`. In user-facing copy: `src/components/bills/BillDetailView.tsx:1217`, `src/components/civic/AiAttribution.tsx:50`, `src/app/api/unsubscribe/[token]/route.ts:27`, `src/app/{about,terms,privacy}/page.tsx`.
- Scraper `User-Agent` strings: 21 occurrences of `(+https://kyvky.com …)` across 10 `src/lib/**` / `src/app/api/**` files, 8 `scripts/**` files and `.github/workflows/source-health.yml`. Only the contact URL changes. The bot names stay the same, so LRC sees the same client.
- `.github/workflows/source-health.yml:145-146`: the uptime check targets `https://www.kyvky.com`.
- `src/lib/repo-hygiene.test.ts:15`: the email-domain allowlist.
- Docs and config that describe current state: `CLAUDE.md`, `README.md` (Deployment, Email), `env-template.txt`, the `next.config.ts` redirect comment, `docs/launch-checklist.md`, `docs/voice-and-tone.md`, `docs/email-client-qa.md`.

**`.com` drawn into the artwork:**
- `public/branding/Logo-03.png`. The mark reads "ky-ky.com" and the wordmark reads "knowyourvotekentucky.com". It is used by the header, footer, email header (`src/lib/email/brand.tsx`), JSON-LD logo and `/design-system`.
- `src/app/opengraph-image.jpg` (the default share card, same lockup), plus its alt text in `src/app/opengraph-image.alt.txt`.
- Not checked: favicons and app icons (`public/branding/icon-*`, `apple-touch-icon.png`, `favicon*`). Check them when the new artwork comes in.

**Outside the repo (owner only; this session cannot reach them):**
- Vercel: project domains, production env vars, and the redirect targets of the `.com` alternates.
- Hostinger: DNS zones for `kyvky.com` (and probably `kyvky.org`) [verify], the `katie@` mailbox, and the `knowyourvotekentucky.org` forward (which still drops the path, TASKS.md line ~28).
- Supabase Auth: Site URL, the Redirect URL allowlist, and the custom SMTP sender.
- Resend: sending domain (SPF/DKIM/DMARC), and the webhook endpoint and its signing secret.
- Sentry: the internal-integration webhook URL (`/api/webhooks/sentry`).
- Mapbox: the token URL restriction, if WS2-04 turned it on.
- Google Search Console and Bing Webmaster Tools.
- Off-site: social profiles, GitHub repo homepage, partner links (SFG), email signatures, print collateral.

## Phase 0: Prerequisites (owner, no visible change, start now)

Each step can be done on its own, and none of them changes what users see.

1. **Record current state for rollback.** Screenshot or export the DNS records for `kyvky.com`, `kyvky.org` and `knowyourvotekentucky.org`, the Vercel domain list, the Supabase URL configuration and the Resend domain list.
2. **Serve `.org` alongside `.com`.** Add `www.kyvky.org` and `kyvky.org` to the Vercel project as normal (non-redirect) domains, with apex → `www.kyvky.org`. Point DNS as Vercel instructs. Canonical tags still say `.com`, so search engines treat `.org` as a duplicate host, not a competitor.
3. **Email on `.org`:**
   - Create the `katie@kyvky.org` mailbox in Hostinger, or a forward to an inbox a human reads. Set MX on `kyvky.org`.
   - Add `kyvky.org` in Resend → Domains. Add SPF, DKIM (`resend._domainkey.kyvky.org`) and DMARC. Confirm DKIM resolves at `8.8.8.8` before trusting Resend's "verified" badge (the 2026-06-04 stale-verification incident, `docs/launch-checklist.md`).
   - [verify] that the current Resend plan allows a second sending domain.
   - Send test mail from `alerts@kyvky.org` to Gmail, Outlook and Yahoo using `docs/email-client-qa.md`. A new domain has no sending reputation, so check the spam folder.
4. **Artwork:** deliver `.org` versions of `Logo-03.png` (same dimensions, 2488×603) and `opengraph-image.jpg` (1200×630). Check the icons as well.
5. **Search Console:** add `kyvky.org` as a Domain property (DNS TXT, no code change). Do the same in Bing.
6. **Mapbox:** if the token is URL-restricted, add `www.kyvky.org` and `kyvky.org` now.

## Phase 1: Code PR (agent, prepared ahead, merged at cutover)

One PR, held as a draft until cutover day.

- `DEFAULT_SITE_ORIGIN` → `https://www.kyvky.org`, and update the comments in `site-canonical.ts`.
- Move the email addresses into `src/lib/kyvky-contact.ts` (`KYVKY_ALERTS_EMAIL`, `KYVKY_CONTACT_EMAIL`, next to `KYVKY_POSTAL_ADDRESS`) and point every hardcoded use above at those constants. This makes any future change one edit.
- Move the bot contact URL into one constant in the same file and use it for all 21 User-Agent strings. The workflow file can't import it, so edit it directly.
- **`.com` → `.org` redirect, host-matched in `next.config.ts` `redirects()`,** permanent (308), path and query kept. **Exclude `/api/unsubscribe/:token` and `/api/webhooks/:path*`** so that:
  - one-click unsubscribe POSTs from digests already in inboxes (`List-Unsubscribe` points at `.com`) still land. Whether mail providers follow redirects on that POST is unknown [verify], so don't depend on it.
  - Resend and Sentry webhook calls keep working until their dashboards are updated.

  This only works if `kyvky.com` and `www.kyvky.com` stay attached to Vercel as **normal** domains, not Vercel-level redirects (see the existing `next.config.ts` comment on why host rules otherwise never fire).
- Swap in the new artwork and update `opengraph-image.alt.txt`.
- `source-health.yml` site check → `www.kyvky.org`.
- `repo-hygiene.test.ts`: allow `kyvky.org`. Keep `kyvky.com` allowed until the transition ends.
- Update `CLAUDE.md`, `README.md`, `env-template.txt`, `docs/launch-checklist.md`, `docs/voice-and-tone.md` and `docs/email-client-qa.md` to the new identity. Add a `decisions.md` entry. Leave historical docs alone.
- Verify: `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build`. Then use a host header against `next start` to confirm the redirect and its exclusions.

## Phase 2: Cutover (owner and agent, one sitting, low-traffic hour, by 2026-12-14)

Order matters. Env vars come before the deploy because `NEXT_PUBLIC_*` is baked in at build time.

1. Vercel → Production env:
   - `NEXT_PUBLIC_APP_URL` and `APP_PUBLIC_URL` = `https://www.kyvky.org`
   - `RESEND_FROM_EMAIL` = `alerts@kyvky.org`
2. Supabase → Auth → URL Configuration:
   - Site URL = `https://www.kyvky.org`.
   - Add the `.org` `/auth/verify` and `/auth/reset` redirect URLs. **Keep the `.com` entries** until the transition ends.
   - Then Auth → SMTP: sender `auth@kyvky.org`.
3. Merge the Phase 1 PR, which deploys.
4. Vercel domain settings: repoint the four `.com` alternates (`knowyourvotekentucky.com`, `knowyourvoteky.com` and their `www` hosts) to `https://www.kyvky.org`, so there is no chain through `.com`. Repoint the `knowyourvotekentucky.org` forward too. Moving it into Vercel (WS9-05 option a) also fixes the path-stripping bug.
5. Resend → Webhooks: add `https://www.kyvky.org/api/webhooks/resend`. If it issues a new signing secret, update `RESEND_WEBHOOK_SECRET` and redeploy before deleting the old endpoint. Sentry integration webhook → `.org`. Check whether `SENTRY_WEBHOOK_SECRET` changes [verify].
6. Search Console: run **Change of Address** from the `kyvky.com` property to `kyvky.org` and submit `https://www.kyvky.org/sitemap.xml`. Use Bing's Site Move tool.
7. Smoke test, and record the results in `docs/ops/log.md`:
   - `curl -sI https://www.kyvky.com/bills/…` gives one redirect to the same path on `.org`. The same holds for the apex and every alternate.
   - On `.org`: the page's canonical tag, `sitemap.xml`, `robots.txt` and `llms.txt` all show `.org`.
   - Sign up, confirm, log in, reset a password. Receive the welcome email: From `alerts@kyvky.org`, reply goes to `katie@kyvky.org`.
   - Send a digest to yourself. Check that its unsubscribe link works by GET and by one-click POST.
   - Unsubscribe link in an **old** `.com` digest still works.
   - A Resend webhook event arrives (Sentry `route:webhooks/resend` tag, no signature errors).
   - Check `/members/map` and one district thumbnail.
   - Run `source-health` manually.

## Phase 3: Transition and cleanup

- **Never let `kyvky.com` lapse.** It carries backlinks, links in old emails and printed material. Keep it renewed and redirecting for good.
- Keep the `katie@kyvky.com` mailbox receiving, forwarded to `.org`, for good.
- After about 90 days: remove the `.com` Supabase redirect URLs. Drop `kyvky.com` from the hygiene allowlist. Optionally replace the `next.config.ts` host rule with Vercel-level domain redirects (unsubscribe links in digests sent before cutover will have aged out by then).
- Off-site updates: social bios, GitHub repo homepage, partner links, email signatures, print.

## Risks and visible effects

- **Everyone is logged out once.** Supabase session cookies are host-only (`src/lib/supabase/middleware.ts` sets no `domain`), so `.com` cookies are not sent to `.org`. The fix is to log in again. No data is lost.
- **Auth emails in flight at cutover.** Sign-up and reset links sent shortly before cutover point at `.com` and carry tokens in the URL fragment. `site-canonical.ts` says fragments are lost across a redirect. Current browsers normally carry a fragment over when the `Location` header has none [verify with one real reset email on staging or right after cutover]. Either way, affected users can request a new link.
- **Deliverability dip.** `kyvky.org` starts with no sending reputation. Mitigate with DKIM and DMARC in place before cutover and the inbox tests in Phase 0, and watch bounces and complaints in Resend for two weeks.
- **Short-term search ranking wobble.** This is normal for a domain move. Path-preserving 308s, Change of Address and the `.org` sitemap all limit it.
- **LRC scraping.** Only the contact URL inside the User-Agent changes. Watch `source-health` and the sync logs for 403s for a week.
- **Unsubscribe compliance (CAN-SPAM).** Unsubscribe links in emails already sent must keep working. The redirect exclusion and keeping `.com` covered by the Supabase allowlist handle this. The postal address does not change.

## Rollback

`.com` is never removed, so rollback is quick:
1. Set the Vercel env vars back to `.com`, revert the Phase 1 PR and redeploy.
2. Set the Supabase Site URL and SMTP sender back.
3. Set the alternates' redirect targets back.

The Resend `.com` domain stays verified throughout, so `RESEND_FROM_EMAIL=alerts@kyvky.com` works immediately. Leave the `.org` DNS in place (it does no harm).

## Open questions for the owner

1. Which registrar holds `kyvky.org`, and is its DNS on Hostinger? Is the `www.kyvky.org` host available?
2. `katie@kyvky.org`: a new mailbox or a forward? Is `alerts@` meant to receive anything (today it is a send-only From)?
3. Is the Mapbox token URL-restricted yet (WS2-04)?
4. Resend plan: does it allow a second domain?
5. Which cutover date, within 2026-11-09 → 12-14?
