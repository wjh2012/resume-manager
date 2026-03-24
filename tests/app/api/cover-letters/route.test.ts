import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── 외부 의존성 mock (vi.mock은 호이스팅되어 import 전에 실행됨) ─────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/cover-letters/service", () => ({
  createCoverLetter: vi.fn(),
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

import { POST } from "@/app/api/cover-letters/route"
import { createClient } from "@/lib/supabase/server"
import { createCoverLetter, CoverLetterForbiddenError } from "@/lib/cover-letters/service"

// ─── mock 타입 캐스팅 헬퍼 ───────────────────────────────────────────────────

const mockCreateClient = vi.mocked(createClient)
const mockCreateCoverLetter = vi.mocked(createCoverLetter)

// ─── 상수 픽스처 ──────────────────────────────────────────────────────────────

const VALID_USER_ID = "a0000000-0000-4000-8000-000000000001"
const VALID_DOC_ID = "c0000000-0000-4000-8000-000000000001"

const VALID_BODY = {
  title: "신입 개발자 자기소개서",
  companyName: "테스트 주식회사",
  position: "프론트엔드 개발자",
}

// ─── 헬퍼 함수 ────────────────────────────────────────────────────────────────

function makeSupabaseMock(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/cover-letters", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  // 기본 성공 경로: 인증된 사용자
  mockCreateClient.mockResolvedValue(
    makeSupabaseMock({ id: VALID_USER_ID }) as never,
  )
  mockCreateCoverLetter.mockResolvedValue({ id: "d0000000-0000-4000-8000-000000000001" } as never)
})

// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/cover-letters", () => {
  // ── 인증 검증 ──────────────────────────────────────────────────────────────
  describe("인증이 없을 때", () => {
    it("401을 반환해야 한다", async () => {
      // Arrange
      mockCreateClient.mockResolvedValue(makeSupabaseMock(null) as never)
      const request = makeRequest(VALID_BODY)

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(401)
      expect(body).toEqual({ error: "인증이 필요합니다." })
    })

    it("createCoverLetter를 호출하지 않아야 한다", async () => {
      // Arrange
      mockCreateClient.mockResolvedValue(makeSupabaseMock(null) as never)
      const request = makeRequest(VALID_BODY)

      // Act
      await POST(request)

      // Assert
      expect(mockCreateCoverLetter).not.toHaveBeenCalled()
    })
  })

  // ── JSON 파싱 검증 ────────────────────────────────────────────────────────
  describe("요청 body가 유효한 JSON이 아닐 때", () => {
    it("400을 반환해야 한다", async () => {
      // Arrange — Content-Type만 설정하고 body는 잘못된 JSON
      const request = new Request("http://localhost/api/cover-letters", {
        method: "POST",
        body: "{ invalid json }",
        headers: { "Content-Type": "application/json" },
      })

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body).toEqual({ error: "유효하지 않은 요청입니다." })
    })
  })

  // ── Zod 검증 ──────────────────────────────────────────────────────────────
  describe("Zod 검증이 실패할 때", () => {
    it("title이 없으면 400을 반환해야 한다", async () => {
      // Arrange — title 필드 누락
      const request = makeRequest({ companyName: "테스트", position: "개발자" })

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it("companyName이 없으면 400을 반환해야 한다", async () => {
      // Arrange — companyName 필드 누락
      const request = makeRequest({ title: "자기소개서", position: "개발자" })

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it("position이 없으면 400을 반환해야 한다", async () => {
      // Arrange — position 필드 누락
      const request = makeRequest({ title: "자기소개서", companyName: "테스트" })

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })

    it("title이 빈 문자열이면 400과 Zod 메시지를 반환해야 한다", async () => {
      // Arrange — title이 min(1) 위반
      const request = makeRequest({ title: "", companyName: "테스트", position: "개발자" })

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body.error).toBe("제목을 입력해주세요.")
    })

    it("selectedDocumentIds 항목이 UUID가 아니면 400을 반환해야 한다", async () => {
      // Arrange — selectedDocumentIds 배열에 유효하지 않은 UUID 포함
      const request = makeRequest({ ...VALID_BODY, selectedDocumentIds: ["not-a-uuid"] })

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(400)
      expect(body.error).toBeDefined()
    })
  })

  // ── 서비스 에러 처리 ──────────────────────────────────────────────────────
  describe("CoverLetterForbiddenError가 발생할 때", () => {
    it("403과 error.message를 반환해야 한다", async () => {
      // Arrange
      mockCreateCoverLetter.mockRejectedValue(new CoverLetterForbiddenError())
      const request = makeRequest(VALID_BODY)

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(403)
      expect(body).toEqual({ error: "이 자기소개서에 대한 권한이 없습니다." })
    })
  })

  describe("알 수 없는 에러가 발생할 때", () => {
    it("500을 반환해야 한다", async () => {
      // Arrange
      mockCreateCoverLetter.mockRejectedValue(new Error("DB 연결 실패"))
      const request = makeRequest(VALID_BODY)

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(500)
      expect(body).toEqual({ error: "자기소개서 생성에 실패했습니다." })
    })
  })

  // ── 성공 경로 ─────────────────────────────────────────────────────────────
  describe("성공적으로 처리될 때", () => {
    it("201과 생성된 자기소개서를 반환해야 한다", async () => {
      // Arrange
      const createdResult = { id: "d0000000-0000-4000-8000-000000000001" }
      mockCreateCoverLetter.mockResolvedValue(createdResult as never)
      const request = makeRequest(VALID_BODY)

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(body).toEqual(createdResult)
    })

    it("올바른 인자로 createCoverLetter를 호출해야 한다", async () => {
      // Arrange
      const request = makeRequest(VALID_BODY)

      // Act
      await POST(request)

      // Assert
      expect(mockCreateCoverLetter).toHaveBeenCalledWith(VALID_USER_ID, VALID_BODY)
    })

    it("선택적 필드(selectedDocumentIds, selectedExternalDocumentIds)를 포함해도 성공해야 한다", async () => {
      // Arrange
      const bodyWithOptionals = {
        ...VALID_BODY,
        selectedDocumentIds: [VALID_DOC_ID],
        selectedExternalDocumentIds: [VALID_DOC_ID],
      }
      const request = makeRequest(bodyWithOptionals)

      // Act
      const response = await POST(request)
      const body = await response.json()

      // Assert
      expect(response.status).toBe(201)
      expect(mockCreateCoverLetter).toHaveBeenCalledWith(VALID_USER_ID, bodyWithOptionals)
      expect(body).toBeDefined()
    })
  })
})
