import { describe, it, expect } from "vitest"
import {
  coverLetterClassificationSchema,
  interviewClassificationSchema,
} from "@/lib/ai/pipeline/schema"

describe("coverLetterClassificationSchema", () => {
  it("유효한 입력을 파싱한다", () => {
    const input = {
      documentsToRead: ["doc-1", "doc-2"],
      externalDocumentsToRead: ["ext-1"],
      compareCareerNotes: true,
      needsCompression: false,
    }
    const result = coverLetterClassificationSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(input)
  })

  it("documentsToRead가 빈 배열이어도 유효하다", () => {
    const input = {
      documentsToRead: [],
      externalDocumentsToRead: [],
      compareCareerNotes: false,
      needsCompression: false,
    }
    expect(coverLetterClassificationSchema.safeParse(input).success).toBe(true)
  })

  it("compareCareerNotes 필드가 없으면 실패한다", () => {
    const input = { documentsToRead: [], externalDocumentsToRead: [], needsCompression: false }
    expect(coverLetterClassificationSchema.safeParse(input).success).toBe(false)
  })
})

describe("interviewClassificationSchema", () => {
  it("compareCareerNotes 없이 유효하다", () => {
    const input = {
      documentsToRead: ["doc-1"],
      externalDocumentsToRead: [],
      needsCompression: true,
    }
    const result = interviewClassificationSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data).toEqual(input)
  })

  it("compareCareerNotes가 있으면 무시한다 (strip)", () => {
    const input = {
      documentsToRead: [],
      externalDocumentsToRead: [],
      compareCareerNotes: true,
      needsCompression: false,
    }
    const result = interviewClassificationSchema.safeParse(input)
    expect(result.success).toBe(true)
    expect(result.data).not.toHaveProperty("compareCareerNotes")
  })
})
