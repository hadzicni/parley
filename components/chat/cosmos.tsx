"use client"

import { useEffect, useRef } from "react"

const STAR_COUNT = 260
const DEPTH = 1000
const SPEED = 0.012 // depth units per ms
const TINTS = [
  [255, 255, 255],
  [255, 255, 255],
  [255, 255, 255],
  [196, 181, 253], // violet
  [165, 243, 252], // cyan
  [249, 168, 212], // pink
] as const

interface Star {
  x: number
  y: number
  z: number
  tint: (typeof TINTS)[number]
  phase: number
}

interface Meteor {
  x: number
  y: number
  vx: number
  vy: number
  life: number
}

/**
 * The backdrop: drifting nebulae, a 3D starfield with mouse parallax,
 * and the occasional shooting star.
 */
export function Cosmos() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const spotlightRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const spotlight = spotlightRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !spotlight) return

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    let width = 0
    let height = 0
    let dpr = 1

    const spawn = (star: Partial<Star> = {}): Star => ({
      x: (Math.random() * 2 - 1) * DEPTH,
      y: (Math.random() * 2 - 1) * DEPTH,
      z: Math.random() * DEPTH,
      tint: TINTS[Math.floor(Math.random() * TINTS.length)],
      phase: Math.random() * Math.PI * 2,
      ...star,
    })
    const stars = Array.from({ length: STAR_COUNT }, () => spawn())
    const meteors: Meteor[] = []

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }
    resize()

    // Pointer: parallax for the stars, position for the spotlight.
    const pointer = { x: width / 2, y: height / 2 }
    const eased = { x: width / 2, y: height / 2 }
    const onPointerMove = (event: PointerEvent) => {
      pointer.x = event.clientX
      pointer.y = event.clientY
    }

    let nextMeteor = performance.now() + 3000 + Math.random() * 5000
    let last = performance.now()
    let frame = 0

    const draw = (now: number) => {
      const dt = Math.min(now - last, 50)
      last = now

      const dark = document.documentElement.classList.contains("dark")
      ctx.clearRect(0, 0, width, height)

      const speed = reduced ? 0 : SPEED

      eased.x += (pointer.x - eased.x) * 0.04
      eased.y += (pointer.y - eased.y) * 0.04
      const cx = width / 2 - (eased.x - width / 2) * 0.04
      const cy = height / 2 - (eased.y - height / 2) * 0.04
      const focal = Math.max(width, height) * 0.5

      spotlight.style.transform = `translate3d(${eased.x}px, ${eased.y}px, 0)`

      for (const star of stars) {
        star.z -= speed * dt
        if (star.z <= 1) {
          Object.assign(star, spawn({ z: DEPTH }))
          continue
        }
        const sx = cx + (star.x / star.z) * focal
        const sy = cy + (star.y / star.z) * focal
        if (sx < -50 || sx > width + 50 || sy < -50 || sy > height + 50) {
          Object.assign(star, spawn({ z: DEPTH * (0.6 + Math.random() * 0.4) }))
          continue
        }
        const closeness = 1 - star.z / DEPTH
        const twinkle = 0.65 + 0.35 * Math.sin(now * 0.002 + star.phase)
        const alpha = Math.min(1, closeness * 1.3) * twinkle * (dark ? 1 : 0.5)
        const [r, g, b] = dark ? star.tint : [124, 92, 230]

        const size = Math.max(0.5, closeness * 2.4)
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size)
        if (closeness > 0.82 && dark) {
          // A soft halo on the nearest stars.
          ctx.fillStyle = `rgba(${r},${g},${b},${alpha * 0.12})`
          ctx.beginPath()
          ctx.arc(sx, sy, size * 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Shooting stars.
      if (!reduced && dark && now > nextMeteor) {
        nextMeteor = now + 5000 + Math.random() * 9000
        const angle = Math.PI * (0.15 + Math.random() * 0.2)
        const velocity = 0.9 + Math.random() * 0.6
        meteors.push({
          x: Math.random() * width * 0.8,
          y: Math.random() * height * 0.35,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 1,
        })
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i]
        m.x += m.vx * dt
        m.y += m.vy * dt
        m.life -= dt / 900
        if (m.life <= 0) {
          meteors.splice(i, 1)
          continue
        }
        const tail = 140 * m.life
        const gradient = ctx.createLinearGradient(
          m.x,
          m.y,
          m.x - m.vx * tail,
          m.y - m.vy * tail
        )
        gradient.addColorStop(0, `rgba(255,255,255,${m.life})`)
        gradient.addColorStop(0.3, `rgba(196,181,253,${m.life * 0.6})`)
        gradient.addColorStop(1, "rgba(165,243,252,0)")
        ctx.strokeStyle = gradient
        ctx.lineWidth = 1.4
        ctx.beginPath()
        ctx.moveTo(m.x, m.y)
        ctx.lineTo(m.x - m.vx * tail, m.y - m.vy * tail)
        ctx.stroke()
      }

      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)

    window.addEventListener("resize", resize)
    window.addEventListener("pointermove", onPointerMove, { passive: true })
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener("resize", resize)
      window.removeEventListener("pointermove", onPointerMove)
    }
  }, [])

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background"
    >
      {/* Nebulae */}
      <div
        className="nebula -top-[20%] -left-[15%] size-[70vmax] opacity-70 dark:opacity-60"
        style={{
          background:
            "radial-gradient(closest-side, var(--nebula-1), transparent)",
          animation: "drift-a 38s ease-in-out infinite",
        }}
      />
      <div
        className="nebula -right-[20%] -bottom-[30%] size-[75vmax] opacity-70 dark:opacity-55"
        style={{
          background:
            "radial-gradient(closest-side, var(--nebula-2), transparent)",
          animation: "drift-b 46s ease-in-out infinite",
        }}
      />
      <div
        className="nebula top-[30%] left-[35%] size-[50vmax] opacity-60 dark:opacity-45"
        style={{
          background:
            "radial-gradient(closest-side, var(--nebula-3), transparent)",
          animation: "drift-c 52s ease-in-out infinite",
        }}
      />

      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* Cursor spotlight */}
      <div
        ref={spotlightRef}
        className="absolute -top-[300px] -left-[300px] size-[600px] rounded-full opacity-40 mix-blend-plus-lighter dark:opacity-25"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklch, var(--brand) 45%, transparent), transparent)",
        }}
      />

      {/* Film grain + vignette */}
      <div className="grain absolute inset-0 opacity-[0.05] mix-blend-overlay dark:opacity-[0.07]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,color-mix(in_oklch,var(--background)_85%,transparent))]" />
    </div>
  )
}
