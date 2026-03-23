import { convertToModelMessages, type UIMessage } from "ai"
import { NextResponse } from "next/server"
import { MessageRole } from "@prisma/client"
import { createClient } from "@/lib/supabase/server"
import { prisma } from "@/lib/prisma"
import { getLanguageModel, AiSettingsNotFoundError } from "@/lib/ai/provider"
import { buildContext } from "@/lib/ai/context"
import { buildInterviewSystemPrompt } from "@/lib/ai/prompts/interview"
import { createReadDocumentTool } from "@/lib/ai/tools"
import { interviewChatSchema } from "@/lib/validations/interview"
import { recordUsage } from "@/lib/token-usage/service"
import { checkQuotaExceeded } from "@/lib/token-usage/quota"
import { selectPipeline, handleMultiStep, handleClassification, interviewClassificationSchema } from "@/lib/ai/pipeline"

export const maxDuration = 120

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: "유효하지 않은 요청입니다." },
      { status: 400 },
    )
  }

  const parsed = interviewChatSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "유효하지 않은 입력입니다." },
      { status: 400 },
    )
  }

  const { messages, conversationId, interviewSessionId } = parsed.data

  try {
    // InterviewSession 로드 (기업 정보)
    const session = await prisma.interviewSession.findUnique({
      where: { id: interviewSessionId },
      select: { userId: true, companyName: true, position: true, status: true },
    })

    if (!session || session.userId !== user.id) {
      return NextResponse.json(
        { error: "면접 세션을 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    if (session.status === "COMPLETED") {
      return NextResponse.json(
        { error: "종료된 면접 세션입니다." },
        { status: 400 },
      )
    }

    // conversationId 소유권 + 세션 연결 검증
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { userId: true, interviewSessionId: true },
    })

    if (
      !conversation ||
      conversation.userId !== user.id ||
      conversation.interviewSessionId !== interviewSessionId
    ) {
      return NextResponse.json(
        { error: "대화를 찾을 수 없습니다." },
        { status: 404 },
      )
    }

    // 허용된 문서 ID 목록 조회 (문서 격리 핵심)
    const allowedDocs = await prisma.interviewDocument.findMany({
      where: { interviewSessionId },
      select: { documentId: true },
    })
    const allowedDocIds = allowedDocs.map((d) => d.documentId)

    // 마지막 user 메시지 텍스트 추출
    const lastMessage = messages[messages.length - 1]
    const lastMessageContent =
      lastMessage.parts
        ?.filter((p: { type: string }) => p.type === "text")
        .map((p: { text?: string }) => p.text ?? "")
        .join("") ||
      lastMessage.content ||
      ""

    const quotaResult = await checkQuotaExceeded(user.id)
    if (quotaResult.exceeded) {
      return NextResponse.json(
        { error: "사용 한도를 초과했습니다." },
        { status: 403 },
      )
    }

    // 문서 요약 컨텍스트 + 모델 병렬 로드
    const [{ context }, { model, isServerKey, provider: aiProvider, modelId }] = await Promise.all([
      buildContext(user.id, {
        selectedDocumentIds: allowedDocIds,
      }),
      getLanguageModel(user.id),
    ])

    const system = buildInterviewSystemPrompt({
      companyName: session.companyName ?? undefined,
      position: session.position ?? undefined,
      context,
    })

    const modelMessages = await convertToModelMessages(messages as UIMessage[])

    const onFinish = buildOnFinish({
      conversationId, lastMessage, lastMessageContent,
      userId: user.id, aiProvider, modelId, isServerKey,
      feature: "INTERVIEW",
    })

    const pipeline = selectPipeline(aiProvider)

    if (pipeline === "multi-step") {
      const result = handleMultiStep({
        model, system, modelMessages,
        tools: {
          readDocument: createReadDocumentTool(user.id, allowedDocIds),
        },
        documentCount: allowedDocIds.length,
        careerNoteCount: 0,
        onFinish,
      })
      return result.toUIMessageStreamResponse()
    } else {
      try {
        const { result, preStageUsages } = await handleClassification({
          model, system, modelMessages,
          userId: user.id, context,
          selectedDocumentIds: allowedDocIds,
          includeCareerNotes: false,
          schema: interviewClassificationSchema,
          onFinish,
        })
        for (const usage of preStageUsages) {
          recordUsage({
            userId: user.id, provider: aiProvider, model: modelId,
            feature: "INTERVIEW",
            promptTokens: usage.inputTokens, completionTokens: usage.outputTokens,
            totalTokens: usage.inputTokens + usage.outputTokens,
            isServerKey, metadata: { conversationId },
          }).catch((e) => console.error("pre-stage 토큰 기록 실패:", e))
        }
        return result.toUIMessageStreamResponse()
      } catch (error) {
        console.error("[interview classification fallback]", error)
        const result = handleMultiStep({
          model, system, modelMessages,
          tools: { readDocument: createReadDocumentTool(user.id, allowedDocIds) },
          documentCount: allowedDocIds.length, careerNoteCount: 0,
          onFinish,
        })
        return result.toUIMessageStreamResponse()
      }
    }
  } catch (error) {
    if (error instanceof AiSettingsNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error("[POST /api/chat/interview]", error)
    return NextResponse.json(
      { error: "채팅 응답 생성에 실패했습니다." },
      { status: 500 },
    )
  }
}

// ─── 헬퍼 ──────────────────────────────────────────────────────────────────

interface BuildOnFinishParams {
  conversationId: string
  lastMessage: { role: string; parts?: { type: string; text: string }[]; content?: string }
  lastMessageContent: string
  userId: string
  aiProvider: string
  modelId: string
  isServerKey: boolean
  feature: "COVER_LETTER" | "INTERVIEW"
}

function buildOnFinish(params: BuildOnFinishParams) {
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
      ...(params.lastMessage.role === "user" && params.lastMessageContent
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
