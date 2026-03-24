import { describe, it, expect } from "vitest"
import { buildInterviewSystemPrompt } from "@/lib/ai/prompts/interview"

// ─────────────────────────────────────────────────────────────────────────────
// buildInterviewSystemPrompt
// ─────────────────────────────────────────────────────────────────────────────

describe("buildInterviewSystemPrompt()", () => {
  const baseContext = "백엔드 개발 3년 경력, TypeScript 숙련"

  describe("context 포함 여부", () => {
    it("context가 항상 결과에 포함되어야 한다", () => {
      const result = buildInterviewSystemPrompt({
        context: baseContext,
      })

      expect(result).toContain(baseContext)
    })

    it("참고자료 헤더가 항상 포함되어야 한다", () => {
      const result = buildInterviewSystemPrompt({
        context: baseContext,
      })

      expect(result).toContain("[참고자료]")
    })
  })

  describe("회사명과 포지션 모두 제공할 때", () => {
    it("회사명이 결과에 포함되어야 한다", () => {
      const result = buildInterviewSystemPrompt({
        companyName: "카카오",
        position: "백엔드 개발자",
        context: baseContext,
      })

      expect(result).toContain("카카오")
    })

    it("포지션이 결과에 포함되어야 한다", () => {
      const result = buildInterviewSystemPrompt({
        companyName: "카카오",
        position: "백엔드 개발자",
        context: baseContext,
      })

      expect(result).toContain("백엔드 개발자")
    })

    it("지원 대상 라인에 슬래시 구분자로 함께 표시되어야 한다", () => {
      const result = buildInterviewSystemPrompt({
        companyName: "카카오",
        position: "백엔드 개발자",
        context: baseContext,
      })

      expect(result).toContain("카카오 / 백엔드 개발자")
    })
  })

  describe("회사명만 제공할 때", () => {
    it("회사명이 결과에 포함되어야 한다", () => {
      const result = buildInterviewSystemPrompt({
        companyName: "네이버",
        context: baseContext,
      })

      expect(result).toContain("네이버")
    })

    it("슬래시 구분자 없이 회사명만 표시되어야 한다", () => {
      const result = buildInterviewSystemPrompt({
        companyName: "네이버",
        context: baseContext,
      })

      expect(result).not.toContain("네이버 /")
    })
  })

  describe("포지션만 제공할 때", () => {
    it("포지션이 결과에 포함되어야 한다", () => {
      const result = buildInterviewSystemPrompt({
        position: "프론트엔드 개발자",
        context: baseContext,
      })

      expect(result).toContain("프론트엔드 개발자")
    })

    it("슬래시 구분자 없이 포지션만 표시되어야 한다", () => {
      const result = buildInterviewSystemPrompt({
        position: "프론트엔드 개발자",
        context: baseContext,
      })

      expect(result).not.toContain("/ 프론트엔드 개발자")
    })
  })

  describe("회사명과 포지션 모두 생략할 때", () => {
    it("지원 대상 라인이 없어야 한다", () => {
      const result = buildInterviewSystemPrompt({
        context: baseContext,
      })

      expect(result).not.toContain("지원 대상:")
    })

    it("context는 여전히 결과에 포함되어야 한다", () => {
      const result = buildInterviewSystemPrompt({
        context: baseContext,
      })

      expect(result).toContain(baseContext)
    })
  })

  describe("참고자료 섹션 위치", () => {
    it("context가 참고자료 헤더 뒤에 위치해야 한다", () => {
      const result = buildInterviewSystemPrompt({
        context: baseContext,
      })

      expect(result.indexOf("[참고자료]")).toBeLessThan(result.indexOf(baseContext))
    })
  })

  describe("도구 안내", () => {
    it("readExternalDocument 도구 안내가 포함되어야 한다", () => {
      const result = buildInterviewSystemPrompt({
        context: baseContext,
      })

      expect(result).toContain("readExternalDocument")
    })

    it("readDocument 도구 안내가 포함되어야 한다", () => {
      const result = buildInterviewSystemPrompt({
        context: baseContext,
      })

      expect(result).toContain("readDocument")
    })
  })
})
