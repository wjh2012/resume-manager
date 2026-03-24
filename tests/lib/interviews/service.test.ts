import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    interviewDocument: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    interviewExternalDoc: {
      createMany: vi.fn(),
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
    externalDocument: {
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
  InterviewNotFoundError,
  InterviewForbiddenError,
  InterviewAlreadyCompletedError,
} from "@/lib/interviews/service"

const mockPrisma = vi.mocked(prisma)

const USER_ID = "a0000000-0000-4000-8000-000000000001"
const SESSION_ID = "b0000000-0000-4000-8000-000000000001"
const DOC_ID = "c0000000-0000-4000-8000-000000000001"
const EXT_DOC_ID = "d0000000-0000-4000-8000-000000000001"

// ─────────────────────────────────────────────────────────────────────────────
describe("createInterview()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        document: { count: vi.fn().mockResolvedValue(1) },
        externalDocument: { count: vi.fn().mockResolvedValue(0) },
        interviewSession: {
          create: vi.fn().mockResolvedValue({ id: SESSION_ID }),
        },
        interviewDocument: { createMany: vi.fn().mockResolvedValue({}) },
        interviewExternalDoc: { createMany: vi.fn().mockResolvedValue({}) },
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
        externalDocument: { count: vi.fn().mockResolvedValue(0) },
        interviewSession: { create: vi.fn() },
        interviewDocument: { createMany: vi.fn() },
        interviewExternalDoc: { createMany: vi.fn() },
        conversation: { create: vi.fn() },
      }
      return fn(tx)
    })

    await expect(
      createInterview(USER_ID, { title: "테스트", documentIds: [DOC_ID] }),
    ).rejects.toThrow(InterviewForbiddenError)
  })

  it("중복된 documentIds가 전달되면 중복 제거 후 소유권을 검증해야 한다", async () => {
    const countFn = vi.fn().mockResolvedValue(1)
    const createManyFn = vi.fn().mockResolvedValue({})
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        document: { count: countFn },
        externalDocument: { count: vi.fn().mockResolvedValue(0) },
        interviewSession: { create: vi.fn().mockResolvedValue({ id: SESSION_ID }) },
        interviewDocument: { createMany: createManyFn },
        interviewExternalDoc: { createMany: vi.fn().mockResolvedValue({}) },
        conversation: { create: vi.fn().mockResolvedValue({}) },
      }
      return fn(tx)
    })

    const result = await createInterview(USER_ID, {
      title: "중복 테스트",
      documentIds: [DOC_ID, DOC_ID],
    })

    // 중복 제거 후 count는 1개 기준으로 호출
    expect(countFn).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [DOC_ID] }, userId: USER_ID } }),
    )
    // createMany도 중복 제거된 1개만 전달
    expect(createManyFn).toHaveBeenCalledWith(
      expect.objectContaining({ data: [{ interviewSessionId: SESSION_ID, documentId: DOC_ID }] }),
    )
    expect(result).toEqual({ id: SESSION_ID })
  })

  it("selectedExternalDocumentIds가 있으면 interviewExternalDoc.createMany를 호출해야 한다", async () => {
    const extCountFn = vi.fn().mockResolvedValue(1)
    const extCreateManyFn = vi.fn().mockResolvedValue({})
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        document: { count: vi.fn().mockResolvedValue(1) },
        externalDocument: { count: extCountFn },
        interviewSession: { create: vi.fn().mockResolvedValue({ id: SESSION_ID }) },
        interviewDocument: { createMany: vi.fn().mockResolvedValue({}) },
        interviewExternalDoc: { createMany: extCreateManyFn },
        conversation: { create: vi.fn().mockResolvedValue({}) },
      }
      return fn(tx)
    })

    const result = await createInterview(USER_ID, {
      title: "카카오 면접",
      documentIds: [DOC_ID],
      selectedExternalDocumentIds: [EXT_DOC_ID],
    })

    expect(extCountFn).toHaveBeenCalledWith({
      where: { id: { in: [EXT_DOC_ID] }, userId: USER_ID },
    })
    expect(extCreateManyFn).toHaveBeenCalledWith({
      data: [{ interviewSessionId: SESSION_ID, externalDocumentId: EXT_DOC_ID }],
    })
    expect(result).toEqual({ id: SESSION_ID })
  })

  it("소유하지 않은 외부 문서가 포함되면 InterviewForbiddenError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        document: { count: vi.fn().mockResolvedValue(1) },
        externalDocument: { count: vi.fn().mockResolvedValue(0) },
        interviewSession: { create: vi.fn().mockResolvedValue({ id: SESSION_ID }) },
        interviewDocument: { createMany: vi.fn().mockResolvedValue({}) },
        interviewExternalDoc: { createMany: vi.fn() },
        conversation: { create: vi.fn() },
      }
      return fn(tx)
    })

    await expect(
      createInterview(USER_ID, {
        title: "테스트",
        documentIds: [DOC_ID],
        selectedExternalDocumentIds: [EXT_DOC_ID],
      }),
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
    const mockSession = { id: SESSION_ID, userId: USER_ID, conversations: [], interviewDocuments: [], interviewExternalDocs: [] }
    mockPrisma.interviewSession.findUnique.mockResolvedValue(mockSession as never)
    const result = await getInterview(SESSION_ID, USER_ID)
    expect(result).toEqual(mockSession)
  })

  it("interviewExternalDocs를 포함하여 반환해야 한다", async () => {
    const mockSession = {
      id: SESSION_ID,
      userId: USER_ID,
      conversations: [],
      interviewDocuments: [],
      interviewExternalDocs: [
        {
          externalDocument: {
            id: EXT_DOC_ID,
            title: "직무기술서",
            category: "JOB_DESCRIPTION",
            sourceType: "TEXT",
          },
        },
      ],
    }
    mockPrisma.interviewSession.findUnique.mockResolvedValue(mockSession as never)
    const result = await getInterview(SESSION_ID, USER_ID)
    expect(result).toEqual(mockSession)
    expect(result?.interviewExternalDocs).toHaveLength(1)
    expect(result?.interviewExternalDocs[0].externalDocument.id).toBe(EXT_DOC_ID)
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
  let mockTx: {
    interviewSession: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  }

  beforeEach(() => {
    mockTx = {
      interviewSession: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    }
    mockPrisma.$transaction.mockImplementation(async (fn) => fn(mockTx))
  })

  it("status를 COMPLETED로 변경해야 한다", async () => {
    mockTx.interviewSession.findUnique.mockResolvedValue({
      id: SESSION_ID,
      userId: USER_ID,
      status: "IN_PROGRESS",
    })
    mockTx.interviewSession.update.mockResolvedValue({
      id: SESSION_ID,
      status: "COMPLETED",
      updatedAt: new Date(),
    })

    const result = await completeInterview(SESSION_ID, USER_ID)
    expect(mockTx.interviewSession.update).toHaveBeenCalledWith({
      where: { id: SESSION_ID },
      data: { status: "COMPLETED" },
      select: { id: true, status: true, updatedAt: true },
    })
    expect(result).toMatchObject({ id: SESSION_ID, status: "COMPLETED" })
  })

  it("세션이 없으면 InterviewNotFoundError를 던져야 한다", async () => {
    mockTx.interviewSession.findUnique.mockResolvedValue(null)

    await expect(completeInterview(SESSION_ID, USER_ID)).rejects.toThrow(
      InterviewNotFoundError,
    )
  })

  it("소유권이 없으면 InterviewForbiddenError를 던져야 한다", async () => {
    mockTx.interviewSession.findUnique.mockResolvedValue({
      id: SESSION_ID,
      userId: "other-user",
      status: "IN_PROGRESS",
    })

    await expect(completeInterview(SESSION_ID, USER_ID)).rejects.toThrow(
      InterviewForbiddenError,
    )
  })

  it("이미 완료된 세션이면 InterviewAlreadyCompletedError를 던져야 한다", async () => {
    mockTx.interviewSession.findUnique.mockResolvedValue({
      id: SESSION_ID,
      userId: USER_ID,
      status: "COMPLETED",
    })

    await expect(completeInterview(SESSION_ID, USER_ID)).rejects.toThrow(
      InterviewAlreadyCompletedError,
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("deleteInterview()", () => {
  it("세션을 삭제해야 한다", async () => {
    let capturedTx: { interviewSession: { findUnique: ReturnType<typeof vi.fn>; delete: ReturnType<typeof vi.fn> } } | null = null
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        interviewSession: {
          findUnique: vi.fn().mockResolvedValue({ id: SESSION_ID, userId: USER_ID }),
          delete: vi.fn().mockResolvedValue(undefined),
        },
      }
      capturedTx = tx
      return fn(tx)
    })

    await expect(deleteInterview(SESSION_ID, USER_ID)).resolves.toBeUndefined()
    expect(capturedTx!.interviewSession.delete).toHaveBeenCalledWith({ where: { id: SESSION_ID } })
  })

  it("세션이 없으면 InterviewNotFoundError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        interviewSession: {
          findUnique: vi.fn().mockResolvedValue(null),
          delete: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(deleteInterview(SESSION_ID, USER_ID)).rejects.toThrow(
      InterviewNotFoundError,
    )
  })

  it("소유권이 없으면 InterviewForbiddenError를 던져야 한다", async () => {
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        interviewSession: {
          findUnique: vi.fn().mockResolvedValue({ id: SESSION_ID, userId: "other-user" }),
          delete: vi.fn(),
        },
      }
      return fn(tx)
    })

    await expect(deleteInterview(SESSION_ID, USER_ID)).rejects.toThrow(
      InterviewForbiddenError,
    )
  })
})

