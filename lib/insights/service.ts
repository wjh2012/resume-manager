import { generateText, Output } from "ai"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getLanguageModel } from "@/lib/ai/provider"
import {
  insightExtractionPrompt,
  INSIGHT_CATEGORIES,
} from "@/lib/ai/prompts/insight-extraction"
import { recordUsage } from "@/lib/token-usage/service"
import { checkQuotaExceeded, QuotaExceededError } from "@/lib/token-usage/quota"

export class InsightNotFoundError extends Error {
  constructor() {
    super("인사이트를 찾을 수 없습니다.")
  }
}

export class ConversationNotFoundError extends Error {
  constructor() {
    super("대화를 찾을 수 없습니다.")
  }
}

export class InsightForbiddenError extends Error {
  constructor() {
    super("이 인사이트에 대한 권한이 없습니다.")
  }
}

const insightObjectSchema = z.object({
  insights: z.array(
    z.object({
      category: z.enum(INSIGHT_CATEGORIES),
      title: z.string(),
      content: z.string(),
    }),
  ),
})

export async function extractInsights(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
  })
  if (!conversation) {
    throw new ConversationNotFoundError()
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  })

  if (messages.length === 0) {
    return []
  }

  // 할당량 확인
  const quotaResult = await checkQuotaExceeded(userId)
  if (quotaResult.exceeded) {
    throw new QuotaExceededError(quotaResult.source)
  }

  // AI 호출을 먼저 수행 — 실패해도 기존 인사이트 보존
  const { model, isServerKey, provider: aiProvider, modelId } = await getLanguageModel(userId)
  const { output, usage } = await generateText({
    model,
    output: Output.object({ schema: insightObjectSchema }),
    system: insightExtractionPrompt,
    prompt: messages.map((m) => `${m.role}: ${m.content}`).join("\n"),
  })

  // 토큰 사용량 기록
  if (usage) {
    await recordUsage({
      userId,
      provider: aiProvider,
      model: modelId,
      feature: "INSIGHT",
      promptTokens: usage.inputTokens ?? 0,
      completionTokens: usage.outputTokens ?? 0,
      totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
      isServerKey,
      metadata: { conversationId },
    }).catch((e) => console.error("토큰 사용량 기록 실패:", e))
  }

  // 삭제 + 생성을 트랜잭션으로 원자적 처리
  const created = await prisma.$transaction([
    prisma.insight.deleteMany({ where: { conversationId, userId } }),
    ...output!.insights.map((insight) =>
      prisma.insight.create({
        data: {
          userId,
          conversationId,
          category: insight.category,
          title: insight.title,
          content: insight.content,
        },
      }),
    ),
  ])

  // $transaction 배열 결과: [deleteResult, ...createdInsights]
  return created.slice(1)
}

export async function listInsights(userId: string, category?: string) {
  return prisma.insight.findMany({
    where: {
      userId,
      ...(category ? { category } : {}),
    },
    include: {
      conversation: {
        select: {
          id: true,
          type: true,
          coverLetterId: true,
          interviewSessionId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  })
}

interface UpdateInsightData {
  title: string
  content: string
  category: string
}

export async function updateInsight(
  userId: string,
  id: string,
  data: UpdateInsightData,
) {
  const result = await prisma.insight.updateMany({
    where: { id, userId },
    data: { title: data.title, content: data.content, category: data.category },
  })
  if (result.count === 0) {
    const exists = await prisma.insight.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new InsightNotFoundError()
    throw new InsightForbiddenError()
  }
}

export async function deleteInsight(userId: string, id: string) {
  const result = await prisma.insight.deleteMany({
    where: { id, userId },
  })
  if (result.count === 0) {
    const exists = await prisma.insight.findUnique({
      where: { id },
      select: { id: true },
    })
    if (!exists) throw new InsightNotFoundError()
    throw new InsightForbiddenError()
  }
}

export async function countByCategory(userId: string) {
  return prisma.insight.groupBy({
    by: ["category"],
    where: { userId },
    _count: { _all: true },
  })
}
