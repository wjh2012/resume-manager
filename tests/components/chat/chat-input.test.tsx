import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, fireEvent } from "@testing-library/react"
import { ChatInput } from "@/components/chat/chat-input"

// ─── helpers ─────────────────────────────────────────────────────────────────

interface Props {
  value?: string
  onChange?: (v: string) => void
  onSubmit?: () => void
  isLoading?: boolean
  placeholder?: string
}

function renderInput(overrides: Props = {}) {
  const props = {
    value: "",
    onChange: vi.fn(),
    onSubmit: vi.fn(),
    isLoading: false,
    ...overrides,
  }
  render(<ChatInput {...props} />)
  return props
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("ChatInput", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("렌더링", () => {
    it("textarea를 렌더링해야 한다", () => {
      renderInput()

      expect(screen.getByRole("textbox")).toBeInTheDocument()
    })

    it("전송 버튼을 렌더링해야 한다", () => {
      renderInput()

      expect(screen.getByRole("button")).toBeInTheDocument()
    })

    it("기본 placeholder를 표시해야 한다", () => {
      renderInput()

      expect(screen.getByPlaceholderText("메시지를 입력하세요...")).toBeInTheDocument()
    })

    it("커스텀 placeholder를 표시해야 한다", () => {
      renderInput({ placeholder: "여기에 입력하세요" })

      expect(screen.getByPlaceholderText("여기에 입력하세요")).toBeInTheDocument()
    })

    it("value prop이 textarea에 반영되어야 한다", () => {
      renderInput({ value: "미리 입력된 텍스트" })

      expect(screen.getByRole<HTMLTextAreaElement>("textbox").value).toBe("미리 입력된 텍스트")
    })
  })

  describe("onChange", () => {
    it("텍스트 입력 시 onChange가 호출되어야 한다", () => {
      const props = renderInput()

      fireEvent.change(screen.getByRole("textbox"), { target: { value: "새 텍스트" } })

      expect(props.onChange).toHaveBeenCalledWith("새 텍스트")
    })
  })

  describe("Enter 키 제출", () => {
    it("Enter 키를 누르면 onSubmit이 호출되어야 한다", () => {
      const props = renderInput({ value: "제출할 텍스트" })

      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", shiftKey: false })

      expect(props.onSubmit).toHaveBeenCalledTimes(1)
    })

    it("Shift+Enter는 onSubmit을 호출하지 않아야 한다", () => {
      const props = renderInput({ value: "여러 줄 입력" })

      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", shiftKey: true })

      expect(props.onSubmit).not.toHaveBeenCalled()
    })

    it("value가 공백만 있으면 Enter 키로 onSubmit이 호출되지 않아야 한다", () => {
      const props = renderInput({ value: "   " })

      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", shiftKey: false })

      expect(props.onSubmit).not.toHaveBeenCalled()
    })

    it("isLoading 중에는 Enter 키로 onSubmit이 호출되지 않아야 한다", () => {
      const props = renderInput({ value: "로딩 중 입력", isLoading: true })

      fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter", shiftKey: false })

      expect(props.onSubmit).not.toHaveBeenCalled()
    })
  })

  describe("버튼 클릭 제출", () => {
    it("버튼 클릭 시 onSubmit이 호출되어야 한다", () => {
      const props = renderInput({ value: "버튼으로 제출" })

      fireEvent.click(screen.getByRole("button"))

      expect(props.onSubmit).toHaveBeenCalledTimes(1)
    })
  })

  describe("비활성화 상태", () => {
    it("value가 비어 있으면 버튼이 비활성화되어야 한다", () => {
      renderInput({ value: "" })

      expect(screen.getByRole("button")).toBeDisabled()
    })

    it("value가 공백만 있으면 버튼이 비활성화되어야 한다", () => {
      renderInput({ value: "   " })

      expect(screen.getByRole("button")).toBeDisabled()
    })

    it("isLoading이 true이면 버튼이 비활성화되어야 한다", () => {
      renderInput({ value: "입력 중", isLoading: true })

      expect(screen.getByRole("button")).toBeDisabled()
    })

    it("isLoading이 true이면 textarea가 비활성화되어야 한다", () => {
      renderInput({ isLoading: true })

      expect(screen.getByRole("textbox")).toBeDisabled()
    })

    it("value가 있고 isLoading이 false이면 버튼이 활성화되어야 한다", () => {
      renderInput({ value: "전송 가능한 텍스트" })

      expect(screen.getByRole("button")).not.toBeDisabled()
    })
  })
})
