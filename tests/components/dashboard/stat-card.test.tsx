import { describe, it, expect, vi } from "vitest"
import { render, screen } from "@testing-library/react"
import { StatCard } from "@/components/dashboard/stat-card"

// next/link renders a plain <a> in jsdom without the Next.js router context
vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

// ─── stub icon ───────────────────────────────────────────────────────────────

function StubIcon({ "aria-hidden": ariaHidden }: { "aria-hidden"?: string | boolean }) {
  return <svg data-testid="stat-icon" aria-hidden={ariaHidden as boolean | undefined} />
}

// ─── helpers ─────────────────────────────────────────────────────────────────

interface Props {
  value?: number
  label?: string
  href?: string
}

function renderCard(overrides: Props = {}) {
  const props = {
    icon: StubIcon,
    value: 42,
    label: "이력서",
    href: "/resumes",
    ...overrides,
  }
  render(<StatCard {...props} />)
  return props
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("StatCard", () => {
  describe("렌더링", () => {
    it("value를 렌더링해야 한다", () => {
      renderCard({ value: 7 })

      expect(screen.getByText("7")).toBeInTheDocument()
    })

    it("label을 렌더링해야 한다", () => {
      renderCard({ label: "자기소개서" })

      expect(screen.getByText("자기소개서")).toBeInTheDocument()
    })

    it("icon을 렌더링해야 한다", () => {
      renderCard()

      expect(screen.getByTestId("stat-icon")).toBeInTheDocument()
    })

    it("icon에 aria-hidden이 설정되어야 한다", () => {
      renderCard()

      expect(screen.getByTestId("stat-icon")).toHaveAttribute("aria-hidden", "true")
    })
  })

  describe("링크", () => {
    it("href가 올바른 링크를 렌더링해야 한다", () => {
      renderCard({ href: "/cover-letters" })

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "/cover-letters")
    })

    it("링크 안에 value와 label이 포함되어야 한다", () => {
      renderCard({ value: 3, label: "모의면접", href: "/interviews" })

      const link = screen.getByRole("link")
      expect(link).toHaveTextContent("3")
      expect(link).toHaveTextContent("모의면접")
    })

    it("value가 0이어도 링크를 렌더링해야 한다", () => {
      renderCard({ value: 0, href: "/insights" })

      const link = screen.getByRole("link")
      expect(link).toHaveAttribute("href", "/insights")
      expect(link).toHaveTextContent("0")
    })
  })
})
