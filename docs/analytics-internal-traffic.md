# Keeping internal & test traffic out of PostHog

Goal: dashboards, funnels, and conversion numbers reflect **real public visitors only** —
not the team, not preview deploys, not bots/synthetic checks.

## What the code already handles

| Source of noise | Status | Where |
|---|---|---|
| Local dev (`npm run dev`) | Excluded — PostHog only inits when `NODE_ENV=production` (opt back in with `NEXT_PUBLIC_POSTHOG_REPORT_DEV=true`) | `instrumentation-client.ts` |
| Vercel **preview / branch** deploys | Excluded — `vercel.json` forces `NODE_ENV=production` for *all* deploys, so we additionally skip init when `NEXT_PUBLIC_VERCEL_ENV === "preview"` | `instrumentation-client.ts` + `next.config.ts` (bakes `NEXT_PUBLIC_VERCEL_ENV` from Vercel's `VERCEL_ENV`) |

No Vercel dashboard change is needed for the preview gate — `VERCEL_ENV` is a built-in
build-time system var that `next.config.ts` now exposes to the client bundle.

> Verify after deploy: open a **preview** URL, check the browser Network tab → there should be
> **no** requests to `us.i.posthog.com`. On **production** (kyvky.com) they should appear.

## What must be configured in the PostHog UI (cannot be done in code)

These live in **PostHog → Settings → Project → "Internal and test users"** (filter rules) and
**Settings → Project → "Authorized URLs" / "Web analytics"**. Apply all that fit:

1. **Filter out the team by email.** Add a filter: `Person property → email → does not contain`
   your team domain(s) / personal addresses (e.g. `katietoepp@gmail.com`). This relies on
   `identifyUser(distinctId, { email })` being called at sign-in — confirm the auth flow passes
   `email` as a trait (see `src/lib/analytics.ts` `identifyUser`). Signed-out internal browsing
   can't be caught this way (no identity) — use #2/#3 for that.

2. **Filter out internal hosts.** Add: `Event property → $host → does not equal`
   any preview/staging host you still allow events from, and any localhost. With the code gate
   above this is mostly belt-and-suspenders, but it also catches `*.vercel.app` production-alias
   hits and anything pointed at the prod key by mistake.

3. **Filter out known internal IPs** (office / home static IPs) if you have them:
   `Event property → $ip → is not in`.

4. **Bot/crawler filtering.** PostHog Web Analytics has a built-in **"Filter out bots"** toggle —
   confirm it's on. (PostHog drops common bot user-agents server-side when enabled.)

5. **Apply the filter everywhere.** When you create the "Internal and test users" filter, set it
   as the **default test-account filter** so it's pre-applied to insights, funnels, and web
   analytics — not just saved as an ad-hoc filter on one chart.

## When you have ~1–2 weeks of clean data

Attach the PostHog MCP (`npx @posthog/wizard mcp add`) for in-terminal querying of insights /
funnels / flags. It's data-driven and adds nothing until events have accumulated
(see TASKS.md "PostHog — MCP follow-up").

## Slack from PostHog

PostHog **Action subscriptions** (e.g. `user_registered`, `bill_followed` → Slack) are configured
in the PostHog UI, independent of the repo's webhook plumbing in `src/lib/slack-webhook.ts`.
If you streamline Slack channels, review those subscriptions there too — they are not in version control.
