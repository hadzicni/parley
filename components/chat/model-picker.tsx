"use client"

import { useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "motion/react"
import {
  BrainIcon,
  CheckIcon,
  ChevronDownIcon,
  EyeIcon,
  RefreshCwIcon,
  SearchIcon,
  WrenchIcon,
} from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { refreshModels } from "@/lib/ollama"
import { selectModel, useChat } from "@/lib/store"
import type { OllamaModel } from "@/lib/types"
import { cn } from "@/lib/utils"

function formatBytes(bytes: number) {
  if (!bytes) return null
  const gb = bytes / 1024 ** 3
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${Math.round(bytes / 1024 ** 2)} MB`
}

function splitName(name: string) {
  const [base, tag] = name.split(":")
  return { base, tag: tag && tag !== "latest" ? tag : null }
}

const capabilityIcons = [
  { key: "thinking", label: "Reasoning", icon: BrainIcon },
  { key: "vision", label: "Vision", icon: EyeIcon },
  { key: "tools", label: "Tools", icon: WrenchIcon },
] as const

export function ModelPicker() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [highlight, setHighlight] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)

  const models = useChat((s) => s.models)
  const status = useChat((s) => s.modelsStatus)
  const error = useChat((s) => s.modelsError)
  const current = useChat(
    (s) =>
      s.conversations.find((c) => c.id === s.activeId)?.model ?? s.defaultModel
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q
      ? models.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.details?.family?.toLowerCase().includes(q)
        )
      : models
  }, [models, query])

  const choose = (model: OllamaModel) => {
    selectModel(model.name)
    setOpen(false)
  }

  const offline = status === "error"
  const installed = models.some((m) => m.name === current)
  const { base, tag } = splitName(current ?? "")

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (next) {
          setQuery("")
          setHighlight(Math.max(0, models.findIndex((m) => m.name === current)))
          void refreshModels({ quiet: true })
        }
      }}
    >
      <PopoverTrigger
        className={cn(
          "group/picker flex h-9 max-w-[min(22rem,60vw)] items-center gap-2 rounded-xl px-2.5 text-sm font-medium transition-colors outline-none hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 data-popup-open:bg-accent"
        )}
      >
        <span className="relative flex size-2 shrink-0">
          <span
            className={cn(
              "absolute inset-0 rounded-full",
              offline
                ? "bg-destructive"
                : status === "ready" && installed
                  ? "bg-success"
                  : "bg-muted-foreground/40"
            )}
          />
          {status === "ready" && installed && (
            <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-30 [animation-duration:2.5s]" />
          )}
        </span>
        <span className="truncate">
          {offline ? (
            "Ollama offline"
          ) : current ? (
            <>
              {base}
              {tag && (
                <span className="font-normal text-muted-foreground">:{tag}</span>
              )}
            </>
          ) : status === "ready" ? (
            "No models"
          ) : (
            "Loading models…"
          )}
        </span>
        <ChevronDownIcon className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-300 ease-out-expo group-data-popup-open/picker:rotate-180" />
      </PopoverTrigger>

      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-[min(22rem,calc(100vw-2rem))] gap-0 overflow-hidden rounded-2xl p-0 shadow-xl"
      >
        <div className="flex items-center gap-2 border-b px-3">
          <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setHighlight(0)
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                e.preventDefault()
                const delta = e.key === "ArrowDown" ? 1 : -1
                const next =
                  (highlight + delta + filtered.length) %
                  Math.max(filtered.length, 1)
                setHighlight(next)
                listRef.current
                  ?.querySelector(`[data-index="${next}"]`)
                  ?.scrollIntoView({ block: "nearest" })
              }
              if (e.key === "Enter" && filtered[highlight]) {
                e.preventDefault()
                choose(filtered[highlight])
              }
            }}
            placeholder="Search models"
            className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          <button
            type="button"
            title="Refresh"
            onClick={() => void refreshModels()}
            className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <RefreshCwIcon
              className={cn("size-3.5", status === "loading" && "animate-spin")}
            />
          </button>
        </div>

        <div
          ref={listRef}
          role="listbox"
          className="scroll-thin max-h-80 overflow-y-auto p-1.5"
        >
          {offline ? (
            <div className="px-3 py-6 text-center">
              <p className="text-sm font-medium">Can&apos;t reach Ollama</p>
              <p className="mt-1 text-xs text-muted-foreground">{error}</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-muted-foreground">
              {models.length === 0 ? (
                <>
                  No models installed. Try{" "}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                    ollama pull llama3.2
                  </code>
                </>
              ) : (
                "No matching models"
              )}
            </div>
          ) : (
            filtered.map((model, index) => {
              const selected = model.name === current
              const { base, tag } = splitName(model.name)
              const meta = [
                model.details?.parameter_size,
                model.details?.quantization_level,
                formatBytes(model.size),
              ].filter(Boolean)
              return (
                <button
                  key={model.name}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  data-index={index}
                  onMouseMove={() => setHighlight(index)}
                  onClick={() => choose(model)}
                  className="relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left outline-none"
                >
                  {highlight === index && (
                    <motion.span
                      layoutId="model-highlight"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                      className="absolute inset-0 rounded-xl bg-accent"
                    />
                  )}
                  <span className="relative min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {base}
                        {tag && (
                          <span className="font-normal text-muted-foreground">
                            :{tag}
                          </span>
                        )}
                      </span>
                      {capabilityIcons
                        .filter((c) => model.capabilities?.includes(c.key))
                        .map(({ key, label, icon: Icon }) => (
                          <span
                            key={key}
                            title={label}
                            className="grid size-4 place-items-center rounded text-muted-foreground"
                          >
                            <Icon className="size-3" />
                          </span>
                        ))}
                    </span>
                    {meta.length > 0 && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground tabular-nums">
                        {meta.join(" · ")}
                      </span>
                    )}
                  </span>
                  <AnimatePresence>
                    {selected && (
                      <motion.span
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        className="relative grid size-5 place-items-center rounded-full bg-brand text-brand-foreground"
                      >
                        <CheckIcon className="size-3" strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </button>
              )
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
