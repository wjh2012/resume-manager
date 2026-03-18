import { describe, it, expect } from "vitest"
import {
  createCoverLetterSchema,
  updateCoverLetterSchema,
  coverLetterChatSchema,
  updateSelectedDocumentsSchema,
} from "@/lib/validations/cover-letter"

const VALID_UUID = "550e8400-e29b-41d4-a716-446655440000"
const VALID_UUID_2 = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"

// ────────────────────────────────────────────────────────────
// createCoverLetterSchema
// ────────────────────────────────────────────────────────────
describe("createCoverLetterSchema", () => {
  describe("유효한 데이터", () => {
    it("필수 필드만 있으면 통과해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "카카오 자기소개서",
        companyName: "카카오",
        position: "백엔드 개발자",
      })
      expect(result.success).toBe(true)
    })

    it("선택 필드(jobPostingText, selectedDocumentIds)가 포함되어도 통과해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "네이버 자기소개서",
        companyName: "네이버",
        position: "프론트엔드 개발자",
        jobPostingText: "서울 소재 IT 기업에서 프론트엔드 개발자를 모집합니다.",
        selectedDocumentIds: [VALID_UUID, VALID_UUID_2],
      })
      expect(result.success).toBe(true)
    })

    it("selectedDocumentIds가 빈 배열이어도 통과해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "라인 자기소개서",
        companyName: "라인",
        position: "iOS 개발자",
        selectedDocumentIds: [],
      })
      expect(result.success).toBe(true)
    })

    it("title이 정확히 100자이면 통과해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "가".repeat(100),
        companyName: "테스트",
        position: "개발자",
      })
      expect(result.success).toBe(true)
    })

    it("jobPostingText가 정확히 10000자이면 통과해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "제목",
        companyName: "회사",
        position: "직무",
        jobPostingText: "가".repeat(10000),
      })
      expect(result.success).toBe(true)
    })
  })

  describe("필수 필드 누락", () => {
    it("title이 없으면 실패해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        companyName: "카카오",
        position: "백엔드 개발자",
      })
      expect(result.success).toBe(false)
    })

    it("companyName이 없으면 실패해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "자기소개서",
        position: "백엔드 개발자",
      })
      expect(result.success).toBe(false)
    })

    it("position이 없으면 실패해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "자기소개서",
        companyName: "카카오",
      })
      expect(result.success).toBe(false)
    })
  })

  describe("빈 문자열 처리", () => {
    it("title이 빈 문자열이면 실패해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "",
        companyName: "카카오",
        position: "백엔드 개발자",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("제목을 입력해주세요.")
      }
    })

    it("companyName이 빈 문자열이면 실패해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "자기소개서",
        companyName: "",
        position: "백엔드 개발자",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("기업명을 입력해주세요.")
      }
    })

    it("position이 빈 문자열이면 실패해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "자기소개서",
        companyName: "카카오",
        position: "",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("직무를 입력해주세요.")
      }
    })
  })

  describe("최대 길이 초과", () => {
    it("title이 101자이면 실패해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "가".repeat(101),
        companyName: "카카오",
        position: "개발자",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("제목은 100자 이하로 입력해주세요.")
      }
    })

    it("companyName이 101자이면 실패해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "제목",
        companyName: "가".repeat(101),
        position: "개발자",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("기업명은 100자 이하로 입력해주세요.")
      }
    })

    it("position이 101자이면 실패해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "제목",
        companyName: "카카오",
        position: "가".repeat(101),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("직무는 100자 이하로 입력해주세요.")
      }
    })

    it("jobPostingText가 10001자이면 실패해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "제목",
        companyName: "카카오",
        position: "개발자",
        jobPostingText: "가".repeat(10001),
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("채용공고는 10,000자 이하로 입력해주세요.")
      }
    })
  })

  describe("잘못된 타입", () => {
    it("title이 숫자이면 실패해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: 123,
        companyName: "카카오",
        position: "개발자",
      })
      expect(result.success).toBe(false)
    })

    it("selectedDocumentIds 항목이 유효하지 않은 UUID이면 실패해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "제목",
        companyName: "카카오",
        position: "개발자",
        selectedDocumentIds: ["not-a-uuid"],
      })
      expect(result.success).toBe(false)
    })

    it("selectedDocumentIds가 배열이 아니면 실패해야 한다", () => {
      const result = createCoverLetterSchema.safeParse({
        title: "제목",
        companyName: "카카오",
        position: "개발자",
        selectedDocumentIds: VALID_UUID,
      })
      expect(result.success).toBe(false)
    })
  })
})

// ────────────────────────────────────────────────────────────
// updateCoverLetterSchema
// ────────────────────────────────────────────────────────────
describe("updateCoverLetterSchema", () => {
  describe("유효한 데이터", () => {
    it("모든 필드가 선택적이므로 빈 객체도 통과해야 한다", () => {
      const result = updateCoverLetterSchema.safeParse({})
      expect(result.success).toBe(true)
    })

    it("title만 있어도 통과해야 한다", () => {
      const result = updateCoverLetterSchema.safeParse({ title: "수정된 제목" })
      expect(result.success).toBe(true)
    })

    it("content만 있어도 통과해야 한다", () => {
      const result = updateCoverLetterSchema.safeParse({ content: "자기소개서 내용입니다." })
      expect(result.success).toBe(true)
    })

    it("status가 'DRAFT'이면 통과해야 한다", () => {
      const result = updateCoverLetterSchema.safeParse({ status: "DRAFT" })
      expect(result.success).toBe(true)
    })

    it("status가 'COMPLETED'이면 통과해야 한다", () => {
      const result = updateCoverLetterSchema.safeParse({ status: "COMPLETED" })
      expect(result.success).toBe(true)
    })

    it("모든 필드(title, content, status)가 있어도 통과해야 한다", () => {
      const result = updateCoverLetterSchema.safeParse({
        title: "최종 자기소개서",
        content: "자기소개서 내용입니다.",
        status: "COMPLETED",
      })
      expect(result.success).toBe(true)
    })
  })

  describe("title 유효성", () => {
    it("title이 빈 문자열이면 실패해야 한다", () => {
      const result = updateCoverLetterSchema.safeParse({ title: "" })
      expect(result.success).toBe(false)
    })

    it("title이 101자이면 실패해야 한다", () => {
      const result = updateCoverLetterSchema.safeParse({ title: "가".repeat(101) })
      expect(result.success).toBe(false)
    })

    it("title이 정확히 100자이면 통과해야 한다", () => {
      const result = updateCoverLetterSchema.safeParse({ title: "가".repeat(100) })
      expect(result.success).toBe(true)
    })
  })

  describe("status 열거형 유효성", () => {
    it("status가 허용되지 않은 값이면 실패해야 한다", () => {
      const result = updateCoverLetterSchema.safeParse({ status: "PUBLISHED" })
      expect(result.success).toBe(false)
    })

    it("status가 소문자 'draft'이면 실패해야 한다", () => {
      const result = updateCoverLetterSchema.safeParse({ status: "draft" })
      expect(result.success).toBe(false)
    })

    it("status가 소문자 'completed'이면 실패해야 한다", () => {
      const result = updateCoverLetterSchema.safeParse({ status: "completed" })
      expect(result.success).toBe(false)
    })
  })
})

// ────────────────────────────────────────────────────────────
// coverLetterChatSchema
// ────────────────────────────────────────────────────────────
describe("coverLetterChatSchema", () => {
  const validBase = {
    conversationId: VALID_UUID,
    coverLetterId: VALID_UUID_2,
    messages: [{ id: "msg-1", role: "user", content: "안녕하세요" }],
  }

  describe("유효한 데이터", () => {
    it("필수 필드만 있으면 통과해야 한다", () => {
      const result = coverLetterChatSchema.safeParse(validBase)
      expect(result.success).toBe(true)
    })

    it("selectedDocumentIds가 포함되어도 통과해야 한다", () => {
      const result = coverLetterChatSchema.safeParse({
        ...validBase,
        selectedDocumentIds: [VALID_UUID],
      })
      expect(result.success).toBe(true)
    })

    it("selectedDocumentIds가 빈 배열이어도 통과해야 한다", () => {
      const result = coverLetterChatSchema.safeParse({
        ...validBase,
        selectedDocumentIds: [],
      })
      expect(result.success).toBe(true)
    })

    it("messages에 user와 assistant 역할이 섞여 있어도 통과해야 한다", () => {
      const result = coverLetterChatSchema.safeParse({
        ...validBase,
        messages: [
          { id: "msg-1", role: "user", content: "질문입니다." },
          { id: "msg-2", role: "assistant", content: "답변입니다." },
          { id: "msg-3", role: "user", content: "추가 질문입니다." },
        ],
      })
      expect(result.success).toBe(true)
    })

    it("content가 없어도 빈 문자열로 기본값 처리되어 통과해야 한다", () => {
      const result = coverLetterChatSchema.safeParse({
        ...validBase,
        messages: [{ id: "msg-1", role: "user" }],
      })
      expect(result.success).toBe(true)
    })

    it("parts 필드가 포함되어도 통과해야 한다", () => {
      const result = coverLetterChatSchema.safeParse({
        ...validBase,
        messages: [{ id: "msg-1", role: "user", content: "안녕", parts: [{ type: "text", text: "안녕" }] }],
      })
      expect(result.success).toBe(true)
    })
  })

  describe("UUID 유효성", () => {
    it("conversationId가 유효하지 않은 UUID이면 실패해야 한다", () => {
      const result = coverLetterChatSchema.safeParse({
        ...validBase,
        conversationId: "not-a-uuid",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("유효하지 않은 대화 ID입니다.")
      }
    })

    it("coverLetterId가 유효하지 않은 UUID이면 실패해야 한다", () => {
      const result = coverLetterChatSchema.safeParse({
        ...validBase,
        coverLetterId: "bad-id",
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("유효하지 않은 자기소개서 ID입니다.")
      }
    })

    it("selectedDocumentIds 항목이 유효하지 않은 UUID이면 실패해야 한다", () => {
      const result = coverLetterChatSchema.safeParse({
        ...validBase,
        selectedDocumentIds: ["not-a-uuid"],
      })
      expect(result.success).toBe(false)
    })
  })

  describe("messages 유효성", () => {
    it("messages가 빈 배열이면 실패해야 한다", () => {
      const result = coverLetterChatSchema.safeParse({
        ...validBase,
        messages: [],
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        const messages = result.error.issues.map((i) => i.message)
        expect(messages).toContain("메시지가 필요합니다.")
      }
    })

    it("메시지 id가 없으면 실패해야 한다", () => {
      const result = coverLetterChatSchema.safeParse({
        ...validBase,
        messages: [{ role: "user", content: "내용" }],
      })
      expect(result.success).toBe(false)
    })

    it("메시지 role이 허용되지 않은 값이면 실패해야 한다", () => {
      const result = coverLetterChatSchema.safeParse({
        ...validBase,
        messages: [{ id: "msg-1", role: "system", content: "시스템 메시지" }],
      })
      expect(result.success).toBe(false)
    })

    it("메시지 role이 없으면 실패해야 한다", () => {
      const result = coverLetterChatSchema.safeParse({
        ...validBase,
        messages: [{ id: "msg-1", content: "내용만 있음" }],
      })
      expect(result.success).toBe(false)
    })

    it("메시지 id가 없으면 실패해야 한다 (role만 있는 경우)", () => {
      const result = coverLetterChatSchema.safeParse({
        ...validBase,
        messages: [{ role: "user" }],
      })
      expect(result.success).toBe(false)
    })
  })

  describe("필수 필드 누락", () => {
    it("conversationId가 없으면 실패해야 한다", () => {
      const { conversationId: _conversationId, ...rest } = validBase
      const result = coverLetterChatSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it("coverLetterId가 없으면 실패해야 한다", () => {
      const { coverLetterId: _coverLetterId, ...rest } = validBase
      const result = coverLetterChatSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })

    it("messages가 없으면 실패해야 한다", () => {
      const { messages: _messages, ...rest } = validBase
      const result = coverLetterChatSchema.safeParse(rest)
      expect(result.success).toBe(false)
    })
  })
})

// ────────────────────────────────────────────────────────────
// updateSelectedDocumentsSchema
// ────────────────────────────────────────────────────────────
describe("updateSelectedDocumentsSchema", () => {
  describe("유효한 데이터", () => {
    it("유효한 UUID 배열이면 통과해야 한다", () => {
      const result = updateSelectedDocumentsSchema.safeParse({
        documentIds: [VALID_UUID, VALID_UUID_2],
      })
      expect(result.success).toBe(true)
    })

    it("빈 배열이어도 통과해야 한다", () => {
      const result = updateSelectedDocumentsSchema.safeParse({ documentIds: [] })
      expect(result.success).toBe(true)
    })

    it("단일 UUID를 가진 배열이면 통과해야 한다", () => {
      const result = updateSelectedDocumentsSchema.safeParse({ documentIds: [VALID_UUID] })
      expect(result.success).toBe(true)
    })
  })

  describe("잘못된 데이터", () => {
    it("documentIds가 없으면 실패해야 한다", () => {
      const result = updateSelectedDocumentsSchema.safeParse({})
      expect(result.success).toBe(false)
    })

    it("documentIds 항목이 유효하지 않은 UUID이면 실패해야 한다", () => {
      const result = updateSelectedDocumentsSchema.safeParse({
        documentIds: ["not-a-uuid"],
      })
      expect(result.success).toBe(false)
    })

    it("documentIds 항목이 혼합되어 있을 때 유효하지 않은 UUID가 포함되면 실패해야 한다", () => {
      const result = updateSelectedDocumentsSchema.safeParse({
        documentIds: [VALID_UUID, "invalid-uuid"],
      })
      expect(result.success).toBe(false)
    })

    it("documentIds가 배열이 아니면 실패해야 한다", () => {
      const result = updateSelectedDocumentsSchema.safeParse({ documentIds: VALID_UUID })
      expect(result.success).toBe(false)
    })

    it("documentIds가 문자열 배열이지만 UUID 형식이 아니면 실패해야 한다", () => {
      const result = updateSelectedDocumentsSchema.safeParse({
        documentIds: ["abc", "def"],
      })
      expect(result.success).toBe(false)
    })
  })
})
