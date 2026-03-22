import { describe, it, expect, vi, beforeEach } from "vitest"
import { Prisma } from "@prisma/client"
import { checkQuotaExceeded } from "@/lib/token-usage/quota"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quota: { findMany: vi.fn() },
    tokenUsageLog: { aggregate: vi.fn(), count: vi.fn() },
  },
}))

import { prisma } from "@/lib/prisma"

const mockQuotaFindMany = vi.mocked(prisma.quota.findMany)
const mockAggregate = vi.mocked(prisma.tokenUsageLog.aggregate)

describe("checkQuotaExceeded", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("Quota가 없으면 초과하지 않음", async () => {
    mockQuotaFindMany.mockResolvedValue([])
    const result = await checkQuotaExceeded("user-1")
    expect(result.exceeded).toBe(false)
  })

  it("토큰 한도 초과 시 exceeded=true", async () => {
    mockQuotaFindMany.mockResolvedValue([
      {
        id: "q1",
        userId: "user-1",
        limitType: "TOKENS",
        limitValue: new Prisma.Decimal(1000),
        period: "MONTHLY",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as unknown as Awaited<ReturnType<typeof mockQuotaFindMany>>)
    mockAggregate.mockResolvedValue({
      _sum: { totalTokens: 1500 },
    } as unknown as Awaited<ReturnType<typeof mockAggregate>>)

    const result = await checkQuotaExceeded("user-1")
    expect(result.exceeded).toBe(true)
    expect(result.limitType).toBe("TOKENS")
  })
})
