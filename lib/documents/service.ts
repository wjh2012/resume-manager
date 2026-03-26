import { prisma } from "@/lib/prisma"
import { parseFile } from "@/lib/files/parser"
import { uploadFile, deleteFile } from "@/lib/storage"
import {
  resolveDocumentType,
  verifyMagicBytes,
  MAX_FILE_SIZE,
  type DocumentType,
} from "@/lib/validations/document"
import { MAX_CONTENT_LENGTH } from "@/lib/validations/external-document"
import { generateDocumentSummary } from "@/lib/documents/summary"

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
}

// 문서 업로드: 파싱 → DB 저장
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

  if (extractedText.length > MAX_CONTENT_LENGTH) {
    await deleteFile(storagePath).catch((e) =>
      console.error("Storage 정리 실패:", e),
    )
    throw new DocumentValidationError(
      `추출된 텍스트가 ${MAX_CONTENT_LENGTH.toLocaleString()}자를 초과합니다.`,
    )
  }

  // DB 저장
  let document: { id: string }
  try {
    document = await prisma.document.create({
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
  } catch (error) {
    await deleteFile(storagePath).catch((e) =>
      console.error("Storage 정리 실패:", e),
    )
    throw error
  }

  // 요약 생성 — 트랜잭션 외부에서 실행 (실패해도 업로드 성공)
  generateDocumentSummary(userId, extractedText)
    .then(async ({ summary }) => {
      if (summary) {
        await prisma.document.update({
          where: { id: document.id },
          data: { summary },
        })
      }
    })
    .catch((e) => console.error("문서 요약 생성 실패:", e))

  return {
    id: document.id,
    title,
    type,
    fileSize: file.size,
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
      summary: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

// 사용자 문서 수 조회
export async function countDocuments(userId: string) {
  return prisma.document.count({
    where: { userId },
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
      summary: true,
    },
  })

  if (!document) return null
  // 소유권 불일치 시에도 null 반환 — 문서 존재 여부를 노출하지 않기 위한 의도적 설계
  if (document.userId !== userId) return null

  return document
}
