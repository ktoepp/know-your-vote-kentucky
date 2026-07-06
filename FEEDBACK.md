# Know Your Vote Kentucky (KYvKY) — User feedback

> Source of truth for incoming user feedback from any channel (email, in-person, PostHog surveys, Slack, etc.).
> Lives in the repo so any AI agent with file access can triage, action, and cross-reference it.
> Companion to [TASKS.md](./TASKS.md) (what we're building) and [decisions.md](./decisions.md) (why we built it that way).

---

## How to use this file (for AI agents and humans)

**When new feedback arrives**, append it to `## Open` using the entry schema below. Assign the next `[#NN]` id (highest existing id + 1, across all sections).

**When you action a piece of feedback**, *move* the entry to `## Actioned` (don't duplicate) and fill in the `Action:` line with a link to the PR, TASKS.md heading, or decisions.md section that resolved it. Update `Status:` to `actioned`.

**When you decide not to act**, move to `## Won't do` and add a one-line reason on the `Status:` line.

**Raw artifacts** (email screenshots, conversation transcripts, survey exports, anything with PII or that's too bulky to inline) go in **`docs/feedback/`** — that directory is **gitignored**, kept local only. Name files `YYYY-MM-DD-<slug>.<ext>` and reference them from the entry's `Artifact:` line. FEEDBACK.md itself is committed and should stay anonymized/curated.

**PostHog surveys**: if a survey wave has more than ~5 responses, create *one* entry referencing a CSV export in `docs/feedback/<survey-slug>-YYYY-MM-DD.csv` rather than one entry per respondent. Surface only the standout quotes / themes inline.

**Privacy**: Name and email may be captured when the user shared them directly (email reply, in-person intro, survey opt-in). For PostHog anonymous responses, leave both blank. Never paste raw PII from logs or analytics that wasn't volunteered as feedback.

### Entry schema

```
### YYYY-MM-DD — short title  [#NN]
- Source: email | in-person | posthog:<survey-slug> | slack | other
- From: Full Name <email@example.com>   ← omit line entirely if anonymous
- Verbatim: > quoted lines from the user (use ~ prefix for paraphrase)
- Theme: nav, mobile, copy, perf, a11y, data-accuracy, onboarding, notifications, …
- Artifact: docs/feedback/YYYY-MM-DD-<slug>.<ext>   ← omit if no raw artifact
- Action: → TASKS.md "<heading>" | PR #NN | decisions.md §YYYY-MM-DD | none yet
- Status: open | triaged | in-progress | actioned | wont-do (<reason if wont-do>)
```

`Theme:` is free-form — reuse existing tags when possible so similar feedback clusters. Run `grep '^- Theme:' FEEDBACK.md | sort | uniq -c` to see what's been used.

---

## Open

### 2026-07-06 — HB904 charitable-gaming device placement squeezes small veterans posts  [#4]
- Source: email (via HB904 bill-page "See a problem? Tell us" mailto)
- From: Amvets post trustee (name/email in artifact)
- Verbatim:
  > These small Veterans posts typically dont have the room to locate all machines in one condoned area in clear view of the gaming officer. […] We rely on our gaming to keep our patrons coming in, and right now we dont have a clear way to comply with the new law.
  > ~ Asks KYvKY to support an amendment exempting private clubs — out of scope (non-partisan), but the impact gap on our page is real.
- Theme: content, bill-summaries, data-accuracy, veterans
- Artifact: docs/feedback/2026-07-06-amvets-trustee-hb904.md (incl. verification against Acts ch. 184 §29 / KRS 238.538(11) — provision confirmed, no VSO exemption)
- Action: → PR #146 (`editor_notes` verified-facts mechanism + HB904 summary/who-it-affects update + Bill Text Versions card) + [decisions.md §2026-07-06](./decisions.md#2026-07-06--editor-verified-notes-channel-for-ai-bill-summaries-extends--2026-06-26--bill-text-versions-ui); HB904 note set + summary regenerated; 2026-session `legiscan_texts` backfilled; reply drafted (thank + probe)
- Status: in-progress (move to Actioned once PR #146 merges + reply sent)

### 2026-06-23 — Add "Women & Families" topic on /bills  [#3]
- Source: in-person (iMessage group chat "KY Fried Women")
- From: Katie Greene
- Verbatim:
  > It would be awesome if they would build in a sub-heading here for leg related to Women & Families, so we could have a direct location to drive people
- Theme: content, topic-taxonomy, navigation
- Artifact: docs/feedback/2026-06-23-ky-fried-women-imessage.md
- Action: → [decisions.md §2026-06-26](./decisions.md#2026-06-26--ai-plain-language-bill-descriptions-with-embedded-impact-audiences) — partially served by the new per-bill AI summaries (each names likely impacted audiences in prose, [#1]). A cross-bill **"Women & Families" lens page** is still pending; revisit once summaries ship and we see whether per-bill audience prose is enough. The standalone audience-axis classifier was dropped as too hard.
- Status: triaged (partially addressed by [#1])

### 2026-06-23 — Outreach intros: Democracy Matters, KY Dem State House group, Dirtroad Organizing, KFTC, county Dem Party  [#2]
- Source: email
- From: Iva Markicevic <iva.b.markicevic@gmail.com>
- Verbatim:
  > I would recommend reaching out to your county's Democratic Party as well as the nearest chapter of Kentuckians for the Commonwealth (you could even reach out to KFTC). I'm happy to introduce you to Democracy Matters—a group working to flip red seats in KY—and can share your message & email (for feedback) in two group chats I'm in: one with current Dem candidates for State House in KY and one with my cohort of Dirtroad Organizing.
- Theme: outreach, distribution
- Artifact: docs/feedback/2026-06-23-iva-markicevic-email.md
- Action: operator follow-up — reply to Iva accepting the intros; track resulting feedback as new entries here.
- Status: open

---

## In progress

### 2026-06-23 — Plain-language bill summaries + candidate use case validation  [#1]
- Source: email
- From: Iva Markicevic <iva.b.markicevic@gmail.com> (KY State House candidate, recipient of 2026-06-19 outreach)
- Verbatim:
  > One feature I'd love to see—and that I think users would find useful—is a brief summary in plain language of what the bill means for Kentuckians. The summaries provided on LRC can sometimes be vague and/or use confusing language, which can make it hard to understand exactly what the bill aims to do.
  > From a candidate perspective, I also think this would be helpful because 1) it would save us research time on bills we want to highlight that others aren't highlighting and 2) it would give us an easy tool to share with voters to highlight how [folks] are voting (whether it's an incumbent who wants to highlight a positive voting record or a challenger who wants to highlight an incumbent's problematic voting record).
  > [On LRC specifically:] resources you have to know about to find & don't offer the most user-friendly experience.
- Theme: content, bill-summaries, candidate-persona, discovery
- Artifact: docs/feedback/2026-06-23-iva-markicevic-email.md
- Action: branch `feat/legiscan-quota-guard-and-slack-dedupe` — reviving the dormant per-bill AI summary (`ai_summary`), now incl. a grounded "Who it may affect:" clause + disclaimer + feedback CTA + accuracy check. See [decisions.md §2026-06-26](./decisions.md#2026-06-26--ai-plain-language-bill-descriptions-with-embedded-impact-audiences). Generation via `npm run backfill:bill-summaries`.
- Status: in-progress

---

## Actioned

_Append-only. Move entries here once shipped; link to the PR / TASKS.md heading / decisions.md section that resolved them._

---

## Won't do

_Append-only. Move entries here when we've decided not to act; the `Status:` line must include the reason._
