import { describe, it, expect, vi, beforeEach } from "vitest"

// createServerClient는 외부 Supabase 의존성이므로 mock 처리
// vi.mock은 정적으로 호이스팅되어 import보다 먼저 실행된다
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}))

// NextResponse는 Node 환경에서 실제 구현이 동작하지 않으므로 mock 처리
vi.mock("next/server", () => {
  const mockNext = vi.fn()
  const mockRedirect = vi.fn()

  return {
    NextResponse: {
      next: mockNext,
      redirect: mockRedirect,
    },
  }
})

import { updateSession } from "@/lib/supabase/middleware"
import { createServerClient } from "@supabase/ssr"
import { NextResponse } from "next/server"

// ─────────────────────────────────────────────────────────────────────────────
// 테스트용 최소 NextRequest 객체 팩토리
// NextRequest는 Node 환경에서 직접 생성하기 어려우므로 필요한 인터페이스만 구현
// ─────────────────────────────────────────────────────────────────────────────
function makeRequest(pathname: string) {
  const url = new URL(`https://example.com${pathname}`)
  const cookieStore: Record<string, string> = {}

  return {
    nextUrl: {
      pathname,
      clone() {
        return new URL(url.toString())
      },
    },
    cookies: {
      getAll() {
        return Object.entries(cookieStore).map(([name, value]) => ({ name, value }))
      },
      set(name: string, value: string) {
        cookieStore[name] = value
      },
    },
  } as never
}

// ─────────────────────────────────────────────────────────────────────────────
// 테스트용 최소 NextResponse mock 반환값 팩토리
// cookies.set을 추적할 수 있도록 spy를 포함한다
// ─────────────────────────────────────────────────────────────────────────────
function makeResponseMock() {
  return {
    cookies: {
      set: vi.fn(),
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Supabase auth.getUser mock 헬퍼
// user가 null이면 비로그인, 값이 있으면 로그인 상태를 시뮬레이션한다
// ─────────────────────────────────────────────────────────────────────────────
function mockSupabaseUser(user: object | null) {
  const getUser = vi.fn().mockResolvedValue({ data: { user } })
  vi.mocked(createServerClient).mockReturnValue({
    auth: { getUser },
  } as never)
  return { getUser }
}

const mockNextResponse = vi.mocked(NextResponse)

// ─────────────────────────────────────────────────────────────────────────────

// 환경변수는 실제 네트워크 요청이 발생하지 않으므로 더미 값으로 설정
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co"
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-anon-key"

beforeEach(() => {
  vi.clearAllMocks()
  // 기본적으로 NextResponse.next()와 redirect()는 새로운 mock 응답 객체를 반환
  mockNextResponse.next.mockReturnValue(makeResponseMock() as never)
  mockNextResponse.redirect.mockReturnValue(makeResponseMock() as never)
})

// ─────────────────────────────────────────────────────────────────────────────

describe("updateSession()", () => {
  // ── 공개 경로 통과 ────────────────────────────────────────────────────────

  describe("/login 경로 통과", () => {
    it("/login 요청은 Supabase 인증 없이 NextResponse.next()를 반환해야 한다", async () => {
      // Arrange
      const request = makeRequest("/login")
      const expectedResponse = makeResponseMock()
      mockNextResponse.next.mockReturnValueOnce(expectedResponse as never)

      // Act
      const result = await updateSession(request)

      // Assert — createServerClient가 호출되지 않아야 한다
      expect(createServerClient).not.toHaveBeenCalled()
      expect(result).toBe(expectedResponse)
    })

    it("/login/forgot-password 처럼 /login으로 시작하는 하위 경로도 통과해야 한다", async () => {
      // Arrange
      const request = makeRequest("/login/forgot-password")

      // Act
      await updateSession(request)

      // Assert
      expect(createServerClient).not.toHaveBeenCalled()
      expect(mockNextResponse.next).toHaveBeenCalledTimes(1)
    })
  })

  describe("/callback 경로 통과", () => {
    it("/callback 요청은 Supabase 인증 없이 NextResponse.next()를 반환해야 한다", async () => {
      // Arrange
      const request = makeRequest("/callback")
      const expectedResponse = makeResponseMock()
      mockNextResponse.next.mockReturnValueOnce(expectedResponse as never)

      // Act
      const result = await updateSession(request)

      // Assert — createServerClient가 호출되지 않아야 한다
      expect(createServerClient).not.toHaveBeenCalled()
      expect(result).toBe(expectedResponse)
    })

    it("/callback/oauth처럼 /callback으로 시작하는 하위 경로도 통과해야 한다", async () => {
      // Arrange
      const request = makeRequest("/callback/oauth")

      // Act
      await updateSession(request)

      // Assert
      expect(createServerClient).not.toHaveBeenCalled()
      expect(mockNextResponse.next).toHaveBeenCalledTimes(1)
    })
  })

  // ── 인증된 사용자 ─────────────────────────────────────────────────────────

  describe("인증된 사용자 — 보호 경로 통과", () => {
    it("루트 경로(/)에서 로그인된 사용자는 그대로 통과해야 한다", async () => {
      // Arrange
      const request = makeRequest("/")
      mockSupabaseUser({ id: "user-123", email: "test@example.com" })

      // Act
      const result = await updateSession(request)

      // Assert — redirect가 호출되지 않아야 한다
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it("인증된 사용자는 /documents 경로에서도 통과해야 한다", async () => {
      // Arrange
      const request = makeRequest("/documents")
      mockSupabaseUser({ id: "user-456" })

      // Act
      await updateSession(request)

      // Assert
      expect(mockNextResponse.redirect).not.toHaveBeenCalled()
    })
  })

  // ── 비인증 사용자 리다이렉트 ──────────────────────────────────────────────

  describe("비인증 사용자 — /login으로 리다이렉트", () => {
    it("루트 경로(/)에서 로그인되지 않은 사용자는 /login으로 리다이렉트되어야 한다", async () => {
      // Arrange
      const request = makeRequest("/")
      mockSupabaseUser(null)

      // Act
      await updateSession(request)

      // Assert — redirect가 /login 경로의 URL로 호출되어야 한다
      expect(mockNextResponse.redirect).toHaveBeenCalledTimes(1)
      const redirectArg: URL = mockNextResponse.redirect.mock.calls[0][0]
      expect(redirectArg.pathname).toBe("/login")
    })

    it("/documents 경로에서 비인증 사용자는 /login으로 리다이렉트되어야 한다", async () => {
      // Arrange
      const request = makeRequest("/documents")
      mockSupabaseUser(null)

      // Act
      await updateSession(request)

      // Assert
      expect(mockNextResponse.redirect).toHaveBeenCalledTimes(1)
      const redirectArg: URL = mockNextResponse.redirect.mock.calls[0][0]
      expect(redirectArg.pathname).toBe("/login")
    })

    it("리다이렉트 응답을 반환하고 supabaseResponse를 반환하지 않아야 한다", async () => {
      // Arrange
      const request = makeRequest("/dashboard")
      mockSupabaseUser(null)
      const redirectResponse = makeResponseMock()
      mockNextResponse.redirect.mockReturnValueOnce(redirectResponse as never)

      // Act
      const result = await updateSession(request)

      // Assert
      expect(result).toBe(redirectResponse)
    })
  })

  // ── createServerClient 호출 인수 검증 ─────────────────────────────────────

  describe("createServerClient 설정", () => {
    it("환경변수로 설정된 URL과 ANON KEY로 createServerClient를 호출해야 한다", async () => {
      // Arrange
      const request = makeRequest("/")
      mockSupabaseUser({ id: "user-789" })

      // Act
      await updateSession(request)

      // Assert
      expect(createServerClient).toHaveBeenCalledWith(
        "https://test.supabase.co",
        "test-anon-key",
        expect.objectContaining({
          cookies: expect.objectContaining({
            getAll: expect.any(Function),
            setAll: expect.any(Function),
          }),
        }),
      )
    })

    it("cookies.getAll은 request.cookies.getAll()의 결과를 반환해야 한다", async () => {
      // Arrange — 쿠키가 포함된 요청 생성
      const request = makeRequest("/")
      // 직접 쿠키 삽입
      request.cookies.set("sb-token", "abc123")
      mockSupabaseUser({ id: "u1" })

      let capturedGetAll: (() => { name: string; value: string }[]) | undefined

      vi.mocked(createServerClient).mockImplementationOnce((_url, _key, config) => {
        capturedGetAll = config.cookies.getAll
        return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) } } as never
      })

      // Act
      await updateSession(request)

      // Assert
      expect(capturedGetAll).toBeDefined()
      const cookies = capturedGetAll!()
      expect(cookies).toEqual(expect.arrayContaining([{ name: "sb-token", value: "abc123" }]))
    })

    it("cookies.setAll은 response 쿠키에도 값을 설정해야 한다", async () => {
      // Arrange
      const request = makeRequest("/")
      const supabaseResponse = makeResponseMock()
      // setAll 호출 시 새로운 NextResponse.next()가 반환되도록 설정
      mockNextResponse.next
        .mockReturnValueOnce(supabaseResponse as never) // 첫 번째 호출 (초기 supabaseResponse)
        .mockReturnValueOnce(supabaseResponse as never) // setAll 내부 호출

      let capturedSetAll: ((cookies: { name: string; value: string; options?: object }[]) => void) | undefined

      vi.mocked(createServerClient).mockImplementationOnce((_url, _key, config) => {
        capturedSetAll = config.cookies.setAll
        return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } } }) } } as never
      })

      // Act
      await updateSession(request)
      capturedSetAll!([{ name: "auth-token", value: "xyz", options: { httpOnly: true } }])

      // Assert — response cookies에 set이 호출되어야 한다
      expect(supabaseResponse.cookies.set).toHaveBeenCalledWith(
        "auth-token",
        "xyz",
        { httpOnly: true },
      )
    })
  })
})
