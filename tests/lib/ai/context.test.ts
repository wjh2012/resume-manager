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

import { buildFullContext } from "@/lib/ai/context"
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

describe("buildFullContext", () => {
  it("plain string을 반환한다 (객체 아님)", async () => {
    const result = await buildFullContext("user-1", {})

    expect(typeof result).toBe("string")
  })

  it("선택 문서의 extractedText(전문)와 ID를 포함한다", async () => {
    mockDocFindMany.mockResolvedValue([
      { id: "doc-1", title: "이력서", extractedText: "3년차 백엔드 개발자 전문 텍스트" },
    ] as never)

    const result = await buildFullContext("user-1", {
      selectedDocumentIds: ["doc-1"],
    })

    expect(result).toContain("[문서:")
    expect(result).toContain("doc-1")
    expect(result).toContain("3년차 백엔드 개발자 전문 텍스트")
  })

  it("extractedText가 null인 문서는 '(텍스트 없음)'을 표시한다", async () => {
    mockDocFindMany.mockResolvedValue([
      { id: "doc-1", title: "이력서", extractedText: null },
    ] as never)

    const result = await buildFullContext("user-1", {
      selectedDocumentIds: ["doc-1"],
    })

    expect(result).toContain("(텍스트 없음)")
    expect(result).not.toContain("요약 없음")
    expect(result).not.toContain("readDocument")
  })

  it("selectedDocumentIds가 비어있으면 문서 섹션 없음", async () => {
    const result = await buildFullContext("user-1", {})

    expect(result).not.toContain("[문서:")
    expect(mockDocFindMany).not.toHaveBeenCalled()
  })

  describe("외부 문서", () => {
    it("선택 외부 문서의 content(전문)와 ID를 포함한다", async () => {
      mockExtDocFindMany.mockResolvedValue([
        { id: "ext-1", title: "카카오 채용공고", category: "JOB_POSTING", content: "백엔드 개발자 채용 전문 내용" },
      ] as never)

      const result = await buildFullContext("user-1", {
        selectedExternalDocumentIds: ["ext-1"],
      })

      expect(result).toContain("[외부 문서:")
      expect(result).toContain("ext-1")
      expect(result).toContain("백엔드 개발자 채용 전문 내용")
    })

    it("category가 있으면 라벨에 포함한다", async () => {
      mockExtDocFindMany.mockResolvedValue([
        { id: "ext-1", title: "카카오 채용공고", category: "JOB_POSTING", content: "내용" },
      ] as never)

      const result = await buildFullContext("user-1", {
        selectedExternalDocumentIds: ["ext-1"],
      })

      expect(result).toContain("JOB_POSTING: 카카오 채용공고")
    })

    it("category가 null이면 title만 라벨에 표시한다", async () => {
      mockExtDocFindMany.mockResolvedValue([
        { id: "ext-1", title: "기타 문서", category: null, content: "내용" },
      ] as never)

      const result = await buildFullContext("user-1", {
        selectedExternalDocumentIds: ["ext-1"],
      })

      expect(result).toContain("[외부 문서: 기타 문서")
      expect(result).not.toContain("null:")
    })

    it("selectedExternalDocumentIds가 비어있으면 외부 문서 섹션 없음", async () => {
      const result = await buildFullContext("user-1", {})

      expect(result).not.toContain("[외부 문서:")
      expect(mockExtDocFindMany).not.toHaveBeenCalled()
    })
  })

  describe("커리어노트", () => {
    it("includeCareerNotes=true면 전체 확정 커리어노트 content를 포함한다", async () => {
      mockNoteFindMany.mockResolvedValue([
        { id: "note-1", title: "MSA 전환", content: "팀 리드로 전환 주도한 전문 내용", metadata: null },
      ] as never)

      const result = await buildFullContext("user-1", {
        includeCareerNotes: true,
      })

      expect(result).toContain("[커리어노트:")
      expect(result).toContain("note-1")
      expect(result).toContain("팀 리드로 전환 주도한 전문 내용")
    })

    it("metadata가 있는 커리어노트는 직렬화된 메타데이터를 포함한다", async () => {
      mockNoteFindMany.mockResolvedValue([
        {
          id: "note-2",
          title: "프로젝트 리딩",
          content: "노트 본문",
          metadata: { tags: ["leadership", "backend"], year: 2023 },
        },
      ] as never)

      const result = await buildFullContext("user-1", {
        includeCareerNotes: true,
      })

      expect(result).toContain("메타데이터:")
      expect(result).toContain("leadership")
      expect(result).toContain("2023")
    })

    it("metadata가 null인 커리어노트는 메타데이터 줄을 포함하지 않는다", async () => {
      mockNoteFindMany.mockResolvedValue([
        { id: "note-3", title: "단순 노트", content: "본문만 있음", metadata: null },
      ] as never)

      const result = await buildFullContext("user-1", {
        includeCareerNotes: true,
      })

      expect(result).not.toContain("메타데이터:")
    })

    it("includeCareerNotes 미지정이면 커리어노트를 포함하지 않는다", async () => {
      const result = await buildFullContext("user-1", {})

      expect(result).not.toContain("[커리어노트:")
      expect(mockNoteFindMany).not.toHaveBeenCalled()
    })
  })

  it("여러 섹션이 있을 때 구분자(---)로 연결한다", async () => {
    mockDocFindMany.mockResolvedValue([
      { id: "doc-1", title: "이력서", extractedText: "문서 내용" },
    ] as never)
    mockNoteFindMany.mockResolvedValue([
      { id: "note-1", title: "노트", content: "노트 내용", metadata: null },
    ] as never)

    const result = await buildFullContext("user-1", {
      selectedDocumentIds: ["doc-1"],
      includeCareerNotes: true,
    })

    expect(result).toContain("---")
    expect(result).toContain("문서 내용")
    expect(result).toContain("노트 내용")
  })
})
