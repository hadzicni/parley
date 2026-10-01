"use client"

import { useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowUpIcon, SquareIcon } from "lucide-react"
import { Hint } from "@/components/chat/hint"
import { iconSwap } from "@/components/chat/motion"
import { sendMessage, stop } from "@/lib/chat"
import { useChat } from "@/lib/store"
import { cn } from "@/lib/utils"

/** Unsent text, per chat view, for the lifetime of the tab. */
const drafts = new Map<string, string>()

export function Composer({
  conversationId,
  viewKey,
  onSend,
}: {
  conversationId: string | null
  viewKey: string
  onSend?: () => void
}) {
  const [value, setValue] = useState(() => drafts.get(viewKey) ?? "")
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const generating = useChat((s) =>
    conversationId ? !!s.generating[conversationId] : false
  )
  const model = useChat(
    (s) =>
      s.conversations.find((c) => c.id === conversationId)?.model ??
      s.defaultModel
  )
  const modelAvailable = useChat((s) => s.models.some((m) => m.name === model))
  const modelsStatus = useChat((s) => s.modelsStatus)
  const hasModels = useChat((s) => s.models.length > 0)

  const canSend = !!value.trim() && modelAvailable && !generating

  const placeholder =
    modelsStatus === "error"
      ? "Ollama isn't reachable…"
      : modelsStatus === "ready" && !hasModels
        ? "Install a model to start chatting…"
        : model && !modelAvailable && modelsStatus === "ready"
          ? `${model} isn't installed — pick another model`
          : model
            ? `Message ${model}`
            : "Message…"

  useEffect(() => {
    drafts.set(viewKey, value)
  }, [viewKey, value])

  // Grow with the content (up to a limit), re-fitting when the width changes.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    const fit = () => {
      el.style.height = "0px"
      el.style.height = `${Math.min(el.scrollHeight, 240)}px`
    }
    fit()
    let width = el.clientWidth
    const observer = new ResizeObserver(() => {
      if (el.clientWidth === width) return
      width = el.clientWidth
      fit()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  useEffect(() => {
    if (window.matchMedia("(pointer: fine)").matches) {
      textareaRef.current?.focus()
    }
  }, [viewKey])

  // Start typing anywhere to focus the composer.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.length !== 1 || event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      if (
        target?.closest(
          "input, textarea, select, [contenteditable=true], [role=dialog], [role=menu], [role=listbox]"
        )
      ) {
        return
      }
      textareaRef.current?.focus()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  const submit = () => {
    if (!canSend) return
    sendMessage(conversationId, value)
    setValue("")
    drafts.delete(viewKey)
    onSend?.()
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        submit()
      }}
      className={cn(
        "group/composer relative rounded-[1.6rem] border bg-card shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.12)] transition-[border-color,box-shadow] duration-300 dark:shadow-[0_1px_2px_rgb(0_0_0/0.3),0_12px_32px_-12px_rgb(0_0_0/0.6)]",
        "focus-within:border-brand/40 focus-within:shadow-[0_0_0_4px_color-mix(in_oklch,var(--brand)_12%,transparent),0_8px_24px_-12px_rgb(0_0_0/0.12)]"
      )}
      onClick={(event) => {
        if (event.target === event.currentTarget) textareaRef.current?.focus()
      }}
    >
      <label htmlFor="composer" className="sr-only">
        Message
      </label>
      <textarea
        id="composer"
        ref={textareaRef}
        rows={1}
        value={value}
        placeholder={placeholder}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault()
            submit()
          }
          if (event.key === "Escape" && generating && conversationId) {
            event.preventDefault()
            stop(conversationId)
          }
        }}
        className="scroll-thin block max-h-60 min-h-[3.25rem] w-full resize-none bg-transparent pt-4 pr-16 pb-3.5 pl-5 text-[0.9375rem] leading-relaxed outline-none placeholder:text-muted-foreground/70"
      />
      <div className="absolute right-2.5 bottom-2.5">
        <Hint
          label={generating ? "Stop generating" : "Send message"}
          shortcut={generating ? "Esc" : "↵"}
        >
          <motion.button
            type={generating ? "button" : "submit"}
            aria-label={generating ? "Stop generating" : "Send message"}
            disabled={!generating && !canSend}
            onClick={(event) => {
              if (!generating || !conversationId) return
              event.preventDefault()
              stop(conversationId)
            }}
            whileTap={{ scale: 0.88 }}
            transition={{ type: "spring", stiffness: 600, damping: 30 }}
            className={cn(
              "relative grid size-9 place-items-center rounded-full transition-[background-color,color,box-shadow] duration-200 outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              generating || canSend
                ? "bg-foreground text-background shadow-sm hover:bg-foreground/85"
                : "bg-muted text-muted-foreground/60"
            )}
          >
            {generating && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-full ring-2 ring-brand/50"
                initial={{ opacity: 0, scale: 1 }}
                animate={{ opacity: [0.7, 0], scale: [1, 1.45] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span key={generating ? "stop" : "send"} {...iconSwap}>
                {generating ? (
                  <SquareIcon className="size-3.5 fill-current" />
                ) : (
                  <ArrowUpIcon className="size-[1.1rem]" strokeWidth={2.4} />
                )}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </Hint>
      </div>
    </form>
  )
}
