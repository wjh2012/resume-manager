// @ts-nocheck — vi.mock으로 생성된 mock 객체의 타입이 원본과 불일치하는 문제 (런타임 정상)
import { describe, it, expect, vi, beforeEach } from "vitest"

// embedding.ts가 모듈 최상위에서 openai.embedding()을 즉시 호출하므로
// import 전에 반드시 mock 처리해야 한다 (vi.mock은 정적으로 호이스팅됨)
vi.mock("@ai-sdk/openai", () => ({
  openai: {
    embedding: vi.fn().mockReturnValue({ modelId: "text-embedding-3-small" }),
  },
}))

vi.mock("ai", () => ({
  embedMany: vi.fn().mockResolvedValue({ embeddings: [] }),
}))

// 외부 의존성 전체 mock
vi.mock("@/lib/prisma", () => ({
  prisma: {
    document: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    documentChunk: {
      findMany: vi.fn(),
      createMany: vi.fn(),
    },
    $transaction: vi.fn(),
    $executeRaw: vi.fn(),
  },
}))

vi.mock("@/lib/files/parser", () => ({
  parseFile: vi.fn(),
}))

vi.mock("@/lib/storage", () => ({
  uploadFile: vi.fn(),
  deleteFile: vi.fn(),
}))

vi.mock("@/lib/ai/embedding", () => ({
  splitIntoChunks: vi.fn(),
  generateEmbeddings: vi.fn(),
}))

// MAX_FILE_SIZE 상수는 실제 값을 유지하고, resolveDocumentType만 mock으로 교체
vi.mock("@/lib/validations/document", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/validations/document")>()
  return {
    ...actual,
    resolveDocumentType: vi.fn(),
  }
})

import { prisma } from "@/lib/prisma"
import { parseFile } from "@/lib/files/parser"
import { uploadFile, deleteFile } from "@/lib/storage"
import { splitIntoChunks, generateEmbeddings } from "@/lib/ai/embedding"
import { resolveDocumentType, MAX_FILE_SIZE } from "@/lib/validations/document"
import {
  uploadDocument,
  deleteDocument,
  listDocuments,
  getDocument,
  DocumentNotFoundError,
  DocumentForbiddenError,
} from "@/lib/documents/service"

// mock 타입 단축 헬퍼
const mockPrisma = vi.mocked(prisma)
const mockParseFile = vi.mocked(parseFile)
const mockUploadFile = vi.mocked(uploadFile)
const mockDeleteFile = vi.mocked(deleteFile)
const mockSplitIntoChunks = vi.mocked(splitIntoChunks)
const mockGenerateEmbeddings = vi.mocked(generateEmbeddings)
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
    mockSplitIntoChunks.mockReturnValue(["청크1", "청크2"])
    mockGenerateEmbeddings.mockResolvedValue([[0.1, 0.2], [0.3, 0.4]])
    mockDeleteFile.mockResolvedValue(undefined as never)
    mockPrisma.$transaction.mockImplementation(async (fn) => {
      if (typeof fn === "function") {
        // 트랜잭션 콜백 실행 — tx는 prisma와 동일한 mock 구조 사용
        const tx = {
          document: {
            create: vi.fn().mockResolvedValue({ id: "doc-123" }),
          },
          documentChunk: {
            createMany: vi.fn().mockResolvedValue({}),
          },
        }
        return fn(tx)
      }
      // 배열 형태의 트랜잭션 (임베딩 업데이트)
      return Promise.all(fn as Promise<unknown>[])
    })
    mockPrisma.documentChunk.findMany.mockResolvedValue([
      { id: "chunk-1" },
      { id: "chunk-2" },
    ] as never)
    mockPrisma.$executeRaw.mockResolvedValue(1 as never)
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
    it("parseFile, uploadFile, splitIntoChunks, prisma.$transaction을 모두 호출해야 한다", async () => {
      // Arrange
      const userId = "user-1"
      const file = makeFile({ name: "resume.pdf", size: 1024 })
      const title = "내 이력서"

      // Act
      const result = await uploadDocument(userId, file, title)

      // Assert — 각 의존성이 올바른 인자로 호출되었는지 검증
      expect(mockParseFile).toHaveBeenCalledOnce()
      expect(mockUploadFile).toHaveBeenCalledWith(userId, file.name, expect.any(Blob))
      expect(mockSplitIntoChunks).toHaveBeenCalledWith("추출된 텍스트 내용")
      expect(mockPrisma.$transaction).toHaveBeenCalled()

      // 반환값 구조 검증
      expect(result).toMatchObject({
        id: "doc-123",
        title,
        type: "pdf",
        chunkCount: 2,
      })
    })

    it("청크가 없으면 generateEmbeddings를 호출하지 않아야 한다", async () => {
      // Arrange
      mockSplitIntoChunks.mockReturnValue([])
      const file = makeFile({})

      // Act
      await uploadDocument("user-1", file, "빈 문서")

      // Assert
      expect(mockGenerateEmbeddings).not.toHaveBeenCalled()
    })

    it("UploadResult에 올바른 fileSize와 chunkCount가 포함되어야 한다", async () => {
      // Arrange
      const fileContent = "a".repeat(500)
      const file = makeFile({ content: fileContent })
      mockSplitIntoChunks.mockReturnValue(["청크A", "청크B", "청크C"])

      // Act
      const result = await uploadDocument("user-1", file, "테스트 문서")

      // Assert
      expect(result.fileSize).toBe(file.size)
      expect(result.chunkCount).toBe(3)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
describe("deleteDocument()", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDeleteFile.mockResolvedValue(undefined as never)
    mockPrisma.document.delete.mockResolvedValue({} as never)
  })

  // ── 소유권 검증 ─────────────────────────────────────────────────────────────
  describe("소유권 검증", () => {
    it("문서가 존재하지 않으면 DocumentNotFoundError를 던져야 한다", async () => {
      // Arrange
      mockPrisma.document.findUnique.mockResolvedValue(null)

      // Act & Assert
      await expect(deleteDocument("doc-999", "user-1")).rejects.toThrow(
        DocumentNotFoundError,
      )
      await expect(deleteDocument("doc-999", "user-1")).rejects.toThrow(
        "문서를 찾을 수 없습니다.",
      )
    })

    it("userId가 문서 소유자와 다르면 DocumentForbiddenError를 던져야 한다", async () => {
      // Arrange
      mockPrisma.document.findUnique.mockResolvedValue({
        userId: "owner-user",
        originalUrl: "storage/owner-user/doc.pdf",
      } as never)

      // Act & Assert
      await expect(deleteDocument("doc-1", "other-user")).rejects.toThrow(
        DocumentForbiddenError,
      )
      await expect(deleteDocument("doc-1", "other-user")).rejects.toThrow(
        "이 문서에 대한 권한이 없습니다.",
      )
    })
  })

  // ── 성공 경로 ───────────────────────────────────────────────────────────────
  describe("성공 경로", () => {
    it("Storage 파일과 DB 레코드를 모두 삭제해야 한다", async () => {
      // Arrange
      const storagePath = "storage/user-1/resume.pdf"
      mockPrisma.document.findUnique.mockResolvedValue({
        userId: "user-1",
        originalUrl: storagePath,
      } as never)

      // Act
      await deleteDocument("doc-1", "user-1")

      // Assert
      expect(mockDeleteFile).toHaveBeenCalledWith(storagePath)
      expect(mockPrisma.document.delete).toHaveBeenCalledWith({
        where: { id: "doc-1" },
      })
    })

    it("deleteFile이 실패해도 DB 삭제는 계속 진행해야 한다", async () => {
      // Arrange
      mockPrisma.document.findUnique.mockResolvedValue({
        userId: "user-1",
        originalUrl: "storage/user-1/resume.pdf",
      } as never)
      mockDeleteFile.mockRejectedValue(new Error("Storage 오류"))

      // Act — 에러 없이 완료되어야 한다
      await expect(deleteDocument("doc-1", "user-1")).resolves.toBeUndefined()

      // DB 삭제는 여전히 호출되어야 한다
      expect(mockPrisma.document.delete).toHaveBeenCalledWith({
        where: { id: "doc-1" },
      })
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
      _count: { chunks: 3 },
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
      { id: "doc-1", title: "이력서", type: "pdf", fileSize: 1024, createdAt: new Date(), _count: { chunks: 2 } },
      { id: "doc-2", title: "자기소개서", type: "docx", fileSize: 2048, createdAt: new Date(), _count: { chunks: 5 } },
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
