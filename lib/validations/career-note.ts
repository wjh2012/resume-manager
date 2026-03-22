import { z } from "zod"
import { careerNoteMetadataSchema } from "@/lib/ai/prompts/career-note-extraction"

export const extractCareerNotesSchema = z.object({
  conversationId: z.string().uuid("올바른 대화 ID 형식이 아닙니다."),
})

export const updateCareerNoteSchema = z.object({
  title: z.string({ error: "제목을 입력해주세요." }).min(1).max(200).optional(),
  content: z
    .string({ error: "내용을 입력해주세요." })
    .min(1)
    .max(5000)
    .optional(),
  metadata: careerNoteMetadataSchema.optional(),
})

export const resolveMergeProposalSchema = z.object({
  action: z.enum(["accept", "reject"], {
    error: "올바른 액션을 선택해주세요.",
  }),
  editedTitle: z.string().min(1).max(200).optional(),
  editedContent: z.string().min(1).max(5000).optional(),
  editedMetadata: careerNoteMetadataSchema.optional(),
})

export const listCareerNotesSchema = z.object({
  status: z.enum(["confirmed", "pending"]).optional().default("confirmed"),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})
