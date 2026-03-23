import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      findFirst: vi.fn(),
    },
  },
}))

import { createReadDocumentTool } from "@/lib/ai/tools/read-document"
import { prisma } from "@/lib/prisma"

const mockFindFirst = vi.mocked(prisma.document.findFirst)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createReadDocumentTool", () => {
  const userId = "user-1"
  const allowedIds = ["doc-1", "doc-2"]

  it("허용된 문서의 전체 텍스트를 반환한다", async () => {
    mockFindFirst.mockResolvedValue({
      title: "이력서",
      extractedText: "이력서 전체 텍스트 내용",
    } as never)

    const tool = createReadDocumentTool(userId, allowedIds)
    const result = await tool.execute(
      { documentId: "doc-1" },
      { messages: [], toolCallId: "tc-1" }
    )

    expect(result).toBe("[이력서]\n이력서 전체 텍스트 내용")
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "doc-1", userId },
      select: { title: true, extractedText: true },
    })
  })

  it("허용되지 않은 문서 ID는 접근 불가 메시지를 반환한다", async () => {
    const tool = createReadDocumentTool(userId, allowedIds)
    const result = await tool.execute(
      { documentId: "doc-999" },
      { messages: [], toolCallId: "tc-1" }
    )

    expect(result).toBe("해당 문서에 접근할 수 없습니다.")
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it("존재하지 않는 문서는 찾을 수 없음 메시지를 반환한다", async () => {
    mockFindFirst.mockResolvedValue(null)

    const tool = createReadDocumentTool(userId, allowedIds)
    const result = await tool.execute(
      { documentId: "doc-1" },
      { messages: [], toolCallId: "tc-1" }
    )

    expect(result).toBe("문서를 찾을 수 없습니다.")
  })

  it("extractedText가 null인 문서는 빈 텍스트로 반환한다", async () => {
    mockFindFirst.mockResolvedValue({
      title: "빈 문서",
      extractedText: null,
    } as never)

    const tool = createReadDocumentTool(userId, allowedIds)
    const result = await tool.execute(
      { documentId: "doc-1" },
      { messages: [], toolCallId: "tc-1" }
    )

    expect(result).toBe("[빈 문서]\n")
  })
})
