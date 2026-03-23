import { describe, it, expect, vi, beforeEach } from "vitest"

// 외부 의존성 전체 mock — import 전에 선언 (vi.mock은 정적으로 호이스팅됨)
vi.mock("@/lib/prisma", () => ({
  prisma: {
    careerNote: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn(),
      deleteMany: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
    careerNoteMergeProposal: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      deleteMany: vi.fn(),
    },
    careerNoteSource: {
      create: vi.fn(),
      upsert: vi.fn(),
    },
    conversation: { findFirst: vi.fn() },
    message: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/ai/provider", () => ({
  getLanguageModel: vi.fn(),
  AiSettingsNotFoundError: class extends Error {
    constructor() {
      super("AI 설정이 완료되지 않았습니다.")
    }
  },
}))

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((opts: unknown) => opts) },
}))

vi.mock("@/lib/ai/prompts/career-note-extraction", () => ({
  careerNoteExtractionSchema: {},
  buildCareerNoteExtractionPrompt: vi.fn().mockReturnValue("system-prompt"),
}))

vi.mock("@/lib/token-usage/service", () => ({
  recordUsage: vi.fn().mockResolvedValue(undefined),
}))

vi.mock("@/lib/token-usage/quota", () => ({
  checkQuotaExceeded: vi.fn(),
  QuotaExceededError: class extends Error {
    constructor() {
      super("사용 한도를 초과했습니다.")
    }
  },
}))

import { prisma } from "@/lib/prisma"
import { getLanguageModel } from "@/lib/ai/provider"
import { generateText } from "ai"
import { checkQuotaExceeded, QuotaExceededError } from "@/lib/token-usage/quota"
import { recordUsage } from "@/lib/token-usage/service"
import {
  listCareerNotes,
  countCareerNotes,
  getConfirmedNotes,
  countPendingProposals,
  listPendingProposals,
  extractCareerNotes,
  updateCareerNote,
  deleteCareerNote,
  resolveMergeProposal,
} from "@/lib/career-notes/service"
import {
  CareerNoteNotFoundError,
  CareerNoteForbiddenError,
  ConversationNotFoundError,
  MergeProposalNotFoundError,
  MergeProposalForbiddenError,
} from "@/lib/career-notes/errors"

// mock 타입 단축 헬퍼
const mockPrisma = vi.mocked(prisma)
const mockGetLanguageModel = vi.mocked(getLanguageModel)
const mockGenerateText = vi.mocked(generateText)
const mockCheckQuotaExceeded = vi.mocked(checkQuotaExceeded)
const mockRecordUsage = vi.mocked(recordUsage)

const USER_ID = "user-1"
const NOTE_ID = "note-1"
const CONV_ID = "conv-1"
const PROPOSAL_ID = "proposal-1"

// ─────────────────────────────────────────────────────────────────────────────
// 1. listCareerNotes
// ─────────────────────────────────────────────────────────────────────────────
describe("listCareerNotes()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("기본적으로 CONFIRMED 상태의 노트를 반환한다", async () => {
    const mockNotes = [{ id: "n-1" }, { id: "n-2" }]
    mockPrisma.careerNote.findMany.mockResolvedValue(mockNotes as never)

    const result = await listCareerNotes(USER_ID)

    expect(prisma.careerNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, status: "CONFIRMED" },
      }),
    )
    expect(result.notes).toEqual(mockNotes)
    expect(result.nextCursor).toBeUndefined()
  })

  it("status 옵션으로 PENDING 노트를 필터링한다", async () => {
    mockPrisma.careerNote.findMany.mockResolvedValue([] as never)

    await listCareerNotes(USER_ID, { status: "pending" })

    expect(prisma.careerNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, status: "PENDING" },
      }),
    )
  })

  it("limit+1개를 조회해 초과 시 nextCursor를 반환한다", async () => {
    // limit=2일 때 3개를 반환하면 마지막 항목이 nextCursor가 됨
    const mockNotes = [{ id: "n-1" }, { id: "n-2" }, { id: "n-3" }]
    mockPrisma.careerNote.findMany.mockResolvedValue(mockNotes as never)

    const result = await listCareerNotes(USER_ID, { limit: 2 })

    expect(result.notes).toHaveLength(2)
    expect(result.nextCursor).toBe("n-3")
  })

  it("cursor가 있으면 cursor/skip 옵션을 포함해 호출한다", async () => {
    mockPrisma.careerNote.findMany.mockResolvedValue([] as never)

    await listCareerNotes(USER_ID, { cursor: "n-5" })

    expect(prisma.careerNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        cursor: { id: "n-5" },
        skip: 1,
      }),
    )
  })

  it("결과가 limit 이하이면 nextCursor를 반환하지 않는다", async () => {
    mockPrisma.careerNote.findMany.mockResolvedValue([{ id: "n-1" }] as never)

    const result = await listCareerNotes(USER_ID, { limit: 5 })

    expect(result.nextCursor).toBeUndefined()
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 2. countCareerNotes
// ─────────────────────────────────────────────────────────────────────────────
describe("countCareerNotes()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("confirmed, pending, total을 반환한다", async () => {
    // count는 두 번 호출됨 — CONFIRMED, PENDING 순서
    mockPrisma.careerNote.count
      .mockResolvedValueOnce(5 as never)
      .mockResolvedValueOnce(3 as never)

    const result = await countCareerNotes(USER_ID)

    expect(result).toEqual({ confirmed: 5, pending: 3, total: 8 })
  })

  it("CONFIRMED 쿼리와 PENDING 쿼리를 각각 올바른 where 조건으로 호출한다", async () => {
    mockPrisma.careerNote.count.mockResolvedValue(0 as never)

    await countCareerNotes(USER_ID)

    expect(prisma.careerNote.count).toHaveBeenCalledWith({
      where: { userId: USER_ID, status: "CONFIRMED" },
    })
    expect(prisma.careerNote.count).toHaveBeenCalledWith({
      where: { userId: USER_ID, status: "PENDING" },
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 3. getConfirmedNotes
// ─────────────────────────────────────────────────────────────────────────────
describe("getConfirmedNotes()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("CONFIRMED 상태의 노트를 최신순으로 반환한다", async () => {
    const mockNotes = [{ id: "n-1", title: "제목", content: "내용", metadata: {} }]
    mockPrisma.careerNote.findMany.mockResolvedValue(mockNotes as never)

    const result = await getConfirmedNotes(USER_ID)

    expect(prisma.careerNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, status: "CONFIRMED" },
        orderBy: { updatedAt: "desc" },
      }),
    )
    expect(result).toEqual(mockNotes)
  })

  it("기본 limit은 50이다", async () => {
    mockPrisma.careerNote.findMany.mockResolvedValue([] as never)

    await getConfirmedNotes(USER_ID)

    expect(prisma.careerNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 50 }),
    )
  })

  it("커스텀 limit을 지원한다", async () => {
    mockPrisma.careerNote.findMany.mockResolvedValue([] as never)

    await getConfirmedNotes(USER_ID, 10)

    expect(prisma.careerNote.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 4. countPendingProposals
// ─────────────────────────────────────────────────────────────────────────────
describe("countPendingProposals()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("PENDING 상태의 병합 제안 수를 반환한다", async () => {
    mockPrisma.careerNoteMergeProposal.count.mockResolvedValue(4 as never)

    const result = await countPendingProposals(USER_ID)

    expect(result).toBe(4)
    expect(prisma.careerNoteMergeProposal.count).toHaveBeenCalledWith({
      where: {
        status: "PENDING",
        sourceNote: { userId: USER_ID },
      },
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 5. listPendingProposals
// ─────────────────────────────────────────────────────────────────────────────
describe("listPendingProposals()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("PENDING 병합 제안 목록을 sourceNote/targetNote와 함께 반환한다", async () => {
    const mockProposals = [
      {
        id: PROPOSAL_ID,
        sourceNote: { id: NOTE_ID, title: "소스", content: "내용", metadata: {} },
        targetNote: { id: "note-2", title: "타겟", content: "내용2", metadata: {} },
      },
    ]
    mockPrisma.careerNoteMergeProposal.findMany.mockResolvedValue(mockProposals as never)

    const result = await listPendingProposals(USER_ID)

    expect(result).toEqual(mockProposals)
    expect(prisma.careerNoteMergeProposal.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "PENDING", sourceNote: { userId: USER_ID } },
        orderBy: { createdAt: "desc" },
      }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 6. extractCareerNotes
// ─────────────────────────────────────────────────────────────────────────────
describe("extractCareerNotes()", () => {
  // 기본 성공 경로에 필요한 mock 설정 헬퍼
  function setupSuccessPath(extractedNotes: unknown[] = []) {
    mockPrisma.conversation.findFirst.mockResolvedValue({ id: CONV_ID } as never)
    mockPrisma.message.findMany.mockResolvedValue([
      { role: "user", content: "면접 내용입니다." },
    ] as never)
    mockCheckQuotaExceeded.mockResolvedValue({ exceeded: false } as never)
    mockPrisma.careerNote.findMany.mockResolvedValue([] as never) // getConfirmedNotes용
    mockGetLanguageModel.mockResolvedValue({
      model: {} as never,
      isServerKey: false,
      provider: "openai",
      modelId: "gpt-4o",
    } as never)
    mockGenerateText.mockResolvedValue({
      output: { notes: extractedNotes },
      usage: { inputTokens: 100, outputTokens: 50 },
    } as never)
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      if (typeof fn === "function") {
        // 트랜잭션 콜백에 전달할 tx mock
        const tx = {
          careerNote: {
            findMany: vi.fn().mockResolvedValue([]),
            create: vi.fn().mockResolvedValue({ id: "new-note-1" }),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          careerNoteSource: {
            create: vi.fn().mockResolvedValue({}),
          },
          careerNoteMergeProposal: {
            create: vi.fn().mockResolvedValue({ id: "proposal-1" }),
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        return fn(tx)
      }
      return Promise.all(fn as Promise<unknown>[])
    })
    mockRecordUsage.mockResolvedValue(undefined as never)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockRecordUsage.mockResolvedValue(undefined as never)
  })

  it("대화를 찾을 수 없으면 ConversationNotFoundError를 던진다", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue(null)

    await expect(extractCareerNotes(USER_ID, CONV_ID)).rejects.toThrow(ConversationNotFoundError)
  })

  it("메시지가 없으면 빈 결과를 반환한다", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({ id: CONV_ID } as never)
    mockPrisma.message.findMany.mockResolvedValue([] as never)

    const result = await extractCareerNotes(USER_ID, CONV_ID)

    expect(result).toEqual({ notes: [], proposals: [] })
    // 메시지 없으면 quota 체크도 하지 않아야 함
    expect(mockCheckQuotaExceeded).not.toHaveBeenCalled()
  })

  it("쿼터 초과 시 QuotaExceededError를 던진다", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({ id: CONV_ID } as never)
    mockPrisma.message.findMany.mockResolvedValue([
      { role: "user", content: "내용" },
    ] as never)
    mockCheckQuotaExceeded.mockResolvedValue({ exceeded: true } as never)

    await expect(extractCareerNotes(USER_ID, CONV_ID)).rejects.toThrow(QuotaExceededError)
  })

  it("성공 경로: 노트와 제안을 생성하고 반환한다", async () => {
    setupSuccessPath([
      {
        title: "새 노트",
        content: "내용",
        metadata: {},
        relatedExistingNoteId: null,
        suggestedMerge: null,
      },
    ])

    const result = await extractCareerNotes(USER_ID, CONV_ID)

    expect(result).toHaveProperty("notes")
    expect(result).toHaveProperty("proposals")
    expect(mockGenerateText).toHaveBeenCalledOnce()
  })

  it("relatedExistingNoteId가 있는 노트는 PENDING 상태로 생성되고 MergeProposal이 만들어진다", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({ id: CONV_ID } as never)
    mockPrisma.message.findMany.mockResolvedValue([
      { role: "user", content: "내용" },
    ] as never)
    mockCheckQuotaExceeded.mockResolvedValue({ exceeded: false } as never)
    mockPrisma.careerNote.findMany.mockResolvedValue([] as never)
    mockGetLanguageModel.mockResolvedValue({
      model: {} as never,
      isServerKey: false,
      provider: "openai",
      modelId: "gpt-4o",
    } as never)
    mockGenerateText.mockResolvedValue({
      output: {
        notes: [
          {
            title: "업데이트된 노트",
            content: "업데이트 내용",
            metadata: {},
            relatedExistingNoteId: "existing-note-1",
            suggestedMerge: {
              title: "병합 제목",
              content: "병합 내용",
              metadata: {},
            },
          },
        ],
      },
      usage: { inputTokens: 100, outputTokens: 50 },
    } as never)

    const mockCreate = vi.fn().mockResolvedValue({ id: "new-note-1" })
    const mockProposalCreate = vi.fn().mockResolvedValue({ id: "proposal-1" })
    const mockSourceCreate = vi.fn().mockResolvedValue({})

    mockPrisma.$transaction.mockImplementation(async (fn) => {
      if (typeof fn === "function") {
        const tx = {
          careerNote: {
            findMany: vi.fn().mockResolvedValue([]),
            create: mockCreate,
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
          careerNoteSource: { create: mockSourceCreate },
          careerNoteMergeProposal: {
            create: mockProposalCreate,
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        }
        return fn(tx)
      }
      return Promise.all(fn as Promise<unknown>[])
    })
    mockRecordUsage.mockResolvedValue(undefined as never)

    await extractCareerNotes(USER_ID, CONV_ID)

    // PENDING 상태로 note 생성
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PENDING" }) }),
    )
    // MergeProposal 생성
    expect(mockProposalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          sourceNoteId: "new-note-1",
          targetNoteId: "existing-note-1",
        }),
      }),
    )
  })

  it("동일 대화의 기존 PENDING 노트와 제안을 먼저 삭제 후 재추출한다", async () => {
    mockPrisma.conversation.findFirst.mockResolvedValue({ id: CONV_ID } as never)
    mockPrisma.message.findMany.mockResolvedValue([{ role: "user", content: "내용" }] as never)
    mockCheckQuotaExceeded.mockResolvedValue({ exceeded: false } as never)
    mockPrisma.careerNote.findMany.mockResolvedValue([] as never)
    mockGetLanguageModel.mockResolvedValue({
      model: {} as never,
      isServerKey: false,
      provider: "openai",
      modelId: "gpt-4o",
    } as never)
    mockGenerateText.mockResolvedValue({
      output: { notes: [] },
      usage: { inputTokens: 10, outputTokens: 5 },
    } as never)
    mockRecordUsage.mockResolvedValue(undefined as never)

    // 기존에 이 대화에서 생성된 PENDING 노트가 있다고 가정
    const mockTxFindMany = vi.fn().mockResolvedValue([{ id: "old-pending-note" }])
    const mockTxProposalDeleteMany = vi.fn().mockResolvedValue({ count: 1 })
    const mockTxNoteDeleteMany = vi.fn().mockResolvedValue({ count: 1 })

    mockPrisma.$transaction.mockImplementation(async (fn) => {
      if (typeof fn === "function") {
        const tx = {
          careerNote: {
            findMany: mockTxFindMany,
            create: vi.fn().mockResolvedValue({ id: "new-note" }),
            deleteMany: mockTxNoteDeleteMany,
          },
          careerNoteSource: { create: vi.fn().mockResolvedValue({}) },
          careerNoteMergeProposal: {
            create: vi.fn().mockResolvedValue({}),
            deleteMany: mockTxProposalDeleteMany,
          },
        }
        return fn(tx)
      }
      return Promise.all(fn as Promise<unknown>[])
    })

    await extractCareerNotes(USER_ID, CONV_ID)

    // 기존 PENDING 병합 제안 삭제 검증
    expect(mockTxProposalDeleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sourceNoteId: { in: ["old-pending-note"] },
          status: "PENDING",
        }),
      }),
    )
    // 기존 PENDING 노트 삭제 검증
    expect(mockTxNoteDeleteMany).toHaveBeenCalledWith({
      where: { id: { in: ["old-pending-note"] } },
    })
  })

  it("토큰 사용량을 기록한다", async () => {
    setupSuccessPath([])

    await extractCareerNotes(USER_ID, CONV_ID)

    // recordUsage는 .catch()를 통해 비동기 처리되므로 최소 한 번 호출 확인
    expect(mockRecordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: USER_ID,
        feature: "CAREER_NOTE",
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        metadata: { conversationId: CONV_ID },
      }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 7. updateCareerNote
// ─────────────────────────────────────────────────────────────────────────────
describe("updateCareerNote()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("소유자 확인 후 노트를 업데이트한다", async () => {
    mockPrisma.careerNote.updateMany.mockResolvedValue({ count: 1 } as never)

    await updateCareerNote(USER_ID, NOTE_ID, { title: "새 제목", content: "새 내용" })

    expect(prisma.careerNote.updateMany).toHaveBeenCalledWith({
      where: { id: NOTE_ID, userId: USER_ID },
      data: { title: "새 제목", content: "새 내용" },
    })
  })

  it("undefined 필드는 업데이트 data에 포함하지 않는다", async () => {
    mockPrisma.careerNote.updateMany.mockResolvedValue({ count: 1 } as never)

    await updateCareerNote(USER_ID, NOTE_ID, { title: "새 제목" })

    expect(prisma.careerNote.updateMany).toHaveBeenCalledWith({
      where: { id: NOTE_ID, userId: USER_ID },
      data: { title: "새 제목" },
    })
  })

  it("count=0이고 노트가 없으면 CareerNoteNotFoundError를 던진다", async () => {
    mockPrisma.careerNote.updateMany.mockResolvedValue({ count: 0 } as never)
    mockPrisma.careerNote.findUnique.mockResolvedValue(null)

    await expect(
      updateCareerNote(USER_ID, NOTE_ID, { title: "제목" }),
    ).rejects.toThrow(CareerNoteNotFoundError)
  })

  it("count=0이고 노트는 존재하지만 소유자가 다르면 CareerNoteForbiddenError를 던진다", async () => {
    mockPrisma.careerNote.updateMany.mockResolvedValue({ count: 0 } as never)
    mockPrisma.careerNote.findUnique.mockResolvedValue({ id: NOTE_ID } as never)

    await expect(
      updateCareerNote(USER_ID, NOTE_ID, { title: "제목" }),
    ).rejects.toThrow(CareerNoteForbiddenError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 8. deleteCareerNote
// ─────────────────────────────────────────────────────────────────────────────
describe("deleteCareerNote()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("소유자 확인 후 노트를 삭제한다", async () => {
    mockPrisma.careerNote.deleteMany.mockResolvedValue({ count: 1 } as never)

    await deleteCareerNote(USER_ID, NOTE_ID)

    expect(prisma.careerNote.deleteMany).toHaveBeenCalledWith({
      where: { id: NOTE_ID, userId: USER_ID },
    })
  })

  it("count=0이고 노트가 없으면 CareerNoteNotFoundError를 던진다", async () => {
    mockPrisma.careerNote.deleteMany.mockResolvedValue({ count: 0 } as never)
    mockPrisma.careerNote.findUnique.mockResolvedValue(null)

    await expect(deleteCareerNote(USER_ID, NOTE_ID)).rejects.toThrow(CareerNoteNotFoundError)
  })

  it("count=0이고 노트는 존재하지만 소유자가 다르면 CareerNoteForbiddenError를 던진다", async () => {
    mockPrisma.careerNote.deleteMany.mockResolvedValue({ count: 0 } as never)
    mockPrisma.careerNote.findUnique.mockResolvedValue({ id: NOTE_ID } as never)

    await expect(deleteCareerNote(USER_ID, NOTE_ID)).rejects.toThrow(CareerNoteForbiddenError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// 9. resolveMergeProposal
// ─────────────────────────────────────────────────────────────────────────────
describe("resolveMergeProposal()", () => {
  // 기본 proposal mock 객체
  const baseProposal = {
    id: PROPOSAL_ID,
    status: "PENDING",
    suggestedTitle: "병합 제목",
    suggestedContent: "병합 내용",
    suggestedMetadata: {},
    sourceNote: {
      id: NOTE_ID,
      userId: USER_ID,
      sources: [{ conversationId: CONV_ID }],
    },
    targetNote: { id: "target-note-1" },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("proposal을 찾을 수 없으면 MergeProposalNotFoundError를 던진다", async () => {
    mockPrisma.careerNoteMergeProposal.findUnique.mockResolvedValue(null)

    await expect(
      resolveMergeProposal(USER_ID, PROPOSAL_ID, { action: "accept" }),
    ).rejects.toThrow(MergeProposalNotFoundError)
  })

  it("sourceNote의 소유자가 다르면 MergeProposalForbiddenError를 던진다", async () => {
    mockPrisma.careerNoteMergeProposal.findUnique.mockResolvedValue({
      ...baseProposal,
      sourceNote: { ...baseProposal.sourceNote, userId: "other-user" },
    } as never)

    await expect(
      resolveMergeProposal(USER_ID, PROPOSAL_ID, { action: "accept" }),
    ).rejects.toThrow(MergeProposalForbiddenError)
  })

  describe("accept 흐름", () => {
    function setupAcceptTransaction() {
      mockPrisma.careerNoteMergeProposal.findUnique.mockResolvedValue(baseProposal as never)

      const mockUpsert = vi.fn().mockResolvedValue({})
      const mockProposalUpdate = vi.fn().mockResolvedValue({})
      const mockNoteUpdate = vi.fn().mockResolvedValue({})
      const mockNoteDelete = vi.fn().mockResolvedValue({})

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          const tx = {
            careerNoteSource: { upsert: mockUpsert },
            careerNoteMergeProposal: { update: mockProposalUpdate },
            careerNote: { update: mockNoteUpdate, delete: mockNoteDelete },
          }
          return fn(tx)
        }
        return Promise.all(fn as Promise<unknown>[])
      })

      return { mockUpsert, mockProposalUpdate, mockNoteUpdate, mockNoteDelete }
    }

    it("sourceNote의 sources를 targetNote로 이전한다 (upsert)", async () => {
      const { mockUpsert } = setupAcceptTransaction()

      await resolveMergeProposal(USER_ID, PROPOSAL_ID, { action: "accept" })

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            careerNoteId_conversationId: {
              careerNoteId: "target-note-1",
              conversationId: CONV_ID,
            },
          },
          create: { careerNoteId: "target-note-1", conversationId: CONV_ID },
          update: {},
        }),
      )
    })

    it("proposal 상태를 ACCEPTED로 업데이트한다", async () => {
      const { mockProposalUpdate } = setupAcceptTransaction()

      await resolveMergeProposal(USER_ID, PROPOSAL_ID, { action: "accept" })

      expect(mockProposalUpdate).toHaveBeenCalledWith({
        where: { id: PROPOSAL_ID },
        data: { status: "ACCEPTED" },
      })
    })

    it("targetNote를 suggestedTitle/Content로 업데이트한다", async () => {
      const { mockNoteUpdate } = setupAcceptTransaction()

      await resolveMergeProposal(USER_ID, PROPOSAL_ID, { action: "accept" })

      expect(mockNoteUpdate).toHaveBeenCalledWith({
        where: { id: "target-note-1" },
        data: {
          title: baseProposal.suggestedTitle,
          content: baseProposal.suggestedContent,
          metadata: baseProposal.suggestedMetadata,
        },
      })
    })

    it("editedTitle/Content가 있으면 suggested 값 대신 사용한다", async () => {
      const { mockNoteUpdate } = setupAcceptTransaction()

      await resolveMergeProposal(USER_ID, PROPOSAL_ID, {
        action: "accept",
        editedTitle: "수정된 제목",
        editedContent: "수정된 내용",
      })

      expect(mockNoteUpdate).toHaveBeenCalledWith({
        where: { id: "target-note-1" },
        data: expect.objectContaining({
          title: "수정된 제목",
          content: "수정된 내용",
        }),
      })
    })

    it("sourceNote를 삭제한다", async () => {
      const { mockNoteDelete } = setupAcceptTransaction()

      await resolveMergeProposal(USER_ID, PROPOSAL_ID, { action: "accept" })

      expect(mockNoteDelete).toHaveBeenCalledWith({
        where: { id: NOTE_ID },
      })
    })
  })

  describe("이미 처리된 proposal", () => {
    it("ACCEPTED 상태의 proposal에 대해 MergeProposalNotFoundError를 발생시킨다", async () => {
      mockPrisma.careerNoteMergeProposal.findUnique.mockResolvedValue({
        ...baseProposal,
        status: "ACCEPTED",
      } as never)

      await expect(
        resolveMergeProposal(USER_ID, PROPOSAL_ID, { action: "accept" }),
      ).rejects.toThrow(MergeProposalNotFoundError)
    })

    it("REJECTED 상태의 proposal에 대해 MergeProposalNotFoundError를 발생시킨다", async () => {
      mockPrisma.careerNoteMergeProposal.findUnique.mockResolvedValue({
        ...baseProposal,
        status: "REJECTED",
      } as never)

      await expect(
        resolveMergeProposal(USER_ID, PROPOSAL_ID, { action: "reject" }),
      ).rejects.toThrow(MergeProposalNotFoundError)
    })
  })

  describe("reject 흐름", () => {
    it("proposal 상태를 REJECTED로, sourceNote 상태를 CONFIRMED로 업데이트한다", async () => {
      mockPrisma.careerNoteMergeProposal.findUnique.mockResolvedValue(baseProposal as never)

      // reject 흐름은 배열 트랜잭션 사용
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        if (typeof fn === "function") {
          // 콜백 형태는 없어야 하지만 방어적으로 처리
          return fn({} as never)
        }
        return Promise.all(fn as Promise<unknown>[])
      })
      // reject 흐름에서 직접 prisma 메서드를 사용하므로 mock 설정
      mockPrisma.careerNoteMergeProposal.update.mockResolvedValue({} as never)
      mockPrisma.careerNote.update.mockResolvedValue({} as never)

      await resolveMergeProposal(USER_ID, PROPOSAL_ID, { action: "reject" })

      // 배열 트랜잭션이 호출되었는지 확인 (두 Promise를 묶어서 전달)
      expect(prisma.$transaction).toHaveBeenCalledOnce()
      expect(prisma.careerNoteMergeProposal.update).toHaveBeenCalledWith({
        where: { id: PROPOSAL_ID },
        data: { status: "REJECTED" },
      })
      expect(prisma.careerNote.update).toHaveBeenCalledWith({
        where: { id: NOTE_ID },
        data: { status: "CONFIRMED" },
      })
    })
  })
})
