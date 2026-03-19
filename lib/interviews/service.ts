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

interface CreateInterviewData {
  title: string
  companyName?: string
  position?: string
  documentIds: string[]
}

// 면접 세션 생성: InterviewSession + InterviewDocument + Conversation 트랜잭션
export async function createInterview(userId: string, data: CreateInterviewData) {
  return prisma.$transaction(async (tx) => {
    const ownedCount = await tx.document.count({
      where: { id: { in: data.documentIds }, userId },
    })
    if (ownedCount !== data.documentIds.length) {
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
      data: data.documentIds.map((documentId) => ({
        interviewSessionId: session.id,
        documentId,
      })),
    })

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
  const result = await prisma.interviewSession.updateMany({
    where: { id, userId },
    data: { status: "COMPLETED" },
  })

  if (result.count === 0) {
    const exists = await prisma.interviewSession.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new InterviewNotFoundError()
    throw new InterviewForbiddenError()
  }

  return prisma.interviewSession.findUniqueOrThrow({
    where: { id },
    select: { id: true, status: true, updatedAt: true },
  })
}

// 면접 세션 삭제 (cascade)
export async function deleteInterview(id: string, userId: string) {
  const result = await prisma.interviewSession.deleteMany({
    where: { id, userId },
  })

  if (result.count === 0) {
    const exists = await prisma.interviewSession.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new InterviewNotFoundError()
    throw new InterviewForbiddenError()
  }
}

// 대화 메시지 조회 (소유권 검증 포함)
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
