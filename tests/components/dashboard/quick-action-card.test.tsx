import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { QuickActionCard } from "@/components/dashboard/quick-action-card"

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

// ─── stub icon ───────────────────────────────────────────────────────────────

function StubIcon({ "aria-hidden": ariaHidden }: { "aria-hidden"?: string | boolean }) {
  return <svg data-testid="action-icon" aria-hidden={ariaHidden as boolean | undefined} />
}

// ─── helpers ─────────────────────────────────────────────────────────────────

interface Props {
  title?: string
  description?: string
  href?: string
}

function renderCard(overrides: Props = {}) {
  const props = {
    icon: StubIcon,
    title: "자기소개서 작성",
    description: "새 자기소개서를 작성하세요",
    href: "/cover-letters/new",
    ...overrides,
  }
  render(<QuickActionCard {...props} />)
  return props
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("QuickActionCard", () => {
  describe("렌더링", () => {
    it("title을 렌더링해야 한다", () => {
      renderCard({ title: "이력서 업로드" })

      expect(screen.getByText("이력서 업로드")).toBeInTheDocument()
    })

    it("description을 렌더링해야 한다", () => {
      renderCard({ description: "PDF 또는 Word 파일을 업로드하세요" })

      expect(screen.getByText("PDF 또는 Word 파일을 업로드하세요")).toBeInTheDocument()
    })

    it("icon을 렌더링해야 한다", () => {
      renderCard()

      expect(screen.getByTestId("action-icon")).toBeInTheDocument()
    })

    it("icon에 aria-hidden이 설정되어야 한다", () => {
      renderCard()

      expect(screen.getByTestId("action-icon")).toHaveAttribute("aria-hidden", "true")
    })
  })

  describe("링크", () => {
    it("href가 올바른 링크를 렌더링해야 한다", () => {
      renderCard({ href: "/resumes/new" })

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "/resumes/new")
    })

    it("링크 안에 title과 description이 포함되어야 한다", () => {
      renderCard({
        title: "모의면접 시작",
        description: "AI와 면접 연습을 시작하세요",
        href: "/interviews/new",
      })

      const link = screen.getByRole("link")
      expect(link).toHaveTextContent("모의면접 시작")
      expect(link).toHaveTextContent("AI와 면접 연습을 시작하세요")
    })
  })
})
