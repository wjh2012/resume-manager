import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── 외부 의존성 mock (vi.mock은 호이스팅되어 import 전에 실행됨) ─────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    coverLetter: {
      findUnique: vi.fn(),
    },
    conversation: {
      findUnique: vi.fn(),
    },
    careerNote: {
      count: vi.fn(),
    },
    message: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock("@/lib/ai/provider", () => ({
  getLanguageModel: vi.fn(),
  AiSettingsNotFoundError: class AiSettingsNotFoundError extends Error {
    constructor(message = "AI 설정을 찾을 수 없습니다.") {
      super(message)
    }
  },
}))

vi.mock("@/lib/ai/context", () => ({
  buildFullContext: vi.fn(),
}))

vi.mock("@/lib/ai/prompts/cover-letter", () => ({
  buildCoverLetterSystemPrompt: vi.fn(),
}))

vi.mock("@/lib/token-usage/service", () => ({
  recordUsage: vi.fn(),
}))

vi.mock("@/lib/token-usage/quota", () => ({
  checkQuotaExceeded: vi.fn(),
}))

vi.mock("ai", () => ({
  convertToModelMessages: vi.fn(),
  streamText: vi.fn(),
}))

vi.mock("@/lib/ai/pipeline", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/ai/pipeline")>()
  return {
    ...actual,
    compressIfNeeded: vi.fn(),
  }
})

// prisma.ts가 임베딩 관련 SDK를 import할 수 있으므로 사전 mock 처리
vi.mock("@ai-sdk/openai", () => ({
  openai: { embedding: vi.fn().mockReturnValue({ modelId: "text-embedding-3-small" }) },
}))

// ─── 실제 모듈 import ─────────────────────────────────────────────────────────

import { POST } from "@/app/api/chat/cover-letter/route"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getLanguageModel, AiSettingsNotFoundError } from "@/lib/ai/provider"
import { buildFullContext } from "@/lib/ai/context"
import { buildCoverLetterSystemPrompt } from "@/lib/ai/prompts/cover-letter"
import { convertToModelMessages, streamText } from "ai"
import { compressIfNeeded } from "@/lib/ai/pipeline"
import { recordUsage } from "@/lib/token-usage/service"
import { checkQuotaExceeded } from "@/lib/token-usage/quota"

// ─── mock 타입 캐스팅 헬퍼 ───────────────────────────────────────────────────

const mockCreateClient = vi.mocked(createClient)
const mockPrisma = vi.mocked(prisma)
const mockGetLanguageModel = vi.mocked(getLanguageModel)
const mockBuildFullContext = vi.mocked(buildFullContext)
const mockBuildCoverLetterSystemPrompt = vi.mocked(buildCoverLetterSystemPrompt)
const mockConvertToModelMessages = vi.mocked(convertToModelMessages)
const mockStreamText = vi.mocked(streamText)
const mockCompressIfNeeded = vi.mocked(compressIfNeeded)
const mockRecordUsage = vi.mocked(recordUsage)
const mockCheckQuotaExceeded = vi.mocked(checkQuotaExceeded)

// ─── 상수 픽스처 ──────────────────────────────────────────────────────────────

const mockModel = { modelId: "gpt-4o" }

const VALID_USER_ID = "a0000000-0000-4000-8000-000000000001"
const VALID_COVER_LETTER_ID = "b0000000-0000-4000-8000-000000000001"
const VALID_CONVERSATION_ID = "c0000000-0000-4000-8000-000000000001"
const VALID_DOC_ID = "d0000000-0000-4000-8000-000000000001"

const VALID_EXT_DOC_ID = "e0000000-0000-4000-8000-000000000001"

const MOCK_COVER_LETTER = {
  userId: VALID_USER_ID,
  companyName: "카카오",
  position: "백엔드 개발자",
  coverLetterExternalDocs: [{ externalDocumentId: VALID_EXT_DOC_ID }],
}

const MOCK_CONVERSATION = {
  userId: VALID_USER_ID,
  coverLetterId: VALID_COVER_LETTER_ID,
}

// 기본 유효한 user 메시지 픽스처
const BASE_USER_MESSAGE = {
  id: "msg-1",
  role: "user" as const,
  content: "자기소개서 작성 도와주세요",
  parts: [{ type: "text", text: "자기소개서 작성 도와주세요" }],
}

// ─── 헬퍼 함수 ────────────────────────────────────────────────────────────────

function makeSupabaseMock(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/chat/cover-letter", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

function makeValidBody(overrides?: Partial<{
  messages: unknown[]
  conversationId: string
  coverLetterId: string
  selectedDocumentIds: string[]
}>) {
  return {
    messages: [BASE_USER_MESSAGE],
    conversationId: VALID_CONVERSATION_ID,
    coverLetterId: VALID_COVER_LETTER_ID,
    ...overrides,
  }
}

// streamText mock에서 onFinish 콜백을 캡처하고 나중에 직접 호출하는 헬퍼
function captureOnFinish(): { getOnFinish: () => ((args: { text: string; usage?: unknown; steps?: unknown[] }) => Promise<void>) | undefined } {
  let capturedOnFinish: ((args: { text: string; usage?: unknown; steps?: unknown[] }) => Promise<void>) | undefined
  mockStreamText.mockImplementation((opts: { onFinish?: unknown }) => {
    capturedOnFinish = opts.onFinish as (args: { text: string; usage?: unknown; steps?: unknown[] }) => Promise<void>
    return {
      toUIMessageStreamResponse: vi.fn().mockReturnValue(new Response("stream", { status: 200 })),
    } as never
  })
  return { getOnFinish: () => capturedOnFinish }
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()

  // 기본 성공 경로 설정
  mockCreateClient.mockResolvedValue(
    makeSupabaseMock({ id: VALID_USER_ID }) as never,
  )
  mockPrisma.coverLetter.findUnique.mockResolvedValue(MOCK_COVER_LETTER as never)
  mockPrisma.conversation.findUnique.mockResolvedValue(MOCK_CONVERSATION as never)
  mockPrisma.$transaction.mockResolvedValue([])
  mockPrisma.message.create.mockResolvedValue({ id: "msg-created" } as never)
  ;(mockPrisma.careerNote.count as ReturnType<typeof vi.fn>).mockResolvedValue(0)

  mockGetLanguageModel.mockResolvedValue({ model: mockModel, isServerKey: false, provider: "openai", modelId: "gpt-4o" } as never)
  mockCheckQuotaExceeded.mockResolvedValue({ exceeded: false } as never)
  mockRecordUsage.mockResolvedValue(undefined as never)
  mockBuildFullContext.mockResolvedValue("컨텍스트 내용" as never)
  mockBuildCoverLetterSystemPrompt.mockReturnValue("시스템 프롬프트")
  mockConvertToModelMessages.mockResolvedValue([] as never)
  mockCompressIfNeeded.mockResolvedValue({ messages: [] } as never)

  mockStreamText.mockReturnValue({
    toUIMessageStreamResponse: vi.fn().mockReturnValue(new Response("stream", { status: 200 })),
  } as never)
})

// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/chat/cover-letter", () => {
  // ── 인증 검증 ──────────────────────────────────────────────────────────────
  describe("인증이 없을 때", () => {
    it("401을 반환해야 한다", async () => {
      // Arrange
      mockCreateClient.mockResolvedValue(makeSupabaseMock(null) as never)
      const request = makeRequest(makeValidBody())

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(body).toEqual({ error: "인증이 필요합니다." })
    })
  })

  // ── CoverLetter 소유권 검증 ────────────────────────────────────────────────
  describe("CoverLetter가 없거나 소유자가 다를 때", () => {
    it("coverLetter가 null이면 404를 반환해야 한다", async () => {
      // Arrange
      mockPrisma.coverLetter.findUnique.mockResolvedValue(null)
      const request = makeRequest(makeValidBody())

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(body).toEqual({ error: "자기소개서를 찾을 수 없습니다." })
    })

    it("coverLetter.userId가 인증된 사용자와 다르면 404를 반환해야 한다", async () => {
      // Arrange — 다른 사용자 소유의 CoverLetter
      mockPrisma.coverLetter.findUnique.mockResolvedValue({
        ...MOCK_COVER_LETTER,
        userId: "e0000000-0000-4000-8000-000000000099",
      } as never)
      const request = makeRequest(makeValidBody())

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(body).toEqual({ error: "자기소개서를 찾을 수 없습니다." })
    })
  })

  // ── Conversation 소유권 검증 ──────────────────────────────────────────────
  describe("잘못된 conversationId일 때", () => {
    it("conversation이 null이면 404를 반환해야 한다", async () => {
      // Arrange
      mockPrisma.conversation.findUnique.mockResolvedValue(null)
      const request = makeRequest(makeValidBody())

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(body).toEqual({ error: "대화를 찾을 수 없습니다." })
    })

    it("conversation.userId가 인증된 사용자와 다르면 404를 반환해야 한다", async () => {
      // Arrange — 다른 사용자 소유의 Conversation
      mockPrisma.conversation.findUnique.mockResolvedValue({
        userId: "e0000000-0000-4000-8000-000000000099",
        coverLetterId: VALID_COVER_LETTER_ID,
      } as never)
      const request = makeRequest(makeValidBody())

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(body).toEqual({ error: "대화를 찾을 수 없습니다." })
    })

    it("conversation.coverLetterId가 요청의 coverLetterId와 다르면 404를 반환해야 한다", async () => {
      // Arrange — 다른 CoverLetter에 속한 Conversation
      mockPrisma.conversation.findUnique.mockResolvedValue({
        userId: VALID_USER_ID,
        coverLetterId: "f0000000-0000-4000-8000-000000000099",
      } as never)
      const request = makeRequest(makeValidBody())

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(body).toEqual({ error: "대화를 찾을 수 없습니다." })
    })
  })

  // ── 쿼터 초과 ──────────────────────────────────────────────────────────────
  describe("사용 한도를 초과했을 때", () => {
    it("403을 반환해야 한다", async () => {
      // Arrange
      mockCheckQuotaExceeded.mockResolvedValue({ exceeded: true } as never)
      const request = makeRequest(makeValidBody())

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(body).toEqual({ error: "사용 한도를 초과했습니다." })
    })
  })

  // ── AiSettingsNotFoundError ────────────────────────────────────────────────
  describe("AI 설정이 없을 때", () => {
    it("400을 반환해야 한다", async () => {
      // Arrange
      mockGetLanguageModel.mockRejectedValue(new AiSettingsNotFoundError("AI 설정을 찾을 수 없습니다."))
      const request = makeRequest(makeValidBody())

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body.error).toContain("AI 설정을 찾을 수 없습니다.")
    })
  })

  // ── 서버 에러 ──────────────────────────────────────────────────────────────
  describe("예상치 못한 에러가 발생했을 때", () => {
    it("500을 반환해야 한다", async () => {
      // Arrange
      mockBuildFullContext.mockRejectedValue(new Error("DB 연결 실패"))
      const request = makeRequest(makeValidBody())

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(body).toEqual({ error: "채팅 응답 생성에 실패했습니다." })
    })
  })

  // ── onFinish 트랜잭션 로직 ────────────────────────────────────────────────
  describe("onFinish 콜백", () => {
    it("lastMessage.role==='user'이고 text가 있으면 USER + ASSISTANT 메시지를 트랜잭션으로 저장해야 한다", async () => {
      // Arrange
      const { getOnFinish } = captureOnFinish()
      const request = makeRequest(makeValidBody({
        messages: [BASE_USER_MESSAGE],
      }))

      // Act — route 핸들러를 호출하여 onFinish 콜백을 캡처
      await POST(request)
      const onFinish = getOnFinish()
      expect(onFinish).toBeDefined()

      // onFinish 콜백을 직접 실행
      await onFinish!({ text: "AI 응답 내용입니다.", steps: [] })

      // Assert — $transaction이 USER와 ASSISTANT 두 create 연산으로 호출되어야 함
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
      const transactionArg = mockPrisma.$transaction.mock.calls[0][0] as unknown[]
      expect(transactionArg).toHaveLength(2)
    })

    it("text가 빈 문자열이면 USER create만 트랜잭션에 포함되어야 한다", async () => {
      // Arrange
      const { getOnFinish } = captureOnFinish()
      const request = makeRequest(makeValidBody({
        messages: [BASE_USER_MESSAGE],
      }))

      // Act
      await POST(request)
      const onFinish = getOnFinish()
      expect(onFinish).toBeDefined()

      // text가 빈 문자열 → ASSISTANT create는 포함되지 않아야 함
      await onFinish!({ text: "", steps: [] })

      // Assert — USER create만 포함 (1개)
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
      const transactionArg = mockPrisma.$transaction.mock.calls[0][0] as unknown[]
      expect(transactionArg).toHaveLength(1)
    })

    it("lastMessage.role==='assistant'이면 ASSISTANT create만 트랜잭션에 포함되어야 한다", async () => {
      // Arrange
      const { getOnFinish } = captureOnFinish()
      const assistantMessage = {
        id: "msg-2",
        role: "assistant" as const,
        content: "이전 AI 응답",
        parts: [{ type: "text", text: "이전 AI 응답" }],
      }
      const request = makeRequest(makeValidBody({
        messages: [BASE_USER_MESSAGE, assistantMessage],
      }))

      // Act
      await POST(request)
      const onFinish = getOnFinish()
      expect(onFinish).toBeDefined()

      // lastMessage가 assistant → USER create는 포함되지 않아야 함
      await onFinish!({ text: "새 AI 응답", steps: [] })

      // Assert — ASSISTANT create만 포함 (1개)
      expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
      const transactionArg = mockPrisma.$transaction.mock.calls[0][0] as unknown[]
      expect(transactionArg).toHaveLength(1)
    })

    it("onFinish에서 올바른 conversationId, role, content로 message.create를 호출해야 한다", async () => {
      // Arrange
      const { getOnFinish } = captureOnFinish()
      const userContent = "자기소개서 초안을 작성해주세요"
      const userMessage = {
        id: "msg-1",
        role: "user" as const,
        content: userContent,
        parts: [{ type: "text", text: userContent }],
      }
      const request = makeRequest(makeValidBody({ messages: [userMessage] }))

      // Act
      await POST(request)
      const onFinish = getOnFinish()
      await onFinish!({ text: "AI가 생성한 자기소개서 내용", steps: [] })

      // Assert — message.create가 USER와 ASSISTANT 데이터로 각각 호출되어야 함
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: { conversationId: VALID_CONVERSATION_ID, role: "USER", content: userContent },
      })
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: { conversationId: VALID_CONVERSATION_ID, role: "ASSISTANT", content: "AI가 생성한 자기소개서 내용" },
      })
    })
  })

  // ── 성공 경로 ─────────────────────────────────────────────────────────────
  describe("성공적으로 처리될 때", () => {
    it("streamText.toUIMessageStreamResponse() 결과를 반환해야 한다", async () => {
      // Arrange
      const mockStreamResponse = new Response("stream-data", { status: 200 })
      mockStreamText.mockReturnValue({
        toUIMessageStreamResponse: vi.fn().mockReturnValue(mockStreamResponse),
      } as never)
      const request = makeRequest(makeValidBody())

      // Act
      const response = await POST(request)

      // Assert
      expect(response.status).toBe(200)
      expect(mockStreamText).toHaveBeenCalledOnce()
    })

    it("selectedDocumentIds를 buildFullContext에 전달해야 한다", async () => {
      // Arrange
      const request = makeRequest(makeValidBody({
        selectedDocumentIds: [VALID_DOC_ID],
      }))

      // Act
      await POST(request)

      // Assert
      expect(mockBuildFullContext).toHaveBeenCalledWith(
        VALID_USER_ID,
        expect.objectContaining({
          selectedDocumentIds: [VALID_DOC_ID],
          includeCareerNotes: true,
        }),
      )
    })

    it("compressIfNeeded를 올바른 파라미터로 호출해야 한다", async () => {
      // Arrange
      const mockModelMessages = [{ role: "user", content: "test" }]
      mockConvertToModelMessages.mockResolvedValue(mockModelMessages as never)
      const request = makeRequest(makeValidBody())

      // Act
      await POST(request)

      // Assert
      expect(mockCompressIfNeeded).toHaveBeenCalledWith({
        model: mockModel,
        modelId: "gpt-4o",
        provider: "openai",
        system: "시스템 프롬프트",
        messages: mockModelMessages,
      })
    })

    it("compressIfNeeded가 압축한 메시지를 streamText에 전달해야 한다", async () => {
      // Arrange
      const compressedMessages = [{ role: "user", content: "compressed" }]
      mockCompressIfNeeded.mockResolvedValue({ messages: compressedMessages } as never)
      const request = makeRequest(makeValidBody())

      // Act
      await POST(request)

      // Assert
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: compressedMessages,
        }),
      )
    })

    it("compressUsage가 있으면 recordUsage를 호출해야 한다", async () => {
      // Arrange
      mockCompressIfNeeded.mockResolvedValue({
        messages: [],
        usage: { inputTokens: 100, outputTokens: 50 },
      } as never)
      const request = makeRequest(makeValidBody())

      // Act
      await POST(request)

      // Assert
      expect(mockRecordUsage).toHaveBeenCalledWith({
        userId: VALID_USER_ID,
        provider: "openai",
        model: "gpt-4o",
        feature: "COVER_LETTER",
        promptTokens: 100,
        completionTokens: 50,
        totalTokens: 150,
        isServerKey: false,
        metadata: { conversationId: VALID_CONVERSATION_ID },
      })
    })

    it("compressUsage가 없으면 recordUsage를 호출하지 않아야 한다", async () => {
      // Arrange
      mockCompressIfNeeded.mockResolvedValue({ messages: [] } as never)
      const request = makeRequest(makeValidBody())

      // Act
      await POST(request)

      // Assert
      expect(mockRecordUsage).not.toHaveBeenCalled()
    })
  })
})
