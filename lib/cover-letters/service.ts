import { prisma } from "@/lib/prisma"

export class CoverLetterNotFoundError extends Error {
  constructor() {
    super("자기소개서를 찾을 수 없습니다.")
  }
}

export class CoverLetterForbiddenError extends Error {
  constructor() {
    super("이 자기소개서에 대한 권한이 없습니다.")
  }
}

interface CreateCoverLetterData {
  title: string
  companyName: string
  position: string
  selectedDocumentIds?: string[]
  selectedExternalDocumentIds?: string[]
}

interface UpdateCoverLetterData {
  title?: string
  content?: string
  status?: "DRAFT" | "COMPLETED"
}

// 자기소개서 생성: CoverLetter + Conversation + CoverLetterDocument 트랜잭션
export async function createCoverLetter(userId: string, data: CreateCoverLetterData) {
  return prisma.$transaction(async (tx) => {
    const coverLetter = await tx.coverLetter.create({
      data: {
        userId,
        title: data.title,
        companyName: data.companyName,
        position: data.position,
      },
      select: { id: true },
    })

    await tx.conversation.create({
      data: {
        userId,
        type: "COVER_LETTER",
        coverLetterId: coverLetter.id,
      },
    })

    if (data.selectedDocumentIds && data.selectedDocumentIds.length > 0) {
      const ownedCount = await tx.document.count({
        where: { id: { in: data.selectedDocumentIds }, userId },
      })
      if (ownedCount !== data.selectedDocumentIds.length) {
        throw new CoverLetterForbiddenError()
      }

      await tx.coverLetterDocument.createMany({
        data: data.selectedDocumentIds.map((documentId) => ({
          coverLetterId: coverLetter.id,
          documentId,
        })),
      })
    }

    if (data.selectedExternalDocumentIds && data.selectedExternalDocumentIds.length > 0) {
      const ownedExtCount = await tx.externalDocument.count({
        where: { id: { in: data.selectedExternalDocumentIds }, userId },
      })
      if (ownedExtCount !== data.selectedExternalDocumentIds.length) {
        throw new CoverLetterForbiddenError()
      }
      await tx.coverLetterExternalDoc.createMany({
        data: data.selectedExternalDocumentIds.map((externalDocumentId) => ({
          coverLetterId: coverLetter.id,
          externalDocumentId,
        })),
      })
    }

    return coverLetter
  })
}

// 자기소개서 상세 조회 (conversation, selectedDocs 포함)
export async function getCoverLetter(id: string, userId: string) {
  const coverLetter = await prisma.coverLetter.findUnique({
    where: { id },
    include: {
      conversations: {
        where: { type: "COVER_LETTER" },
        select: {
          id: true,
          messages: {
            select: { id: true, role: true, content: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
        take: 1,
      },
      coverLetterDocuments: {
        select: {
          document: {
            select: { id: true, title: true, type: true },
          },
        },
      },
      coverLetterExternalDocs: {
        select: {
          externalDocument: {
            select: { id: true, title: true, category: true, sourceType: true },
          },
        },
      },
    },
  })

  if (!coverLetter) return null
  if (coverLetter.userId !== userId) return null

  return coverLetter
}

// 자기소개서 목록 조회
export async function listCoverLetters(userId: string) {
  return prisma.coverLetter.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      companyName: true,
      position: true,
      status: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
  })
}

// 자기소개서 내용/상태 업데이트
export async function updateCoverLetter(
  id: string,
  userId: string,
  data: UpdateCoverLetterData,
) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.coverLetter.findUnique({ where: { id }, select: { id: true, userId: true } })
    if (!record) throw new CoverLetterNotFoundError()
    if (record.userId !== userId) throw new CoverLetterForbiddenError()
    return tx.coverLetter.update({
      where: { id },
      data,
      select: { id: true, title: true, content: true, status: true, updatedAt: true },
    })
  })
}

// 자기소개서 삭제 (cascade)
export async function deleteCoverLetter(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.coverLetter.findUnique({ where: { id }, select: { id: true, userId: true } })
    if (!record) throw new CoverLetterNotFoundError()
    if (record.userId !== userId) throw new CoverLetterForbiddenError()
    await tx.coverLetter.delete({ where: { id } })
  })
}

// 참고 문서 선택 변경
export async function updateSelectedDocuments(
  coverLetterId: string,
  userId: string,
  documentIds: string[],
) {
  await prisma.$transaction(async (tx) => {
    const coverLetter = await tx.coverLetter.findUnique({
      where: { id: coverLetterId },
      select: { userId: true },
    })

    if (!coverLetter) {
      throw new CoverLetterNotFoundError()
    }

    if (coverLetter.userId !== userId) {
      throw new CoverLetterForbiddenError()
    }

    if (documentIds.length > 0) {
      const ownedCount = await tx.document.count({
        where: { id: { in: documentIds }, userId },
      })
      if (ownedCount !== documentIds.length) {
        throw new CoverLetterForbiddenError()
      }
    }

    await tx.coverLetterDocument.deleteMany({
      where: { coverLetterId },
    })

    if (documentIds.length > 0) {
      await tx.coverLetterDocument.createMany({
        data: documentIds.map((documentId) => ({
          coverLetterId,
          documentId,
        })),
      })
    }
  })
}

// 참고 외부 문서 선택 변경
export async function updateSelectedExternalDocuments(
  coverLetterId: string,
  userId: string,
  externalDocumentIds: string[],
) {
  return prisma.$transaction(async (tx) => {
    const coverLetter = await tx.coverLetter.findUnique({
      where: { id: coverLetterId },
      select: { userId: true },
    })
    if (!coverLetter) throw new CoverLetterNotFoundError()
    if (coverLetter.userId !== userId) throw new CoverLetterForbiddenError()

    if (externalDocumentIds.length > 0) {
      const ownedCount = await tx.externalDocument.count({
        where: { id: { in: externalDocumentIds }, userId },
      })
      if (ownedCount !== externalDocumentIds.length) {
        throw new CoverLetterForbiddenError()
      }
    }

    await tx.coverLetterExternalDoc.deleteMany({
      where: { coverLetterId },
    })

    if (externalDocumentIds.length > 0) {
      await tx.coverLetterExternalDoc.createMany({
        data: externalDocumentIds.map((externalDocumentId) => ({
          coverLetterId,
          externalDocumentId,
        })),
      })
    }
  })
}

// 대화 메시지 조회
export async function getConversationMessages(conversationId: string, userId: string) {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { userId: true },
  })

  if (!conversation) return null
  if (conversation.userId !== userId) return null

  return prisma.message.findMany({
    where: { conversationId },
    select: { id: true, role: true, content: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  })
}
