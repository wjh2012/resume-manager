import { describe, it, expect, vi } from "vitest"

vi.mock("ai", () => ({
  generateText: vi.fn(),
}))

import { generateText } from "ai"
import { compressMessages } from "@/lib/ai/pipeline/compress"

const mockGenerateText = vi.mocked(generateText)

describe("compressMessages", () => {
  it("4턴 이하이면 압축 없이 그대로 반환한다", async () => {
    const messages = [
      { role: "user" as const, content: [{ type: "text" as const, text: "안녕" }] },
      { role: "assistant" as const, content: [{ type: "text" as const, text: "네" }] },
    ]

    const result = await compressMessages({
      model: {} as never,
      messages,
    })

    expect(result.messages).toEqual(messages)
    expect(result.usage).toBeUndefined()
    expect(mockGenerateText).not.toHaveBeenCalled()
  })

  it("4턴 초과 시 앞부분을 요약하고 최근 4턴을 유지한다", async () => {
    const messages = Array.from({ length: 8 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: [{ type: "text" as const, text: `메시지 ${i}` }],
    }))

    mockGenerateText.mockResolvedValue({
      text: "이전 대화 요약입니다.",
      usage: { inputTokens: 200, outputTokens: 30 },
    } as never)

    const result = await compressMessages({
      model: {} as never,
      messages,
    })

    // 요약 user 메시지 + 최근 4턴 = 5개
    expect(result.messages).toHaveLength(5)
    expect(result.messages[0].role).toBe("user")
    expect(result.usage).toBeDefined()
  })

  it("압축 실패 시 원본 메시지를 그대로 반환한다", async () => {
    const messages = Array.from({ length: 8 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: [{ type: "text" as const, text: `메시지 ${i}` }],
    }))

    mockGenerateText.mockRejectedValue(new Error("API 에러"))

    const result = await compressMessages({
      model: {} as never,
      messages,
    })

    expect(result.messages).toEqual(messages)
    expect(result.usage).toBeUndefined()
  })
})
