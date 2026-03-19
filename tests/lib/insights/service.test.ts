import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: { findFirst: vi.fn() },
    message: { findMany: vi.fn() },
    insight: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      deleteMany: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/ai/provider", () => ({
  getLanguageModel: vi.fn(),
  AiSettingsNotFoundError: class extends Error {
    constructor() { super("AI 설정이 완료되지 않았습니다.") }
  },
}))

vi.mock("ai", () => ({
  generateObject: vi.fn(),
}))

import { prisma } from "@/lib/prisma"
import {
  listInsights,
  updateInsight,
  deleteInsight,
  countByCategory,
  InsightNotFoundError,
  InsightForbiddenError,
  ConversationNotFoundError,
} from "@/lib/insights/service"

const userId = "user-1"
const insightId = "insight-1"

describe("extractInsights", () => {
  it("throws ConversationNotFoundError when conversation not found", async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue(null)

    const { extractInsights } = await import("@/lib/insights/service")
    await expect(
      extractInsights(userId, "conv-1"),
    ).rejects.toThrow(ConversationNotFoundError)
  })

  it("returns empty array when no messages", async () => {
    vi.mocked(prisma.conversation.findFirst).mockResolvedValue({ id: "conv-1" } as never)
    vi.mocked(prisma.message.findMany).mockResolvedValue([])

    const { extractInsights } = await import("@/lib/insights/service")
    const result = await extractInsights(userId, "conv-1")
    expect(result).toEqual([])
  })
})

describe("listInsights", () => {
  it("returns insights for user", async () => {
    const mockInsights = [{ id: "1", title: "test", category: "strength" }]
    vi.mocked(prisma.insight.findMany).mockResolvedValue(mockInsights as never)

    const result = await listInsights(userId)
    expect(result).toEqual(mockInsights)
    expect(prisma.insight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId } }),
    )
  })

  it("filters by category", async () => {
    vi.mocked(prisma.insight.findMany).mockResolvedValue([] as never)

    await listInsights(userId, "strength")
    expect(prisma.insight.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId, category: "strength" } }),
    )
  })
})

describe("updateInsight", () => {
  it("updates with ownership check", async () => {
    vi.mocked(prisma.insight.updateMany).mockResolvedValue({ count: 1 } as never)

    await updateInsight(userId, insightId, {
      title: "updated",
      content: "updated content",
      category: "skill",
    })
    expect(prisma.insight.updateMany).toHaveBeenCalledWith({
      where: { id: insightId, userId },
      data: { title: "updated", content: "updated content", category: "skill" },
    })
  })

  it("throws NotFoundError when insight does not exist", async () => {
    vi.mocked(prisma.insight.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.insight.findUnique).mockResolvedValue(null)

    await expect(
      updateInsight(userId, insightId, { title: "t", content: "c", category: "skill" }),
    ).rejects.toThrow(InsightNotFoundError)
  })

  it("throws ForbiddenError when not owned", async () => {
    vi.mocked(prisma.insight.updateMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.insight.findUnique).mockResolvedValue({ id: insightId } as never)

    await expect(
      updateInsight(userId, insightId, { title: "t", content: "c", category: "skill" }),
    ).rejects.toThrow(InsightForbiddenError)
  })
})

describe("deleteInsight", () => {
  it("deletes with ownership check", async () => {
    vi.mocked(prisma.insight.deleteMany).mockResolvedValue({ count: 1 } as never)

    await deleteInsight(userId, insightId)
    expect(prisma.insight.deleteMany).toHaveBeenCalledWith({
      where: { id: insightId, userId },
    })
  })

  it("throws NotFoundError when not found", async () => {
    vi.mocked(prisma.insight.deleteMany).mockResolvedValue({ count: 0 } as never)
    vi.mocked(prisma.insight.findUnique).mockResolvedValue(null)

    await expect(deleteInsight(userId, insightId)).rejects.toThrow(InsightNotFoundError)
  })
})

describe("countByCategory", () => {
  it("returns grouped counts", async () => {
    vi.mocked(prisma.insight.groupBy).mockResolvedValue([
      { category: "strength", _count: { _all: 3 } },
      { category: "skill", _count: { _all: 2 } },
    ] as never)

    const result = await countByCategory(userId)
    expect(result).toEqual([
      { category: "strength", _count: { _all: 3 } },
      { category: "skill", _count: { _all: 2 } },
    ])
  })
})
