"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export function useChatScroll(deps: unknown[]) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const isAtBottomRef = useRef(true)

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
    setIsAtBottom(true)
    isAtBottomRef.current = true
  }, [])

  // 스크롤 위치 감지
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const handleScroll = () => {
      const threshold = 50
      const atBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight < threshold
      setIsAtBottom(atBottom)
      isAtBottomRef.current = atBottom
    }

    el.addEventListener("scroll", handleScroll, { passive: true })
    return () => el.removeEventListener("scroll", handleScroll)
  }, [])

  // 새 메시지 시 자동 스크롤 (하단에 있을 때만)
  // MutationObserver와 의도적으로 중복: deps 변화(메시지 추가)와 DOM 변화(스트리밍)를 각각 담당
  useEffect(() => {
    if (isAtBottomRef.current) {
      scrollToBottom()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  // 스트리밍 중 콘텐츠 변화 감지 → 자동 스크롤
  // scrollRef는 동기 렌더링되므로 mount 시점에 항상 사용 가능
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    let rafId: number | null = null
    const observer = new MutationObserver(() => {
      if (isAtBottomRef.current && rafId === null) {
        rafId = requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight
          rafId = null
        })
      }
    })

    observer.observe(el, { childList: true, subtree: true, characterData: true })
    return () => {
      observer.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [])

  return { scrollRef, isAtBottom, scrollToBottom }
}
