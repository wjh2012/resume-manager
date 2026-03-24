import { z } from "zod"

export const createCoverLetterSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요.").max(100, "제목은 100자 이하로 입력해주세요."),
  companyName: z.string().min(1, "기업명을 입력해주세요.").max(100, "기업명은 100자 이하로 입력해주세요."),
  position: z.string().min(1, "직무를 입력해주세요.").max(100, "직무는 100자 이하로 입력해주세요."),
  selectedDocumentIds: z.array(z.string().uuid()).optional(),
  selectedExternalDocumentIds: z.array(z.string().uuid()).optional(),
})

export const updateCoverLetterSchema = z.object({
  title: z.string().min(1, "제목을 입력해주세요.").max(100).optional(),
  content: z.string().max(50000, "내용은 50,000자 이하로 입력해주세요.").optional(),
  status: z.enum(["DRAFT", "COMPLETED"]).optional(),
})

export const coverLetterChatSchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant"]),
      content: z.string().optional().default(""),
      parts: z.array(z.any()).optional(),
    }),
  ).min(1, "메시지가 필요합니다."),
  conversationId: z.string().uuid("유효하지 않은 대화 ID입니다."),
  coverLetterId: z.string().uuid("유효하지 않은 자기소개서 ID입니다."),
  selectedDocumentIds: z.array(z.string().uuid()).optional(),
})

export const updateSelectedDocumentsSchema = z.object({
  documentIds: z.array(z.string().uuid()),
})

export const updateSelectedExternalDocumentsSchema = z.object({
  externalDocumentIds: z.array(z.string().uuid()),
})
