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

/** Two dots leaning into each other — the logo, waiting for a reply. */
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
          className="size-1.5 rounded-full bg-brand"
          animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
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
            className="max-w-[85%] origin-bottom-right rounded-[1.35rem] rounded-br-md bg-secondary px-4 py-2.5 text-[0.9375rem] leading-relaxed whitespace-pre-wrap text-secondary-foreground sm:max-w-[75%]"
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
      className="w-full origin-top-right rounded-2xl border bg-card p-2 shadow-sm ring-4 ring-brand/10 sm:w-[85%]"
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
            "flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive",
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
              <span className="ml-1.5 inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-medium">
                <SquareIcon className="size-2 fill-current" />
                Stopped
              </span>
            )}
            <span className="ml-2 truncate tabular-nums">
              {message.model}
              {tps !== null && (
                <span className="text-muted-foreground/70">
                  {" · "}
                  {tps.toFixed(tps < 10 ? 1 : 0)} tok/s
                </span>
              )}
            </span>
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
