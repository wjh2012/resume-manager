import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import type { UIMessage } from "ai"

vi.mock("react-markdown", () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>,
}))

vi.mock("remark-gfm", () => ({ default: {} }))

import { ChatMessage } from "@/components/chat/chat-message"

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeUserMessage(text: string): UIMessage {
  return {
    id: "msg-user-1",
    role: "user",
    parts: [{ type: "text", text }],
  }
}

function makeAssistantMessage(text: string): UIMessage {
  return {
    id: "msg-assistant-1",
    role: "assistant",
    parts: [{ type: "text", text }],
  }
}

function makeEmptyMessage(): UIMessage {
  return {
    id: "msg-empty",
    role: "user",
    parts: [],
  }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("ChatMessage", () => {
  describe("사용자 메시지", () => {
    it("텍스트 파트의 내용을 렌더링해야 한다", () => {
      render(<ChatMessage message={makeUserMessage("안녕하세요")} />)

      expect(screen.getByText("안녕하세요")).toBeInTheDocument()
    })

    it("<p> 태그로 plain text를 렌더링해야 한다 (Markdown 없음)", () => {
      render(<ChatMessage message={makeUserMessage("일반 텍스트")} />)

      const p = screen.getByText("일반 텍스트")
      expect(p.tagName).toBe("P")
    })

    it("markdown 컴포넌트를 사용하지 않아야 한다", () => {
      render(<ChatMessage message={makeUserMessage("**굵은글씨**")} />)

      expect(screen.queryByTestId("markdown")).not.toBeInTheDocument()
    })
  })

  describe("어시스턴트 메시지", () => {
    it("텍스트 파트의 내용을 렌더링해야 한다", () => {
      render(<ChatMessage message={makeAssistantMessage("도움이 필요하신가요?")} />)

      expect(screen.getByTestId("markdown")).toBeInTheDocument()
      expect(screen.getByTestId("markdown")).toHaveTextContent("도움이 필요하신가요?")
    })

    it("Markdown 컴포넌트를 사용해야 한다", () => {
      render(<ChatMessage message={makeAssistantMessage("**굵은글씨**")} />)

      expect(screen.getByTestId("markdown")).toBeInTheDocument()
    })
  })

  describe("텍스트 파트가 없는 메시지", () => {
    it("parts 배열이 비어 있으면 null을 반환해야 한다", () => {
      const { container } = render(<ChatMessage message={makeEmptyMessage()} />)

      expect(container.firstChild).toBeNull()
    })

    it("텍스트 타입이 아닌 파트만 있으면 null을 반환해야 한다", () => {
      const message: UIMessage = {
        id: "msg-no-text",
        role: "user",
        parts: [{ type: "tool-invocation" } as never],
      }

      const { container } = render(<ChatMessage message={message} />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe("여러 텍스트 파트 병합", () => {
    it("여러 텍스트 파트를 하나로 이어 붙여야 한다", () => {
      const message: UIMessage = {
        id: "msg-multi",
        role: "user",
        parts: [
          { type: "text", text: "첫 번째 " },
          { type: "text", text: "두 번째" },
        ],
      }

      render(<ChatMessage message={message} />)

      expect(screen.getByText("첫 번째 두 번째")).toBeInTheDocument()
    })
  })
})
