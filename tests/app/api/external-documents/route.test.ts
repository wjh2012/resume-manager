import { describe, it, expect, vi, beforeEach } from "vitest"

// ─── 외부 의존성 mock (vi.mock은 호이스팅되어 import 전에 실행됨) ─────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}))

vi.mock("@/lib/external-documents/service", () => ({
  createExternalDocumentFromText: vi.fn(),
  createExternalDocumentFromFile: vi.fn(),
  listExternalDocuments: vi.fn(),
  getExternalDocument: vi.fn(),
  updateExternalDocument: vi.fn(),
  deleteExternalDocument: vi.fn(),
  ExternalDocumentNotFoundError: class ExternalDocumentNotFoundError extends Error {
    constructor() {
      super("외부 문서를 찾을 수 없습니다.")
    }
  },
  ExternalDocumentForbiddenError: class ExternalDocumentForbiddenError extends Error {
    constructor() {
      super("이 외부 문서에 대한 권한이 없습니다.")
    }
  },
  ExternalDocumentValidationError: class ExternalDocumentValidationError extends Error {
    constructor(message: string) {
      super(message)
    }
  },
}))

// ─── 실제 모듈 import ─────────────────────────────────────────────────────────

import { POST, GET } from "@/app/api/external-documents/route"
import { GET as GET_BY_ID, PATCH, DELETE } from "@/app/api/external-documents/[id]/route"
import { createClient } from "@/lib/supabase/server"
import {
  createExternalDocumentFromText,
  createExternalDocumentFromFile,
  listExternalDocuments,
  getExternalDocument,
  updateExternalDocument,
  deleteExternalDocument,
  ExternalDocumentNotFoundError,
  ExternalDocumentForbiddenError,
} from "@/lib/external-documents/service"

// ─── mock 타입 캐스팅 헬퍼 ───────────────────────────────────────────────────

const mockCreateClient = vi.mocked(createClient)
const mockCreateFromText = vi.mocked(createExternalDocumentFromText)
const mockCreateFromFile = vi.mocked(createExternalDocumentFromFile)
const mockList = vi.mocked(listExternalDocuments)
const mockGetById = vi.mocked(getExternalDocument)
const mockUpdate = vi.mocked(updateExternalDocument)
const mockDelete = vi.mocked(deleteExternalDocument)

// ─── 상수 픽스처 ──────────────────────────────────────────────────────────────

const VALID_USER_ID = "a0000000-0000-4000-8000-000000000001"
const VALID_DOC_ID = "c0000000-0000-4000-8000-000000000001"

const CREATED_RESULT = { id: VALID_DOC_ID, title: "채용공고", sourceType: "text" }

// ─── 헬퍼 함수 ────────────────────────────────────────────────────────────────

function makeSupabaseMock(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

function makeJsonRequest(url: string, method: string, body: unknown): Request {
  return new Request(url, {
    method,
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  })
}

function makeFormDataRequest(url: string, file: File, title: string, category?: string): Request {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("title", title)
  if (category !== undefined) formData.append("category", category)
  return new Request(url, { method: "POST", body: formData })
}

const params = (id: string) => Promise.resolve({ id })

// ─── beforeEach ───────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks()
  mockCreateClient.mockResolvedValue(
    makeSupabaseMock({ id: VALID_USER_ID }) as never,
  )
  mockCreateFromText.mockResolvedValue(CREATED_RESULT as never)
  mockCreateFromFile.mockResolvedValue(CREATED_RESULT as never)
  mockList.mockResolvedValue([] as never)
  mockGetById.mockResolvedValue(null as never)
  mockUpdate.mockResolvedValue(CREATED_RESULT as never)
  mockDelete.mockResolvedValue(undefined as never)
})

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/external-documents
// ─────────────────────────────────────────────────────────────────────────────

describe("POST /api/external-documents", () => {
  describe("인증이 없을 때", () => {
    it("401을 반환해야 한다", async () => {
      mockCreateClient.mockResolvedValue(makeSupabaseMock(null) as never)
      const request = makeJsonRequest(
        "http://localhost/api/external-documents",
        "POST",
        { title: "채용공고", content: "내용" },
      )
      const response = await POST(request)
      const body = await response.json()
      expect(response.status).toBe(401)
      expect(body).toEqual({ error: "인증이 필요합니다." })
    })
  })

  // ── 텍스트(JSON) 경로 ──────────────────────────────────────────────────────
  describe("텍스트 입력(JSON)일 때", () => {
    it("201과 생성된 문서를 반환해야 한다", async () => {
      const request = makeJsonRequest(
        "http://localhost/api/external-documents",
        "POST",
        { title: "채용공고", content: "프론트엔드 개발자 모집..." },
      )
      const response = await POST(request)
      const body = await response.json()
      expect(response.status).toBe(201)
      expect(body).toEqual(CREATED_RESULT)
    })

    it("createExternalDocumentFromText를 올바른 인자로 호출해야 한다", async () => {
      const data = { title: "채용공고", content: "프론트엔드 개발자 모집...", category: "채용공고" }
      const request = makeJsonRequest(
        "http://localhost/api/external-documents",
        "POST",
        data,
      )
      await POST(request)
      expect(mockCreateFromText).toHaveBeenCalledWith(VALID_USER_ID, data)
    })

    it("JSON 파싱 실패 시 400을 반환해야 한다", async () => {
      const request = new Request("http://localhost/api/external-documents", {
        method: "POST",
        body: "{ invalid json }",
        headers: { "Content-Type": "application/json" },
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it("title이 없으면 400을 반환해야 한다", async () => {
      const request = makeJsonRequest(
        "http://localhost/api/external-documents",
        "POST",
        { content: "내용만 있음" },
      )
      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it("content가 없으면 400을 반환해야 한다", async () => {
      const request = makeJsonRequest(
        "http://localhost/api/external-documents",
        "POST",
        { title: "제목만 있음" },
      )
      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it("알 수 없는 에러 발생 시 500을 반환해야 한다", async () => {
      mockCreateFromText.mockRejectedValue(new Error("DB 연결 실패"))
      const request = makeJsonRequest(
        "http://localhost/api/external-documents",
        "POST",
        { title: "채용공고", content: "내용" },
      )
      const response = await POST(request)
      expect(response.status).toBe(500)
    })
  })

  // ── 파일 업로드(FormData) 경로 ─────────────────────────────────────────────
  describe("파일 업로드(FormData)일 때", () => {
    it("201과 생성된 문서를 반환해야 한다", async () => {
      const file = new File(["dummy pdf content"], "job.pdf", { type: "application/pdf" })
      const request = makeFormDataRequest(
        "http://localhost/api/external-documents",
        file,
        "채용공고 PDF",
      )
      const response = await POST(request)
      const body = await response.json()
      expect(response.status).toBe(201)
      expect(body).toEqual(CREATED_RESULT)
    })

    it("createExternalDocumentFromFile을 올바른 인자로 호출해야 한다", async () => {
      const file = new File(["dummy"], "job.pdf", { type: "application/pdf" })
      const request = makeFormDataRequest(
        "http://localhost/api/external-documents",
        file,
        "채용공고 PDF",
        "채용공고",
      )
      await POST(request)
      expect(mockCreateFromFile).toHaveBeenCalledWith(
        VALID_USER_ID,
        expect.anything(),
        "채용공고 PDF",
        "채용공고",
      )
    })

    it("파일이 없으면 400을 반환해야 한다", async () => {
      const formData = new FormData()
      formData.append("title", "제목")
      const request = new Request("http://localhost/api/external-documents", {
        method: "POST",
        body: formData,
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
    })

    it("title이 없으면 400을 반환해야 한다", async () => {
      const file = new File(["dummy"], "job.pdf", { type: "application/pdf" })
      const formData = new FormData()
      formData.append("file", file)
      const request = new Request("http://localhost/api/external-documents", {
        method: "POST",
        body: formData,
      })
      const response = await POST(request)
      expect(response.status).toBe(400)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/external-documents
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/external-documents", () => {
  describe("인증이 없을 때", () => {
    it("401을 반환해야 한다", async () => {
      mockCreateClient.mockResolvedValue(makeSupabaseMock(null) as never)
      const request = new Request("http://localhost/api/external-documents")
      const response = await GET(request)
      expect(response.status).toBe(401)
    })
  })

  describe("성공적으로 처리될 때", () => {
    it("200과 문서 목록을 반환해야 한다", async () => {
      const mockDocuments = [
        { id: VALID_DOC_ID, title: "채용공고", category: "채용공고", sourceType: "text", createdAt: new Date() },
      ]
      mockList.mockResolvedValue(mockDocuments as never)
      const request = new Request("http://localhost/api/external-documents")
      const response = await GET(request)
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body).toHaveLength(1)
    })

    it("빈 목록도 200으로 반환해야 한다", async () => {
      mockList.mockResolvedValue([] as never)
      const request = new Request("http://localhost/api/external-documents")
      const response = await GET(request)
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body).toEqual([])
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/external-documents/[id]
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/external-documents/[id]", () => {
  describe("인증이 없을 때", () => {
    it("401을 반환해야 한다", async () => {
      mockCreateClient.mockResolvedValue(makeSupabaseMock(null) as never)
      const request = new Request(`http://localhost/api/external-documents/${VALID_DOC_ID}`)
      const response = await GET_BY_ID(request, { params: params(VALID_DOC_ID) })
      expect(response.status).toBe(401)
    })
  })

  describe("UUID가 유효하지 않을 때", () => {
    it("400을 반환해야 한다", async () => {
      const request = new Request("http://localhost/api/external-documents/bad-id")
      const response = await GET_BY_ID(request, { params: params("bad-id") })
      expect(response.status).toBe(400)
    })
  })

  describe("문서가 없을 때", () => {
    it("404를 반환해야 한다", async () => {
      mockGetById.mockResolvedValue(null as never)
      const request = new Request(`http://localhost/api/external-documents/${VALID_DOC_ID}`)
      const response = await GET_BY_ID(request, { params: params(VALID_DOC_ID) })
      expect(response.status).toBe(404)
    })
  })

  describe("성공적으로 처리될 때", () => {
    it("200과 문서를 반환해야 한다", async () => {
      const mockDocument = { id: VALID_DOC_ID, title: "채용공고", userId: VALID_USER_ID }
      mockGetById.mockResolvedValue(mockDocument as never)
      const request = new Request(`http://localhost/api/external-documents/${VALID_DOC_ID}`)
      const response = await GET_BY_ID(request, { params: params(VALID_DOC_ID) })
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body).toEqual(mockDocument)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/external-documents/[id]
// ─────────────────────────────────────────────────────────────────────────────

describe("PATCH /api/external-documents/[id]", () => {
  describe("인증이 없을 때", () => {
    it("401을 반환해야 한다", async () => {
      mockCreateClient.mockResolvedValue(makeSupabaseMock(null) as never)
      const request = makeJsonRequest(
        `http://localhost/api/external-documents/${VALID_DOC_ID}`,
        "PATCH",
        { title: "수정된 제목" },
      )
      const response = await PATCH(request, { params: params(VALID_DOC_ID) })
      expect(response.status).toBe(401)
    })
  })

  describe("UUID가 유효하지 않을 때", () => {
    it("400을 반환해야 한다", async () => {
      const request = makeJsonRequest(
        "http://localhost/api/external-documents/bad-id",
        "PATCH",
        { title: "수정된 제목" },
      )
      const response = await PATCH(request, { params: params("bad-id") })
      expect(response.status).toBe(400)
    })
  })

  describe("JSON 파싱 실패 시", () => {
    it("400을 반환해야 한다", async () => {
      const request = new Request(
        `http://localhost/api/external-documents/${VALID_DOC_ID}`,
        {
          method: "PATCH",
          body: "{ invalid }",
          headers: { "Content-Type": "application/json" },
        },
      )
      const response = await PATCH(request, { params: params(VALID_DOC_ID) })
      expect(response.status).toBe(400)
    })
  })

  describe("성공적으로 처리될 때", () => {
    it("200과 수정된 문서를 반환해야 한다", async () => {
      const updated = { id: VALID_DOC_ID, title: "수정된 제목", category: "", sourceType: "text" }
      mockUpdate.mockResolvedValue(updated as never)
      const request = makeJsonRequest(
        `http://localhost/api/external-documents/${VALID_DOC_ID}`,
        "PATCH",
        { title: "수정된 제목" },
      )
      const response = await PATCH(request, { params: params(VALID_DOC_ID) })
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body).toEqual(updated)
    })
  })

  describe("권한이 없을 때", () => {
    it("403을 반환해야 한다", async () => {
      mockUpdate.mockRejectedValue(new ExternalDocumentForbiddenError())
      const request = makeJsonRequest(
        `http://localhost/api/external-documents/${VALID_DOC_ID}`,
        "PATCH",
        { title: "수정" },
      )
      const response = await PATCH(request, { params: params(VALID_DOC_ID) })
      expect(response.status).toBe(403)
    })
  })

  describe("문서가 없을 때", () => {
    it("404를 반환해야 한다", async () => {
      mockUpdate.mockRejectedValue(new ExternalDocumentNotFoundError())
      const request = makeJsonRequest(
        `http://localhost/api/external-documents/${VALID_DOC_ID}`,
        "PATCH",
        { title: "수정" },
      )
      const response = await PATCH(request, { params: params(VALID_DOC_ID) })
      expect(response.status).toBe(404)
    })
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/external-documents/[id]
// ─────────────────────────────────────────────────────────────────────────────

describe("DELETE /api/external-documents/[id]", () => {
  describe("인증이 없을 때", () => {
    it("401을 반환해야 한다", async () => {
      mockCreateClient.mockResolvedValue(makeSupabaseMock(null) as never)
      const request = new Request(`http://localhost/api/external-documents/${VALID_DOC_ID}`, {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: params(VALID_DOC_ID) })
      expect(response.status).toBe(401)
    })
  })

  describe("UUID가 유효하지 않을 때", () => {
    it("400을 반환해야 한다", async () => {
      const request = new Request("http://localhost/api/external-documents/bad-id", {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: params("bad-id") })
      expect(response.status).toBe(400)
    })
  })

  describe("성공적으로 처리될 때", () => {
    it("200과 { success: true }를 반환해야 한다", async () => {
      const request = new Request(`http://localhost/api/external-documents/${VALID_DOC_ID}`, {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: params(VALID_DOC_ID) })
      const body = await response.json()
      expect(response.status).toBe(200)
      expect(body).toEqual({ success: true })
    })

    it("deleteExternalDocument를 올바른 인자로 호출해야 한다", async () => {
      const request = new Request(`http://localhost/api/external-documents/${VALID_DOC_ID}`, {
        method: "DELETE",
      })
      await DELETE(request, { params: params(VALID_DOC_ID) })
      expect(mockDelete).toHaveBeenCalledWith(VALID_DOC_ID, VALID_USER_ID)
    })
  })

  describe("문서가 없을 때", () => {
    it("404를 반환해야 한다", async () => {
      mockDelete.mockRejectedValue(new ExternalDocumentNotFoundError())
      const request = new Request(`http://localhost/api/external-documents/${VALID_DOC_ID}`, {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: params(VALID_DOC_ID) })
      expect(response.status).toBe(404)
    })
  })

  describe("권한이 없을 때", () => {
    it("403을 반환해야 한다", async () => {
      mockDelete.mockRejectedValue(new ExternalDocumentForbiddenError())
      const request = new Request(`http://localhost/api/external-documents/${VALID_DOC_ID}`, {
        method: "DELETE",
      })
      const response = await DELETE(request, { params: params(VALID_DOC_ID) })
      expect(response.status).toBe(403)
    })
  })
})
