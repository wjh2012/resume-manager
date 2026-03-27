import { z } from "zod"
import { MAX_CONTENT_LENGTH } from "@/lib/validations/document"

export { MAX_CONTENT_LENGTH }

export const createExternalDocumentSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().max(100).default(""),
  content: z.string().min(1).max(MAX_CONTENT_LENGTH),
})

export const externalDocumentUploadSchema = z.object({
  title: z.string().min(1).max(200),
  category: z.string().max(100).default(""),
})

export const updateExternalDocumentSchema = z
  .object({
    title: z.string().min(1).max(200).optional(),
    category: z.string().max(100).optional(),
    content: z.string().min(1).max(MAX_CONTENT_LENGTH).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "최소 하나의 필드를 포함해야 합니다.",
  })
