/**
 * Modal Button Handler - inject into <head> (after modal_tagger, offramp, hcp scripts)
 * Run on every page, every page visit.
 *
 * Uses event delegation to handle Cancel/Continue clicks in thyquidity modals.
 * Cross-platform, cross-browser: no Framer overrides required.
 * Uses capture phase for click and pointerdown so modal handlers run first.
 *
 * Buttons: data-thyquidity-cancel | data-thyquidity-confirm (added by modal_tagger)
 *         or data-framer-name="Cancel" | "Default"
 * Modals: data-offramp-modal | data-hcp-modal (added by modal_tagger)
 */
;(function () {
  "use strict"

  function handleModalClick(e) {
    var target = e.target
    if (!target) return
    if (typeof target.closest !== "function") return

    var btn =
      target.closest("[data-thyquidity-cancel], [data-thyquidity-confirm]") ||
      target.closest("[data-framer-name='Cancel']") ||
      target.closest("[data-framer-name='Default']")
    if (!btn) return

    var isCancel =
      btn.getAttribute("data-thyquidity-cancel") === "true" ||
      btn.getAttribute("data-framer-name") === "Cancel"
    var isConfirm =
      btn.getAttribute("data-thyquidity-confirm") === "true" ||
      btn.getAttribute("data-framer-name") === "Default"
    if (!isCancel && !isConfirm) return

    var modal = btn.closest("[data-offramp-modal], [data-hcp-modal]")
    if (!modal) {
      var p = btn
      while (p && p !== document.body) {
        var s = window.getComputedStyle(p)
        if (s.position === "fixed") { modal = p; break }
        p = p.parentElement
      }
    }
    if (!modal) return

    if (!isCancel) {
      var link = btn.tagName === "A" ? btn : btn.closest("a")
      if (link && link.href) { link.removeAttribute("href"); link.removeAttribute("target") }
    }
    e.preventDefault()
    e.stopPropagation()
    if (e.stopImmediatePropagation) e.stopImmediatePropagation()

    var w = window
    var hasHcp = w.sessionStorage.getItem("thyquidity_pending_hcp_url")
    var hasOfframp = w.sessionStorage.getItem("thyquidity_pending_offramp_url")

    if (isCancel) {
      if (hasHcp && w.thyquidityCancelHcp) w.thyquidityCancelHcp(modal)
      else if (hasOfframp && w.thyquidityCancelOfframp) w.thyquidityCancelOfframp(modal)
      else if (modal.hasAttribute("data-hcp-modal") && w.thyquidityCancelHcp) w.thyquidityCancelHcp(modal)
      else if (modal.hasAttribute("data-offramp-modal") && w.thyquidityCancelOfframp) w.thyquidityCancelOfframp(modal)
    } else {
      if (hasHcp && w.thyquidityConfirmHcp) w.thyquidityConfirmHcp(modal)
      else if (hasOfframp && w.thyquidityConfirmOfframp) w.thyquidityConfirmOfframp(modal)
      else if (modal.hasAttribute("data-hcp-modal") && w.thyquidityConfirmHcp) w.thyquidityConfirmHcp(modal)
      else if (modal.hasAttribute("data-offramp-modal") && w.thyquidityConfirmOfframp) w.thyquidityConfirmOfframp(modal)
    }
  }

  function stripLinkHref(e) {
    var target = e.target
    if (!target || typeof target.closest !== "function") return
    var btn = target.closest("[data-thyquidity-confirm], [data-framer-name='Default']")
    if (!btn) return
    var link = btn.tagName === "A" ? btn : btn.closest("a")
    if (link && link.href) { link.removeAttribute("href"); link.removeAttribute("target") }
  }
  function init() {
    document.addEventListener("pointerdown", stripLinkHref, true)
    document.addEventListener("click", handleModalClick, true)
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})()
