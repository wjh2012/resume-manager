import { z } from "zod"

// Validation용 metadata 스키마 — 사용자 입력이므로 optional 사용
const careerNoteMetadataInputSchema = z
  .object({
    where: z.string().optional(),
    role: z.string().optional(),
    what: z.string().optional(),
    result: z.string().optional(),
    challenge: z.string().optional(),
    motivation: z.string().optional(),
    feeling: z.string().optional(),
    lesson: z.string().optional(),
  })
  .strip()

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
  metadata: careerNoteMetadataInputSchema.optional(),
})

export const resolveMergeProposalSchema = z.object({
  action: z.enum(["accept", "reject"], {
    error: "올바른 액션을 선택해주세요.",
  }),
  editedTitle: z.string().min(1).max(200).optional(),
  editedContent: z.string().min(1).max(5000).optional(),
  editedMetadata: careerNoteMetadataInputSchema.optional(),
})

export const listCareerNotesSchema = z.object({
  status: z.enum(["confirmed", "pending"]).optional().default("confirmed"),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
})
