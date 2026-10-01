"use client"

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"

const THRESHOLD = 64

/**
 * Keep a scroll container pinned to the bottom while its content grows,
 * until the user scrolls up. Scrolling back down re-pins it.
 */
export function useStickToBottom(enabled: boolean) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const stickRef = useRef(true)
  const [showJump, setShowJump] = useState(false)

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (enabled && el) el.scrollTop = el.scrollHeight
  }, [enabled])

  useEffect(() => {
    const el = scrollRef.current
    const content = contentRef.current
    if (!enabled || !el || !content) return

    let lastTop = el.scrollTop
    const distance = () => el.scrollHeight - el.scrollTop - el.clientHeight

    const onScroll = () => {
      const near = distance() < THRESHOLD
      if (near) stickRef.current = true
      else if (el.scrollTop < lastTop - 1) stickRef.current = false
      lastTop = el.scrollTop
      setShowJump(!near && !stickRef.current)
    }
    const onWheel = (event: WheelEvent) => {
      if (event.deltaY < 0 && el.scrollHeight > el.clientHeight) {
        stickRef.current = false
      }
    }
    let touchY = 0
    const onTouchStart = (event: TouchEvent) => {
      touchY = event.touches[0]?.clientY ?? 0
    }
    const onTouchMove = (event: TouchEvent) => {
      if ((event.touches[0]?.clientY ?? 0) > touchY + 4) stickRef.current = false
    }
    const follow = () => {
      if (stickRef.current) {
        el.scrollTop = el.scrollHeight
        lastTop = el.scrollTop
      }
    }

    const observer = new ResizeObserver(follow)
    observer.observe(content)
    observer.observe(el)
    el.addEventListener("scroll", onScroll, { passive: true })
    el.addEventListener("wheel", onWheel, { passive: true })
    el.addEventListener("touchstart", onTouchStart, { passive: true })
    el.addEventListener("touchmove", onTouchMove, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener("scroll", onScroll)
      el.removeEventListener("wheel", onWheel)
      el.removeEventListener("touchstart", onTouchStart)
      el.removeEventListener("touchmove", onTouchMove)
    }
  }, [enabled])

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const el = scrollRef.current
    if (!el) return
    stickRef.current = true
    setShowJump(false)
    el.scrollTo({ top: el.scrollHeight, behavior })
  }, [])

  return { scrollRef, contentRef, showJump, scrollToBottom }
}
