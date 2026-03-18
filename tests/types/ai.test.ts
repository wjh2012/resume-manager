import { describe, it, expect } from "vitest"
import { AI_PROVIDERS, PROVIDER_MODELS } from "@/types/ai"

describe("AI_PROVIDERS", () => {
  it("openai, anthropic, google 세 제공자를 모두 포함해야 한다", () => {
    expect(AI_PROVIDERS).toContain("openai")
    expect(AI_PROVIDERS).toContain("anthropic")
    expect(AI_PROVIDERS).toContain("google")
  })

  it("정확히 세 개의 제공자만 존재해야 한다", () => {
    expect(AI_PROVIDERS).toHaveLength(3)
  })
})

describe("PROVIDER_MODELS", () => {
  it("AI_PROVIDERS의 모든 제공자에 대한 모델 목록이 존재해야 한다", () => {
    for (const provider of AI_PROVIDERS) {
      expect(PROVIDER_MODELS[provider]).toBeDefined()
      expect(PROVIDER_MODELS[provider].length).toBeGreaterThan(0)
    }
  })

  it("openai 모델 목록은 value와 label 필드를 가져야 한다", () => {
    for (const model of PROVIDER_MODELS.openai) {
      expect(model.value).toBeTruthy()
      expect(model.label).toBeTruthy()
    }
  })

  it("anthropic 모델 목록은 value와 label 필드를 가져야 한다", () => {
    for (const model of PROVIDER_MODELS.anthropic) {
      expect(model.value).toBeTruthy()
      expect(model.label).toBeTruthy()
    }
  })

  it("google 모델 목록은 value와 label 필드를 가져야 한다", () => {
    for (const model of PROVIDER_MODELS.google) {
      expect(model.value).toBeTruthy()
      expect(model.label).toBeTruthy()
    }
  })

  it("openai는 gpt-4o 모델을 포함해야 한다", () => {
    const values = PROVIDER_MODELS.openai.map((m) => m.value)
    expect(values).toContain("gpt-4o")
  })

  it("anthropic는 claude-sonnet-4-20250514 모델을 포함해야 한다", () => {
    const values = PROVIDER_MODELS.anthropic.map((m) => m.value)
    expect(values).toContain("claude-sonnet-4-20250514")
  })

  it("google은 gemini-2.0-flash 모델을 포함해야 한다", () => {
    const values = PROVIDER_MODELS.google.map((m) => m.value)
    expect(values).toContain("gemini-2.0-flash")
  })
})
