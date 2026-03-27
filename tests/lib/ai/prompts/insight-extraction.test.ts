import { describe, it, expect } from "vitest"
import {
  INSIGHT_CATEGORIES,
  INSIGHT_CATEGORY_LABELS,
  insightExtractionPrompt,
} from "@/lib/ai/prompts/insight-extraction"

describe("INSIGHT_CATEGORIES", () => {
  it("정확히 5개의 카테고리를 포함해야 한다", () => {
    expect(INSIGHT_CATEGORIES).toHaveLength(5)
  })

  it("'strength' 카테고리가 포함되어야 한다", () => {
    expect(INSIGHT_CATEGORIES).toContain("strength")
  })

  it("'experience' 카테고리가 포함되어야 한다", () => {
    expect(INSIGHT_CATEGORIES).toContain("experience")
  })

  it("'motivation' 카테고리가 포함되어야 한다", () => {
    expect(INSIGHT_CATEGORIES).toContain("motivation")
  })

  it("'skill' 카테고리가 포함되어야 한다", () => {
    expect(INSIGHT_CATEGORIES).toContain("skill")
  })

  it("'other' 카테고리가 포함되어야 한다", () => {
    expect(INSIGHT_CATEGORIES).toContain("other")
  })

  it("모든 카테고리가 정확한 순서로 정의되어야 한다", () => {
    expect(INSIGHT_CATEGORIES).toEqual([
      "strength",
      "experience",
      "motivation",
      "skill",
      "other",
    ])
  })
})

describe("INSIGHT_CATEGORY_LABELS", () => {
  it("INSIGHT_CATEGORIES의 모든 항목에 대해 라벨이 정의되어야 한다", () => {
    for (const category of INSIGHT_CATEGORIES) {
      expect(INSIGHT_CATEGORY_LABELS).toHaveProperty(category)
      expect(typeof INSIGHT_CATEGORY_LABELS[category]).toBe("string")
      expect(INSIGHT_CATEGORY_LABELS[category].length).toBeGreaterThan(0)
    }
  })

  it("프롬프트에 한국어 라벨이 포함되어야 한다", () => {
    const koreanPattern = /[\uAC00-\uD7AF]/
    for (const category of INSIGHT_CATEGORIES) {
      expect(INSIGHT_CATEGORY_LABELS[category]).toMatch(koreanPattern)
    }
  })
})

describe("insightExtractionPrompt", () => {
  it("비어 있지 않은 문자열이어야 한다", () => {
    expect(typeof insightExtractionPrompt).toBe("string")
    expect(insightExtractionPrompt.length).toBeGreaterThan(0)
  })

  it("'strength' 카테고리명이 포함되어야 한다", () => {
    expect(insightExtractionPrompt).toContain("strength")
  })

  it("'experience' 카테고리명이 포함되어야 한다", () => {
    expect(insightExtractionPrompt).toContain("experience")
  })

  it("'motivation' 카테고리명이 포함되어야 한다", () => {
    expect(insightExtractionPrompt).toContain("motivation")
  })

  it("'skill' 카테고리명이 포함되어야 한다", () => {
    expect(insightExtractionPrompt).toContain("skill")
  })

  it("'other' 카테고리명이 포함되어야 한다", () => {
    expect(insightExtractionPrompt).toContain("other")
  })

  it("JSON 배열 응답 형식 안내가 포함되어야 한다", () => {
    expect(insightExtractionPrompt).toContain("JSON")
  })

  it("응답 예시의 category 필드가 포함되어야 한다", () => {
    expect(insightExtractionPrompt).toContain('"category"')
  })
})
