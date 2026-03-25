import { describe, it, expect } from "vitest"
import { countTokens, getModelContextWindow } from "@/lib/ai/tokens"

describe("countTokens", () => {
  it("시스템 프롬프트와 메시지의 토큰 수를 근사 추정한다", () => {
    const system = "a".repeat(400) // 400 chars ÷ 2 = 200 tokens
    const messages = [{ content: "b".repeat(200) }] // 200 chars ÷ 2 = 100 tokens
    const result = countTokens(system, messages)
    expect(result).toBe(300)
  })

  it("배열 형태의 content를 처리한다", () => {
    const messages = [{ content: [{ type: "text", text: "a".repeat(100) }] }]
    const result = countTokens("", messages)
    expect(result).toBe(50)
  })

  it("빈 입력에 0을 반환한다", () => {
    expect(countTokens("", [])).toBe(0)
  })
})

describe("getModelContextWindow", () => {
  it("알려진 모델의 컨텍스트 윈도우를 반환한다", () => {
    const result = getModelContextWindow("openai", "gpt-4o")
    expect(result).toBe(128000)
  })

  it("알 수 없는 모델이면 에러를 던진다", () => {
    expect(() => getModelContextWindow("openai", "unknown-model")).toThrow()
  })
})
