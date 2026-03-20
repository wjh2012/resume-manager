import { describe, it, expect } from "vitest"
import {
  resolveDocumentType,
  verifyMagicBytes,
  MAX_FILE_SIZE,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPES,
} from "@/lib/validations/document"

// File 헬퍼: 브라우저 File 객체를 최소한으로 모사
function makeFile(name: string, type: string, size = 0): File {
  return new File([""], name, { type })
}

describe("MAX_FILE_SIZE", () => {
  it("10MB(10 * 1024 * 1024 바이트)로 정의되어 있어야 한다", () => {
    expect(MAX_FILE_SIZE).toBe(10 * 1024 * 1024)
  })
})

describe("DOCUMENT_TYPE_LABELS", () => {
  it("지원 타입 세 가지(pdf, docx, txt) 레이블을 모두 포함해야 한다", () => {
    expect(DOCUMENT_TYPE_LABELS.pdf).toBe("PDF")
    expect(DOCUMENT_TYPE_LABELS.docx).toBe("DOCX")
    expect(DOCUMENT_TYPE_LABELS.txt).toBe("TXT")
  })

  it("DOCUMENT_TYPES 배열의 모든 항목에 대응하는 레이블이 존재해야 한다", () => {
    for (const type of DOCUMENT_TYPES) {
      expect(DOCUMENT_TYPE_LABELS[type]).toBeDefined()
    }
  })
})

describe("resolveDocumentType()", () => {
  // 정상 케이스: MIME + 확장자 일치
  describe("MIME과 확장자가 모두 일치하는 경우", () => {
    it("PDF MIME + .pdf 확장자 → 'pdf'를 반환해야 한다", () => {
      const file = makeFile("resume.pdf", "application/pdf")
      expect(resolveDocumentType(file)).toBe("pdf")
    })

    it("DOCX MIME + .docx 확장자 → 'docx'를 반환해야 한다", () => {
      const file = makeFile(
        "resume.docx",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      )
      expect(resolveDocumentType(file)).toBe("docx")
    })

    it("TXT MIME + .txt 확장자 → 'txt'를 반환해야 한다", () => {
      const file = makeFile("resume.txt", "text/plain")
      expect(resolveDocumentType(file)).toBe("txt")
    })
  })

  // MIME 없음: 확장자로 판별
  describe("MIME이 빈 문자열인 경우 확장자로 판별해야 한다", () => {
    it(".pdf 확장자만 있는 경우 → 'pdf'를 반환해야 한다", () => {
      const file = makeFile("resume.pdf", "")
      expect(resolveDocumentType(file)).toBe("pdf")
    })

    it(".docx 확장자만 있는 경우 → 'docx'를 반환해야 한다", () => {
      const file = makeFile("resume.docx", "")
      expect(resolveDocumentType(file)).toBe("docx")
    })

    it(".txt 확장자만 있는 경우 → 'txt'를 반환해야 한다", () => {
      const file = makeFile("resume.txt", "")
      expect(resolveDocumentType(file)).toBe("txt")
    })
  })

  // MIME 불일치: 거부 (위조 방지)
  describe("MIME과 확장자가 서로 다른 경우 null을 반환한다", () => {
    it("PDF MIME + .txt 확장자 → null을 반환해야 한다", () => {
      const file = makeFile("resume.txt", "application/pdf")
      expect(resolveDocumentType(file)).toBeNull()
    })

    it("TXT MIME + .pdf 확장자 → null을 반환해야 한다", () => {
      const file = makeFile("resume.pdf", "text/plain")
      expect(resolveDocumentType(file)).toBeNull()
    })
  })

  // 지원하지 않는 타입
  describe("지원하지 않는 파일 타입인 경우", () => {
    it("알 수 없는 MIME + 알 수 없는 확장자 → null을 반환해야 한다", () => {
      const file = makeFile("resume.xyz", "application/octet-stream")
      expect(resolveDocumentType(file)).toBeNull()
    })

    it("MIME도 없고 확장자도 지원하지 않으면 → null을 반환해야 한다", () => {
      const file = makeFile("resume.xyz", "")
      expect(resolveDocumentType(file)).toBeNull()
    })

    it("image/png MIME → null을 반환해야 한다", () => {
      const file = makeFile("photo.png", "image/png")
      expect(resolveDocumentType(file)).toBeNull()
    })

    it("확장자가 없는 파일 + 알 수 없는 MIME → null을 반환해야 한다", () => {
      const file = makeFile("README", "application/octet-stream")
      expect(resolveDocumentType(file)).toBeNull()
    })
  })

  // 대소문자 처리
  describe("확장자 대소문자 처리", () => {
    it(".PDF 대문자 확장자(MIME 없음) → 'pdf'를 반환해야 한다", () => {
      const file = makeFile("RESUME.PDF", "")
      expect(resolveDocumentType(file)).toBe("pdf")
    })

    it(".TXT 대문자 확장자(MIME 없음) → 'txt'를 반환해야 한다", () => {
      const file = makeFile("RESUME.TXT", "")
      expect(resolveDocumentType(file)).toBe("txt")
    })
  })

  // 파일명에 점이 여러 개인 경우
  describe("파일명에 점이 여러 개 포함된 경우", () => {
    it("my.resume.2024.pdf → 마지막 확장자 '.pdf'를 기준으로 'pdf'를 반환해야 한다", () => {
      const file = makeFile("my.resume.2024.pdf", "application/pdf")
      expect(resolveDocumentType(file)).toBe("pdf")
    })
  })
})

// ArrayBuffer 생성 헬퍼: 바이트 배열로부터 ArrayBuffer를 만든다
function makeBuffer(bytes: number[]): ArrayBuffer {
  return new Uint8Array(bytes).buffer
}

describe("verifyMagicBytes()", () => {
  // TXT 타입: 버퍼 내용과 무관하게 항상 true
  it("TXT 타입은 버퍼 내용에 상관없이 true를 반환해야 한다", () => {
    const buffer = makeBuffer([0x00, 0x00, 0x00, 0x00])
    expect(verifyMagicBytes(buffer, "txt")).toBe(true)
  })

  it("TXT 타입은 빈 버퍼여도 true를 반환해야 한다", () => {
    const buffer = makeBuffer([])
    expect(verifyMagicBytes(buffer, "txt")).toBe(true)
  })

  // PDF: 올바른 매직 바이트 (%PDF = 0x25,0x50,0x44,0x46)
  it("PDF 매직 바이트(%PDF)가 일치하면 true를 반환해야 한다", () => {
    const buffer = makeBuffer([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31])
    expect(verifyMagicBytes(buffer, "pdf")).toBe(true)
  })

  // PDF: 틀린 매직 바이트
  it("PDF 매직 바이트가 일치하지 않으면 false를 반환해야 한다", () => {
    const buffer = makeBuffer([0x50, 0x4b, 0x03, 0x04])
    expect(verifyMagicBytes(buffer, "pdf")).toBe(false)
  })

  // DOCX: 올바른 매직 바이트 (PK = 0x50,0x4b,0x03,0x04)
  it("DOCX 매직 바이트(PK)가 일치하면 true를 반환해야 한다", () => {
    const buffer = makeBuffer([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00])
    expect(verifyMagicBytes(buffer, "docx")).toBe(true)
  })

  // DOCX: 틀린 매직 바이트
  it("DOCX 매직 바이트가 일치하지 않으면 false를 반환해야 한다", () => {
    const buffer = makeBuffer([0x25, 0x50, 0x44, 0x46])
    expect(verifyMagicBytes(buffer, "docx")).toBe(false)
  })

  // 4바이트 미만 버퍼: PDF/DOCX 모두 false
  it("버퍼가 4바이트 미만이면 false를 반환해야 한다", () => {
    const buffer = makeBuffer([0x25, 0x50, 0x44]) // 3바이트
    expect(verifyMagicBytes(buffer, "pdf")).toBe(false)
  })

  // 빈 버퍼: false
  it("빈 버퍼(0바이트)이면 false를 반환해야 한다", () => {
    const buffer = makeBuffer([])
    expect(verifyMagicBytes(buffer, "pdf")).toBe(false)
  })
})
