import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    interviewDocument: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    conversation: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    message: {
      findMany: vi.fn(),
    },
    document: {
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

import { prisma } from "@/lib/prisma"
import {
  createInterview,
  getInterview,
  listInterviews,
  completeInterview,
  deleteInterview,
  getConversationMessages,
  InterviewNotFoundError,
  InterviewForbiddenError,
} from "@/lib/interviews/service"

const mockPrisma = vi.mocked(prisma)

const USER_ID = "a0000000-0000-4000-8000-000000000001"
const SESSION_ID = "b0000000-0000-4000-8000-000000000001"
const DOC_ID = "c0000000-0000-4000-8000-000000000001"
const CONV_ID = "d0000000-0000-4000-8000-000000000001"

// ─────────────────────────────────────────────────────────────────────────────
describe("createInterview()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        document: { count: vi.fn().mockResolvedValue(1) },
        interviewSession: {
          create: vi.fn().mockResolvedValue({ id: SESSION_ID }),
        },
        interviewDocument: { createMany: vi.fn().mockResolvedValue({}) },
        conversation: { create: vi.fn().mockResolvedValue({}) },
      }
      return fn(tx)
    })
  })

  it("InterviewSession, InterviewDocument, Conversation을 트랜잭션으로 생성해야 한다", async () => {
    const result = await createInterview(USER_ID, {
      title: "카카오 면접",
      documentIds: [DOC_ID],
    })
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
    expect(result).toEqual({ id: SESSION_ID })
  })

  it("소유하지 않은 문서가 포함되면 InterviewForbiddenError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        document: { count: vi.fn().mockResolvedValue(0) },
        interviewSession: { create: vi.fn() },
        interviewDocument: { createMany: vi.fn() },
        conversation: { create: vi.fn() },
      }
      return fn(tx)
    })

    await expect(
      createInterview(USER_ID, { title: "테스트", documentIds: [DOC_ID] }),
    ).rejects.toThrow(InterviewForbiddenError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("getInterview()", () => {
  it("세션이 없으면 null을 반환해야 한다", async () => {
    mockPrisma.interviewSession.findUnique.mockResolvedValue(null)
    const result = await getInterview(SESSION_ID, USER_ID)
    expect(result).toBeNull()
  })

  it("다른 사용자의 세션이면 null을 반환해야 한다", async () => {
    mockPrisma.interviewSession.findUnique.mockResolvedValue({
      id: SESSION_ID,
      userId: "other-user",
    } as never)
    const result = await getInterview(SESSION_ID, USER_ID)
    expect(result).toBeNull()
  })

  it("소유자라면 세션을 반환해야 한다", async () => {
    const mockSession = { id: SESSION_ID, userId: USER_ID, conversations: [], interviewDocuments: [] }
    mockPrisma.interviewSession.findUnique.mockResolvedValue(mockSession as never)
    const result = await getInterview(SESSION_ID, USER_ID)
    expect(result).toEqual(mockSession)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("listInterviews()", () => {
  it("사용자의 세션 목록을 반환해야 한다", async () => {
    const mockList = [{ id: SESSION_ID, title: "면접1", _count: { interviewDocuments: 2 } }]
    mockPrisma.interviewSession.findMany.mockResolvedValue(mockList as never)
    const result = await listInterviews(USER_ID)
    expect(result).toEqual(mockList)
    expect(mockPrisma.interviewSession.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("completeInterview()", () => {
  it("status를 COMPLETED로 변경해야 한다", async () => {
    mockPrisma.interviewSession.updateMany.mockResolvedValue({ count: 1 })
    mockPrisma.interviewSession.findUniqueOrThrow.mockResolvedValue({
      id: SESSION_ID,
      status: "COMPLETED",
    } as never)

    const result = await completeInterview(SESSION_ID, USER_ID)
    expect(mockPrisma.interviewSession.updateMany).toHaveBeenCalledWith({
      where: { id: SESSION_ID, userId: USER_ID },
      data: { status: "COMPLETED" },
    })
    expect(result).toMatchObject({ id: SESSION_ID, status: "COMPLETED" })
  })

  it("세션이 없으면 InterviewNotFoundError를 던져야 한다", async () => {
    mockPrisma.interviewSession.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.interviewSession.findUnique.mockResolvedValue(null)

    await expect(completeInterview(SESSION_ID, USER_ID)).rejects.toThrow(
      InterviewNotFoundError,
    )
  })

  it("소유권이 없으면 InterviewForbiddenError를 던져야 한다", async () => {
    mockPrisma.interviewSession.updateMany.mockResolvedValue({ count: 0 })
    mockPrisma.interviewSession.findUnique.mockResolvedValue({ id: SESSION_ID } as never)

    await expect(completeInterview(SESSION_ID, USER_ID)).rejects.toThrow(
      InterviewForbiddenError,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("deleteInterview()", () => {
  it("세션을 삭제해야 한다", async () => {
    mockPrisma.interviewSession.deleteMany.mockResolvedValue({ count: 1 })
    await expect(deleteInterview(SESSION_ID, USER_ID)).resolves.toBeUndefined()
  })

  it("세션이 없으면 InterviewNotFoundError를 던져야 한다", async () => {
    mockPrisma.interviewSession.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.interviewSession.findUnique.mockResolvedValue(null)

    await expect(deleteInterview(SESSION_ID, USER_ID)).rejects.toThrow(
      InterviewNotFoundError,
    )
  })

  it("소유권이 없으면 InterviewForbiddenError를 던져야 한다", async () => {
    mockPrisma.interviewSession.deleteMany.mockResolvedValue({ count: 0 })
    mockPrisma.interviewSession.findUnique.mockResolvedValue({ id: SESSION_ID } as never)

    await expect(deleteInterview(SESSION_ID, USER_ID)).rejects.toThrow(
      InterviewForbiddenError,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("getConversationMessages()", () => {
  it("다른 사용자의 대화면 null을 반환해야 한다", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      userId: "other-user",
    } as never)
    const result = await getConversationMessages(CONV_ID, USER_ID)
    expect(result).toBeNull()
  })

  it("소유자라면 메시지 목록을 반환해야 한다", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({ userId: USER_ID } as never)
    mockPrisma.message.findMany.mockResolvedValue([
      { id: "m1", role: "USER", content: "안녕", createdAt: new Date() },
    ] as never)
    const result = await getConversationMessages(CONV_ID, USER_ID)
    expect(result).toHaveLength(1)
  })
})
