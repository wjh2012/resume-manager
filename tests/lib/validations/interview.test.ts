import { describe, it, expect } from "vitest"
import {
  createInterviewSchema,
  updateInterviewSchema,
  interviewChatSchema,
} from "@/lib/validations/interview"

const VALID_UUID = "a0000000-0000-4000-8000-000000000001"

describe("createInterviewSchema", () => {
  it("필수 필드가 모두 있으면 통과해야 한다", () => {
    const result = createInterviewSchema.safeParse({
      title: "카카오 모의면접",
      documentIds: [VALID_UUID],
    })
    expect(result.success).toBe(true)
  })

  it("title이 없으면 실패해야 한다", () => {
    const result = createInterviewSchema.safeParse({
      documentIds: [VALID_UUID],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("제목을 입력해주세요.")
  })

  it("documentIds가 비어있으면 실패해야 한다", () => {
    const result = createInterviewSchema.safeParse({
      title: "테스트",
      documentIds: [],
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe("최소 1개의 문서를 선택해주세요.")
  })

  it("documentIds에 유효하지 않은 UUID가 있으면 실패해야 한다", () => {
    const result = createInterviewSchema.safeParse({
      title: "테스트",
      documentIds: ["not-a-uuid"],
    })
    expect(result.success).toBe(false)
  })

  it("companyName, position은 선택 사항이어야 한다", () => {
    const result = createInterviewSchema.safeParse({
      title: "테스트",
      companyName: "카카오",
      position: "백엔드 개발자",
      documentIds: [VALID_UUID],
    })
    expect(result.success).toBe(true)
    expect(result.data?.companyName).toBe("카카오")
  })

  it("title이 100자를 초과하면 실패해야 한다", () => {
    const result = createInterviewSchema.safeParse({
      title: "a".repeat(101),
      documentIds: [VALID_UUID],
    })
    expect(result.success).toBe(false)
  })
})

describe("updateInterviewSchema", () => {
  it("status: COMPLETED이면 통과해야 한다", () => {
    const result = updateInterviewSchema.safeParse({ status: "COMPLETED" })
    expect(result.success).toBe(true)
  })

  it("status: ACTIVE이면 실패해야 한다 (종료만 가능)", () => {
    const result = updateInterviewSchema.safeParse({ status: "ACTIVE" })
    expect(result.success).toBe(false)
  })
})

describe("interviewChatSchema", () => {
  it("필수 필드가 모두 있으면 통과해야 한다", () => {
    const result = interviewChatSchema.safeParse({
      messages: [{ id: "m1", role: "user", content: "안녕하세요" }],
      conversationId: VALID_UUID,
      interviewSessionId: VALID_UUID,
    })
    expect(result.success).toBe(true)
  })

  it("messages가 비어있으면 실패해야 한다", () => {
    const result = interviewChatSchema.safeParse({
      messages: [],
      conversationId: VALID_UUID,
      interviewSessionId: VALID_UUID,
    })
    expect(result.success).toBe(false)
  })

  it("conversationId가 UUID 형식이 아니면 실패해야 한다", () => {
    const result = interviewChatSchema.safeParse({
      messages: [{ id: "m1", role: "user", content: "테스트" }],
      conversationId: "not-a-uuid",
      interviewSessionId: VALID_UUID,
    })
    expect(result.success).toBe(false)
  })
})
