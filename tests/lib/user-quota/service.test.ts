import { describe, it, expect, vi, beforeEach } from "vitest"
import { Prisma } from "@prisma/client"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userQuota: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

import { prisma } from "@/lib/prisma"
import {
  listUserQuotas,
  createUserQuota,
  updateUserQuota,
  deleteUserQuota,
} from "@/lib/user-quota/service"

const mockFindMany = vi.mocked(prisma.userQuota.findMany)
const mockFindUnique = vi.mocked(prisma.userQuota.findUnique)
const mockCreate = vi.mocked(prisma.userQuota.create)
const mockUpdateMany = vi.mocked(prisma.userQuota.updateMany)
const mockDeleteMany = vi.mocked(prisma.userQuota.deleteMany)

describe("UserQuota service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("listUserQuotas", () => {
    it("사용자의 자기 제한 목록을 반환한다", async () => {
      const mockQuotas = [
        {
          id: "uq1",
          userId: "user-1",
          limitType: "TOKENS",
          limitValue: new Prisma.Decimal(10000),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]
      mockFindMany.mockResolvedValue(mockQuotas as never)

      const result = await listUserQuotas("user-1")

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      })
      expect(result).toEqual(mockQuotas)
    })
  })

  describe("createUserQuota", () => {
    it("새 자기 제한을 생성한다", async () => {
      const created = {
        id: "uq1",
        userId: "user-1",
        limitType: "TOKENS",
        limitValue: new Prisma.Decimal(5000),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      mockCreate.mockResolvedValue(created as never)

      const result = await createUserQuota({
        userId: "user-1",
        limitType: "TOKENS",
        limitValue: 5000,
      })

      expect(mockCreate).toHaveBeenCalledWith({
        data: { userId: "user-1", limitType: "TOKENS", limitValue: 5000 },
      })
      expect(result).toEqual(created)
    })
  })

  describe("updateUserQuota", () => {
    it("본인의 자기 제한만 수정할 수 있다", async () => {
      mockUpdateMany.mockResolvedValue({ count: 1 } as never)
      mockFindUnique.mockResolvedValue({ id: "uq1", limitValue: 8000 } as never)

      const result = await updateUserQuota("uq1", "user-1", { limitValue: 8000 })

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: "uq1", userId: "user-1" },
        data: { limitValue: 8000 },
      })
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: "uq1" } })
      expect(result).toEqual({ id: "uq1", limitValue: 8000 })
    })

    it("다른 사용자의 제한 수정 시 null 반환", async () => {
      mockUpdateMany.mockResolvedValue({ count: 0 } as never)

      const result = await updateUserQuota("uq1", "other-user", {
        limitValue: 8000,
      })

      expect(result).toBeNull()
      expect(mockFindUnique).not.toHaveBeenCalled()
    })
  })

  describe("deleteUserQuota", () => {
    it("본인의 자기 제한만 삭제할 수 있다", async () => {
      mockDeleteMany.mockResolvedValue({ count: 1 } as never)

      const result = await deleteUserQuota("uq1", "user-1")

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { id: "uq1", userId: "user-1" },
      })
      expect(result).toBe(true)
    })

    it("다른 사용자의 제한 삭제 시 false 반환", async () => {
      mockDeleteMany.mockResolvedValue({ count: 0 } as never)

      const result = await deleteUserQuota("uq1", "other-user")

      expect(result).toBe(false)
    })
  })
})
