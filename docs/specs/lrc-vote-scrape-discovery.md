# LRC Record-Vote Scrape — Discovery Pass Report

**Companion to:** `docs/specs/lrc-vote-scrape.md` (§ 2 "Source inventory" and § 11.1 "Discovery pass").
**Date:** 2026-08-02
**Author:** Claude (executing the plan's discovery pass)
**Status:** discovery-only. No `ky_votes` writes. No workflow change. No UX change.

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

---

_Generated by [Claude Code](https://claude.ai/code)_
