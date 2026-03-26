import { describe, it, expect, vi, beforeEach } from "vitest"

// 외부 의존성 전체 mock
vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}))

vi.mock("@/lib/files/parser", () => ({
  parseFile: vi.fn(),
}))

vi.mock("@/lib/storage", () => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}))

// MAX_FILE_SIZE 상수는 실제 값을 유지하고, resolveDocumentType만 mock으로 교체
vi.mock("@/lib/validations/document", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/validations/document")>()
  return {
    ...actual,
    resolveDocumentType: vi.fn(),
    verifyMagicBytes: vi.fn().mockReturnValue(true),
  }
})

import { prisma } from "@/lib/prisma"
import { parseFile } from "@/lib/files/parser"
import { uploadFile, deleteFile } from "@/lib/storage"
import { resolveDocumentType, MAX_FILE_SIZE } from "@/lib/validations/document"
import {
  uploadDocument,
  deleteDocument,
  listDocuments,
  getDocument,
  DocumentNotFoundError,
} from "@/lib/documents/service"

// mock 타입 단축 헬퍼
const mockPrisma = vi.mocked(prisma)
const mockParseFile = vi.mocked(parseFile)
const mockUploadFile = vi.mocked(uploadFile)
const mockDeleteFile = vi.mocked(deleteFile)
const mockResolveDocumentType = vi.mocked(resolveDocumentType)

// ─────────────────────────────────────────────────────────────────────────────
// 테스트용 File 객체 생성 헬퍼
// ─────────────────────────────────────────────────────────────────────────────
function makeFile(options: {
  name?: string
  type?: string
  size?: number
  content?: string
}): File {
  const { name = "resume.pdf", type = "application/pdf", size, content = "dummy content" } = options
  const file = new File([content], name, { type })
  // size를 직접 지정해야 할 때 Object.defineProperty로 재정의
  if (size !== undefined) {
    Object.defineProperty(file, "size", { value: size })
  }
  return file
}

describe("uploadDocument()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // 기본 성공 경로 설정 — 각 테스트에서 필요에 따라 재정의
    mockResolveDocumentType.mockReturnValue("pdf")
    mockParseFile.mockResolvedValue("추출된 텍스트 내용")
    mockUploadFile.mockResolvedValue("storage/user-id/resume.pdf")
    mockDeleteFile.mockResolvedValue(undefined as never)
    mockPrisma.document.create.mockResolvedValue({ id: "doc-123" } as never)
  })

  // ── 파일 크기 검증 ──────────────────────────────────────────────────────────
  describe("파일 크기 검증", () => {
    it("파일 크기가 MAX_FILE_SIZE를 초과하면 에러를 던져야 한다", async () => {
      // Arrange
      const oversizedFile = makeFile({ size: MAX_FILE_SIZE + 1 })

      // Act & Assert
      await expect(
        uploadDocument("user-1", oversizedFile, "내 이력서"),
      ).rejects.toThrow("파일 크기가 10MB를 초과합니다.")
    })

    it("파일 크기가 MAX_FILE_SIZE와 정확히 같으면 에러를 던지지 않아야 한다", async () => {
      // Arrange
      const exactSizeFile = makeFile({ size: MAX_FILE_SIZE })

      // Act & Assert — 크기 검증은 통과하고 이후 로직이 실행되어야 한다
      await expect(
        uploadDocument("user-1", exactSizeFile, "내 이력서"),
      ).resolves.toBeDefined()
    })
  })

  // ── 파일 타입 검증 ──────────────────────────────────────────────────────────
  describe("파일 타입 검증", () => {
    it("resolveDocumentType이 null을 반환하면 지원하지 않는 형식 에러를 던져야 한다", async () => {
      // Arrange
      mockResolveDocumentType.mockReturnValue(null)
      const file = makeFile({ name: "resume.hwp", type: "application/x-hwp" })

      // Act & Assert
      await expect(
        uploadDocument("user-1", file, "내 이력서"),
      ).rejects.toThrow("지원하지 않는 파일 형식입니다. (PDF, DOCX, TXT만 가능)")
    })
  })

  // ── 텍스트 추출 실패 ────────────────────────────────────────────────────────
  describe("텍스트 추출 실패 처리", () => {
    it("extractedText가 빈 문자열이면 에러를 던지고 Storage에서 파일을 삭제해야 한다", async () => {
      // Arrange
      mockParseFile.mockResolvedValue("")
      mockUploadFile.mockResolvedValue("storage/user-1/resume.pdf")
      const file = makeFile({})

      // Act & Assert
      await expect(
        uploadDocument("user-1", file, "내 이력서"),
      ).rejects.toThrow("파일에서 텍스트를 추출할 수 없습니다.")

      // Storage 정리가 호출되었는지 확인
      expect(mockDeleteFile).toHaveBeenCalledWith("storage/user-1/resume.pdf")
    })

    it("extractedText가 null이면 에러를 던지고 Storage 파일을 삭제해야 한다", async () => {
      // Arrange
      mockParseFile.mockResolvedValue(null as unknown as string)
      mockUploadFile.mockResolvedValue("storage/user-1/resume.pdf")
      const file = makeFile({})

      // Act & Assert
      await expect(
        uploadDocument("user-1", file, "내 이력서"),
      ).rejects.toThrow("파일에서 텍스트를 추출할 수 없습니다.")

      expect(mockDeleteFile).toHaveBeenCalledWith("storage/user-1/resume.pdf")
    })

    it("deleteFile이 실패해도 원래 에러를 다시 던져야 한다 (catch 무시)", async () => {
      // Arrange
      mockParseFile.mockResolvedValue("")
      mockUploadFile.mockResolvedValue("storage/user-1/resume.pdf")
      mockDeleteFile.mockRejectedValue(new Error("Storage 연결 실패"))
      const file = makeFile({})

      // Act & Assert — deleteFile 실패가 최종 에러를 바꾸면 안 된다
      await expect(
        uploadDocument("user-1", file, "내 이력서"),
      ).rejects.toThrow("파일에서 텍스트를 추출할 수 없습니다.")
    })
  })

  // ── 성공 경로 ───────────────────────────────────────────────────────────────
  describe("성공 경로", () => {
    it("parseFile, uploadFile, prisma.document.create를 모두 호출해야 한다", async () => {
      // Arrange
      const userId = "user-1"
      const file = makeFile({ name: "resume.pdf", size: 1024 })
      const title = "내 이력서"

      // Act
      const result = await uploadDocument(userId, file, title)

      // Assert — 각 의존성이 올바른 인자로 호출되었는지 검증
      expect(mockParseFile).toHaveBeenCalledOnce()
      expect(mockUploadFile).toHaveBeenCalledWith(userId, file.name, expect.any(Blob))
      expect(mockPrisma.document.create).toHaveBeenCalledOnce()

      // 반환값 구조 검증
      expect(result).toMatchObject({
        id: "doc-123",
        title,
        type: "pdf",
      })
    })

    it("UploadResult에 올바른 fileSize가 포함되어야 한다", async () => {
      // Arrange
      const fileContent = "a".repeat(500)
      const file = makeFile({ content: fileContent })

      // Act
      const result = await uploadDocument("user-1", file, "테스트 문서")

      // Assert
      expect(result.fileSize).toBe(file.size)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("deleteDocument()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteFile.mockResolvedValue(undefined as never)
    mockPrisma.document.deleteMany.mockResolvedValue({ count: 1 } as never)
  })

  describe("소유권 검증 (403/404 통합)", () => {
    it("문서가 존재하지 않으면 DocumentNotFoundError를 던져야 한다 (findUnique null)", async () => {
      mockPrisma.document.findUnique.mockResolvedValue(null)
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 0 } as never)

      await expect(deleteDocument("doc-999", "user-1")).rejects.toThrow(
        DocumentNotFoundError,
      )
      expect(mockDeleteFile).not.toHaveBeenCalled()
    })

    it("userId가 문서 소유자와 달라도 DocumentNotFoundError를 던져야 한다 (403/404 통합)", async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        originalUrl: "storage/owner-user/doc.pdf",
      } as never)
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 0 } as never)

      await expect(deleteDocument("doc-1", "other-user")).rejects.toThrow(
        DocumentNotFoundError,
      )
      expect(mockDeleteFile).not.toHaveBeenCalled()
    })
  })

  describe("성공 경로", () => {
    it("DB 삭제 후 Storage 파일을 삭제해야 한다", async () => {
      const storagePath = "storage/user-1/resume.pdf"
      mockPrisma.document.findUnique.mockResolvedValue({
        originalUrl: storagePath,
      } as never)
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 1 } as never)

      await deleteDocument("doc-1", "user-1")

      expect(mockPrisma.document.deleteMany).toHaveBeenCalledWith({
        where: { id: "doc-1", userId: "user-1" },
      })
      expect(mockDeleteFile).toHaveBeenCalledWith(storagePath)
    })

    it("deleteFile이 실패해도 에러를 던지지 않아야 한다 (catch 무시)", async () => {
      mockPrisma.document.findUnique.mockResolvedValue({
        originalUrl: "storage/user-1/resume.pdf",
      } as never)
      mockPrisma.document.deleteMany.mockResolvedValue({ count: 1 } as never)
      mockDeleteFile.mockRejectedValue(new Error("Storage 오류"))

      await expect(deleteDocument("doc-1", "user-1")).resolves.toBeUndefined()
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("getDocument()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("문서가 존재하지 않으면 null을 반환해야 한다", async () => {
    // Arrange
    mockPrisma.document.findUnique.mockResolvedValue(null)

    // Act
    const result = await getDocument("doc-999", "user-1")

    // Assert
    expect(result).toBeNull()
  })

  it("문서 소유자가 다른 userId이면 null을 반환해야 한다 (소유권 검증)", async () => {
    // Arrange
    mockPrisma.document.findUnique.mockResolvedValue({
      id: "doc-1",
      userId: "owner-user",
      title: "내 이력서",
      type: "pdf",
    } as never)

    // Act
    const result = await getDocument("doc-1", "attacker-user")

    // Assert
    expect(result).toBeNull()
  })

  it("userId가 일치하면 문서를 반환해야 한다", async () => {
    // Arrange
    const mockDocument = {
      id: "doc-1",
      userId: "user-1",
      title: "내 이력서",
      type: "pdf",
      originalUrl: "storage/user-1/resume.pdf",
      extractedText: "이력서 내용",
      fileSize: 1024,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
      summary: null,
    }
    mockPrisma.document.findUnique.mockResolvedValue(mockDocument as never)

    // Act
    const result = await getDocument("doc-1", "user-1")

    // Assert
    expect(result).toEqual(mockDocument)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("listDocuments()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("올바른 userId로 prisma.document.findMany를 호출해야 한다", async () => {
    // Arrange
    const userId = "user-1"
    const mockDocuments = [
      { id: "doc-1", title: "이력서", type: "pdf", fileSize: 1024, createdAt: new Date(), summary: null },
      { id: "doc-2", title: "자기소개서", type: "docx", fileSize: 2048, createdAt: new Date(), summary: "요약 내용" },
    ]
    mockPrisma.document.findMany.mockResolvedValue(mockDocuments as never)

    // Act
    const result = await listDocuments(userId)

    // Assert
    expect(mockPrisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId },
      }),
    )
    expect(result).toEqual(mockDocuments)
  })

  it("문서가 없으면 빈 배열을 반환해야 한다", async () => {
    // Arrange
    mockPrisma.document.findMany.mockResolvedValue([] as never)

    // Act
    const result = await listDocuments("user-no-docs")

    // Assert
    expect(result).toEqual([])
  })
})
