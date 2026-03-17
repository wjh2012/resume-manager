import { describe, it, expect, vi } from "vitest"

// vi.mock은 정적으로 호이스팅되어 import보다 먼저 실행된다.
// unpdf와 mammoth는 동적 import로 로드되므로 두 모듈 모두 mock 처리한다.
vi.mock("unpdf", () => ({
  extractText: vi.fn(),
}))

// parseDocx는 `const mammoth = await import("mammoth")` 후 mammoth.extractRawText()를 호출한다.
// vi.mock은 named export 및 default 양쪽을 같은 fn으로 연결해 두어야 한다.
const mockExtractRawText = vi.fn()
vi.mock("mammoth", () => ({
  default: { extractRawText: mockExtractRawText },
  extractRawText: mockExtractRawText,
}))

import { parseFile } from "@/lib/files/parser"
import * as unpdf from "unpdf"

// ArrayBuffer를 문자열로부터 생성하는 헬퍼
function makeBuffer(text: string): ArrayBuffer {
  return new TextEncoder().encode(text).buffer
}

// ─────────────────────────────────────────────────────────────────────────────
// parseFile() — pdf / docx / txt 각 타입별 파싱 진입점
// ─────────────────────────────────────────────────────────────────────────────

describe("parseFile()", () => {
  // ─── PDF ───────────────────────────────────────────────────────────────────
  describe("type = 'pdf'", () => {
    it("extractText가 문자열(string)을 반환할 때 해당 텍스트를 반환해야 한다", async () => {
      // Arrange
      const expected = "이력서 내용입니다"
      vi.mocked(unpdf.extractText).mockResolvedValueOnce({
        text: expected,
        totalPages: 1,
      })

      // Act
      const result = await parseFile(makeBuffer(""), "pdf")

      // Assert
      expect(result).toBe(expected)
    })

    it("extractText가 문자열 배열(string[])을 반환할 때 줄바꿈으로 합쳐야 한다", async () => {
      // Arrange — Array.isArray 분기 검증
      vi.mocked(unpdf.extractText).mockResolvedValueOnce({
        text: ["첫 번째 페이지", "두 번째 페이지"],
        totalPages: 2,
      })

      // Act
      const result = await parseFile(makeBuffer(""), "pdf")

      // Assert
      expect(result).toBe("첫 번째 페이지\n두 번째 페이지")
    })

    it("앞뒤 공백이 제거(trim)되어야 한다", async () => {
      // Arrange
      vi.mocked(unpdf.extractText).mockResolvedValueOnce({
        text: "   공백 포함 텍스트   ",
        totalPages: 1,
      })

      // Act
      const result = await parseFile(makeBuffer(""), "pdf")

      // Assert
      expect(result).toBe("공백 포함 텍스트")
    })

    it("배열 원소는 그대로 join하고 전체 문자열에 trim을 적용해야 한다", async () => {
      // Arrange — join 결과: "  첫 줄  \n  두 번째 줄  " → trim 후 앞뒤 공백만 제거
      vi.mocked(unpdf.extractText).mockResolvedValueOnce({
        text: ["  첫 줄  ", "  두 번째 줄  "],
        totalPages: 2,
      })

      // Act
      const result = await parseFile(makeBuffer(""), "pdf")

      // Assert — trim()은 문자열 전체의 앞뒤 공백만 제거하므로 중간 공백은 보존된다
      expect(result).toBe("첫 줄  \n  두 번째 줄")
    })

    it("빈 문자열이 반환되면 빈 문자열을 그대로 반환해야 한다", async () => {
      // Arrange
      vi.mocked(unpdf.extractText).mockResolvedValueOnce({
        text: "",
        totalPages: 0,
      })

      // Act
      const result = await parseFile(makeBuffer(""), "pdf")

      // Assert
      expect(result).toBe("")
    })

    it("빈 배열이 반환되면 빈 문자열을 반환해야 한다", async () => {
      // Arrange
      vi.mocked(unpdf.extractText).mockResolvedValueOnce({
        text: [],
        totalPages: 0,
      })

      // Act
      const result = await parseFile(makeBuffer(""), "pdf")

      // Assert
      expect(result).toBe("")
    })
  })

  // ─── DOCX ──────────────────────────────────────────────────────────────────
  describe("type = 'docx'", () => {
    it("mammoth가 추출한 텍스트를 반환해야 한다", async () => {
      // Arrange
      const expected = "자기소개서 내용"
      mockExtractRawText.mockResolvedValueOnce({ value: expected })

      // Act
      const result = await parseFile(makeBuffer(""), "docx")

      // Assert
      expect(result).toBe(expected)
    })

    it("앞뒤 공백이 제거(trim)되어야 한다", async () => {
      // Arrange
      mockExtractRawText.mockResolvedValueOnce({ value: "  경력기술서   " })

      // Act
      const result = await parseFile(makeBuffer(""), "docx")

      // Assert
      expect(result).toBe("경력기술서")
    })

    it("빈 문자열이 반환되면 빈 문자열을 그대로 반환해야 한다", async () => {
      // Arrange
      mockExtractRawText.mockResolvedValueOnce({ value: "" })

      // Act
      const result = await parseFile(makeBuffer(""), "docx")

      // Assert
      expect(result).toBe("")
    })
  })

  // ─── TXT ───────────────────────────────────────────────────────────────────
  describe("type = 'txt'", () => {
    it("UTF-8 텍스트를 올바르게 디코딩해야 한다", async () => {
      // Arrange
      const text = "안녕하세요. 텍스트 파일입니다."
      const buffer = makeBuffer(text)

      // Act
      const result = await parseFile(buffer, "txt")

      // Assert
      expect(result).toBe(text)
    })

    it("앞뒤 공백이 제거(trim)되어야 한다", async () => {
      // Arrange
      const buffer = makeBuffer("   공백 있는 텍스트   ")

      // Act
      const result = await parseFile(buffer, "txt")

      // Assert
      expect(result).toBe("공백 있는 텍스트")
    })

    it("빈 버퍼를 입력하면 빈 문자열을 반환해야 한다", async () => {
      // Arrange
      const buffer = makeBuffer("")

      // Act
      const result = await parseFile(buffer, "txt")

      // Assert
      expect(result).toBe("")
    })

    it("줄바꿈 문자를 포함한 여러 줄 텍스트를 그대로 반환해야 한다", async () => {
      // Arrange
      const text = "첫 번째 줄\n두 번째 줄\n세 번째 줄"
      const buffer = makeBuffer(text)

      // Act
      const result = await parseFile(buffer, "txt")

      // Assert
      expect(result).toBe(text)
    })

    it("공백만 있는 버퍼는 빈 문자열을 반환해야 한다", async () => {
      // Arrange
      const buffer = makeBuffer("   \n\n   ")

      // Act
      const result = await parseFile(buffer, "txt")

      // Assert
      expect(result).toBe("")
    })
  })
})
