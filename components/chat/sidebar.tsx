"use client"

import { memo, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import {
  MoreHorizontalIcon,
  PanelLeftCloseIcon,
  PencilIcon,
  SearchIcon,
  SquarePenIcon,
  Trash2Icon,
  XIcon,
} from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Hint } from "@/components/chat/hint"
import { LogoMark, Wordmark } from "@/components/chat/logo"
import { easeOut, spring } from "@/components/chat/motion"
import { ThemeToggle } from "@/components/chat/theme-toggle"
import { stop } from "@/lib/chat"
import { refreshModels } from "@/lib/ollama"
import {
  getConversation,
  removeConversation,
  renameConversation,
  setActive,
  setSidebarOpen,
  useChat,
} from "@/lib/store"
import type { Conversation } from "@/lib/types"
import { cn } from "@/lib/utils"

export const MOD_KEY =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl+"

const DAY = 86_400_000

function groupLabel(timestamp: number, todayStart: number) {
  if (timestamp >= todayStart) return "Today"
  if (timestamp >= todayStart - DAY) return "Yesterday"
  if (timestamp >= todayStart - 7 * DAY) return "Previous 7 days"
  if (timestamp >= todayStart - 30 * DAY) return "Previous 30 days"
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  })
}

function useGroups(conversations: Conversation[], query: string) {
  return useMemo(() => {
    const q = query.trim().toLowerCase()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sorted = [...conversations]
      .filter(
        (c) =>
          !q ||
          c.title.toLowerCase().includes(q) ||
          c.messages.some((m) => m.content.toLowerCase().includes(q))
      )
      .sort((a, b) => b.updatedAt - a.updatedAt)
    const groups: { label: string; items: Conversation[] }[] = []
    for (const c of sorted) {
      const label = groupLabel(c.updatedAt, today.getTime())
      const last = groups[groups.length - 1]
      if (last?.label === label) last.items.push(c)
      else groups.push({ label, items: [c] })
    }
    return groups
  }, [conversations, query])
}

export function Sidebar() {
  const conversations = useChat((s) => s.conversations)
  const [query, setQuery] = useState("")
  const [pendingDelete, setPendingDelete] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const groups = useGroups(conversations, query)

  useEffect(() => {
    const onFocusSearch = () => searchRef.current?.focus()
    window.addEventListener("parley:focus-search", onFocusSearch)
    return () => window.removeEventListener("parley:focus-search", onFocusSearch)
  }, [])

  const deleting = pendingDelete ? getConversation(pendingDelete) : undefined

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Brand */}
      <div className="flex h-14 shrink-0 items-center justify-between pr-2 pl-4">
        <button
          type="button"
          onClick={() => setActive(null)}
          className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <LogoMark className="size-[1.35rem]" />
          <Wordmark />
        </button>
        <Hint label="Close sidebar" shortcut={`${MOD_KEY}B`} side="right">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Close sidebar"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(false)}
          >
            <PanelLeftCloseIcon />
          </Button>
        </Hint>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 px-3 pb-2">
        <motion.button
          type="button"
          whileTap={{ scale: 0.98 }}
          onClick={() => setActive(null)}
          className="group/new flex h-9 items-center gap-2.5 rounded-xl border bg-background/60 px-3 text-sm font-medium shadow-[0_1px_1px_rgb(0_0_0/0.03)] transition-colors outline-none hover:bg-background focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <SquarePenIcon className="size-4 text-brand transition-transform duration-300 ease-out-expo group-hover/new:-rotate-12" />
          New chat
          <kbd className="ml-auto font-sans text-[0.7rem] tracking-wide text-muted-foreground/80 max-md:hidden">
            {MOD_KEY}⇧O
          </kbd>
        </motion.button>
        <div className="group/search relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Escape" && setQuery("")}
            placeholder="Search chats"
            aria-label="Search chats"
            className="h-8 w-full rounded-lg bg-transparent pr-8 pl-8.5 text-sm transition-colors outline-none placeholder:text-muted-foreground/80 hover:bg-sidebar-accent/50 focus:bg-sidebar-accent/70"
          />
          <AnimatePresence>
            {query && (
              <motion.button
                type="button"
                aria-label="Clear search"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6 }}
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-1.5 grid size-5 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
              >
                <XIcon className="size-3" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Conversations */}
      <nav
        aria-label="Conversations"
        className="scroll-thin min-h-0 flex-1 overflow-y-auto px-3 pb-3 mask-b-from-[calc(100%-1.5rem)]"
      >
        <LayoutGroup>
          <AnimatePresence initial={false} mode="popLayout">
            {groups.map((group) => (
              <motion.section
                key={group.label}
                layout="position"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={easeOut}
                className="pt-3"
              >
                <h3 className="px-2.5 pb-1 text-[0.7rem] font-medium tracking-wide text-muted-foreground/80 uppercase">
                  {group.label}
                </h3>
                <ul className="flex flex-col gap-px">
                  <AnimatePresence initial={false} mode="popLayout">
                    {group.items.map((c) => (
                      <ConversationItem
                        key={c.id}
                        conversation={c}
                        onDelete={() => setPendingDelete(c.id)}
                      />
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.section>
            ))}
          </AnimatePresence>
        </LayoutGroup>

        <AnimatePresence>
          {groups.length === 0 && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="px-2.5 pt-8 text-center text-sm text-balance text-muted-foreground"
            >
              {query
                ? "No chats match your search."
                : "Your conversations will appear here."}
            </motion.p>
          )}
        </AnimatePresence>
      </nav>

      <SidebarFooter />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this chat?</AlertDialogTitle>
            <AlertDialogDescription>
              &ldquo;{deleting?.title ?? "This chat"}&rdquo; will be removed
              from this browser. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) {
                  stop(pendingDelete)
                  removeConversation(pendingDelete)
                }
                setPendingDelete(null)
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

const ConversationItem = memo(function ConversationItem({
  conversation,
  onDelete,
}: {
  conversation: Conversation
  onDelete: () => void
}) {
  const active = useChat((s) => s.activeId === conversation.id)
  const generating = useChat((s) => !!s.generating[conversation.id])
  const [renaming, setRenaming] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <motion.li
      layout="position"
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -10, transition: { duration: 0.16 } }}
      transition={spring}
      className="group/item relative"
    >
      {active && (
        <motion.span
          layoutId="active-conversation"
          transition={spring}
          className="absolute inset-0 rounded-lg bg-sidebar-accent shadow-[inset_0_0_0_1px_color-mix(in_oklch,var(--foreground)_4%,transparent)]"
        />
      )}
      {renaming ? (
        <RenameInput
          initial={conversation.title}
          onDone={(title) => {
            if (title !== null) renameConversation(conversation.id, title)
            setRenaming(false)
          }}
        />
      ) : (
        <button
          type="button"
          onClick={() => setActive(conversation.id)}
          onDoubleClick={() => setRenaming(true)}
          aria-current={active ? "page" : undefined}
          className={cn(
            "relative flex h-8.5 w-full items-center gap-2 rounded-lg px-2.5 text-left text-[0.8125rem] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
            active
              ? "text-sidebar-accent-foreground"
              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          )}
        >
          <AnimatePresence initial={false}>
            {generating && (
              <motion.span
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 6, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                className="relative -mr-0.5 flex size-1.5 shrink-0"
              >
                <span className="absolute inset-0 animate-ping rounded-full bg-brand opacity-60" />
                <span className="relative size-1.5 rounded-full bg-brand" />
              </motion.span>
            )}
          </AnimatePresence>
          <span className="relative min-w-0 flex-1 overflow-hidden whitespace-nowrap mask-r-from-[calc(100%-1.5rem)]">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={conversation.title}
                className="block"
                initial={{ opacity: 0, filter: "blur(4px)", y: 4 }}
                animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                exit={{ opacity: 0, filter: "blur(4px)", y: -4 }}
                transition={easeOut}
              >
                {conversation.title}
              </motion.span>
            </AnimatePresence>
          </span>
        </button>
      )}

      {!renaming && (
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            aria-label="Chat options"
            className={cn(
              "absolute top-1/2 right-1 grid size-6.5 -translate-y-1/2 place-items-center rounded-md text-muted-foreground opacity-0 transition-[opacity,background-color] outline-none group-hover/item:opacity-100 hover:bg-sidebar-border/60 hover:text-foreground focus-visible:opacity-100 data-popup-open:bg-sidebar-border/60 data-popup-open:opacity-100 max-md:opacity-100",
              active && "opacity-100"
            )}
          >
            <MoreHorizontalIcon className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            side="right"
            sideOffset={6}
            className="w-40 rounded-xl p-1"
          >
            <DropdownMenuItem onClick={() => setRenaming(true)}>
              <PencilIcon />
              Rename
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={onDelete}>
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </motion.li>
  )
})

function RenameInput({
  initial,
  onDone,
}: {
  initial: string
  onDone: (title: string | null) => void
}) {
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  const done = useRef(false)

  useEffect(() => {
    // Wait a frame so the closing menu doesn't steal focus back.
    const frame = requestAnimationFrame(() => {
      ref.current?.focus()
      ref.current?.select()
    })
    return () => cancelAnimationFrame(frame)
  }, [])

  const finish = (title: string | null) => {
    if (done.current) return
    done.current = true
    onDone(title)
  }

  return (
    <input
      ref={ref}
      value={value}
      aria-label="Chat title"
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => finish(value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") finish(value)
        if (e.key === "Escape") finish(null)
      }}
      className="relative h-8.5 w-full rounded-lg bg-background px-2.5 text-[0.8125rem] ring-2 ring-brand/40 outline-none"
    />
  )
}

function SidebarFooter() {
  const status = useChat((s) => s.modelsStatus)
  const version = useChat((s) => s.ollamaVersion)
  const host = useChat((s) => s.ollamaHost)
  const count = useChat((s) => s.models.length)
  const online = status === "ready" || (status === "loading" && !!version)

  return (
    <div className="flex shrink-0 items-center justify-between gap-2 border-t border-sidebar-border px-3 py-2.5">
      <button
        type="button"
        onClick={() => void refreshModels()}
        title={host ? `${host} — click to refresh` : "Click to refresh"}
        className="flex min-w-0 items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs transition-colors hover:bg-sidebar-accent/60"
      >
        <span
          className={cn(
            "size-1.5 shrink-0 rounded-full transition-colors",
            status === "error"
              ? "bg-destructive"
              : online
                ? "bg-success shadow-[0_0_0_3px_color-mix(in_oklch,var(--success)_20%,transparent)]"
                : "bg-muted-foreground/40"
          )}
        />
        <span className="min-w-0 truncate">
          <span className="font-medium">
            {status === "error" ? "Ollama offline" : "Ollama"}
          </span>
          {online && (
            <span className="text-muted-foreground">
              {version ? ` ${version}` : ""} · {count} model
              {count === 1 ? "" : "s"}
            </span>
          )}
        </span>
      </button>
      <ThemeToggle />
    </div>
  )
}
