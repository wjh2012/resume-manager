import { describe, expect, it } from "vitest"
import { extractInsightsSchema, updateInsightSchema } from "@/lib/validations/insight"

describe("extractInsightsSchema", () => {
  it("accepts valid conversationId", () => {
    const result = extractInsightsSchema.safeParse({
      conversationId: "550e8400-e29b-41d4-a716-446655440000",
    })
    expect(result.success).toBe(true)
  })

  it("rejects non-UUID conversationId", () => {
    const result = extractInsightsSchema.safeParse({ conversationId: "not-uuid" })
    expect(result.success).toBe(false)
  })

  it("rejects missing conversationId", () => {
    const result = extractInsightsSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe("updateInsightSchema", () => {
  it("accepts valid data", () => {
    const result = updateInsightSchema.safeParse({
      title: "강점 제목",
      content: "구체적인 내용",
      category: "strength",
    })
    expect(result.success).toBe(true)
  })

  it("rejects empty title", () => {
    const result = updateInsightSchema.safeParse({
      title: "",
      content: "내용",
      category: "strength",
    })
    expect(result.success).toBe(false)
  })

  it("rejects invalid category", () => {
    const result = updateInsightSchema.safeParse({
      title: "제목",
      content: "내용",
      category: "invalid",
    })
    expect(result.success).toBe(false)
  })

  it("accepts all valid categories", () => {
    const categories = ["strength", "experience", "motivation", "skill", "other"]
    for (const category of categories) {
      const result = updateInsightSchema.safeParse({
        title: "제목",
        content: "내용",
        category,
      })
      expect(result.success).toBe(true)
    }
  })

  it("rejects title over 200 chars", () => {
    const result = updateInsightSchema.safeParse({
      title: "a".repeat(201),
      content: "내용",
      category: "strength",
    })
    expect(result.success).toBe(false)
  })
})
