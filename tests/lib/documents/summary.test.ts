import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/ai/provider", () => ({
  getLanguageModel: vi.fn(),
  AiSettingsNotFoundError: class extends Error {
    constructor() { super("AI 설정이 완료되지 않았습니다.") }
  },
}))

vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

vi.mock("@/lib/token-usage/service", () => ({
  recordUsage: vi.fn(),
}))

vi.mock("@/lib/token-usage/quota", () => ({
  checkQuotaExceeded: vi.fn(),
}))

import { generateText } from "ai"
import { getLanguageModel, AiSettingsNotFoundError } from "@/lib/ai/provider"
import { checkQuotaExceeded } from "@/lib/token-usage/quota"
import { recordUsage } from "@/lib/token-usage/service"
import { generateDocumentSummary } from "@/lib/documents/summary"

const userId = "user-1"
const extractedText = "5년차 프론트엔드 개발자. React, TypeScript 전문. 대규모 SPA 프로젝트 리드 경험."

beforeEach(() => {
  vi.clearAllMocks()
})

describe("generateDocumentSummary", () => {
  it("extractedText에서 1~4줄 요약을 반환한다", async () => {
    vi.mocked(checkQuotaExceeded).mockResolvedValue({ exceeded: false })
    vi.mocked(getLanguageModel).mockResolvedValue({
      model: {} as never,
      isServerKey: false,
      provider: "openai",
      modelId: "gpt-4o",
    })
    vi.mocked(generateText).mockResolvedValue({
      text: "프론트엔드 개발자로 React와 TypeScript 전문성 보유.",
      usage: { inputTokens: 100, outputTokens: 30 },
    } as never)
    vi.mocked(recordUsage).mockResolvedValue(undefined)

    const result = await generateDocumentSummary(userId, extractedText)

    expect(result.summary).toBe("프론트엔드 개발자로 React와 TypeScript 전문성 보유.")
    expect(result.usage).toEqual({
      promptTokens: 100,
      completionTokens: 30,
      totalTokens: 130,
    })
    expect(generateText).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: extractedText,
        system: expect.stringContaining("1~4줄"),
      }),
    )
    expect(recordUsage).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        feature: "DOCUMENT_SUMMARY",
        promptTokens: 100,
        completionTokens: 30,
        totalTokens: 130,
      }),
    )
  })

  it("AI 설정이 없으면 null을 반환한다", async () => {
    vi.mocked(checkQuotaExceeded).mockResolvedValue({ exceeded: false })
    vi.mocked(getLanguageModel).mockRejectedValue(new AiSettingsNotFoundError())

    const result = await generateDocumentSummary(userId, extractedText)

    expect(result.summary).toBeNull()
    expect(generateText).not.toHaveBeenCalled()
  })

  it("API 오류 시 null을 반환한다", async () => {
    vi.mocked(checkQuotaExceeded).mockResolvedValue({ exceeded: false })
    vi.mocked(getLanguageModel).mockResolvedValue({
      model: {} as never,
      isServerKey: false,
      provider: "openai",
      modelId: "gpt-4o",
    })
    vi.mocked(generateText).mockRejectedValue(new Error("API rate limit exceeded"))

    const result = await generateDocumentSummary(userId, extractedText)

    expect(result.summary).toBeNull()
  })

  it("쿼터 초과 시 null을 반환한다", async () => {
    vi.mocked(checkQuotaExceeded).mockResolvedValue({ exceeded: true })

    const result = await generateDocumentSummary(userId, extractedText)

    expect(result.summary).toBeNull()
    expect(getLanguageModel).not.toHaveBeenCalled()
    expect(generateText).not.toHaveBeenCalled()
  })
})
