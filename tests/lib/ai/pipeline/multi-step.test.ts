import { describe, it, expect, vi } from "vitest"

vi.mock("ai", () => ({
  streamText: vi.fn(),
  stepCountIs: vi.fn().mockReturnValue("stop-condition"),
}))

vi.mock("@/lib/ai/tools", () => ({
  calculateMaxSteps: vi.fn().mockReturnValue("stop-condition"),
}))

import { streamText } from "ai"
import { handleMultiStep } from "@/lib/ai/pipeline/multi-step"

const mockStreamText = vi.mocked(streamText)

describe("handleMultiStep", () => {
  it("streamText를 tools + stopWhen과 함께 호출한다", () => {
    const mockResult = { toUIMessageStreamResponse: vi.fn() }
    mockStreamText.mockReturnValue(mockResult as never)

    const tools = { readDocument: {} }
    const onFinish = vi.fn()
    const result = handleMultiStep({
      model: {} as never,
      system: "시스템 프롬프트",
      modelMessages: [] as never,
      tools: tools as never,
      documentCount: 3,
      careerNoteCount: 2,
      externalDocumentCount: 1,
      onFinish,
    })

    expect(mockStreamText).toHaveBeenCalledWith(
      expect.objectContaining({
        system: "시스템 프롬프트",
        tools,
        onFinish,
      })
    )
    expect(result).toBe(mockResult)
  })
})
