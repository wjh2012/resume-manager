import { streamText, type LanguageModel } from "ai"
import type { z } from "zod"
import { prisma } from "@/lib/prisma"
import { classify } from "./classify"
import { compressMessages } from "./compress"

interface ClassificationPipelineParams {
  model: LanguageModel
  system: string
  modelMessages: Parameters<typeof streamText>[0]["messages"]
  userId: string
  context: string
  selectedDocumentIds: string[]
  includeCareerNotes: boolean
  schema: z.ZodType
  onFinish: Parameters<typeof streamText>[0]["onFinish"]
}

export interface ClassificationPreStageUsage {
  inputTokens: number
  outputTokens: number
}

export async function handleClassification(params: ClassificationPipelineParams) {
  const preStageUsages: ClassificationPreStageUsage[] = []

  // 1단계: 분류
  const { classification, usage: classifyUsage } = await classify({
    model: params.model,
    schema: params.schema,
    context: params.context,
    messages: extractTextFromMessages(params.modelMessages),
  })
  preStageUsages.push(classifyUsage)

  // 서버 실행: 분류 결과에 따라 병렬 데이터 수집
  const docsToRead = classification.documentsToRead ?? []
  const compareNotes = "compareCareerNotes" in classification
    ? classification.compareCareerNotes
    : false
  const needsCompress = classification.needsCompression ?? false

  const [documents, careerNotes] = await Promise.all([
    docsToRead.length > 0
      ? prisma.document.findMany({
          where: {
            id: { in: docsToRead },
            userId: params.userId,
          },
          select: { id: true, title: true, extractedText: true },
        })
      : [],
    compareNotes
      ? prisma.careerNote.findMany({
          where: { userId: params.userId, status: "CONFIRMED" },
          select: { id: true, title: true, content: true, metadata: true },
        })
      : [],
  ])

  // 대화 압축
  let finalMessages = params.modelMessages
  if (needsCompress) {
    const compressed = await compressMessages({
      model: params.model,
      messages: params.modelMessages as { role: "user" | "assistant"; content: unknown }[],
    })
    finalMessages = compressed.messages as typeof params.modelMessages
    if (compressed.usage) {
      preStageUsages.push(compressed.usage)
    }
  }

  // 시스템 프롬프트 확장: 문서/노트 전문 주입
  const docsContext = documents.length > 0
    ? documents.map((d) => `[${d.title}]\n${d.extractedText ?? ""}`).join("\n\n---\n\n")
    : ""
  const notesContext = careerNotes.length > 0
    ? careerNotes.map((n) => `[${n.title}]\n${n.content}`).join("\n\n---\n\n")
    : ""

  let extendedSystem = params.system
  if (docsContext) {
    extendedSystem += `\n\n[참고자료 — 문서 전문]\n${docsContext}`
  }
  if (notesContext) {
    extendedSystem += `\n\n[참고자료 — 커리어노트 전문]\n${notesContext}`
  }

  // 2단계: 응답 생성 (tools 없음)
  const result = streamText({
    model: params.model,
    system: extendedSystem,
    messages: finalMessages,
    onFinish: params.onFinish,
  })

  return { result, preStageUsages }
}

function extractTextFromMessages(messages: unknown): { role: string; content: string }[] {
  if (!Array.isArray(messages)) return []
  return messages.map((m) => ({
    role: String(m.role ?? "user"),
    content: Array.isArray(m.content)
      ? m.content
          .filter((p: { type: string }) => p.type === "text")
          .map((p: { text: string }) => p.text)
          .join("")
      : String(m.content ?? ""),
  }))
}
