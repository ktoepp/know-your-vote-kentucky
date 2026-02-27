import { Override } from "framer"
import { useState, useRef, useEffect } from "react"

const drawerState = {
    isExpanded: false,
    drawerRef: null,
}

const ISI_EXPANDED_EVENT = "isi-expanded-change"
const ISI_REQUEST_EXPAND_EVENT = "isi-request-expand"

function useIsExpanded(): boolean {
    const [isExpanded, setIsExpanded] = useState(
        () => typeof document !== "undefined" && document.body.classList.contains("isi-expanded")
    )

    useEffect(() => {
        const update = (e?: CustomEvent<boolean>) => {
            const expanded = e?.detail ?? document.body.classList.contains("isi-expanded")
            setIsExpanded(expanded)
        }

        update()
        const onExpandedChange = (e: Event) => update(e as CustomEvent<boolean>)
        window.addEventListener(ISI_EXPANDED_EVENT, onExpandedChange)

        const observer = new MutationObserver(() => update())
        observer.observe(document.body, {
            attributes: true,
            attributeFilter: ["class"],
            subtree: false,
        })

        return () => {
            window.removeEventListener(ISI_EXPANDED_EVENT, onExpandedChange)
            observer.disconnect()
        }
    }, [])

    return isExpanded
}

export function ISIExpandButton(): Override {
    const isExpanded = useIsExpanded()

    return {
        animate: isExpanded ? "Variant 2" : "Variant 1",
        variant: isExpanded ? "Variant 2" : "Variant 1",
        style: {
            width: "100%",
            pointerEvents: isExpanded ? "none" : "auto",
        },
        onTap: () => {
            if (!isExpanded) {
                window.dispatchEvent(new CustomEvent(ISI_REQUEST_EXPAND_EVENT))
            }
        },
    }
}

export function ISIDrawer(): Override {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isHidden, setIsHidden] = useState(false)
    const [topMargin, setTopMargin] = useState(123.5)
    const drawerRef = useRef(null)

    drawerState.isExpanded = isExpanded
    drawerState.drawerRef = drawerRef

    useEffect(() => {
        const updateTopMargin = () => {
            const width = window.innerWidth
            if (width < 810) {
                setTopMargin(100)
            } else if (width < 1200) {
                setTopMargin(122)
            } else {
                setTopMargin(123.5)
            }
        }

        updateTopMargin()
        window.addEventListener("resize", updateTopMargin)
        return () => window.removeEventListener("resize", updateTopMargin)
    }, [])

    useEffect(() => {
        if (document.body.dataset.isiNoScrollHide === "true") return

        const footer = document.getElementById("isi-footer")
        if (!footer) return

        const observer = new IntersectionObserver(
            (entries) => {
                const entry = entries[0]
                if (!entry) return

                setIsHidden(entry.isIntersecting)
            },
            {
                root: null,
                threshold: 0.1,
            }
        )

        observer.observe(footer)
        return () => observer.disconnect()
    }, [])

    useEffect(() => {
        if (isHidden && isExpanded) {
            setIsExpanded(false)
            document.body.classList.remove("isi-expanded")
            window.dispatchEvent(new CustomEvent(ISI_EXPANDED_EVENT, { detail: false }))
        }
    }, [isHidden, isExpanded])

    useEffect(() => {
        const onRequestExpand = () => {
            if (!isExpanded && !isHidden) {
                setIsExpanded(true)
                document.body.classList.add("isi-expanded")
                window.dispatchEvent(new CustomEvent(ISI_EXPANDED_EVENT, { detail: true }))
            }
        }
        window.addEventListener(ISI_REQUEST_EXPAND_EVENT, onRequestExpand)
        return () => window.removeEventListener(ISI_REQUEST_EXPAND_EVENT, onRequestExpand)
    }, [isExpanded, isHidden])

    const peekHeight = 250

    return {
        ref: drawerRef,
        onTap: () => {
            if (!isExpanded) {
                setIsExpanded(true)
                document.body.classList.add("isi-expanded")
                window.dispatchEvent(new CustomEvent(ISI_EXPANDED_EVENT, { detail: true }))
            } else {
                if (drawerRef.current) drawerRef.current.scrollTop = 0
                setIsExpanded(false)
                document.body.classList.remove("isi-expanded")
                window.dispatchEvent(new CustomEvent(ISI_EXPANDED_EVENT, { detail: false }))
            }
        },
        animate: {
            top: isHidden
                ? "100vh"
                : isExpanded
                  ? `${topMargin}px`
                  : `calc(100vh - ${peekHeight}px)`,
            height: isExpanded
                ? `calc(100vh - ${topMargin}px)`
                : `${peekHeight}px`,
            opacity: isHidden ? 0 : 1,
        },
        transition: {
            type: "spring",
            stiffness: 300,
            damping: 50,
        },
        style: {
            position: "fixed",
            left: 0,
            transform: "none",
            width: "100vw",
            padding: 0,
            backgroundColor: "#ffffff",
            overflow: isExpanded ? "scroll" : "hidden",
            overflowX: "hidden",
            overflowY: isExpanded ? "scroll" : "hidden",
            zIndex: 10,
            pointerEvents: isHidden || !isExpanded ? "none" : "auto",
        },
    }
}

export function ISIContent(): Override {
    return {
        style: {
            width: "100%",
        },
    }
}
