# Email voice and tone — Know Your Vote Kentucky

## Principles

**Neutral and informational.** KYVKY is a civic reference tool, not a product. Emails should read like a reliable update from a government tracking service, not a startup. No enthusiasm, no promises, no adjectives that characterize the product positively.

**State facts, not feelings.** Write what happened or what the user can do. Avoid language that describes how the user will feel about it ("stay informed," "never miss a vote").

**Device-neutral.** Use "select" instead of "tap," "click," or "press." Users open email on phones, tablets, and desktops.

**No internal system names.** Users do not need to know what data source powers the site. "LegiScan," database names, and API references belong in developer docs, not user-facing copy.

**One idea per sentence.** Short lines. No run-ons.

**CTAs describe the destination.** "Browse bills →" not "Start following bills today →."

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
> CTA: District map →

**Card: Set digest preferences**
> Choose daily or weekly delivery, select which event types to include, and follow topics by subject area — bills in that area will be matched automatically.
> CTA: Notification preferences →

**Footer:**
> This is a one-time setup email. Manage your account at {profileUrl}.

---

### 2. Bill digest email

Sent daily or weekly based on user preference, only when there are events to report.

**Subject:** `Kentucky bill digest — {date}` (e.g., `Kentucky bill digest — May 13, 2026`)

**Preview text:** `{n} bill(s) with new activity`

**Heading:** `Kentucky bill digest`

**Subheading:** `Status updates for bills and topics you follow.`

**Overflow line (when events are capped):**
> {n} additional update(s) not shown — [view all followed bills].

**Footer:**
> [Stop receiving these digests]

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
- Body: `This unsubscribe link is not valid. If you received it in an email, try selecting the link again or contact us at hello@kyvky.com.`

**Server error (500):**
- Title: `Something went wrong`
- Body: `Your preference could not be saved. Please try again, or update your digest settings from your profile page.`

---

## What to avoid

| Avoid | Reason |
|---|---|
| "Stay informed" | Characterizes the product's value; implies urgency |
| "Never miss a vote" | Aspirational; implies urgency |
| "We've got you covered" | Casual and promotional |
| "Tap" / "click" | Device-specific |
| "LegiScan-synced data" | Internal system name; jargon |
| "no marketing, no noise" | Self-congratulatory; user didn't ask |
| "Tune your digest" | Product-y/informal; "tune" implies optimization effort |
| "KY bill digest" | Abbreviation inconsistent with full site name |
