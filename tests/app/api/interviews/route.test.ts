import { describe, it, expect, vi, beforeEach } from "vitest"

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/interviews/service", () => ({
  createInterview: vi.fn(),
  InterviewForbiddenError: class InterviewForbiddenError extends Error {
    constructor() {
      super("이 면접 세션에 대한 권한이 없습니다.")
    }
  },
}))

vi.mock("@ai-sdk/openai", () => ({
  openai: { embedding: vi.fn().mockReturnValue({ modelId: "text-embedding-3-small" }) },
}))
vi.mock("ai", () => ({
  embedMany: vi.fn().mockResolvedValue({ embeddings: [] }),
  streamText: vi.fn(),
  convertToModelMessages: vi.fn(),
}))

import { POST } from "@/app/api/interviews/route"
import { createClient } from "@/lib/supabase/server"
import { createInterview, InterviewForbiddenError } from "@/lib/interviews/service"

const mockCreateClient = vi.mocked(createClient)
const mockCreateInterview = vi.mocked(createInterview)

const VALID_USER_ID = "a0000000-0000-4000-8000-000000000001"
const VALID_DOC_ID = "c0000000-0000-4000-8000-000000000001"
const CREATED_SESSION_ID = "d0000000-0000-4000-8000-000000000001"

const VALID_BODY = {
  title: "카카오 모의면접",
  documentIds: [VALID_DOC_ID],
}

function makeSupabaseMock(user: { id: string } | null) {
  return { auth: { getUser: vi.fn().mockResolvedValue({ data: { user } }) } }
}

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/interviews", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateClient.mockResolvedValue(makeSupabaseMock({ id: VALID_USER_ID }) as never)
  mockCreateInterview.mockResolvedValue({ id: CREATED_SESSION_ID } as never)
})

describe("POST /api/interviews", () => {
  describe("인증이 없을 때", () => {
    it("401을 반환해야 한다", async () => {
      mockCreateClient.mockResolvedValue(makeSupabaseMock(null) as never)
      const response = await POST(makeRequest(VALID_BODY))
      expect(response.status).toBe(401)
    })
  })

  describe("요청 본문이 잘못됐을 때", () => {
    it("JSON 파싱 실패 시 400을 반환해야 한다", async () => {
      const req = new Request("http://localhost/api/interviews", {
        method: "POST",
        body: "not-json",
        headers: { "Content-Type": "application/json" },
      })
      const response = await POST(req)
      expect(response.status).toBe(400)
    })

    it("title이 없으면 400을 반환해야 한다", async () => {
      const response = await POST(makeRequest({ documentIds: [VALID_DOC_ID] }))
      expect(response.status).toBe(400)
    })

    it("documentIds가 비어있으면 400을 반환해야 한다", async () => {
      const response = await POST(makeRequest({ title: "테스트", documentIds: [] }))
      expect(response.status).toBe(400)
    })
  })

  describe("정상 요청일 때", () => {
    it("201과 생성된 세션 ID를 반환해야 한다", async () => {
      const response = await POST(makeRequest(VALID_BODY))
      const body = await response.json()
      expect(response.status).toBe(201)
      expect(body).toEqual({ id: CREATED_SESSION_ID })
    })

    it("createInterview를 올바른 인자로 호출해야 한다", async () => {
      await POST(makeRequest(VALID_BODY))
      expect(mockCreateInterview).toHaveBeenCalledWith(VALID_USER_ID, {
        title: VALID_BODY.title,
        documentIds: VALID_BODY.documentIds,
      })
    })
  })

  describe("서비스 에러일 때", () => {
    it("InterviewForbiddenError이면 403을 반환해야 한다", async () => {
      mockCreateInterview.mockRejectedValue(new InterviewForbiddenError())
      const response = await POST(makeRequest(VALID_BODY))
      expect(response.status).toBe(403)
    })
  })
})
