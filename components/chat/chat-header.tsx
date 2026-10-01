"use client"

import { AnimatePresence, motion } from "motion/react"
import { PanelLeftOpenIcon, SquarePenIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Hint } from "@/components/chat/hint"
import { ModelPicker } from "@/components/chat/model-picker"
import { easeOut } from "@/components/chat/motion"
import { MOD_KEY } from "@/components/chat/sidebar"
import { setActive, setSidebarOpen, useChat } from "@/lib/store"

export function ChatHeader() {
  const sidebarOpen = useChat((s) => s.sidebarOpen)
  const title = useChat(
    (s) => s.conversations.find((c) => c.id === s.activeId)?.title
  )

  return (
    <header className="relative z-10 flex h-14 shrink-0 items-center gap-1 px-2 sm:px-3">
      <AnimatePresence initial={false}>
        {!sidebarOpen && (
          <motion.div
            key="controls"
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={easeOut}
            className="flex shrink-0 items-center gap-0.5 overflow-hidden"
          >
            <Hint label="Open sidebar" shortcut={`${MOD_KEY}B`} side="bottom">
              <Button
                variant="ghost"
                size="icon"
                aria-label="Open sidebar"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setSidebarOpen(true)}
              >
                <PanelLeftOpenIcon />
              </Button>
            </Hint>
            <Hint label="New chat" shortcut={`${MOD_KEY}⇧O`} side="bottom">
              <Button
                variant="ghost"
                size="icon"
                aria-label="New chat"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setActive(null)}
              >
                <SquarePenIcon />
              </Button>
            </Hint>
            <span className="mx-1 h-4 w-px bg-border" />
          </motion.div>
        )}
      </AnimatePresence>

      <ModelPicker />

      <div className="pointer-events-none absolute inset-x-0 hidden justify-center lg:flex">
        <AnimatePresence mode="popLayout" initial={false}>
          {title && (
            <motion.span
              key={title}
              initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              transition={easeOut}
              className="max-w-[min(28rem,40vw)] truncate text-sm text-muted-foreground"
            >
              {title}
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </header>
  )
}
