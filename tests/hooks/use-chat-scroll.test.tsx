import { describe, it, expect, afterEach } from "vitest"
import { renderHook, act, render, cleanup } from "@testing-library/react"
import React, { useEffect, useRef } from "react"
import { useChatScroll } from "@/hooks/use-chat-scroll"

afterEach(() => { cleanup() })

// jsdom은 layout geometry를 구현하지 않음 — 패치
function patchGeometry(
  el: HTMLElement,
  opts: { scrollHeight: number; clientHeight: number; scrollTop?: number },
) {
  Object.defineProperty(el, "scrollHeight", { configurable: true, value: opts.scrollHeight })
  Object.defineProperty(el, "clientHeight", { configurable: true, value: opts.clientHeight })
  el.scrollTop = opts.scrollTop ?? 0
}

// ─── Wrapper: useEffect로 결과를 캡처하여 lint 안전하게 처리 ─────────

interface HookResult {
  isAtBottom: boolean
  scrollToBottom: () => void
}

function HookWrapper({
  deps,
  resultRef,
}: {
  deps: unknown[]
  resultRef: React.MutableRefObject<HookResult | undefined>
}) {
  const hookResult = useChatScroll(deps)
  const divRef = useRef<HTMLDivElement>(null)

  // ref를 hook의 scrollRef에 동기화
  useEffect(() => {
    (hookResult.scrollRef as React.MutableRefObject<HTMLDivElement | null>).current = divRef.current
  })

  useEffect(() => {
    resultRef.current = {
      isAtBottom: hookResult.isAtBottom,
      scrollToBottom: hookResult.scrollToBottom,
    }
  })

  return (
    <div
      data-testid="scroll-container"
      ref={divRef}
      style={{ overflow: "auto", height: 200 }}
    />
  )
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("useChatScroll()", () => {
  describe("초기 상태", () => {
    it("isAtBottom이 true로 초기화되어야 한다", () => {
      const { result } = renderHook(() => useChatScroll([]))

      expect(result.current.isAtBottom).toBe(true)
    })

    it("scrollRef가 null로 초기화되어야 한다 (renderHook — DOM 없음)", () => {
      const { result } = renderHook(() => useChatScroll([]))

      expect(result.current.scrollRef.current).toBeNull()
    })
  })

  describe("scrollToBottom()", () => {
    it("scrollRef가 없으면 아무 작업도 하지 않아야 한다", () => {
      const { result } = renderHook(() => useChatScroll([]))

      expect(() => act(() => { result.current.scrollToBottom() })).not.toThrow()
    })
  })

  describe("스크롤 이벤트 — isAtBottom 계산", () => {
    it("스크롤이 하단 임계값(50px) 이내이면 isAtBottom이 true가 되어야 한다", () => {
      const resultRef: React.MutableRefObject<HookResult | undefined> = { current: undefined }
      const { getByTestId } = render(
        <HookWrapper deps={[]} resultRef={resultRef} />,
      )

      const div = getByTestId("scroll-container") as HTMLDivElement
      patchGeometry(div, { scrollHeight: 500, clientHeight: 200, scrollTop: 460 })

      act(() => { div.dispatchEvent(new Event("scroll")) })

      expect(resultRef.current!.isAtBottom).toBe(true)
    })

    it("초기 상태에서 isAtBottom은 true여야 한다", () => {
      const resultRef: React.MutableRefObject<HookResult | undefined> = { current: undefined }
      render(
        <HookWrapper deps={[]} resultRef={resultRef} />,
      )

      expect(resultRef.current!.isAtBottom).toBe(true)
    })
  })
})
