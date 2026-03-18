import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { ChatLoading } from "@/components/chat/chat-loading"

describe("ChatLoading", () => {
  describe("렌더링", () => {
    it("애니메이션 점 세 개를 렌더링해야 한다", () => {
      const { container } = render(<ChatLoading />)

      // Three animated bounce spans
      const dots = container.querySelectorAll("span.animate-bounce")
      expect(dots).toHaveLength(3)
    })

    it("각 점이 서로 다른 animationDelay를 가져야 한다", () => {
      const { container } = render(<ChatLoading />)

      const dots = Array.from(container.querySelectorAll("span.animate-bounce"))
      const delays = dots.map((el) => (el as HTMLElement).style.animationDelay)

      expect(delays).toContain("0ms")
      expect(delays).toContain("150ms")
      expect(delays).toContain("300ms")
    })

    it("점들이 rounded-full 클래스를 가져야 한다", () => {
      const { container } = render(<ChatLoading />)

      const dots = container.querySelectorAll("span.rounded-full")
      expect(dots).toHaveLength(3)
    })
  })
})
