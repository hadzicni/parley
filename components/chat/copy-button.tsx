"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { CheckIcon, CopyIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { iconSwap } from "@/components/chat/motion"
import { Hint } from "@/components/chat/hint"
import { cn } from "@/lib/utils"

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    // Clipboard API needs a secure context; fall back to a hidden textarea.
    const area = document.createElement("textarea")
    area.value = text
    area.style.position = "fixed"
    area.style.opacity = "0"
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand("copy")
    area.remove()
    return ok
  }
}

export function CopyButton({
  text,
  label = "Copy",
  className,
  size = "icon-sm",
}: {
  text: string
  label?: string
  className?: string
  size?: "icon-sm" | "icon-xs"
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), 1600)
    return () => clearTimeout(timer)
  }, [copied])

  return (
    <Hint label={copied ? "Copied" : label}>
      <Button
        variant="ghost"
        size={size}
        aria-label={label}
        className={cn("text-muted-foreground hover:text-foreground", className)}
        onClick={async () => setCopied(await copyText(text))}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span key={copied ? "check" : "copy"} {...iconSwap}>
            {copied ? (
              <CheckIcon className="text-success" />
            ) : (
              <CopyIcon />
            )}
          </motion.span>
        </AnimatePresence>
      </Button>
    </Hint>
  )
}
