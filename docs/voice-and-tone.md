# Voice and tone — Know Your Vote Kentucky

This guide governs **all user-facing copy** — the site, emails, and any future surface. It started as an email-only guide; it now applies everywhere so the product reads as one voice.

## Who we are

Know Your Vote Kentucky (KYvKY) is a free, independent, non-partisan civic reference for Kentucky residents. The voice should signal three things at all times: **trustworthy, neutral, and accessible.** We are closer to a reliable government tracking service than to a startup.

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

**Brand stylization.** **KYvKY**, lowercase v, everywhere the short form appears: user-facing copy, code comments, internal audit output, and docs. `structured-data.ts` (`alternateName`) and `llms.txt` already declared it, but the all-caps form had spread to four user-facing strings and ~33 other places; all were converted 2026-08-22. The only intentional exceptions are the `KYVKY_POSTAL_ADDRESS` constant (an identifier, not prose) and historical `decisions.md` / `TASKS.md` entries, which are append-only records. Full name "Know Your Vote Kentucky" on first use in a formal context; the short form is fine thereafter.

**No em dashes and no semicolons.** Em dashes were Katie's call, 2026-08-22. Semicolons were added 2026-08-23 for the same reason: both now read as AI-generated writing, and screeners are being trained on them as a tell. Use a colon when the second half explains the first ("when it moves: committee action, floor votes"), a comma for a light aside ("LegiScan, synced daily during session"), or a full stop when the clause can stand alone ("We send factual updates only. No AI-generated summaries in digest emails."). For a list whose items already contain commas, prefer restructuring or a colon over a semicolon.

**Swept sitewide 2026-08-23.** Every externally visible surface is clear: all public pages and guides, page titles and meta descriptions, JSON-LD, the glossary and tooltip definitions, the bill digest and welcome emails, `llms.txt`, and the publicly linked design-system reference. The AI bill-summary system prompt in `ky-content-generation.ts` now carries the rule too, so newly generated summaries comply at the source. Deliberately **out of scope**: source-code comments, operator-only surfaces (`/admin`), internal Slack alerts and sync logs, and the accuracy-audit reports. The one em dash left in `ky-content-generation.ts` is the legacy failure sentinel, kept so summaries persisted before the sweep are still recognized as failures rather than rendered as real content.

---

## Email branding

Every outbound email opens with the same header: the KYvKY wordmark, linked to the site home, rendered by `EmailBrandHeader` in `src/lib/email/brand.tsx`. Do not hand-roll a logo block in a new template; import that one so all sends stay identical.

**The asset is a PNG on purpose.** `/branding/Logo-03.png`, built into an absolute URL by `emailLogoSrc(origin)`. The newer `logo-white.svg` and `logo-wordmark-white.svg` are web-only: Gmail strips SVG, so an SVG logo means no logo for most recipients.

**The logo sits on a white plate.** The wordmark is blue artwork on transparency, so on a dark background it loses nearly all contrast, and there is no dark-mode logo variant in a format email can use. Rather than swapping assets by media query (which Gmail ignores anyway), the mark sits on an explicit white background that stays white in either theme. In light mode it reads as a quiet card; in dark mode it is what keeps the brand visible.

**Dark mode is a first-class requirement, not a nicety.** Templates carry the `kv-` classes from `EMAIL_DARK_MODE_CSS` on every element whose colour is hardcoded. Two traps, both of which shipped as real bugs before being caught in review on 2026-08-22:

1. **`<Body style={...} className="...">` does not put both on one element.** react-email renders the class onto `<body>` but pushes the inline background onto an inner `<td>`. Theming only the class recolours a layer nobody sees, leaving light text on a light surface. The `.kv-bg > table > tbody > tr > td` selector exists for this and must not be "simplified" away.
2. **React escapes `>` inside `<style>`.** A child combinator written as a text child becomes `&gt;`, which invalidates the entire selector list, including the valid selectors grouped with it. Emit email CSS with `<style dangerouslySetInnerHTML={{ __html: CSS }} />`.

When adding copy to a template, check every new style constant that hardcodes a colour has a matching `kv-` class. The founder-note heading shipped without one and was invisible in dark mode until the render was actually looked at.

There is one prefix, `kv-`, shared by every template. The digest layers five progress-meter tokens (`kv-seg`, `kv-track`, and friends) on top, defined in its own file because nothing else renders a meter, and concatenates the two strings. A new template importing `EMAIL_DARK_MODE_CSS` gets the whole base set.

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
> Select **Follow** on any bill page to track it. You will receive digest updates when it moves: committee action, floor votes, sent to governor, signed, or vetoed.
> CTA: Browse bills →

**Card: Find your legislators**
> Enter your address on the district map to see your House and Senate representatives in the current session.
> CTA: Find my legislators →

**Card: Set digest preferences**
> Choose daily or weekly delivery and select which event types to include. You can also follow topics by subject area. Tagging is automated, so following a specific bill stays the most reliable way to track it.
> CTA: Notification preferences →

**Note: A note from the founder** (added 2026-08-22). A signed note between the last card and the footer, set off by a rule rather than a card border so it reads as an aside, not a fourth feature. **This copy is Katie's own and was written by her.** Treat it as authored text: fix a typo or a factual error, but do not rewrite it toward the house register, and do not shorten it for balance.
> **Thank you for signing up!**
>
> I'm Katie Toepp, a designer and self-taught developer in Kentucky, and I believe more than anything that knowledge is power. I built KYvKY because our legislative record is public, but hard to use.
> I wanted to better understand the bills I was hearing about in the media. But I kept hitting a wall: either a paywall, or an outdated interface that assumed I already understood the legislative process. I wanted following my state's legislation to be as easy as following friends on a feed.
> KYvKY will always be free and non-partisan, and will never sell data. Right now it's a passion project, and I'm working to fund and grow it.
> Replies to this email reach me. If something on the site looks wrong, I'd like to know.
> Thanks again for using KYvKY and getting involved in the civic process.
> CTA: More about the project →

**Contractions are the point.** Katie's copy pass on 2026-08-22 accepted contractions throughout this note ("I'm," "it's," "I'd") and cut the padding that made it read formal. The rest of the product keeps its uncontracted reference register; this block does not. It is a person talking, so it contracts like one.

**The greeting is its own line, and the exclamation point is deliberate.** "Thank you for signing up!" sits on a line of its own above the body, not folded into the first paragraph. This is the one sanctioned exception to the **Warmth through anticipation, not enthusiasm** principle: the note is a person speaking, and a person thanking you for signing up sounds like one. The exception covers this greeting only. It does not license exclamation points anywhere else in the product.

"Signing up" and not "using KYvKY" in the greeting, because the email fires at verification, before the reader has used anything. The sign-off still says "using KYvKY," which is correct there: by then it is a send-off, not a claim about what they have already done.

The reply claim is literally true: every transactional send sets `Reply-To: katie@kyvky.com`. Do not add it to any surface where that stops being the case.

The funding sentence must stay in the **seeking** tense. Per the Notion wording rules, never name a sponsor or write "our fiscal sponsor" until an agreement is signed. When one is, this line changes here, on `/about`, and in the design-system specimen together.

**Footer:**
> This is a one-time setup email. Manage your account at {profileUrl}.

---

### 2. Bill digest email

Sent daily or weekly based on user preference, only when there are events to report.

**Subject:** `Kentucky bill digest, {Mon D}: {counts}` (e.g., `Kentucky bill digest, May 13: 3 bills, 2 committee updates`). The inbox column already shows the date, so the subject's variable slot carries the counts; the short date keeps each day's subject distinct so threading clients don't collapse digests. A digest with no bill sections uses `Kentucky committee digest, {Mon D}: {n} updates` — the subject never names content the email doesn't contain.

**Preview text:** describes only what the digest contains, joined with "and" when both parts are present: `{n} bill(s) with new activity` / `{n} committee update(s)` / `3 bills with new activity and 2 committee updates`.

**Header:** the shared `EmailBrandHeader` (see Email branding below).

**Heading:** matches the subject's base: `Kentucky bill digest` / `Kentucky committee digest`.

**Subheading:** generated from the sections actually present — `Status updates for {bills / topics / committees, joined with "and"} you follow.` (e.g., `Status updates for bills and committees you follow.`). Never claims a source the digest doesn't include.

**Structure — grouped by reason.** Updates are split into up to three sections so the reader sees *why* each item is included. A section is shown only when it has content:
- `Bills you follow` — bills the user follows individually.
- `Topics you follow` — bills matched by a followed topic. Each such bill is annotated with the matched topic(s): `Matches your {topic} topic` / `Matches your {topicA} and {topicB} topics` (serial "and", Oxford comma for three or more). Each topic name links to the bills browse filtered by that topic (`/bills?topic={t}`).
- `Committees you follow` — one block per committee, one line per calendar change, in a parallel colon pattern: `New meeting: {weekday, month day}, {time and location}` / `Agenda updated: …` / `Meeting cancelled: …`. Repeated updates to the same meeting are de-duplicated, and `Agenda updated` is suppressed when the same meeting's `New meeting` line is already in the digest (it would carry no new information). Committee updates have their own cap; the remainder counts toward the overflow line.

A bill the user both follows and matches by topic appears once, under `Bills you follow`.

**Event lines.** Each line states the bill's recorded action verbatim (the legislative last-action text), followed by `(recorded {Mon D})` — the date our sync observed it, deliberately date-only and labeled "recorded" because it is not the time the legislature acted. No event-category label when action text exists; when a payload has no action text, the line falls back to the event label ("Floor action", "Signed into law"), never to the bill title. Multiple lines under one bill read oldest to newest (committee blocks too). De-duplication runs before the cap so the overflow count is honest, and keys on bill + text + recorded date so distinct events sharing fallback text (three "New cosponsor" days apart) are kept.

**Links.** Each bill block is one link — the bill number (brand blue) and title (ink) share a single anchor to the bill page, so the tap target is large and the plain-text part prints each URL once. Committee names link to the committee page. All other links (overflow, glossary, footer) are brand blue and underlined.

**Overflow line (when events are capped):**
> {n} more update(s) not shown. [Your profile] lists recent activity for bills and committees you follow. Bills matching your topics are in the bill browser: [{topicA}] · [{topicB}]
> Links to the profile activity feed. Phrased carefully: the profile is named so the login prompt is unsurprising, and the sentence claims only what the feed covers (followed bills and committees — it cannot show topic-matched overflow). The topic-browser sentence appears only when topic-matched updates were actually cut, and links each affected topic to `/bills?topic={t}` — the closest destination for them (note: the browse filters by KY topic tag only, while digest matching also uses LegiScan subjects, so coverage overlaps but is not identical).

**Footer:**
> You're getting this because you follow bills, topics, or committees on Know Your Vote Kentucky.
> Bill status lines quote the legislature's official action text where available. The [glossary] explains the terms. Dates in parentheses show when Know Your Vote Kentucky recorded each update, which can lag the action itself.
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

## First person: when the project speaks as a person

Most copy is the project speaking, and the project says **"we"** — or, better, nothing at all ("Topic tags are automated," not "we automate topic tags"). Two places are deliberate exceptions, both added 2026-08-22:

- the **"Who builds it"** section on `/about`
- the **"A note from the founder"** note in the welcome email

In those two blocks the voice is Katie's, first person singular. They exist because a solo, unfunded, non-partisan civic tool has to answer *who is behind this and what do they want* before a stranger will trust it — and answering plainly is the same Honest sourcing move as admitting that topic tags mislabel bills.

Rules for the personal register:

**Claims stay checkable.** Every sentence is something a skeptical reader could verify: solo build, running since February 2026, free, no advertising, no data sold, open source, roughly $1,000 a year in infrastructure. Nothing about impact, importance, or how anyone should feel.

**Never claim effect.** No causal claims about turnout, participation, or legislative outcomes — that is a non-partisanship risk before it is an accuracy one.

**Money is stated the way it is true.** "Infrastructure costs about $1,000 a year; the work behind it has been contributed rather than paid." Never "the project runs on $1,000 a year" — that quietly prices the labor at zero.

**The AI-build disclosure is soft, not a headline.** "Directing AI tools along the way" — a clause inside a sentence about building the thing. "Vibe-coded" is fine in a press conversation and wrong on the site.

**Note the funding, do not make the ask.** *Settled 2026-08-22, Katie's call, after two passes.* This guide first banned funding language from product copy; that was overruled, then narrowed. The landing point: product copy may **state the funding situation** and may not **solicit**. "Right now it is a passion project, and I am working to fund and grow it" is a status note a reader can take or leave. "I am currently seeking sponsorship for grant funding that will add expertise and make the project scalable and sustainable" reads as a pitch and was pulled for that reason, even though every word of it was true. The distinction is whether the sentence asks the reader for something. Solicitation, sponsor names, dollar targets, and donate links live in outreach, not in the product. When a sponsor is signed, revisit this line here, on `/about`, and in the design-system specimen together.

**Motive is stated once, plainly, and never repeated.** "I built the tool I wanted to have." No origin-story escalation.

**Still no partisanship, and still no editorializing about legislation.** The personal register loosens the *distance*, not the neutrality. "Kentucky's legislative record is public and still hard to use" describes the artifact. Anything about who made it hard would be a position.

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
