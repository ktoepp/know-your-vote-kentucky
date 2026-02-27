# Wiring Guide – Thyquidity Modals

Two ways to use the modals. Pick one or combine both.

**No custom attributes in Framer** – use the modal tagger script (see below).

---

## Script load order (Head)

**Note:** Each Framer custom code block has a 5000-character limit. Scripts are minified to fit.

Add scripts in this order in Framer Site Settings > Custom Code > Head.
**Put the link intercept script as early as possible** so it intercepts before Framer opens links:

1. `exit_modal_tagger.js` (first, if using exit modal)
2. `modal_tagger.js`
3. `offramp_link_intercept.js` (if using off-ramp)
4. `hcp_link_intercept.js` (if using HCP)
5. `modal_button_handler.js` (recommended: handles Cancel/Continue via event delegation, no overrides needed)

Configure each to run on every page, every page visit.

### Option: Script-based buttons (recommended for cross-browser)

`modal_button_handler.js` uses event delegation: it listens for clicks on the document and handles Cancel/Continue when the click is inside a tagged modal. No Framer overrides required. Works across browsers and platforms. Buttons must have `data-framer-name="Cancel"` or `data-framer-name="Default"` (Continue).

---

## Modal tagger (required for Path A)


1. Add `modal_tagger.js` to Head (first, before offramp/hcp scripts)
2. Publish and open your site in a browser
3. Right-click the off-ramp modal Frame → Inspect
4. In DevTools, copy the element's class (e.g. `framer-A1B2C3d4`)
5. Open `modal_tagger.js` and replace `CHANGE_ME_OFFRAMP` with that class fragment (e.g. `A1B2C3`)
6. Repeat for HCP modal: replace `CHANGE_ME_HCP`
7. **One modal for both?** Use the same class in both SELECTORS (offramp and hcp). Wire Cancel/Continue with `CancelDismissOfframpOrHcp` and `ConfirmOfframpOrHcp`.

---

## Path A: Link intercept (scripts show modals automatically)

Use when: User clicks a **link** and you want to intercept before navigation.

### Off-ramp (outbound links)

1. **Create the modal**
   - Add a Frame for the off-ramp modal
   - Tagger script will add `data-offramp-modal` – no custom attributes needed
   - Style the modal; add Cancel and Continue buttons
   - **Overlay on every page** – Add the overlay to the layout that wraps all pages. If only on home, /hcp uses the fallback modal.
   - Set the modal to **hidden by default**: Opacity 0, or Display None, or a variant that’s invisible

2. **Wire the buttons**
   - Select the **Cancel** button → Code Overrides → attach `CancelDismissOfframp`
   - Select the **Continue** button → Code Overrides → attach `ConfirmOfframp`

3. **Add scripts to Head** (in order: tagger first, then intercept)
   - `modal_tagger.js`
   - `offramp_link_intercept.js`
   - Run on every page, every visit

4. **How it works**
   - User clicks any link to another domain
   - Script intercepts, stores the URL, shows the modal
   - Continue → navigates to the stored URL
   - Cancel → hides modal, stays on page

---

### HCP switch (patient → HCP links)

1. **Create the modal**
   - Add a Frame for the HCP modal
   - Add Cancel and Continue buttons
   - Set modal to **hidden by default**
   - Tagger adds `data-hcp-modal` – no custom attributes needed

2. **Wire the buttons**
   - Cancel button → override `CancelDismissHcp`
   - Continue button → override `ConfirmHcp`

3. **Add scripts**
   - `modal_tagger.js` (with HCP class set in SELECTORS.hcp)
   - `hcp_link_intercept.js`

4. **How it works**
   - User is on a patient page (e.g. `/`, `/about`) and clicks a link to `/hcp` or `/hcp/...`
   - Script intercepts, stores URL, shows HCP modal
   - Continue → navigates to HCP
   - Cancel → hides modal, stays on page

---

## Path B: Nav item click opens overlay (Framer interaction)

Use when: User clicks a **nav item** and a Framer interaction opens the overlay.

1. **Create the overlay/modal**
   - Add a Frame for the overlay
   - Add `CenterModal` override to the overlay Frame
   - Add Cancel and Continue buttons inside

2. **Set variables on the modal Frame**
   - Path B needs `data-cancel-destination` and `data-continue-url` on the modal
   - Since Framer doesn't allow custom attributes: use the **modal tagger** and add logic to set these when the nav item is clicked, or use **Path A** (link intercept) instead

3. **Wire the buttons**
   - Cancel button → override `CancelToVariable`
   - Continue button → override `ContinueToVariable`

4. **Set up the nav → overlay interaction**
   - Select the nav item
   - Add interaction: On tap → Open overlay (your modal component)
   - If each nav item opens a different modal/variant, set the data attributes on each modal

5. **Per-nav-item variables**
   - If you have one modal and multiple nav items, you need different data per click:
     - Option A: Duplicate the modal for each nav item and set different `data-continue-url` etc. on each
     - Option B: Use Framer Variables and bind them to the modal’s data attributes (if supported)
     - Option C: Use link intercept instead (Path A) so the script sets the URL

---

## Quick reference

| Override           | Use on          | When                         |
|--------------------|-----------------|------------------------------|
| `CenterModal`      | Modal Frame     | Always (centers modal)       |
| `CancelToVariable` | Cancel button   | Path B (variable flow)       |
| `ContinueToVariable` | Continue button | Path B (variable flow)       |
| `CancelDismissOfframp` | Cancel button | Path A (off-ramp)            |
| `ConfirmOfframp`  | Continue button | Path A (off-ramp)            |
| `CancelDismissHcp` | Cancel button   | Path A (HCP)                 |
| `ConfirmHcp`      | Continue button | Path A (HCP)                 |
| `CancelDismissOfframpOrHcp` | Cancel button | One modal for both |
| `ConfirmOfframpOrHcp` | Continue button | One modal for both |
| `CancelDismiss`    | Cancel button   | Exit modal (legacy)          |

---

## No custom attributes in Framer?

Use `modal_tagger.js` – it finds modals by their Framer-generated class (from DevTools) and injects the data attributes. No UI changes needed in Framer.

---

## HCP modal not working?

1. **One modal for both offramp and HCP?** Use `ConfirmOfframpOrHcp` and `CancelDismissOfframpOrHcp` on the Continue/Cancel buttons. Using `ConfirmOfframp` alone will not navigate when the HCP intercept triggers.

2. **Different HCP path?** If your HCP area uses `/healthcare` (or another path), edit `hcp_link_intercept.js`: add it to the `HCP_PATHS` array at the top.

3. **Modal not found?** Ensure `modal_tagger.js` has the correct class for the HCP modal (`CHANGE_ME_HCP` replaced). Or use the same modal class for both offramp and HCP if you have one shared modal.

