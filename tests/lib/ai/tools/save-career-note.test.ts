import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    careerNote: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    careerNoteSource: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { createSaveCareerNoteTool } from "@/lib/ai/tools/save-career-note"
import { prisma } from "@/lib/prisma"

const mockFindFirst = vi.mocked(prisma.careerNote.findFirst)
const mockTransaction = vi.mocked(prisma.$transaction)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createSaveCareerNoteTool", () => {
  const userId = "user-1"
  const conversationId = "conv-1"

  describe("새로 생성 (careerNoteId 없음)", () => {
    it("커리어노트를 생성하고 소스를 연결한다", async () => {
      mockTransaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          const tx = {
            careerNote: {
              create: vi.fn().mockResolvedValue({ id: "new-note-id" }),
            },
            careerNoteSource: {
              create: vi.fn().mockResolvedValue({}),
            },
          }
          return fn(tx as never)
        }
      })

      const tool = createSaveCareerNoteTool(userId, conversationId)
      const result = await tool.execute(
        {
          title: "새 커리어노트",
          content: "내용입니다",
          summary: "요약입니다",
          metadata: { role: "개발자" },
        },
        { messages: [], toolCallId: "tc-1" }
      )

      expect(result).toBe('커리어노트 "새 커리어노트"이(가) 저장되었습니다.')
      expect(mockTransaction).toHaveBeenCalledOnce()
    })

    it("metadata 없이도 생성할 수 있다", async () => {
      mockTransaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          const tx = {
            careerNote: {
              create: vi.fn().mockResolvedValue({ id: "new-note-id" }),
            },
            careerNoteSource: {
              create: vi.fn().mockResolvedValue({}),
            },
          }
          return fn(tx as never)
        }
      })

      const tool = createSaveCareerNoteTool(userId, conversationId)
      const result = await tool.execute(
        {
          title: "메타 없는 노트",
          content: "내용",
          summary: "요약",
        },
        { messages: [], toolCallId: "tc-1" }
      )

      expect(result).toBe('커리어노트 "메타 없는 노트"이(가) 저장되었습니다.')
    })
  })

  describe("갱신 (careerNoteId 있음)", () => {
    it("기존 커리어노트를 갱신하고 소스를 연결한다", async () => {
      mockFindFirst.mockResolvedValue({
        id: "note-1",
        userId,
        status: "CONFIRMED",
      } as never)
      mockTransaction.mockResolvedValue(undefined)

      const tool = createSaveCareerNoteTool(userId, conversationId)
      const result = await tool.execute(
        {
          careerNoteId: "note-1",
          title: "갱신된 제목",
          content: "갱신된 내용",
          summary: "갱신된 요약",
          metadata: { role: "시니어 개발자", result: "성공" },
        },
        { messages: [], toolCallId: "tc-1" }
      )

      expect(result).toBe('커리어노트 "갱신된 제목"이(가) 갱신되었습니다.')
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: "note-1", userId, status: "CONFIRMED" },
      })
      expect(mockTransaction).toHaveBeenCalledOnce()
    })

    it("존재하지 않는 노트 갱신 시 찾을 수 없음 메시지를 반환한다", async () => {
      mockFindFirst.mockResolvedValue(null)

      const tool = createSaveCareerNoteTool(userId, conversationId)
      const result = await tool.execute(
        {
          careerNoteId: "note-999",
          title: "제목",
          content: "내용",
          summary: "요약",
        },
        { messages: [], toolCallId: "tc-1" }
      )

      expect(result).toBe("커리어노트를 찾을 수 없습니다.")
      expect(mockTransaction).not.toHaveBeenCalled()
    })

    it("다른 사용자의 노트는 갱신할 수 없다", async () => {
      mockFindFirst.mockResolvedValue(null)

      const tool = createSaveCareerNoteTool(userId, conversationId)
      const result = await tool.execute(
        {
          careerNoteId: "other-user-note",
          title: "제목",
          content: "내용",
          summary: "요약",
        },
        { messages: [], toolCallId: "tc-1" }
      )

      expect(result).toBe("커리어노트를 찾을 수 없습니다.")
      expect(mockTransaction).not.toHaveBeenCalled()
    })
  })
})
