import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    careerNote: {
      findFirst: vi.fn(),
    },
  },
}))

import { createReadCareerNoteTool } from "@/lib/ai/tools/read-career-note"
import { prisma } from "@/lib/prisma"

const mockFindFirst = vi.mocked(prisma.careerNote.findFirst)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createReadCareerNoteTool", () => {
  const userId = "user-1"

  it("CONFIRMED 상태 노트의 제목, 내용, 메타데이터를 반환한다", async () => {
    mockFindFirst.mockResolvedValue({
      title: "프로젝트 리더 경험",
      content: "팀을 이끌고 프로젝트를 성공적으로 완수했습니다.",
      metadata: { role: "팀장", result: "성공" },
    } as never)

    const tool = createReadCareerNoteTool(userId)
    const result = await tool.execute(
      { careerNoteId: "note-1" },
      { messages: [], toolCallId: "tc-1" }
    )

    expect(result).toBe(
      "[프로젝트 리더 경험]\n팀을 이끌고 프로젝트를 성공적으로 완수했습니다.\nrole: 팀장 | result: 성공"
    )
    expect(mockFindFirst).toHaveBeenCalledWith({
      where: { id: "note-1", userId, status: "CONFIRMED" },
      select: { title: true, content: true, metadata: true },
    })
  })

  it("메타데이터가 없는 노트는 제목과 내용만 반환한다", async () => {
    mockFindFirst.mockResolvedValue({
      title: "경험 노트",
      content: "내용입니다.",
      metadata: null,
    } as never)

    const tool = createReadCareerNoteTool(userId)
    const result = await tool.execute(
      { careerNoteId: "note-2" },
      { messages: [], toolCallId: "tc-1" }
    )

    expect(result).toBe("[경험 노트]\n내용입니다.")
  })

  it("메타데이터 값이 빈 문자열인 항목은 제외한다", async () => {
    mockFindFirst.mockResolvedValue({
      title: "노트",
      content: "내용",
      metadata: { role: "개발자", result: "", feeling: "보람" },
    } as never)

    const tool = createReadCareerNoteTool(userId)
    const result = await tool.execute(
      { careerNoteId: "note-3" },
      { messages: [], toolCallId: "tc-1" }
    )

    expect(result).toBe("[노트]\n내용\nrole: 개발자 | feeling: 보람")
  })

  it("PENDING 상태 노트는 찾을 수 없음 메시지를 반환한다", async () => {
    mockFindFirst.mockResolvedValue(null)

    const tool = createReadCareerNoteTool(userId)
    const result = await tool.execute(
      { careerNoteId: "note-pending" },
      { messages: [], toolCallId: "tc-1" }
    )

    expect(result).toBe("커리어노트를 찾을 수 없습니다.")
  })

  it("존재하지 않는 노트는 찾을 수 없음 메시지를 반환한다", async () => {
    mockFindFirst.mockResolvedValue(null)

    const tool = createReadCareerNoteTool(userId)
    const result = await tool.execute(
      { careerNoteId: "note-999" },
      { messages: [], toolCallId: "tc-1" }
    )

    expect(result).toBe("커리어노트를 찾을 수 없습니다.")
  })

  it("다른 사용자의 노트는 찾을 수 없음 메시지를 반환한다", async () => {
    mockFindFirst.mockResolvedValue(null)

    const tool = createReadCareerNoteTool(userId)
    const result = await tool.execute(
      { careerNoteId: "other-user-note" },
      { messages: [], toolCallId: "tc-1" }
    )

    expect(result).toBe("커리어노트를 찾을 수 없습니다.")
  })
})
