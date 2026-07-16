# Voice and tone — Know Your Vote Kentucky

This guide governs **all user-facing copy** — the site, emails, and any future surface. It started as an email-only guide; it now applies everywhere so the product reads as one voice.

## Who we are

Know Your Vote Kentucky (KYVKY) is a free, independent, non-partisan civic reference for Kentucky residents. The voice should signal three things at all times: **trustworthy, neutral, and accessible.** We are closer to a reliable government tracking service than to a startup.

## Principles

**Neutral and informational.** State what happened or what a person can do. No enthusiasm, no promises, no adjectives that talk up the product.

**Non-partisan, always.** Never editorialize, characterize legislation as good or bad, or imply a position. This is a brand-critical constraint, not a style preference — "state facts, not feelings" is also how we stay neutral. Describe what a bill *does* and where it *is*, never what someone *should* think about it.

**State facts, not feelings.** Write what is true. Avoid language that tells people how to feel ("stay informed," "never miss a vote").

**Honest sourcing.** Show where data comes from and where it falls short — plainly, on purpose. "Profile information … may lag updates," "topic tags are automated and can miss or mislabel some bills," "We send factual updates only." This honesty is a deliberate trust signal and a brand asset. Do not "clean it up" into something that sounds more confident than the data warrants.

**Warmth through anticipation, not enthusiasm.** Neutral does not mean cold. We add warmth by anticipating a newcomer's confusion and answering it — the way the glossary notes that "the rules and procedures differ from the U.S. Congress." That is the model: helpful, human, oriented to someone who has never done this before. We do **not** add warmth with exclamation points, hype, or cheerleading.

**Device-neutral.** Use "select," not "tap," "click," or "press." People read on phones, tablets, and desktops.

**No internal system names.** Users do not need to know what powers a feature. Internal pipeline language ("our calendar sync," database names, "LegiScan-synced") belongs in developer docs. *Naming a public source for transparency is different and allowed* — see Honest sourcing and the About/Data-sources page.

**One idea per sentence.** Short lines. No run-ons.

**CTAs describe the destination.** "Browse bills →" not "Start following bills today →."

## Register: reference vs. marketing

Most of the product is **reference** copy — bills, members, committees, profile, emails. Hold the neutral, factual register there.

The **marketing surface** (home/landing hero, the About intro) may be *a little* warmer and more invitational — enough to welcome someone and explain why this matters. "Your vote doesn't stop at the ballot box" is fine: it encourages civic participation, which is the site's whole purpose, without favoring any party or position. The line we never cross, even in marketing, is editorializing about legislation or politics. Warmer, never partisan.

## Conventions

**Headings.** Sentence-case nouns: "Bills," "Members," "Committees," "Meetings." Avoid marketing verbs as page titles ("Explore Bills" → "Bills").

**Feature naming — the district map.** One name everywhere:
- Label / nav / button / page heading: **"Find my legislators"** (sentence case, plural).
- In prose: "your representatives" / "your House and Senate representatives."
- "District map" only when describing the tool itself, not as its primary label.

**Auth verbs.** **"Log in"** (never "Sign in") and **"Sign up."** Match across nav, buttons, and the pages they lead to.

**"Load more"** — not "Load more bills" / "Load more members." The surrounding context already says what.

**Acronyms.** Expand on first use: "Legislative Research Commission (LRC)," then "LRC" thereafter.

**Counts.** "141 members," not "141 people."

---

## Email touchpoints

### 1. Welcome email

Triggered once, after first email verification.

**Subject:** `Your Know Your Vote Kentucky account is set up`

**Preview text:** `You can now follow Kentucky bills and receive status updates by email.`

**Heading:** `Your account is set up, {name}.` / `Your account is set up.`

**Lead paragraph:**
> Know Your Vote Kentucky sends a digest when bills you follow change status. You will only receive email when there is an update to report.

**Card: Follow bills**
> Select **Follow** on any bill page to track it. You will receive digest updates when it moves — committee action, floor votes, sent to governor, signed, or vetoed.
> CTA: Browse bills →

**Card: Find your legislators**
> Enter your address on the district map to see your House and Senate representatives in the current session.
> CTA: Find my legislators →

**Card: Set digest preferences**
> Choose daily or weekly delivery and select which event types to include. You can also follow topics by subject area — automated tagging, so following a specific bill stays the most reliable way to track it.
> CTA: Notification preferences →

**Footer:**
> This is a one-time setup email. Manage your account at {profileUrl}.

---

### 2. Bill digest email

Sent daily or weekly based on user preference, only when there are events to report.

**Subject:** `Kentucky bill digest — {date}` (e.g., `Kentucky bill digest — May 13, 2026`). A digest with no bill sections uses `Kentucky committee digest — {date}` instead — the subject never names content the email doesn't contain.

**Preview text:** describes only what the digest contains, joined with "and" when both parts are present: `{n} bill(s) with new activity` / `{n} committee update(s)` / `3 bills with new activity and 2 committee updates`.

**Header:** the KYVKY logo (`/branding/Logo-03.png`, linked to the site home) above the heading.

**Heading:** matches the subject's base: `Kentucky bill digest` / `Kentucky committee digest`.

**Subheading:** generated from the sections actually present — `Status updates for {bills / topics / committees, joined with "and"} you follow.` (e.g., `Status updates for bills and committees you follow.`). Never claims a source the digest doesn't include.

**Structure — grouped by reason.** Updates are split into up to three sections so the reader sees *why* each item is included. A section is shown only when it has content:
- `Bills you follow` — bills the user follows individually.
- `Topics you follow` — bills matched by a followed topic. Each such bill is annotated with the matched topic(s): `Matches your {topic} topic` / `Matches your {topicA} and {topicB} topics` (serial "and", Oxford comma for three or more). Each topic name links to the bills browse filtered by that topic (`/bills?topic={t}`).
- `Committees you follow` — one block per committee, one line per calendar change, in a parallel colon pattern: `New meeting: {weekday, month day} — {time and location}` / `Agenda updated: …` / `Meeting cancelled: …`. Repeated updates to the same meeting are de-duplicated, and `Agenda updated` is suppressed when the same meeting's `New meeting` line is already in the digest (it would carry no new information). Committee updates have their own cap; the remainder counts toward the overflow line.

A bill the user both follows and matches by topic appears once, under `Bills you follow`.

**Event lines.** Each line states the bill's recorded action verbatim (the legislative last-action text), followed by `(recorded {Mon D})` — the date our sync observed it, deliberately date-only and labeled "recorded" because it is not the time the legislature acted. No event-category label when action text exists; when a payload has no action text, the line falls back to the event label ("Floor action", "Signed into law"), never to the bill title. Multiple lines under one bill read oldest to newest (committee blocks too). De-duplication runs before the cap so the overflow count is honest, and keys on bill + text + recorded date so distinct events sharing fallback text (three "New cosponsor" days apart) are kept.

**Links.** Each bill block is one link — the bill number (brand blue) and title (ink) share a single anchor to the bill page, so the tap target is large and the plain-text part prints each URL once. Committee names link to the committee page. All other links (overflow, glossary, footer) are brand blue and underlined.

**Overflow line (when events are capped):**
> {n} more update(s) not shown. [Your profile] lists recent activity for bills and committees you follow. Bills matching your topics are in the bill browser: [{topicA}] · [{topicB}]
> Links to the profile activity feed. Phrased carefully: the profile is named so the login prompt is unsurprising, and the sentence claims only what the feed covers (followed bills and committees — it cannot show topic-matched overflow). The topic-browser sentence appears only when topic-matched updates were actually cut, and links each affected topic to `/bills?topic={t}` — the closest destination for them (note: the browse filters by KY topic tag only, while digest matching also uses LegiScan subjects, so coverage overlaps but is not identical).

**Footer:**
> You're getting this because you follow bills, topics, or committees on Know Your Vote Kentucky.
> Bill status lines quote the legislature's official action text where available — the [glossary] explains the terms. Dates in parentheses show when Know Your Vote Kentucky recorded each update, which can lag the action itself.
> [Change digest settings] · [Unsubscribe] · [Privacy] · [Terms]
> Know Your Vote Kentucky · PO Box 133, Bardstown, Kentucky 40004

The postal address (`KYVKY_POSTAL_ADDRESS` in `src/lib/kyvky-contact.ts`) appears in every outbound email footer, including the welcome email.

("Official action text where available", not "the legislative record as written" — hearing and committee lines are our own wording around calendar data, and "record/recorded" must not do double duty with the date label.)

---

### 3. Unsubscribe page

One-click, no login. Rendered as a minimal HTML page.

**Success (200):**
- Title: `Digest emails stopped`
- Body: `You will not receive further bill digest emails from Know Your Vote Kentucky. You can re-enable digests at any time from your profile.`

**Not found (404):**
- Title: `Link not found`
- Body: `No subscription was found for this link. You may have already unsubscribed, or the link may have expired.`

**Invalid/missing token (400):**
- Title: `Invalid link`
- Body: `This unsubscribe link is not valid. If you received it in an email, try selecting the link again or contact us at katie@kyvky.com.`

**Server error (500):**
- Title: `Something went wrong`
- Body: `Your preference could not be saved. Please try again, or update your digest settings from your profile page.`

---

## What to avoid

| Avoid | Reason |
|---|---|
| "Stay informed" / "Never miss a vote" | Characterizes value; implies urgency |
| Any take on whether a bill is good or bad | Editorializing; breaks non-partisanship |
| "We've got you covered" | Casual and promotional |
| "Tap" / "click" / "press" | Device-specific |
| "Explore Bills" (verb as page title) | Marketing register; a reference tool browses, it doesn't hype |
| "Sign in" | Use "Log in" for one consistent verb |
| "KY" as a stand-in for "Kentucky" | Abbreviation inconsistent with the full name |
| "our LRC calendar sync," "LegiScan-synced data" | Internal pipeline names; jargon |
| "no marketing, no noise" | Self-congratulatory; user didn't ask |
| "Tune your digest" | Product-y; implies optimization effort |
| "141 people" | Use "141 members" |
