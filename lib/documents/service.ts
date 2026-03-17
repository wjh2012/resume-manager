import { prisma } from "@/lib/prisma"
import { parseFile } from "@/lib/files/parser"
import { uploadFile, deleteFile } from "@/lib/storage"
import { splitIntoChunks, generateEmbeddings } from "@/lib/ai/embedding"
import {
  resolveDocumentType,
  verifyMagicBytes,
  MAX_FILE_SIZE,
  type DocumentType,
} from "@/lib/validations/document"

export class DocumentNotFoundError extends Error {
  constructor() {
    super("문서를 찾을 수 없습니다.")
  }
}

export class DocumentForbiddenError extends Error {
  constructor() {
    super("이 문서에 대한 권한이 없습니다.")
  }
}

export class DocumentValidationError extends Error {}

interface UploadResult {
  id: string
  title: string
  type: DocumentType
  fileSize: number
  chunkCount: number
}

// 문서 업로드: 파싱 → 청크 분할 → DB 저장 → 임베딩
export async function uploadDocument(
  userId: string,
  file: File,
  title: string,
): Promise<UploadResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new DocumentValidationError("파일 크기가 10MB를 초과합니다.")
  }

  const type = resolveDocumentType(file)
  if (!type) {
    throw new DocumentValidationError(
      "지원하지 않는 파일 형식입니다. (PDF, DOCX, TXT만 가능)",
    )
  }

  // 버퍼를 한 번만 읽어서 파싱과 Storage 업로드에 공유
  const buffer = await file.arrayBuffer()

  if (!verifyMagicBytes(buffer, type)) {
    throw new DocumentValidationError(
      "파일 내용이 확장자와 일치하지 않습니다.",
    )
  }

  // 파싱과 Storage 업로드를 동시 실행
  const [extractedText, storagePath] = await Promise.all([
    parseFile(buffer, type),
    uploadFile(userId, file.name, new Blob([buffer], { type: file.type })),
  ])

  if (!extractedText) {
    await deleteFile(storagePath).catch((e) =>
      console.error("Storage 정리 실패:", e),
    )
    throw new DocumentValidationError("파일에서 텍스트를 추출할 수 없습니다.")
  }

  const chunks = splitIntoChunks(extractedText)

  // DB 저장 (트랜잭션)
  let document: { id: string }
  try {
    document = await prisma.$transaction(async (tx) => {
      const doc = await tx.document.create({
        data: {
          userId,
          title,
          type,
          originalUrl: storagePath,
          extractedText,
          fileSize: file.size,
        },
        select: { id: true },
      })

      if (chunks.length > 0) {
        await tx.documentChunk.createMany({
          data: chunks.map((content, index) => ({
            documentId: doc.id,
            content,
            chunkIndex: index,
          })),
        })
      }

      return doc
    })
  } catch (error) {
    await deleteFile(storagePath).catch((e) =>
      console.error("Storage 정리 실패:", e),
    )
    throw error
  }

  // 임베딩 생성 (트랜잭션 외부 — 실패해도 문서는 유지)
  if (chunks.length > 0) {
    try {
      const embeddings = await generateEmbeddings(chunks)

      const dbChunks = await prisma.documentChunk.findMany({
        where: { documentId: document.id },
        orderBy: { chunkIndex: "asc" },
        select: { id: true },
      })

      if (embeddings.length !== dbChunks.length) {
        throw new Error(
          `임베딩 수 불일치: ${embeddings.length} vs ${dbChunks.length}`,
        )
      }

      // 배치 업데이트로 N+1 방지
      await prisma.$transaction(
        dbChunks.map((chunk, i) => {
          const vectorStr = `[${embeddings[i].join(",")}]`
          return prisma.$executeRaw`
            UPDATE document_chunks
            SET embedding = ${vectorStr}::vector
            WHERE id = ${chunk.id}::uuid
          `
        }),
      )
    } catch {
      console.error("임베딩 생성 실패 (문서는 정상 저장됨):", document.id)
    }
  }

  return {
    id: document.id,
    title,
    type,
    fileSize: file.size,
    chunkCount: chunks.length,
  }
}

// 문서 삭제: 소유권 검증 → Storage 삭제 → DB cascade 삭제
export async function deleteDocument(
  documentId: string,
  userId: string,
): Promise<void> {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: { userId: true, originalUrl: true },
  })

  if (!document) {
    throw new DocumentNotFoundError()
  }

  if (document.userId !== userId) {
    throw new DocumentForbiddenError()
  }

  await deleteFile(document.originalUrl).catch((e) =>
    console.error("Storage 정리 실패:", e),
  )

  await prisma.document.delete({
    where: { id: documentId },
  })
}

// 사용자 문서 목록 조회
export async function listDocuments(userId: string) {
  return prisma.document.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      type: true,
      fileSize: true,
      createdAt: true,
      _count: { select: { chunks: true } },
    },
    orderBy: { createdAt: "desc" },
  })
}

// 문서 상세 조회 (소유권 검증 포함)
export async function getDocument(documentId: string, userId: string) {
  const document = await prisma.document.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      userId: true,
      title: true,
      type: true,
      extractedText: true,
      fileSize: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { chunks: true } },
    },
  })

  if (!document) return null
  // 소유권 불일치 시에도 null 반환 — 문서 존재 여부를 노출하지 않기 위한 의도적 설계
  if (document.userId !== userId) return null

  return document
}
