import { describe, it, expect } from "vitest"
import { buildCoverLetterSystemPrompt } from "@/lib/ai/prompts/cover-letter"

// ─────────────────────────────────────────────────────────────────────────────
// buildCoverLetterSystemPrompt
// ─────────────────────────────────────────────────────────────────────────────

describe("buildCoverLetterSystemPrompt()", () => {
  const baseParams = {
    companyName: "카카오",
    position: "백엔드 개발자",
    context: "3년간 Node.js 백엔드 개발 경험",
  }

  describe("필수 파라미터 포함 여부", () => {
    it("회사명이 결과에 포함되어야 한다", () => {
      const result = buildCoverLetterSystemPrompt(baseParams)

      expect(result).toContain("카카오")
    })

    it("포지션이 결과에 포함되어야 한다", () => {
      const result = buildCoverLetterSystemPrompt(baseParams)

      expect(result).toContain("백엔드 개발자")
    })

    it("context가 결과에 포함되어야 한다", () => {
      const result = buildCoverLetterSystemPrompt(baseParams)

      expect(result).toContain("3년간 Node.js 백엔드 개발 경험")
    })
  })

  describe("도구 안내", () => {
    it("도구 안내 문구가 포함되지 않아야 한다", () => {
      const result = buildCoverLetterSystemPrompt(baseParams)

      expect(result).not.toContain("도구")
    })
  })

  describe("jobPostingText 파라미터 제거 확인", () => {
    it("채용공고 섹션이 없어야 한다", () => {
      const result = buildCoverLetterSystemPrompt(baseParams)

      expect(result).not.toContain("[채용공고]")
    })
  })

  describe("참고자료 섹션", () => {
    it("참고자료 헤더가 항상 포함되어야 한다", () => {
      const result = buildCoverLetterSystemPrompt(baseParams)

      expect(result).toContain("[참고자료]")
    })

    it("context가 참고자료 섹션 뒤에 위치해야 한다", () => {
      const result = buildCoverLetterSystemPrompt(baseParams)

      expect(result.indexOf("[참고자료]")).toBeLessThan(
        result.indexOf("3년간 Node.js 백엔드 개발 경험"),
      )
    })
  })

  describe("회사명·포지션 조합", () => {
    it("다른 회사명과 포지션으로 호출하면 해당 값이 결과에 반영되어야 한다", () => {
      const result = buildCoverLetterSystemPrompt({
        companyName: "네이버",
        position: "프론트엔드 개발자",
        context: "React 5년",
      })

      expect(result).toContain("네이버")
      expect(result).toContain("프론트엔드 개발자")
    })
  })
})
