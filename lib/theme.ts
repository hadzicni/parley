"use client"

import { useSyncExternalStore } from "react"
import { DEFAULT_THEME, THEME_STORAGE_KEY } from "@/lib/theme-script"

export type Theme = "light" | "dark" | "system"

const listeners = new Set<() => void>()

function readTheme(): Theme {
  try {
    const value = localStorage.getItem(THEME_STORAGE_KEY)
    return value === "light" || value === "dark" || value === "system"
      ? value
      : DEFAULT_THEME
  } catch {
    return DEFAULT_THEME
  }
}

function prefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

function isDark(theme: Theme) {
  return theme === "dark" || (theme === "system" && prefersDark())
}

if (typeof window !== "undefined") {
  window
    .matchMedia("(prefers-color-scheme: dark)")
    .addEventListener("change", () => {
      if (readTheme() === "system") {
        document.documentElement.classList.toggle("dark", prefersDark())
      }
    })
}

/**
 * Switch theme. When an origin point is given (e.g. the toggle button), the
 * new theme is revealed as a circle growing from it, via View Transitions.
 */
export function setTheme(theme: Theme, origin?: { x: number; y: number }) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {}
  listeners.forEach((l) => l())

  const root = document.documentElement
  const dark = isDark(theme)
  if (root.classList.contains("dark") === dark) return

  const swap = () => root.classList.toggle("dark", dark)
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
  if (!document.startViewTransition || reduced) {
    swap()
    return
  }

  const x = origin?.x ?? window.innerWidth / 2
  const y = origin?.y ?? 0
  const radius = Math.hypot(
    Math.max(x, window.innerWidth - x),
    Math.max(y, window.innerHeight - y)
  )
  const transition = document.startViewTransition(swap)
  transition.ready
    .then(() => {
      root.animate(
        {
          clipPath: [
            `circle(0px at ${x}px ${y}px)`,
            `circle(${radius}px at ${x}px ${y}px)`,
          ],
        },
        {
          duration: 560,
          easing: "cubic-bezier(0.65, 0, 0.35, 1)",
          pseudoElement: "::view-transition-new(root)",
        }
      )
    })
    .catch(() => {})
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    readTheme,
    () => DEFAULT_THEME
  )
}
