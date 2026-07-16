## Summary

<!-- What changed and why, in a few sentences. Lead with the user-visible effect. -->

## Changes

<!-- Bullet the notable changes. Group by area (email, site, cron, API, docs) when the PR spans several. -->

-

## Deploy notes

<!-- Anything that must happen before/alongside merge, or "None."
     - New supabase/migrations/*.sql? State the deploy order (usually: apply migration first).
     - New env vars? Name them and where they're set (Vercel, GitHub Actions).
     - Cron or workflow changes? Note the schedule impact. -->

None.

## Copy & voice

<!-- Delete if no user-facing copy changed.
     - Follows docs/voice-and-tone.md (neutral, non-partisan, honest sourcing)?
     - Email footers include the postal address (KYVKY_POSTAL_ADDRESS)?
     - voice-and-tone.md updated if canonical strings changed? -->

## Verification

<!-- How you know it works. Check what applies and describe anything manual. -->

- [ ] `npx tsc --noEmit` clean
- [ ] `npm run lint` clean
- [ ] `npm run build` passes
- [ ] Email changes: rendered sample reviewed (`npm run preview:digest`), plain-text part reads cleanly
- [ ] Data/sync changes: verified against real data (describe below)

<!-- Screenshots for visual changes go here. -->
