import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── 외부 의존성 mock (vi.mock은 호이스팅되어 import 전에 실행됨) ─────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/cover-letters/service", () => ({
  updateSelectedDocuments: vi.fn(),
  CoverLetterNotFoundError: class CoverLetterNotFoundError extends Error {
    constructor() {
      super("자기소개서를 찾을 수 없습니다.")
    }
  },
  CoverLetterForbiddenError: class CoverLetterForbiddenError extends Error {
    constructor() {
      super("이 자기소개서에 대한 권한이 없습니다.")
    }
  },
}))

// prisma.ts가 임베딩 관련 SDK를 import할 수 있으므로 사전 mock 처리
vi.mock("@ai-sdk/openai", () => ({
  openai: { embedding: vi.fn().mockReturnValue({ modelId: "text-embedding-3-small" }) },
}))
vi.mock("ai", () => ({
  embedMany: vi.fn().mockResolvedValue({ embeddings: [] }),
  streamText: vi.fn(),
  convertToModelMessages: vi.fn(),
}))

// ─── 실제 모듈 import ─────────────────────────────────────────────────────────

import { PATCH } from "@/app/api/cover-letters/[id]/documents/route"
import { createClient } from "@/lib/supabase/server"
import {
  updateSelectedDocuments,
  CoverLetterNotFoundError,
  CoverLetterForbiddenError,
} from "@/lib/cover-letters/service"

// ─── mock 타입 캐스팅 헬퍼 ───────────────────────────────────────────────────

const mockCreateClient = vi.mocked(createClient)
const mockUpdateSelectedDocuments = vi.mocked(updateSelectedDocuments)

// ─── 상수 픽스처 ──────────────────────────────────────────────────────────────

const VALID_COVER_LETTER_ID = "a0000000-0000-4000-8000-000000000001"
const VALID_USER_ID = "b0000000-0000-4000-8000-000000000001"
const VALID_DOC_ID = "c0000000-0000-4000-8000-000000000001"

// ─── 헬퍼 함수 ────────────────────────────────────────────────────────────────

function makeSupabaseMock(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

function makeRequest(body: unknown): Request {
  return new Request(`http://localhost/api/cover-letters/${VALID_COVER_LETTER_ID}/documents`, {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // 기본 성공 경로: 인증된 사용자
  mockCreateClient.mockResolvedValue(
    makeSupabaseMock({ id: VALID_USER_ID }) as never,
  )
  mockUpdateSelectedDocuments.mockResolvedValue(undefined)
})

// ─────────────────────────────────────────────────────────────────────────────

describe("PATCH /api/cover-letters/[id]/documents", () => {
  // ── 인증 검증 ──────────────────────────────────────────────────────────────
  describe("인증이 없을 때", () => {
    it("401을 반환해야 한다", async () => {
      // Arrange
      mockCreateClient.mockResolvedValue(makeSupabaseMock(null) as never)
      const request = makeRequest({ documentIds: [VALID_DOC_ID] })

      // Act
      const response = await PATCH(request, makeParams(VALID_COVER_LETTER_ID))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(body).toEqual({ error: "인증이 필요합니다." })
    })
  })

  // ── ID 형식 검증 ───────────────────────────────────────────────────────────
  describe("잘못된 UUID 형식의 id일 때", () => {
    it("400을 반환해야 한다", async () => {
      // Arrange
      const request = makeRequest({ documentIds: [VALID_DOC_ID] })

      // Act
      const response = await PATCH(request, makeParams("not-a-uuid"))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body).toEqual({ error: "잘못된 자기소개서 ID 형식입니다." })
    })

    it("updateSelectedDocuments를 호출하지 않아야 한다", async () => {
      // Arrange
      const request = makeRequest({ documentIds: [] })

      // Act
      await PATCH(request, makeParams("bad-id-format"))

      // Assert
      expect(mockUpdateSelectedDocuments).not.toHaveBeenCalled()
    })
  })

  // ── JSON 파싱 검증 ────────────────────────────────────────────────────────
  describe("요청 body가 유효한 JSON이 아닐 때", () => {
    it("400을 반환해야 한다", async () => {
      // Arrange — Content-Type만 설정하고 body는 잘못된 JSON
      const request = new Request(
        `http://localhost/api/cover-letters/${VALID_COVER_LETTER_ID}/documents`,
        {
          method: "PATCH",
          body: "{ invalid json }",
          headers: { "Content-Type": "application/json" },
        },
      )

      // Act
      const response = await PATCH(request, makeParams(VALID_COVER_LETTER_ID))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body).toEqual({ error: "유효하지 않은 요청입니다." })
    })
  })

  // ── Zod 검증 ──────────────────────────────────────────────────────────────
  describe("Zod 검증이 실패할 때", () => {
    it("documentIds가 없으면 400을 반환해야 한다", async () => {
      // Arrange — documentIds 필드 자체가 없음
      const request = makeRequest({})

      // Act
      const response = await PATCH(request, makeParams(VALID_COVER_LETTER_ID))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it("documentIds 항목이 UUID가 아니면 400을 반환해야 한다", async () => {
      // Arrange — documentIds 배열에 유효하지 않은 UUID 포함
      const request = makeRequest({ documentIds: ["not-a-valid-uuid"] })

      // Act
      const response = await PATCH(request, makeParams(VALID_COVER_LETTER_ID))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })
  })

  // ── 서비스 에러 처리 ──────────────────────────────────────────────────────
  describe("CoverLetterNotFoundError가 발생할 때", () => {
    it("404를 반환해야 한다", async () => {
      // Arrange
      mockUpdateSelectedDocuments.mockRejectedValue(new CoverLetterNotFoundError())
      const request = makeRequest({ documentIds: [VALID_DOC_ID] })

      // Act
      const response = await PATCH(request, makeParams(VALID_COVER_LETTER_ID))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(404)
      expect(body).toEqual({ error: "자기소개서를 찾을 수 없습니다." })
    })
  })

  describe("CoverLetterForbiddenError가 발생할 때", () => {
    it("403을 반환해야 한다", async () => {
      // Arrange
      mockUpdateSelectedDocuments.mockRejectedValue(new CoverLetterForbiddenError())
      const request = makeRequest({ documentIds: [VALID_DOC_ID] })

      // Act
      const response = await PATCH(request, makeParams(VALID_COVER_LETTER_ID))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(body).toEqual({ error: "이 자기소개서에 대한 권한이 없습니다." })
    })
  })

  describe("알 수 없는 에러가 발생할 때", () => {
    it("500을 반환해야 한다", async () => {
      // Arrange
      mockUpdateSelectedDocuments.mockRejectedValue(new Error("DB 연결 실패"))
      const request = makeRequest({ documentIds: [VALID_DOC_ID] })

      // Act
      const response = await PATCH(request, makeParams(VALID_COVER_LETTER_ID))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(body).toEqual({ error: "참고 문서 변경에 실패했습니다." })
    })
  })

  // ── 성공 경로 ─────────────────────────────────────────────────────────────
  describe("성공적으로 처리될 때", () => {
    it("200과 { success: true }를 반환해야 한다", async () => {
      // Arrange
      const request = makeRequest({ documentIds: [VALID_DOC_ID] })

      // Act
      const response = await PATCH(request, makeParams(VALID_COVER_LETTER_ID))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(body).toEqual({ success: true })
    })

    it("올바른 인자로 updateSelectedDocuments를 호출해야 한다", async () => {
      // Arrange
      const request = makeRequest({ documentIds: [VALID_DOC_ID] })

      // Act
      await PATCH(request, makeParams(VALID_COVER_LETTER_ID))

      // Assert
      expect(mockUpdateSelectedDocuments).toHaveBeenCalledWith(
        VALID_COVER_LETTER_ID,
        VALID_USER_ID,
        [VALID_DOC_ID],
      )
    })

    it("documentIds가 빈 배열이어도 성공해야 한다", async () => {
      // Arrange
      const request = makeRequest({ documentIds: [] })

      // Act
      const response = await PATCH(request, makeParams(VALID_COVER_LETTER_ID))
      const body = await response.json()

      // Assert
      expect(response.status).toBe(200)
      expect(body).toEqual({ success: true })
    })
  })
})
