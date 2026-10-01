"use client"

import type { ReactElement, ReactNode } from "react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

/** Tooltip around a single interactive element. */
export function Hint({
  label,
  shortcut,
  side = "top",
  children,
}: {
  label: ReactNode
  shortcut?: string
  side?: "top" | "bottom" | "left" | "right"
  children: ReactElement
}) {
  return (
    <Tooltip>
      <TooltipTrigger render={children} />
      <TooltipContent side={side}>
        {label}
        {shortcut && (
          <kbd className="ml-1 rounded bg-background/15 px-1 font-sans text-[0.68rem] tracking-wide text-background/70">
            {shortcut}
          </kbd>
        )}
      </TooltipContent>
    </Tooltip>
  )
}
