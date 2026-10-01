"use client"

import { motion } from "motion/react"
import { cn } from "@/lib/utils"

/** Two voices meeting in the middle. */
export function LogoMark({
  className,
  animated = false,
}: {
  className?: string
  animated?: boolean
}) {
  const drift = (dir: 1 | -1) =>
    animated
      ? {
          animate: { x: [0, dir * 1.6, 0] },
          transition: {
            duration: 3.2,
            repeat: Infinity,
            ease: "easeInOut" as const,
          },
        }
      : {}

  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden
      className={cn("size-6 overflow-visible", className)}
    >
      <motion.circle
        cx="12"
        cy="16"
        r="8.5"
        className="fill-brand"
        {...drift(-1)}
      />
      <motion.circle
        cx="20"
        cy="16"
        r="8.5"
        className="fill-foreground/85 mix-blend-multiply dark:mix-blend-screen"
        {...drift(1)}
      />
    </svg>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-serif text-[1.45rem] leading-none tracking-tight italic",
        className
      )}
    >
      Parley
    </span>
  )
}
