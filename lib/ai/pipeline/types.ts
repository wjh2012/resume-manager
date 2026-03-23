import type { LanguageModel, StreamTextResult } from "ai"

export interface PipelineParams {
  model: LanguageModel
  provider: string
  system: string
  modelMessages: Awaited<ReturnType<typeof import("ai").convertToModelMessages>>
  userId: string
  conversationId: string
  // 멀티스텝 전용
  tools?: Record<string, unknown>
  documentCount?: number
  careerNoteCount?: number
  // 분류 전용
  context?: string
  selectedDocumentIds?: string[]
  includeCareerNotes?: boolean
}

export interface PipelineResult {
  stream: StreamTextResult<Record<string, unknown>>
  /** 분류/압축 단계의 토큰 사용량 (분류 경로만) */
  preStageUsage?: { inputTokens: number; outputTokens: number }[]
}
