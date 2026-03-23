import { MessageRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { recordUsage } from "@/lib/token-usage/service"

interface BuildOnFinishParams {
  conversationId: string
  lastMessageRole: string
  lastMessageContent: string
  userId: string
  aiProvider: string
  modelId: string
  isServerKey: boolean
  feature: "COVER_LETTER" | "INTERVIEW"
}

export function buildOnFinish(params: BuildOnFinishParams) {
  return async ({ text, usage, steps }: {
    text: string
    usage?: { inputTokens?: number; outputTokens?: number }
    steps: { toolCalls?: { toolName: string }[] }[]
  }) => {
    const toolCalls = steps.flatMap(s => s.toolCalls ?? [])
    if (toolCalls.length > 0) {
      console.log(`[${params.feature.toLowerCase()}] 도구 호출 ${toolCalls.length}건:`, toolCalls.map(tc => tc.toolName).join(", "))
    } else {
      console.log(`[${params.feature.toLowerCase()}] 도구 호출 없음`)
    }

    const ops = [
      ...(params.lastMessageRole === "user" && params.lastMessageContent
        ? [prisma.message.create({
            data: { conversationId: params.conversationId, role: MessageRole.USER, content: params.lastMessageContent },
          })]
        : []),
      ...(text
        ? [prisma.message.create({
            data: { conversationId: params.conversationId, role: MessageRole.ASSISTANT, content: text },
          })]
        : []),
    ]
    if (ops.length > 0) {
      await prisma.$transaction(ops)
    }

    if (usage) {
      await recordUsage({
        userId: params.userId,
        provider: params.aiProvider,
        model: params.modelId,
        feature: params.feature,
        promptTokens: usage.inputTokens ?? 0,
        completionTokens: usage.outputTokens ?? 0,
        totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
        isServerKey: params.isServerKey,
        metadata: { conversationId: params.conversationId },
      }).catch((e) => console.error("토큰 사용량 기록 실패:", e))
    }
  }
}
