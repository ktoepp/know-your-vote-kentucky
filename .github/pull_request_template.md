## WP

<!-- Program PRs: [WSn-NN · Title](docs/program-spec/<workstream-file>.md#anchor) · Findings: …
     Then "Findings re-checked:" with each cited finding (and any N1–N5 erratum acted on):
     still true / changed / already fixed, with evidence.
     Non-program PRs: write `none` and keep the other sections. -->

## Summary

<!-- What changed and why, in a few sentences. Lead with the user-visible effect. -->

## Changes

<!-- Bullet the notable changes. Group by area (email, site, cron, API, docs) when the PR spans several. -->

-

## Acceptance criteria

<!-- Program PRs: copy the WP's acceptance criteria verbatim, each ticked [x] or left [ ] with a reason.
     Non-program PRs: write `none`. -->

## Verification

<!-- How you know it works. Describe anything manual. -->

CI (`checks`, `build`) is green: link the run. For anything CI cannot run (needs production secrets), paste the command and the tail of its output.

<!-- Check what applies: -->

- [ ] Email changes: rendered sample reviewed (`npm run preview:digest`), plain-text part reads cleanly
- [ ] Data/sync changes: verified against real data (describe below)

<!-- Screenshots for visual changes go here. -->

## Data-limit spend

<!-- Planned (from the WP's Data-limit impact) · Actual (LegiScan queries, Open States calls,
     LRC fetches, Anthropic $) · Counter before/after if applicable. Or "none". -->

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

## Owner actions remaining

<!-- Each human-only step, in order, with the exact command or setting, whether it needs
     production secrets, the expected result, and what to do if it differs. Or "none". -->

## Rollback

<!-- How to undo this PR: revert SHA, down-migration SQL, env flag. -->

## Found, not fixed

<!-- Out-of-scope issues noticed, or "none". -->
