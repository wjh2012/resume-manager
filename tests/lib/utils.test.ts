import { describe, it, expect } from "vitest"
import { formatFileSize } from "@/lib/utils"

describe("formatFileSize()", () => {
  // 바이트 단위 (1024 미만)
  describe("1024 바이트 미만 — 'B' 단위로 표시", () => {
    it("0 바이트 → '0 B'를 반환해야 한다", () => {
      expect(formatFileSize(0)).toBe("0 B")
    })

    it("1 바이트 → '1 B'를 반환해야 한다", () => {
      expect(formatFileSize(1)).toBe("1 B")
    })

    it("1023 바이트 → '1023 B'를 반환해야 한다", () => {
      expect(formatFileSize(1023)).toBe("1023 B")
    })
  })

  // 킬로바이트 단위 (1024 이상, 1MB 미만)
  describe("1024 바이트 이상 1MB 미만 — 'KB' 단위로 소수점 1자리 표시", () => {
    it("정확히 1024 바이트 → '1.0 KB'를 반환해야 한다", () => {
      expect(formatFileSize(1024)).toBe("1.0 KB")
    })

    it("1536 바이트(1.5KB) → '1.5 KB'를 반환해야 한다", () => {
      expect(formatFileSize(1536)).toBe("1.5 KB")
    })

    it("1MB - 1바이트(1048575) → 소수점 1자리 KB 값을 반환해야 한다", () => {
      // 1048575 / 1024 = 1023.9990234375 → '1024.0 KB'
      expect(formatFileSize(1048575)).toBe("1024.0 KB")
    })

    it("10240 바이트(10KB) → '10.0 KB'를 반환해야 한다", () => {
      expect(formatFileSize(10240)).toBe("10.0 KB")
    })
  })

  // 메가바이트 단위 (1MB 이상)
  describe("1MB(1048576 바이트) 이상 — 'MB' 단위로 소수점 1자리 표시", () => {
    it("정확히 1MB(1048576 바이트) → '1.0 MB'를 반환해야 한다", () => {
      expect(formatFileSize(1024 * 1024)).toBe("1.0 MB")
    })

    it("5MB → '5.0 MB'를 반환해야 한다", () => {
      expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0 MB")
    })

    it("10MB(MAX_FILE_SIZE) → '10.0 MB'를 반환해야 한다", () => {
      // 파일 업로드 최대 크기 상수와 동일한 값
      expect(formatFileSize(10 * 1024 * 1024)).toBe("10.0 MB")
    })

    it("1.5MB → '1.5 MB'를 반환해야 한다", () => {
      expect(formatFileSize(1.5 * 1024 * 1024)).toBe("1.5 MB")
    })
  })
})
