import { describe, it, expect, vi, beforeEach } from "vitest"
import { Prisma } from "@prisma/client"
import { recordUsage } from "@/lib/token-usage/service"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tokenUsageLog: { create: vi.fn() },
  },
}))

vi.mock("@/lib/token-usage/pricing", () => ({
  calculateCost: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import { calculateCost } from "@/lib/token-usage/pricing"

const mockCreate = vi.mocked(prisma.tokenUsageLog.create)
const mockCalculateCost = vi.mocked(calculateCost)

describe("recordUsage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("비용 계산 후 로그를 저장한다", async () => {
    mockCalculateCost.mockResolvedValue(new Prisma.Decimal(0.0075))
    mockCreate.mockResolvedValue({} as any)

    await recordUsage({
      userId: "user-1",
      provider: "openai",
      model: "gpt-4o",
      feature: "COVER_LETTER",
      promptTokens: 1000,
      completionTokens: 500,
      totalTokens: 1500,
      isServerKey: false,
    })

    expect(mockCalculateCost).toHaveBeenCalledWith({
      provider: "openai",
      model: "gpt-4o",
      promptTokens: 1000,
      completionTokens: 500,
      at: expect.any(Date),
    })
    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        provider: "openai",
        model: "gpt-4o",
        feature: "COVER_LETTER",
        estimatedCost: new Prisma.Decimal(0.0075),
      }),
    })
  })

  it("단가가 없으면 estimatedCost=null로 저장한다", async () => {
    mockCalculateCost.mockResolvedValue(null)
    mockCreate.mockResolvedValue({} as any)

    await recordUsage({
      userId: "user-1",
      provider: "openai",
      model: "unknown",
      feature: "COVER_LETTER",
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
      isServerKey: false,
    })

    expect(mockCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        estimatedCost: null,
      }),
    })
  })
})
