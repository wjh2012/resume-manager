import { describe, it, expect, vi, beforeEach } from "vitest"
import { Prisma } from "@prisma/client"
import { checkQuotaExceeded } from "@/lib/token-usage/quota"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quota: { findMany: vi.fn() },
    userQuota: { findMany: vi.fn() },
    tokenUsageLog: { aggregate: vi.fn(), count: vi.fn() },
  },
}))

import { prisma } from "@/lib/prisma"

const mockQuotaFindMany = vi.mocked(prisma.quota.findMany)
const mockUserQuotaFindMany = vi.mocked(prisma.userQuota.findMany)
const mockAggregate = vi.mocked(prisma.tokenUsageLog.aggregate)

describe("checkQuotaExceeded", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUserQuotaFindMany.mockResolvedValue([])
  })

  it("Quota가 없으면 초과하지 않음", async () => {
    mockQuotaFindMany.mockResolvedValue([])
    const result = await checkQuotaExceeded("user-1")
    expect(result.exceeded).toBe(false)
  })

  it("토큰 한도 초과 시 exceeded=true, source=ADMIN", async () => {
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
    expect(result.source).toBe("ADMIN")
  })

  it("UserQuota 토큰 한도 초과 시 exceeded=true, source=USER", async () => {
    mockQuotaFindMany.mockResolvedValue([])
    mockUserQuotaFindMany.mockResolvedValue([
      {
        id: "uq1",
        userId: "user-1",
        limitType: "TOKENS",
        limitValue: new Prisma.Decimal(5000),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as unknown as Awaited<ReturnType<typeof mockUserQuotaFindMany>>)
    mockAggregate.mockResolvedValue({
      _sum: { totalTokens: 6000 },
    } as unknown as Awaited<ReturnType<typeof mockAggregate>>)

    const result = await checkQuotaExceeded("user-1")
    expect(result.exceeded).toBe(true)
    expect(result.limitType).toBe("TOKENS")
    expect(result.source).toBe("USER")
  })

  it("Admin quota와 UserQuota 모두 있을 때 먼저 초과한 쪽이 반환된다", async () => {
    mockQuotaFindMany.mockResolvedValue([
      {
        id: "q1",
        userId: "user-1",
        limitType: "TOKENS",
        limitValue: new Prisma.Decimal(10000),
        period: "MONTHLY",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as unknown as Awaited<ReturnType<typeof mockQuotaFindMany>>)
    mockUserQuotaFindMany.mockResolvedValue([
      {
        id: "uq1",
        userId: "user-1",
        limitType: "TOKENS",
        limitValue: new Prisma.Decimal(5000),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as unknown as Awaited<ReturnType<typeof mockUserQuotaFindMany>>)
    mockAggregate.mockResolvedValue({
      _sum: { totalTokens: 7000 },
    } as unknown as Awaited<ReturnType<typeof mockAggregate>>)

    const result = await checkQuotaExceeded("user-1")
    expect(result.exceeded).toBe(true)
    expect(result.source).toBe("USER")
  })

  it("UserQuota만 있고 미초과 시 exceeded=false", async () => {
    mockQuotaFindMany.mockResolvedValue([])
    mockUserQuotaFindMany.mockResolvedValue([
      {
        id: "uq1",
        userId: "user-1",
        limitType: "COST",
        limitValue: new Prisma.Decimal(10),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as unknown as Awaited<ReturnType<typeof mockUserQuotaFindMany>>)
    mockAggregate.mockResolvedValue({
      _sum: { estimatedCost: new Prisma.Decimal(3) },
    } as unknown as Awaited<ReturnType<typeof mockAggregate>>)

    const result = await checkQuotaExceeded("user-1")
    expect(result.exceeded).toBe(false)
  })
})
