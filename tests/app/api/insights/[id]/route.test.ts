// tests/app/api/insights/[id]/route.test.ts
import { describe, expect, it, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "user-1" } },
      }),
    },
  }),
}))

const mockUpdate = vi.fn()
const mockDelete = vi.fn()
vi.mock("@/lib/insights/service", () => ({
  updateInsight: (...args: unknown[]) => mockUpdate(...args),
  deleteInsight: (...args: unknown[]) => mockDelete(...args),
  InsightNotFoundError: class extends Error {
    constructor() { super("not found") }
  },
  InsightForbiddenError: class extends Error {
    constructor() { super("forbidden") }
  },
}))

import { PUT, DELETE } from "@/app/api/insights/[id]/route"

const validId = "550e8400-e29b-41d4-a716-446655440000"
const params = Promise.resolve({ id: validId })

describe("PUT /api/insights/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("updates insight on valid input", async () => {
    mockUpdate.mockResolvedValue(undefined)

    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({
        title: "updated title",
        content: "updated content",
        category: "skill",
      }),
    })

    const res = await PUT(req, { params })
    expect(res.status).toBe(200)
    expect(mockUpdate).toHaveBeenCalledWith("user-1", validId, {
      title: "updated title",
      content: "updated content",
      category: "skill",
    })
  })

  it("returns 400 for invalid UUID", async () => {
    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ title: "t", content: "c", category: "skill" }),
    })

    const res = await PUT(req, { params: Promise.resolve({ id: "bad-id" }) })
    expect(res.status).toBe(400)
  })

  it("returns 400 for invalid body", async () => {
    const req = new Request("http://localhost", {
      method: "PUT",
      body: JSON.stringify({ title: "", content: "c", category: "skill" }),
    })

    const res = await PUT(req, { params })
    expect(res.status).toBe(400)
  })
})

describe("DELETE /api/insights/[id]", () => {
  beforeEach(() => vi.clearAllMocks())

  it("deletes insight on valid id", async () => {
    mockDelete.mockResolvedValue(undefined)

    const req = new Request("http://localhost", { method: "DELETE" })
    const res = await DELETE(req, { params })
    expect(res.status).toBe(204)
  })

  it("returns 400 for invalid UUID", async () => {
    const req = new Request("http://localhost", { method: "DELETE" })
    const res = await DELETE(req, { params: Promise.resolve({ id: "bad" }) })
    expect(res.status).toBe(400)
  })
})
