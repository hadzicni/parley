"use client"

import { memo, useEffect, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  AlertCircleIcon,
  PencilIcon,
  RotateCcwIcon,
  SquareIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { CopyButton } from "@/components/chat/copy-button"
import { Hint } from "@/components/chat/hint"
import { Orb } from "@/components/chat/logo"
import { Markdown } from "@/components/chat/markdown"
import { Thinking } from "@/components/chat/thinking"
import { easeOut, spring } from "@/components/chat/motion"
import { useSmoothText } from "@/hooks/use-smooth-text"
import { editMessage, regenerate } from "@/lib/chat"
import type { ChatMessage } from "@/lib/types"
import { cn } from "@/lib/utils"

function tokensPerSecond(message: ChatMessage) {
  const stats = message.stats
  if (!stats?.evalCount || !stats.evalDurationNs) return null
  return stats.evalCount / (stats.evalDurationNs / 1e9)
}

const DOT_COLORS = ["var(--brand-2)", "var(--brand)", "var(--brand-3)"]

/** Three dots bobbing in the brand colors while we wait for a first token. */
export function PendingDots() {
  return (
    <div
      className="flex h-7 items-center gap-1"
      role="status"
      aria-label="Waiting for response"
    >
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="size-2 rounded-full"
          style={{
            background: DOT_COLORS[i],
            boxShadow: `0 0 10px ${DOT_COLORS[i]}`,
          }}
          animate={{ y: [0, -6, 0], scale: [0.8, 1.15, 0.8], opacity: [0.4, 1, 0.4] }}
          transition={{
            duration: 1.05,
            repeat: Infinity,
            delay: i * 0.14,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  )
}

/* ------------------------------------------------------------------ */

export const UserMessage = memo(function UserMessage({
  message,
  conversationId,
  canEdit,
}: {
  message: ChatMessage
  conversationId: string
  canEdit: boolean
}) {
  const [editing, setEditing] = useState(false)

  return (
    <div className="group/msg flex flex-col items-end">
      <AnimatePresence mode="popLayout" initial={false}>
        {editing ? (
          <EditBox
            key="edit"
            initial={message.content}
            onCancel={() => setEditing(false)}
            onSubmit={(text) => {
              setEditing(false)
              if (text.trim() && text.trim() !== message.content) {
                editMessage(conversationId, message.id, text)
              }
            }}
          />
        ) : (
          <motion.div
            key="bubble"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={easeOut}
            className="relative max-w-[85%] origin-bottom-right overflow-hidden rounded-[1.4rem] rounded-br-md bg-linear-to-br from-[oklch(0.52_0.23_292)] via-[oklch(0.5_0.23_315)] to-[oklch(0.55_0.22_345)] px-4.5 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.25),0_12px_32px_-12px_var(--brand)] sm:max-w-[75%]"
          >
            {message.content}
          </motion.div>
        )}
      </AnimatePresence>
      {!editing && (
        <div className="mt-1 flex items-center gap-0.5 opacity-0 transition-opacity duration-200 group-hover/msg:opacity-100 focus-within:opacity-100 max-md:opacity-100">
          <CopyButton text={message.content} />
          {canEdit && (
            <Hint label="Edit">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Edit message"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setEditing(true)}
              >
                <PencilIcon />
              </Button>
            </Hint>
          )}
        </div>
      )}
    </div>
  )
})

function EditBox({
  initial,
  onCancel,
  onSubmit,
}: {
  initial: string
  onCancel: () => void
  onSubmit: (text: string) => void
}) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 320)}px`
  }, [value])

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={easeOut}
      className="beam glass w-full origin-top-right rounded-3xl border border-transparent p-2 shadow-[0_0_50px_-14px_var(--brand)] sm:w-[85%]"
    >
      <textarea
        ref={ref}
        value={value}
        rows={1}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") onCancel()
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            onSubmit(value)
          }
        }}
        className="scroll-thin block w-full resize-none bg-transparent px-2 py-1.5 text-[0.9375rem] leading-relaxed outline-none"
      />
      <div className="flex justify-end gap-1.5 pt-1">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          disabled={!value.trim()}
          onClick={() => onSubmit(value)}
          className="bg-cosmic text-white hover:opacity-90"
        >
          Send
        </Button>
      </div>
    </motion.div>
  )
}

/* ------------------------------------------------------------------ */

export const AssistantMessage = memo(function AssistantMessage({
  message,
  conversationId,
  isLast,
}: {
  message: ChatMessage
  conversationId: string
  isLast: boolean
}) {
  const streaming = message.status === "streaming"
  const content = useSmoothText(message.content, streaming)
  const revealing = streaming || content.length < message.content.length
  const thinkingActive = streaming && !message.content && !!message.thinking
  const pending = streaming && !message.content && !message.thinking
  const tps = tokensPerSecond(message)

  return (
    <div className="group/msg relative">
      <div className="mb-2.5 flex items-center gap-2">
        <Orb active={streaming} className="size-5" glow="10px" />
        <span className="font-display text-[0.7rem] font-medium tracking-[-0.01em] text-muted-foreground">
          {message.model ?? "assistant"}
        </span>
      </div>
      {message.thinking && (
        <Thinking
          text={message.thinking}
          active={thinkingActive}
          durationMs={message.thinkingMs}
        />
      )}

      <AnimatePresence mode="popLayout" initial={false}>
        {pending && (
          <motion.div
            key="pending"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
          >
            <PendingDots />
          </motion.div>
        )}
      </AnimatePresence>

      {content && <Markdown content={content} streaming={revealing} />}

      {message.status === "error" && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={easeOut}
          className={cn(
            "glass flex items-start gap-2.5 rounded-2xl border border-destructive/30 px-3.5 py-3 text-sm text-destructive shadow-[0_0_40px_-16px_var(--destructive)]",
            content && "mt-4"
          )}
        >
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="font-medium">Something went wrong</p>
            <p className="mt-0.5 break-words text-destructive/80">
              {message.error ?? "The model didn't respond."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => regenerate(conversationId, message.id)}
          >
            <RotateCcwIcon />
            Retry
          </Button>
        </motion.div>
      )}

      <AnimatePresence>
        {!streaming && message.status !== "error" && (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...easeOut, delay: 0.1 }}
            className={cn(
              "mt-2 -ml-1.5 flex items-center gap-0.5 text-xs text-muted-foreground transition-opacity duration-200",
              !isLast &&
                "opacity-0 group-hover/msg:opacity-100 focus-within:opacity-100 max-md:opacity-100"
            )}
          >
            <CopyButton text={message.content} />
            <Hint label="Regenerate">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Regenerate response"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => regenerate(conversationId, message.id)}
              >
                <RotateCcwIcon />
              </Button>
            </Hint>
            {message.status === "stopped" && (
              <span className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-brand-3/30 bg-brand-3/10 px-2 py-0.5 text-[0.7rem] font-medium text-brand-3">
                <SquareIcon className="size-2 fill-current" />
                Stopped
              </span>
            )}
            {tps !== null && (
              <span className="ml-2 inline-flex items-center gap-1 font-mono text-[0.7rem] text-muted-foreground/80 tabular-nums">
                <span className="size-1 rounded-full bg-brand-2 shadow-[0_0_6px_var(--brand-2)]" />
                {tps.toFixed(tps < 10 ? 1 : 0)} tok/s
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
})

/** Enter/exit motion for a message row in the list. */
export function messageMotion(role: ChatMessage["role"]) {
  return {
    initial:
      role === "user"
        ? { opacity: 0, y: 16, scale: 0.97, filter: "blur(4px)" }
        : { opacity: 0, y: 10, filter: "blur(2px)" },
    animate: { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" },
    exit: { opacity: 0, scale: 0.98, transition: { duration: 0.15 } },
    transition: role === "user" ? spring : { ...easeOut, delay: 0.08 },
    className: role === "user" ? "origin-bottom-right" : undefined,
  }
}
