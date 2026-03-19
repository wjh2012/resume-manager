import { generateObject } from "ai"
import { z } from "zod"

import { prisma } from "@/lib/prisma"
import { getLanguageModel } from "@/lib/ai/provider"
import {
  insightExtractionPrompt,
  INSIGHT_CATEGORIES,
} from "@/lib/ai/prompts/insight-extraction"

export class InsightNotFoundError extends Error {
  constructor() {
    super("인사이트를 찾을 수 없습니다.")
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
    throw new InsightNotFoundError()
  }

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: "asc" },
  })

  if (messages.length === 0) {
    return []
  }

  await prisma.insight.deleteMany({ where: { conversationId, userId } })

  const model = await getLanguageModel(userId)
  const { object } = await generateObject({
    model,
    schema: insightObjectSchema,
    system: insightExtractionPrompt,
    prompt: messages.map((m) => `${m.role}: ${m.content}`).join("\n"),
  })

  const created = await prisma.$transaction(
    object.insights.map((insight) =>
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
  )

  return created
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
