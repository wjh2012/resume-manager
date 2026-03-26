import { prisma } from "@/lib/prisma"
import {
  resolveDocumentType,
  verifyMagicBytes,
  MAX_FILE_SIZE,
} from "@/lib/validations/document"
import { parseFile } from "@/lib/files/parser"
import { uploadFile, deleteFile } from "@/lib/storage"
import { generateDocumentSummary } from "@/lib/documents/summary"

export class ExternalDocumentNotFoundError extends Error {
  constructor() {
    super("외부 문서를 찾을 수 없습니다.")
  }
}

export class ExternalDocumentValidationError extends Error {}

interface CreateFromTextData {
  title: string
  category?: string
  content: string
}

interface CreateResult {
  id: string
  title: string
  sourceType: string
}

// 텍스트 입력으로 외부 문서 생성
export async function createExternalDocumentFromText(
  userId: string,
  data: CreateFromTextData,
): Promise<CreateResult> {
  const document = await prisma.externalDocument.create({
    data: {
      userId,
      title: data.title,
      category: data.category ?? "",
      sourceType: "text",
      content: data.content,
    },
    select: { id: true, title: true, sourceType: true },
  })

  // 요약 생성 — 실패해도 생성 성공
  generateDocumentSummary(userId, data.content)
    .then(async ({ summary }) => {
      if (summary) {
        await prisma.externalDocument.update({
          where: { id: document.id },
          data: { summary },
        })
      }
    })
    .catch((e) => console.error("외부 문서 요약 생성 실패:", e))

  return document
}

// 파일 업로드로 외부 문서 생성
export async function createExternalDocumentFromFile(
  userId: string,
  file: File,
  title: string,
  category?: string,
): Promise<CreateResult> {
  if (file.size > MAX_FILE_SIZE) {
    throw new ExternalDocumentValidationError("파일 크기가 10MB를 초과합니다.")
  }

  const type = resolveDocumentType(file)
  if (!type) {
    throw new ExternalDocumentValidationError(
      "지원하지 않는 파일 형식입니다. (PDF, DOCX, TXT만 가능)",
    )
  }

  const buffer = await file.arrayBuffer()

  if (!verifyMagicBytes(buffer, type)) {
    throw new ExternalDocumentValidationError(
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
    throw new ExternalDocumentValidationError(
      "파일에서 텍스트를 추출할 수 없습니다.",
    )
  }

  // DB 저장
  let document: CreateResult
  try {
    document = await prisma.externalDocument.create({
      data: {
        userId,
        title,
        category: category ?? "",
        sourceType: "file",
        fileType: type,
        originalUrl: storagePath,
        fileSize: file.size,
        content: extractedText,
      },
      select: { id: true, title: true, sourceType: true },
    })
  } catch (error) {
    await deleteFile(storagePath).catch((e) =>
      console.error("Storage 정리 실패:", e),
    )
    throw error
  }

  // 요약 생성 — 실패해도 업로드 성공
  generateDocumentSummary(userId, extractedText)
    .then(async ({ summary }) => {
      if (summary) {
        await prisma.externalDocument.update({
          where: { id: document.id },
          data: { summary },
        })
      }
    })
    .catch((e) => console.error("외부 문서 요약 생성 실패:", e))

  return document
}

// 외부 문서 단건 조회 (소유권 검증 포함)
export async function getExternalDocument(
  documentId: string,
  userId: string,
) {
  const document = await prisma.externalDocument.findUnique({
    where: { id: documentId },
    select: {
      id: true,
      userId: true,
      title: true,
      category: true,
      sourceType: true,
      fileType: true,
      originalUrl: true,
      fileSize: true,
      content: true,
      summary: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  if (!document) return null
  // 소유권 불일치 시에도 null 반환 — 문서 존재 여부를 노출하지 않기 위한 의도적 설계
  if (document.userId !== userId) return null

  return document
}

// 외부 문서 목록 조회
export async function listExternalDocuments(userId: string) {
  return prisma.externalDocument.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      category: true,
      sourceType: true,
      fileType: true,
      fileSize: true,
      summary: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  })
}

// 외부 문서 수 조회
export async function countExternalDocuments(userId: string) {
  return prisma.externalDocument.count({
    where: { userId },
  })
}

// 외부 문서 수정
export async function updateExternalDocument(
  documentId: string,
  userId: string,
  data: { title?: string; category?: string; content?: string },
) {
  return prisma.$transaction(async (tx) => {
    const document = await tx.externalDocument.findUnique({
      where: { id: documentId, userId },
      select: { id: true, sourceType: true },
    })

    if (!document) {
      throw new ExternalDocumentNotFoundError()
    }

    // 파일 문서에서 content 수정 시도 차단
    if (document.sourceType === "file" && data.content !== undefined) {
      throw new ExternalDocumentValidationError(
        "파일 문서의 내용은 수정할 수 없습니다.",
      )
    }

    const updateData: Record<string, string> = {}
    if (data.title !== undefined) updateData.title = data.title
    if (data.category !== undefined) updateData.category = data.category
    if (data.content !== undefined) updateData.content = data.content

    // Defense-in-depth: userId는 위 findUnique에서 트랜잭션 내 검증 완료.
    // Prisma update는 @@unique 필드만 where에 허용하므로 id만 사용.
    return tx.externalDocument.update({
      where: { id: documentId },
      data: updateData,
      select: { id: true, title: true, category: true, sourceType: true },
    })
  })
}

// 외부 문서 삭제: 트랜잭션(URL 획득 + 원자적 소유권 검증+삭제) → Storage 정리
export async function deleteExternalDocument(
  documentId: string,
  userId: string,
): Promise<void> {
  const { originalUrl } = await prisma.$transaction(async (tx) => {
    // URL 획득 (소유권 확인 안 함)
    const document = await tx.externalDocument.findUnique({
      where: { id: documentId },
      select: { originalUrl: true },
    })

    // 원자적 소유권 확인 + 삭제
    const { count } = await tx.externalDocument.deleteMany({
      where: { id: documentId, userId },
    })

    if (count === 0) {
      throw new ExternalDocumentNotFoundError()
    }

    return { originalUrl: document?.originalUrl ?? null }
  })

  // DB 삭제 성공 후에만 Storage 정리
  if (originalUrl) {
    await deleteFile(originalUrl).catch((e) =>
      console.error("Storage 정리 실패:", e),
    )
  }
}
