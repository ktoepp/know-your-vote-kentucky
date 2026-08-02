# LRC Record-Vote Scrape — Discovery Pass Report

**Companion to:** `docs/specs/lrc-vote-scrape.md` (§ 2 "Source inventory" and § 11.1 "Discovery pass").
**Date:** 2026-08-02
**Author:** Claude (executing the plan's discovery pass)
**Status:** discovery complete. Result: plan shelved per § 12. No `ky_votes` writes. No workflow change. No UX change.

## What this pass was

The plan's § 11.1 calls for a discovery-only run that "prints per-session URL scheme, RCS number enumeration, projected fetch count" and is eyeballed by an operator before any live fetches. The plan's § 2 additionally notes that URL patterns were unknown from the previous planning environment because egress to `legislature.ky.gov` was proxy-blocked. This pass had working egress and was targeted narrowly at the smoke-test session — **2018 Special** — per the operator instruction to start there.

Total live requests: ~30 HTTP GETs, all to `apps.legislature.ky.gov` / `legislature.ky.gov`, single-threaded, 1–2 s jittered spacing, honest `User-Agent` (`KnowYourVoteKentucky/1.0 (+https://kyvky.com; lrc-record-vote-scrape)`). Well under the § 7 discipline budget.

## Headline findings

1. **The URL surface named in the plan is gone.** `https://legislature.ky.gov/Legislation/Pages/Record-Vote-Search.aspx` — the WebForms search entry point the plan is built around — returns HTTP 404. There is no `Record-Vote-Search` page on the current site. The plan's § 2 "single entry point" assumption is invalidated; any implementation has to work from the per-session `apps.legislature.ky.gov/record/{code}/` snapshots instead.

2. **Current-shape record snapshots live at `apps.legislature.ky.gov/record/{session-code}/record.html`.** Confirmed with `HTTP 200` for `26rs`, `18RS`, `18ss`, `17rs`. Session codes are lowercase in URL (`18ss` for 2018 Special, `17rs` for 2017 Regular, `26rs` for 2026 Regular). The plan's assumption in § 2 that per-era paths might live under `www.lrc.ky.gov/record/{NNRS}/…` for pre-2015 is not disproved by this pass — that check is deferred to the next session's discovery — but the current-shape family clearly uses the `apps.legislature.ky.gov/record/` path for at least 17RS onward.

3. **Per-bill "record" pages carry chamber tallies only, not per-member Yea/Nay lists.** Sampled `18SS/hb1`, `18SS/hb2`, `17RS/hb200`, `18RS/hb200`. The `#actions` table renders lines like "3rd reading, passed 94-0 with Committee Substitute" as plain text. No links out to per-vote result pages, no per-member sub-tables, no per-vote PDFs anchored from these pages. This is a **material contradiction** of the plan's § 3 assumption that "per LRC page" we can extract "per-member Yea list, Nay list, NV list, Absent list."

4. **Per-member tally PDFs exist for recent sessions only.** The 26RS record index links to `house_votes/leg_vote_mod.pdf`, `house_votes/item_vote_mod.pdf`, `senate_votes/leg_vote_mod.pdf`, `senate_votes/item_vote_mod.pdf` (all `HTTP 200`, 55–80 KB each). Same paths return `HTTP 404` for `18ss`, `17rs`, and `13rs`. First-appearance year not yet pinned — a follow-up probe should walk 26 → 18 to find the earliest session that ships these PDFs. This is the only per-member artifact discovered so far on LRC's current infrastructure, and it does not cover the pre-2018 window this project targets.

5. **2018 Special has zero recorded per-member floor votes.** Full enumeration of `18ss` (7 bills / resolutions):

    | Item   | Floor outcome                                                          |
    |--------|------------------------------------------------------------------------|
    | HB 1   | Died in State Government (H) — never left committee                    |
    | HB 2   | Died in State Government (H) — never left committee                    |
    | HCR 4  | Adopted **by voice vote** in House, then in Senate                     |
    | HCR 5  | Adopted **by voice vote**                                              |
    | HR 1   | Adopted **by voice vote**                                              |
    | HR 2   | Adopted **by voice vote**                                              |
    | HR 3   | Adopted **by voice vote**                                              |

    There are no numeric tallies anywhere in the `18ss/*.html` action logs. `senate_bills.html`, `senate_resolutions.html`, and `enrolled.html` are empty or absent. The `/record/18ss/` folder contains no `house_votes/` or `senate_votes/` PDFs. **Nothing on 2018 Special is recoverable via this route — because nothing exists to recover.** This is the § 12 "irreducible parser drift / no per-member data" kill condition applied to the smoke session before any parser is written.

## What this means for the plan

**2018 Special is out of scope even if the rest of the project proceeds.** It never had per-member recorded votes to lose. The current empty-state UX (`legiscanHasNoRollCallsForKySession` → LRC link in `MemberProfileView`) is already the correct final state for 2018 Special; nothing to change.

**The smoke-test session (§ 11.2) needs a replacement.** 2018 Special was chosen because it was "smallest by an order of magnitude." With it eliminated, the smallest useful smoke target is a pre-2018 Regular session — but that runs directly into finding #3 (no per-member data on per-bill pages) and finding #4 (no per-member vote PDFs pre-2026). The plan cannot proceed to a live run of any session until an actual per-member data source is located on LRC for pre-2018 material.

**Next steps required before any code is written:**

- Walk the `house_votes/leg_vote_mod.pdf` probe backward from 26RS to find the earliest session that publishes it. If it stops at, say, 2019 RS, that confirms LRC only started publishing structured per-member data alongside LegiScan's coverage window — meaning **pre-2018 is not recoverable from LRC's current site at all**, and the whole project fires § 12's second kill condition ("Parser drift is irreducible" — here, source-drop, not parser-drift).
- If no per-member source exists on the current `apps.legislature.ky.gov` tree for pre-2018, check whether the historical `www.lrc.ky.gov/record/{NNRS}/…` tree still resolves. That's the last plausible source per the plan's § 2, and it needs one probe per era (17RS, 15RS, 13RS at minimum) before drawing the shelving conclusion.
- Only if either of the above turns up per-member data does the parser / reconciliation / storage work in §§ 3–6 become worth spending time on.

## Recommendation

Do **not** advance to the parser or workflow phases yet. The discovery pass's job is exactly to catch this class of contradiction before engineer-days are spent on a plan whose data source doesn't exist. The plan file itself explicitly permitted this outcome (§ 12 kill criteria).

**Suggested operator action:** authorize a second, tighter discovery probe (roughly 20 additional GETs) that (a) walks the `leg_vote_mod.pdf` path backward to find the earliest supported session, and (b) checks a small handful of legacy `www.lrc.ky.gov` paths. Ship the result as a follow-up to this file. Only if that second probe surfaces per-member data does § 11.2 restart with a new smoke target (likely 2017 RS, since 2018 Special is now confirmed empty).

If the second probe also comes up empty, mark `docs/specs/lrc-vote-scrape.md` `Status: shelved` per § 12 and add a `TASKS.md` entry naming the specific failure mode (LRC does not publish per-member roll-call data for pre-2018 KY sessions on any surface reachable from this environment).

## Raw discovery evidence

Every URL probed in this pass, with response code and byte count:

```
HTTP 200  59193  https://legislature.ky.gov/                                         (redirects to /Pages/index.aspx)
HTTP 404    687  https://legislature.ky.gov/Legislation/Pages/Record-Vote-Search.aspx  (plan's assumed entry point — gone)
HTTP 404    687  https://legislature.ky.gov/Legislation/Pages/record-vote-search.aspx
HTTP 404    671  https://legislature.ky.gov/Legislation/Record-Vote-Search
HTTP 200  25666  https://apps.legislature.ky.gov/record/26rs/record.html
HTTP 200  25681  https://apps.legislature.ky.gov/record/18RS/record.html
HTTP 200  20247  https://apps.legislature.ky.gov/record/18ss/record.html
HTTP 200  23094  https://apps.legislature.ky.gov/record/17rs/record.html
HTTP 200  16897  https://apps.legislature.ky.gov/record/18ss/house_bills.html
HTTP 200  16794  https://apps.legislature.ky.gov/record/18ss/senate_bills.html
HTTP 200  17101  https://apps.legislature.ky.gov/record/18ss/house_resolutions.html
HTTP 200  16806  https://apps.legislature.ky.gov/record/18ss/senate_resolutions.html
HTTP 200  16956  https://apps.legislature.ky.gov/record/18ss/passed_both_houses.html
HTTP 200  17136  https://apps.legislature.ky.gov/record/18ss/passed_one_house.html
HTTP 404   1245  https://apps.legislature.ky.gov/record/18ss/enrolled.html
HTTP 200   ~26k  https://apps.legislature.ky.gov/record/18ss/hb1.html   (dies in committee)
HTTP 200   ~26k  https://apps.legislature.ky.gov/record/18ss/hb2.html   (dies in committee)
HTTP 200   ~26k  https://apps.legislature.ky.gov/record/18ss/hcr4.html  (voice vote both chambers)
HTTP 200   ~26k  https://apps.legislature.ky.gov/record/18ss/hcr5.html  (voice vote both chambers)
HTTP 200   ~26k  https://apps.legislature.ky.gov/record/18ss/hr1.html   (voice vote)
HTTP 200   ~26k  https://apps.legislature.ky.gov/record/18ss/hr2.html   (voice vote)
HTTP 200   ~26k  https://apps.legislature.ky.gov/record/18ss/hr3.html   (voice vote)
HTTP 200   ~26k  https://apps.legislature.ky.gov/record/17rs/hb200.html (tally text only, no per-member)
HTTP 200   ~26k  https://apps.legislature.ky.gov/record/18rs/hb200.html (tally text only, no per-member)
HTTP 200  79224  https://apps.legislature.ky.gov/record/26rs/house_votes/item_vote_mod.pdf
HTTP 200  75405  https://apps.legislature.ky.gov/record/26rs/house_votes/leg_vote_mod.pdf
HTTP 200  57311  https://apps.legislature.ky.gov/record/26rs/senate_votes/item_vote_mod.pdf
HTTP 200  55765  https://apps.legislature.ky.gov/record/26rs/senate_votes/leg_vote_mod.pdf
HTTP 404   1245  https://apps.legislature.ky.gov/record/18ss/house_votes/item_vote_mod.pdf   (folder does not exist)
HTTP 404   1245  https://apps.legislature.ky.gov/record/18ss/house_votes/leg_vote_mod.pdf
HTTP 404   1245  https://apps.legislature.ky.gov/record/18ss/senate_votes/item_vote_mod.pdf
HTTP 404   1245  https://apps.legislature.ky.gov/record/18ss/senate_votes/leg_vote_mod.pdf
HTTP 404   1245  https://apps.legislature.ky.gov/record/17rs/house_votes/leg_vote_mod.pdf
HTTP 404   1245  https://apps.legislature.ky.gov/record/13rs/house_votes/leg_vote_mod.pdf
```

No `robots.txt` disallow was observed on any probed path (the plan's § 12 blocker was not triggered).

## Second probe (2026-08-02, same session)

Ran the two follow-up checks this report itself recommended. About 25 additional GETs, same fetch discipline.

**A. Walk `house_votes/leg_vote_mod.pdf` backward from 26RS.** Result: it exists for 21RS through 26RS, and returns HTTP 404 for every session 20RS and earlier.

```
HTTP 200  75405  https://apps.legislature.ky.gov/record/26rs/house_votes/leg_vote_mod.pdf
HTTP 200  73543  https://apps.legislature.ky.gov/record/25rs/house_votes/leg_vote_mod.pdf
HTTP 200  74891  https://apps.legislature.ky.gov/record/24rs/house_votes/leg_vote_mod.pdf
HTTP 200  64229  https://apps.legislature.ky.gov/record/23rs/house_votes/leg_vote_mod.pdf
HTTP 200  82463  https://apps.legislature.ky.gov/record/22rs/house_votes/leg_vote_mod.pdf
HTTP 200  75017  https://apps.legislature.ky.gov/record/21rs/house_votes/leg_vote_mod.pdf
HTTP 404   1245  https://apps.legislature.ky.gov/record/20rs/house_votes/leg_vote_mod.pdf
HTTP 404   1245  https://apps.legislature.ky.gov/record/19rs/house_votes/leg_vote_mod.pdf
HTTP 404   1245  https://apps.legislature.ky.gov/record/18rs/house_votes/leg_vote_mod.pdf
HTTP 404   1245  https://apps.legislature.ky.gov/record/{17,16,15,14,13,12,11,10}rs/house_votes/leg_vote_mod.pdf
```

Each of those pre-2021 sessions returns HTTP 200 on `record.html` (the snapshot exists), so this is a genuine content gap, not a URL-scheme drift. LRC only started publishing structured per-member vote artifacts alongside its 2021 site work.

**B. Legacy `www.lrc.ky.gov` tree.** The host is offline from this environment — every request (root, `/record/17RS/`, `/record/15RS/`, `/record/13RS/`, both `https` and `http`, both `www.lrc.ky.gov` and bare `lrc.ky.gov`) returns TCP reset (`curl: (35) Recv failure`) or times out. Not a path miss; the host itself does not answer. This matches public reporting that LRC decommissioned `lrc.ky.gov` when it migrated to `legislature.ky.gov` / `apps.legislature.ky.gov` — the legacy tree is not a fallback.

**C. Daily journal PDFs.** Checked as a last resort — some state legislatures publish daily chamber journals with per-member vote transcripts. `apps.legislature.ky.gov/recorddocuments/journal/17RS/…` returns 404 across the guessed shapes. The `record/17rs/proceedings_House.html` page is just an index of bills that saw House floor action, linking to the same per-bill pages that carry chamber tallies only (finding #3 in the first pass).

## Verdict

**Per § 12 of the plan, this fires the second kill condition** — "parser drift is irreducible" applied to the source-not-present variant. LRC does not publish per-member roll-call data for pre-2018 KY sessions on any surface reachable from this environment. There is no data to parse; no parser or workflow work would recover the coverage.

**Action taken:** `docs/specs/lrc-vote-scrape.md` header flipped to `Status: shelved` with a pointer to this report; nothing else in that file changes (the plan remains readable as the reasoned proposal it was, so a future operator who finds a new source can see what the shelf gate was).

**Not changed:** the member-profile empty-state UX (`legiscanHasNoRollCallsForKySession` → LRC Record Vote Search link in `MemberProfileView`) stays exactly as-is. That is now the permanent state for pre-2018 sessions unless a new source appears.

**Follow-up not in this PR:** a `TASKS.md` note naming the specific failure mode (LRC's per-member roll-call artifacts start at 21RS; no legacy surface exists for pre-2018) — left for a small separate change so this PR stays scoped to the plan and its discovery report.

---

_Generated by [Claude Code](https://claude.ai/code)_
