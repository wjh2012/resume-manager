import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/prisma", () => ({
  prisma: {
    coverLetter: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    conversation: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    coverLetterDocument: {
      createMany: vi.fn(),
      deleteMany: vi.fn(),
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
  createCoverLetter,
  getCoverLetter,
  listCoverLetters,
  updateCoverLetter,
  deleteCoverLetter,
  updateSelectedDocuments,
  getConversationMessages,
  CoverLetterNotFoundError,
  CoverLetterForbiddenError,
} from "@/lib/cover-letters/service"

const mockPrisma = vi.mocked(prisma)

// ─────────────────────────────────────────────────────────────────────────────
describe("createCoverLetter()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        coverLetter: {
          create: vi.fn().mockResolvedValue({ id: "cl-1" }),
        },
        conversation: {
          create: vi.fn().mockResolvedValue({}),
        },
        coverLetterDocument: {
          createMany: vi.fn().mockResolvedValue({}),
        },
      }
      return fn(tx)
    })
  })

  it("CoverLetter, Conversation을 트랜잭션 내에서 생성해야 한다", async () => {
    // Arrange
    const userId = "user-1"
    const data = { title: "카카오 자소서", companyName: "카카오", position: "백엔드 개발자" }

    // Act
    const result = await createCoverLetter(userId, data)

    // Assert
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
    expect(result).toEqual({ id: "cl-1" })
  })

  it("selectedDocumentIds가 있으면 coverLetterDocument.createMany를 호출해야 한다", async () => {
    // Arrange
    let capturedTx: Record<string, unknown> | null = null
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        coverLetter: { create: vi.fn().mockResolvedValue({ id: "cl-1" }) },
        conversation: { create: vi.fn().mockResolvedValue({}) },
        coverLetterDocument: { createMany: vi.fn().mockResolvedValue({}) },
        document: { count: vi.fn().mockResolvedValue(2) },
      }
      capturedTx = tx as unknown as Record<string, unknown>
      return fn(tx)
    })
    const data = {
      title: "카카오 자소서",
      companyName: "카카오",
      position: "백엔드 개발자",
      selectedDocumentIds: ["doc-1", "doc-2"],
    }

    // Act
    await createCoverLetter("user-1", data)

    // Assert
    const txCoverLetterDocument = (capturedTx as { coverLetterDocument: { createMany: ReturnType<typeof vi.fn> } }).coverLetterDocument
    expect(txCoverLetterDocument.createMany).toHaveBeenCalledWith({
      data: [
        { coverLetterId: "cl-1", documentId: "doc-1" },
        { coverLetterId: "cl-1", documentId: "doc-2" },
      ],
    })
  })

  it("selectedDocumentIds 중 소유하지 않은 문서가 있으면 CoverLetterForbiddenError를 던져야 한다", async () => {
    // Arrange
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        coverLetter: { create: vi.fn().mockResolvedValue({ id: "cl-1" }) },
        conversation: { create: vi.fn().mockResolvedValue({}) },
        coverLetterDocument: { createMany: vi.fn().mockResolvedValue({}) },
        document: { count: vi.fn().mockResolvedValue(1) }, // 2개 요청했는데 1개만 소유
      }
      return fn(tx)
    })
    const data = {
      title: "카카오 자소서",
      companyName: "카카오",
      position: "백엔드 개발자",
      selectedDocumentIds: ["doc-1", "doc-other"],
    }

    // Act & Assert
    await expect(createCoverLetter("user-1", data)).rejects.toThrow(CoverLetterForbiddenError)
  })

  it("selectedDocumentIds가 빈 배열이면 coverLetterDocument.createMany를 호출하지 않아야 한다", async () => {
    // Arrange
    let capturedTx: Record<string, unknown> | null = null
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        coverLetter: { create: vi.fn().mockResolvedValue({ id: "cl-1" }) },
        conversation: { create: vi.fn().mockResolvedValue({}) },
        coverLetterDocument: { createMany: vi.fn().mockResolvedValue({}) },
      }
      capturedTx = tx as unknown as Record<string, unknown>
      return fn(tx)
    })
    const data = {
      title: "카카오 자소서",
      companyName: "카카오",
      position: "백엔드 개발자",
      selectedDocumentIds: [],
    }

    // Act
    await createCoverLetter("user-1", data)

    // Assert
    const txCoverLetterDocument = (capturedTx as { coverLetterDocument: { createMany: ReturnType<typeof vi.fn> } }).coverLetterDocument
    expect(txCoverLetterDocument.createMany).not.toHaveBeenCalled()
  })

  it("selectedDocumentIds가 없어도 트랜잭션이 정상 완료되어야 한다", async () => {
    // Arrange
    const data = { title: "자소서", companyName: "네이버", position: "프론트엔드" }

    // Act & Assert
    await expect(createCoverLetter("user-1", data)).resolves.toEqual({ id: "cl-1" })
  })

  it("Conversation에 올바른 userId, type, coverLetterId를 전달해야 한다", async () => {
    // Arrange
    let capturedTx: Record<string, unknown> | null = null
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        coverLetter: { create: vi.fn().mockResolvedValue({ id: "cl-99" }) },
        conversation: { create: vi.fn().mockResolvedValue({}) },
        coverLetterDocument: { createMany: vi.fn().mockResolvedValue({}) },
      }
      capturedTx = tx as unknown as Record<string, unknown>
      return fn(tx)
    })
    const data = { title: "자소서", companyName: "라인", position: "SRE" }

    // Act
    await createCoverLetter("user-42", data)

    // Assert
    const txConversation = (capturedTx as { conversation: { create: ReturnType<typeof vi.fn> } }).conversation
    expect(txConversation.create).toHaveBeenCalledWith({
      data: { userId: "user-42", type: "COVER_LETTER", coverLetterId: "cl-99" },
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("getCoverLetter()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("자기소개서가 없으면 null을 반환해야 한다", async () => {
    // Arrange
    mockPrisma.coverLetter.findUnique.mockResolvedValue(null)

    // Act
    const result = await getCoverLetter("cl-999", "user-1")

    // Assert
    expect(result).toBeNull()
  })

  it("userId가 소유자와 다르면 null을 반환해야 한다 (소유권 검증)", async () => {
    // Arrange
    mockPrisma.coverLetter.findUnique.mockResolvedValue({
      id: "cl-1",
      userId: "owner-user",
      conversations: [],
      coverLetterDocuments: [],
    } as never)

    // Act
    const result = await getCoverLetter("cl-1", "attacker-user")

    // Assert
    expect(result).toBeNull()
  })

  it("userId가 일치하면 자기소개서를 반환해야 한다", async () => {
    // Arrange
    const mockData = {
      id: "cl-1",
      userId: "user-1",
      title: "카카오 자소서",
      conversations: [{ id: "conv-1", messages: [] }],
      coverLetterDocuments: [{ document: { id: "doc-1", title: "이력서", type: "pdf" } }],
    }
    mockPrisma.coverLetter.findUnique.mockResolvedValue(mockData as never)

    // Act
    const result = await getCoverLetter("cl-1", "user-1")

    // Assert
    expect(result).toEqual(mockData)
  })

  it("올바른 include 옵션으로 prisma를 호출해야 한다", async () => {
    // Arrange
    mockPrisma.coverLetter.findUnique.mockResolvedValue({
      id: "cl-1",
      userId: "user-1",
      conversations: [],
      coverLetterDocuments: [],
    } as never)

    // Act
    await getCoverLetter("cl-1", "user-1")

    // Assert
    expect(mockPrisma.coverLetter.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "cl-1" },
        include: expect.objectContaining({
          conversations: expect.any(Object),
          coverLetterDocuments: expect.any(Object),
        }),
      }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("listCoverLetters()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("올바른 userId로 findMany를 호출해야 한다", async () => {
    // Arrange
    mockPrisma.coverLetter.findMany.mockResolvedValue([] as never)

    // Act
    await listCoverLetters("user-1")

    // Assert
    expect(mockPrisma.coverLetter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-1" } }),
    )
  })

  it("updatedAt 내림차순으로 정렬 옵션이 전달되어야 한다", async () => {
    // Arrange
    mockPrisma.coverLetter.findMany.mockResolvedValue([] as never)

    // Act
    await listCoverLetters("user-1")

    // Assert
    expect(mockPrisma.coverLetter.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { updatedAt: "desc" } }),
    )
  })

  it("자기소개서 목록을 반환해야 한다", async () => {
    // Arrange
    const mockList = [
      { id: "cl-1", title: "카카오 자소서", companyName: "카카오", position: "백엔드", status: "DRAFT", createdAt: new Date(), updatedAt: new Date() },
      { id: "cl-2", title: "네이버 자소서", companyName: "네이버", position: "프론트", status: "COMPLETED", createdAt: new Date(), updatedAt: new Date() },
    ]
    mockPrisma.coverLetter.findMany.mockResolvedValue(mockList as never)

    // Act
    const result = await listCoverLetters("user-1")

    // Assert
    expect(result).toEqual(mockList)
  })

  it("자기소개서가 없으면 빈 배열을 반환해야 한다", async () => {
    // Arrange
    mockPrisma.coverLetter.findMany.mockResolvedValue([] as never)

    // Act
    const result = await listCoverLetters("user-no-data")

    // Assert
    expect(result).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("updateCoverLetter()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("소유권 검증", () => {
    it("자기소개서가 존재하지 않으면 CoverLetterNotFoundError를 던져야 한다", async () => {
      // Arrange: tx.coverLetter.findUnique가 null 반환 (존재하지 않음)
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coverLetter: {
            findUnique: vi.fn().mockResolvedValue(null),
            update: vi.fn(),
          },
        }
        return fn(tx)
      })

      // Act & Assert
      await expect(updateCoverLetter("cl-999", "user-1", { title: "새 제목" })).rejects.toThrow(
        CoverLetterNotFoundError,
      )
      await expect(updateCoverLetter("cl-999", "user-1", { title: "새 제목" })).rejects.toThrow(
        "자기소개서를 찾을 수 없습니다.",
      )
    })

    it("userId가 소유자와 다르면 CoverLetterForbiddenError를 던져야 한다", async () => {
      // Arrange: tx.coverLetter.findUnique는 존재하지만 다른 소유자
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coverLetter: {
            findUnique: vi.fn().mockResolvedValue({ id: "cl-1", userId: "owner-user" }),
            update: vi.fn(),
          },
        }
        return fn(tx)
      })

      // Act & Assert
      await expect(updateCoverLetter("cl-1", "other-user", { title: "새 제목" })).rejects.toThrow(
        CoverLetterForbiddenError,
      )
      await expect(updateCoverLetter("cl-1", "other-user", { title: "새 제목" })).rejects.toThrow(
        "이 자기소개서에 대한 권한이 없습니다.",
      )
    })
  })

  describe("성공 경로", () => {
    it("자기소개서를 업데이트하고 결과를 반환해야 한다", async () => {
      // Arrange
      const updatedData = { id: "cl-1", title: "수정된 제목", content: "수정된 내용", status: "COMPLETED", updatedAt: new Date() }
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coverLetter: {
            findUnique: vi.fn().mockResolvedValue({ id: "cl-1", userId: "user-1" }),
            update: vi.fn().mockResolvedValue(updatedData),
          },
        }
        return fn(tx)
      })

      // Act
      const result = await updateCoverLetter("cl-1", "user-1", { title: "수정된 제목", status: "COMPLETED" })

      // Assert
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
      expect(result).toEqual(updatedData)
    })

    it("부분 업데이트 데이터도 그대로 tx.coverLetter.update에 전달해야 한다", async () => {
      // Arrange
      let capturedTx: Record<string, unknown> | null = null
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coverLetter: {
            findUnique: vi.fn().mockResolvedValue({ id: "cl-1", userId: "user-1" }),
            update: vi.fn().mockResolvedValue({ id: "cl-1" }),
          },
        }
        capturedTx = tx as unknown as Record<string, unknown>
        return fn(tx)
      })

      // Act
      await updateCoverLetter("cl-1", "user-1", { content: "본문만 수정" })

      // Assert
      const txCoverLetter = (capturedTx as { coverLetter: { update: ReturnType<typeof vi.fn> } }).coverLetter
      expect(txCoverLetter.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { content: "본문만 수정" } }),
      )
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("deleteCoverLetter()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("소유권 검증", () => {
    it("자기소개서가 존재하지 않으면 CoverLetterNotFoundError를 던져야 한다", async () => {
      // Arrange: tx.coverLetter.findUnique가 null 반환 (존재하지 않음)
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coverLetter: {
            findUnique: vi.fn().mockResolvedValue(null),
            delete: vi.fn(),
          },
        }
        return fn(tx)
      })

      // Act & Assert
      await expect(deleteCoverLetter("cl-999", "user-1")).rejects.toThrow(CoverLetterNotFoundError)
      await expect(deleteCoverLetter("cl-999", "user-1")).rejects.toThrow(
        "자기소개서를 찾을 수 없습니다.",
      )
    })

    it("userId가 소유자와 다르면 CoverLetterForbiddenError를 던져야 한다", async () => {
      // Arrange: tx.coverLetter.findUnique는 존재하지만 다른 소유자
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coverLetter: {
            findUnique: vi.fn().mockResolvedValue({ id: "cl-1", userId: "owner-user" }),
            delete: vi.fn(),
          },
        }
        return fn(tx)
      })

      // Act & Assert
      await expect(deleteCoverLetter("cl-1", "other-user")).rejects.toThrow(
        CoverLetterForbiddenError,
      )
      await expect(deleteCoverLetter("cl-1", "other-user")).rejects.toThrow(
        "이 자기소개서에 대한 권한이 없습니다.",
      )
    })
  })

  describe("성공 경로", () => {
    it("소유자이면 자기소개서를 tx.coverLetter.delete로 삭제해야 한다", async () => {
      // Arrange
      let capturedTx: Record<string, unknown> | null = null
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coverLetter: {
            findUnique: vi.fn().mockResolvedValue({ id: "cl-1", userId: "user-1" }),
            delete: vi.fn().mockResolvedValue({}),
          },
        }
        capturedTx = tx as unknown as Record<string, unknown>
        return fn(tx)
      })

      // Act
      await deleteCoverLetter("cl-1", "user-1")

      // Assert
      const txCoverLetter = (capturedTx as { coverLetter: { delete: ReturnType<typeof vi.fn> } }).coverLetter
      expect(txCoverLetter.delete).toHaveBeenCalledWith({ where: { id: "cl-1" } })
    })

    it("반환값은 undefined여야 한다", async () => {
      // Arrange
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coverLetter: {
            findUnique: vi.fn().mockResolvedValue({ id: "cl-1", userId: "user-1" }),
            delete: vi.fn().mockResolvedValue({}),
          },
        }
        return fn(tx)
      })

      // Act
      const result = await deleteCoverLetter("cl-1", "user-1")

      // Assert
      expect(result).toBeUndefined()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("updateSelectedDocuments()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      const tx = {
        coverLetter: { findUnique: vi.fn().mockResolvedValue({ userId: "user-1" }) },
        document: { count: vi.fn().mockResolvedValue(0) },
        coverLetterDocument: {
          deleteMany: vi.fn().mockResolvedValue({}),
          createMany: vi.fn().mockResolvedValue({}),
        },
      }
      return fn(tx)
    })
  })

  describe("소유권 검증", () => {
    it("자기소개서가 없으면 CoverLetterNotFoundError를 던져야 한다", async () => {
      // Arrange
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coverLetter: { findUnique: vi.fn().mockResolvedValue(null) },
          document: { count: vi.fn() },
          coverLetterDocument: { deleteMany: vi.fn(), createMany: vi.fn() },
        }
        return fn(tx)
      })

      // Act & Assert
      await expect(updateSelectedDocuments("cl-999", "user-1", ["doc-1"])).rejects.toThrow(
        CoverLetterNotFoundError,
      )
    })

    it("userId가 소유자와 다르면 CoverLetterForbiddenError를 던져야 한다", async () => {
      // Arrange
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coverLetter: { findUnique: vi.fn().mockResolvedValue({ userId: "owner-user" }) },
          document: { count: vi.fn() },
          coverLetterDocument: { deleteMany: vi.fn(), createMany: vi.fn() },
        }
        return fn(tx)
      })

      // Act & Assert
      await expect(updateSelectedDocuments("cl-1", "other-user", ["doc-1"])).rejects.toThrow(
        CoverLetterForbiddenError,
      )
    })

    it("documentIds 중 소유하지 않은 문서가 있으면 CoverLetterForbiddenError를 던져야 한다", async () => {
      // Arrange
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coverLetter: { findUnique: vi.fn().mockResolvedValue({ userId: "user-1" }) },
          document: { count: vi.fn().mockResolvedValue(1) }, // 2개 요청했는데 1개만 소유
          coverLetterDocument: { deleteMany: vi.fn(), createMany: vi.fn() },
        }
        return fn(tx)
      })

      // Act & Assert
      await expect(updateSelectedDocuments("cl-1", "user-1", ["doc-1", "doc-other"])).rejects.toThrow(
        CoverLetterForbiddenError,
      )
    })
  })

  describe("성공 경로", () => {
    it("기존 문서를 삭제하고 새 문서를 createMany로 생성해야 한다", async () => {
      // Arrange
      let capturedTx: Record<string, unknown> | null = null
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coverLetter: { findUnique: vi.fn().mockResolvedValue({ userId: "user-1" }) },
          document: { count: vi.fn().mockResolvedValue(2) },
          coverLetterDocument: {
            deleteMany: vi.fn().mockResolvedValue({}),
            createMany: vi.fn().mockResolvedValue({}),
          },
        }
        capturedTx = tx as unknown as Record<string, unknown>
        return fn(tx)
      })

      // Act
      await updateSelectedDocuments("cl-1", "user-1", ["doc-1", "doc-2"])

      // Assert
      const txDoc = (capturedTx as { coverLetterDocument: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> } }).coverLetterDocument
      expect(txDoc.deleteMany).toHaveBeenCalledWith({ where: { coverLetterId: "cl-1" } })
      expect(txDoc.createMany).toHaveBeenCalledWith({
        data: [
          { coverLetterId: "cl-1", documentId: "doc-1" },
          { coverLetterId: "cl-1", documentId: "doc-2" },
        ],
      })
    })

    it("documentIds가 빈 배열이면 deleteMany만 호출하고 createMany는 호출하지 않아야 한다", async () => {
      // Arrange: documentIds가 빈 배열이면 document.count는 호출되지 않음
      let capturedTx: Record<string, unknown> | null = null
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          coverLetter: { findUnique: vi.fn().mockResolvedValue({ userId: "user-1" }) },
          document: { count: vi.fn() },
          coverLetterDocument: {
            deleteMany: vi.fn().mockResolvedValue({}),
            createMany: vi.fn().mockResolvedValue({}),
          },
        }
        capturedTx = tx as unknown as Record<string, unknown>
        return fn(tx)
      })

      // Act
      await updateSelectedDocuments("cl-1", "user-1", [])

      // Assert
      const txDoc = (capturedTx as { coverLetterDocument: { deleteMany: ReturnType<typeof vi.fn>; createMany: ReturnType<typeof vi.fn> } }).coverLetterDocument
      expect(txDoc.deleteMany).toHaveBeenCalledOnce()
      expect(txDoc.createMany).not.toHaveBeenCalled()
    })

    it("반환값은 undefined여야 한다", async () => {
      // Act
      const result = await updateSelectedDocuments("cl-1", "user-1", [])

      // Assert
      expect(result).toBeUndefined()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("getConversationMessages()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("대화가 존재하지 않으면 null을 반환해야 한다", async () => {
    // Arrange
    mockPrisma.conversation.findUnique.mockResolvedValue(null)

    // Act
    const result = await getConversationMessages("conv-999", "user-1")

    // Assert
    expect(result).toBeNull()
  })

  it("userId가 대화 소유자와 다르면 null을 반환해야 한다 (소유권 검증)", async () => {
    // Arrange
    mockPrisma.conversation.findUnique.mockResolvedValue({ userId: "owner-user" } as never)

    // Act
    const result = await getConversationMessages("conv-1", "attacker-user")

    // Assert
    expect(result).toBeNull()
  })

  it("userId가 일치하면 메시지 목록을 반환해야 한다", async () => {
    // Arrange
    mockPrisma.conversation.findUnique.mockResolvedValue({ userId: "user-1" } as never)
    const mockMessages = [
      { id: "msg-1", role: "user", content: "안녕하세요", createdAt: new Date("2026-01-01T00:00:00Z") },
      { id: "msg-2", role: "assistant", content: "안녕하세요!", createdAt: new Date("2026-01-01T00:00:01Z") },
    ]
    mockPrisma.message.findMany.mockResolvedValue(mockMessages as never)

    // Act
    const result = await getConversationMessages("conv-1", "user-1")

    // Assert
    expect(result).toEqual(mockMessages)
  })

  it("createdAt 오름차순으로 message.findMany를 호출해야 한다", async () => {
    // Arrange
    mockPrisma.conversation.findUnique.mockResolvedValue({ userId: "user-1" } as never)
    mockPrisma.message.findMany.mockResolvedValue([] as never)

    // Act
    await getConversationMessages("conv-1", "user-1")

    // Assert
    expect(mockPrisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { conversationId: "conv-1" },
        orderBy: { createdAt: "asc" },
      }),
    )
  })

  it("대화가 없으면 message.findMany를 호출하지 않아야 한다", async () => {
    // Arrange
    mockPrisma.conversation.findUnique.mockResolvedValue(null)

    // Act
    await getConversationMessages("conv-999", "user-1")

    // Assert
    expect(mockPrisma.message.findMany).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("CoverLetterNotFoundError / CoverLetterForbiddenError", () => {
  it("CoverLetterNotFoundError는 올바른 메시지를 가져야 한다", () => {
    const err = new CoverLetterNotFoundError()
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe("자기소개서를 찾을 수 없습니다.")
  })

  it("CoverLetterForbiddenError는 올바른 메시지를 가져야 한다", () => {
    const err = new CoverLetterForbiddenError()
    expect(err).toBeInstanceOf(Error)
    expect(err.message).toBe("이 자기소개서에 대한 권한이 없습니다.")
  })
})
