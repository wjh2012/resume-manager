import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { RecentActivitySection } from "@/components/dashboard/recent-activity"
import type { RecentActivity } from "@/lib/dashboard/service"

vi.mock("next/link", () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

// Pin formatShortDate so tests are locale-independent
vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>()
  return {
    ...actual,
    formatShortDate: (_date: Date | string) => "3월 20일",
  }
})

// ─── fixtures ────────────────────────────────────────────────────────────────

const NOW = new Date("2026-03-20T12:00:00Z")

const EMPTY_ACTIVITY: RecentActivity = {
  coverLetters: [],
  interviews: [],
  insights: [],
}

function makeCoverLetter(id: string, title: string): RecentActivity["coverLetters"][number] {
  return { id, title, updatedAt: NOW }
}

function makeInterview(
  id: string,
  title: string,
  status: string,
): RecentActivity["interviews"][number] {
  return { id, title, status, updatedAt: NOW }
}

function makeInsight(
  id: string,
  category: string,
  title: string,
): RecentActivity["insights"][number] {
  return { id, category, title, updatedAt: NOW }
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("RecentActivitySection", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── 빈 상태 ─────────────────────────────────────────────────────────────────

  describe("빈 상태", () => {
    it("세 배열이 모두 비어 있으면 '아직 활동이 없습니다' 메시지를 보여야 한다", () => {
      render(<RecentActivitySection activity={EMPTY_ACTIVITY} />)

      expect(screen.getByText("아직 활동이 없습니다")).toBeInTheDocument()
    })

    it("빈 상태에서는 3-컬럼 그리드를 렌더링하지 않아야 한다", () => {
      render(<RecentActivitySection activity={EMPTY_ACTIVITY} />)

      expect(screen.queryByText("최근 자기소개서")).not.toBeInTheDocument()
      expect(screen.queryByText("최근 모의면접")).not.toBeInTheDocument()
      expect(screen.queryByText("최근 인사이트")).not.toBeInTheDocument()
    })

    it("커버레터만 있어도 그리드를 렌더링해야 한다 (빈 상태 아님)", () => {
      const activity: RecentActivity = {
        ...EMPTY_ACTIVITY,
        coverLetters: [makeCoverLetter("cl-1", "자소서 A")],
      }

      render(<RecentActivitySection activity={activity} />)

      expect(screen.queryByText("아직 활동이 없습니다")).not.toBeInTheDocument()
      expect(screen.getByText("최근 자기소개서")).toBeInTheDocument()
    })
  })

  // ── 자기소개서 컬럼 ──────────────────────────────────────────────────────────

  describe("자기소개서 컬럼", () => {
    it("커버레터 제목을 렌더링해야 한다", () => {
      const activity: RecentActivity = {
        ...EMPTY_ACTIVITY,
        coverLetters: [
          makeCoverLetter("cl-1", "카카오 자기소개서"),
          makeCoverLetter("cl-2", "네이버 자기소개서"),
        ],
      }

      render(<RecentActivitySection activity={activity} />)

      expect(screen.getByText("카카오 자기소개서")).toBeInTheDocument()
      expect(screen.getByText("네이버 자기소개서")).toBeInTheDocument()
    })

    it("각 커버레터 링크가 올바른 href를 가져야 한다", () => {
      const activity: RecentActivity = {
        ...EMPTY_ACTIVITY,
        coverLetters: [makeCoverLetter("cl-abc", "자소서 1")],
      }

      render(<RecentActivitySection activity={activity} />)

      const link = screen.getByText("자소서 1").closest("a")
      expect(link).toHaveAttribute("href", "/cover-letters/cl-abc")
    })

    it("커버레터가 없으면 '없음'을 표시해야 한다", () => {
      const activity: RecentActivity = {
        coverLetters: [],
        interviews: [makeInterview("iv-1", "면접 A", "COMPLETED")],
        insights: [],
      }

      render(<RecentActivitySection activity={activity} />)

      // "없음" text appears in the cover-letters card
      const cards = screen.getAllByText("없음")
      expect(cards.length).toBeGreaterThanOrEqual(1)
    })

    it("커버레터에 날짜(formatShortDate 결과)를 표시해야 한다", () => {
      const activity: RecentActivity = {
        ...EMPTY_ACTIVITY,
        coverLetters: [makeCoverLetter("cl-1", "자소서 A")],
      }

      render(<RecentActivitySection activity={activity} />)

      expect(screen.getByText("3월 20일")).toBeInTheDocument()
    })
  })

  // ── 모의면접 컬럼 ────────────────────────────────────────────────────────────

  describe("모의면접 컬럼", () => {
    it("면접 제목을 렌더링해야 한다", () => {
      const activity: RecentActivity = {
        ...EMPTY_ACTIVITY,
        interviews: [makeInterview("iv-1", "삼성 기술면접", "COMPLETED")],
      }

      render(<RecentActivitySection activity={activity} />)

      expect(screen.getByText("삼성 기술면접")).toBeInTheDocument()
    })

    it("COMPLETED 상태의 배지가 '완료'를 표시해야 한다", () => {
      const activity: RecentActivity = {
        ...EMPTY_ACTIVITY,
        interviews: [makeInterview("iv-1", "면접 A", "COMPLETED")],
      }

      render(<RecentActivitySection activity={activity} />)

      expect(screen.getByText("완료")).toBeInTheDocument()
    })

    it("COMPLETED가 아닌 상태의 배지가 '진행 중'을 표시해야 한다", () => {
      const activity: RecentActivity = {
        ...EMPTY_ACTIVITY,
        interviews: [makeInterview("iv-2", "면접 B", "IN_PROGRESS")],
      }

      render(<RecentActivitySection activity={activity} />)

      expect(screen.getByText("진행 중")).toBeInTheDocument()
    })

    it("여러 면접이 각각 다른 배지를 표시해야 한다", () => {
      const activity: RecentActivity = {
        ...EMPTY_ACTIVITY,
        interviews: [
          makeInterview("iv-1", "면접 완료", "COMPLETED"),
          makeInterview("iv-2", "면접 진행", "IN_PROGRESS"),
        ],
      }

      render(<RecentActivitySection activity={activity} />)

      expect(screen.getByText("완료")).toBeInTheDocument()
      expect(screen.getByText("진행 중")).toBeInTheDocument()
    })

    it("각 면접 링크가 올바른 href를 가져야 한다", () => {
      const activity: RecentActivity = {
        ...EMPTY_ACTIVITY,
        interviews: [makeInterview("iv-xyz", "면접 A", "COMPLETED")],
      }

      render(<RecentActivitySection activity={activity} />)

      const link = screen.getByText("면접 A").closest("a")
      expect(link).toHaveAttribute("href", "/interviews/iv-xyz")
    })

    it("면접이 없으면 '없음'을 표시해야 한다", () => {
      const activity: RecentActivity = {
        coverLetters: [makeCoverLetter("cl-1", "자소서 A")],
        interviews: [],
        insights: [],
      }

      render(<RecentActivitySection activity={activity} />)

      const cards = screen.getAllByText("없음")
      expect(cards.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── 인사이트 컬럼 ────────────────────────────────────────────────────────────

  describe("인사이트 컬럼", () => {
    it("인사이트 제목을 렌더링해야 한다", () => {
      const activity: RecentActivity = {
        ...EMPTY_ACTIVITY,
        insights: [makeInsight("ins-1", "STRENGTH", "의사소통 능력이 뛰어남")],
      }

      render(<RecentActivitySection activity={activity} />)

      expect(screen.getByText("의사소통 능력이 뛰어남")).toBeInTheDocument()
    })

    it("인사이트 카테고리를 배지로 표시해야 한다", () => {
      const activity: RecentActivity = {
        ...EMPTY_ACTIVITY,
        insights: [makeInsight("ins-1", "STRENGTH", "강점 인사이트")],
      }

      render(<RecentActivitySection activity={activity} />)

      expect(screen.getByText("STRENGTH")).toBeInTheDocument()
    })

    it("여러 인사이트를 모두 렌더링해야 한다", () => {
      const activity: RecentActivity = {
        ...EMPTY_ACTIVITY,
        insights: [
          makeInsight("ins-1", "STRENGTH", "강점 A"),
          makeInsight("ins-2", "WEAKNESS", "약점 B"),
          makeInsight("ins-3", "OPPORTUNITY", "기회 C"),
        ],
      }

      render(<RecentActivitySection activity={activity} />)

      expect(screen.getByText("강점 A")).toBeInTheDocument()
      expect(screen.getByText("약점 B")).toBeInTheDocument()
      expect(screen.getByText("기회 C")).toBeInTheDocument()
    })

    it("인사이트가 없으면 '없음'을 표시해야 한다", () => {
      const activity: RecentActivity = {
        coverLetters: [makeCoverLetter("cl-1", "자소서 A")],
        interviews: [],
        insights: [],
      }

      render(<RecentActivitySection activity={activity} />)

      const cards = screen.getAllByText("없음")
      expect(cards.length).toBeGreaterThanOrEqual(1)
    })
  })

  // ── 3-컬럼 그리드 ────────────────────────────────────────────────────────────

  describe("3-컬럼 그리드", () => {
    it("데이터가 있으면 3개의 섹션 헤더를 모두 렌더링해야 한다", () => {
      const activity: RecentActivity = {
        coverLetters: [makeCoverLetter("cl-1", "자소서 A")],
        interviews: [makeInterview("iv-1", "면접 A", "COMPLETED")],
        insights: [makeInsight("ins-1", "STRENGTH", "인사이트 A")],
      }

      render(<RecentActivitySection activity={activity} />)

      expect(screen.getByText("최근 자기소개서")).toBeInTheDocument()
      expect(screen.getByText("최근 모의면접")).toBeInTheDocument()
      expect(screen.getByText("최근 인사이트")).toBeInTheDocument()
    })
  })
})
