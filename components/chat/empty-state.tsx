"use client"

import { useState } from "react"
import { motion } from "motion/react"
import {
  CodeIcon,
  FeatherIcon,
  LightbulbIcon,
  RefreshCwIcon,
  RocketIcon,
  TerminalIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { HeroOrb, Orb } from "@/components/chat/logo"
import { easeOut } from "@/components/chat/motion"
import { sendMessage } from "@/lib/chat"
import { refreshModels } from "@/lib/ollama"
import { useChat } from "@/lib/store"

function greeting(hour: number) {
  if (hour < 5) return "Hello, night owl"
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

const taglines = [
  "where to next?",
  "what are we exploring?",
  "ready for liftoff.",
  "ask the universe.",
]

function Letters({ text, delay = 0 }: { text: string; delay?: number }) {
  return (
    <span aria-label={text} className="inline-block [perspective:600px]">
      {Array.from(text).map((char, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block origin-bottom"
          initial={{ opacity: 0, y: "0.45em", rotateX: -85, filter: "blur(10px)" }}
          animate={{ opacity: 1, y: 0, rotateX: 0, filter: "blur(0px)" }}
          transition={{
            type: "spring",
            stiffness: 220,
            damping: 20,
            delay: delay + i * 0.032,
          }}
        >
          {char === " " ? " " : char}
        </motion.span>
      ))}
    </span>
  )
}

export function Hero() {
  const status = useChat((s) => s.modelsStatus)
  const error = useChat((s) => s.modelsError)
  const host = useChat((s) => s.ollamaHost)
  const hasModels = useChat((s) => s.models.length > 0)
  const model = useChat((s) => s.defaultModel)
  const [hello] = useState(() => greeting(new Date().getHours()))
  const [tagline] = useState(
    () => taglines[Math.floor(Math.random() * taglines.length)]
  )

  const rise = (delay: number) => ({
    initial: { opacity: 0, y: 16, filter: "blur(8px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: { ...easeOut, duration: 0.9, delay },
  })

  return (
    <div className="flex w-full max-w-2xl flex-col items-center text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.6, filter: "blur(20px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ type: "spring", stiffness: 90, damping: 16 }}
        className="-mb-2"
      >
        <HeroOrb />
      </motion.div>

      <h1 className="font-display text-[2.1rem] leading-none font-medium tracking-[-0.055em] sm:text-[3.3rem]">
        <Letters text={hello} delay={0.15} />
      </h1>
      <motion.p
        {...rise(0.15 + hello.length * 0.032)}
        className="mt-3 font-display text-lg font-light tracking-[-0.03em] sm:text-2xl"
      >
        <span className="text-cosmic">{tagline}</span>
      </motion.p>

      {status === "error" ? (
        <motion.div
          {...rise(0.6)}
          className="glass mt-7 w-full max-w-md rounded-3xl border border-destructive/25 p-4 text-left shadow-[0_0_60px_-20px_var(--destructive)]"
        >
          <div className="flex items-start gap-3">
            <div className="grid size-9 shrink-0 place-items-center rounded-2xl bg-destructive/15 text-destructive">
              <TerminalIcon className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Lost contact with Ollama</p>
              <p className="mt-0.5 text-[0.8125rem] text-muted-foreground">
                {error ?? `Couldn't connect to ${host ?? "localhost:11434"}.`}{" "}
                Start it, and Parley reconnects automatically.
              </p>
              <code className="mt-3 block rounded-xl border bg-code px-3 py-2 font-mono text-xs">
                <span className="text-brand-2">$</span> ollama serve
              </code>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full rounded-xl"
            onClick={() => void refreshModels()}
          >
            <RefreshCwIcon />
            Try again
          </Button>
        </motion.div>
      ) : status === "ready" && !hasModels ? (
        <motion.div
          {...rise(0.6)}
          className="mt-6 text-[0.95rem] text-muted-foreground"
        >
          No models on board yet. Pull one to get started:
          <code className="glass mx-auto mt-3 block w-fit rounded-xl border px-3 py-2 font-mono text-xs text-foreground">
            <span className="text-brand-2">$</span> ollama pull llama3.2
          </code>
        </motion.div>
      ) : (
        model && (
          <motion.div
            {...rise(0.7)}
            className="glass mt-6 inline-flex items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-2 text-xs text-muted-foreground"
          >
            <Orb className="size-3.5" glow="6px" />
            <span className="font-medium text-foreground">{model}</span>
            <span className="size-1 rounded-full bg-success shadow-[0_0_8px_var(--success)]" />
            running locally
          </motion.div>
        )
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
    prompt: "Write a short, vivid poem about drifting through a nebula.",
  },
  {
    icon: RocketIcon,
    label: "Plan a mission",
    prompt: "Plan a realistic crewed mission to Mars: timeline, crew, and the biggest risks.",
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
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9, transition: { duration: 0.15 } }}
          transition={{ type: "spring", stiffness: 260, damping: 20, delay: 0.9 + i * 0.07 }}
          whileHover={{ y: -3, scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => sendMessage(null, prompt)}
          className="glass group/s relative flex h-9 items-center gap-2 overflow-hidden rounded-full border px-3.5 text-[0.8125rem] text-muted-foreground transition-[color,border-color,box-shadow] duration-300 hover:border-brand/40 hover:text-foreground hover:shadow-[0_0_24px_-6px_var(--brand)]"
        >
          <span className="absolute inset-0 bg-cosmic opacity-0 transition-opacity duration-300 group-hover/s:opacity-15" />
          <Icon className="relative size-3.5 transition-colors duration-300 group-hover/s:text-brand-2" />
          <span className="relative">{label}</span>
        </motion.button>
      ))}
    </div>
  )
}
