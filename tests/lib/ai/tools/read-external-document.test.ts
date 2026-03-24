import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    externalDocument: {
      findFirst: vi.fn(),
    },
  },
}))

import { createReadExternalDocumentTool } from "@/lib/ai/tools/read-external-document"
import { prisma } from "@/lib/prisma"

const mockFindFirst = vi.mocked(prisma.externalDocument.findFirst)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createReadExternalDocumentTool", () => {
  const userId = "user-1"
  const allowedIds = ["ext-1", "ext-2"]

  it("허용된 외부 문서의 전체 텍스트를 반환한다", async () => {
    mockFindFirst.mockResolvedValue({
      title: "카카오 채용공고",
      content: "백엔드 개발자 채용 상세 내용",
    } as never)

    const tool = createReadExternalDocumentTool(userId, allowedIds)
    const result = await tool.execute(
      { externalDocumentId: "ext-1" },
      { messages: [], toolCallId: "tc-1" }
    )

    expect(result).toBe("[카카오 채용공고]\n백엔드 개발자 채용 상세 내용")
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "ext-1", userId },
      select: { title: true, content: true },
    })
  })

  it("허용되지 않은 외부 문서 ID는 접근 불가 메시지를 반환한다", async () => {
    const tool = createReadExternalDocumentTool(userId, allowedIds)
    const result = await tool.execute(
      { externalDocumentId: "ext-999" },
      { messages: [], toolCallId: "tc-1" }
    )

    expect(result).toBe("해당 외부 문서에 접근할 수 없습니다.")
    expect(mockFindFirst).not.toHaveBeenCalled()
  })

  it("존재하지 않는 외부 문서는 찾을 수 없음 메시지를 반환한다", async () => {
    mockFindFirst.mockResolvedValue(null)

    const tool = createReadExternalDocumentTool(userId, allowedIds)
    const result = await tool.execute(
      { externalDocumentId: "ext-1" },
      { messages: [], toolCallId: "tc-1" }
    )

    expect(result).toBe("외부 문서를 찾을 수 없습니다.")
  })
})
