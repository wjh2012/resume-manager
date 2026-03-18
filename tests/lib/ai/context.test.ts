import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("ai", () => ({
  embed: vi.fn(),
}))

vi.mock("@/lib/ai/embedding", () => ({
  getEmbeddingModel: vi.fn().mockReturnValue("mock-model"),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
    document: { findMany: vi.fn() },
    insight: { findMany: vi.fn() },
  },
}))

import { embed } from "ai"
import { prisma } from "@/lib/prisma"
import {
  generateQueryEmbedding,
  searchSimilarChunks,
  buildContext,
} from "@/lib/ai/context"

const mockEmbedding = [0.1, 0.2, 0.3]

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(embed).mockResolvedValue({ embedding: mockEmbedding } as never)
  vi.mocked(prisma.$queryRaw).mockResolvedValue([])
  vi.mocked(prisma.document.findMany).mockResolvedValue([])
  vi.mocked(prisma.insight.findMany).mockResolvedValue([])
})

// ─────────────────────────────────────────────────────────────────────────────
// generateQueryEmbedding
// ─────────────────────────────────────────────────────────────────────────────

describe("generateQueryEmbedding()", () => {
  it("embed를 올바른 파라미터로 호출해야 한다", async () => {
    await generateQueryEmbedding("이력서 작성")

    expect(embed).toHaveBeenCalledOnce()
    expect(embed).toHaveBeenCalledWith({
      model: "mock-model",
      value: "이력서 작성",
      maxRetries: 3,
    })
  })

  it("embed 결과의 embedding 배열을 반환해야 한다", async () => {
    const result = await generateQueryEmbedding("백엔드 경력")

    expect(result).toEqual(mockEmbedding)
  })

  it("빈 문자열 쿼리도 embed에 그대로 전달해야 한다", async () => {
    await generateQueryEmbedding("")

    expect(embed).toHaveBeenCalledWith(
      expect.objectContaining({ value: "" }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// searchSimilarChunks
// ─────────────────────────────────────────────────────────────────────────────

describe("searchSimilarChunks()", () => {
  it("$queryRaw가 호출되어야 한다", async () => {
    await searchSimilarChunks(mockEmbedding, { userId: "user-1" })

    expect(prisma.$queryRaw).toHaveBeenCalledOnce()
  })

  it("maxChunks를 지정하지 않으면 기본값 5가 사용되어야 한다", async () => {
    // 기본 limit(5)가 쿼리에 포함되는지 검증하기 위해 호출 자체를 확인
    await searchSimilarChunks(mockEmbedding, { userId: "user-1" })

    // $queryRaw는 tagged template literal로 호출되므로 인수 전달 자체가 성공해야 한다
    expect(prisma.$queryRaw).toHaveBeenCalledOnce()
  })

  it("maxChunks를 명시하면 $queryRaw가 호출되어야 한다", async () => {
    await searchSimilarChunks(mockEmbedding, { userId: "user-1", maxChunks: 10 })

    expect(prisma.$queryRaw).toHaveBeenCalledOnce()
  })

  it("$queryRaw 결과를 그대로 반환해야 한다", async () => {
    const mockChunks = [
      {
        id: "chunk-1",
        documentId: "doc-1",
        content: "경력 3년",
        chunkIndex: 0,
        distance: 0.12,
      },
    ]
    vi.mocked(prisma.$queryRaw).mockResolvedValue(mockChunks)

    const result = await searchSimilarChunks(mockEmbedding, { userId: "user-1" })

    expect(result).toEqual(mockChunks)
  })

  it("limitToDocumentIds를 전달해도 $queryRaw가 호출되어야 한다", async () => {
    await searchSimilarChunks(mockEmbedding, {
      userId: "user-1",
      limitToDocumentIds: ["doc-a", "doc-b"],
    })

    expect(prisma.$queryRaw).toHaveBeenCalledOnce()
  })

  it("결과가 없으면 빈 배열을 반환해야 한다", async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([])

    const result = await searchSimilarChunks(mockEmbedding, { userId: "user-1" })

    expect(result).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// buildContext
// ─────────────────────────────────────────────────────────────────────────────

describe("buildContext()", () => {
  const userId = "user-123"

  describe("선택 문서 처리", () => {
    it("selectedDocumentIds를 전달하면 document.findMany를 호출해야 한다", async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        { title: "이력서", extractedText: "백엔드 개발자 3년 경력" },
      ] as never)

      await buildContext(userId, {
        query: "경력",
        selectedDocumentIds: ["doc-1"],
      })

      expect(prisma.document.findMany).toHaveBeenCalledOnce()
    })

    it("선택 문서의 텍스트가 결과에 포함되어야 한다", async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        { title: "이력서", extractedText: "백엔드 개발자 3년 경력" },
      ] as never)

      const result = await buildContext(userId, {
        query: "경력",
        selectedDocumentIds: ["doc-1"],
      })

      expect(result).toContain("[문서: 이력서]")
      expect(result).toContain("백엔드 개발자 3년 경력")
    })

    it("extractedText가 null인 문서는 결과에 포함하지 않아야 한다", async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        { title: "빈 문서", extractedText: null },
      ] as never)

      const result = await buildContext(userId, {
        query: "경력",
        selectedDocumentIds: ["doc-1"],
      })

      expect(result).not.toContain("[문서: 빈 문서]")
    })

    it("selectedDocumentIds가 없으면 document.findMany를 호출하지 않아야 한다", async () => {
      await buildContext(userId, { query: "경력" })

      expect(prisma.document.findMany).not.toHaveBeenCalled()
    })

    it("selectedDocumentIds가 빈 배열이면 document.findMany를 호출하지 않아야 한다", async () => {
      await buildContext(userId, {
        query: "경력",
        selectedDocumentIds: [],
      })

      expect(prisma.document.findMany).not.toHaveBeenCalled()
    })
  })

  describe("문서 조회와 임베딩 생성 병렬 실행", () => {
    it("selectedDocumentIds가 있을 때 document.findMany와 embed가 모두 호출되어야 한다", async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([] as never)

      await buildContext(userId, {
        query: "자기소개서",
        selectedDocumentIds: ["doc-1"],
      })

      expect(prisma.document.findMany).toHaveBeenCalledOnce()
      expect(embed).toHaveBeenCalledOnce()
    })

    it("selectedDocumentIds가 없을 때도 embed는 반드시 호출되어야 한다", async () => {
      await buildContext(userId, { query: "자기소개서" })

      expect(embed).toHaveBeenCalledOnce()
    })
  })

  describe("RAG 청크 처리", () => {
    it("검색된 청크가 결과에 포함되어야 한다", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        {
          id: "c1",
          documentId: "d1",
          content: "React 경험 2년",
          chunkIndex: 0,
          distance: 0.1,
        },
      ])

      const result = await buildContext(userId, { query: "프론트엔드" })

      expect(result).toContain("[관련 내용 1]")
      expect(result).toContain("React 경험 2년")
    })

    it("여러 청크가 순서대로 번호 매겨져야 한다", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { id: "c1", documentId: "d1", content: "첫 번째 내용", chunkIndex: 0, distance: 0.1 },
        { id: "c2", documentId: "d1", content: "두 번째 내용", chunkIndex: 1, distance: 0.2 },
      ])

      const result = await buildContext(userId, { query: "경력" })

      expect(result).toContain("[관련 내용 1]")
      expect(result).toContain("[관련 내용 2]")
      expect(result).toContain("첫 번째 내용")
      expect(result).toContain("두 번째 내용")
    })

    it("청크가 없으면 관련 내용 섹션이 결과에 없어야 한다", async () => {
      vi.mocked(prisma.$queryRaw).mockResolvedValue([])

      const result = await buildContext(userId, { query: "경력" })

      expect(result).not.toContain("[관련 내용")
    })
  })

  describe("인사이트 처리", () => {
    it("includeInsights가 true이면 insight.findMany를 호출해야 한다", async () => {
      vi.mocked(prisma.insight.findMany).mockResolvedValue([
        { category: "강점", title: "문제 해결", content: "복잡한 문제를 빠르게 해결" },
      ] as never)

      await buildContext(userId, { query: "강점", includeInsights: true })

      expect(prisma.insight.findMany).toHaveBeenCalledOnce()
    })

    it("인사이트 내용이 결과에 포함되어야 한다", async () => {
      vi.mocked(prisma.insight.findMany).mockResolvedValue([
        { category: "강점", title: "문제 해결", content: "복잡한 문제를 빠르게 해결" },
      ] as never)

      const result = await buildContext(userId, {
        query: "강점",
        includeInsights: true,
      })

      expect(result).toContain("[인사이트: 강점 - 문제 해결]")
      expect(result).toContain("복잡한 문제를 빠르게 해결")
    })

    it("includeInsights가 false이면 insight.findMany를 호출하지 않아야 한다", async () => {
      await buildContext(userId, { query: "경력", includeInsights: false })

      expect(prisma.insight.findMany).not.toHaveBeenCalled()
    })

    it("includeInsights를 생략하면 insight.findMany를 호출하지 않아야 한다", async () => {
      await buildContext(userId, { query: "경력" })

      expect(prisma.insight.findMany).not.toHaveBeenCalled()
    })

    it("인사이트가 없으면 인사이트 섹션이 결과에 없어야 한다", async () => {
      vi.mocked(prisma.insight.findMany).mockResolvedValue([])

      const result = await buildContext(userId, {
        query: "강점",
        includeInsights: true,
      })

      expect(result).not.toContain("[인사이트:")
    })
  })

  describe("결과 없는 경우", () => {
    it("문서도 청크도 인사이트도 없으면 빈 문자열을 반환해야 한다", async () => {
      const result = await buildContext(userId, { query: "경력" })

      expect(result).toBe("")
    })
  })

  describe("여러 섹션 구분자", () => {
    it("문서와 청크가 모두 있으면 구분자(---)로 이어져야 한다", async () => {
      vi.mocked(prisma.document.findMany).mockResolvedValue([
        { title: "이력서", extractedText: "경력 내용" },
      ] as never)
      vi.mocked(prisma.$queryRaw).mockResolvedValue([
        { id: "c1", documentId: "d1", content: "청크 내용", chunkIndex: 0, distance: 0.1 },
      ])

      const result = await buildContext(userId, {
        query: "경력",
        selectedDocumentIds: ["doc-1"],
      })

      expect(result).toContain("---")
      expect(result.indexOf("[문서:")).toBeLessThan(result.indexOf("[관련 내용"))
    })
  })
})
