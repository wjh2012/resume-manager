import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: { count: vi.fn() },
    coverLetter: { count: vi.fn(), findMany: vi.fn() },
    interviewSession: { count: vi.fn(), findMany: vi.fn() },
    insight: { count: vi.fn(), findMany: vi.fn() },
    resume: { count: vi.fn() },
  },
}))

import { prisma } from "@/lib/prisma"
import { getDashboardStats, getRecentActivity } from "@/lib/dashboard/service"

const mockPrisma = vi.mocked(prisma)

// ─────────────────────────────────────────────────────────────────────────────
describe("getDashboardStats()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.document.count.mockResolvedValue(0 as never)
    mockPrisma.coverLetter.count.mockResolvedValue(0 as never)
    mockPrisma.interviewSession.count.mockResolvedValue(0 as never)
    mockPrisma.insight.count.mockResolvedValue(0 as never)
    mockPrisma.resume.count.mockResolvedValue(0 as never)
  })

  it("5개 모델(Document, CoverLetter, InterviewSession, Insight, Resume) 모두 count를 호출해야 한다", async () => {
    // Arrange
    const userId = "user-1"
    mockPrisma.document.count.mockResolvedValue(3 as never)
    mockPrisma.coverLetter.count.mockResolvedValue(5 as never)
    mockPrisma.interviewSession.count.mockResolvedValue(2 as never)
    mockPrisma.insight.count.mockResolvedValue(8 as never)
    mockPrisma.resume.count.mockResolvedValue(1 as never)

    // Act
    await getDashboardStats(userId)

    // Assert
    expect(mockPrisma.document.count).toHaveBeenCalledWith({ where: { userId } })
    expect(mockPrisma.coverLetter.count).toHaveBeenCalledWith({ where: { userId } })
    expect(mockPrisma.interviewSession.count).toHaveBeenCalledWith({ where: { userId } })
    expect(mockPrisma.insight.count).toHaveBeenCalledWith({ where: { userId } })
    expect(mockPrisma.resume.count).toHaveBeenCalledWith({ where: { userId } })
  })

  it("각 모델의 count 결과를 올바른 키로 반환해야 한다", async () => {
    // Arrange
    const userId = "user-1"
    mockPrisma.document.count.mockResolvedValue(3 as never)
    mockPrisma.coverLetter.count.mockResolvedValue(5 as never)
    mockPrisma.interviewSession.count.mockResolvedValue(2 as never)
    mockPrisma.insight.count.mockResolvedValue(8 as never)
    mockPrisma.resume.count.mockResolvedValue(1 as never)

    // Act
    const result = await getDashboardStats(userId)

    // Assert
    expect(result).toEqual({
      documents: 3,
      coverLetters: 5,
      interviews: 2,
      insights: 8,
      resumes: 1,
    })
  })

  it("모두 0이면 0으로 채워진 객체를 반환해야 한다", async () => {
    // Arrange
    const userId = "user-empty"

    // Act
    const result = await getDashboardStats(userId)

    // Assert
    expect(result).toEqual({
      documents: 0,
      coverLetters: 0,
      interviews: 0,
      insights: 0,
      resumes: 0,
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("getRecentActivity()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.coverLetter.findMany.mockResolvedValue([] as never)
    mockPrisma.interviewSession.findMany.mockResolvedValue([] as never)
    mockPrisma.insight.findMany.mockResolvedValue([] as never)
  })

  it("CoverLetter를 take:3, updatedAt desc로 findMany 호출해야 한다", async () => {
    // Arrange
    const userId = "user-1"

    // Act
    await getRecentActivity(userId)

    // Assert
    expect(mockPrisma.coverLetter.findMany).toHaveBeenCalledWith({
      where: { userId },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    })
  })

  it("InterviewSession을 take:3, updatedAt desc로 findMany 호출해야 한다", async () => {
    // Arrange
    const userId = "user-1"

    // Act
    await getRecentActivity(userId)

    // Assert
    expect(mockPrisma.interviewSession.findMany).toHaveBeenCalledWith({
      where: { userId },
      select: { id: true, title: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 3,
    })
  })

  it("Insight를 take:5, updatedAt desc로 findMany 호출해야 한다", async () => {
    // Arrange
    const userId = "user-1"

    // Act
    await getRecentActivity(userId)

    // Assert
    expect(mockPrisma.insight.findMany).toHaveBeenCalledWith({
      where: { userId },
      select: { id: true, category: true, content: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    })
  })

  it("각 findMany 결과를 올바른 키로 반환해야 한다", async () => {
    // Arrange
    const userId = "user-1"
    const now = new Date()
    const mockCoverLetters = [{ id: "cl-1", title: "자소서 1", updatedAt: now }]
    const mockInterviews = [{ id: "iv-1", title: "인터뷰 1", status: "COMPLETED", updatedAt: now }]
    const mockInsights = [
      { id: "ins-1", category: "STRENGTH", content: "강점 내용", updatedAt: now },
      { id: "ins-2", category: "WEAKNESS", content: "약점 내용", updatedAt: now },
    ]
    mockPrisma.coverLetter.findMany.mockResolvedValue(mockCoverLetters as never)
    mockPrisma.interviewSession.findMany.mockResolvedValue(mockInterviews as never)
    mockPrisma.insight.findMany.mockResolvedValue(mockInsights as never)

    // Act
    const result = await getRecentActivity(userId)

    // Assert
    expect(result).toEqual({
      coverLetters: mockCoverLetters,
      interviews: mockInterviews,
      insights: mockInsights,
    })
  })

  it("데이터가 없으면 빈 배열을 포함한 객체를 반환해야 한다", async () => {
    // Arrange
    const userId = "user-empty"

    // Act
    const result = await getRecentActivity(userId)

    // Assert
    expect(result).toEqual({
      coverLetters: [],
      interviews: [],
      insights: [],
    })
  })
})
