import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/auth/get-user-role", () => ({
  getUserRole: vi.fn(),
}))

import { createClient } from "@/lib/supabase/server"
import { getUserRole } from "@/lib/auth/get-user-role"
import { requireAdmin } from "@/lib/auth/require-admin"

const mockCreateClient = vi.mocked(createClient)
const mockGetUserRole = vi.mocked(getUserRole)

describe("requireAdmin", () => {
  beforeEach(() => { vi.clearAllMocks() })

  it("인증되지 않으면 401을 반환한다", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: null }, error: null }) },
    } as unknown as Awaited<ReturnType<typeof mockCreateClient>>)
    const result = await requireAdmin()
    expect(result).toEqual({ ok: false, status: 401 })
  })

  it("ADMIN 역할이면 ok: true와 user를 반환한다", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } }, error: null }) },
    } as unknown as Awaited<ReturnType<typeof mockCreateClient>>)
    mockGetUserRole.mockResolvedValue("ADMIN")
    const result = await requireAdmin()
    expect(result).toEqual({ ok: true, user: { id: "u1", role: "ADMIN" } })
  })

  it("USER 역할이면 403을 반환한다", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } }, error: null }) },
    } as unknown as Awaited<ReturnType<typeof mockCreateClient>>)
    mockGetUserRole.mockResolvedValue("USER")
    const result = await requireAdmin()
    expect(result).toEqual({ ok: false, status: 403 })
  })
})
