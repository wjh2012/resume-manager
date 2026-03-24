import { describe, expect, it } from "vitest"
import {
  createExternalDocumentSchema,
  updateExternalDocumentSchema,
  externalDocumentUploadSchema,
} from "@/lib/validations/external-document"

describe("createExternalDocumentSchema (텍스트)", () => {
  it("유효한 텍스트 문서를 통과한다", () => {
    const result = createExternalDocumentSchema.safeParse({
      title: "네이버 채용공고",
      category: "채용공고",
      content: "프론트엔드 엔지니어를 모집합니다.",
    })
    expect(result.success).toBe(true)
  })

  it("제목이 비어있으면 실패한다", () => {
    const result = createExternalDocumentSchema.safeParse({
      title: "",
      content: "내용",
    })
    expect(result.success).toBe(false)
  })

  it("내용이 비어있으면 실패한다", () => {
    const result = createExternalDocumentSchema.safeParse({
      title: "제목",
      content: "",
    })
    expect(result.success).toBe(false)
  })

  it("내용이 50000자를 초과하면 실패한다", () => {
    const result = createExternalDocumentSchema.safeParse({
      title: "제목",
      content: "a".repeat(50001),
    })
    expect(result.success).toBe(false)
  })

  it("category가 없으면 빈 문자열로 기본값", () => {
    const result = createExternalDocumentSchema.safeParse({
      title: "제목",
      content: "내용",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.category).toBe("")
    }
  })
})

describe("updateExternalDocumentSchema", () => {
  it("제목만 수정 가능하다", () => {
    const result = updateExternalDocumentSchema.safeParse({ title: "새 제목" })
    expect(result.success).toBe(true)
  })

  it("category만 수정 가능하다", () => {
    const result = updateExternalDocumentSchema.safeParse({ category: "JD" })
    expect(result.success).toBe(true)
  })

  it("빈 객체는 실패한다 (최소 1개 필드 필요)", () => {
    const result = updateExternalDocumentSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe("externalDocumentUploadSchema", () => {
  it("제목과 카테고리를 검증한다", () => {
    const result = externalDocumentUploadSchema.safeParse({
      title: "파일 문서",
      category: "직무기술서",
    })
    expect(result.success).toBe(true)
  })
})
