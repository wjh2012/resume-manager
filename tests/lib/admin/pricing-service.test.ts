import { describe, it, expect, vi, beforeEach } from "vitest"
import { createModelPricing, listModelPricing } from "@/lib/admin/pricing-service"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    modelPricing: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"

const mockCreate = vi.mocked(prisma.modelPricing.create)
const mockFindMany = vi.mocked(prisma.modelPricing.findMany)

describe("createModelPricing", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("새 단가를 생성한다", async () => {
    const input = {
      provider: "openai",
      model: "gpt-4o",
      inputPricePerM: 2.5,
      outputPricePerM: 10.0,
      effectiveFrom: new Date("2026-01-01"),
    }
    mockCreate.mockResolvedValue({ id: "p1", ...input, createdAt: new Date() } as unknown as Awaited<ReturnType<typeof mockCreate>>)

    const result = await createModelPricing(input)
    expect(mockCreate).toHaveBeenCalledWith({ data: input })
    expect(result.id).toBe("p1")
  })
})

describe("listModelPricing", () => {
  it("단가 목록을 반환한다", async () => {
    mockFindMany.mockResolvedValue([])

    const result = await listModelPricing()
    expect(result).toEqual([])
    expect(mockFindMany).toHaveBeenCalledWith({
      orderBy: [{ provider: "asc" }, { model: "asc" }, { effectiveFrom: "desc" }],
    })
  })
})
