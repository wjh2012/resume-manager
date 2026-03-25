import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/ai/tokens", () => ({
  countTokens: vi.fn(),
  getModelContextWindow: vi.fn(),
}))
vi.mock("@/lib/ai/pipeline/compress", () => ({
  compressMessages: vi.fn(),
}))

import { compressIfNeeded } from "@/lib/ai/pipeline"
import { countTokens, getModelContextWindow } from "@/lib/ai/tokens"
import { compressMessages } from "@/lib/ai/pipeline/compress"

const mockModel = {} as any

describe("compressIfNeeded", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("토큰이 50% 이하면 압축하지 않는다", async () => {
    vi.mocked(countTokens).mockReturnValue(40000)
    vi.mocked(getModelContextWindow).mockReturnValue(200000)

    const messages = [{ role: "user" as const, content: "hello" }]
    const result = await compressIfNeeded({
      model: mockModel, modelId: "test", provider: "openai",
      system: "sys", messages,
    })

    expect(result.messages).toBe(messages)
    expect(result.usage).toBeUndefined()
    expect(compressMessages).not.toHaveBeenCalled()
  })

  it("토큰이 50% 초과하면 압축한다", async () => {
    vi.mocked(countTokens).mockReturnValue(120000)
    vi.mocked(getModelContextWindow).mockReturnValue(200000)

    const compressed = [{ role: "user" as const, content: "compressed" }]
    const usage = { inputTokens: 100, outputTokens: 50 }
    vi.mocked(compressMessages).mockResolvedValue({ messages: compressed, usage })

    const result = await compressIfNeeded({
      model: mockModel, modelId: "test", provider: "openai",
      system: "sys", messages: [{ role: "user" as const, content: "hello" }],
    })

    expect(result.messages).toBe(compressed)
    expect(result.usage).toEqual(usage)
    expect(compressMessages).toHaveBeenCalledWith({
      model: mockModel,
      messages: [{ role: "user", content: "hello" }],
    })
  })
})
