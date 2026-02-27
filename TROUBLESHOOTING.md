# Browser Troubleshooting

## Issues Found on Live Site

### 1. Remove Overrides from Custom Code (Critical)

The **eOWRoSTGG** snippet contains `thyquidity_overrides.tsx` / `center_popup` TypeScript code pasted into a `<script>` tag. That causes a syntax error – `export` and TS/React code are not valid in a raw script.

**Fix:** Remove that Custom Code block. Code Overrides belong in **Framer Assets** (for component overrides), not in Site Settings > Custom Code.

---

### 2. Duplicate Link Intercept Scripts

You have **both**:

- `link_intercept_1a.js` + `link_intercept_1b.js` + `link_intercept_1c.js` + `link_intercept_2.js` (trigger flow)
- `link_intercept.js` (links-only, single block)

**Fix:** Use one or the other:

- **Triggers (nav overlay):** Use only `link_intercept_1a.js` + `link_intercept_1b.js` + `link_intercept_1c.js` + `link_intercept_2.js`
- **Links only:** Use only `link_intercept.js`

Having both can cause conflicts and overwritten handlers.

---

### 3. Console Checks

1. Open DevTools (F12 or Cmd+Option+I) > Console
2. On load, look for:
   - `[thyq] init part1...` – part1 loaded
   - `[thyq] init part2` – part2 loaded (if using split scripts)
   - Any red errors (especially from the overrides snippet)

3. When clicking a link or trigger:
   - `[thyq] offramp SHOW` or `[thyq] HCP modal SHOW` – intercept working
   - `[thyq] trigger store` – trigger stored URL (split scripts only)
   - `[thyq] ConfirmOfframp` – Continue clicked

4. Run in console:
   ```js
   // Check handlers
   typeof window.thyquidityConfirmOfframp  // should be "function"
   typeof window.thyquidityCancelOfframp   // should be "function"

   // Check sessionStorage (before clicking Continue)
   sessionStorage.getItem("thyquidity_pending_offramp_url")

   // Check modal in DOM
   document.querySelector("[data-offramp-modal]")
   ```

---

### 4. Offramp Popup Not Showing

If you see `[thyq] Offramp modal not found` in the console when clicking an external link, the modal is not in the DOM or has no `data-offramp-modal`.

**Fix A (recommended):** Add the `OfframpModalTag` or `CenterModalOfframp` override to the **modal Frame** in Framer (the overlay content, not the trigger). This sets `data-offramp-modal` when the component renders. No class changes needed.

**Fix B:** Update `modal_tagger.js` with the correct Framer class. Inspect the modal overlay in DevTools when it is open, find the Frame's class (e.g. `framer-v-yfbra`), and use the unique fragment (e.g. `v-yfbra`) in `modal_tagger.js`.

**Verify:** In DevTools console, run `document.querySelector("[data-offramp-modal]")` – it should return an element when the overlay exists in the DOM.

---

### 5. Modal Tagger

Tagger uses class fragments to find modals: `v-yfbra` (offramp) and `m2k2aj` (HCP). Framer may change these when you republish.

To find current classes: Inspect the modal overlay in DevTools, find the Frame's class (e.g. `framer-v-yfbra`), and use the unique fragment (e.g. `v-yfbra`) in `modal_tagger.js`.

---

### 6. Recommended Custom Code Order (Head)

1. `exit_modal_tagger.js` (if used)
2. `modal_tagger.js`
3. **Either** `link_intercept_1a.js` + `link_intercept_1b.js` + `link_intercept_1c.js` + `link_intercept_2.js` **or** `link_intercept.js` (not both)
4. `modal_button_handler.js`

Do **not** add the overrides/center_popup file to Custom Code.
