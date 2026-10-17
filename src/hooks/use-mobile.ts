import * as React from "react"

const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  return React.useSyncExternalStore(
    subscribe,
    () => (typeof window !== "undefined" ? window.innerWidth < MOBILE_BREAKPOINT : false),
    () => false,
  )
}

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined
  }

  const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
  const onChange = () => callback()

  mql.addEventListener("change", onChange)
  return () => mql.removeEventListener("change", onChange)
}
