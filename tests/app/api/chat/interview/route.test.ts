import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    interviewSession: { findUnique: vi.fn() },
    interviewDocument: { findMany: vi.fn() },
    conversation: { findUnique: vi.fn() },
    message: { create: vi.fn() },
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
  buildContext: vi.fn(),
}))

vi.mock("@/lib/ai/prompts/interview", () => ({
  buildInterviewSystemPrompt: vi.fn(),
}))

vi.mock("@/lib/token-usage/service", () => ({
  recordUsage: vi.fn(),
}))

vi.mock("@/lib/token-usage/quota", () => ({
  checkQuotaExceeded: vi.fn(),
}))

vi.mock("@/lib/ai/tools", () => ({
  createReadDocumentTool: vi.fn().mockReturnValue({}),
}))

vi.mock("ai", () => ({
  convertToModelMessages: vi.fn(),
}))

vi.mock("@/lib/ai/pipeline", () => ({
  selectPipeline: vi.fn().mockReturnValue("multi-step"),
  handleMultiStep: vi.fn(),
  handleClassification: vi.fn(),
  interviewClassificationSchema: {},
}))

vi.mock("@ai-sdk/openai", () => ({
  openai: { embedding: vi.fn().mockReturnValue({ modelId: "text-embedding-3-small" }) },
}))

import { POST } from "@/app/api/chat/interview/route"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getLanguageModel, AiSettingsNotFoundError } from "@/lib/ai/provider"
import { buildContext } from "@/lib/ai/context"
import { convertToModelMessages } from "ai"
import { recordUsage } from "@/lib/token-usage/service"
import { checkQuotaExceeded } from "@/lib/token-usage/quota"
import { selectPipeline, handleMultiStep } from "@/lib/ai/pipeline"

const mockCreateClient = vi.mocked(createClient)
const mockPrisma = vi.mocked(prisma)
const mockGetLanguageModel = vi.mocked(getLanguageModel)
const mockBuildContext = vi.mocked(buildContext)
const mockConvertToModelMessages = vi.mocked(convertToModelMessages)
const mockRecordUsage = vi.mocked(recordUsage)
const mockCheckQuotaExceeded = vi.mocked(checkQuotaExceeded)
const mockSelectPipeline = vi.mocked(selectPipeline)
const mockHandleMultiStep = vi.mocked(handleMultiStep)

const mockModel = { modelId: "gpt-4o" }

const VALID_USER_ID = "a0000000-0000-4000-8000-000000000001"
const VALID_SESSION_ID = "b0000000-0000-4000-8000-000000000001"
const VALID_CONV_ID = "c0000000-0000-4000-8000-000000000001"
const VALID_DOC_ID = "d0000000-0000-4000-8000-000000000001"

const MOCK_SESSION = {
  userId: VALID_USER_ID,
  companyName: "카카오",
  position: "백엔드",
}

const VALID_BODY = {
  messages: [{ id: "m1", role: "user", content: "면접을 시작합니다." }],
  conversationId: VALID_CONV_ID,
  interviewSessionId: VALID_SESSION_ID,
}

function makeSupabaseMock(user: { id: string } | null) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/chat/interview", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

const mockStreamResponse = { toUIMessageStreamResponse: vi.fn().mockReturnValue(new Response("ok")) }

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateClient.mockResolvedValue(makeSupabaseMock({ id: VALID_USER_ID }) as never)
  mockPrisma.interviewSession.findUnique.mockResolvedValue(MOCK_SESSION as never)
  mockPrisma.interviewDocument.findMany.mockResolvedValue([
    { documentId: VALID_DOC_ID },
  ] as never)
  mockPrisma.conversation.findUnique.mockResolvedValue({
    userId: VALID_USER_ID,
    interviewSessionId: VALID_SESSION_ID,
  } as never)
  mockBuildContext.mockResolvedValue({ context: "context text", careerNoteCount: 0 } as never)
  mockGetLanguageModel.mockResolvedValue({ model: mockModel, isServerKey: false, provider: "openai", modelId: "gpt-4o" } as never)
  mockCheckQuotaExceeded.mockResolvedValue({ exceeded: false } as never)
  mockRecordUsage.mockResolvedValue(undefined as never)
  mockConvertToModelMessages.mockResolvedValue([])
  mockSelectPipeline.mockReturnValue("multi-step")
  mockHandleMultiStep.mockReturnValue(mockStreamResponse as never)
})

describe("POST /api/chat/interview", () => {
  it("인증이 없으면 401을 반환해야 한다", async () => {
    mockCreateClient.mockResolvedValue(makeSupabaseMock(null) as never)
    const response = await POST(makeRequest(VALID_BODY))
    expect(response.status).toBe(401)
  })

  it("세션이 없거나 소유권이 없으면 404를 반환해야 한다", async () => {
    mockPrisma.interviewSession.findUnique.mockResolvedValue(null)
    const response = await POST(makeRequest(VALID_BODY))
    expect(response.status).toBe(404)
  })

  it("conversation 소유권이 없으면 404를 반환해야 한다", async () => {
    mockPrisma.conversation.findUnique.mockResolvedValue({
      userId: "other-user",
      interviewSessionId: VALID_SESSION_ID,
    } as never)
    const response = await POST(makeRequest(VALID_BODY))
    expect(response.status).toBe(404)
  })

  it("정상 요청이면 handleMultiStep을 호출해야 한다", async () => {
    await POST(makeRequest(VALID_BODY))
    expect(mockHandleMultiStep).toHaveBeenCalledOnce()
  })

  it("buildContext를 selectedDocumentIds와 함께 호출해야 한다", async () => {
    await POST(makeRequest(VALID_BODY))
    expect(mockBuildContext).toHaveBeenCalledWith(
      VALID_USER_ID,
      expect.objectContaining({ selectedDocumentIds: [VALID_DOC_ID] }),
    )
  })

  it("AiSettingsNotFoundError이면 400을 반환해야 한다", async () => {
    mockGetLanguageModel.mockRejectedValue(new AiSettingsNotFoundError())
    const response = await POST(makeRequest(VALID_BODY))
    expect(response.status).toBe(400)
  })
})
