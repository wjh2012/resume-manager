import { describe, it, expect, vi, beforeEach } from "vitest"
import { Prisma } from "@prisma/client"
import { calculateCost } from "@/lib/token-usage/pricing"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    modelPricing: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"

const mockFindFirst = vi.mocked(prisma.modelPricing.findFirst)

describe("calculateCost", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("단가가 있으면 비용을 계산한다", async () => {
    mockFindFirst.mockResolvedValue({
      id: "1",
      provider: "openai",
      model: "gpt-4o",
      inputPricePerM: new Prisma.Decimal(2.5),
      outputPricePerM: new Prisma.Decimal(10),
      effectiveFrom: new Date(),
      createdAt: new Date(),
    })

    const cost = await calculateCost({
      provider: "openai",
      model: "gpt-4o",
      promptTokens: 1000,
      completionTokens: 500,
      at: new Date(),
    })

    // (1000 * 2.5 / 1_000_000) + (500 * 10 / 1_000_000) = 0.0025 + 0.005 = 0.0075
    expect(cost?.toNumber()).toBeCloseTo(0.0075)
  })

  it("단가가 없으면 null을 반환한다", async () => {
    mockFindFirst.mockResolvedValue(null)

    const cost = await calculateCost({
      provider: "openai",
      model: "unknown-model",
      promptTokens: 1000,
      completionTokens: 500,
      at: new Date(),
    })

    expect(cost).toBeNull()
  })
})
