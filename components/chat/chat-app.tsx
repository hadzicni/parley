"use client"

import { useEffect } from "react"
import { AnimatePresence, motion } from "motion/react"
import { ChatHeader } from "@/components/chat/chat-header"
import { ChatView } from "@/components/chat/chat-view"
import { Cosmos } from "@/components/chat/cosmos"
import { softSpring } from "@/components/chat/motion"
import { Sidebar } from "@/components/chat/sidebar"
import { useMediaQuery } from "@/hooks/use-media-query"
import { stop } from "@/lib/chat"
import { refreshModels } from "@/lib/ollama"
import { getState, setActive, setSidebarOpen, useChat } from "@/lib/store"

const SIDEBAR_WIDTH = 292

export function ChatApp() {
  const hydrated = useChat((s) => s.hydrated)
  const sidebarOpen = useChat((s) => s.sidebarOpen)
  const viewKey = useChat((s) => s.viewKey)
  const title = useChat(
    (s) => s.conversations.find((c) => c.id === s.activeId)?.title
  )
  const isDesktop = useMediaQuery("(min-width: 768px)")

  // Load models, and keep checking while Ollama is unreachable.
  useEffect(() => {
    void refreshModels()
    const poll = setInterval(() => {
      if (getState().modelsStatus === "error")
        void refreshModels({ quiet: true })
    }, 4000)
    const onFocus = () => void refreshModels({ quiet: true })
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(poll)
      window.removeEventListener("focus", onFocus)
    }
  }, [])

  useEffect(() => {
    document.title = title ? `${title} · Parley` : "Parley"
  }, [title])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey
      const key = event.key.toLowerCase()
      if (mod && event.shiftKey && key === "o") {
        event.preventDefault()
        setActive(null)
      } else if (mod && !event.shiftKey && key === "b") {
        event.preventDefault()
        setSidebarOpen((open) => !open)
      } else if (mod && key === "k") {
        event.preventDefault()
        setSidebarOpen(true)
        requestAnimationFrame(() =>
          window.dispatchEvent(new Event("parley:focus-search"))
        )
      } else if (key === "escape" && !event.defaultPrevented) {
        const { activeId, generating } = getState()
        if (
          activeId &&
          generating[activeId] &&
          !document.querySelector("[role=dialog], [role=menu]")
        ) {
          stop(activeId)
        }
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [])

  return (
    <>
      <Cosmos />
      {hydrated && (
        <div className="flex h-dvh overflow-hidden">
          {isDesktop ? (
            <motion.aside
              initial={false}
              animate={{ width: sidebarOpen ? SIDEBAR_WIDTH : 0 }}
              transition={softSpring}
              className="relative shrink-0 overflow-hidden"
              aria-hidden={!sidebarOpen}
              inert={!sidebarOpen}
            >
              <motion.div
                initial={false}
                animate={{
                  opacity: sidebarOpen ? 1 : 0,
                  x: sidebarOpen ? 0 : -40,
                  scale: sidebarOpen ? 1 : 0.94,
                  filter: sidebarOpen ? "blur(0px)" : "blur(6px)",
                }}
                transition={softSpring}
                className="absolute inset-y-0 left-0 origin-left p-2.5 pr-0"
                style={{ width: SIDEBAR_WIDTH }}
              >
                <Sidebar />
              </motion.div>
            </motion.aside>
          ) : (
            <AnimatePresence>
              {sidebarOpen && (
                <>
                  <motion.div
                    key="backdrop"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setSidebarOpen(false)}
                    className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
                  />
                  <motion.aside
                    key="drawer"
                    initial={{ x: "-100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "-100%" }}
                    transition={softSpring}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={{ left: 0.6, right: 0 }}
                    onDragEnd={(_, info) => {
                      if (info.offset.x < -80 || info.velocity.x < -400) {
                        setSidebarOpen(false)
                      }
                    }}
                    className="fixed inset-y-0 left-0 z-50 p-2"
                    style={{ width: Math.min(SIDEBAR_WIDTH + 8, 320) }}
                  >
                    <Sidebar />
                  </motion.aside>
                </>
              )}
            </AnimatePresence>
          )}

          <main className="flex min-w-0 flex-1 flex-col">
            <ChatHeader />
            <ChatView key={viewKey} />
          </main>
        </div>
      )}
    </>
  )
}
