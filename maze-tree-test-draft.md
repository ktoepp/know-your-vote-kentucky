# Maze Tree Test Draft
**Know Your Vote Kentucky — Navigation Discovery**
**Audience:** General Kentucky residents (limited prior knowledge of state legislation)
**Test type:** Tree test
**Goal:** Validate (or discover) the best top-level navigation structure before building

---

## Proposed Tree Structure

Enter this into Maze's tree builder. Each indented level is a child node.

```
Bills
  Search bills
  Browse by topic
    Education
    Healthcare
    Taxes & budget
    Criminal justice
    Environment
    Housing
    Other
  Browse by status
    In committee
    Passed House
    Passed Senate
    Signed into law
    Vetoed
  Current session
  Recent activity

Legislators
  Find my representative
  House members
  Senate members
  Search by name

Districts
  Find my district
  House districts
  Senate districts

My Tracking
  Bills I'm following
  Legislators I'm following
  Notification settings

Learn
  How the KY legislature works
  Glossary of terms
  About Know Your Vote KY
  FAQ
```

---

## Tasks (3–5, pick what fits your session length)

### Task 1
**Prompt:**
> You want to find all bills related to education that are currently being considered in Kentucky. Where would you go?

**Expected path:** Bills → Browse by topic → Education
**What you're testing:** Whether users look under "Bills" and whether "Browse by topic" is intuitive vs. something like "Search."

---

### Task 2
**Prompt:**
> You want to find out who represents you in the Kentucky state legislature. Where would you go?

**Expected path:** Legislators → Find my representative  *(or)* Districts → Find my district
**What you're testing:** Whether users associate this task with "Legislators" or "Districts" — this split is useful data for deciding whether to merge or separate these sections.

---

### Task 3
**Prompt:**
> You heard about a bill that could change how Kentucky handles school funding, and you want to follow its progress. Where would you start?

**Expected path:** Bills → Search bills *(or)* Bills → Browse by topic → Education
**What you're testing:** Search vs. browse behavior for tracking a specific bill.

---

### Task 4
**Prompt:**
> You want to get an alert when a bill you care about moves forward. Where would you go?

**Expected path:** My Tracking → Notification settings
**What you're testing:** Whether "My Tracking" as a label is clear, or if users look elsewhere (e.g., under a specific bill or under account settings).

---

### Task 5
**Prompt:**
> You're not sure what "in committee" means and want to understand how Kentucky's legislature actually works. Where would you go?

**Expected path:** Learn → How the KY legislature works *(or)* Learn → Glossary of terms
**What you're testing:** Whether a "Learn" section feels appropriate and findable, vs. users expecting this content to live elsewhere.

---

## Setup Notes for Maze

- **Introduction message:** "We're building a free tool to help Kentucky residents track state bills and legislators. We'd love your help figuring out how to organize it. This is a test of a site structure — there are no wrong answers."
- **Completion message:** "Thank you! Your feedback directly shapes how this tool is built."
- **Recommended respondents:** 20–30 for reliable tree test data
- **Recruit tip:** Post in Kentucky-focused Facebook groups, Reddit (r/Kentucky), or local NextDoor communities for general resident reach

---

## What to Look For in Results

- **Directness score** — Did users go straight to the right place, or did they backtrack?
- **First-click data** — Which top-level section do people click first for each task?
- **Task 2 split** — If users are split between Legislators and Districts, consider merging into one section or adding cross-links
- **Task 4 results** — If users struggle, "My Tracking" may need a clearer label (e.g., "My Bills" or "Following")
