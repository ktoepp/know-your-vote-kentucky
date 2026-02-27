/**
 * Off-ramp Link Intercept - inject into <head>
 * Run on every page, every page visit.
 * Intercepts clicks on outbound links (different domain) and shows confirmation modal.
 * Triggers every time - no session/local storage.
 */
;(function () {
  const PENDING_KEY = "thyquidity_pending_offramp_url"
  const OFFRAMP_MODAL_SELECTOR = "[data-offramp-modal], #offramp-modal"

  function getOrigin(href) {
    try {
      return new URL(href, window.location.origin).origin
    } catch {
      return null
    }
  }

  function isOutbound(href) {
    if (!href || href.startsWith("#") || href.startsWith("javascript:")) return false
    const targetOrigin = getOrigin(href)
    return targetOrigin && targetOrigin !== window.location.origin
  }

  function showOfframpModal(url) {
    sessionStorage.setItem(PENDING_KEY, url)
    var modal = document.querySelector(OFFRAMP_MODAL_SELECTOR)
    if (modal) {
      var el = modal.parentElement
      while (el && el !== document.body) {
        var s = window.getComputedStyle(el)
        if (s.position === "fixed") {
          el.style.display = "flex"
          el.style.visibility = "visible"
          el.style.pointerEvents = "auto"
        }
        el = el.parentElement
      }
      modal.style.display = "flex"
      modal.style.visibility = "visible"
      modal.style.opacity = "1"
      modal.style.pointerEvents = "auto"
    }
  }

  function hideOfframpModal() {
    var modal = document.querySelector(OFFRAMP_MODAL_SELECTOR)
    if (modal) {
      modal.style.display = "none"
      modal.style.visibility = "hidden"
      modal.style.pointerEvents = "none"
      var el = modal.parentElement
      while (el && el !== document.body) {
        var s = window.getComputedStyle(el)
        if (s.position === "fixed") {
          el.style.display = "none"
          el.style.pointerEvents = "none"
        }
        el = el.parentElement
      }
    }
  }

  window.thyquidityConfirmOfframp = function () {
    var url = sessionStorage.getItem(PENDING_KEY)
    var newTab = sessionStorage.getItem(PENDING_KEY + "_newtab")
    sessionStorage.removeItem(PENDING_KEY)
    sessionStorage.removeItem(PENDING_KEY + "_newtab")
    hideOfframpModal()
    if (url) {
      if (newTab === "true") {
        window.open(url, "_blank", "noopener,noreferrer")
      } else {
        window.location.href = url
      }
    }
  }

  window.thyquidityCancelOfframp = function () {
    sessionStorage.removeItem(PENDING_KEY)
    sessionStorage.removeItem(PENDING_KEY + "_newtab")
    hideOfframpModal()
  }

  function resolveUrl(href, baseEl) {
    try {
      return new URL(href, window.location.origin).href
    } catch (_) {
      return href
    }
  }

  function getOutboundLinkFromClick(e) {
    var el = e.target
    while (el && el !== document.body) {
      var href = (el.getAttribute && el.getAttribute("href")) || (el.getAttribute && el.getAttribute("data-href"))
      if (el.href) href = href || el.href
      if (href && isOutbound(href)) {
        var link = el.tagName === "A" ? el : (el.closest && el.closest("a[href]"))
        var newTab = link && (link.target === "_blank" || (link.getAttribute && link.getAttribute("target") === "_blank"))
        return { url: el.href ? el.href : resolveUrl(href, el), newTab: !!newTab }
      }
      el = el.parentElement
    }
    var anchor = e.target && e.target.closest && e.target.closest("a[href]")
    if (anchor) {
      var h = anchor.getAttribute("href") || anchor.href
      if (isOutbound(h)) {
        var newTab = anchor.target === "_blank" || (anchor.getAttribute && anchor.getAttribute("target") === "_blank")
        return { url: anchor.href, newTab: newTab }
      }
    }
    return null
  }

  function handleIntercept(e) {
    var result = getOutboundLinkFromClick(e)
    if (!result) return
    e.preventDefault()
    e.stopPropagation()
    if (e.stopImmediatePropagation) e.stopImmediatePropagation()
    sessionStorage.setItem(PENDING_KEY + "_newtab", result.newTab ? "true" : "false")
    showOfframpModal(result.url)
  }

  function init() {
    document.addEventListener("mousedown", handleIntercept, true)
    document.addEventListener("pointerdown", handleIntercept, true)
    document.addEventListener("click", handleIntercept, true)
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init)
  } else {
    init()
  }
})()
