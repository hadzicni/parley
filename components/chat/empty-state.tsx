"use client"

import { useState } from "react"
import { motion } from "motion/react"
import {
  CodeIcon,
  FeatherIcon,
  LightbulbIcon,
  MapIcon,
  RefreshCwIcon,
  TerminalIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { LogoMark } from "@/components/chat/logo"
import { easeOut } from "@/components/chat/motion"
import { sendMessage } from "@/lib/chat"
import { refreshModels } from "@/lib/ollama"
import { useChat } from "@/lib/store"

function greeting(hour: number) {
  if (hour < 5) return "Burning the midnight oil"
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

export function Hero() {
  const status = useChat((s) => s.modelsStatus)
  const error = useChat((s) => s.modelsError)
  const host = useChat((s) => s.ollamaHost)
  const hasModels = useChat((s) => s.models.length > 0)
  const model = useChat((s) => s.defaultModel)
  const [hello] = useState(() => greeting(new Date().getHours()))

  const stagger = (i: number) => ({
    initial: { opacity: 0, y: 14, filter: "blur(6px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { ...easeOut, duration: 0.7, delay: 0.05 + i * 0.07 },
  })

  return (
    <div className="flex w-full max-w-2xl flex-col items-center text-center">
      <motion.div {...stagger(0)} className="mb-6">
        <LogoMark animated className="size-11" />
      </motion.div>
      <motion.h1
        {...stagger(1)}
        className="font-serif text-[2.6rem] leading-[1.05] tracking-tight text-balance sm:text-[3.4rem]"
      >
        {hello}
        <span className="text-brand">.</span>
      </motion.h1>

      {status === "error" ? (
        <motion.div
          {...stagger(2)}
          className="mt-6 w-full max-w-md rounded-2xl border bg-card p-4 text-left shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-destructive/10 text-destructive">
              <TerminalIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Ollama isn&apos;t reachable</p>
              <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                {error ?? `Couldn't connect to ${host ?? "localhost:11434"}.`}{" "}
                Start it, and Parley will connect automatically.
              </p>
              <code className="mt-3 block rounded-lg bg-muted px-3 py-2 font-mono text-xs">
                ollama serve
              </code>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={() => void refreshModels()}
          >
            <RefreshCwIcon />
            Try again
          </Button>
        </motion.div>
      ) : status === "ready" && !hasModels ? (
        <motion.div
          {...stagger(2)}
          className="mt-5 text-[0.95rem] text-muted-foreground"
        >
          You don&apos;t have any models yet. Pull one to get started:
          <code className="mx-auto mt-3 block w-fit rounded-lg border bg-card px-3 py-2 font-mono text-xs text-foreground">
            ollama pull llama3.2
          </code>
        </motion.div>
      ) : (
        <motion.p
          {...stagger(2)}
          className="mt-4 text-[0.95rem] text-balance text-muted-foreground"
        >
          What&apos;s on your mind?{" "}
          {model && (
            <>
              <span className="font-medium text-foreground/80">{model}</span>{" "}
              is ready, running entirely on your machine.
            </>
          )}
        </motion.p>
      )}
    </div>
  )
}

const suggestions = [
  {
    icon: LightbulbIcon,
    label: "Explain an idea",
    prompt: "Explain how large language models work, as if I were a curious 12-year-old.",
  },
  {
    icon: FeatherIcon,
    label: "Write a poem",
    prompt: "Write a short, vivid poem about the first rain after a long summer.",
  },
  {
    icon: MapIcon,
    label: "Plan a trip",
    prompt: "Plan a relaxed 3-day itinerary for Lisbon, with food recommendations.",
  },
  {
    icon: CodeIcon,
    label: "Write some code",
    prompt: "Write a TypeScript function that debounces another function, with a short explanation.",
  },
]

export function Suggestions() {
  const ready = useChat(
    (s) =>
      s.modelsStatus !== "error" &&
      s.models.some((m) => m.name === s.defaultModel)
  )
  if (!ready) return null

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {suggestions.map(({ icon: Icon, label, prompt }, i) => (
        <motion.button
          key={label}
          type="button"
          title={prompt}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8, transition: { duration: 0.15 } }}
          transition={{ ...easeOut, duration: 0.6, delay: 0.3 + i * 0.06 }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => sendMessage(null, prompt)}
          className="group/s flex h-9 items-center gap-2 rounded-full border bg-card/60 px-3.5 text-[0.8125rem] text-muted-foreground shadow-[0_1px_2px_rgb(0_0_0/0.03)] transition-colors hover:border-brand/30 hover:bg-card hover:text-foreground"
        >
          <Icon className="size-3.5 transition-colors group-hover/s:text-brand" />
          {label}
        </motion.button>
      ))}
    </div>
  )
}
