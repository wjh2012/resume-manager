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

/**
 * pgvector 코사인 거리 검색
 *
 * @param embedding - 쿼리 임베딩 벡터
 * @param opts.userId - 문서 소유자 ID
 * @param opts.limitToDocumentIds - 검색 범위를 특정 문서로 제한 (미지정 시 전체 문서)
 * @param opts.excludeDocumentIds - 검색에서 제외할 문서 ID (selectedDocumentIds와의 중복 방지용)
 * @param opts.maxChunks - 반환할 최대 청크 수 (기본값: 5)
 * @param opts.threshold - 유사도 임계값. 이 거리 이하의 청크만 반환 (기본값: 0.7)
 */
export async function searchSimilarChunks(
  embedding: number[],
  opts: {
    userId: string
    limitToDocumentIds?: string[]
    excludeDocumentIds?: string[]
    maxChunks?: number
    threshold?: number
  },
): Promise<SimilarChunk[]> {
  const vectorStr = `[${embedding.join(",")}]`
  const limit = opts.maxChunks ?? 5
  const threshold = opts.threshold ?? 0.7

  const docFilter =
    opts.limitToDocumentIds && opts.limitToDocumentIds.length > 0
      ? Prisma.sql`AND dc.document_id IN (${Prisma.join(opts.limitToDocumentIds.map((id) => Prisma.sql`${id}::uuid`))})`
      : Prisma.empty

  const excludeFilter =
    opts.excludeDocumentIds && opts.excludeDocumentIds.length > 0
      ? Prisma.sql`AND dc.document_id NOT IN (${Prisma.join(opts.excludeDocumentIds.map((id) => Prisma.sql`${id}::uuid`))})`
      : Prisma.empty

  return prisma.$queryRaw<SimilarChunk[]>`
    SELECT dc.id, dc.document_id AS "documentId", dc.content,
           dc.chunk_index AS "chunkIndex",
           dc.embedding <=> ${vectorStr}::vector AS distance
    FROM document_chunks dc
    JOIN documents d ON d.id = dc.document_id
    WHERE d.user_id = ${opts.userId}::uuid
      AND dc.embedding IS NOT NULL
      AND (dc.embedding <=> ${vectorStr}::vector) < ${threshold}
      ${docFilter}
      ${excludeFilter}
    ORDER BY distance ASC
    LIMIT ${limit}
  `
}

/**
 * RAG 컨텍스트 빌더: 선택 문서(전체 텍스트) + 벡터 검색(관련 청크) + 인사이트 조합
 *
 * @param userId - 사용자 ID
 * @param opts.query - 벡터 검색용 쿼리 텍스트
 * @param opts.selectedDocumentIds - 전체 텍스트를 포함할 문서 ID 목록. 벡터 검색에서는 자동 제외되어 중복 방지
 * @param opts.limitToDocumentIds - 벡터 검색 범위를 특정 문서로 제한
 * @param opts.includeInsights - 인사이트 포함 여부
 * @param opts.maxChunks - 벡터 검색 최대 청크 수
 */
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

  // 2. RAG 벡터 검색으로 관련 청크 포함 (selectedDocumentIds는 제외하여 중복 방지)
  const chunks = await searchSimilarChunks(queryEmbedding, {
    userId,
    limitToDocumentIds: opts.limitToDocumentIds,
    excludeDocumentIds: opts.selectedDocumentIds,
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

  // Career Notes injection (커리어노트 주입)
  // 추출 컨텍스트에서는 최대 50개, 자소서 컨텍스트에서는 최대 10개 사용
  if (opts.includeCareerNotes && userId) {
    const careerNotes = await prisma.careerNote.findMany({
      where: { userId, status: "CONFIRMED" },
      select: { title: true, content: true, metadata: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    })

    if (careerNotes.length > 0) {
      for (const note of careerNotes) {
        const meta = note.metadata as Record<string, string> | null
        const metaLine = meta
          ? [
              meta.role && `역할: ${meta.role}`,
              meta.result && `성과: ${meta.result}`,
              meta.feeling && `느낀 점: ${meta.feeling}`,
            ]
              .filter(Boolean)
              .join(" | ")
          : ""

        parts.push(
          `[커리어노트: ${note.title}]\n${note.content}${metaLine ? `\n${metaLine}` : ""}`,
        )
      }
    }
  }

  return parts.join("\n\n---\n\n")
}
