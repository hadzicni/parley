"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChevronRightIcon, SparklesIcon } from "lucide-react"
import { useSmoothText } from "@/hooks/use-smooth-text"
import { easeOut } from "@/components/chat/motion"
import { cn } from "@/lib/utils"

function formatSeconds(ms?: number) {
  if (!ms) return "a moment"
  const s = ms / 1000
  return s < 1 ? "less than a second" : s < 60 ? `${Math.round(s)}s` : `${Math.floor(s / 60)}m ${Math.round(s % 60)}s`
}

/** Collapsible reasoning trace, open while the model is still thinking. */
export function Thinking({
  text,
  active,
  durationMs,
}: {
  text: string
  /** Still receiving reasoning tokens. */
  active: boolean
  durationMs?: number
}) {
  const [userOpen, setUserOpen] = useState<boolean | null>(null)
  const open = userOpen ?? active
  const shown = useSmoothText(text, active)

  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setUserOpen(!open)}
        className="group/think flex items-center gap-1.5 rounded-md py-1 text-[0.8125rem] text-muted-foreground transition-colors hover:text-foreground"
      >
        <SparklesIcon
          className={cn("size-3.5", active && "animate-breathe text-brand")}
        />
        <span className={cn(active && "text-shimmer")}>
          {active ? "Thinking" : `Thought for ${formatSeconds(durationMs)}`}
        </span>
        <motion.span
          animate={{ rotate: open ? 90 : 0 }}
          transition={easeOut}
          className="grid place-items-center"
        >
          <ChevronRightIcon className="size-3.5 opacity-60 group-hover/think:opacity-100" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="trace"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={easeOut}
            className="overflow-hidden"
          >
            <div
              className={cn(
                "mt-1 ml-[7px] border-l-2 border-border pl-4 text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-muted-foreground",
                active &&
                  "flex max-h-48 flex-col-reverse overflow-hidden mask-t-from-70%"
              )}
            >
              <div>{shown.trim()}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
