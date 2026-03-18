import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { useChatScroll } from "@/hooks/use-chat-scroll"

describe("useChatScroll()", () => {
  it("isAtBottom이 true로 초기화되어야 한다", () => {
    const { result } = renderHook(() => useChatScroll([]))

    expect(result.current.isAtBottom).toBe(true)
  })

  it("scrollRef가 null로 초기화되어야 한다 (DOM 미연결 상태)", () => {
    const { result } = renderHook(() => useChatScroll([]))

    expect(result.current.scrollRef.current).toBeNull()
  })

  it("scrollToBottom 함수를 반환해야 한다", () => {
    const { result } = renderHook(() => useChatScroll([]))

    expect(typeof result.current.scrollToBottom).toBe("function")
  })

  it("scrollRef가 없을 때 scrollToBottom 호출이 에러를 발생시키지 않아야 한다", () => {
    const { result } = renderHook(() => useChatScroll([]))

    expect(() => result.current.scrollToBottom()).not.toThrow()
  })
})
