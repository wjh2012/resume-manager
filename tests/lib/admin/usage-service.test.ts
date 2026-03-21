import { describe, it, expect, vi, beforeEach } from "vitest"
import { getSystemUsageSummary, getUserRanking } from "@/lib/admin/usage-service"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tokenUsageLog: {
      aggregate: vi.fn(),
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}))

import { prisma } from "@/lib/prisma"

const mockAggregate = vi.mocked(prisma.tokenUsageLog.aggregate)
const mockGroupBy = vi.mocked(prisma.tokenUsageLog.groupBy)
const mockQueryRaw = vi.mocked(prisma.$queryRaw)

describe("getSystemUsageSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("전체 시스템 사용량을 집계한다", async () => {
    mockAggregate.mockResolvedValue({
      _sum: { totalTokens: 10000, estimatedCost: { toNumber: () => 0.5 } },
      _count: { _all: 20 },
    } as unknown as Awaited<ReturnType<typeof mockAggregate>>)
    mockGroupBy
      .mockResolvedValueOnce([
        { feature: "COVER_LETTER", _sum: { totalTokens: 6000 }, _count: { _all: 12 } },
      ] as unknown as Awaited<ReturnType<typeof mockGroupBy>>)
      .mockResolvedValueOnce([
        { model: "gpt-4o", _sum: { totalTokens: 8000, estimatedCost: { toNumber: () => 0.4 } } },
      ] as unknown as Awaited<ReturnType<typeof mockGroupBy>>)
      .mockResolvedValueOnce([{ userId: "u1" }] as unknown as Awaited<ReturnType<typeof mockGroupBy>>) // activeUsers
    mockQueryRaw.mockResolvedValue([]) // daily

    const start = new Date("2026-01-01")
    const end = new Date("2026-01-31")
    const result = await getSystemUsageSummary(start, end)

    expect(result.totalTokens).toBe(10000)
    expect(result.requestCount).toBe(20)
    expect(result.byFeature).toHaveLength(1)
    expect(result.byModel).toHaveLength(1)
  })
})

describe("getUserRanking", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("사용자별 랭킹을 반환한다", async () => {
    mockQueryRaw.mockResolvedValue([
      {
        user_id: "u1",
        email: "test@test.com",
        name: "Test",
        total_tokens: BigInt(5000),
        total_cost: "0.25",
        request_count: BigInt(10),
      },
    ])

    const result = await getUserRanking({
      startDate: new Date("2026-01-01"),
      endDate: new Date("2026-01-31"),
    })

    expect(result).toHaveLength(1)
    expect(result[0].totalTokens).toBe(5000)
    expect(result[0].email).toBe("test@test.com")
  })
})
