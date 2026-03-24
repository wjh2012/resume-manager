import { z } from "zod"

export const coverLetterClassificationSchema = z.object({
  documentsToRead: z.array(z.string())
    .describe("전문을 읽어야 할 문서 ID 목록. 요약만으로 충분하면 빈 배열."),
  externalDocumentsToRead: z.array(z.string())
    .describe("전문을 읽어야 할 외부 문서 ID 목록. 요약만으로 충분하면 빈 배열."),
  compareCareerNotes: z.boolean()
    .describe("커리어노트 상세 비교가 필요하면 true"),
  needsCompression: z.boolean()
    .describe("대화가 길어서 압축이 필요하면 true"),
})

export const interviewClassificationSchema = z.object({
  documentsToRead: z.array(z.string())
    .describe("전문을 읽어야 할 문서 ID 목록. 요약만으로 충분하면 빈 배열."),
  externalDocumentsToRead: z.array(z.string())
    .describe("전문을 읽어야 할 외부 문서 ID 목록. 요약만으로 충분하면 빈 배열."),
  needsCompression: z.boolean()
    .describe("대화가 길어서 압축이 필요하면 true"),
})

export type CoverLetterClassification = z.infer<typeof coverLetterClassificationSchema>
export type InterviewClassification = z.infer<typeof interviewClassificationSchema>

/** 모든 분류 스키마가 공유하는 공통 필드 */
export interface BaseClassification {
  documentsToRead: string[]
  externalDocumentsToRead?: string[]
  needsCompression: boolean
  compareCareerNotes?: boolean
}
