import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── 외부 의존성 mock (vi.mock은 호이스팅되어 import 전에 실행됨) ─────────────

// next/headers — createClient 내부에서 cookies()를 사용하므로 mock 필요
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}))

// Supabase 서버 클라이언트 — exchangeCodeForSession을 제어하기 위해 mock
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

// prisma — DB upsert 호출을 제어하기 위해 mock
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
    },
  },
}))

// extractUserInfo — 사용자 정보 추출 로직을 독립적으로 제어하기 위해 mock
vi.mock("@/lib/supabase/user", () => ({
  extractUserInfo: vi.fn(),
}))

// prisma.ts가 임베딩 관련 SDK를 import할 수 있으므로 사전 mock 처리
vi.mock("@ai-sdk/openai", () => ({
  openai: { embedding: vi.fn().mockReturnValue({ modelId: "text-embedding-3-small" }) },
}))
vi.mock("ai", () => ({
  embedMany: vi.fn().mockResolvedValue({ embeddings: [] }),
}))

// ─── 실제 모듈 import ─────────────────────────────────────────────────────────

import { GET } from "@/app/(auth)/callback/route"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { extractUserInfo } from "@/lib/supabase/user"

// ─── mock 타입 캐스팅 헬퍼 ───────────────────────────────────────────────────

const mockCreateClient = vi.mocked(createClient)
const mockUpsert = vi.mocked(prisma.user.upsert)
const mockExtractUserInfo = vi.mocked(extractUserInfo)

// Supabase 클라이언트 mock 헬퍼 — exchangeCodeForSession 결과를 주입할 수 있음
function makeSupabaseMock(
  result: { data: { user: object | null }; error: object | null } = {
    data: { user: null },
    error: null,
  },
) {
  const exchangeCodeForSession = vi.fn().mockResolvedValue(result)
  return {
    auth: { exchangeCodeForSession },
  }
}

// 기본 사용자 객체 픽스처
const FAKE_USER = {
  id: "user-uuid-123",
  email: "test@example.com",
}

// 테스트용 Request 생성 헬퍼
function makeRequest(url: string): Request {
  return new Request(url)
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
})

// ─────────────────────────────────────────────────────────────────────────────

describe("GET /auth/callback", () => {
  // ── 케이스 1: code 파라미터 없음 ──────────────────────────────────────────
  describe("code 파라미터가 없을 때", () => {
    it("/login으로 리다이렉트되어야 한다", async () => {
      // Arrange — URL에 code 쿼리 파라미터 없음
      const request = makeRequest("https://example.com/auth/callback")

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toBe("https://example.com/login")
    })

    it("createClient를 호출하지 않아야 한다", async () => {
      // Arrange
      const request = makeRequest("https://example.com/auth/callback")

      // Act
      await GET(request)

      // Assert — code가 없으면 Supabase 클라이언트를 생성할 필요 없음
      expect(mockCreateClient).not.toHaveBeenCalled()
    })
  })

  // ── 케이스 2: exchangeCodeForSession 오류 ────────────────────────────────
  describe("exchangeCodeForSession가 error를 반환할 때", () => {
    it("/login으로 리다이렉트되어야 한다", async () => {
      // Arrange — Supabase 세션 교환 실패 시뮬레이션
      const supabase = makeSupabaseMock({
        data: { user: null },
        error: { message: "invalid code" },
      })
      mockCreateClient.mockResolvedValue(supabase as never)

      const request = makeRequest("https://example.com/auth/callback?code=bad-code")

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toBe("https://example.com/login")
    })

    it("prisma.user.upsert를 호출하지 않아야 한다", async () => {
      // Arrange
      const supabase = makeSupabaseMock({
        data: { user: null },
        error: { message: "invalid code" },
      })
      mockCreateClient.mockResolvedValue(supabase as never)

      const request = makeRequest("https://example.com/auth/callback?code=bad-code")

      // Act
      await GET(request)

      // Assert — 인증 실패 시 DB 작업이 수행되어서는 안 됨
      expect(mockUpsert).not.toHaveBeenCalled()
    })
  })

  // ── 케이스 3: 사용자 이메일 없음 ──────────────────────────────────────────
  describe("extractUserInfo가 email을 반환하지 않을 때", () => {
    it("/login?error=no_email 로 리다이렉트되어야 한다", async () => {
      // Arrange — 세션 교환 성공, 하지만 이메일 없는 사용자
      const supabase = makeSupabaseMock({
        data: { user: FAKE_USER },
        error: null,
      })
      mockCreateClient.mockResolvedValue(supabase as never)
      mockExtractUserInfo.mockReturnValue({ name: "홍길동", email: null, avatarUrl: null })

      const request = makeRequest("https://example.com/auth/callback?code=valid-code")

      // Act
      const response = await GET(request)

      // Assert
      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toBe(
        "https://example.com/login?error=no_email",
      )
    })

    it("prisma.user.upsert를 호출하지 않아야 한다", async () => {
      // Arrange
      const supabase = makeSupabaseMock({
        data: { user: FAKE_USER },
        error: null,
      })
      mockCreateClient.mockResolvedValue(supabase as never)
      mockExtractUserInfo.mockReturnValue({ name: null, email: null, avatarUrl: null })

      const request = makeRequest("https://example.com/auth/callback?code=valid-code")

      // Act
      await GET(request)

      // Assert — 이메일이 없으면 DB 저장 시도 자체를 하지 않아야 함
      expect(mockUpsert).not.toHaveBeenCalled()
    })
  })

  // ── 케이스 4: 인증 성공 ──────────────────────────────────────────────────
  describe("인증이 성공했을 때", () => {
    it("origin으로 리다이렉트되어야 한다", async () => {
      // Arrange — 세션 교환 성공, 이메일 포함 사용자 정보
      const supabase = makeSupabaseMock({
        data: { user: FAKE_USER },
        error: null,
      })
      mockCreateClient.mockResolvedValue(supabase as never)
      mockExtractUserInfo.mockReturnValue({
        name: "Test User",
        email: "test@example.com",
        avatarUrl: "https://example.com/avatar.png",
      })
      mockUpsert.mockResolvedValue({} as never)

      const request = makeRequest("https://example.com/auth/callback?code=valid-code")

      // Act
      const response = await GET(request)

      // Assert — NextResponse.redirect(origin)은 URL을 정규화하므로 trailing slash가 추가됨
      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toBe("https://example.com/")
    })

    it("올바른 인자로 prisma.user.upsert를 호출해야 한다", async () => {
      // Arrange
      const supabase = makeSupabaseMock({
        data: { user: FAKE_USER },
        error: null,
      })
      mockCreateClient.mockResolvedValue(supabase as never)
      mockExtractUserInfo.mockReturnValue({
        name: "Test User",
        email: "test@example.com",
        avatarUrl: "https://example.com/avatar.png",
      })
      mockUpsert.mockResolvedValue({} as never)

      const request = makeRequest("https://example.com/auth/callback?code=valid-code")

      // Act
      await GET(request)

      // Assert — upsert 인자가 사용자 ID, 이메일, 이름, 아바타를 포함해야 함
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { id: FAKE_USER.id },
        update: {
          email: "test@example.com",
          name: "Test User",
          avatarUrl: "https://example.com/avatar.png",
        },
        create: {
          id: FAKE_USER.id,
          email: "test@example.com",
          name: "Test User",
          avatarUrl: "https://example.com/avatar.png",
        },
      })
    })

    it("name과 avatarUrl이 null이어도 upsert를 호출해야 한다", async () => {
      // Arrange — 소셜 로그인 제공자가 이름/아바타를 제공하지 않는 경우
      const supabase = makeSupabaseMock({
        data: { user: FAKE_USER },
        error: null,
      })
      mockCreateClient.mockResolvedValue(supabase as never)
      mockExtractUserInfo.mockReturnValue({
        name: null,
        email: "test@example.com",
        avatarUrl: null,
      })
      mockUpsert.mockResolvedValue({} as never)

      const request = makeRequest("https://example.com/auth/callback?code=valid-code")

      // Act
      await GET(request)

      // Assert
      expect(mockUpsert).toHaveBeenCalledTimes(1)
      const callArg = mockUpsert.mock.calls[0][0]
      expect(callArg.create.name).toBeNull()
      expect(callArg.create.avatarUrl).toBeNull()
    })
  })

  // ── 케이스 5: upsert 실패 ────────────────────────────────────────────────
  describe("prisma.user.upsert가 예외를 던질 때", () => {
    it("/login으로 리다이렉트되어야 한다", async () => {
      // Arrange — DB upsert 실패 시뮬레이션
      const supabase = makeSupabaseMock({
        data: { user: FAKE_USER },
        error: null,
      })
      mockCreateClient.mockResolvedValue(supabase as never)
      mockExtractUserInfo.mockReturnValue({
        name: "Test User",
        email: "test@example.com",
        avatarUrl: null,
      })
      mockUpsert.mockRejectedValue(new Error("DB connection failed"))

      const request = makeRequest("https://example.com/auth/callback?code=valid-code")

      // Act
      const response = await GET(request)

      // Assert — upsert 실패 시 크래시 없이 /login으로 안전하게 리다이렉트
      expect(response.status).toBe(307)
      expect(response.headers.get("location")).toBe("https://example.com/login")
    })

    it("예외가 라우트 핸들러 밖으로 전파되지 않아야 한다", async () => {
      // Arrange
      const supabase = makeSupabaseMock({
        data: { user: FAKE_USER },
        error: null,
      })
      mockCreateClient.mockResolvedValue(supabase as never)
      mockExtractUserInfo.mockReturnValue({
        name: "Test User",
        email: "test@example.com",
        avatarUrl: null,
      })
      mockUpsert.mockRejectedValue(new Error("unexpected DB error"))

      const request = makeRequest("https://example.com/auth/callback?code=valid-code")

      // Act & Assert — GET이 reject 없이 resolve 되어야 함
      await expect(GET(request)).resolves.toBeDefined()
    })
  })
})
