import { describe, it, expect, vi, beforeEach } from "vitest"
import { createQuota, listQuotas, updateQuota, deleteQuota } from "@/lib/admin/quota-service"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    quota: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"

const mockCreate = vi.mocked(prisma.quota.create)
const mockFindMany = vi.mocked(prisma.quota.findMany)
const mockUpdate = vi.mocked(prisma.quota.update)
const mockDelete = vi.mocked(prisma.quota.delete)

describe("createQuota", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("새 Quota를 생성한다", async () => {
    const input = {
      userId: "u1",
      limitType: "TOKENS" as const,
      limitValue: 100000,
      period: "MONTHLY" as const,
    }
    mockCreate.mockResolvedValue({ id: "q1", ...input, isActive: true } as any)

    const result = await createQuota(input)
    expect(mockCreate).toHaveBeenCalledWith({ data: input })
    expect(result.id).toBe("q1")
  })
})

describe("updateQuota", () => {
  it("Quota를 업데이트한다", async () => {
    mockUpdate.mockResolvedValue({ id: "q1", isActive: false } as any)

    await updateQuota("q1", { isActive: false })
    expect(mockUpdate).toHaveBeenCalledWith({ where: { id: "q1" }, data: { isActive: false } })
  })
})

describe("deleteQuota", () => {
  it("Quota를 삭제한다", async () => {
    mockDelete.mockResolvedValue({} as any)

    await deleteQuota("q1")
    expect(mockDelete).toHaveBeenCalledWith({ where: { id: "q1" } })
  })
})
