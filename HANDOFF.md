# Handoff — Veto-status mislabel fix (PR #153)

> **This file is a review aid, not product code. Delete it before merging PR #153.**

You are picking up an in-flight change. Two things are asked of you:
1. **Review PR #153** for correctness.
2. **After merge, run the data backfill** that corrects the already-stored rows (instructions below).

---

## TL;DR

Bills that were **vetoed and never overridden** were displayed as **"Chaptered"** (enacted law).
Root cause is a logic-ordering bug in our own status mapper — **not** upstream (LegiScan / Open
States) data. The fix makes the mapper history-aware and disambiguates the three end-states that
all produce a `"delivered to Secretary of State"` action in Kentucky:

| End state | Becomes law? | Correct status |
|-----------|--------------|----------------|
| Governor signs | yes | `Chaptered` / `Signed` |
| Veto overridden | yes | `Veto Override` |
| **Vetoed, not overridden** | **no** | **`Vetoed`** ← was wrongly `Chaptered` |

Canonical example: **SB70 (2026RS, Public Pension Oversight Board)** — vetoed 04/23/26, never
overridden, so it is **not law**, but kyvky.com showed `Chaptered`.

---

## Current state

- **PR:** #153 — `fix(bill-status): map non-overridden vetoes to "Vetoed" not "Chaptered"`
- **Branch:** `claude/trusting-ride-kabys0` → base `main`
- **Commits (2):**
  - `1b9fb98` — mapper fix + regression script
  - `15f1cca` — backfill script + master-list sync notes
- **Diff:** 6 files (below). The forward code fix is merged-ready; **stored production data is NOT
  yet corrected** — that's the backfill step, which needs Supabase creds this session didn't have.

### Files changed
| File | What / why |
|------|------------|
| `src/lib/map-legiscan-bill-status.ts` | Core fix. Mapper now takes optional `history`; SoS-delivery branch resolves veto vs. chaptered via status code (`5=Vetoed`) and full history. New helpers `legiscanActionIndicatesFullVeto` / `legiscanHistoryIndicatesFullVeto`. |
| `src/lib/ky-sync-pipeline.ts` | Threads `detail.history` into the change-hash detail sync; comments the two master-list summary call sites (no history available there). |
| `src/lib/accuracy-audit/checkers/bills.ts` | Passes `bill.history` so the audit's *expected* status uses the same signal (it previously reused the buggy mapper and could never catch this). |
| `scripts/backfill-veto-status.ts` | One-shot data correction (see below). |
| `scripts/verify-veto-status-mapping.ts` | Regression guard — `npm run verify:bill-status`. |
| `package.json` | Adds `verify:bill-status`, `backfill:veto-status[:dry]`. |

---

## What to scrutinize in review

1. **Ordering in `mapLegiScanBillStatus`.** The veto-override check runs first, then `signed by
   governor`, then the `delivered to secretary of state` branch. Confirm no path lets a real veto
   fall through to `Chaptered`, and no signed/overridden bill is wrongly demoted to `Vetoed`.
2. **Line-item vetoes must stay law.** `legiscanActionIndicatesFullVeto` excludes `"line item"` /
   `"override"`. SB197 (26RS, line-item vetoed → Acts Ch. 202) must remain `Chaptered`. This is
   covered by the regression script; verify the exclusion logic reads correctly.
3. **Master-list gap (known limitation).** `getMasterList`/`getMasterListRaw` summaries carry **no
   action history**, so those two call sites rely on LegiScan's numeric status code being `5` for a
   non-overridden veto. This session had **no LegiScan API key** and could not confirm LegiScan
   returns `5` for a KY non-overridden veto. Mitigations already in place: the change-hash **detail**
   sync is history-aware, and the backfill re-maps from stored history. If you can hit the LegiScan
   API, spot-check `getBill` for SB70 (26RS) and confirm `status == 5`. If it's not 5, the
   summary-only path needs a follow-up (e.g. a getBill enrich for enacted-looking bills).
4. **Backfill safety.** `scripts/backfill-veto-status.ts` passes `statusCode=0` to the mapper (the
   numeric code isn't stored on `ky_bills`) and relies on `legiscan_history`. The `CORRECTABLE_TO`
   allowlist (`Vetoed`, `Veto Override`) is what prevents `statusCode=0` from ever downgrading a row
   to `Introduced`. Confirm that guard is intact and that it only ever *corrects an enacted-looking
   status to a veto outcome* — never the reverse, never a stage regression.

### Verify locally
```bash
npm run verify:bill-status     # regression suite — expect 9/9 pass
```
Environment note: this container had **no `node_modules` installed**. Use `npx tsx <script>` (auto-
installs `tsx`) if a bare `npm run` can't find `tsx`. A full `npx tsc --noEmit` is dominated by
pre-existing, unrelated errors (missing `@types/node`, `@supabase/supabase-js`, JSX types) because
deps aren't installed — that noise is **not** from this change; the changed mapper compiles/runs
clean under `tsx`.

---

## Backfill instructions (run AFTER the PR merges)

The code fix only changes mapping **going forward**. Rows already stored as `Chaptered`/`Signed`
stay wrong until re-mapped. The daily change-hash sync will **not** self-heal them — a long-vetoed
bill's `change_hash` never changes again — so this backfill is **required** to fix production.

**Prerequisites (env):** `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_SUPABASE_URL`.
(`LEGISCAN_API_KEY` only needed if you add `--fetch`.)

```bash
# 1. Preview — no writes. Prints each bill it would change (from → to).
npm run backfill:veto-status:dry

# 2. Apply — writes corrected ky_bills.status.
npm run backfill:veto-status

# Optional: if the dry run reports rows with no stored legiscan_history, pull it via getBill
# (1 LegiScan quota point per row) and re-map:
npx tsx scripts/backfill-veto-status.ts --fetch --dry-run
npx tsx scripts/backfill-veto-status.ts --fetch
```

**How it works / why it's safe:**
- Selects `ky_bills` rows whose stored `status` is `Chaptered` or `Signed` (the only statuses a
  hidden veto can masquerade as).
- Re-maps each using its **already-stored `legiscan_history`** → **zero LegiScan quota** by default.
- Writes a row **only** when the recomputed status is `Vetoed` or `Veto Override`. It never
  downgrades a bill to an earlier stage.
- `--dry-run` prints the full change list without writing. Always dry-run first and eyeball it.

**Expected corrections (26RS)** — bills vetoed and not overridden, per the LRC
`enrollment_actions.html` (our own sync's source):

```
SB70, SJR74, SB59, SB65, SB173, HB78, HB312, HB379
```

Each should flip `Chaptered → Vetoed`. If the dry run shows materially more or fewer than these
eight, stop and investigate before applying — it may indicate a second data issue.

**Post-apply verification:** re-check SB70 on the site (should read `Vetoed`), and/or run
`npm run audit:accuracy:dry` — the audit is now history-aware and will flag any remaining mismatch
between stored status and the recomputed expectation.

---

## Suggested wrap-up for the user
- After the backfill applies cleanly, offer to watch PR #153 (`subscribe_pr_activity`) for CI /
  review comments, or to open a tiny follow-up if the LegiScan `status==5` spot-check (review item
  #3) comes back negative.
- Then delete this `HANDOFF.md` (or drop it from the branch before merge).
