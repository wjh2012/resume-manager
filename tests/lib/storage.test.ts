import { describe, it, expect, vi, beforeEach } from "vitest"

// createClient는 Supabase 서버 클라이언트를 생성하는 외부 의존성이므로 mock 처리
// vi.mock은 정적으로 호이스팅되어 import보다 먼저 실행된다
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

import { uploadFile, deleteFile } from "@/lib/storage"
import { createClient } from "@/lib/supabase/server"

// supabase storage 체인 mock 헬퍼 — upload/remove 각각 주입 가능
function makeStorageMock({
  uploadResult = { error: null },
  removeResult = { error: null },
}: {
  uploadResult?: { error: { message: string } | null }
  removeResult?: { error: { message: string } | null }
} = {}) {
  const upload = vi.fn().mockResolvedValue(uploadResult)
  const remove = vi.fn().mockResolvedValue(removeResult)
  const from = vi.fn().mockReturnValue({ upload, remove })
  return { from, upload, remove }
}

const mockCreateClient = vi.mocked(createClient)

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────

describe("uploadFile()", () => {
  // 성공 경로
  describe("업로드 성공", () => {
    it("반환된 경로는 userId를 접두사로 포함해야 한다", async () => {
      // Arrange
      const storage = makeStorageMock()
      mockCreateClient.mockResolvedValue({ storage } as never)

      // Act
      const result = await uploadFile("user-123", "resume.pdf", new Blob(["data"]))

      // Assert
      expect(result.startsWith("user-123/")).toBe(true)
    })

    it("반환된 경로에 원본 파일의 확장자가 포함되어야 한다", async () => {
      // Arrange
      const storage = makeStorageMock()
      mockCreateClient.mockResolvedValue({ storage } as never)

      // Act
      const result = await uploadFile("user-abc", "cv.pdf", new Blob(["data"]))

      // Assert — UUID 기반 파일명이지만 확장자는 유지
      expect(result).toMatch(/\.pdf$/)
    })

    it("경로 형식은 '{userId}/{timestamp}-{uuid}.{ext}' 이어야 한다", async () => {
      // Arrange
      const storage = makeStorageMock()
      mockCreateClient.mockResolvedValue({ storage } as never)
      const before = Date.now()

      // Act
      const result = await uploadFile("u1", "file.txt", new Blob(["x"]))

      // Assert — UUID 기반 경로: u1/{timestamp}-{uuid}.txt
      const match = result.match(/^u1\/(\d+)-[0-9a-f-]+\.txt$/)
      expect(match).not.toBeNull()
      const timestamp = Number(match![1])
      expect(timestamp).toBeGreaterThanOrEqual(before)
    })

    it("'documents' 버킷을 대상으로 upload를 호출해야 한다", async () => {
      // Arrange
      const storage = makeStorageMock()
      mockCreateClient.mockResolvedValue({ storage } as never)

      // Act
      await uploadFile("u1", "f.pdf", new Blob([]))

      // Assert
      expect(storage.from).toHaveBeenCalledWith("documents")
      expect(storage.upload).toHaveBeenCalledTimes(1)
    })

    it("upsert: false 옵션으로 upload를 호출해야 한다", async () => {
      // Arrange
      const storage = makeStorageMock()
      mockCreateClient.mockResolvedValue({ storage } as never)
      const file = new Blob(["content"])

      // Act
      await uploadFile("u1", "doc.pdf", file)

      // Assert
      const [, , options] = storage.upload.mock.calls[0]
      expect(options).toEqual({ upsert: false })
    })
  })

  // 에러 경로
  describe("업로드 실패", () => {
    it("Supabase가 error를 반환하면 'Storage upload failed:' 메시지로 예외를 던져야 한다", async () => {
      // Arrange
      const storage = makeStorageMock({ uploadResult: { error: { message: "bucket not found" } } })
      mockCreateClient.mockResolvedValue({ storage } as never)

      // Act & Assert
      await expect(uploadFile("u1", "f.pdf", new Blob([]))).rejects.toThrow(
        "Storage upload failed: bucket not found",
      )
    })

    it("에러 메시지가 원본 Supabase 오류 메시지를 포함해야 한다", async () => {
      // Arrange
      const storage = makeStorageMock({ uploadResult: { error: { message: "permission denied" } } })
      mockCreateClient.mockResolvedValue({ storage } as never)

      // Act & Assert
      await expect(uploadFile("u1", "f.pdf", new Blob([]))).rejects.toThrow("permission denied")
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────

describe("deleteFile()", () => {
  // 성공 경로
  describe("삭제 성공", () => {
    it("error 없이 정상 완료되면 undefined를 반환해야 한다(void)", async () => {
      // Arrange
      const storage = makeStorageMock()
      mockCreateClient.mockResolvedValue({ storage } as never)

      // Act & Assert — 예외 없이 resolve 되어야 한다
      await expect(deleteFile("user-123/1700000000000-file.pdf")).resolves.toBeUndefined()
    })

    it("'documents' 버킷을 대상으로 remove를 호출해야 한다", async () => {
      // Arrange
      const storage = makeStorageMock()
      mockCreateClient.mockResolvedValue({ storage } as never)

      // Act
      await deleteFile("user-123/ts-file.pdf")

      // Assert
      expect(storage.from).toHaveBeenCalledWith("documents")
      expect(storage.remove).toHaveBeenCalledTimes(1)
    })

    it("remove에는 경로를 원소로 갖는 배열을 전달해야 한다", async () => {
      // Arrange
      const storage = makeStorageMock()
      mockCreateClient.mockResolvedValue({ storage } as never)
      const path = "user-xyz/1700000000000-resume.pdf"

      // Act
      await deleteFile(path)

      // Assert
      expect(storage.remove).toHaveBeenCalledWith([path])
    })
  })

  // 에러 경로
  describe("삭제 실패", () => {
    it("Supabase가 error를 반환하면 'Storage delete failed:' 메시지로 예외를 던져야 한다", async () => {
      // Arrange
      const storage = makeStorageMock({ removeResult: { error: { message: "object not found" } } })
      mockCreateClient.mockResolvedValue({ storage } as never)

      // Act & Assert
      await expect(deleteFile("user-123/missing.pdf")).rejects.toThrow(
        "Storage delete failed: object not found",
      )
    })

    it("에러 메시지가 원본 Supabase 오류 메시지를 포함해야 한다", async () => {
      // Arrange
      const storage = makeStorageMock({ removeResult: { error: { message: "access denied" } } })
      mockCreateClient.mockResolvedValue({ storage } as never)

      // Act & Assert
      await expect(deleteFile("user-123/secret.pdf")).rejects.toThrow("access denied")
    })
  })
})
