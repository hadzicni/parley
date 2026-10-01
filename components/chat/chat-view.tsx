"use client"

import { useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ArrowDownIcon } from "lucide-react"
import { Composer } from "@/components/chat/composer"
import { Hero, Suggestions } from "@/components/chat/empty-state"
import {
  AssistantMessage,
  messageMotion,
  UserMessage,
} from "@/components/chat/message"
import { easeOut, softSpring } from "@/components/chat/motion"
import { useStickToBottom } from "@/hooks/use-stick-to-bottom"
import { useChat } from "@/lib/store"
import type { ChatMessage } from "@/lib/types"

const NO_MESSAGES: ChatMessage[] = []

export function ChatView() {
  const viewKey = useChat((s) => s.viewKey)
  const conversation = useChat((s) =>
    s.conversations.find((c) => c.id === s.activeId)
  )
  const messages = conversation?.messages ?? NO_MESSAGES
  const empty = messages.length === 0
  // Animate the first messages in only when this view started out empty;
  // opening an existing chat should just show it.
  const [startedEmpty] = useState(empty)
  const { scrollRef, contentRef, showJump, scrollToBottom } =
    useStickToBottom(!empty)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.25 }}
      className="relative flex min-h-0 flex-1 flex-col"
    >
      <div className="relative min-h-0 flex-1">
        <AnimatePresence>
          {empty && (
            <motion.div
              key="hero"
              exit={{
                opacity: 0,
                y: -24,
                filter: "blur(8px)",
                transition: { duration: 0.3, ease: [0.4, 0, 1, 1] },
              }}
              className="absolute inset-0 flex flex-col items-center justify-end px-6 pb-9"
            >
              <Hero />
            </motion.div>
          )}
        </AnimatePresence>

        {!empty && conversation && (
          <div
            ref={scrollRef}
            className="scroll-thin fade-y absolute inset-0 overflow-y-auto overscroll-contain [scrollbar-gutter:stable_both-edges]"
          >
            <div
              ref={contentRef}
              className="mx-auto flex max-w-3xl flex-col gap-9 px-4 pt-8 pb-12 sm:px-6"
            >
              <AnimatePresence initial={startedEmpty} mode="popLayout">
                {messages.map((message, index) => (
                  <motion.div key={message.id} {...messageMotion(message.role)}>
                    {message.role === "user" ? (
                      <UserMessage
                        message={message}
                        conversationId={conversation.id}
                        canEdit
                      />
                    ) : (
                      <AssistantMessage
                        message={message}
                        conversationId={conversation.id}
                        isLast={index === messages.length - 1}
                      />
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        <AnimatePresence>
          {showJump && !empty && (
            <motion.button
              type="button"
              aria-label="Scroll to latest"
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              transition={softSpring}
              whileTap={{ scale: 0.92 }}
              onClick={() => scrollToBottom()}
              className="glass absolute bottom-3 left-1/2 z-10 -ml-5 grid size-10 place-items-center rounded-full border text-muted-foreground shadow-[0_0_30px_-8px_var(--brand)] transition-colors hover:text-foreground"
            >
              <ArrowDownIcon className="size-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <div className="relative shrink-0 px-3 pb-3 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <Composer
            conversationId={conversation?.id ?? null}
            viewKey={viewKey}
            onSend={() => scrollToBottom()}
          />
          <p className="mt-2.5 text-center text-[0.68rem] tracking-wide text-muted-foreground/60">
            Runs locally through Ollama · Models can make mistakes
          </p>
        </div>
      </div>

      {/* Below-composer space: holds the composer near the middle while empty,
          then collapses so it glides down to its resting place. */}
      <motion.div
        initial={false}
        animate={{ flexGrow: empty ? 1 : 0 }}
        transition={{ ...easeOut, duration: 0.6 }}
        style={{ flexBasis: 0 }}
        className="relative min-h-0"
      >
        <div className="absolute inset-x-0 top-3 px-4">
          <AnimatePresence>{empty && <Suggestions key="s" />}</AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
