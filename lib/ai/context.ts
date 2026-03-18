import { embed } from "ai"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getEmbeddingModel } from "@/lib/ai/embedding"
import type { BuildContextOptions } from "@/types/ai"

// 단일 쿼리에 대한 임베딩 벡터 생성
export async function generateQueryEmbedding(query: string): Promise<number[]> {
  const { embedding } = await embed({
    model: getEmbeddingModel(),
    value: query,
    maxRetries: 3,
  })
  return embedding
}

interface SimilarChunk {
  id: string
  documentId: string
  content: string
  chunkIndex: number
  distance: number
}

// pgvector 코사인 거리 검색
export async function searchSimilarChunks(
  embedding: number[],
  opts: {
    userId: string
    limitToDocumentIds?: string[]
    maxChunks?: number
  },
): Promise<SimilarChunk[]> {
  const vectorStr = `[${embedding.join(",")}]`
  const limit = opts.maxChunks ?? 5

  const docFilter =
    opts.limitToDocumentIds && opts.limitToDocumentIds.length > 0
      ? Prisma.sql`AND dc.document_id IN (${Prisma.join(opts.limitToDocumentIds.map((id) => Prisma.sql`${id}::uuid`))})`
      : Prisma.empty

  return prisma.$queryRaw<SimilarChunk[]>`
    SELECT dc.id, dc.document_id AS "documentId", dc.content,
           dc.chunk_index AS "chunkIndex",
           dc.embedding <=> ${vectorStr}::vector AS distance
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE d.user_id = ${opts.userId}::uuid
      AND dc.embedding IS NOT NULL
      ${docFilter}
    ORDER BY distance ASC
    LIMIT ${limit}
  `
}

// RAG 컨텍스트 빌더: 선택 문서 + 벡터 검색 + 인사이트 조합
export async function buildContext(
  userId: string,
  opts: BuildContextOptions,
): Promise<string> {
  const parts: string[] = []

  // 1 & 2를 병렬 실행: 선택 문서 조회 + 임베딩 생성은 독립적
  const [selectedDocs, queryEmbedding] = await Promise.all([
    opts.selectedDocumentIds && opts.selectedDocumentIds.length > 0
      ? prisma.document.findMany({
          where: {
            id: { in: opts.selectedDocumentIds },
            userId,
          },
          select: { title: true, extractedText: true },
        })
      : Promise.resolve([]),
    generateQueryEmbedding(opts.query),
  ])

  // 1. 사용자 선택 문서의 전체 텍스트 포함
  for (const doc of selectedDocs) {
    if (doc.extractedText) {
      parts.push(`[문서: ${doc.title}]\n${doc.extractedText}`)
    }
  }

  // 2. RAG 벡터 검색으로 관련 청크 포함
  const chunks = await searchSimilarChunks(queryEmbedding, {
    userId,
    limitToDocumentIds: opts.limitToDocumentIds,
    maxChunks: opts.maxChunks,
  })

  if (chunks.length > 0) {
    const chunkTexts = chunks.map(
      (c, i) => `[관련 내용 ${i + 1}]\n${c.content}`,
    )
    parts.push(chunkTexts.join("\n\n"))
  }

  // 3. 인사이트 포함 (Phase 5 전까지는 빈 결과)
  if (opts.includeInsights) {
    const insights = await prisma.insight.findMany({
      where: { userId },
      select: { category: true, title: true, content: true },
      orderBy: { createdAt: "desc" },
      take: 10,
    })

    if (insights.length > 0) {
      const insightTexts = insights.map(
        (ins) => `[인사이트: ${ins.category} - ${ins.title}]\n${ins.content}`,
      )
      parts.push(insightTexts.join("\n\n"))
    }
  }

  return parts.join("\n\n---\n\n")
}
