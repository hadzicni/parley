"use client"

import { useEffect, type CSSProperties } from "react"
import { motion, useMotionValue, useSpring, useTransform } from "motion/react"
import { cn } from "@/lib/utils"

/** A tiny planet: a spinning conic gradient with a specular highlight. */
export function Orb({
  className,
  active = false,
  glow = "14px",
}: {
  className?: string
  /** Spin fast, e.g. while a reply is being generated. */
  active?: boolean
  glow?: string
}) {
  return (
    <span
      aria-hidden
      data-active={active}
      className={cn("orb inline-block size-6 shrink-0", className)}
      style={{ "--orb-blur": glow } as CSSProperties}
    >
      <span className="orb-glow" />
      <span className="orb-core" />
    </span>
  )
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "font-display text-[1.05rem] leading-none font-medium tracking-[-0.04em]",
        className
      )}
    >
      parley
    </span>
  )
}

function Ring({
  tilt,
  duration,
  reverse = false,
  moon,
  className,
}: {
  tilt: string
  duration: number
  reverse?: boolean
  moon: string
  className?: string
}) {
  return (
    <div
      className="absolute inset-0 [transform-style:preserve-3d]"
      style={{ transform: tilt }}
    >
      <div className={cn("absolute inset-0 rounded-full border", className)} />
      <div
        className="absolute inset-0 [transform-style:preserve-3d]"
        style={{
          animation: `orbit ${duration}s linear infinite`,
          animationDirection: reverse ? "reverse" : "normal",
        }}
      >
        <span
          className="absolute top-0 left-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            background: moon,
            boxShadow: `0 0 12px 2px ${moon}`,
          }}
        />
      </div>
    </div>
  )
}

/** The hero planet: orb, two tilted orbits, and a tilt that follows the cursor. */
export function HeroOrb({ active = false }: { active?: boolean }) {
  const px = useMotionValue(0)
  const py = useMotionValue(0)
  const x = useSpring(px, { stiffness: 50, damping: 14 })
  const y = useSpring(py, { stiffness: 50, damping: 14 })
  const rotateX = useTransform(y, (v) => -v * 0.9)
  const rotateY = useTransform(x, (v) => v * 0.9)

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      px.set((event.clientX / window.innerWidth - 0.5) * 24)
      py.set((event.clientY / window.innerHeight - 0.5) * 24)
    }
    window.addEventListener("pointermove", onMove, { passive: true })
    return () => window.removeEventListener("pointermove", onMove)
  }, [px, py])

  return (
    <div className="relative size-40 [perspective:700px] sm:size-44">
      <motion.div
        style={{ x, y, rotateX, rotateY }}
        className="absolute inset-0 [transform-style:preserve-3d]"
      >
        <Ring
          tilt="rotateX(74deg) rotateY(-12deg)"
          duration={7}
          moon="var(--brand-2)"
          className="border-brand-2/25"
        />
        <div className="absolute inset-[24%] [transform:translateZ(0)]">
          <Orb active={active} glow="30px" className="size-full" />
        </div>
        <Ring
          tilt="rotateX(66deg) rotateY(28deg) scale(1.22)"
          duration={12}
          reverse
          moon="var(--brand-3)"
          className="border-dashed border-brand-3/20"
        />
      </motion.div>
    </div>
  )
}
