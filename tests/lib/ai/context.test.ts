import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      findMany: vi.fn(),
    },
    externalDocument: {
      findMany: vi.fn(),
    },
    careerNote: {
      findMany: vi.fn(),
    },
  },
}))

import { buildContext } from "@/lib/ai/context"
import { prisma } from "@/lib/prisma"

const mockDocFindMany = vi.mocked(prisma.document.findMany)
const mockExtDocFindMany = vi.mocked(prisma.externalDocument.findMany)
const mockNoteFindMany = vi.mocked(prisma.careerNote.findMany)

beforeEach(() => {
  vi.clearAllMocks()
  mockDocFindMany.mockResolvedValue([])
  mockExtDocFindMany.mockResolvedValue([])
  mockNoteFindMany.mockResolvedValue([])
})

describe("buildContext", () => {
  it("선택 문서의 요약과 ID를 포함한다", async () => {
    mockDocFindMany.mockResolvedValue([
      { id: "doc-1", title: "이력서", summary: "3년차 개발자" },
    ] as never)

    const result = await buildContext("user-1", {
      selectedDocumentIds: ["doc-1"],
    })

    expect(result.context).toContain("[문서:")
    expect(result.context).toContain("doc-1")
    expect(result.context).toContain("3년차 개발자")
  })

  it("summary가 null인 문서는 fallback 메시지를 표시한다", async () => {
    mockDocFindMany.mockResolvedValue([
      { id: "doc-1", title: "이력서", summary: null },
    ] as never)

    const result = await buildContext("user-1", {
      selectedDocumentIds: ["doc-1"],
    })

    expect(result.context).toContain("요약 없음")
    expect(result.context).toContain("readDocument")
  })

  it("includeCareerNotes=true면 전체 확정 커리어노트 요약을 포함한다", async () => {
    mockNoteFindMany.mockResolvedValue([
      { id: "note-1", title: "MSA 전환", summary: "팀 리드로 전환 주도" },
    ] as never)

    const result = await buildContext("user-1", {
      includeCareerNotes: true,
    })

    expect(result.context).toContain("[커리어노트:")
    expect(result.context).toContain("note-1")
    expect(result.careerNoteCount).toBe(1)
  })

  it("includeCareerNotes 미지정이면 커리어노트를 포함하지 않는다", async () => {
    const result = await buildContext("user-1", {})

    expect(result.context).not.toContain("[커리어노트:")
    expect(mockNoteFindMany).not.toHaveBeenCalled()
  })

  it("selectedDocumentIds가 비어있으면 문서 섹션 없음", async () => {
    const result = await buildContext("user-1", {})

    expect(result.context).not.toContain("[문서:")
    expect(mockDocFindMany).not.toHaveBeenCalled()
  })

  it("summary가 null인 커리어노트는 fallback 메시지를 표시한다", async () => {
    mockNoteFindMany.mockResolvedValue([
      { id: "note-2", title: "프로젝트 리딩", summary: null },
    ] as never)

    const result = await buildContext("user-1", {
      includeCareerNotes: true,
    })

    expect(result.context).toContain("요약 없음")
    expect(result.context).toContain("readCareerNote")
  })

  describe("외부 문서", () => {
    it("선택 외부 문서의 요약과 ID를 포함한다", async () => {
      mockExtDocFindMany.mockResolvedValue([
        { id: "ext-1", title: "카카오 채용공고", category: "JOB_POSTING", summary: "백엔드 개발자 채용" },
      ] as never)

      const result = await buildContext("user-1", {
        selectedExternalDocumentIds: ["ext-1"],
      })

      expect(result.context).toContain("[외부 문서:")
      expect(result.context).toContain("ext-1")
      expect(result.context).toContain("백엔드 개발자 채용")
      expect(result.externalDocumentCount).toBe(1)
    })

    it("category가 있으면 라벨에 포함한다", async () => {
      mockExtDocFindMany.mockResolvedValue([
        { id: "ext-1", title: "카카오 채용공고", category: "JOB_POSTING", summary: "요약" },
      ] as never)

      const result = await buildContext("user-1", {
        selectedExternalDocumentIds: ["ext-1"],
      })

      expect(result.context).toContain("JOB_POSTING: 카카오 채용공고")
    })

    it("category가 null이면 title만 라벨에 표시한다", async () => {
      mockExtDocFindMany.mockResolvedValue([
        { id: "ext-1", title: "기타 문서", category: null, summary: "요약" },
      ] as never)

      const result = await buildContext("user-1", {
        selectedExternalDocumentIds: ["ext-1"],
      })

      expect(result.context).toContain("[외부 문서: 기타 문서")
      expect(result.context).not.toContain("null:")
    })

    it("summary가 null인 외부 문서는 fallback 메시지를 표시한다", async () => {
      mockExtDocFindMany.mockResolvedValue([
        { id: "ext-1", title: "JD", category: null, summary: null },
      ] as never)

      const result = await buildContext("user-1", {
        selectedExternalDocumentIds: ["ext-1"],
      })

      expect(result.context).toContain("요약 없음")
      expect(result.context).toContain("readExternalDocument")
    })

    it("selectedExternalDocumentIds가 비어있으면 외부 문서 섹션 없음", async () => {
      const result = await buildContext("user-1", {})

      expect(result.context).not.toContain("[외부 문서:")
      expect(mockExtDocFindMany).not.toHaveBeenCalled()
      expect(result.externalDocumentCount).toBe(0)
    })
  })
})
