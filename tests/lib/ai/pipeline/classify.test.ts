import { describe, it, expect, vi } from "vitest"

vi.mock("ai", () => ({
  generateText: vi.fn(),
  Output: { object: vi.fn((opts: unknown) => opts) },
}))

import { generateText } from "ai"
import { classify } from "@/lib/ai/pipeline/classify"
import { coverLetterClassificationSchema } from "@/lib/ai/pipeline/schema"

const mockGenerateText = vi.mocked(generateText)

describe("classify", () => {
  it("Output.object + generateText를 호출하고 결과를 반환한다", async () => {
    const mockOutput = {
      documentsToRead: ["doc-1"],
      compareCareerNotes: true,
      needsCompression: false,
    }
    mockGenerateText.mockResolvedValue({
      output: mockOutput,
      usage: { inputTokens: 100, outputTokens: 20 },
    } as never)

    const result = await classify({
      model: {} as never,
      schema: coverLetterClassificationSchema,
      context: "[문서: 이력서]\n요약 내용",
      messages: [{ role: "user", content: "자소서 써줘" }],
    })

    expect(result.classification).toEqual(mockOutput)
    expect(result.usage).toEqual({ inputTokens: 100, outputTokens: 20 })
    expect(mockGenerateText).toHaveBeenCalledOnce()
  })

  it("output이 null이면 에러를 던진다", async () => {
    mockGenerateText.mockResolvedValue({
      output: null,
      usage: { inputTokens: 50, outputTokens: 0 },
    } as never)

    await expect(
      classify({
        model: {} as never,
        schema: coverLetterClassificationSchema,
        context: "",
        messages: [],
      })
    ).rejects.toThrow()
  })
})
