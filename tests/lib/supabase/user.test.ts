import { describe, it, expect } from "vitest"
import type { User } from "@supabase/supabase-js"
import { extractUserInfo } from "@/lib/supabase/user"

// 테스트용 최소 User 객체 생성 헬퍼 — 필요한 필드만 부분적으로 주입
function makeUser(overrides: Partial<User> & { user_metadata?: Record<string, unknown> }): User {
  return overrides as unknown as User
}

describe("extractUserInfo()", () => {
  // ── name 추출 ──────────────────────────────────────────────────────────────
  describe("name 추출", () => {
    it("full_name이 있으면 full_name을 반환해야 한다", () => {
      const user = makeUser({ user_metadata: { full_name: "홍길동", name: "길동" } })

      const result = extractUserInfo(user)

      expect(result.name).toBe("홍길동")
    })

    it("full_name이 없고 name이 있으면 name을 반환해야 한다", () => {
      const user = makeUser({ user_metadata: { name: "길동" } })

      const result = extractUserInfo(user)

      expect(result.name).toBe("길동")
    })

    it("full_name과 name 모두 없으면 null을 반환해야 한다", () => {
      const user = makeUser({ user_metadata: {} })

      const result = extractUserInfo(user)

      expect(result.name).toBeNull()
    })
  })

  // ── email 추출 ─────────────────────────────────────────────────────────────
  describe("email 추출", () => {
    it("user.email이 있으면 해당 이메일을 반환해야 한다", () => {
      const user = makeUser({ email: "user@example.com", user_metadata: {} })

      const result = extractUserInfo(user)

      expect(result.email).toBe("user@example.com")
    })

    it("user.email이 없으면 null을 반환해야 한다", () => {
      // email 필드 자체를 생략
      const user = makeUser({ user_metadata: {} })

      const result = extractUserInfo(user)

      expect(result.email).toBeNull()
    })
  })

  // ── avatarUrl 추출 ─────────────────────────────────────────────────────────
  describe("avatarUrl 추출", () => {
    it("avatar_url이 있으면 avatar_url을 반환해야 한다", () => {
      const user = makeUser({
        user_metadata: {
          avatar_url: "https://cdn.example.com/avatar.png",
          picture: "https://cdn.example.com/picture.png",
        },
      })

      const result = extractUserInfo(user)

      expect(result.avatarUrl).toBe("https://cdn.example.com/avatar.png")
    })

    it("avatar_url이 없고 picture가 있으면 picture를 반환해야 한다", () => {
      const user = makeUser({
        user_metadata: { picture: "https://cdn.example.com/picture.png" },
      })

      const result = extractUserInfo(user)

      expect(result.avatarUrl).toBe("https://cdn.example.com/picture.png")
    })

    it("avatar_url과 picture 모두 없으면 null을 반환해야 한다", () => {
      const user = makeUser({ user_metadata: {} })

      const result = extractUserInfo(user)

      expect(result.avatarUrl).toBeNull()
    })
  })

  // ── 엣지 케이스 ────────────────────────────────────────────────────────────
  describe("엣지 케이스", () => {
    it("user_metadata가 빈 객체이면 모든 필드가 null이어야 한다", () => {
      const user = makeUser({ email: undefined, user_metadata: {} })

      const result = extractUserInfo(user)

      expect(result).toEqual({ name: null, email: null, avatarUrl: null })
    })

    it("user_metadata가 undefined이면 모든 필드가 null이어야 한다", () => {
      // user_metadata 키 자체를 생략하여 undefined 상태를 재현
      const user = makeUser({})

      const result = extractUserInfo(user)

      expect(result).toEqual({ name: null, email: null, avatarUrl: null })
    })
  })
})
