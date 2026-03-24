import { prisma } from "@/lib/prisma"

export class InterviewNotFoundError extends Error {
  constructor() {
    super("면접 세션을 찾을 수 없습니다.")
  }
}

export class InterviewForbiddenError extends Error {
  constructor() {
    super("이 면접 세션에 대한 권한이 없습니다.")
  }
}

export class InterviewAlreadyCompletedError extends Error {
  constructor() {
    super("이미 종료된 면접 세션입니다.")
  }
}

interface CreateInterviewData {
  title: string
  companyName?: string
  position?: string
  documentIds: string[]
  selectedExternalDocumentIds?: string[]
}

// 면접 세션 생성: InterviewSession + InterviewDocument + Conversation 트랜잭션
export async function createInterview(userId: string, data: CreateInterviewData) {
  return prisma.$transaction(async (tx) => {
    const uniqueDocIds = [...new Set(data.documentIds)]
    const ownedCount = await tx.document.count({
      where: { id: { in: uniqueDocIds }, userId },
    })
    if (ownedCount !== uniqueDocIds.length) {
      throw new InterviewForbiddenError()
    }

    const session = await tx.interviewSession.create({
      data: {
        userId,
        title: data.title,
        companyName: data.companyName,
        position: data.position,
      },
      select: { id: true },
    })

    await tx.interviewDocument.createMany({
      data: uniqueDocIds.map((documentId) => ({
        interviewSessionId: session.id,
        documentId,
      })),
    })

    if (data.selectedExternalDocumentIds && data.selectedExternalDocumentIds.length > 0) {
      const ownedExtCount = await tx.externalDocument.count({
        where: { id: { in: data.selectedExternalDocumentIds }, userId },
      })
      if (ownedExtCount !== data.selectedExternalDocumentIds.length) {
        throw new InterviewForbiddenError()
      }
      await tx.interviewExternalDoc.createMany({
        data: data.selectedExternalDocumentIds.map((externalDocumentId) => ({
          interviewSessionId: session.id,
          externalDocumentId,
        })),
      })
    }

    await tx.conversation.create({
      data: {
        userId,
        type: "INTERVIEW",
        interviewSessionId: session.id,
      },
    })

    return session
  })
}

// 면접 세션 상세 조회 (conversation, messages, documents 포함)
export async function getInterview(id: string, userId: string) {
  const session = await prisma.interviewSession.findUnique({
    where: { id },
    include: {
      conversations: {
        where: { type: "INTERVIEW" },
        select: {
          id: true,
          messages: {
            select: { id: true, role: true, content: true, createdAt: true },
            orderBy: { createdAt: "asc" },
          },
        },
        take: 1,
      },
      interviewDocuments: {
        select: {
          document: {
            select: { id: true, title: true, type: true },
          },
        },
      },
      interviewExternalDocs: {
        select: {
          externalDocument: {
            select: { id: true, title: true, category: true, sourceType: true },
          },
        },
      },
    },
  })

  if (!session) return null
  if (session.userId !== userId) return null

  return session
}

// 면접 세션 목록 조회 (문서 수 포함)
export async function listInterviews(userId: string) {
  return prisma.interviewSession.findMany({
    where: { userId },
    select: {
      id: true,
      title: true,
      companyName: true,
      position: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { interviewDocuments: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  })
}

// 면접 종료 (status → COMPLETED)
export async function completeInterview(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.interviewSession.findUnique({
      where: { id },
      select: { id: true, userId: true, status: true },
    })

    if (!record) throw new InterviewNotFoundError()
    if (record.userId !== userId) throw new InterviewForbiddenError()
    if (record.status === "COMPLETED") throw new InterviewAlreadyCompletedError()

    return tx.interviewSession.update({
      where: { id },
      data: { status: "COMPLETED" },
      select: { id: true, status: true, updatedAt: true },
    })
  })
}

// 면접 세션 삭제 (cascade)
export async function deleteInterview(id: string, userId: string) {
  return prisma.$transaction(async (tx) => {
    const record = await tx.interviewSession.findUnique({ where: { id }, select: { id: true, userId: true } })
    if (!record) throw new InterviewNotFoundError()
    if (record.userId !== userId) throw new InterviewForbiddenError()
    await tx.interviewSession.delete({ where: { id } })
  })
}
