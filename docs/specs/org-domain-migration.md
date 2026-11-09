# `.com` → `.org` domain migration plan

Status: **in progress.** Plan written 2026-11-08. On 2026-11-09 the code changes were written (held until cutover) and the `.org` domains were added to the Vercel project. Nothing user-visible has changed yet.
Origin: TASKS.md › "Owner wishlist, filed 2026-08-31" (SFG feedback: present as a nonpartisan `.org`).

## Decisions taken (owner, 2026-11-08)

| Question | Decision |
|---|---|
| Scope | **Full canonical flip.** `https://www.kyvky.org` becomes the canonical origin. Every `kyvky.com` URL 301/308s to the same path on `www.kyvky.org`. |
| Email | **Move to `.org`.** Sender `alerts@kyvky.org`, reply-to and contact `katie@kyvky.org`, Supabase auth sender `auth@kyvky.org`. |
| Logo and share image | **Owner supplies new artwork.** `.com` is drawn into the artwork itself (see below). |
| Canonical host shape | `www.kyvky.org` with apex → www. This keeps the current www pattern, so the reasoning in `src/lib/site-canonical.ts` (auth fragments, webhook POSTs) still applies. |
| Cutover date | **By 2026-11-30** (owner, 2026-11-08). This leaves two weeks before the 12-14 DNS deadline for fixes or rollback. Avoid Thanksgiving (11-26/27). |
| Registrar and DNS for `kyvky.org` | Hostinger, owned (owner, 2026-11-08). It is the same account as `kyvky.com`. |
| Mailboxes | `alerts@` is send-only and gets no mailbox, as today. `katie@kyvky.org` is a Hostinger **forwarder** to the existing `katie@kyvky.com` inbox, so there is one inbox and nothing to migrate. |
| Resend | Add `kyvky.org` as a second domain, then remove `kyvky.com` after the transition. Resend cannot rename a domain, so a "transfer" means add, then remove. The free plan allows 3 verified domains (Resend changelog, 2026-08-25), so this works on any plan. |

## Timing constraint

`docs/ops/release.md` allows no DNS changes during FZ (2026-12-15 → 2027-01-04) or W3 (2027-01-05 → 03-30, the legislative session). `docs/program-spec/09-…` WS9-05 sets the same limit. **Cutover must finish by 2026-12-14, or it waits until April 2027 (W4).** The owner target is 2026-11-30, which leaves two weeks of slack. Phases 0–1 can start now.

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

## Reference values

| Thing | Value |
|---|---|
| Vercel project domains | https://vercel.com/the-eighth-dimension/know-your-vote-kentucky/settings/domains |
| Vercel env vars | https://vercel.com/the-eighth-dimension/know-your-vote-kentucky/settings/environment-variables |
| Supabase project | `pmpadtydauuqysnxekno` ("know-your-vote-kentucky") |
| Supabase URL configuration | https://supabase.com/dashboard/project/pmpadtydauuqysnxekno/auth/url-configuration |
| Hostinger panel | https://hpanel.hostinger.com. Both zones are on Hostinger nameservers (`kyvky.org`: `lunar`/`solar.dns-parking.com`; `kyvky.com`: `athena`/`apollo.dns-parking.com`). |
| Resend | https://resend.com/domains and https://resend.com/webhooks |
| Mapbox tokens | https://account.mapbox.com/access-tokens/ |
| Search Console / Bing | https://search.google.com/search-console and https://www.bing.com/webmasters |
| Check DNS from a browser | `https://dns.google/query?name=<host>&type=<A|CNAME|TXT|MX>` |

## Phase 0: Prerequisites (owner, no visible change, start now)

Each step can be done on its own, and none of them changes what users see.

1. **Record current state for rollback.** Take screenshots of the Hostinger DNS records for `kyvky.com`, `kyvky.org` and `knowyourvotekentucky.org`, and of the Supabase URL configuration. Vercel domains as of 2026-11-09, read through the API:
   - `www.kyvky.com` serves the site.
   - `kyvky.com` → redirect to `www.kyvky.com` (default status).
   - `knowyourvotekentucky.com`, `www.knowyourvotekentucky.com`, `knowyourvoteky.com`, `www.knowyourvoteky.com` and `know-your-vote-kentucky.vercel.app` → 308 to `www.kyvky.com`.
   - `kyvky.org` on 2026-11-09: `A @ 2.57.91.91` (Hostinger parking) and `CNAME www → kyvky.org`.
2. **Serve `.org` alongside `.com`.**
   - Vercel side: **done 2026-11-09 by the agent.** `www.kyvky.org` was added as a serving domain, and `kyvky.org` as a 308 redirect to `www.kyvky.org`. Both show "misconfigured" until DNS points at Vercel.
   - **Owner, in Hostinger → Domains → `kyvky.org` → DNS / Nameservers:**
     - **Delete** `A @ 2.57.91.91`, and any `AAAA @` record if one exists. If hPanel has a domain *redirect/forward* or *parking page* set for `kyvky.org`, remove that too.
     - **Add** `A @ 216.150.1.1` and `A @ 216.150.16.1`. (If Hostinger allows only one A record: `A @ 76.76.21.21`.)
     - **Edit** `CNAME www`: change the target from `kyvky.org` to `2fa4423ab3821f7e.vercel-dns-017.com`. These are the same values `www.kyvky.com` uses.
     - Leave MX and TXT records alone.
   - Check: after 5–60 minutes the Vercel domains page shows both `.org` hosts as "Valid Configuration", and https://www.kyvky.org loads the site. The page's canonical tag still says `.com` until cutover. That is expected.
3. **Email on `.org`** (finish by about 2026-11-20 so the new domain has a week of test sends before cutover):
   - **Forwarder:** hPanel → Emails → pick `kyvky.org` → Forwarders → create one from `katie@kyvky.org` to `katie@kyvky.com`. Hostinger sets MX (`mx1.hostinger.com` / `mx2.hostinger.com`) when email is turned on for the domain. Send a test from Gmail to `katie@kyvky.org` and confirm it arrives. No mailbox is needed for `alerts@`. If hPanel wants a paid email plan just to forward, stop and tell the agent; there are free alternatives.
   - **Resend:** https://resend.com/domains → **Add Domain** → `kyvky.org`, same region as `kyvky.com`. Resend then lists 3–4 records. Add each one in Hostinger DNS for `kyvky.org`, **copying the exact values from Resend**. They look like this:
     - `MX send` → `feedback-smtp.<region>.amazonses.com`, priority 10
     - `TXT send` → `v=spf1 include:amazonses.com ~all`
     - `TXT resend._domainkey` → a long `p=…` key
     - If Resend suggests DMARC, `TXT _dmarc` → `v=DMARC1; p=none;`
   - Click **Verify** in Resend. Before trusting the green badge, open https://dns.google/query?name=resend._domainkey.kyvky.org&type=TXT and confirm the `p=…` key shows up. This guards against a repeat of the 2026-06-04 stale-verification incident in `docs/launch-checklist.md`. Keep `kyvky.com` in Resend until Phase 3.
   - **Test sends:** from https://resend.com/emails (or the API), send from `alerts@kyvky.org` with reply-to `katie@kyvky.org` to a Gmail, an Outlook and a Yahoo address. Use `docs/email-client-qa.md`, and check spam folders: a new domain has no sending reputation.
4. **Artwork:** deliver `.org` versions of `public/branding/Logo-03.png` (2488×603 PNG, transparent background) and `src/app/opengraph-image.jpg` (1200×630 JPG). Check the icons (`public/branding/icon-*`, `apple-touch-icon.png`, `favicon*`) for a TLD as well.
5. **Search Console:** https://search.google.com/search-console → Add property → **Domain** → `kyvky.org`. Google gives a `TXT @` value (`google-site-verification=…`); add it in Hostinger DNS for `kyvky.org`. In Bing Webmaster Tools, import the property from Search Console.
6. **Mapbox:** https://account.mapbox.com/access-tokens/ → open the token whose value matches `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` in Vercel → **URL restrictions**. If it is empty, there is nothing to do. If it has entries, add `https://www.kyvky.org` and `https://kyvky.org`, and keep the `.com` entries.

## Phase 1: Code changes (agent, on the plan PR, merged at cutover)

**Status: written 2026-11-09 on the plan PR's branch. Held as a draft. Do not merge before cutover.** Merging turns on the `.com` → `.org` redirect and the `.org` addresses.

- `DEFAULT_SITE_ORIGIN` → `https://www.kyvky.org` (`src/lib/site-canonical.ts`).
- `KYVKY_ALERTS_EMAIL` (`alerts@kyvky.org`) and `KYVKY_CONTACT_EMAIL` (`katie@kyvky.org`) were added to `src/lib/kyvky-contact.ts`. Every hardcoded use now points at them: the welcome and digest sends, the preview script, the about/terms/privacy pages, the bill-page and AI-summary feedback links, and the unsubscribe error page. `RESEND_FROM_EMAIL` still overrides the From address at runtime.
- All 21 scraper User-Agent strings: `+https://kyvky.com` → `+https://www.kyvky.org`, edited in place. The bot names are unchanged, and a shared constant wasn't worth 18 new imports.
- `next.config.ts`: a host rule 308s every `www.kyvky.com` path to the same path and query on `www.kyvky.org`. **It leaves `/api/unsubscribe/*` and `/api/webhooks/*` alone**, so one-click unsubscribe POSTs from digests already sent and any webhook not yet repointed still land. This needs `www.kyvky.com` to stay a **serving** domain in Vercel, as it is today.
- `source-health.yml` site check → `www.kyvky.org`. `repo-hygiene.test.ts` allows `kyvky.org` (and keeps `kyvky.com` for the transition).
- Updated `CLAUDE.md`, `README.md`, `env-template.txt`, `docs/voice-and-tone.md`, `docs/email-client-qa.md`, and added a `decisions.md` entry. Historical docs are unchanged.
- **Still to do when the artwork arrives:** swap `Logo-03.png` and `opengraph-image.jpg`, and update `src/app/opengraph-image.alt.txt`.
- Verified locally:
  - `npx tsc --noEmit`, `npm test` (302/302), `npm run lint` (0 errors).
  - `next dev` with Host headers: `www.kyvky.com/bills/HB1?session=2026RS&x=1` → `308 https://www.kyvky.org/bills/HB1?session=2026RS&x=1`. `/api/unsubscribe/<token>` (GET and POST) and `/api/webhooks/resend` reach their routes on `.com`. `/api/unsubscribe-other` is redirected. Other hosts are unaffected.
  - `next build` can't run in the agent sandbox, which blocks Google Fonts; CI runs it.

## Phase 2: Cutover (owner and agent, one sitting, low-traffic hour, by 2026-11-30)

Order matters. Env vars come before the deploy because `NEXT_PUBLIC_*` is baked in at build time.

1. **Vercel env vars** (https://vercel.com/the-eighth-dimension/know-your-vote-kentucky/settings/environment-variables). Edit each one; they currently target Production + Preview:
   - `NEXT_PUBLIC_APP_URL` = `https://www.kyvky.org`
   - `APP_PUBLIC_URL` = `https://www.kyvky.org`
   - `RESEND_FROM_EMAIL` = `alerts@kyvky.org`
2. **Supabase** (https://supabase.com/dashboard/project/pmpadtydauuqysnxekno/auth/url-configuration):
   - Site URL = `https://www.kyvky.org`
   - Redirect URLs: **add** `https://www.kyvky.org/auth/verify` and `https://www.kyvky.org/auth/reset` (and `https://www.kyvky.org/**` if the `.com` list uses a wildcard). **Keep** the `.com` entries.
   - Then Authentication → Emails → SMTP Settings: Sender email = `auth@kyvky.org`. The sender name stays the same.
3. **Merge the PR** (agent, on the owner's go). Vercel deploys with the new env.
4. **Vercel domains** (https://vercel.com/the-eighth-dimension/know-your-vote-kentucky/settings/domains): edit each of these to **Redirect to `www.kyvky.org`, 308**:
   - `kyvky.com`
   - `knowyourvotekentucky.com` and `www.knowyourvotekentucky.com`
   - `knowyourvoteky.com` and `www.knowyourvoteky.com`
   - `know-your-vote-kentucky.vercel.app`

   **Do not touch `www.kyvky.com`.** It must stay a serving domain so the `next.config.ts` rule can handle it.
   - Optional, same sitting: fix the `knowyourvotekentucky.org` Hostinger forward (WS9-05). Either add it and its `www` host here as redirects to `www.kyvky.org` and point their DNS at Vercel (A `216.150.1.1` / `216.150.16.1`, `www` CNAME `2fa4423ab3821f7e.vercel-dns-017.com`), or change the Hostinger forward's target to `https://www.kyvky.org` with the path kept.
5. **Webhooks:**
   - https://resend.com/webhooks → add an endpoint `https://www.kyvky.org/api/webhooks/resend` with the same events as the `.com` one. Copy its signing secret into `RESEND_WEBHOOK_SECRET` in Vercel, redeploy, then delete the `.com` endpoint. The `.com` endpoint keeps working in the meantime because the redirect leaves it alone.
   - Sentry → Settings → Developer Settings → the internal integration → Webhook URL → `https://www.kyvky.org/api/webhooks/sentry`. The client secret normally stays the same; if Sentry rotates it, update `SENTRY_WEBHOOK_SECRET`.
6. **Search:** in Search Console, open the old `kyvky.com` property → Settings → **Change of address** → choose `kyvky.org`. Then in the `kyvky.org` property → Sitemaps → submit `https://www.kyvky.org/sitemap.xml`. In Bing, use the **Site Move** tool.
7. **Smoke test** (owner runs these and pastes the output to the agent; record the result in `docs/ops/log.md`):
   ```bash
   for u in https://www.kyvky.com/bills https://kyvky.com/bills https://knowyourvotekentucky.com/bills https://knowyourvoteky.com/bills https://kyvky.org/bills; do echo "$u"; curl -sI "$u" | grep -iE '^(HTTP|location)'; done
   ```
   ```bash
   curl -s https://www.kyvky.org/ | grep -o '<link rel="canonical"[^>]*>'
   ```
   ```bash
   curl -s https://www.kyvky.org/robots.txt | grep -i sitemap
   ```
   Expect each legacy URL to answer with one 308 whose `location` is `https://www.kyvky.org/bills`, the canonical tag to show `https://www.kyvky.org/`, and robots.txt to list the `.org` sitemap. Then by hand:
   - Sign up with a test address, confirm, log in, reset the password.
   - Turn on a daily digest for one bill, and when it arrives check From `alerts@kyvky.org`, that a reply goes to `katie@kyvky.org`, and that its unsubscribe link works.
   - Click the unsubscribe link in an **old** `.com` digest. It should still work.
   - Check `/members/map` and one district thumbnail.
   - Run the `source-health` workflow manually: https://github.com/ktoepp/know-your-vote-kentucky/actions/workflows/source-health.yml → Run workflow.

## Phase 3: Transition and cleanup

- **Never let `kyvky.com` lapse.** It carries backlinks, links in old emails and printed material. Keep it renewed and redirecting for good.
- Keep the `katie@kyvky.com` mailbox for good. It is the real inbox behind the `katie@kyvky.org` forwarder.
- After about 90 days: remove `kyvky.com` from Resend → Domains (this completes the "transfer"; leave its DKIM record in DNS, where it does no harm). Remove the `.com` Supabase redirect URLs. Drop `kyvky.com` from the hygiene allowlist. Optionally replace the `next.config.ts` host rule with Vercel-level domain redirects (unsubscribe links in digests sent before cutover will have aged out by then).
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
1. Set the Vercel env vars back to `.com`, revert the Phase 1 merge and redeploy.
2. Set the Supabase Site URL and SMTP sender back.
3. Set the alternates' redirect targets in Vercel back to `www.kyvky.com` (the `kyvky.com` apex used the default status; the others used 308).

The Resend `.com` domain stays verified throughout, so `RESEND_FROM_EMAIL=alerts@kyvky.com` works immediately. Leave the `.org` DNS in place (it does no harm).

## Open questions for the owner

Answered 2026-11-08 (see "Decisions taken"). Still open:

1. Mapbox URL restriction: check it with Phase 0 step 6.
2. The exact cutover day and hour within 2026-11-09 → 11-30.
3. Delivery date for the `.org` logo and share-image artwork.
