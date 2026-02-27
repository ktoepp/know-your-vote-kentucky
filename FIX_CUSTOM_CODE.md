# Fix Framer Custom Code

## Problem Found

The **first block** (offramp debug 1) has `link_intercept.js` content instead of `link_intercept_1a.js`. That causes:
- `[thyq] part2: part1 not found` - part2 can't find `window._thyq`
- Triggers (About Oliva) don't work because part2 never boots

## Correct Setup

**Block 1 (offramp debug 1):** Paste `link_intercept_1a.js` - NOT link_intercept.js

**Block 2 (offramp debug 2):** Paste `link_intercept_1b.js`

**Block 3 (offramp debug 3):** Paste `link_intercept_1c.js`

**Block 4 (offramp debug 4):** Paste `link_intercept_2.js`

**Keep:** Modal Tagger, Modal Button Handler

**Remove/disable:** Offramp Link Intercept, Offramp Link Intercept (single file)

## Script Order (End of head)

1. offramp debug 1 (link_intercept_1a.js)
2. offramp debug 2 (link_intercept_1b.js)
3. offramp debug 3 (link_intercept_1c.js)
4. offramp debug 4 (link_intercept_2.js)
3. Modal Tagger
4. Modal Button Handler

## Double Navigation Fix

When Continue opens a new tab but the current tab also navigates: **Remove the Link property from the Continue button** in Framer. The modal button handler and thyquidityConfirmOfframp handle navigation. The Link is redundant and causes the current tab to navigate.
