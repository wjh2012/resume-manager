import { describe, it, expect, vi, beforeEach } from "vitest"

// 외부 의존성 전체 mock
vi.mock("@/lib/prisma", () => ({
  prisma: {
    externalDocument: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
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

vi.mock("@/lib/documents/summary", () => ({
  generateDocumentSummary: vi.fn().mockResolvedValue({ summary: null }),
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
import { generateDocumentSummary } from "@/lib/documents/summary"
import {
  createExternalDocumentFromText,
  createExternalDocumentFromFile,
  getExternalDocument,
  listExternalDocuments,
  countExternalDocuments,
  updateExternalDocument,
  deleteExternalDocument,
  ExternalDocumentNotFoundError,
  ExternalDocumentForbiddenError,
  ExternalDocumentValidationError,
} from "@/lib/external-documents/service"

// mock 타입 단축 헬퍼
const mockPrisma = vi.mocked(prisma)
const mockParseFile = vi.mocked(parseFile)
const mockUploadFile = vi.mocked(uploadFile)
const mockDeleteFile = vi.mocked(deleteFile)
const mockResolveDocumentType = vi.mocked(resolveDocumentType)
const mockGenerateSummary = vi.mocked(generateDocumentSummary)

// ─────────────────────────────────────────────────────────────────────────────
// 테스트용 File 객체 생성 헬퍼
// ─────────────────────────────────────────────────────────────────────────────
function makeFile(options: {
  name?: string
  type?: string
  size?: number
  content?: string
}): File {
  const { name = "job-posting.pdf", type = "application/pdf", size, content = "dummy content" } = options
  const file = new File([content], name, { type })
  if (size !== undefined) {
    Object.defineProperty(file, "size", { value: size })
  }
  return file
}

// ─────────────────────────────────────────────────────────────────────────────
describe("createExternalDocumentFromText()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.externalDocument.create.mockResolvedValue({
      id: "ext-doc-1",
      title: "채용공고",
      sourceType: "text",
    } as never)
    mockGenerateSummary.mockResolvedValue({ summary: null })
  })

  it("텍스트 입력으로 외부 문서를 생성해야 한다", async () => {
    // Arrange
    const userId = "user-1"
    const data = { title: "채용공고", content: "프론트엔드 개발자 모집..." }

    // Act
    const result = await createExternalDocumentFromText(userId, data)

    // Assert
    expect(mockPrisma.externalDocument.create).toHaveBeenCalledWith({
      data: {
        userId,
        title: "채용공고",
        category: "",
        sourceType: "text",
        content: "프론트엔드 개발자 모집...",
      },
      select: { id: true, title: true, sourceType: true },
    })
    expect(result).toMatchObject({
      id: "ext-doc-1",
      title: "채용공고",
      sourceType: "text",
    })
  })

  it("category가 지정되면 포함하여 저장해야 한다", async () => {
    // Arrange
    const data = { title: "JD", category: "채용공고", content: "내용" }

    // Act
    await createExternalDocumentFromText("user-1", data)

    // Assert
    expect(mockPrisma.externalDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "채용공고" }),
      }),
    )
  })

  it("비동기 요약 생성을 호출해야 한다", async () => {
    // Arrange
    const data = { title: "채용공고", content: "내용" }

    // Act
    await createExternalDocumentFromText("user-1", data)

    // Assert — generateDocumentSummary가 호출되었는지 확인
    expect(mockGenerateSummary).toHaveBeenCalledWith("user-1", "내용")
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("createExternalDocumentFromFile()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResolveDocumentType.mockReturnValue("pdf")
    mockParseFile.mockResolvedValue("추출된 텍스트 내용")
    mockUploadFile.mockResolvedValue("storage/user-1/job-posting.pdf")
    mockDeleteFile.mockResolvedValue(undefined as never)
    mockPrisma.externalDocument.create.mockResolvedValue({
      id: "ext-doc-2",
      title: "채용공고 PDF",
      sourceType: "file",
    } as never)
    mockGenerateSummary.mockResolvedValue({ summary: null })
  })

  it("파일 업로드로 외부 문서를 생성해야 한다", async () => {
    // Arrange
    const file = makeFile({ name: "job-posting.pdf", size: 1024 })

    // Act
    const result = await createExternalDocumentFromFile("user-1", file, "채용공고 PDF")

    // Assert
    expect(mockParseFile).toHaveBeenCalledOnce()
    expect(mockUploadFile).toHaveBeenCalledWith("user-1", file.name, expect.any(Blob))
    expect(mockPrisma.externalDocument.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        title: "채용공고 PDF",
        category: "",
        sourceType: "file",
        fileType: "pdf",
        originalUrl: "storage/user-1/job-posting.pdf",
        fileSize: 1024,
        content: "추출된 텍스트 내용",
      },
      select: { id: true, title: true, sourceType: true },
    })
    expect(result).toMatchObject({
      id: "ext-doc-2",
      title: "채용공고 PDF",
      sourceType: "file",
    })
  })

  it("파일 크기가 MAX_FILE_SIZE를 초과하면 에러를 던져야 한다", async () => {
    // Arrange
    const oversizedFile = makeFile({ size: MAX_FILE_SIZE + 1 })

    // Act & Assert
    await expect(
      createExternalDocumentFromFile("user-1", oversizedFile, "큰 파일"),
    ).rejects.toThrow("파일 크기가 10MB를 초과합니다.")
  })

  it("resolveDocumentType이 null을 반환하면 지원하지 않는 형식 에러를 던져야 한다", async () => {
    // Arrange
    mockResolveDocumentType.mockReturnValue(null)
    const file = makeFile({ name: "job.hwp", type: "application/x-hwp" })

    // Act & Assert
    await expect(
      createExternalDocumentFromFile("user-1", file, "HWP 파일"),
    ).rejects.toThrow("지원하지 않는 파일 형식입니다. (PDF, DOCX, TXT만 가능)")
  })

  it("텍스트 추출 실패 시 에러를 던지고 Storage 파일을 삭제해야 한다", async () => {
    // Arrange
    mockParseFile.mockResolvedValue("")
    const file = makeFile({})

    // Act & Assert
    await expect(
      createExternalDocumentFromFile("user-1", file, "빈 파일"),
    ).rejects.toThrow("파일에서 텍스트를 추출할 수 없습니다.")
    expect(mockDeleteFile).toHaveBeenCalledWith("storage/user-1/job-posting.pdf")
  })

  it("category가 지정되면 포함하여 저장해야 한다", async () => {
    // Arrange
    const file = makeFile({ size: 1024 })

    // Act
    await createExternalDocumentFromFile("user-1", file, "JD", "채용공고")

    // Assert
    expect(mockPrisma.externalDocument.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ category: "채용공고" }),
      }),
    )
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("getExternalDocument()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("문서가 존재하지 않으면 null을 반환해야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue(null)

    // Act
    const result = await getExternalDocument("ext-doc-999", "user-1")

    // Assert
    expect(result).toBeNull()
  })

  it("문서 소유자가 다른 userId이면 null을 반환해야 한다 (소유권 검증)", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      id: "ext-doc-1",
      userId: "owner-user",
      title: "채용공고",
      sourceType: "text",
    } as never)

    // Act
    const result = await getExternalDocument("ext-doc-1", "attacker-user")

    // Assert
    expect(result).toBeNull()
  })

  it("userId가 일치하면 문서를 반환해야 한다", async () => {
    // Arrange
    const mockDocument = {
      id: "ext-doc-1",
      userId: "user-1",
      title: "채용공고",
      category: "채용공고",
      sourceType: "text",
      fileType: null,
      originalUrl: null,
      fileSize: null,
      content: "프론트엔드 개발자 모집",
      summary: null,
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    }
    mockPrisma.externalDocument.findUnique.mockResolvedValue(mockDocument as never)

    // Act
    const result = await getExternalDocument("ext-doc-1", "user-1")

    // Assert
    expect(result).toEqual(mockDocument)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("listExternalDocuments()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("올바른 userId로 prisma.externalDocument.findMany를 호출해야 한다", async () => {
    // Arrange
    const mockDocuments = [
      { id: "ext-doc-1", title: "채용공고", category: "채용공고", sourceType: "text", fileType: null, fileSize: null, summary: null, createdAt: new Date() },
      { id: "ext-doc-2", title: "JD PDF", category: "", sourceType: "file", fileType: "pdf", fileSize: 2048, summary: "요약", createdAt: new Date() },
    ]
    mockPrisma.externalDocument.findMany.mockResolvedValue(mockDocuments as never)

    // Act
    const result = await listExternalDocuments("user-1")

    // Assert
    expect(mockPrisma.externalDocument.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        orderBy: { createdAt: "desc" },
      }),
    )
    expect(result).toEqual(mockDocuments)
  })

  it("문서가 없으면 빈 배열을 반환해야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.findMany.mockResolvedValue([] as never)

    // Act
    const result = await listExternalDocuments("user-no-docs")

    // Assert
    expect(result).toEqual([])
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("countExternalDocuments()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("사용자의 외부 문서 수를 반환해야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.count.mockResolvedValue(5 as never)

    // Act
    const result = await countExternalDocuments("user-1")

    // Assert
    expect(mockPrisma.externalDocument.count).toHaveBeenCalledWith({
      where: { userId: "user-1" },
    })
    expect(result).toBe(5)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("updateExternalDocument()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.externalDocument.update.mockResolvedValue({
      id: "ext-doc-1",
      title: "수정된 제목",
      category: "채용공고",
      sourceType: "text",
    } as never)
  })

  it("텍스트 문서의 제목과 내용을 수정할 수 있어야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      id: "ext-doc-1",
      userId: "user-1",
      sourceType: "text",
    } as never)

    // Act
    const result = await updateExternalDocument("ext-doc-1", "user-1", {
      title: "수정된 제목",
      content: "수정된 내용",
    })

    // Assert
    expect(mockPrisma.externalDocument.update).toHaveBeenCalledWith({
      where: { id: "ext-doc-1" },
      data: { title: "수정된 제목", content: "수정된 내용" },
      select: { id: true, title: true, category: true, sourceType: true },
    })
    expect(result).toMatchObject({ id: "ext-doc-1", title: "수정된 제목" })
  })

  it("파일 문서에서 content 수정 시도 시 ExternalDocumentValidationError를 던져야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      id: "ext-doc-2",
      userId: "user-1",
      sourceType: "file",
    } as never)

    // Act & Assert
    await expect(
      updateExternalDocument("ext-doc-2", "user-1", { content: "수정 시도" }),
    ).rejects.toThrow(ExternalDocumentValidationError)
    await expect(
      updateExternalDocument("ext-doc-2", "user-1", { content: "수정 시도" }),
    ).rejects.toThrow("파일 문서의 내용은 수정할 수 없습니다.")
  })

  it("문서가 존재하지 않으면 ExternalDocumentNotFoundError를 던져야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue(null)

    // Act & Assert
    await expect(
      updateExternalDocument("ext-doc-999", "user-1", { title: "수정" }),
    ).rejects.toThrow(ExternalDocumentNotFoundError)
  })

  it("소유자가 다르면 ExternalDocumentForbiddenError를 던져야 한다", async () => {
    // Arrange
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      id: "ext-doc-1",
      userId: "owner-user",
      sourceType: "text",
    } as never)

    // Act & Assert
    await expect(
      updateExternalDocument("ext-doc-1", "other-user", { title: "수정" }),
    ).rejects.toThrow(ExternalDocumentForbiddenError)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("deleteExternalDocument()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteFile.mockResolvedValue(undefined as never)
    mockPrisma.externalDocument.deleteMany.mockResolvedValue({ count: 1 } as never)
  })

  it("deleteMany가 count: 0을 반환하면 ExternalDocumentNotFoundError를 던져야 한다", async () => {
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      originalUrl: "storage/user-1/doc.pdf",
    } as never)
    mockPrisma.externalDocument.deleteMany.mockResolvedValue({ count: 0 } as never)

    await expect(deleteExternalDocument("ext-doc-999", "user-1")).rejects.toThrow(
      ExternalDocumentNotFoundError,
    )
    await expect(deleteExternalDocument("ext-doc-999", "user-1")).rejects.toThrow(
      "외부 문서를 찾을 수 없습니다.",
    )
  })

  it("userId가 문서 소유자와 달라도 ExternalDocumentNotFoundError를 던져야 한다 (403/404 통합)", async () => {
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      originalUrl: "storage/owner-user/doc.pdf",
    } as never)
    mockPrisma.externalDocument.deleteMany.mockResolvedValue({ count: 0 } as never)

    await expect(deleteExternalDocument("ext-doc-1", "other-user")).rejects.toThrow(
      ExternalDocumentNotFoundError,
    )
    expect(mockDeleteFile).not.toHaveBeenCalled()
  })

  it("DB 삭제 후 Storage 파일을 삭제해야 한다", async () => {
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      originalUrl: "storage/user-1/job-posting.pdf",
    } as never)
    mockPrisma.externalDocument.deleteMany.mockResolvedValue({ count: 1 } as never)

    await deleteExternalDocument("ext-doc-1", "user-1")

    expect(mockPrisma.externalDocument.deleteMany).toHaveBeenCalledWith({
      where: { id: "ext-doc-1", userId: "user-1" },
    })
    expect(mockDeleteFile).toHaveBeenCalledWith("storage/user-1/job-posting.pdf")
  })

  it("originalUrl이 없으면 Storage 삭제를 건너뛰어야 한다", async () => {
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      originalUrl: null,
    } as never)
    mockPrisma.externalDocument.deleteMany.mockResolvedValue({ count: 1 } as never)

    await deleteExternalDocument("ext-doc-1", "user-1")

    expect(mockDeleteFile).not.toHaveBeenCalled()
    expect(mockPrisma.externalDocument.deleteMany).toHaveBeenCalledWith({
      where: { id: "ext-doc-1", userId: "user-1" },
    })
  })

  it("deleteFile이 실패해도 에러를 던지지 않아야 한다", async () => {
    mockPrisma.externalDocument.findUnique.mockResolvedValue({
      originalUrl: "storage/user-1/job-posting.pdf",
    } as never)
    mockPrisma.externalDocument.deleteMany.mockResolvedValue({ count: 1 } as never)
    mockDeleteFile.mockRejectedValue(new Error("Storage 오류"))

    await expect(deleteExternalDocument("ext-doc-1", "user-1")).resolves.toBeUndefined()
  })
})
