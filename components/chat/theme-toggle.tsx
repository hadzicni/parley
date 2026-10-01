"use client"

import { motion } from "motion/react"
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { setTheme, useTheme, type Theme } from "@/lib/theme"
import { spring } from "@/components/chat/motion"
import { cn } from "@/lib/utils"

const options: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "light", label: "Light", icon: SunIcon },
  { value: "dark", label: "Dark", icon: MoonIcon },
  { value: "system", label: "System", icon: MonitorIcon },
]

export function ThemeToggle() {
  const theme = useTheme()
  return (
    <div
      role="radiogroup"
      aria-label="Theme"
      className="flex items-center gap-0.5 rounded-full bg-sidebar-accent/70 p-0.5"
    >
      {options.map(({ value, label, icon: Icon }) => {
        const active = theme === value
        return (
          <button
            key={value}
            role="radio"
            aria-checked={active}
            aria-label={label}
            title={label}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect()
              setTheme(value, {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
              })
            }}
            className={cn(
              "relative grid size-6 place-items-center rounded-full text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50",
              active && "text-foreground"
            )}
          >
            {active && (
              <motion.span
                layoutId="theme-pill"
                transition={spring}
                className="absolute inset-0 rounded-full bg-background shadow-sm ring-1 ring-foreground/5"
              />
            )}
            <Icon className="relative size-3.5" />
          </button>
        )
      })}
    </div>
  )
}
