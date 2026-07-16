# Bill digest email — design & copy critique

A critical pass over the digest email against four criteria: **accurate, concise, actionable, intuitive to read.** Reviewed surfaces: `src/lib/email/bill-digest-email.tsx`, `src/lib/digest/run-bill-digest-cron.tsx`, `src/lib/digest/format-digest-event-detail.ts`, and `docs/voice-and-tone.md` §2, plus a rendered sample (HTML + plain text) built from realistic payloads.

Findings are ranked within each section. "Fix" lines are recommendations, not applied changes.

---

## Accuracy

### 1. The email describes its own scope three different ways — none matches the content

- Subheading: "Status updates for **bills and topics** you follow."
- Preview text: "{n} updates from **bills and committees** you follow."
- Footer: "…because you follow **bills or topics** on Know Your Vote Kentucky."

Since v1.5 the digest has three sections (bills, topics, committees). Every scope statement omits at least one. A committee-only digest arrives under a subheading that doesn't mention committees; a topic-driven digest has preview text implying the reader follows those bills directly.

`docs/voice-and-tone.md` §2 is also stale: it documents "up to two sections" and preview text `{n} bill(s) with new activity`, which no longer matches `run-bill-digest-cron.tsx:399`.

**Fix:** one scope phrase everywhere — "bills, topics, and committees you follow" — or better, generate it from the sections actually present. Update voice-and-tone.md to match the shipped v1.5 structure.

### 2. Counts are wrong or inflated

- Preview text calls `totalItems` "updates," but it counts *groups* (bills + committee events), not event lines. A digest showing 7 lines across 5 bills says "5 updates." (`run-bill-digest-cron.tsx:389-399`)
- The overflow line "{n} additional updates not shown" uses `scored.length - DIGEST_CAP` — raw event rows **before de-duplication** (`run-bill-digest-cron.tsx:335`). One transition can emit several rows with identical `last_action` (e.g. `passed_chamber` + `floor_vote`); shown lines are deduped, the overflow count is not. The reader is told more was hidden than actually exists.
- Committee events bypass the cap entirely (separate query, `limit(40)`), so committee overflow is silently dropped and never counted.

**Fix:** count one unit consistently (bills is the most intuitive: "5 bills with new activity," which is also what the voice doc specifies), and compute overflow after dedupe.

### 3. Timestamps read as action times but are pipeline-observation times

Each line ends with "(Jul 15, 6:12 PM)" from `observed_at` — when the sync *noticed* the event, not when the legislature acted. LegiScan actions are often observed hours or a day later, so a floor vote taken Monday can read as Tuesday-evening news. There is also no timezone label, and the time is rendered in Eastern while western Kentucky is Central (`formatObserved`, `run-bill-digest-cron.tsx:26`).

**Fix:** either surface the action date from the payload when available, or label honestly per the "Honest sourcing" principle — "(recorded Jul 15)" — and drop the misleading time-of-day. If a clock time stays, label it "ET."

### 4. The no-`last_action` fallback repeats the bill title as the "event"

`formatDigestEventDetail` falls back to the bill title when the payload has no `last_action` (`format-digest-event-detail.ts:42`). The rendered block becomes:

> **HB 12**
> AN ACT relating to fiscal matters.
> AN ACT relating to fiscal matters. (Jul 15, 8:02 AM)

The reader is told nothing about what happened. If the title is *also* empty, the group renders with a bill header and zero lines. `formatDigestEventLabel` already exists and produces "Floor action," "Signed into law," etc. — but the email deliberately doesn't use it.

**Fix:** fall back to `formatDigestEventLabel(eventType, payload)` before falling back to the title; never render a group with no lines.

### 5. Calendar-sourced hearing lines have no verb

The `hearing_scheduled` (lrc-calendar) fallback renders "Health Services — 2026-07-22" (`format-digest-event-detail.ts:35-41`). Nothing says a hearing was scheduled, and the date is ISO. This is arguably the highest-value event in the digest (it's the one the reader can still act on) and it's the least legible line.

**Fix:** "Scheduled for hearing: Health Services, Tuesday, July 22" (see Actionability #2 for date formatting).

### 6. Small fallback: a bill with no number renders a bold blue link labeled "Bill"

`billNumber: bill.bill_number || 'Bill'` (`run-bill-digest-cron.tsx:366`). Rare, but "Bill" as a headline is worse than showing the title alone.

---

## Concision

### 1. Committee blocks say everything twice

> **Agenda updated**
> Updated agenda for 2026-07-22 — 10:00 AM, Room 171, Capitol Annex

The title and detail carry the same fact (`run-bill-digest-cron.tsx:299-313`). One line does it: "Agenda updated — Tue Jul 22, 10:00 AM, Room 171, Capitol Annex."

### 2. Committee events don't group

Bills group multiple events under one header and dedupe identical lines; committee events are one block per event with no grouping or dedupe. Three agenda revisions to one meeting = three near-identical blocks. Group by committee (matching the bill pattern) and dedupe by meeting + event type.

---

## Actionability

### 1. The only link per bill is the bill number

The number is a small tap target and the title — the visually dominant element — is inert. The voice doc's own convention is "CTAs describe the destination."

**Fix:** link the title too (same href), or add a quiet "View bill →" per group. Same for committee blocks: link the committee name *and* consider linking to the specific meeting when `meeting_id` exists.

### 2. Dates the reader must act on are machine-formatted

Meeting/hearing dates render as raw `meeting_date` strings ("2026-07-22"). For a "can I attend?" decision the weekday is the load-bearing fact. Bills' observed times get friendly formatting; the *forward-looking* dates — the only ones a reader can still do something about — don't.

**Fix:** format as "Tuesday, July 22" (weekday included) wherever `meeting_date` is shown.

### 3. The overflow link can't show what was cut

"{n} additional updates not shown — view all followed bills" links to `/bills?follows=me`. Overflow can come from *topic-matched* bills the user doesn't follow — the destination cannot display them. A topic-heavy user clicks through and finds nothing new.

**Fix:** link to the digest history page (it exists: profile → digest history), or split the overflow message by source.

---

## Intuitive to read

### 1. Event lines within a bill are not in a predictable order

Sorting is milestone-score first, then newest-first (`run-bill-digest-cron.tsx:333`), so HB 208 shows "3rd reading, passed…" *above* the earlier "to Rules (H)". The only ordering cue is the small gray timestamps. Milestone-first makes sense for choosing *which events survive the cap*, not for display order.

**Fix:** keep milestone-first for the cap, but render each bill's surviving lines in a consistent chronological order (oldest → newest tells the story; newest-first is fine too — just pick one).

### 2. Raw LRC action text is kept verbatim — good call, but it needs a glossary escape hatch

"to Rules (H)", "3rd reading", "reported favorably, to Calendar" are faithful (and the voice doc mandates verbatim), but a first-time reader gets no help. The site has a glossary; the email doesn't point to it. One footer line — "New to legislative terms? See the glossary →" — preserves verbatim accuracy while honoring "warmth through anticipation."

### 3. Committee blocks borrow the bill layout, and the seams show

The committee *name* sits in the bill-number slot and the event name ("Agenda updated") sits in the bill-*title* slot, styled identically to bill titles. In the plain-text part the committee is indistinguishable from a bill. Merging title+detail into one line (Concision #1) mostly resolves this.

### 4. Section heading parallelism

"Bills you follow" / "From topics you follow" / "Committees you follow" — the middle one breaks the pattern, and the per-bill "Matches your {topic} topic" note already explains *why* the bill is there. "Topics you follow" restores the rhythm.

### 5. Topic list join

"Matches your Healthcare, Labor topics" — use "and" for two items ("Healthcare and Labor topics"). Comma-join reads like a truncated list.

---

## What's working — keep these

- **Send-only-when-there's-news** and per-user window tracking (no duplicate events across digests).
- **Grouping by reason** (follow vs. topic) with the "Matches your {topic} topic" annotation — best-in-class transparency for automated matching.
- **Verbatim last-action text** — accurate, non-editorial, matches the LRC record.
- **Deliverability hygiene:** plain-text part, `List-Unsubscribe` + one-click POST, reply-to a real human.
- **Restrained visual design:** single column, quiet palette, clear hierarchy between bill number, title, and event lines.

## Suggested priority

| Priority | Items |
|---|---|
| High (accuracy of what's claimed) | Scope-phrase mismatch; overflow/preview counts; title-repeated-as-event fallback; hearing line has no verb |
| Medium (actionability) | Link the bill title; humanize meeting dates; fix overflow link destination; timestamp honesty ("recorded", timezone) |
| Low (polish) | Committee block dedupe/merge; line ordering; heading parallelism; "and" join; "Bill" fallback; glossary pointer; sync voice-and-tone.md §2 with v1.5 |
