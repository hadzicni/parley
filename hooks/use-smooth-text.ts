"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Reveal `text` progressively, at a pace proportional to how far behind the
 * display is. Bursty token streams then read as an even, fluid flow, and the
 * reveal catches up quickly once streaming ends.
 *
 * Text already present on mount is shown immediately.
 */
export function useSmoothText(text: string, streaming: boolean) {
  const [count, setCount] = useState(text.length)
  const countRef = useRef(text.length)

  useEffect(() => {
    let frame = 0
    const tick = () => {
      const current = Math.min(countRef.current, text.length)
      const backlog = text.length - current
      if (backlog <= 0) {
        if (countRef.current !== current) {
          countRef.current = current
          setCount(current)
        }
        return
      }
      const step = Math.max(1, Math.ceil(backlog / (streaming ? 7 : 3)))
      let next = Math.min(text.length, current + step)
      // Never split a surrogate pair (emoji) across frames.
      const code = text.charCodeAt(next - 1)
      if (code >= 0xd800 && code <= 0xdbff && next < text.length) next++
      countRef.current = next
      setCount(next)
      if (next < text.length) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, streaming])

  return count >= text.length ? text : text.slice(0, count)
}
