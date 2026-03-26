import { z } from "zod"

export const createInterviewSchema = z.object({
  title: z
    .string({ error: "제목을 입력해주세요." })
    .min(1, "제목을 입력해주세요.")
    .max(100, "제목은 100자 이하로 입력해주세요."),
  companyName: z
    .string()
    .max(100, "기업명은 100자 이하로 입력해주세요.")
    .optional(),
  position: z
    .string()
    .max(100, "직무는 100자 이하로 입력해주세요.")
    .optional(),
  documentIds: z
    .array(z.string().uuid())
    .min(1, "최소 1개의 문서를 선택해주세요.")
    .max(50),
  selectedExternalDocumentIds: z.array(z.string().uuid()).max(50).optional(),
})

export const updateInterviewSchema = z.object({
  status: z.literal("COMPLETED"),
})

export const interviewChatSchema = z.object({
  messages: z
    .array(
      z.object({
        id: z.string(),
        role: z.enum(["user", "assistant"]),
        content: z.string().optional().default(""),
        parts: z.array(z.any()).optional(),
      }),
    )
    .min(1, "메시지가 필요합니다."),
  conversationId: z.string().uuid("유효하지 않은 대화 ID입니다."),
  interviewSessionId: z.string().uuid("유효하지 않은 면접 세션 ID입니다."),
})
