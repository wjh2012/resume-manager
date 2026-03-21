import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}))

import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { requireAdmin } from "@/lib/auth/require-admin"

const mockCreateClient = vi.mocked(createClient)
const mockFindUnique = vi.mocked(prisma.user.findUnique)

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
    mockFindUnique.mockResolvedValue({ id: "u1", role: "ADMIN" } as unknown as Awaited<ReturnType<typeof mockFindUnique>>)
    const result = await requireAdmin()
    expect(result).toEqual({ ok: true, user: { id: "u1", role: "ADMIN" } })
  })

  it("USER 역할이면 403을 반환한다", async () => {
    mockCreateClient.mockResolvedValue({
      auth: { getUser: () => Promise.resolve({ data: { user: { id: "u1" } }, error: null }) },
    } as unknown as Awaited<ReturnType<typeof mockCreateClient>>)
    mockFindUnique.mockResolvedValue({ id: "u1", role: "USER" } as unknown as Awaited<ReturnType<typeof mockFindUnique>>)
    const result = await requireAdmin()
    expect(result).toEqual({ ok: false, status: 403 })
  })
})
