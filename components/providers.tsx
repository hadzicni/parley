"use client"

import { MotionConfig } from "motion/react"
import { TooltipProvider } from "@/components/ui/tooltip"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delay={500}>{children}</TooltipProvider>
    </MotionConfig>
  )
}
