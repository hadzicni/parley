import type { Transition } from "motion/react"

/** Shared motion vocabulary, so everything moves with the same personality. */
export const spring = {
  type: "spring",
  stiffness: 420,
  damping: 36,
  mass: 0.9,
} satisfies Transition

export const softSpring = {
  type: "spring",
  stiffness: 260,
  damping: 30,
} satisfies Transition

export const easeOut = {
  duration: 0.32,
  ease: [0.16, 1, 0.3, 1],
} satisfies Transition

export const iconSwap = {
  initial: { opacity: 0, scale: 0.5, filter: "blur(4px)" },
  animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
  exit: { opacity: 0, scale: 0.5, filter: "blur(4px)" },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] },
} as const
