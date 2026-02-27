import { Override } from "framer"

/**
 * Single path: apply to TRIGGERS that open overlays. Sets data-offramp-url so our
 * script stores the URL when the trigger is clicked (before overlay opens).
 *
 * Bind: url <- clickthrough variable, newTab <- new tab variable.
 * Require: Framer interaction "On tap -> Open overlay" on the same element.
 */
export function OfframpTriggerVariables(args: { url?: string | null; newTab?: boolean }): Override {
    const url = (args?.url ?? "") as string
    const newTab = args?.newTab ? "true" : "false"
    return { "data-offramp-url": url, "data-offramp-newtab": newTab } as Override
}

export function HcpTriggerVariables(args: { url?: string | null }): Override {
    const url = (args?.url ?? "") as string
    return { "data-hcp-url": url } as Override
}

export function CenterModal(): Override {
    return {
        style: {
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 999999,
            pointerEvents: "auto",
        },
    }
}

/**
 * CenterModal + OfframpModalVariables in one override (Framer allows one override per component).
 * Use on the modal Frame. Bind: url <- Clickthrough, newTab <- New Tab.
 */
export function CenterModalOfframp(args: { url?: string | null; newTab?: boolean }): Override {
    const url = (args?.url ?? "") as string
    const newTab = args?.newTab ? "true" : "false"
    return {
        style: {
            position: "fixed",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 999999,
            pointerEvents: "auto",
        },
        "data-offramp-modal": "true",
        "data-continue-url": url,
        "data-continue-newtab": newTab,
    } as Override
}

/**
 * Add to overlay modals that the tagger might miss (e.g. different Framer class).
 * Ensures data-offramp-modal so modal_button_handler finds Cancel/Continue.
 */
export function OfframpModalTag(): Override {
    return { "data-offramp-modal": "true" } as Override
}

/**
 * For the Offramp MODAL: syncs Clickthrough and New Tab to data attributes.
 * Use when the modal (not the trigger) has the variables - handler reads these
 * when sessionStorage is empty.
 * Add to the modal Frame. Bind: url <- Clickthrough, newTab <- New Tab.
 */
export function OfframpModalVariables(args: { url?: string | null; newTab?: boolean }): Override {
    const url = (args?.url ?? "") as string
    const newTab = args?.newTab ? "true" : "false"
    return {
        "data-offramp-modal": "true",
        "data-continue-url": url,
        "data-continue-newtab": newTab,
    } as Override
}

/**
 * Cancel: reads variable from parent modal.
 * data-cancel-destination: "back" = history.back() | "stay" = close modal, stay on page | URL = navigate there
 *
 * When target has data-offramp-modal or data-hcp-modal, also clears sessionStorage via thyquidity
 * handlers to avoid stale URL conflicts (prevents wrong-override misuse).
 */
export function CancelToVariable(): Override {
    return {
        onTap: (e: { target?: HTMLElement; currentTarget?: HTMLElement }) => {
            const btn = (e?.currentTarget ?? e?.target) as HTMLElement
            const modal = btn?.closest?.("[data-exit-modal], [data-offramp-modal], [data-hcp-modal], [data-cancel-destination]") as HTMLElement
            const fallbackModal = document.querySelector("[data-exit-modal='true']") as HTMLElement
            const target = modal || fallbackModal

            if (target) target.style.display = "none"

            // Clear Path A sessionStorage if this is an offramp/HCP modal (prevents stale URL)
            // Shared modal: check sessionStorage priority (HCP first, then offramp)
            if (typeof window !== "undefined" && target) {
                const w = window as any
                const isPathAModal = target.hasAttribute("data-hcp-modal") || target.hasAttribute("data-offramp-modal")
                if (isPathAModal) {
                    if (w.thyquidityCancelHcp && sessionStorage.getItem("thyquidity_pending_hcp_url")) {
                        w.thyquidityCancelHcp()
                        return
                    }
                    if (w.thyquidityCancelOfframp && sessionStorage.getItem("thyquidity_pending_offramp_url")) {
                        w.thyquidityCancelOfframp()
                        return
                    }
                }
            }

            const dest = target?.getAttribute("data-cancel-destination")
            if (dest === "back") {
                window.history.back()
            } else if (dest && (dest.startsWith("/") || dest.startsWith("http"))) {
                window.location.href = dest
            }
        },
    }
}

/**
 * Continue: reads variable from parent modal.
 * data-continue-url: destination URL
 * data-continue-newtab: "true" | "false" (default false)
 *
 * When target has data-offramp-modal or data-hcp-modal, delegates to thyquidity handlers
 * to use sessionStorage URL (prevents wrong-override misuse).
 */
export function ContinueToVariable(): Override {
    return {
        onTap: (e: { target?: HTMLElement; currentTarget?: HTMLElement }) => {
            const btn = (e?.currentTarget ?? e?.target) as HTMLElement
            const modal = btn?.closest?.("[data-exit-modal], [data-offramp-modal], [data-hcp-modal], [data-continue-url]") as HTMLElement
            const fallbackModal = document.querySelector("[data-exit-modal='true']") as HTMLElement
            const target = modal || fallbackModal

            if (!target) return

            // Delegate to Path A handlers if this is offramp/HCP modal (prevents stale/wrong URL)
            // Shared modal: check sessionStorage priority (HCP first, then offramp)
            if (typeof window !== "undefined" && target) {
                const w = window as any
                const isPathAModal = target.hasAttribute("data-hcp-modal") || target.hasAttribute("data-offramp-modal")
                if (isPathAModal) {
                    if (w.thyquidityConfirmHcp && sessionStorage.getItem("thyquidity_pending_hcp_url")) {
                        w.thyquidityConfirmHcp()
                        return
                    }
                    if (w.thyquidityConfirmOfframp && sessionStorage.getItem("thyquidity_pending_offramp_url")) {
                        w.thyquidityConfirmOfframp()
                        return
                    }
                }
            }

            const url = target.getAttribute("data-continue-url")
            const newTab = target.getAttribute("data-continue-newtab") === "true"

            if (target) target.style.display = "none"

            if (url) {
                if (newTab) {
                    window.open(url, "_blank", "noopener,noreferrer")
                } else {
                    window.location.href = url
                }
            }
        },
    }
}

/** For offramp_link_intercept.js: Confirm button calls thyquidityConfirmOfframp */
export function ConfirmOfframp(): Override {
    const handler = (e?: { target?: EventTarget }) => {
        if (typeof window === "undefined" || !(window as any).thyquidityConfirmOfframp) return
        const target = (e as any)?.target
        const modal =
            (target && typeof (target as Element).closest === "function" && (target as Element).closest("[data-offramp-modal]")) ||
            document.querySelector("[data-offramp-modal], #offramp-modal")
        ;(window as any).thyquidityConfirmOfframp(modal)
    }
    return {
        onTap: () => handler(),
        onClick: (e: { preventDefault?: () => void; stopPropagation?: () => void; target?: EventTarget }) => {
            e?.preventDefault?.()
            e?.stopPropagation?.()
            handler(e)
        },
    }
}

/** For offramp_link_intercept.js: Cancel button calls thyquidityCancelOfframp */
export function CancelDismissOfframp(): Override {
    const handler = () => {
        if (typeof window !== "undefined" && (window as any).thyquidityCancelOfframp) {
            ;(window as any).thyquidityCancelOfframp()
        }
    }
    return {
        onTap: handler,
        onClick: (e: { preventDefault?: () => void; stopPropagation?: () => void }) => {
            e?.preventDefault?.()
            e?.stopPropagation?.()
            handler()
        },
    }
}

/** Unified: cancels offramp or HCP based on what triggered the modal (use when one modal serves both) */
export function CancelDismissOfframpOrHcp(): Override {
    const handler = () => {
        if (typeof window === "undefined") return
        const w = window as any
        if (w.thyquidityCancelHcp && sessionStorage.getItem("thyquidity_pending_hcp_url")) {
            w.thyquidityCancelHcp()
        } else if (w.thyquidityCancelOfframp && sessionStorage.getItem("thyquidity_pending_offramp_url")) {
            w.thyquidityCancelOfframp()
        }
    }
    return {
        onTap: handler,
        onClick: (e: { preventDefault?: () => void; stopPropagation?: () => void }) => {
            e?.preventDefault?.()
            e?.stopPropagation?.()
            handler()
        },
    }
}

/** Unified: confirms offramp or HCP based on what triggered the modal (use when one modal serves both) */
export function ConfirmOfframpOrHcp(): Override {
    const handler = () => {
        if (typeof window === "undefined") return
        const w = window as any
        if (w.thyquidityConfirmHcp && sessionStorage.getItem("thyquidity_pending_hcp_url")) {
            w.thyquidityConfirmHcp()
        } else if (w.thyquidityConfirmOfframp && sessionStorage.getItem("thyquidity_pending_offramp_url")) {
            w.thyquidityConfirmOfframp()
        }
    }
    return {
        onTap: handler,
        onClick: (e: { preventDefault?: () => void; stopPropagation?: () => void }) => {
            e?.preventDefault?.()
            e?.stopPropagation?.()
            handler()
        },
    }
}

/** For hcp_link_intercept.js: Confirm button calls thyquidityConfirmHcp */
export function ConfirmHcp(): Override {
    const handler = () => {
        if (typeof window !== "undefined" && (window as any).thyquidityConfirmHcp) {
            ;(window as any).thyquidityConfirmHcp()
        }
    }
    return {
        onTap: handler,
        onClick: (e: { preventDefault?: () => void; stopPropagation?: () => void }) => {
            e?.preventDefault?.()
            e?.stopPropagation?.()
            handler()
        },
    }
}

/** For hcp_link_intercept.js: Cancel button calls thyquidityCancelHcp */
export function CancelDismissHcp(): Override {
    const handler = () => {
        if (typeof window !== "undefined" && (window as any).thyquidityCancelHcp) {
            ;(window as any).thyquidityCancelHcp()
        }
    }
    return {
        onTap: handler,
        onClick: (e: { preventDefault?: () => void; stopPropagation?: () => void }) => {
            e?.preventDefault?.()
            e?.stopPropagation?.()
            handler()
        },
    }
}

/** Legacy: hide modal with [data-exit-modal='true'] */
export function CancelDismiss(): Override {
    return {
        onTap: () => {
            const modal = document.querySelector("[data-exit-modal='true']") as HTMLElement
            if (modal) modal.style.display = "none"
        },
    }
}
