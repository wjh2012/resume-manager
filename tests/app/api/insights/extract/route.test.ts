// tests/app/api/insights/extract/route.test.ts
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

const mockExtract = vi.fn()
vi.mock("@/lib/insights/service", () => ({
  extractInsights: (...args: unknown[]) => mockExtract(...args),
  InsightNotFoundError: class extends Error {
    constructor() { super("not found") }
  },
  InsightForbiddenError: class extends Error {
    constructor() { super("forbidden") }
  },
}))

vi.mock("@/lib/ai/provider", () => ({
  AiSettingsNotFoundError: class extends Error {
    constructor() { super("AI 설정이 완료되지 않았습니다.") }
  },
}))

import { POST } from "@/app/api/insights/extract/route"
import { AiSettingsNotFoundError } from "@/lib/ai/provider"

describe("POST /api/insights/extract", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("returns extracted insights on success", async () => {
    const mockInsights = [{ id: "1", title: "test", category: "strength" }]
    mockExtract.mockResolvedValue(mockInsights)

    const req = new Request("http://localhost/api/insights/extract", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.insights).toEqual(mockInsights)
  })

  it("returns 400 for invalid body", async () => {
    const req = new Request("http://localhost/api/insights/extract", {
      method: "POST",
      body: JSON.stringify({ conversationId: "not-uuid" }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 for malformed JSON", async () => {
    const req = new Request("http://localhost/api/insights/extract", {
      method: "POST",
      body: "not json",
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it("returns 400 for AiSettingsNotFoundError", async () => {
    mockExtract.mockRejectedValue(new AiSettingsNotFoundError())

    const req = new Request("http://localhost/api/insights/extract", {
      method: "POST",
      body: JSON.stringify({
        conversationId: "550e8400-e29b-41d4-a716-446655440000",
      }),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
